'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface PhotoCaptureProps {
  label: string;
  sublabel?: string;
  orderId: string;
  type: 'delivery' | 'payment';
  onUploadComplete: (url: string) => void;
}

export function PhotoCapture({
  label,
  sublabel,
  orderId,
  type,
  onUploadComplete,
}: PhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5MB');
      return;
    }

    setError(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setIsUploading(true);
    try {
      const supabase = createClient();
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `orders/${orderId}/${type}-proof-${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('yumi-evidence')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError('Error al subir la foto. Intenta de nuevo.');
        setPreview(null);
        return;
      }

      // Get the URL (private bucket - use signed URL or just store path)
      // For private buckets, we store the path and generate signed URLs when needed
      const fullPath = `yumi-evidence/${filePath}`;
      setIsUploaded(true);
      onUploadComplete(fullPath);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Error de conexión al subir la foto');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setIsUploaded(false);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-gray-700"
          >
            {/* Image preview */}
            <img
              src={preview}
              alt="Vista previa"
              className="w-full h-48 object-cover"
            />

            {/* Upload overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-white">Subiendo...</span>
                </div>
              </div>
            )}

            {/* Success overlay */}
            {isUploaded && !isUploading && (
              <div className="absolute top-3 right-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
              </div>
            )}

            {/* Retake button */}
            {!isUploading && (
              <button
                onClick={handleRetake}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-sm active:scale-95 transition-transform"
              >
                📸 Tomar otra
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="capture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-pointer active:scale-[0.98] transition-transform">
              <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
                <span className="text-2xl">📸</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {label}
                </p>
                {sublabel && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {sublabel}
                  </p>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-red-500 font-medium px-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
