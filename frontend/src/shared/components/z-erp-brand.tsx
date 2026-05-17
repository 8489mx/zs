type ZErpIconProps = {
  className?: string;
  size?: number;
  title?: string;
};

export function ZErpIcon({ className = '', size = 40, title = 'Z ERP' }: ZErpIconProps) {
  return (
    <svg
      className={`z-erp-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="zErpIconBg" x1="10" y1="6" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="0.52" stopColor="#1557e8" />
          <stop offset="1" stopColor="#0b3bb7" />
        </linearGradient>
        <linearGradient id="zErpWhite" x1="12" y1="14" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.58" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="zErpFold" x1="12" y1="18" x2="32" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9eef8" />
        </linearGradient>
        <filter id="zErpShadow" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="2.2" stdDeviation="2.2" floodColor="#041b55" floodOpacity="0.26" />
        </filter>
        <filter id="zErpSoftInset" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodColor="#ffffff" floodOpacity="0.24" />
        </filter>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="16" fill="url(#zErpIconBg)" filter="url(#zErpSoftInset)" />
      <g filter="url(#zErpShadow)">
        <path d="M15 19.2h35.4L45.2 25H9.8L15 19.2Z" fill="url(#zErpWhite)" />
        <path d="M26.6 25h15.8L26.9 43.9H11.1L26.6 25Z" fill="url(#zErpWhite)" />
        <path d="M11.1 43.9h30.8l4.8-5.9H15.9l-4.8 5.9Z" fill="url(#zErpFold)" />
        <path d="M41.9 43.9h8.4L55 38H46.7l-4.8 5.9Z" fill="url(#zErpWhite)" />
        <path d="M9.8 25 15 19.2l10.6 5.8H9.8Z" fill="#f1f5f9" opacity="0.74" />
        <path d="M31.2 43.9h10.7l-4.1-5.9H26.4l4.8 5.9Z" fill="#dfe7f5" opacity="0.58" />
      </g>
    </svg>
  );
}

export function ZErpProductMark({ className = '' }: { className?: string }) {
  return (
    <div className={`z-erp-product-mark ${className}`.trim()}>
      <ZErpIcon size={34} />
      <div className="z-erp-product-copy">
        <strong>Z ERP</strong>
        <span>by Z Systems</span>
      </div>
    </div>
  );
}
