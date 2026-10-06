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
  { path: 'dashboard', label: 'لوحة المؤشرات والتحليلات', mobileLabel: 'اللوحة التحليلية', countKey: 'jobs' as const },
  { path: 'inquiries', label: 'استفسارات شحن العملاء', mobileLabel: 'استفسارات الشحن', countKey: 'inquiries' as const },
  { path: 'rfqs', label: 'عروض تسعير الخطوط (RFQ)', mobileLabel: 'تسعير الخطوط', countKey: 'rfqs' as const },
  { path: 'matrix', label: 'مقارنة عروض الخطوط', mobileLabel: 'مقارنة العروض', countKey: 'matrixBids' as const },
  { path: 'quotations', label: 'عروض أسعار العملاء', mobileLabel: 'عروض الأسعار', countKey: 'quotations' as const },
  { path: 'jobs', label: 'أوامر تشغيل الشحنات', mobileLabel: 'أوامر التشغيل', countKey: 'jobs' as const },
  { path: 'radar', label: 'رادار الغرامات وفترات السماح', mobileLabel: 'رادار الغرامات', countKey: 'containers' as const },
  { path: 'audit', label: 'تدقيق فواتير النواقل', mobileLabel: 'تدقيق الفواتير', countKey: 'jobs' as const },
  { path: 'agents', label: 'حسابات ومقاصة الوكلاء (SOA)', mobileLabel: 'حسابات الوكلاء', countKey: 'master' as const },
  { path: 'trucking', label: 'النقل البري وترحيل الحاويات', mobileLabel: 'النقل البري', countKey: 'jobs' as const },
  { path: 'tracking', label: 'بوابة التتبع المباشر للنواقل', mobileLabel: 'تتبع النواقل', countKey: 'containers' as const },
  { path: 'containers', label: 'تتبع الحاويات والطرود', mobileLabel: 'تتبع الحاويات', countKey: 'containers' as const },
  { path: 'lines', label: 'دليل النواقل والموانئ والمطارات', mobileLabel: 'دليل النواقل', countKey: 'master' as const },
  { path: 'settings', label: 'إعدادات وسياسات الشحن', mobileLabel: 'إعدادات الشحن', countKey: 'settings' as const },
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
        <div className="workspace-compact-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
          <div className="workspace-compact-kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div className="kpi-card-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                <span className="desktop-only-inline">طلبات واستفسارات الشحن</span>
                <span className="mobile-only-inline">استفسارات الشحن</span>
              </div>
              <div className="kpi-card-value" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {counts.inquiries} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>طلب</span>
              </div>
            </div>
            <div className="kpi-card-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
              <FileTextIcon size={20} />
            </div>
          </div>

          <div className="workspace-compact-kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div className="kpi-card-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                <span className="desktop-only-inline">طلبات التسعير (RFQs)</span>
                <span className="mobile-only-inline">عروض التسعير</span>
              </div>
              <div className="kpi-card-value" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {counts.rfqs} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>طلب</span>
              </div>
            </div>
            <div className="kpi-card-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
              <MailIcon size={20} />
            </div>
          </div>

          <div className="workspace-compact-kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div className="kpi-card-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                <span className="desktop-only-inline">عروض أسعار العملاء</span>
                <span className="mobile-only-inline">عروض الأسعار</span>
              </div>
              <div className="kpi-card-value" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {counts.quotations} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>عرض</span>
              </div>
            </div>
            <div className="kpi-card-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a16207' }}>
              <ReceiptIcon size={20} />
            </div>
          </div>

          <div className="workspace-compact-kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div className="kpi-card-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                <span className="desktop-only-inline">أوامر تشغيل الشحنات</span>
                <span className="mobile-only-inline">أوامر التشغيل</span>
              </div>
              <div className="kpi-card-value" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {counts.jobs} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أمر</span>
              </div>
            </div>
            <div className="kpi-card-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <ShipIcon size={20} />
            </div>
          </div>
        </div>

        {/* شريط التبويبات القياسي مقسم على سطرين متوازيين لمنع شريط التمرير الأفقي */}
        <style>{`
          .maritime-nav-tabs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 8px;
          }
          @media (max-width: 1024px) {
            .maritime-nav-tabs-grid {
              grid-template-columns: repeat(2, 1fr);
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
            .maritime-nav-tabs-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 6px !important;
              padding: 8px !important;
              margin-bottom: 10px !important;
            }
            .maritime-nav-tab-btn {
              height: 34px !important;
              padding: 0 8px !important;
              font-size: 0.76rem !important;
              gap: 5px !important;
            }
          }
        `}</style>
        <div
          className="maritime-nav-tabs-grid"
          style={{
            background: '#ffffff',
            padding: '10px 12px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: '14px',
          }}
        >
          {NAV_TABS.map((tab) => {
            const isActive = isTabActive(tab.path);
            const count = counts[tab.countKey];

            return (
              <button
                key={tab.path}
                type="button"
                className="maritime-nav-tab-btn"
                onClick={() => handleNavigate(tab.path)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  background: isActive ? '#170e5e' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#334155',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  direction: 'rtl',
                }}
              >
                <span className="desktop-only-inline">{tab.label}</span>
                <span className="mobile-only-inline">{tab.mobileLabel}</span>
                {tab.path !== 'settings' && tab.path !== 'dashboard' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '20px',
                      height: '18px',
                      padding: '0 6px',
                      borderRadius: '999px',
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
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
          onCreated={() => void refreshCounts()}
        />

        {/* نافذة تسجيل استفسار عميل جديد */}
        <CreateInquiryModal
          open={isCreateInquiryOpen}
          onClose={() => setIsCreateInquiryOpen(false)}
          onCreated={() => void refreshCounts()}
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
