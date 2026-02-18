'use client';

import { useState, useEffect } from 'react';
import { X, Image, Loader2, ZoomIn } from 'lucide-react';
import type { EvidenceUrls } from '@/types/admin-panel';

interface EvidenceViewerProps {
  orderId: string;
  hasDeliveryProof: boolean;
  hasPaymentProof: boolean;
}

export function EvidenceViewer({ orderId, hasDeliveryProof, hasPaymentProof }: EvidenceViewerProps) {
  const [urls, setUrls]       = useState<EvidenceUrls | null>(null);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const noEvidence = !hasDeliveryProof && !hasPaymentProof;

  useEffect(() => {
    if (!orderId || noEvidence) return;

    setLoading(true);
    fetch(`/api/admin/evidence/${orderId}`)
      .then((r) => r.json())
      .then((data: EvidenceUrls) => setUrls(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId, noEvidence]);

  if (noEvidence) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 italic">
        <Image className="w-4 h-4" />
        Sin fotos de evidencia
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        {/* Foto entrega */}
        {hasDeliveryProof && (
          <EvidenceThumb
            label="Foto de entrega"
            url={urls?.delivery_proof_signed_url ?? null}
            loading={loading}
            onClick={() => urls?.delivery_proof_signed_url && setLightbox(urls.delivery_proof_signed_url)}
          />
        )}

        {/* Foto pago */}
        {hasPaymentProof && (
          <EvidenceThumb
            label="Foto de pago"
            url={urls?.payment_proof_signed_url ?? null}
            loading={loading}
            onClick={() => urls?.payment_proof_signed_url && setLightbox(urls.payment_proof_signed_url)}
          />
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Evidencia"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function EvidenceThumb({
  label, url, loading, onClick,
}: {
  label: string;
  url: string | null;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <button
        onClick={onClick}
        disabled={loading || !url}
        className="relative w-24 h-24 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden group hover:border-orange-400 transition disabled:cursor-default"
      >
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
              <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <Image className="w-5 h-5 text-gray-300 dark:text-gray-600" />
          </div>
        )}
      </button>
    </div>
  );
}
