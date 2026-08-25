import { PropsWithChildren } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
}

export function Field({ label, error, hint, className = '', children }: PropsWithChildren<FieldProps>) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>{label}</span>
      {children}
      {hint && !error ? <small className="field-hint text-xs text-slate-500 mt-1 block">{hint}</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
