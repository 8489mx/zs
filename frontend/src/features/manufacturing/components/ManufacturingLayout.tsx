import { type ReactNode, useState, useEffect } from 'react';
import { useAppToolbar } from '@/stores/toolbar-store';
import { PageHeader } from '@/shared/components/page-header';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface ManufacturingLayoutProps {
  children: ReactNode;
  breadcrumbs: BreadcrumbItem[];
  title: string;
  statusBadge?: ReactNode;
  smartButtons?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function ManufacturingLayout({
  children,
  breadcrumbs,
  title,
  statusBadge,
  smartButtons,
  actions,
  onBack,
  searchQuery: _searchQuery = '',
  onSearchChange: _onSearchChange,
}: ManufacturingLayoutProps) {
  useAppToolbar(breadcrumbs);

  return (
    <div className="page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        {onBack && (
          <button type="button" className="document-prototype-back-link" onClick={onBack} aria-label="العودة" style={{ marginBottom: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>&rarr;</span> العودة
          </button>
        )}
        <PageHeader 
          title={title} 
          badge={statusBadge} 
          actions={
            <>
              {smartButtons}
              {actions}
            </>
          } 
        />
        {children}
      </main>
    </div>
  );
}
