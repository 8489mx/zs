import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'dashedAction';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg' | string;
}

export function Button({ variant = 'primary', size, className = '', children, ...props }: PropsWithChildren<ButtonProps>) {
  const sizeClass = size ? `btn-${size}` : '';
  return (
    <button className={`btn btn-${variant} ${sizeClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
