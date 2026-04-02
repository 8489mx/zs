import { NavLink } from 'react-router-dom';
import { inventorySections, type InventorySectionKey } from '@/features/inventory/pages/inventory.page-config';

export function InventorySectionTabs({ currentSection }: { currentSection: InventorySectionKey }) {
  return (
    <div className="filter-chip-row toolbar-chip-row inventory-section-tabs">
      {inventorySections.map((section) => (
        <NavLink
          key={section.key}
          to={`/inventory/${section.key}`}
          className={({ isActive }) => `btn ${isActive || currentSection === section.key ? 'btn-primary' : 'btn-secondary'}`}
        >
          {section.label}
        </NavLink>
      ))}
    </div>
  );
}
