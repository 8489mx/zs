import React from 'react';
import { ArrowRightIcon } from '@/shared/components/icons/AppIcons';

export interface VanFloatingActionBarProps {
  visible?: boolean;
  itemCount: number;
  actionText: string;
  actionIcon?: React.ReactNode;
  onAction: () => void;
  disabled?: boolean;
}

/**
 * VanFloatingActionBar:
 * Compact floating action button (FAB) pinned to the physical bottom-left of mobile viewports.
 * Displays only a concise action pill with count badge so reps can jump directly
 * to customer selection or review & checkout without scrolling down.
 */
export const VanFloatingActionBar: React.FC<VanFloatingActionBarProps> = ({
  visible = true,
  itemCount,
  actionText,
  actionIcon,
  onAction,
  disabled = false,
}) => {
  if (!visible || itemCount <= 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
        left: 0,
        right: 0,
        zIndex: 85,
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Physical Left Alignment: dir="ltr" + justifyContent="flex-start" */}
      <div
        dir="ltr"
        style={{
          width: '100%',
          maxWidth: '520px',
          display: 'flex',
          justifyContent: 'flex-start',
          pointerEvents: 'none',
        }}
      >
        <button
          type="button"
          dir="rtl"
          onClick={onAction}
          disabled={disabled}
          style={{
            pointerEvents: 'auto',
            height: '38px',
            backgroundColor: '#170e5e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            padding: '0 14px 0 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(23, 14, 94, 0.38), 0 1px 3px rgba(0, 0, 0, 0.12)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
          onTouchStart={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)';
          }}
          onTouchEnd={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          {/* Item count circular badge */}
          <span
            style={{
              backgroundColor: '#ffffff',
              color: '#170e5e',
              fontSize: '11px',
              fontWeight: 900,
              minWidth: '20px',
              height: '20px',
              padding: '0 4px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {itemCount}
          </span>

          {/* Action text */}
          <span>{actionText}</span>

          {/* Icon */}
          {actionIcon || (
            <ArrowRightIcon
              size={13}
              color="#ffffff"
              style={{ transform: 'rotate(180deg)' }}
            />
          )}
        </button>
      </div>
    </div>
  );
};
