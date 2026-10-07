import React, { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { useAppToolbar } from '@/stores/toolbar-store';
import {
  PlusIcon,
  RefreshCwIcon,
  FileTextIcon,
  ReceiptIcon,
  ShipIcon,
  MailIcon,
} from '@/shared/components/icons/AppIcons';
import { MaritimeProvider, useMaritime } from '../context/MaritimeContext';
import { toast } from '@/shared/components/system-alert';
import { CreateRfqModal } from '../components/CreateRfqModal';
import { CreateInquiryModal } from '../components/CreateInquiryModal';
import { MaritimeInquiriesPage } from './MaritimeInquiriesPage';
import { MaritimeRfqsPage } from './MaritimeRfqsPage';
import { MaritimeMatrixPage } from './MaritimeMatrixPage';
import { MaritimeQuotationsPage } from './MaritimeQuotationsPage';
import { MaritimeJobsPage } from './MaritimeJobsPage';
import { MaritimeContainersPage } from './MaritimeContainersPage';
import { MaritimeLinesPage } from './MaritimeLinesPage';
import { MaritimeSettingsPage } from './MaritimeSettingsPage';
import { MaritimeFreightDashboardTab } from '../components/MaritimeFreightDashboardTab';
import { MaritimeRadarTab } from '../components/MaritimeRadarTab';
import { MaritimeAuditTab } from '../components/MaritimeAuditTab';
import { MaritimeAgentsTab } from '../components/MaritimeAgentsTab';
import { InlandTruckingTab } from '../components/InlandTruckingTab';
import { CarrierTrackingHubTab } from '../components/CarrierTrackingHubTab';

const NAV_TABS = [
  {
    path: 'dashboard',
    label: 'لوحة المؤشرات',
    fullTitle: 'لوحة المؤشرات والتحليلات البيانية للشحن واللوجستيات',
    mobileLabel: 'المؤشرات',
    countKey: undefined,
  },
  {
    path: 'inquiries',
    label: 'استفسارات الشحن',
    fullTitle: 'استفسارات شحن العملاء وطلبات عروض الأسعار',
    mobileLabel: 'استفسارات الشحن',
    countKey: 'inquiries' as const,
  },
  {
    path: 'rfqs',
    label: 'تسعير الخطوط (RFQ)',
    fullTitle: 'عروض تسعير الخطوط الملاحية والجوية (RFQ)',
    mobileLabel: 'تسعير الخطوط',
    countKey: 'rfqs' as const,
  },
  {
    path: 'matrix',
    label: 'مقارنة العروض',
    fullTitle: 'مصفوفة ومقارنة عروض أسعار النواقل والخطوط',
    mobileLabel: 'مقارنة العروض',
    countKey: 'matrixBids' as const,
  },
  {
    path: 'quotations',
    label: 'عروض الأسعار',
    fullTitle: 'عروض أسعار العملاء وحساب هوامش الربحية',
    mobileLabel: 'عروض الأسعار',
    countKey: 'quotations' as const,
  },
  {
    path: 'jobs',
    label: 'أوامر الشحن (Jobs)',
    fullTitle: 'أوامر تشغيل ومتابعة الشحنات متعددة الوسائط',
    mobileLabel: 'أوامر التشغيل',
    countKey: 'jobs' as const,
  },
  {
    path: 'radar',
    label: 'رادار الغرامات',
    fullTitle: 'رادار الغرامات وفترات السماح والأرضيات (Demurrage & Detention)',
    mobileLabel: 'رادار الغرامات',
    countKey: undefined,
  },
  {
    path: 'audit',
    label: 'تدقيق الفواتير',
    fullTitle: 'تدقيق ومطابقة فواتير النواقل والخطوط (Freight Audit)',
    mobileLabel: 'تدقيق الفواتير',
    countKey: undefined,
  },
  {
    path: 'agents',
    label: 'مقاصة الوكلاء (SOA)',
    fullTitle: 'حسابات ومقاصة الوكلاء الدوليين (Statement of Account)',
    mobileLabel: 'مقاصة الوكلاء',
    countKey: undefined,
  },
  {
    path: 'trucking',
    label: 'النقل البري',
    fullTitle: 'النقل البري وترحيل الحاويات والشاحنات',
    mobileLabel: 'النقل البري',
    countKey: undefined,
  },
  {
    path: 'tracking',
    label: 'تتبع النواقل المباشر',
    fullTitle: 'بوابة التتبع المباشر من أنظمة الخطوط الملاحية والجوية',
    mobileLabel: 'تتبع النواقل',
    countKey: undefined,
  },
  {
    path: 'containers',
    label: 'تتبع الحاويات والطرود',
    fullTitle: 'سجل وتتبع الحاويات والطرود وحالات الشحن',
    mobileLabel: 'تتبع الحاويات',
    countKey: 'containers' as const,
  },
  {
    path: 'lines',
    label: 'دليل النواقل والموانئ',
    fullTitle: 'دليل النواقل والموانئ والمطارات ومحطات الشحن',
    mobileLabel: 'دليل النواقل',
    countKey: 'master' as const,
  },
  {
    path: 'settings',
    label: 'إعدادات الشحن',
    fullTitle: 'إعدادات وسياسات الشحن والعملات والضوابط التشغيلية',
    mobileLabel: 'إعدادات الشحن',
    countKey: undefined,
  },
];

function MaritimeLayoutContent({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    counts,
    refreshCounts,
    refreshAll,
    isRefreshing,
    isCreateRfqOpen,
    setIsCreateRfqOpen,
    isCreateInquiryOpen,
    setIsCreateInquiryOpen,
  } = useMaritime();

  const handleGlobalRefresh = async () => {
    try {
      await refreshAll();
      toast.success('تم تحديث بيانات ومؤشرات الشحن بنجاح', undefined, 2500);
    } catch (err) {
      toast.error('فشل تحديث بيانات الشحن');
    }
  };

  useAppToolbar([
    { label: 'الشحن واللوجستيات' },
  ]);

  // Backward compatibility & direct URL normalization: If accessed via `/maritime?tab=xxx`, redirect cleanly to `/maritime/xxx`
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && (location.pathname === '/maritime' || location.pathname === '/maritime/')) {
      const targetSub = tabParam === 'master' ? 'lines' : tabParam;
      navigate(`/maritime/${targetSub}`, { replace: true });
    }
  }, [location.pathname, searchParams, navigate]);

  // Robust active tab subpath detection
  const subSegments = location.pathname.split('/').filter(Boolean);
  let currentSubPath = (subSegments[0] === 'maritime' && subSegments[1]) ? subSegments[1] : 'dashboard';
  if (currentSubPath === 'master') currentSubPath = 'lines';

  const isTabActive = (tabPath: string) => {
    if (tabPath === 'dashboard') return currentSubPath === 'dashboard' || currentSubPath === '';
    return currentSubPath === tabPath;
  };

  const handleNavigate = (path: string) => {
    navigate(`/maritime/${path}`);
  };

  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsContainerRef.current && typeof window !== 'undefined' && window.innerWidth <= 1240) {
      const activeEl = tabsContainerRef.current.querySelector<HTMLElement>('.maritime-nav-tab-btn.is-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentSubPath]);

  return (
    <div className="document-form-prototype" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* هيدر الصفحة القياسي الموحد */}
        <PageHeader
          title="الشحن واللوجستيات"
          description="منظومة إدارة الشحن واللوجستيات متعدد الوسائط (بحري / جوي / بري)، دورة الشحن المؤتمتة من استفسار العميل وحتى التسليم والتخليص."
          actions={
            <div className="actions compact-actions maritime-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="maritime-action-primary-btn"
                onClick={() => setIsCreateInquiryOpen(true)}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
                  fontSize: '0.8125rem',
                }}
              >
                <PlusIcon size={16} />
                <span className="desktop-only-inline">طلب شحن عميل</span>
                <span className="mobile-only-inline">شحنة عميل</span>
              </button>
              <button
                type="button"
                className="maritime-action-secondary-btn"
                onClick={() => setIsCreateRfqOpen(true)}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#ffffff',
                  color: '#170e5e',
                  border: '1.5px solid #170e5e',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                <PlusIcon size={16} />
                <span className="desktop-only-inline">طلب تسعير خطوط (RFQ)</span>
                <span className="mobile-only-inline">تسعير RFQ</span>
              </button>
              <button
                type="button"
                className="maritime-action-secondary-btn"
                onClick={() => window.open('/freight-portal', '_blank')}
                title="فتح بوابة الخدمة الذاتية لعملاء الشحن"
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#f8fafc',
                  color: '#170e5e',
                  border: '1px solid #cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                <ShipIcon size={16} />
                <span className="desktop-only-inline">بوابة العملاء (B2B Portal)</span>
                <span className="mobile-only-inline">بوابة العملاء</span>
              </button>
              <button
                type="button"
                className="maritime-refresh-btn"
                onClick={handleGlobalRefresh}
                disabled={isRefreshing}
                title="تحديث بيانات الشحن والمؤشرات"
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isRefreshing ? 'wait' : 'pointer',
                  fontSize: '0.8125rem',
                  opacity: isRefreshing ? 0.7 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                <RefreshCwIcon
                  size={15}
                  style={{
                    animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none',
                  }}
                />
                <span className="desktop-only-inline">{isRefreshing ? 'جارٍ التحديث...' : 'تحديث'}</span>
              </button>
            </div>
          }
        />

        {/* بطاقات المؤشرات الرئيسية (KPIs) المتطابقة مع معيار المنظومة */}
        <div className="workspace-compact-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div className="workspace-compact-kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div className="kpi-card-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                <span className="desktop-only-inline">طلبات واستفسارات الشحن</span>
                <span className="mobile-only-inline">استفسارات الشحن</span>
              </div>
              <div className="kpi-card-value" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                {counts.inquiries} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>طلب</span>
              </div>
            </div>
            <div className="kpi-card-icon" style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af', flexShrink: 0 }}>
              <FileTextIcon size={18} />
            </div>
          </div>

          <div className="workspace-compact-kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div className="kpi-card-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                <span className="desktop-only-inline">طلبات التسعير (RFQs)</span>
                <span className="mobile-only-inline">عروض التسعير</span>
              </div>
              <div className="kpi-card-value" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                {counts.rfqs} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>طلب</span>
              </div>
            </div>
            <div className="kpi-card-icon" style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af', flexShrink: 0 }}>
              <MailIcon size={18} />
            </div>
          </div>

          <div className="workspace-compact-kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div className="kpi-card-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                <span className="desktop-only-inline">عروض أسعار العملاء</span>
                <span className="mobile-only-inline">عروض الأسعار</span>
              </div>
              <div className="kpi-card-value" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                {counts.quotations} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>عرض</span>
              </div>
            </div>
            <div className="kpi-card-icon" style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a16207', flexShrink: 0 }}>
              <ReceiptIcon size={18} />
            </div>
          </div>

          <div className="workspace-compact-kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div className="kpi-card-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                <span className="desktop-only-inline">أوامر تشغيل الشحنات</span>
                <span className="mobile-only-inline">أوامر التشغيل</span>
              </div>
              <div className="kpi-card-value" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                {counts.jobs} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أمر</span>
              </div>
            </div>
            <div className="kpi-card-icon" style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d', flexShrink: 0 }}>
              <ShipIcon size={18} />
            </div>
          </div>
        </div>

        {/* شريط التبويبات القياسي المتناسق هندسياً والمحمي من التداخل */}
        <style>{`
          .maritime-nav-tabs-wrapper {
            background: #ffffff;
            padding: 8px 10px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            margin-bottom: 16px;
            box-sizing: border-box;
            width: 100%;
          }
          .maritime-nav-tabs-grid {
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
            gap: 7px;
            width: 100%;
            box-sizing: border-box;
          }
          .maritime-nav-tab-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            height: 38px;
            padding: 0 8px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            color: #334155;
            font-weight: 600;
            font-size: 0.78rem;
            cursor: pointer;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
            overflow: hidden;
            position: relative;
            direction: rtl;
            transition: none; /* دستور منع رعشة الخطوط والتنقل اللحظي 0ms */
          }
          .maritime-nav-tab-btn:hover:not(.is-active) {
            background: #f1f5f9;
            border-color: #cbd5e1;
            color: #0f172a;
          }
          .maritime-nav-tab-btn.is-active {
            background: #170e5e !important;
            border-color: #170e5e !important;
            color: #ffffff !important;
            box-shadow: 0 1px 3px rgba(23, 14, 94, 0.2);
          }
          .maritime-tab-text {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
            text-align: center;
            line-height: 1.2;
            flex: 1;
          }
          .maritime-tab-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 19px;
            height: 18px;
            padding: 0 5px;
            border-radius: 999px;
            background: #e2e8f0;
            color: #475569;
            font-size: 0.7rem;
            font-weight: 700;
            line-height: 1;
            flex-shrink: 0;
            margin-inline-start: 2px;
          }
          .maritime-nav-tab-btn.is-active .maritime-tab-badge {
            background: rgba(255, 255, 255, 0.25) !important;
            color: #ffffff !important;
          }
          @media (max-width: 1240px) and (min-width: 769px) {
            .maritime-nav-tabs-grid {
              display: flex !important;
              overflow-x: auto !important;
              flex-wrap: nowrap !important;
              gap: 8px !important;
              padding-bottom: 4px !important;
              scrollbar-width: thin !important;
              -webkit-overflow-scrolling: touch !important;
            }
            .maritime-nav-tab-btn {
              flex: 0 0 auto !important;
              width: auto !important;
              min-width: max-content !important;
              padding: 0 14px !important;
            }
          }
          @media (max-width: 768px) {
            .maritime-header-actions {
              display: flex !important;
              align-items: center !important;
              gap: 6px !important;
              flex-wrap: nowrap !important;
            }
            .maritime-action-primary-btn,
            .maritime-action-secondary-btn {
              height: 34px !important;
              padding: 0 10px !important;
              font-size: 0.76rem !important;
              white-space: nowrap !important;
            }
            .maritime-refresh-btn {
              width: 34px !important;
              min-width: 34px !important;
              height: 34px !important;
              padding: 0 !important;
              justify-content: center !important;
              flex-shrink: 0 !important;
            }
            .maritime-nav-tabs-wrapper {
              padding: 6px !important;
              margin-bottom: 10px !important;
            }
            .maritime-nav-tabs-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 6px !important;
            }
            .maritime-nav-tab-btn {
              height: 34px !important;
              padding: 0 8px !important;
              font-size: 0.75rem !important;
              gap: 4px !important;
            }
          }
        `}</style>
        <div className="maritime-nav-tabs-wrapper">
          <div ref={tabsContainerRef} className="maritime-nav-tabs-grid">
            {NAV_TABS.map((tab) => {
              const isActive = isTabActive(tab.path);
              const count = tab.countKey ? counts[tab.countKey] : undefined;

              return (
                <button
                  key={tab.path}
                  type="button"
                  className={`maritime-nav-tab-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleNavigate(tab.path)}
                  title={tab.fullTitle || tab.label}
                >
                  <span className="maritime-tab-text desktop-only-inline">
                    {tab.label}
                  </span>
                  <span className="maritime-tab-text mobile-only-inline">
                    {tab.mobileLabel}
                  </span>
                  {count !== undefined && (
                    <span className="maritime-tab-badge">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* تابات بيئة عمل الشحن المحفوظة بالذاكرة (Keep-Alive) لمنع الهدم وإعادة التحميل والرعشة */}
        {children ? (
          children
        ) : (
          <div style={{ width: '100%', minWidth: 0, minHeight: '480px' }}>
            <div style={{ display: isTabActive('dashboard') ? 'block' : 'none' }}>
              <MaritimeFreightDashboardTab />
            </div>
            <div style={{ display: isTabActive('inquiries') ? 'block' : 'none' }}>
              <MaritimeInquiriesPage />
            </div>
            <div style={{ display: isTabActive('rfqs') ? 'block' : 'none' }}>
              <MaritimeRfqsPage />
            </div>
            <div style={{ display: isTabActive('matrix') ? 'block' : 'none' }}>
              <MaritimeMatrixPage />
            </div>
            <div style={{ display: isTabActive('quotations') ? 'block' : 'none' }}>
              <MaritimeQuotationsPage />
            </div>
            <div style={{ display: isTabActive('jobs') ? 'block' : 'none' }}>
              <MaritimeJobsPage />
            </div>
            <div style={{ display: isTabActive('radar') ? 'block' : 'none' }}>
              <MaritimeRadarTab />
            </div>
            <div style={{ display: isTabActive('audit') ? 'block' : 'none' }}>
              <MaritimeAuditTab />
            </div>
            <div style={{ display: isTabActive('agents') ? 'block' : 'none' }}>
              <MaritimeAgentsTab />
            </div>
            <div style={{ display: isTabActive('trucking') ? 'block' : 'none' }}>
              <InlandTruckingTab />
            </div>
            <div style={{ display: isTabActive('tracking') ? 'block' : 'none' }}>
              <CarrierTrackingHubTab />
            </div>
            <div style={{ display: isTabActive('containers') ? 'block' : 'none' }}>
              <MaritimeContainersPage />
            </div>
            <div style={{ display: isTabActive('lines') ? 'block' : 'none' }}>
              <MaritimeLinesPage />
            </div>
            <div style={{ display: isTabActive('settings') ? 'block' : 'none' }}>
              <MaritimeSettingsPage />
            </div>
          </div>
        )}

        {/* نافذة إنشاء طلب تسعير جديد */}
        <CreateRfqModal
          open={isCreateRfqOpen}
          onClose={() => setIsCreateRfqOpen(false)}
          onCreated={() => void refreshAll()}
        />

        {/* نافذة تسجيل استفسار عميل جديد */}
        <CreateInquiryModal
          open={isCreateInquiryOpen}
          onClose={() => setIsCreateInquiryOpen(false)}
          onCreated={() => void refreshAll()}
        />
      </main>
    </div>
  );
}

export function MaritimeLayout({ children }: { children?: React.ReactNode }) {
  return (
    <MaritimeProvider>
      <MaritimeLayoutContent>{children}</MaritimeLayoutContent>
    </MaritimeProvider>
  );
}
