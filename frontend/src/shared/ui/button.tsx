import { Children, type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { translateUiText } from '@/lib/auto-translator';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'dashedAction';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg' | string;
}

export function Button({ variant = 'primary', size, className = '', title, children, ...props }: PropsWithChildren<ButtonProps>) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const sizeClass = size ? `btn-${size}` : '';

  const translateChild = (node: ReactNode): ReactNode => {
    if (!isEn) return node;
    if (typeof node === 'string') {
      return translateUiText(node) || node;
    }
    return node;
  };

  const translatedChildren = isEn ? Children.map(children, translateChild) : children;
  const displayTitle = typeof title === 'string' && isEn ? (translateUiText(title) || title) : title;

  return (
    <button className={`btn btn-${variant} ${sizeClass} ${className}`.trim()} title={displayTitle} {...props}>
      {translatedChildren}
    </button>
  );
}
