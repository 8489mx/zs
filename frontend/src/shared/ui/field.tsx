import { PropsWithChildren } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  className?: string;
}

export function Field({ label, error, className = '', children }: PropsWithChildren<FieldProps>) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
