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
  XIcon,
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
    icon: <UsersIcon size={20} color="#170e5e" />,
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
    icon: <SmartphoneIcon size={20} color="#16a34a" />,
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
    icon: <TruckIcon size={20} color="#ea580c" />,
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
    icon: <PackageIcon size={20} color="#0284c7" />,
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
    icon: <UtensilsIcon size={20} color="#d97706" />,
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
    icon: <MonitorIcon size={20} color="#059669" />,
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
    icon: <TagIcon size={20} color="#7c3aed" />,
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
    icon: <QrCodeIcon size={20} color="#db2777" />,
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
    icon: <BarChartIcon size={20} color="#4338ca" />,
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
    icon: <BuildingIcon size={20} color="#170e5e" />,
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
    <div dir="rtl" className="hub-page-root">
      <style>{`
        .hub-page-root {
          min-height: 100vh;
          background-color: #f8fafc;
          display: flex;
          flex-direction: column;
          font-family: inherit;
          color: #0f172a;
          box-sizing: border-box;
        }
        .hub-header {
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
        }
        .hub-header-inner {
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
          padding: 8px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          min-height: 50px;
        }
        .hub-container {
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
          padding: 14px 24px 24px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .hub-controls-bar {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
          flex-shrink: 0;
          margin-bottom: 12px;
        }
        .hub-controls-row1 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .hub-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .hub-hero-title {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.3px;
        }
        .hub-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background-color: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 700;
        }
        .hub-hero-subtitle {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          line-height: 1.45;
        }
        .hub-search-wrap {
          position: relative;
          width: 290px;
        }
        .hub-search-input {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 14px 8px 36px;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          background-color: #f8fafc;
          font-size: 12.5px;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          transition: all 0.15s ease;
        }
        .hub-search-input:focus {
          border-color: #170e5e;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(23, 14, 94, 0.08);
        }
        .hub-cat-scroll {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 2px;
        }
        .hub-cat-pill {
          padding: 4px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .hub-cat-pill:hover {
          border-color: #cbd5e1;
          color: #0f172a;
          background-color: #ffffff;
        }
        .hub-cat-pill.active {
          background-color: #170e5e;
          border-color: #170e5e;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(23, 14, 94, 0.2);
        }
        .hub-cat-count {
          font-size: 10.5px;
          padding: 0 5px;
          border-radius: 5px;
          background: rgba(15, 23, 42, 0.08);
          color: inherit;
          font-weight: 800;
        }
        .hub-cat-pill.active .hub-cat-count {
          background: rgba(255, 255, 255, 0.22);
          color: #ffffff;
        }
        .hub-cat-full {
          display: inline;
        }
        .hub-cat-short {
          display: none;
        }
        .hub-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 14px;
        }
        .hub-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-decoration: none;
          color: inherit;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          position: relative;
          min-height: 136px;
          box-sizing: border-box;
        }
        .hub-card:hover {
          transform: translateY(-2px);
          border-color: #170e5e;
          box-shadow: 0 10px 24px -4px rgba(23, 14, 94, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.03);
        }
        .hub-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .hub-card-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .hub-card-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 5px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
        }
        .hub-card-title {
          margin: 0 0 3px;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hub-card-desc {
          margin: 0;
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.48;
          height: 34px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hub-action-btn {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          color: #170e5e;
          font-weight: 800;
          transition: all 0.15s ease;
        }
        .hub-btn-path {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #64748b;
          direction: ltr;
          unicode-bidi: embed;
          background-color: #f8fafc;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
          display: inline-block;
        }
        .hub-card:hover .hub-btn-path {
          border-color: #cbd5e1;
          color: #0f172a;
          background-color: #ffffff;
        }
        .hub-btn-label-desktop {
          display: inline;
        }
        .hub-btn-label-mobile {
          display: none;
        }
        .hub-card:hover .hub-action-btn {
          color: #170e5e;
        }
        .hub-erp-full {
          display: inline;
        }
        .hub-erp-short {
          display: none;
        }
        .hub-footer-bar {
          margin-top: auto;
          padding: 8px 16px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 11.5px;
          color: #64748b;
          flex-shrink: 0;
        }

        @media (max-width: 960px) {
          .hub-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }

        @media (max-width: 640px) {
          .hub-header-inner {
            padding: 8px 16px !important;
          }
          .hub-container {
            padding: 12px 14px 24px !important;
          }
          .hub-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .hub-card {
            padding: 12px 14px !important;
            min-height: auto !important;
          }
          .hub-card-desc {
            font-size: 11px !important;
            height: auto !important;
          }
          .hub-search-wrap {
            width: 100% !important;
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
          .hub-cat-scroll {
            overflow-x: auto !important;
            flex-wrap: nowrap !important;
            padding-bottom: 2px !important;
          }
          .hub-cat-pill {
            flex-shrink: 0 !important;
            padding: 5px 10px !important;
            font-size: 11px !important;
          }
          .hub-erp-full {
            display: none !important;
          }
          .hub-erp-short {
            display: inline !important;
          }
        }
      `}</style>

      {/* 1. Top Enterprise Navbar */}
      <header className="hub-header">
        <div className="hub-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(23, 14, 94, 0.2)',
              }}
            >
              <CompassIcon size={16} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                منظومة Z-Systems
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, lineHeight: 1.2 }}>
                مركز البوابات والخدمات الميدانية (Launchpad)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link
              to="/settings/users"
              style={{
                textDecoration: 'none',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
              title="إدارة كلمات السر، رموز الـ PIN، وأرقام هواتف الموظفين والمناديب"
            >
              <UsersIcon size={13} color="#170e5e" />
              <span className="hub-erp-full">إدارة الحسابات والوصول</span>
              <span className="hub-erp-short">إدارة الحسابات</span>
            </Link>

            <Link
              to="/login"
              style={{
                textDecoration: 'none',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: '1px solid #170e5e',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <BuildingIcon size={13} color="#ffffff" />
              <span className="hub-erp-full">الدخول للإدارة (ERP)</span>
              <span className="hub-erp-short">الإدارة (ERP)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Hub Container */}
      <main className="hub-container">
        {/* Sleek Controls Bar */}
        <div className="hub-controls-bar">
          <div className="hub-controls-row1">
            <div className="hub-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 className="hub-hero-title">
                  دليل البوابات والخدمات الذاتية
                </h1>
                <div className="hub-hero-badge">
                  <CheckCircleIcon size={12} color="#1e40af" />
                  <span>بوابة موحدة لكافة الموظفين والمناديب وأطقم التشغيل</span>
                </div>
              </div>
              <p className="hub-hero-subtitle">
                اختر البوابة أو التطبيق الميداني المطلوب للوصول المباشر دون الحاجة لحفظ الروابط المنفصلة.
              </p>
            </div>

            {/* Search Input */}
            <div className="hub-search-wrap">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم، البوابة، الوظيفة أو الخدمة..."
                className="hub-search-input"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: '10px',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px',
                    borderRadius: '4px',
                  }}
                  title="مسح البحث"
                >
                  <XIcon size={14} />
                </button>
              ) : (
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: '12px',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <SearchIcon size={15} />
                </span>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="hub-cat-scroll">
            {[
              { key: 'all', label: 'الكل (جميع الخدمات)', shortLabel: 'الكل', count: PORTALS_LIST.length },
              { key: 'staff', label: 'الموظفين والخدمة الذاتية', shortLabel: 'الموظفين', count: PORTALS_LIST.filter(p => p.category === 'staff').length },
              { key: 'field', label: 'المناديب والمبيعات الميدانية', shortLabel: 'المناديب', count: PORTALS_LIST.filter(p => p.category === 'field').length },
              { key: 'branch', label: 'شاشات الصالة والمطبخ', shortLabel: 'التشغيل', count: PORTALS_LIST.filter(p => p.category === 'branch').length },
              { key: 'management', label: 'الإدارة والرقابة', shortLabel: 'الإدارة', count: PORTALS_LIST.filter(p => p.category === 'management').length },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`hub-cat-pill ${selectedCategory === cat.key ? 'active' : ''}`}
              >
                <span className="hub-cat-full">{cat.label}</span>
                <span className="hub-cat-short">{cat.shortLabel}</span>
                <span className="hub-cat-count">{cat.count}</span>
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
              borderRadius: '12px',
              padding: '28px 16px',
              textAlign: 'center',
              color: '#64748b',
              margin: 'auto 0',
            }}
          >
            <CompassIcon size={32} color="#94a3b8" />
            <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '8px', color: '#0f172a' }}>
              لا توجد بوابات مطابقة لبحثك
            </div>
            <div style={{ fontSize: '12px', marginTop: '2px' }}>
              جرّب كتابة كلمة بحث أخرى أو اختر تبويب "الكل" لعرض كافة البوابات.
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                style={{
                  marginTop: '12px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                إلغاء التصفية وعرض الكل
              </button>
            )}
          </div>
        ) : (
          <div className="hub-grid">
            {filteredPortals.map((portal) => (
              <Link key={portal.id} to={portal.path} className="hub-card">
                <div>
                  {/* Card Header Row */}
                  <div className="hub-card-header">
                    <div
                      className="hub-card-icon"
                      style={{
                        backgroundColor: portal.iconBg,
                      }}
                    >
                      {portal.icon}
                    </div>

                    <span className="hub-card-badge">
                      {portal.badgeText || portal.categoryName}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="hub-card-title">
                    {portal.title}
                  </h3>
                  <p className="hub-card-desc">
                    {portal.description}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="hub-action-btn">
                  <span className="hub-btn-path">{portal.path}</span>
                  <span className="hub-btn-label-desktop">فتح البوابة ←</span>
                  <span className="hub-btn-label-mobile">دخول ←</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 4. Help & Guidelines Footer */}
        <div className="hub-footer-bar">
          <div>
            <strong style={{ color: '#0f172a' }}>تلميح للموظفين والمناديب:</strong> يمكنك حفظ هذا الرابط (<code>/hub</code>) في المفضلة على هاتفك للوصول لكافة البوابات في أي وقت بنقرة واحدة.
          </div>
          <Link
            to="/login"
            style={{
              fontWeight: 800,
              color: '#170e5e',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
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
