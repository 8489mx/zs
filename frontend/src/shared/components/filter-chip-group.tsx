import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';

export type FilterChipOption<T extends string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
};

export function FilterChipGroup<T extends string>({
  value,
  options,
  onChange,
  className = 'filter-chip-row',
}: {
  value: T;
  options: readonly FilterChipOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'primary' : 'secondary'}
          onClick={() => onChange(option.value)}
          disabled={option.disabled}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
