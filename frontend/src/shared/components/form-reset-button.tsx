import { Button } from '@/shared/ui/button';

interface FormResetButtonProps {
  onReset: () => void;
  disabled?: boolean;
  children?: string;
}

export function FormResetButton({ onReset, disabled = false, children = 'تفريغ التغييرات' }: FormResetButtonProps) {
  return (
    <Button type="button" variant="secondary" onClick={onReset} disabled={disabled}>
      {children}
    </Button>
  );
}
