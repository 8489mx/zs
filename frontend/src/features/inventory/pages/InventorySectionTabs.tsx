import { NavLink } from 'react-router-dom';
import { inventorySections, type InventorySectionKey } from '@/features/inventory/pages/inventory.page-config';

export function InventorySectionTabs({ currentSection }: { currentSection: InventorySectionKey }) {
  return (
    <div className="sales-action-strip inventory-section-tabs">
      {inventorySections.map((section) => {
        const isActive = currentSection === section.key;
        return (
          <NavLink
            key={section.key}
            to={`/inventory/${section.key}`}
            className={`sales-action-card inventory-section-tab ${isActive ? 'is-active' : ''}`.trim()}
            style={{ textDecoration: 'none' }}
          >
            <span>{section.shortLabel || section.label}</span>
            <strong>{section.label}</strong>
            <span>{section.description}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
