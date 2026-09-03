import { StorefrontInfo } from '../types/storefront.types';
import { IconSearch, IconTruck, IconShieldCheck, IconCreditCard, IconCheckCircle } from './StorefrontIcons';

interface StorefrontHeroProps {
  info: StorefrontInfo;
  productsCount: number;
  inStockCount: number;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onQuickSearch: (term: string) => void;
}

export function StorefrontHero({
  info,
  inStockCount,
  searchTerm,
  onSearchChange,
  onQuickSearch,
}: StorefrontHeroProps) {
  const quickTags = ['شاي', 'بن', 'أرز', 'زيت', 'أعشاب', 'عسل'];

  return (
    <div
      style={{
        background: '#170e5e',
        color: '#ffffff',
        position: 'relative',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '22px 20px 18px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Compact Hero Content */}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '14px',
            maxWidth: '720px',
            margin: '0 auto',
          }}
        >
          {/* Institutional Store Verification Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <IconCheckCircle size={14} color="#60a5fa" strokeWidth={2.2} />
              <span>متجر رسمي معتمد</span>
            </span>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {inStockCount} صنف جاهز للشحن الفوري
            </span>
          </div>

          {/* Store Title */}
          <h1
            style={{
              margin: 0,
              fontSize: '30px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.3px',
              lineHeight: '1.25',
            }}
          >
            {info.title || info.businessName}
          </h1>

          {/* Bio / Description */}
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: '1.6',
              maxWidth: '560px',
            }}
          >
            {info.bio || 'تسوق تشكيلة واسعة من أجود المنتجات بأفضل الأسعار المباشرة مع خدمة التوصيل السريع لباب منزلك.'}
          </p>

          {/* Search Box */}
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              marginTop: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#ffffff',
                borderRadius: '12px',
                padding: '4px 4px 4px 16px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ابحث عن أي صنف، كود، أو تصنيف..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: 'transparent',
                  padding: '8px 4px',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <IconSearch size={16} strokeWidth={2.2} />
                <span>بحث</span>
              </button>
            </div>

            {/* Quick Keyword Chips */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                الأكثر بحثاً:
              </span>
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onQuickSearch(tag)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Institutional Trust Bar (Clean World-Class Icons) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              flexWrap: 'wrap',
              marginTop: '14px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.9)', fontSize: '12.5px', fontWeight: 600 }}>
              <IconTruck size={17} strokeWidth={1.8} color="#93c5fd" />
              <span>توصيل سريع لكافة المناطق</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.9)', fontSize: '12.5px', fontWeight: 600 }}>
              <IconCreditCard size={17} strokeWidth={1.8} color="#93c5fd" />
              <span>الدفع الآمن عند الاستلام</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.9)', fontSize: '12.5px', fontWeight: 600 }}>
              <IconShieldCheck size={17} strokeWidth={1.8} color="#93c5fd" />
              <span>منتجات أصلية ومضمونة 100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
