import React from 'react';
import { Link } from 'react-router-dom';
import { QrCodeIcon, CompassIcon } from '@/shared/components/icons/AppIcons';
import type { PortalItem } from './portals-data';

interface PortalCardProps {
  portal: PortalItem;
  onOpenQr: (portal: PortalItem) => void;
}

export function PortalCard({ portal, onOpenQr }: PortalCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        transition: 'all 0.15s ease',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: portal.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {portal.icon}
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {portal.badgeText && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                }}
              >
                {portal.badgeText}
              </span>
            )}
            <button
              type="button"
              onClick={() => onOpenQr(portal)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="عرض رمز QR ومشاركة الرابط"
            >
              <QrCodeIcon size={15} />
            </button>
          </div>
        </div>

        <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
          {portal.title}
        </h3>
        <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
          {portal.description}
        </p>
      </div>

      <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>{portal.path}</span>
        <Link
          to={portal.path}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#170e5e',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
          }}
        >
          <span>فتح البوابة</span>
          <CompassIcon size={13} />
        </Link>
      </div>
    </div>
  );
}
