import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientPortal } from '@/shared/components/ClientPortal';
import { useToolbarStore } from '@/stores/toolbar-store';

export function GlobalSearchModal() {
  const { isGlobalSearchOpen, setGlobalSearchOpen, globalSearchQuery, setGlobalSearchQuery } = useToolbarStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
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

  if (!isGlobalSearchOpen) return null;

  const handleClose = () => {
    setGlobalSearchOpen(false);
    setGlobalSearchQuery('');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const hasQuery = globalSearchQuery.trim().length > 0;

  // Mock results
  const renderResults = () => {
    if (!hasQuery) {
      return (
        <div className="global-search-empty">
          <p>اكتب للبحث في الأصناف، الفواتير، الإعدادات، والعملاء...</p>
        </div>
      );
    }

    const q = globalSearchQuery.toLowerCase();
    const products = [
      { id: 1, title: 'سكر أبيض 1 كيلو', subtitle: 'القسم: مواد غذائية | السعر: 35 ج.م', route: '/products' },
      { id: 2, title: 'سكر أسرة 5 كيلو', subtitle: 'القسم: مواد غذائية | السعر: 170 ج.م', route: '/products' },
      { id: 3, title: 'محمد محمود (مندوب)', subtitle: 'القسم: موظفين المبيعات', route: '/hr' },
    ].filter(i => i.title.includes(q));

    const sales = [
      { id: 1, title: 'فاتورة مبيعات #1023', subtitle: 'تحتوي على: سكر أبيض | العميل: نقدي', route: '/sales' },
      { id: 2, title: 'فاتورة مبيعات #1025', subtitle: 'تحتوي على: شاي العروسة | العميل: محمد علي', route: '/sales' },
    ].filter(i => i.title.includes(q));

    const customers = [
      { id: 1, title: 'شركة سكر النيل', subtitle: 'عميل جملة | المديونية: 0', route: '/customers' },
      { id: 2, title: 'محمد أحمد', subtitle: 'عميل قطاعي | المديونية: 150', route: '/customers' },
      { id: 3, title: 'محمود السيد', subtitle: 'عميل جملة | المديونية: 5000', route: '/customers' },
    ].filter(i => i.title.includes(q));

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
            <div className="global-search-group-title">المنتجات والموظفين</div>
            {products.map(p => (
              <div key={p.id} className="global-search-item" onClick={() => handleNavigate(p.route)}>
                <div className="global-search-item-icon">📦</div>
                <div className="global-search-item-content">
                  <span className="global-search-item-title">{p.title}</span>
                  <span className="global-search-item-subtitle">{p.subtitle}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {sales.length > 0 && (
          <>
            <div className="global-search-group-title">فواتير المبيعات</div>
            {sales.map(s => (
              <div key={s.id} className="global-search-item" onClick={() => handleNavigate(s.route)}>
                <div className="global-search-item-icon">🧾</div>
                <div className="global-search-item-content">
                  <span className="global-search-item-title">{s.title}</span>
                  <span className="global-search-item-subtitle">{s.subtitle}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {customers.length > 0 && (
          <>
            <div className="global-search-group-title">العملاء</div>
            {customers.map(c => (
              <div key={c.id} className="global-search-item" onClick={() => handleNavigate(c.route)}>
                <div className="global-search-item-icon">👥</div>
                <div className="global-search-item-content">
                  <span className="global-search-item-title">{c.title}</span>
                  <span className="global-search-item-subtitle">{c.subtitle}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

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
              placeholder="ابحث في أي مكان... (Ctrl+K)"
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
