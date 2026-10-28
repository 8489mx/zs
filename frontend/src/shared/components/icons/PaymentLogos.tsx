import React from 'react';

// 1. Fawry (فوري) SVG
export const FawryLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#004B93" />
    <path
      d="M20 7C12.82 7 7 12.82 7 20C7 27.18 12.82 33 20 33C27.18 33 33 27.18 33 20C33 12.82 27.18 7 20 7ZM19.2 26.5V21.5H14.5V18.5H19.2V13.5L25.5 20L19.2 26.5Z"
      fill="#FFCC00"
    />
  </svg>
);

// 2. valU (فاليو) SVG
export const ValuLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#FF5600" />
    <text
      x="50%"
      y="55%"
      dominantBaseline="middle"
      textAnchor="middle"
      fill="#FFFFFF"
      fontWeight="900"
      fontSize="13"
      fontFamily="sans-serif"
      letterSpacing="-0.5"
    >
      valU*
    </text>
  </svg>
);

// 3. InstaPay (إنستاباي) SVG
export const InstaPayLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 64 22" className={className} xmlns="http://www.w3.org/2000/svg">
    <path fill="#5B21B6" d="M8 2 C5 2 3 4 3 7 L3 17 L8 17 L8 12 L13 12 C16 12 18 10 18 7 C18 4 16 2 13 2 L8 2 Z M8 6 L12 6 C13.5 6 14.5 6.5 14.5 7C14.5 7.5 13.5 8 12 8 L8 8 L8 6 Z" />
    <path fill="#F97316" d="M12 11 L18 17 L14 17 L10 13 Z" />
    <text x="20" y="14" fill="#3B0764" fontWeight="800" fontSize="9.5" fontFamily="sans-serif" letterSpacing="-0.2">
      INSTAPAY
    </text>
  </svg>
);
