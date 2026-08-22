type ZErpIconProps = {
  className?: string;
  size?: number;
  title?: string;
};

export function ZErpIcon({ className = '', size = 40, title = 'Z ERP' }: ZErpIconProps) {
  return (
    <img
      src="./brand/z-erp-approved-icon.png"
      alt={title}
      title={title}
      className={`z-erp-icon-img ${className}`.trim()}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        verticalAlign: 'middle',
        display: 'inline-block',
        flexShrink: 0
      }}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset.failed) {
          img.dataset.failed = '1';
          img.src = '/brand/z-erp-approved-icon.png';
        }
      }}
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
