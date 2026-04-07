import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/shared/ui/button';

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  idleText: string;
  pendingText: string;
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
};

export function SubmitButton({ idleText, pendingText, disabled, children, ...props }: SubmitButtonProps) {
  const isPending = Boolean(disabled);
  return (
    <Button {...props} disabled={disabled}>
      {children ?? (isPending ? pendingText : idleText)}
    </Button>
  );
}
