// ============================================================
// YUMI PLATFORM — CSV Export Utilities
// ADMIN-FIN-2 | Fecha: 23 Feb 2026
// ============================================================

/**
 * Generate CSV content string from headers and rows.
 * Includes BOM for proper UTF-8 handling in Excel (Spanish chars).
 */
export function generateCSV(headers: string[], rows: string[][]): string {
  const BOM = '\uFEFF';

  const escapeCsvField = (field: string): string => {
    const str = field ?? '';
    // Wrap in quotes if contains comma, newline, or double quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(','));

  return BOM + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Trigger browser download of a CSV file.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format cents to decimal string for export (no currency symbol).
 * 1250 → "12.50"
 */
export function formatCentsForExport(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Format ISO date to Peruvian locale string for export.
 * "2026-02-23T14:30:00Z" → "23/02/2026 14:30"
 */
export function formatDateForExport(date: string | null): string {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  } catch {
    return date;
  }
}

/**
 * Generate a filename with date stamp.
 * ("pedidos", "csv") → "pedidos_2026-02-23.csv"
 */
export function exportFilename(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${prefix}_${y}-${m}-${d}.csv`;
}
