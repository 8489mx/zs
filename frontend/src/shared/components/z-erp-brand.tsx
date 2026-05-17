import { CSSProperties } from 'react';

type ZErpIconProps = {
  className?: string;
  size?: number;
  title?: string;
};

export function ZErpIcon({ className = '', size = 40, title = 'Z ERP' }: ZErpIconProps) {
  return (
    <span
      className={`z-erp-icon ${className}`.trim()}
      role="img"
      aria-label={title}
      style={{ '--z-erp-icon-size': `${size}px` } as CSSProperties}
    />
  );
}

export function ZErpProductMark({ className = '' }: { className?: string }) {
  return (
    <div className={`z-erp-product-mark ${className}`.trim()}>
      <ZErpIcon size={42} />
      <div className="z-erp-product-copy">
        <strong>Z ERP</strong>
        <span>by Z Systems</span>
      </div>
    </div>
  );
}
