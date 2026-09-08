import { useState, useMemo } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { SearchIcon } from '@/shared/components/icons/AppIcons';
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
    <div className="page-stack page-shell portals-hub-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="مركز البوابات الرقمية وشاشات الخدمة الذاتية"
          description="دليل الوصول السريع لكافة بوابات المنظومة: بوابات الموظفين، طيارين الدليفري، شاشات المطبخ KDS، شاشات العميل، ورادار المالك."
          badge={<span className="nav-pill">{PORTALS_LIST.length} بوابات نشطة</span>}
        />

        {/* Toolbar & Filter Pills */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <span style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }}>
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن بوابة، شاشة، أو دور وظيفي..."
              style={{
                width: '100%',
                paddingRight: '36px',
                paddingLeft: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            {[
              { id: 'all', label: 'الكل (10)' },
              { id: 'staff', label: 'خدمة ذاتية' },
              { id: 'field', label: 'توصيل وميداني' },
              { id: 'branch', label: 'صالة وعمليات' },
              { id: 'management', label: 'إدارة ورقابة' },
            ].map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#170e5e' : '#64748b',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Portals Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
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

