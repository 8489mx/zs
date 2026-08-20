import { NavLink } from 'react-router-dom';
import { inventorySections, type InventorySectionKey } from '@/features/inventory/pages/inventory.page-config';

export function InventorySectionTabs({ currentSection }: { currentSection: InventorySectionKey }) {
  return (
    <div className="sales-action-strip inventory-section-tabs" style={{ marginBottom: '14px', gap: '10px' }}>
      {inventorySections.map((section) => {
        const isActive = currentSection === section.key;
        return (
          <NavLink
            key={section.key}
            to={`/inventory/${section.key}`}
            className={`sales-action-card inventory-section-tab ${isActive ? 'is-active' : ''}`.trim()}
            style={{
              textDecoration: 'none',
              cursor: 'pointer',
              padding: '10px 14px',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              minHeight: '58px',
              transition: 'all 0.18s ease',
              border: isActive ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
              background: isActive ? '#eff6ff' : '#ffffff',
              boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: isActive ? '#2563eb' : '#64748b', fontWeight: 600, letterSpacing: '-0.2px' }}>
              {section.shortLabel || section.label}
            </span>
            <strong style={{ fontSize: '0.96rem', color: isActive ? '#1d4ed8' : '#0f172a', margin: '2px 0 1px 0', fontWeight: 700 }}>
              {section.label}
            </strong>
            <span style={{ fontSize: '0.71rem', color: isActive ? '#475569' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'block' }}>
              {section.description}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}
