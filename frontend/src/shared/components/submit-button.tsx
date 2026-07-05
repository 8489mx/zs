import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/shared/ui/button';

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  idleText: string;
  pendingText: string;
  isPending?: boolean;
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
};

export function SubmitButton({ idleText, pendingText, disabled, isPending, children, ...props }: SubmitButtonProps) {
  const isButtonPending = Boolean(isPending);
  return (
    <Button {...props} disabled={disabled || isButtonPending}>
      {children ?? (isButtonPending ? pendingText : idleText)}
    </Button>
  );
}
