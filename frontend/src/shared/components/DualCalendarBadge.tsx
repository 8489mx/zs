import { useState, useRef, useEffect } from 'react';
import { getDualDate } from '@/lib/hijri';
import { CalendarIcon, CheckCircleIcon, CopyIcon } from '@/shared/components/icons/AppIcons';

export function DualCalendarBadge() {
  const [dualDate] = useState(() => getDualDate());
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="relative inline-block" ref={popoverRef} dir="rtl">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer select-none bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
        title="التقويم المزدوج (أم القرى والميلادي)"
      >
        <CalendarIcon size={14} color="#170e5e" strokeWidth={2.2} />
        <span className="hidden sm:inline text-slate-900 font-bold">
          {dualDate.hijri.day} {dualDate.hijri.monthName} {dualDate.hijri.year} هـ
        </span>
        <span className="hidden sm:inline text-slate-400">/</span>
        <span className="text-slate-600 font-medium">
          {dualDate.gregorian.day} {dualDate.gregorian.monthName}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-50 animate-in fade-in slide-in-from-top-2"
          style={{ minWidth: '290px' }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-900">
                <CalendarIcon size={15} color="#170e5e" strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">التقويم المزدوج</h4>
                <p className="text-[11px] text-slate-500">{dualDate.dayName}</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
              أم القرى الرسمي
            </span>
          </div>

          <div className="space-y-2">
            {/* Hijri Card */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">التاريخ الهجري (أم القرى)</span>
                <span className="text-xs font-bold text-slate-900">{dualDate.hijri.formatted}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(dualDate.hijri.formatted, 'hijri')}
                className="p-1.5 hover:bg-slate-200/70 text-slate-500 rounded-md transition-colors"
                title="نسخ التاريخ الهجري"
              >
                {copiedKey === 'hijri' ? (
                  <CheckCircleIcon size={14} color="#059669" />
                ) : (
                  <CopyIcon size={14} color="#64748b" />
                )}
              </button>
            </div>

            {/* Gregorian Card */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">التاريخ الميلادي</span>
                <span className="text-xs font-bold text-slate-900">{dualDate.gregorian.formatted}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(dualDate.gregorian.formatted, 'gregorian')}
                className="p-1.5 hover:bg-slate-200/70 text-slate-500 rounded-md transition-colors"
                title="نسخ التاريخ الميلادي"
              >
                {copiedKey === 'gregorian' ? (
                  <CheckCircleIcon size={14} color="#059669" />
                ) : (
                  <CopyIcon size={14} color="#64748b" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>السنة المالية: {dualDate.gregorian.year}</span>
            <button
              type="button"
              onClick={() => handleCopy(dualDate.combined, 'combined')}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {copiedKey === 'combined' ? 'تم النسخ' : 'نسخ التاريخين معاً'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
