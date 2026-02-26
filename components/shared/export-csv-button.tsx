'use client';

import { useState, useCallback } from 'react';
import { Download, Loader2, Check } from 'lucide-react';
import { generateCSV, downloadCSV, exportFilename } from '@/lib/utils/export-csv';

// ── Types ──────────────────────────────────────────────────

/** Mode A: Client-side export — data already loaded */
interface ClientExportProps {
  mode: 'client';
  /** Preferred: pass headers + rows separately */
  headers?: string[];
  rows?: string[][];
  /** Legacy alias: pass data as string[][] (first row = headers) or {key:val}[] */
  data?: string[][] | Record<string, string | number>[];
  /** Preferred prop name */
  filenamePrefix?: string;
  /** Legacy alias for filenamePrefix */
  filename?: string;
  label?: string;
  className?: string;
}

/** Mode B: Server-side export — download from API endpoint */
interface ServerExportProps {
  mode: 'server';
  /** Preferred prop name */
  endpoint?: string;
  /** Legacy alias for endpoint */
  apiUrl?: string;
  params?: Record<string, string>;
  /** Preferred prop name */
  filenamePrefix?: string;
  /** Legacy alias for filenamePrefix */
  filename?: string;
  label?: string;
  className?: string;
}

export type ExportCSVButtonProps = ClientExportProps | ServerExportProps;

// ── Helpers ────────────────────────────────────────────────

function resolveClientData(props: ClientExportProps): { headers: string[]; rows: string[][] } {
  // If headers + rows provided, use directly
  if (props.headers && props.rows) {
    return { headers: props.headers, rows: props.rows };
  }
  // If data is array of objects → extract headers from keys
  if (props.data && props.data.length > 0) {
    const first = props.data[0];
    if (typeof first === 'object' && !Array.isArray(first)) {
      const objData = props.data as Record<string, string | number>[];
      const headers = Object.keys(first);
      const rows = objData.map((row) => headers.map((h) => String(row[h] ?? '')));
      return { headers, rows };
    }
    // data is string[][] — first row is headers
    const arrData = props.data as string[][];
    return { headers: arrData[0] ?? [], rows: arrData.slice(1) };
  }
  return { headers: [], rows: [] };
}

// ── Component ──────────────────────────────────────────────

export function ExportCSVButton(props: ExportCSVButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Resolve filename from either prop
  const resolvedPrefix = props.filenamePrefix ?? props.filename ?? 'export';

  const handleExport = useCallback(async () => {
    setLoading(true);
    setDone(false);

    try {
      if (props.mode === 'client') {
        const { headers, rows } = resolveClientData(props);
        if (headers.length === 0) return;
        const csv = generateCSV(headers, rows);
        downloadCSV(exportFilename(resolvedPrefix), csv);
      } else {
        // Server mode — fetch from API
        const ep = props.endpoint ?? props.apiUrl;
        if (!ep) return;
        const url = new URL(ep, window.location.origin);
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
        link.download = exportFilename(resolvedPrefix);
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
  }, [props, resolvedPrefix]);

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
