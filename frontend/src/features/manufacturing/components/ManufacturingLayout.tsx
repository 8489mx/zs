import { type ReactNode, useState, useEffect } from 'react';
import { useAppToolbar } from '@/stores/toolbar-store';

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
  searchQuery = '',
  onSearchChange,
}: ManufacturingLayoutProps) {
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  
  useAppToolbar(breadcrumbs);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="page-shell document-prototype-shell purchase-new-prototype" dir="rtl">
      <div className={`purchase-prototype-sticky-stack${isHeaderScrolled ? ' is-scrolled' : ''}`}>

        <div className="purchase-prototype-document-surface">
          <div className="document-prototype-topbar">
            <div className="document-prototype-topbar-right">
              {onBack && (
                <button type="button" className="document-prototype-back-link" onClick={onBack} aria-label="العودة">←</button>
              )}
              <h1>{title}</h1>
              
              {statusBadge}
            </div>
            
            {smartButtons && (
              <div className="document-smart-buttons-box">
                {smartButtons}
              </div>
            )}

            {actions && (
              <div className="document-prototype-topbar-actions">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="document-prototype-column">
        {children}
      </main>
    </div>
  );
}
