import { Children, cloneElement, isValidElement, useId, type PropsWithChildren, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { translateUiText } from '@/lib/auto-translator';

interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: string;
  className?: string;
}

const LABELABLE = new Set(['input', 'select', 'textarea']);

/**
 * O30: the caption used to be a plain `<span>`, so nothing tied it to the control. Tapping the text
 * did not focus the field, and a screen reader announced an unnamed input — on ~900 fields.
 *
 * The caption is a real `<label>`; when the control is a plain input/select/textarea it is given a
 * generated id and the label points at it. Anything else (a custom component, several controls) keeps
 * today's markup and gets a label without `htmlFor`, which is still correct, just not associated.
 * Styling is unchanged: `base.css` already covers `.field > span, .field > label`.
 */
export function Field({ label, error, hint, className = '', children }: PropsWithChildren<FieldProps>) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const displayLabel = typeof label === 'string' && isEn ? (translateUiText(label) || label) : label;
  const displayHint = typeof hint === 'string' && isEn ? (translateUiText(hint) || hint) : hint;
  const displayError = typeof error === 'string' && isEn ? (translateUiText(error) || error) : error;

  const generatedId = useId();
  let controlId: string | undefined;

  const content: ReactNode = Children.map(children, (child) => {
    if (controlId || !isValidElement(child)) return child;
    if (typeof child.type !== 'string' || !LABELABLE.has(child.type)) return child;

    const existingId = (child.props as { id?: string }).id;
    controlId = existingId || `field-${generatedId}`;
    return existingId ? child : cloneElement(child as ReactElement<{ id?: string }>, { id: controlId });
  });

  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={controlId}>{displayLabel}</label>
      {content}
      {displayHint && !displayError ? <small className="field-hint text-xs text-slate-500 mt-1 block">{displayHint}</small> : null}
      {displayError ? <small className="field-error">{displayError}</small> : null}
    </div>
  );
}
