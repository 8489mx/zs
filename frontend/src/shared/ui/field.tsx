import { PropsWithChildren } from 'react';

interface FieldProps {
  label: string;
  error?: string;
}

export function Field({ label, error, children }: PropsWithChildren<FieldProps>) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
