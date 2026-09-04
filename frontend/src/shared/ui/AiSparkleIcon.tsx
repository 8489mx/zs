import React from 'react';

export interface AiRobotIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'white' | 'gradient' | 'primary' | 'monochrome';
}

/**
 * Ultra-premium futuristic white space-robot SVG icon ("روبوت فضائي أبيض")
 * Symmetrical, sleek curves, dark glass panoramic visor, glowing cyan digital eyes, and pearl white space shell.
 */
export function AiRobotIcon({
  size = 22,
  className = '',
  style,
}: AiRobotIconProps) {
  const gradId = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <defs>
        {/* Futuristic pearl-white shell gradient for space helmet */}
        <linearGradient id={`bot-shell-${gradId}`} x1="6" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Deep cosmic visor glass */}
        <linearGradient id={`bot-visor-${gradId}`} x1="7" y1="6" x2="17" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B0F19" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>

        {/* Cyber glowing cyan eyes */}
        <linearGradient id={`bot-eye-${gradId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* Side Pods (Left & Right space communicators) */}
      <rect
        x="2.5"
        y="8"
        width="2"
        height="4.5"
        rx="1"
        fill={`url(#bot-shell-${gradId})`}
        stroke="#94A3B8"
        strokeWidth="0.5"
      />
      <rect
        x="19.5"
        y="8"
        width="2"
        height="4.5"
        rx="1"
        fill={`url(#bot-shell-${gradId})`}
        stroke="#94A3B8"
        strokeWidth="0.5"
      />
      <line x1="3.5" y1="9.5" x2="3.5" y2="11" stroke="#38BDF8" strokeWidth="0.6" strokeLinecap="round" />
      <line x1="20.5" y1="9.5" x2="20.5" y2="11" stroke="#38BDF8" strokeWidth="0.6" strokeLinecap="round" />

      {/* Top Signal Beacon / Space Sensor */}
      <line x1="12" y1="2.2" x2="12" y2="3.2" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="12" cy="1.6" r="0.9" fill="#38BDF8" />

      {/* Aerodynamic White Futuristic Helmet */}
      <path
        d="M4.8 9.5C4.8 5.2 7.9 2.8 12 2.8C16.1 2.8 19.2 5.2 19.2 9.5C19.2 13.8 16.3 16.4 12 16.4C7.7 16.4 4.8 13.8 4.8 9.5Z"
        fill={`url(#bot-shell-${gradId})`}
        stroke="#94A3B8"
        strokeWidth="0.6"
      />

      {/* Panoramic Curved Dark Visor */}
      <path
        d="M6.8 9.5C6.8 7.2 8.8 6 12 6C15.2 6 17.2 7.2 17.2 9.5C17.2 12.2 15.2 13.4 12 13.4C8.8 13.4 6.8 12.2 6.8 9.5Z"
        fill={`url(#bot-visor-${gradId})`}
      />

      {/* Visor Glass Reflection Arc */}
      <path
        d="M8 8C9 7 10.8 6.6 12.5 6.7"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.75"
        strokeLinecap="round"
      />

      {/* Glowing Intelligent Cyber Eyes */}
      <rect x="8.6" y="8.6" width="2.2" height="2" rx="0.9" fill={`url(#bot-eye-${gradId})`} />
      <rect x="13.2" y="8.6" width="2.2" height="2" rx="0.9" fill={`url(#bot-eye-${gradId})`} />
      <circle cx="9.3" cy="9.1" r="0.35" fill="#FFFFFF" />
      <circle cx="13.9" cy="9.1" r="0.35" fill="#FFFFFF" />

      {/* Aerodynamic Floating Torso Collar Plate */}
      <path
        d="M7 18.2C8.5 17.3 15.5 17.3 17 18.2C18.2 19.4 17.2 21.4 12 21.4C6.8 21.4 5.8 19.4 7 18.2Z"
        fill={`url(#bot-shell-${gradId})`}
        stroke="#94A3B8"
        strokeWidth="0.5"
      />
      <circle cx="12" cy="19.6" r="0.7" fill="#38BDF8" />
    </svg>
  );
}

// Export as AiSparkleIcon as well for seamless drop-in backward compatibility
export const AiSparkleIcon = AiRobotIcon;
export type { AiRobotIconProps as AiSparkleIconProps };
