import React, { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { useAppToolbar } from '@/stores/toolbar-store';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { ContractingProvider, useContracting } from '../context/ContractingContext';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { ContractingProjectsPage } from './ContractingProjectsPage';
import { ContractingBoqPage } from './ContractingBoqPage';
import { ContractingFinancialsPage } from './ContractingFinancialsPage';
import { ContractingProcurementPage } from './ContractingProcurementPage';
import { ContractingFieldPage } from './ContractingFieldPage';

const NAV_TABS = [
  { path: 'projects', label: 'سجل المشاريع' },
  { path: 'boq', label: 'المقايسة والبنود (SOV)' },
  { path: 'financials', label: 'المالية والمستخلصات' },
  { path: 'procurement', label: 'مقاولو الباطن والتوريدات' },
  { path: 'field', label: 'الميدان والجدول الزمني' },
];

function ContractingLayoutContent({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    activeProject,
    kpis,
    loading,
    reloadProjects,
    isCreateProjectOpen,
    setIsCreateProjectOpen,
  } = useContracting();

  useAppToolbar([
    { label: 'الرئيسية', to: '/dashboard' },
    { label: 'المقاولات وإدارة المشاريع الإنشائية', to: '/contracting' },
  ]);

  // Backward compatibility & direct URL normalization: If accessed via `/contracting` or `/contracting?tab=xxx`, redirect cleanly to `/contracting/xxx`
  useEffect(() => {
    if (location.pathname === '/contracting') {
      const tabParam = searchParams.get('tab');
      const pid = searchParams.get('projectId');
      const targetSub = (tabParam && tabParam !== 'projects') ? tabParam : 'projects';
      const query = pid ? `?projectId=${pid}` : '';
      navigate(`/contracting/${targetSub}${query}`, { replace: true });
    }
  }, [searchParams, location.pathname, navigate]);

  // Robust active tab subpath detection
  const subSegments = location.pathname.split('/').filter(Boolean);
  const currentSubPath = (subSegments[0] === 'contracting' && subSegments[1]) ? subSegments[1] : 'projects';

  const isTabActive = (tabPath: string) => {
    if (tabPath === 'projects') return currentSubPath === 'projects' || currentSubPath === '';
    if (tabPath === 'boq') return currentSubPath === 'boq';
    if (tabPath === 'financials') return currentSubPath === 'financials' || currentSubPath === 'invoices' || currentSubPath === 'change-orders';
    if (tabPath === 'procurement') return currentSubPath === 'procurement' || currentSubPath === 'subcontracts' || currentSubPath === 'materials';
    if (tabPath === 'field') return currentSubPath === 'field' || currentSubPath === 'gantt' || currentSubPath === 'daily-logs' || currentSubPath === 'rfis';
    return currentSubPath === tabPath;
  };

  const handleNavigate = (path: string) => {
    const targetUrl = `/contracting/${path}`;
    const pid = selectedProjectId;
    const query = pid ? `?projectId=${pid}` : '';
    navigate(`${targetUrl}${query}`);
  };

  const handleProjectDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setSelectedProjectId(pid || null);
  };



  return (
    <div className="page-stack page-shell contracting-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* هيدر الصفحة القياسي الموحد */}
        <PageHeader
          title="المقاولات وإدارة المشاريع الإنشائية"
          description="إدارة العقود وجداول الكميات (SOV/BOQ)، الأوامر التغييرية، مستخلصات الدفع (AIA G702/G703)، واليوميات الميدانية."
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(true)}
                style={{
                  height: '38px',
                  padding: '0 18px',
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
                  fontSize: 'var(--font-body)',
                }}
              >
                <AppIcons.Plus size={16} />
                <span>مشروع إنشائي جديد</span>
              </button>
              <button
                type="button"
                onClick={() => reloadProjects()}
                disabled={loading}
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
                  cursor: 'pointer',
                  fontSize: 'var(--font-body)',
                }}
              >
                <AppIcons.RefreshCw size={15} />
                <span>تحديث</span>
              </button>
            </div>
          }
        />

        {/* بطاقات المؤشرات المالية والتشغيلية (KPIs) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>إجمالي المشاريع الإنشائية</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {projects.length} <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#64748b' }}>مشروع</span>
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
              <AppIcons.Building size={22} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>إجمالي القيمة التعاقدية الكلية</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {Number(kpis?.totalContractValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <AppIcons.FileText size={22} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>المستخلصات المعتمدة (Invoiced)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#170e5e', marginTop: '4px' }}>
                {Number(kpis?.totalBilledToDate || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0e7ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3730a3' }}>
              <AppIcons.Receipt size={22} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>ضمان حسن التنفيذ المحتجز</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a16207', marginTop: '4px' }}>
                {Number(kpis?.totalRetentionsHeld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a16207' }}>
              <AppIcons.FileCheck size={22} />
            </div>
          </div>
        </div>

        {/* شريط التبويبات القياسي الثابت */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: '#ffffff',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflowX: 'auto',
          }}
        >
          {NAV_TABS.map((tab) => {
            const isActive = isTabActive(tab.path);
            const countBadge = tab.path === 'projects' ? ` (${projects.length})` : '';

            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => handleNavigate(tab.path)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 'var(--font-body)',
                  background: isActive ? '#170e5e' : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}{countBadge}
              </button>
            );
          })}
        </div>

        {/* شريط اختيار المشروع السريع إذا لم نكن في شاشة قائمة المشاريع أو بنك البنود المرجعي */}
        {currentSubPath !== 'projects' && currentSubPath !== 'master-boq' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              padding: '12px 18px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                المشروع النشط:
              </span>
              <select
                value={selectedProjectId || ''}
                onChange={handleProjectDropdownChange}
                className="form-input"
                style={{
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  minWidth: '280px',
                  fontWeight: 600,
                  color: '#0f172a',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name} - {p.clientName || 'العميل'}
                  </option>
                ))}
              </select>
            </div>
            {activeProject && (
              <div style={{ display: 'flex', gap: '16px', fontSize: 'var(--font-micro)', color: '#64748b', flexWrap: 'wrap' }}>
                <span>
                  القيمة التعاقدية المعدلة:{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {Number(activeProject.revisedContractValue || activeProject.contractValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </span>
                <span>
                  نسبة الحجز: <strong style={{ color: '#0f172a' }}>{activeProject.retentionPercent}%</strong>
                </span>
                <span>
                  مدير المشروع: <strong style={{ color: '#0f172a' }}>{activeProject.projectManager || 'غير محدد'}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* تابات بيئة عمل المقاولات المحفوظة بالذاكرة (Keep-Alive) لمنع الهدم وإعادة التحميل والرعشة */}
        {children ? (
          children
        ) : (
          <>
            <div style={{ display: isTabActive('projects') ? 'block' : 'none' }}>
              <ContractingProjectsPage />
            </div>
            <div style={{ display: isTabActive('boq') ? 'block' : 'none' }}>
              <ContractingBoqPage />
            </div>
            <div style={{ display: isTabActive('financials') ? 'block' : 'none' }}>
              <ContractingFinancialsPage initialSubTab={currentSubPath === 'change-orders' ? 'change-orders' : 'invoices'} />
            </div>
            <div style={{ display: isTabActive('procurement') ? 'block' : 'none' }}>
              <ContractingProcurementPage initialSubTab={currentSubPath === 'materials' ? 'materials' : 'subcontracts'} />
            </div>
            <div style={{ display: isTabActive('field') ? 'block' : 'none' }}>
              <ContractingFieldPage initialSubTab={currentSubPath === 'daily-logs' ? 'daily-logs' : currentSubPath === 'rfis' ? 'rfis' : 'gantt'} />
            </div>
          </>
        )}

        {/* نافذة إنشاء مشروع جديد */}
        <CreateProjectModal
          open={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          onCreated={() => {
            reloadProjects();
          }}
          onSuccess={() => {
            reloadProjects();
          }}
        />
      </main>
    </div>
  );
}

export function ContractingLayout({ children }: { children?: React.ReactNode }) {
  return (
    <ContractingProvider>
      <ContractingLayoutContent>{children}</ContractingLayoutContent>
    </ContractingProvider>
  );
}
