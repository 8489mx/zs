import { useState, useMemo } from 'react';
import { SearchIcon, CompassIcon } from '@/shared/components/icons/AppIcons';
import { PORTALS_LIST, type PortalItem } from '../components/portals-data';
import { PortalCard } from '../components/PortalCard';
import { PortalQrModal } from '../components/PortalQrModal';

export function PortalsHubPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeQrPortal, setActiveQrPortal] = useState<PortalItem | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredPortals = useMemo(() => {
    return PORTALS_LIST.filter((portal) => {
      const matchCat = selectedCategory === 'all' || portal.category === selectedCategory;
      if (!matchCat) return false;

      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        portal.title.toLowerCase().includes(q) ||
        portal.description.toLowerCase().includes(q) ||
        portal.path.toLowerCase().includes(q) ||
        portal.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [search, selectedCategory]);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="page-stack page-shell portals-hub-page"
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Top Header (Unified Portals Standard) */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
          paddingBottom: '12px',
          paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #c7d2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CompassIcon size={20} color="#170e5e" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: '13.5px',
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
              }}
            >
              مركز البوابات الرقمية وشاشات الخدمة الذاتية
            </h1>
            <span
              style={{
                fontSize: '11px',
                color: '#64748b',
                display: 'block',
                marginTop: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              دليل الوصول الموحد لكافة بوابات وشاشات المنظومة
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        className="document-prototype-column"
        style={{
          padding: '14px 16px 88px',
          maxWidth: '1280px',
          width: 'min(100%, 1280px)',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Toolbar & Filter Pills (Strictly Single Line, Zero Scroll) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 10px',
            marginBottom: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', right: '10px', top: '8px', color: '#94a3b8' }}>
              <SearchIcon size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن بوابة، شاشة، أو دور وظيفي..."
              style={{
                width: '100%',
                height: '32px',
                paddingRight: '32px',
                paddingLeft: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#f8fafc',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              width: '100%',
              boxSizing: 'border-box',
              scrollbarWidth: 'none',
            }}
          >
            {[
              { id: 'all', label: `الكل (${PORTALS_LIST.length})` },
              { id: 'logistics', label: 'شحن ولوجستيات' },
              { id: 'projects', label: 'مشاريع ومقاولات' },
              { id: 'staff', label: 'خدمة ذاتية' },
              { id: 'field', label: 'توزيع وميداني' },
              { id: 'branch', label: 'تشغيل وصالة' },
              { id: 'management', label: 'إدارة ورقابة' },
            ].map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 'max-content',
                    height: '28px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#170e5e' : '#64748b',
                    fontWeight: 800,
                    fontSize: '11px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Portals Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {filteredPortals.map((portal) => (
            <PortalCard
              key={portal.id}
              portal={portal}
              onOpenQr={(p) => setActiveQrPortal(p)}
            />
          ))}
        </div>
      </main>

      {/* QR Modal */}
      <PortalQrModal
        portal={activeQrPortal}
        onClose={() => setActiveQrPortal(null)}
        copied={copied}
        onCopy={handleCopyLink}
      />
    </div>
  );
}

export default PortalsHubPage;

