'use client';

import { useState, useCallback, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { DailyReportsTable } from '@/components/admin-panel/daily-reports-table';
import { DailyReportDetail } from '@/components/admin-panel/daily-report-detail';
import type { DailyRiderReport } from '@/types/admin-panel';

export default function CajaDiariaPage() {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const [selectedDate, setSelectedDate]     = useState(todayStr);
  const [selectedReport, setSelectedReport] = useState<DailyRiderReport | null>(null);
  const [tableKey, setTableKey]             = useState(0);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleActionSuccess = useCallback(() => {
    setSelectedReport(null);
    setTableKey(prev => prev + 1);
  }, []);

  const openDatePicker = () => {
    dateInputRef.current?.showPicker?.();
  };

  // YYYY-MM-DD → DD/MM/YYYY
  const displayDate = selectedDate
    ? selectedDate.split('-').reverse().join('/')
    : '';

  return (
    <div className="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Cierre de Caja
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Valida los reportes diarios de riders
          </p>
        </div>

        {/* Botón fecha — clic en cualquier parte abre el picker */}
        <button
          type="button"
          onClick={openDatePicker}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-400 rounded-xl px-3 py-2 transition-colors"
        >
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-900 dark:text-white">
            {displayDate}
          </span>
          {/* Input oculto — solo recibe el valor, no es visible */}
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={e => {
              setSelectedDate(e.target.value);
              setSelectedReport(null);
              setTableKey(prev => prev + 1);
            }}
            className="sr-only"
          />
        </button>
      </div>

      {/* ── Split layout ─────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 lg:p-6 min-h-0 overflow-hidden">
        <div className="lg:col-span-2 min-h-0">
          <DailyReportsTable
            key={tableKey}
            selectedDate={selectedDate}
            selectedRiderId={selectedReport?.rider_id ?? null}
            onSelectRider={setSelectedReport}
          />
        </div>
        <div className="lg:col-span-3 min-h-0">
          <DailyReportDetail
            report={selectedReport}
            onActionSuccess={handleActionSuccess}
          />
        </div>
      </div>
    </div>
  );
}
