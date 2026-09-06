import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  SmartphoneIcon,
  TruckIcon,
  PackageIcon,
  UtensilsIcon,
  MonitorIcon,
  TagIcon,
  QrCodeIcon,
  BarChartIcon,
  BuildingIcon,
  SearchIcon,
  CompassIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';

interface PortalItem {
  id: string;
  title: string;
  category: 'staff' | 'field' | 'branch' | 'management';
  categoryName: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badgeText?: string;
  keywords: string[];
}

const PORTALS_LIST: PortalItem[] = [
  // 1. Employee Self-Service
  {
    id: 'employee-portal',
    title: 'بوابة الموظف الذاتية',
    category: 'staff',
    categoryName: 'خدمة ذاتية',
    description: 'استعراض مسيرات الرواتب، أرصدة الإجازات، طلب سلفة، وتفاصيل العقد.',
    path: '/portal',
    icon: <UsersIcon size={24} color="#170e5e" />,
    iconBg: '#eff6ff',
    iconColor: '#170e5e',
    badgeText: 'للموظفين',
    keywords: ['موظف', 'رواتب', 'إجازات', 'سلف', 'عقد', 'حضور', 'portal', 'ess'],
  },
  {
    id: 'mobile-punch',
    title: 'بصمة الموبايل الذكية (GPS)',
    category: 'staff',
    categoryName: 'خدمة ذاتية',
    description: 'تسجيل الحضور والانصراف بالسيلفي وفحص النطاق الجغرافي للفرع.',
    path: '/punch',
    icon: <SmartphoneIcon size={24} color="#16a34a" />,
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    badgeText: 'سيلفي + GPS',
    keywords: ['بصمة', 'حضور', 'انصراف', 'موبايل', 'سيلفي', 'gps', 'punch'],
  },

  // 2. Field & Delivery
  {
    id: 'driver-portal',
    title: 'بوابة مندوبي التوصيل',
    category: 'field',
    categoryName: 'توصيل وميداني',
    description: 'استلام أوردرات الدليفري، تحديث التسليم، والاتصال المباشر بالعملاء.',
    path: '/driver',
    icon: <TruckIcon size={24} color="#ea580c" />,
    iconBg: '#fff7ed',
    iconColor: '#ea580c',
    badgeText: 'طيارين الدليفري',
    keywords: ['طيار', 'مندوب', 'توصيل', 'دليفري', 'شحنات', 'أوردر', 'driver'],
  },
  {
    id: 'van-sales',
    title: 'مبيعات سيارات التوزيع والفان',
    category: 'field',
    categoryName: 'توصيل وميداني',
    description: 'محطة بيع وفواتير متنقلة لمندوبي الفان، جرد السيارة والتحصيل الميداني.',
    path: '/van-sales',
    icon: <PackageIcon size={24} color="#0284c7" />,
    iconBg: '#f0f9ff',
    iconColor: '#0284c7',
    badgeText: 'فان كاشير',
    keywords: ['فان', 'سيارة', 'توزيع', 'مبيعات متنقلة', 'مندوب كاشير', 'van'],
  },

  // 3. Branch & POS Displays
  {
    id: 'kds',
    title: 'شاشة المطبخ (KDS)',
    category: 'branch',
    categoryName: 'صالة وعمليات',
    description: 'متابعة أوامر تحضير وتجهيز الوجبات بالمطاعم والكافيهات لحظياً.',
    path: '/kds',
    icon: <UtensilsIcon size={24} color="#d97706" />,
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    badgeText: 'شاشة تحضير',
    keywords: ['مطبخ', 'تحضير', 'وجبات', 'طلبات', 'كافيه', 'مطعم', 'kds'],
  },
  {
    id: 'customer-display',
    title: 'شاشة العميل بنقطة البيع (CFD)',
    category: 'branch',
    categoryName: 'صالة وعمليات',
    description: 'شاشة كاونتر لعرض تفاصيل الفاتورة الحية، السعر، وعروض الولاء للمشتري.',
    path: '/pos/customer-display',
    icon: <MonitorIcon size={24} color="#059669" />,
    iconBg: '#ecfdf5',
    iconColor: '#059669',
    badgeText: 'كاونتر الكاشير',
    keywords: ['عميل', 'شاشة عميل', 'كاونتر', 'كاشير', 'عرض أسعار', 'cfd', 'display'],
  },
  {
    id: 'digital-signage',
    title: 'شاشة العروض الرقمية (Signage)',
    category: 'branch',
    categoryName: 'صالة وعمليات',
    description: 'لوحة تفاعلية لشاشات التلفزيون بالمعرض لعرض الأسعار والخصومات التسويقية.',
    path: '/signage',
    icon: <TagIcon size={24} color="#7c3aed" />,
    iconBg: '#faf5ff',
    iconColor: '#7c3aed',
    badgeText: 'شاشة المعرض',
    keywords: ['عروض', 'تلفزيون', 'شاشة عرض', 'أسعار', 'معرض', 'signage'],
  },
  {
    id: 'table-qr',
    title: 'الطلب الذاتي من الطاولة (QR)',
    category: 'branch',
    categoryName: 'صالة وعمليات',
    description: 'تصفح المنيو والطلب الفوري من طاولة الصالة عبر مسح كود الـ QR بالهاتف.',
    path: '/table/1',
    icon: <QrCodeIcon size={24} color="#db2777" />,
    iconBg: '#fdf2f8',
    iconColor: '#db2777',
    badgeText: 'منيو الطاولة',
    keywords: ['طاولة', 'qr', 'منيو', 'طلب ذاتي', 'طاولات', 'table'],
  },

  // 4. Management & Enterprise
  {
    id: 'owner-companion',
    title: 'رادار متابعة المالك المتنقل',
    category: 'management',
    categoryName: 'إدارة ورقابة',
    description: 'لوحة رقابة لهاتف صاحب العمل لمتابعة الإيرادات والورديات لحظة بلحظة.',
    path: '/owner-companion',
    icon: <BarChartIcon size={24} color="#4338ca" />,
    iconBg: '#eef2ff',
    iconColor: '#4338ca',
    badgeText: 'PWA للمالك',
    keywords: ['مالك', 'رادار', 'مبيعات حية', 'إيرادات', 'ورديات', 'owner'],
  },
  {
    id: 'erp-login',
    title: 'النظام الإداري المركزي (ERP)',
    category: 'management',
    categoryName: 'إدارة ورقابة',
    description: 'لوحة التحكم الكبرى لإدارة الحسابات، المخازن، المشتريات، والمبيعات.',
    path: '/login',
    icon: <BuildingIcon size={24} color="#170e5e" />,
    iconBg: '#f1f5f9',
    iconColor: '#170e5e',
    badgeText: 'الإدارة الكاملة',
    keywords: ['erp', 'حسابات', 'مخازن', 'مبيعات', 'لوحة تحكم', 'login', 'admin'],
  },
];

export function PortalsHubPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredPortals = useMemo(() => {
    return PORTALS_LIST.filter((portal) => {
      // Category filter
      if (selectedCategory !== 'all' && portal.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesTitle = portal.title.toLowerCase().includes(query);
        const matchesDesc = portal.description.toLowerCase().includes(query);
        const matchesKeywords = portal.keywords.some((k) => k.toLowerCase().includes(query));
        const matchesCategory = portal.categoryName.toLowerCase().includes(query);
        return matchesTitle || matchesDesc || matchesKeywords || matchesCategory;
      }

      return true;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
        color: '#0f172a',
      }}
    >
      <style>{`
        .hub-container {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 32px 20px 60px;
          box-sizing: border-box;
        }
        .hub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .hub-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
          position: relative;
        }
        .hub-card:hover {
          transform: translateY(-3px);
          border-color: #cbd5e1;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
        }
        .hub-cat-scroll {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
        }
        .hub-cat-full {
          display: inline;
        }
        .hub-cat-short {
          display: none;
        }
        .hub-cat-pill {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .hub-cat-pill.active {
          background-color: #170e5e;
          border-color: #170e5e;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(23, 14, 94, 0.25);
        }
        .hub-action-btn {
          margin-top: 14px;
          padding: 8px 12px;
          border-radius: 8px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #170e5e;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.15s ease;
        }
        .hub-card:hover .hub-action-btn {
          background-color: #170e5e;
          border-color: #170e5e;
          color: #ffffff;
        }
        .hub-btn-path {
          font-family: monospace;
          font-size: 11px;
          opacity: 0.8;
          display: inline;
        }
        .hub-btn-label-desktop {
          display: inline;
        }
        .hub-btn-label-mobile {
          display: none;
        }
        .hub-erp-full {
          display: inline;
        }
        .hub-erp-short {
          display: none;
        }

        @media (max-width: 768px) {
          .hub-container {
            padding: 16px 12px 36px;
          }
          .hub-header-wrap {
            text-align: center;
          }
          .hub-cat-full {
            display: none !important;
          }
          .hub-cat-short {
            display: inline !important;
          }
          .hub-cat-scroll {
            display: flex !important;
            width: 100% !important;
            gap: 4px !important;
            overflow-x: hidden !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          .hub-cat-pill {
            flex: 1 1 0px !important;
            min-width: 0 !important;
            padding: 7px 2px !important;
            font-size: 11.5px !important;
            font-weight: 800 !important;
            text-align: center !important;
            border-radius: 10px !important;
            white-space: nowrap !important;
          }
          .hub-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .hub-card {
            padding: 12px 10px !important;
            border-radius: 14px !important;
          }
          .hub-card-title {
            font-size: 12.5px !important;
            line-height: 1.35 !important;
            min-height: 34px !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
          }
          .hub-card-desc {
            font-size: 10.5px !important;
            line-height: 1.35 !important;
            min-height: 28px !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
          }
          .hub-card-icon {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
          }
          .hub-card-badge {
            font-size: 10px !important;
            padding: 2px 6px !important;
          }
          .hub-btn-path {
            display: none !important;
          }
          .hub-btn-label-desktop {
            display: none !important;
          }
          .hub-btn-label-mobile {
            display: inline !important;
          }
          .hub-action-btn {
            margin-top: 10px !important;
            padding: 7px 8px !important;
            font-size: 11.5px !important;
            justify-content: center !important;
            text-align: center !important;
          }
          .hub-erp-full {
            display: none !important;
          }
          .hub-erp-short {
            display: inline !important;
          }
        }

        @media (max-width: 480px) {
          .hub-cat-pill {
            padding: 6px 1px !important;
            font-size: 10.5px !important;
            border-radius: 8px !important;
          }
          .hub-card-title {
            font-size: 12px !important;
          }
          .hub-card-desc {
            font-size: 10px !important;
          }
        }
      `}</style>

      {/* 1. Top Enterprise Navbar */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
            }}
          >
            <CompassIcon size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px' }}>
              منظومة Z-Systems
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              مركز البوابات والخدمات الميدانية (Launchpad)
            </div>
          </div>
        </div>

        <Link
          to="/login"
          style={{
            textDecoration: 'none',
            backgroundColor: '#f1f5f9',
            color: '#170e5e',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '12.5px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <BuildingIcon size={14} color="#170e5e" />
          <span className="hub-erp-full">الدخول للإدارة (ERP)</span>
          <span className="hub-erp-short">الإدارة (ERP)</span>
        </Link>
      </header>

      {/* 2. Main Hero & Content */}
      <main className="hub-container">
        {/* Hero Section */}
        <div className="hub-header-wrap" style={{ marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: 800,
              marginBottom: '10px',
            }}
          >
            <CheckCircleIcon size={14} color="#1e40af" />
            <span>بوابة موحدة لكافة الموظفين والمناديب وأطقم التشغيل</span>
          </div>

          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>
            دليل البوابات والخدمات الذاتية
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#64748b', maxWidth: '640px', lineHeight: 1.5 }}>
            اختر البوابة أو التطبيق الميداني المطلوب للوصول المباشر دون الحاجة لحفظ الروابط المنفصلة.
          </p>

          {/* Search Input */}
          <div style={{ position: 'relative', maxWidth: '520px' }}>
            <span
              style={{
                position: 'absolute',
                top: '50%',
                insetInlineStart: '14px',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <SearchIcon size={18} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو الوظيفة أو الخدمة (بصمة، طيار، رواتب)..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                paddingInlineStart: '42px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#170e5e';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            />
          </div>

          {/* Category Filter Pills (Single row without scroll on mobile) */}
          <div className="hub-cat-scroll">
            {[
              { key: 'all', label: 'الكل (جميع الخدمات)', shortLabel: 'الكل' },
              { key: 'staff', label: 'الموظفين والخدمة الذاتية', shortLabel: 'الموظفين' },
              { key: 'field', label: 'المناديب والمبيعات الميدانية', shortLabel: 'المناديب' },
              { key: 'branch', label: 'شاشات الصالة والمطبخ', shortLabel: 'التشغيل' },
              { key: 'management', label: 'الإدارة والرقابة', shortLabel: 'الإدارة' },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`hub-cat-pill ${selectedCategory === cat.key ? 'active' : ''}`}
              >
                <span className="hub-cat-full">{cat.label}</span>
                <span className="hub-cat-short">{cat.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Portals Grid */}
        {filteredPortals.length === 0 ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <CompassIcon size={40} color="#94a3b8" />
            <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
              لا توجد بوابات مطابقة لبحثك
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              جرّب كتابة كلمة بحث أخرى أو اختر تبويب "الكل" لعرض كافة البوابات.
            </div>
          </div>
        ) : (
          <div className="hub-grid">
            {filteredPortals.map((portal) => (
              <Link key={portal.id} to={portal.path} className="hub-card">
                <div>
                  {/* Card Header Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div
                      className="hub-card-icon"
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 12,
                        backgroundColor: portal.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {portal.icon}
                    </div>

                    <span
                      className="hub-card-badge"
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {portal.badgeText || portal.categoryName}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="hub-card-title" style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                    {portal.title}
                  </h3>
                  <p className="hub-card-desc" style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>
                    {portal.description}
                  </p>
                </div>

                {/* Footer Action Button */}
                <div className="hub-action-btn">
                  <span className="hub-btn-path">{portal.path}</span>
                  <span className="hub-btn-label-desktop">فتح البوابة ←</span>
                  <span className="hub-btn-label-mobile">دخول البوابة ←</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 4. Help & Guidelines Footer */}
        <div
          style={{
            marginTop: '40px',
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12.5px',
            color: '#64748b',
          }}
        >
          <div>
            <strong style={{ color: '#0f172a' }}>تلميح للموظفين والمناديب:</strong> يمكنك حفظ هذا الرابط (<code>/hub</code>) في المفضلة على هاتفك للوصول لكافة البوابات في أي وقت بنقرة واحدة.
          </div>
          <Link
            to="/login"
            style={{
              fontWeight: 800,
              color: '#170e5e',
              textDecoration: 'none',
            }}
          >
            تسجيل دخول المدير ➔
          </Link>
        </div>
      </main>
    </div>
  );
}

export default PortalsHubPage;
