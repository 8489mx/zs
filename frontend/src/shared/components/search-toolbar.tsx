import type { ReactNode, Ref } from 'react';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';

interface SearchToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
  onReset?: (() => void) | null;
  resetLabel?: string;
  inputRef?: Ref<HTMLInputElement>;
  inputAriaLabel?: string;
}

export function SearchToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'ابحث...',
  children,
  title,
  description,
  actions,
  meta,
  className = '',
  onReset = null,
  resetLabel = 'تصفير',
  inputRef,
  inputAriaLabel,
}: SearchToolbarProps) {
  const hasHeading = Boolean(title || description || actions || onReset);

  return (
    <div className={`toolbar-stack ${className}`.trim()}>
      {hasHeading ? (
        <div className="toolbar-heading">
          <div className="toolbar-heading-copy">
            {title ? <strong className="toolbar-title">{title}</strong> : null}
            {description ? <p className="toolbar-description">{description}</p> : null}
          </div>
          <div className="toolbar-heading-actions">
            {actions}
            {onReset ? <Button type="button" variant="secondary" onClick={onReset}>{resetLabel}</Button> : null}
          </div>
        </div>
      ) : null}

      {meta ? <div className="toolbar-meta-row">{meta}</div> : null}

      <div className="toolbar-grid compact-toolbar">
        <Field label="بحث سريع">
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={inputAriaLabel || searchPlaceholder}
          />
        </Field>
        {children ? <div className="toolbar-extra">{children}</div> : null}
      </div>
    </div>
  );
}
