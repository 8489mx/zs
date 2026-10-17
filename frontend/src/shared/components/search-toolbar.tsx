import type { ReactNode, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { normalizeArabicSearchText } from '@/lib/arabic-normalization';

interface SearchToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
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
  searchPlaceholder,
  searchLabel,
  children,
  title,
  description,
  actions,
  meta,
  className = '',
  onReset = null,
  resetLabel,
  inputRef,
  inputAriaLabel,
}: SearchToolbarProps) {
  const { t } = useTranslation();
  const resolvedSearchPlaceholder = searchPlaceholder || t('toolbar.search', 'ابحث...');
  const resolvedSearchLabel = searchLabel || t('toolbar.quick_search', 'بحث سريع');
  const resolvedResetLabel = resetLabel || t('toolbar.reset', 'تصفير');

  const hasHeading = Boolean(title || description || actions);

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
            {onReset ? <Button type="button" variant="secondary" onClick={onReset}>{resolvedResetLabel}</Button> : null}
          </div>
        </div>
      ) : null}

      {meta ? <div className="toolbar-meta-row">{meta}</div> : null}

      <div className="toolbar-grid compact-toolbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Field label={resolvedSearchLabel}>
            <input
              ref={inputRef}
              value={search}
              onChange={(event) => onSearchChange(normalizeArabicSearchText(event.target.value))}
              placeholder={resolvedSearchPlaceholder}
              aria-label={inputAriaLabel || resolvedSearchPlaceholder}
            />
          </Field>
        </div>
        {children ? <div className="toolbar-extra">{children}</div> : null}
        {!hasHeading && onReset ? (
          <div className="toolbar-reset-action">
            <Button type="button" variant="secondary" onClick={onReset}>
              {resolvedResetLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
