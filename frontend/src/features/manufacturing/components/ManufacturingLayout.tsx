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
        <PageHeader 
          title={title} 
          onBack={onBack}
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
