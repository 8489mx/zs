import React, { useState, useEffect, useRef } from 'react';

export interface TimeAmPmInputProps {
  value?: string; // "HH:mm" in 24h format (e.g. "09:00", "17:30") or ""
  defaultPeriod?: 'AM' | 'PM';
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function parse24to12(time24: string | undefined, defaultPeriod: 'AM' | 'PM'): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!time24 || typeof time24 !== 'string') {
    return { hour: '', minute: '', period: defaultPeriod };
  }
  const clean = time24.trim().slice(0, 5);
  const parts = clean.split(':');
  if (parts.length < 2) {
    return { hour: '', minute: '', period: defaultPeriod };
  }
  const h24 = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h24) || !Number.isFinite(m)) {
    return { hour: '', minute: '', period: defaultPeriod };
  }
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return {
    hour: String(h12),
    minute: String(Math.max(0, Math.min(59, m))).padStart(2, '0'),
    period,
  };
}

function format12to24(hour12Str: string, minuteStr: string, period: 'AM' | 'PM'): string {
  if (!hour12Str) return '';
  const h12 = Number(hour12Str);
  if (!Number.isFinite(h12) || h12 < 1 || h12 > 12) return '';
  const m = Number(minuteStr || '0');
  const safeM = Math.max(0, Math.min(59, Number.isFinite(m) ? m : 0));

  let h24: number;
  if (period === 'AM') {
    h24 = h12 === 12 ? 0 : h12;
  } else {
    h24 = h12 === 12 ? 12 : h12 + 12;
  }
  return `${String(h24).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`;
}

export const TimeAmPmInput: React.FC<TimeAmPmInputProps> = ({
  value = '',
  defaultPeriod = 'AM',
  disabled = false,
  onChange,
}) => {
  const initial = parse24to12(value, defaultPeriod);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period);
  const [focusedField, setFocusedField] = useState<'hour' | 'minute' | null>(null);

  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  // Sync state if external value changes (e.g. reset or "الآن" button), but never while user is actively typing!
  useEffect(() => {
    if (focusedField !== null) return;
    const parsed = parse24to12(value, defaultPeriod);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
  }, [value, defaultPeriod, focusedField]);

  const emitChange = (newHour: string, newMinute: string, newPeriod: 'AM' | 'PM') => {
    if (!newHour) {
      onChange('');
      return;
    }
    const val24 = format12to24(newHour, newMinute || '00', newPeriod);
    onChange(val24);
  };

  const stepHour = (delta: number) => {
    let nextH: number;
    if (!hour) {
      nextH = period === 'AM' ? 9 : 5;
    } else {
      nextH = Number(hour) + delta;
      if (nextH > 12) nextH = 1;
      if (nextH < 1) nextH = 12;
    }
    const nextHStr = String(nextH);
    const nextMStr = minute || '00';
    setHour(nextHStr);
    if (!minute) setMinute(nextMStr);
    emitChange(nextHStr, nextMStr, period);
  };

  const stepMinute = (delta: number) => {
    if (!hour) {
      const defaultH = period === 'AM' ? '9' : '5';
      const m = delta >= 0 ? '05' : '55';
      setHour(defaultH);
      setMinute(m);
      emitChange(defaultH, m, period);
      return;
    }
    const currentM = Number(minute || '0');
    let nextM = currentM + delta;
    if (nextM >= 60) nextM = 0;
    if (nextM < 0) nextM = 55;
    const nextMStr = String(nextM).padStart(2, '0');
    setMinute(nextMStr);
    emitChange(hour, nextMStr, period);
  };

  const handleStepGeneral = (delta: number) => {
    if (focusedField === 'minute') {
      stepMinute(delta * 5);
    } else {
      stepHour(delta);
    }
  };

  const togglePeriod = () => {
    const nextPeriod: 'AM' | 'PM' = period === 'AM' ? 'PM' : 'AM';
    setPeriod(nextPeriod);
    if (hour) {
      emitChange(hour, minute, nextPeriod);
    }
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepHour(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepHour(-1);
    } else if (e.key === 'ArrowRight' || e.key === ':') {
      e.preventDefault();
      minuteInputRef.current?.focus();
      minuteInputRef.current?.select();
    }
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepMinute(5);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepMinute(-5);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      hourInputRef.current?.focus();
      hourInputRef.current?.select();
    }
  };

  const handleHourChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '').slice(0, 2);
    if (!digits) {
      setHour('');
      emitChange('', '', period);
      return;
    }

    if (digits === '0') {
      setHour('0');
      return;
    }

    let num = Number(digits);
    if (num > 12) {
      const last = digits.slice(-1);
      num = Number(last) || 12;
      setHour(String(num));
      const nextMStr = minute || '00';
      if (!minute) setMinute(nextMStr);
      emitChange(String(num), nextMStr, period);
      return;
    }

    setHour(String(num));
    const nextMStr = minute || '00';
    if (!minute) setMinute(nextMStr);
    emitChange(String(num), nextMStr, period);

    // Auto-advance to minutes if full 2 digits typed or if single digit is 2-9
    if (digits.length === 2 || (num >= 2 && num <= 9)) {
      minuteInputRef.current?.focus();
      minuteInputRef.current?.select();
    }
  };

  const handleMinuteChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '').slice(0, 2);
    if (!digits) {
      setMinute('');
      emitChange(hour, '00', period);
      return;
    }
    const num = Number(digits);
    if (num > 59) {
      const lastDigit = digits.slice(-1);
      setMinute(lastDigit);
      emitChange(hour || (period === 'AM' ? '9' : '5'), lastDigit.padStart(2, '0'), period);
      return;
    }
    setMinute(digits);
    emitChange(hour || (period === 'AM' ? '9' : '5'), digits.padStart(2, '0'), period);
  };

  const hasValue = Boolean(hour);
  const isAm = period === 'AM';

  return (
    <div
      dir="ltr"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: disabled ? '#f8fafc' : '#ffffff',
        border: focusedField ? '1px solid #170e5e' : '1px solid #cbd5e1',
        boxShadow: focusedField ? '0 0 0 2px rgba(23, 14, 94, 0.12)' : 'none',
        borderRadius: '6px',
        padding: '2px 3px',
        gap: '2px',
        transition: 'all 0.12s ease',
        userSelect: 'none',
      }}
    >
      {/* Hour Input */}
      <input
        ref={hourInputRef}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={hour}
        placeholder="--"
        onFocus={() => {
          setFocusedField('hour');
          hourInputRef.current?.select();
        }}
        onClick={(e) => {
          setFocusedField('hour');
          const target = e.currentTarget;
          target.select();
          requestAnimationFrame(() => target.select());
        }}
        onBlur={() => {
          setFocusedField(null);
          if (hour === '0') {
            setHour('12');
            emitChange('12', minute || '00', period);
          }
        }}
        onChange={(e) => handleHourChange(e.target.value)}
        onKeyDown={handleHourKeyDown}
        title="الساعة (1-12) - استخدم سهم فوق/تحت للتعديل"
        style={{
          width: '26px',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          textAlign: 'center',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: hasValue ? '#0f172a' : '#94a3b8',
          padding: 0,
        }}
      />

      <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.8rem', lineHeight: 1 }}>:</span>

      {/* Minute Input */}
      <input
        ref={minuteInputRef}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={minute}
        placeholder="--"
        onFocus={() => {
          setFocusedField('minute');
          minuteInputRef.current?.select();
        }}
        onClick={(e) => {
          setFocusedField('minute');
          const target = e.currentTarget;
          target.select();
          requestAnimationFrame(() => target.select());
        }}
        onBlur={() => {
          setFocusedField(null);
          if (minute && minute.length === 1) {
            const padded = minute.padStart(2, '0');
            setMinute(padded);
            emitChange(hour || (period === 'AM' ? '9' : '5'), padded, period);
          }
        }}
        onChange={(e) => handleMinuteChange(e.target.value)}
        onKeyDown={handleMinuteKeyDown}
        title="الدقيقة (00-59) - استخدم سهم فوق/تحت للتعديل"
        style={{
          width: '26px',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          textAlign: 'center',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: hasValue ? '#0f172a' : '#94a3b8',
          padding: 0,
        }}
      />

      {/* Vertical Stepper Buttons (Up / Down) */}
      {!disabled && (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '0 1px' }}>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleStepGeneral(1)}
            title="زيادة (سهم لأعلى)"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              lineHeight: 1,
              height: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '8px',
            }}
          >
            ▲
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleStepGeneral(-1)}
            title="إنقاص (سهم لأسفل)"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              lineHeight: 1,
              height: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '8px',
            }}
          >
            ▼
          </button>
        </div>
      )}

      {/* AM / PM Toggle Badge (Always holding AM or PM by default!) */}
      <button
        type="button"
        disabled={disabled}
        onClick={togglePeriod}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            togglePeriod();
          }
        }}
        title={`اضغط أو استخدم الأسهم للتبديل بين AM و PM (حالياً: ${isAm ? 'AM' : 'PM'})`}
        style={{
          border: 'none',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.5px',
          cursor: disabled ? 'default' : 'pointer',
          background: isAm ? '#e0f2fe' : '#fef3c7',
          color: isAm ? '#0369a1' : '#92400e',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.12s ease',
        }}
      >
        <span>{isAm ? 'AM' : 'PM'}</span>
      </button>
    </div>
  );
};
