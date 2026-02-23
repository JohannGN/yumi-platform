'use client';

import { useState, useCallback } from 'react';
import { Download, Loader2, Check } from 'lucide-react';
import { generateCSV, downloadCSV, exportFilename } from '@/lib/utils/export-csv';

// ── Types ──────────────────────────────────────────────────

/** Mode A: Client-side export — data already loaded in table */
interface ClientExportProps {
  mode: 'client';
  headers: string[];
  rows: string[][];
  filenamePrefix: string;
  label?: string;
  className?: string;
}

/** Mode B: Server-side export — download from API endpoint */
interface ServerExportProps {
  mode: 'server';
  endpoint: string;
  params?: Record<string, string>;
  filenamePrefix: string;
  label?: string;
  className?: string;
}

type ExportCSVButtonProps = ClientExportProps | ServerExportProps;

// ── Component ──────────────────────────────────────────────

export function ExportCSVButton(props: ExportCSVButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    setDone(false);

    try {
      if (props.mode === 'client') {
        const csv = generateCSV(props.headers, props.rows);
        downloadCSV(exportFilename(props.filenamePrefix), csv);
      } else {
        // Server mode — fetch from API
        const url = new URL(props.endpoint, window.location.origin);
        if (props.params) {
          Object.entries(props.params).forEach(([k, v]) => {
            if (v) url.searchParams.set(k, v);
          });
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Export failed');

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = exportFilename(props.filenamePrefix);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }

      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  }, [props]);

  const label = props.label ?? 'Exportar CSV';

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium
                  text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                  disabled:opacity-50 transition-colors ${props.className ?? ''}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : done ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{done ? 'Descargado' : label}</span>
    </button>
  );
}
