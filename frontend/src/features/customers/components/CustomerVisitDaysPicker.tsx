import { useTranslation } from 'react-i18next';
import React from 'react';
import { CalendarIcon, CheckIcon } from '@/shared/components/icons/AppIcons';

export const ALL_WEEK_DAYS = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
] as const;

export const DAY_ALIASES: Record<string, string[]> = {
  sunday: ['sunday', 'الأحد', 'الاحد', 'أحد', 'احد'],
  monday: ['monday', 'الإثنين', 'الاثنين', 'إثنين', 'اثنين', 'الاتنين', 'اتنين'],
  tuesday: ['tuesday', 'الثلاثاء', 'الثلاثا', 'ثلاثاء', 'ثلاثا', 'التلات', 'تلات'],
  wednesday: ['wednesday', 'الأربعاء', 'الاربعاء', 'أربعاء', 'اربعاء', 'الأربعا', 'الاربعا', 'اربعا'],
  thursday: ['thursday', 'الخميس', 'خميس'],
  friday: ['friday', 'الجمعة', 'الجمعه', 'جمعة', 'جمعه'],
  saturday: ['saturday', 'السبت', 'سبت'],
};

export const DAY_KEY_TO_ARABIC: Record<string, string> = {
  saturday: 'السبت',
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
};

export function normalizeDayKey(day?: string | null): string {
  if (!day) return '';
  const d = String(day).trim().toLowerCase();
  for (const [key, aliases] of Object.entries(DAY_ALIASES)) {
    if (aliases.some((a) => d === a || d.includes(a))) {
      return key;
    }
  }
  return d;
}

export interface CustomerVisitDaysPickerProps {
  value?: string[];
  singleValue?: string;
  onChange: (days: string[], primaryDay: string) => void;
  disabled?: boolean;
}

export const CustomerVisitDaysPicker: React.FC<CustomerVisitDaysPickerProps> = ({
  value,
  singleValue,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();
  // Resolve selected keys from either array value or singleValue fallback
  const rawList = Array.isArray(value) && value.length > 0
    ? value
    : (singleValue ? [singleValue] : []);

  const selectedKeys = new Set(rawList.map((d) => normalizeDayKey(d)).filter(Boolean));

  const handleToggleDay = (day: string) => {
    if (disabled) return;
    const key = normalizeDayKey(day);
    const nextKeys = new Set(selectedKeys);
    if (nextKeys.has(key)) {
      nextKeys.delete(key);
    } else {
      nextKeys.add(key);
    }

    const nextDays = ALL_WEEK_DAYS.filter((d) => nextKeys.has(normalizeDayKey(d)));
    onChange(nextDays, nextDays[0] || '');
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const all = [...ALL_WEEK_DAYS];
    onChange(all, all[0]);
  };

  const handleClear = () => {
    if (disabled) return;
    onChange([], '');
  };

  const selectedCount = ALL_WEEK_DAYS.filter((d) => selectedKeys.has(normalizeDayKey(d))).length;
  const isAllSelected = selectedCount === ALL_WEEK_DAYS.length;

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Action shortcuts */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
          <CalendarIcon size={13} color="#170e5e" />
          <span>{t('customers.customer_visit_days_picker.s0', "حدد الأيام التي يزور فيها المندوب هذا المحل:")}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '11px',
              fontWeight: isAllSelected ? 800 : 600,
              color: isAllSelected ? '#170e5e' : '#2563eb',
              cursor: disabled ? 'not-allowed' : 'pointer',
              textDecoration: 'underline',
            }}
          >
            {t('customers.customer_visit_days_picker.s1', "كل الأيام")}
          </button>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '11px',
              fontWeight: 600,
              color: '#64748b',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {t('customers.customer_visit_days_picker.s2', "إلغاء التحديد")}
          </button>
        </div>
      </div>

      {/* 7 Interactive Day Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '5px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {ALL_WEEK_DAYS.map((day) => {
          const isSelected = selectedKeys.has(normalizeDayKey(day));
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => handleToggleDay(day)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 2px',
                borderRadius: '8px',
                border: isSelected ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                backgroundColor: isSelected ? '#170e5e' : '#ffffff',
                color: isSelected ? '#ffffff' : '#334155',
                fontSize: '11.5px',
                fontWeight: isSelected ? 800 : 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'none',
                minHeight: '34px',
                boxSizing: 'border-box',
                boxShadow: isSelected ? '0 1px 3px rgba(23, 14, 94, 0.15)' : 'none',
              }}
            >
              <span>{day}</span>
              {isSelected && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                  }}
                >
                  <CheckIcon size={10} color="#ffffff" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule Policy Explanation Badge */}
      <div
        style={{
          marginTop: '6px',
          padding: '5px 8px',
          borderRadius: '6px',
          backgroundColor: selectedCount > 0 ? '#f0fdf4' : '#f8fafc',
          border: selectedCount > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
          fontSize: '11px',
          color: selectedCount > 0 ? '#166534' : '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        {selectedCount === 0 ? (
          <span>{t('customers.customer_visit_days_picker.s3', "متاح يومياً (خط سير مفتوح - يظهر للمندوب في كافة الأيام)")}</span>
        ) : isAllSelected ? (
          <span>{t('customers.customer_visit_days_picker.s4', "مجدول يومياً طوال أيام الأسبوع (السبت إلى الجمعة)")}</span>
        ) : selectedCount === 1 ? (
          <span>
            <strong>{t('customers.customer_visit_days_picker.s5', "مجدول حصرياً:")}</strong> {t('customers.customer_visit_days_picker.s6', "يظهر للمندوب فقط في يوم (")}
            {ALL_WEEK_DAYS.filter((d) => selectedKeys.has(normalizeDayKey(d)))[0]}
            {t('customers.customer_visit_days_picker.s7', ") ولن يظهر في باقي الأيام.")}
          </span>
        ) : (
          <span>
            <strong>{t('customers.customer_visit_days_picker.s8', "مجدول في")} {selectedCount} {t('customers.customer_visit_days_picker.s9', "أيام:")}</strong> (
            {ALL_WEEK_DAYS.filter((d) => selectedKeys.has(normalizeDayKey(d))).join(t('customers.customer_visit_days_picker.s10', " ، "))}
            {t('customers.customer_visit_days_picker.s11', ") ولن يظهر في الأيام غير المحددة.")}
          </span>
        )}
      </div>
    </div>
  );
};
