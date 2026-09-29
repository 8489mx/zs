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
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div>
        {/* Top: Icon & Category Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: portal.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {portal.icon}
          </div>

          {portal.badgeText && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
              }}
            >
              {portal.badgeText}
            </span>
          )}
        </div>

        <h3 style={{ margin: '0 0 3px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
          {portal.title}
        </h3>
        <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.45 }}>
          {portal.description}
        </p>
      </div>

      {/* Footer: Path & Actions (Open + QR) */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#94a3b8' }}>{portal.path}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onOpenQr(portal)}
            style={{
              height: '28px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#170e5e',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="عرض رمز QR ومشاركة الرابط"
          >
            <QrCodeIcon size={14} color="#170e5e" />
            <span>QR</span>
          </button>

          <Link
            to={portal.path}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              height: '28px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#ffffff',
              textDecoration: 'none',
              padding: '0 10px',
              borderRadius: '6px',
              backgroundColor: '#170e5e',
            }}
          >
            <span>فتح</span>
            <CompassIcon size={12} color="#ffffff" />
          </Link>
        </div>
      </div>
    </div>
  );
}
