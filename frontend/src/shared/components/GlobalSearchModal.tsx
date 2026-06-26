import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClientPortal } from '@/shared/components/ClientPortal';
import { useToolbarStore } from '@/stores/toolbar-store';
import { productsApi } from '@/features/products/api/products.api';
import { salesApi } from '@/features/sales/api/sales.api';
import { customersApi } from '@/features/customers/api/customers.api';
import type { Product, Sale, Customer } from '@/types/domain';

export function GlobalSearchModal() {
  const { isGlobalSearchOpen, setGlobalSearchOpen, globalSearchQuery, setGlobalSearchQuery } = useToolbarStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setGlobalSearchOpen(!isGlobalSearchOpen);
      }
      if (e.key === 'Escape' && isGlobalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobalSearchOpen, setGlobalSearchOpen]);

  useEffect(() => {
    if (isGlobalSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isGlobalSearchOpen]);

  const handleClose = () => {
    setGlobalSearchOpen(false);
    setGlobalSearchQuery('');
  };

  const hasQuery = globalSearchQuery.trim().length > 0;

  // Real API queries
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-search', globalSearchQuery],
    queryFn: () => productsApi.listPage({ q: globalSearchQuery, page: 1, pageSize: 5 }),
    enabled: hasQuery && isGlobalSearchOpen,
  });

  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales-search', globalSearchQuery],
    queryFn: () => salesApi.listPage({ search: globalSearchQuery, page: 1, pageSize: 5 }),
    enabled: hasQuery && isGlobalSearchOpen,
  });

  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers-search', globalSearchQuery],
    queryFn: () => customersApi.listPage({ q: globalSearchQuery, page: 1, pageSize: 5 }),
    enabled: hasQuery && isGlobalSearchOpen,
  });

  const isLoading = isLoadingProducts || isLoadingSales || isLoadingCustomers;

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const renderResults = () => {
    if (!hasQuery) {
      return (
        <div className="global-search-empty">
          <p>اكتب للبحث في الأصناف، الفواتير، والعملاء...</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="global-search-empty">
          <p>جاري البحث...</p>
        </div>
      );
    }

    const products = productsData?.products || [];
    const sales = salesData?.rows || [];
    const customers = customersData?.customers || [];

    if (products.length === 0 && sales.length === 0 && customers.length === 0) {
      return (
        <div className="global-search-empty">
          <p>لم يتم العثور على نتائج مطابقة لـ "{globalSearchQuery}"</p>
        </div>
      );
    }

    return (
      <div className="global-search-results">
        {products.length > 0 && (
          <>
            <div className="global-search-group-title">المنتجات</div>
            {products.map((p: Product) => (
              <div key={p.id} className="global-search-item" onClick={() => handleNavigate(`/products/${p.id}/edit`)}>
                <div className="global-search-item-icon">📦</div>
                <div className="global-search-item-content">
                  <span className="global-search-item-title">{p.name}</span>
                  <span className="global-search-item-subtitle">{p.barcode ? `باركود: ${p.barcode}` : 'بدون باركود'}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {sales.length > 0 && (
          <>
            <div className="global-search-group-title">فواتير المبيعات</div>
            {sales.map((s: Sale) => (
              <div key={s.id} className="global-search-item" onClick={() => handleNavigate(`/sales`)}>
                <div className="global-search-item-icon">🧾</div>
                <div className="global-search-item-content">
                  <span className="global-search-item-title">فاتورة مبيعات #{s.docNo || s.id.slice(0, 8)}</span>
                  <span className="global-search-item-subtitle">الإجمالي: {s.total}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {customers.length > 0 && (
          <>
            <div className="global-search-group-title">العملاء</div>
            {customers.map((c: Customer) => (
              <div key={c.id} className="global-search-item" onClick={() => handleNavigate(`/customers`)}>
                <div className="global-search-item-icon">👥</div>
                <div className="global-search-item-content">
                  <span className="global-search-item-title">{c.name}</span>
                  <span className="global-search-item-subtitle">{c.phone || 'بدون هاتف'}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  if (!isGlobalSearchOpen) return null;

  return (
    <ClientPortal targetId="root">
      <div className="global-search-overlay" onClick={handleClose}>
        <div className="global-search-modal" onClick={(e) => e.stopPropagation()}>
          <div className="global-search-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              ref={inputRef}
              className="global-search-input"
              type="text"
              placeholder={`ابحث في أي مكان... (\u200ECtrl+/\u200E)`}
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
            />
            <div className="global-search-badge">ESC</div>
          </div>
          {renderResults()}
        </div>
      </div>
    </ClientPortal>
  );
}
