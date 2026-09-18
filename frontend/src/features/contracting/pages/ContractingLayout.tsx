import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { useAppToolbar } from '@/stores/toolbar-store';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { ContractingProvider, useContracting } from '../context/ContractingContext';
import { toast } from '@/shared/components/system-alert';
import { CustomSelect } from '@/shared/ui/custom-select';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { TenderEstimatorModal } from '../components/TenderEstimatorModal';
import { ProjectLifecycleStepper, type ContractingPhaseKey } from '../components/ProjectLifecycleStepper';
import { GovernmentLicensesModal } from '../components/GovernmentLicensesModal';
import { SiteMobilizationModal } from '../components/SiteMobilizationModal';
import { ScheduleGeneratorModal } from '../components/ScheduleGeneratorModal';
import { ProjectMaterialsMrpModal } from '../components/ProjectMaterialsMrpModal';
import { MaterialSubmittalsModal } from '../components/MaterialSubmittalsModal';
import { MaterialPriceEscalationModal } from '../components/MaterialPriceEscalationModal';
import { ProjectEvmMetricsModal } from '../components/ProjectEvmMetricsModal';
import { SubcontractorBackChargesModal } from '../components/SubcontractorBackChargesModal';
import { EquipmentFuelLogsModal } from '../components/EquipmentFuelLogsModal';
import { ContractingWorkflowMapModal } from '../components/ContractingWorkflowMapModal';

import { ContractingProjectsPage } from './ContractingProjectsPage';
import { ContractingTenderPage } from './ContractingTenderPage';
import { ContractingBoqPage } from './ContractingBoqPage';
import { ContractingPlanningPage } from './ContractingPlanningPage';
import { ContractingFinancialsPage } from './ContractingFinancialsPage';
import { ContractingProcurementPage } from './ContractingProcurementPage';
import { ContractingFieldPage } from './ContractingFieldPage';
import { ContractingCloseoutPage } from './ContractingCloseoutPage';

function ContractingLayoutContent({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Dialog states
  const [isTenderEstimatorOpen, setIsTenderEstimatorOpen] = useState(false);
  const [isLicensesModalOpen, setIsLicensesModalOpen] = useState(false);
  const [isMobilizationModalOpen, setIsMobilizationModalOpen] = useState(false);
  const [isScheduleGeneratorOpen, setIsScheduleGeneratorOpen] = useState(false);
  const [isMrpModalOpen, setIsMrpModalOpen] = useState(false);

  // 5 Global Benchmark Pillars Dialogs
  const [isSubmittalsModalOpen, setIsSubmittalsModalOpen] = useState(false);
  const [isEscalationsModalOpen, setIsEscalationsModalOpen] = useState(false);
  const [isEvmModalOpen, setIsEvmModalOpen] = useState(false);
  const [isBackchargesModalOpen, setIsBackchargesModalOpen] = useState(false);
  const [isFuelLogsModalOpen, setIsFuelLogsModalOpen] = useState(false);
  const [isWorkflowMapOpen, setIsWorkflowMapOpen] = useState(false);

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
    { label: 'المقاولات والمشاريع', to: '/contracting' },
  ]);

  // Backward compatibility & direct URL normalization: If accessed via `/contracting` or `/contracting?tab=xxx`, redirect cleanly
  useEffect(() => {
    if (location.pathname === '/contracting') {
      const tabParam = searchParams.get('tab');
      const pid = searchParams.get('projectId');
      const targetSub = tabParam && tabParam !== 'projects' ? tabParam : 'projects';
      const query = pid ? `?projectId=${pid}` : '';
      navigate(`/contracting/${targetSub}${query}`, { replace: true });
    }
  }, [searchParams, location.pathname, navigate]);

  // Robust active tab subpath detection
  const subSegments = location.pathname.split('/').filter(Boolean);
  const currentSubPath = subSegments[0] === 'contracting' && subSegments[1] ? subSegments[1] : 'projects';

  const isTabActive = (tabPath: string) => {
    if (tabPath === 'projects') return currentSubPath === 'projects' || currentSubPath === '';
    if (tabPath === 'tender') return currentSubPath === 'tender';
    if (tabPath === 'boq') return currentSubPath === 'boq';
    if (tabPath === 'planning') return currentSubPath === 'planning' || currentSubPath === 'gantt';
    if (tabPath === 'procurement') return currentSubPath === 'procurement' || currentSubPath === 'subcontracts' || currentSubPath === 'materials';
    if (tabPath === 'field') return currentSubPath === 'field' || currentSubPath === 'daily-logs' || currentSubPath === 'rfis';
    if (tabPath === 'financials') return currentSubPath === 'financials' || currentSubPath === 'invoices' || currentSubPath === 'change-orders';
    if (tabPath === 'closeout') return currentSubPath === 'closeout' || currentSubPath === 'handover' || currentSubPath === 'snag-list';
    return currentSubPath === tabPath;
  };

  const getCurrentPhase = (): ContractingPhaseKey => {
    if (isTabActive('tender')) return 'tender';
    if (isTabActive('boq')) return 'boq';
    if (isTabActive('planning')) return 'planning';
    if (isTabActive('procurement')) return 'procurement';
    if (isTabActive('field')) return 'field';
    if (isTabActive('financials')) return 'financials';
    if (isTabActive('closeout')) return 'closeout';
    return 'projects';
  };

  const handleNavigate = (pathWithOptionalQuery: string) => {
    const hasQuery = pathWithOptionalQuery.includes('?');
    const basePath = hasQuery ? pathWithOptionalQuery.split('?')[0] : pathWithOptionalQuery;
    const extraQuery = hasQuery ? pathWithOptionalQuery.split('?')[1] : '';

    const targetUrl = `/contracting/${basePath}`;
    const pid = selectedProjectId;

    const queryParts = [];
    if (pid) queryParts.push(`projectId=${pid}`);
    if (extraQuery) queryParts.push(extraQuery);

    const fullQuery = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    navigate(`${targetUrl}${fullQuery}`);
  };

  const handlePhaseSelect = (phaseKey: ContractingPhaseKey) => {
    handleNavigate(phaseKey);
  };

  return (
    <div className="page-stack page-shell contracting-page" dir="rtl">
      <main
        className="document-prototype-column"
        style={{
          paddingBottom: '80px',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* هيدر الصفحة القياسي الموحد */}
        <PageHeader
          title="المقاولات والمشاريع"
          description="إدارة العقود وجداول الكميات (SOV/BOQ)، الأوامر التغييرية، مستخلصات الدفع (AIA G702/G703)، واليوميات الميدانية."
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId(null);
                  navigate('/contracting/tender');
                }}
                style={{
                  height: '36px',
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
                  transition: 'all 0.15s ease',
                }}
              >
                <AppIcons.Sliders size={15} />
                <span>دراسة وتسعير عطاء جديد</span>
              </button>
              <button
                type="button"
                onClick={() => setIsWorkflowMapOpen(true)}
                style={{
                  height: '36px',
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
                  transition: 'all 0.15s ease',
                }}
              >
                <AppIcons.Layers size={15} />
                <span>خريطة مسار المشروع</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(true)}
                style={{
                  height: '36px',
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
                  boxShadow: '0 1px 3px rgba(23, 14, 94, 0.15)',
                  fontSize: 'var(--font-body)',
                  transition: 'all 0.15s ease',
                }}
              >
                <AppIcons.Plus size={15} />
                <span>مشروع إنشائي جديد</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await reloadProjects();
                    toast.success('تم تحديث بيانات ومؤشرات المشاريع بنجاح', undefined, 2000);
                  } catch (err) {
                    toast.error('فشل تحديث بيانات المشاريع');
                  }
                }}
                disabled={loading}
                title="تحديث بيانات المشاريع والمؤشرات"
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: loading ? 'wait' : 'pointer',
                  fontSize: 'var(--font-body)',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                <AppIcons.RefreshCw
                  size={14}
                  style={{
                    animation: loading ? 'spin 0.7s linear infinite' : 'none',
                  }}
                />
                <span>{loading ? 'جارٍ التحديث...' : 'تحديث'}</span>
              </button>
            </div>
          }
        />

        {/* بطاقات المؤشرات المالية والتشغيلية العامة (KPIs) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>إجمالي المشاريع الإنشائية</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {projects.length} <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#64748b' }}>مشروع</span>
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
              <AppIcons.Building size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>إجمالي القيمة التعاقدية الكلية</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {Number(kpis?.totalContractValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#170e5e' }}>
              <AppIcons.FileText size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>المستخلصات المعتمدة (Invoiced)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>
                {Number(kpis?.totalBilledToDate || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
              <AppIcons.Receipt size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>ضمان حسن التنفيذ المحتجز</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a16207', marginTop: '4px' }}>
                {Number(kpis?.totalRetentionsHeld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a16207' }}>
              <AppIcons.FileCheck size={20} />
            </div>
          </div>
        </div>

        {/* مسار مراحل المشروع المتسلسل القياسي من 1 إلى 7 (Project Lifecycle Stepper) */}
        <ProjectLifecycleStepper
          currentPhase={getCurrentPhase()}
          onPhaseSelect={handlePhaseSelect}
          activeProject={activeProject}
          totalProjectsCount={projects.length}
          onOpenTenderEstimator={() => handleNavigate('tender')}
        />

        {/* شريط اختيار المشروع السريع إذا لم نكن في شاشة سجل المشاريع */}
        {currentSubPath !== 'projects' && (
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
            {projects.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                  المشروع النشط:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
                    لا توجد مشاريع مسجلة بعد
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreateProjectOpen(true)}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      background: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      fontSize: 'var(--font-badge)',
                    }}
                  >
                    <AppIcons.Plus size={13} />
                    <span>تأسيس أول مشروع الآن</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '340px' }}>
                <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                  المشروع أو العطاء النشط:
                </span>
                <div style={{ minWidth: '300px', flex: 1 }}>
                  <CustomSelect
                    value={selectedProjectId || ''}
                    options={projects.map((p) => ({
                      value: p.id,
                      label: `[${p.code}] ${p.name}`,
                      hint: `${p.status === 'planning' ? 'عطاء قيد الدراسة' : 'مشروع ساري'} - ${p.clientName || 'العميل'}`,
                    }))}
                    onChange={(val) => setSelectedProjectId(val || null)}
                  />
                </div>
              </div>
            )}
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
            <div style={{ display: isTabActive('projects') ? 'block' : 'none', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <ContractingProjectsPage />
            </div>
            <div style={{ display: isTabActive('tender') ? 'block' : 'none', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <ContractingTenderPage />
            </div>
            <div style={{ display: isTabActive('boq') ? 'block' : 'none', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <ContractingBoqPage />
            </div>
            <div style={{ display: isTabActive('planning') ? 'block' : 'none', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <ContractingPlanningPage />
            </div>
            <div style={{ display: isTabActive('procurement') ? 'block' : 'none', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <ContractingProcurementPage initialSubTab={currentSubPath === 'materials' ? 'materials' : 'subcontracts'} />
            </div>
            <div style={{ display: isTabActive('field') ? 'block' : 'none', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <ContractingFieldPage initialSubTab={currentSubPath === 'rfis' ? 'rfis' : 'daily-logs'} />
            </div>
            <div style={{ display: isTabActive('financials') ? 'block' : 'none', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <ContractingFinancialsPage initialSubTab={currentSubPath === 'change-orders' ? 'change-orders' : 'invoices'} />
            </div>
            <div style={{ display: isTabActive('closeout') ? 'block' : 'none', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <ContractingCloseoutPage />
            </div>
          </>
        )}

        {/* النوافذ المنبثقة العامة */}
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

        {/* نافذة دراسة وتسعير العطاءات والمشروعات المحتملة (Popup Mode Fallback) */}
        {isTenderEstimatorOpen && (
          <TenderEstimatorModal
            isOpen={isTenderEstimatorOpen}
            onClose={() => setIsTenderEstimatorOpen(false)}
            onProjectCreated={async (newPid) => {
              await reloadProjects();
              setSelectedProjectId(newPid);
              navigate(`/contracting/boq?projectId=${newPid}`);
            }}
          />
        )}

        {/* النوافذ المنبثقة التابعة للمشروع النشط */}
        {activeProject && (
          <>
            <GovernmentLicensesModal
              open={isLicensesModalOpen}
              onClose={() => setIsLicensesModalOpen(false)}
              projectId={activeProject.id}
              projectName={activeProject.name}
            />

            <SiteMobilizationModal
              open={isMobilizationModalOpen}
              projectId={activeProject.id}
              projectName={activeProject.name}
              onClose={() => setIsMobilizationModalOpen(false)}
            />

            <ScheduleGeneratorModal
              open={isScheduleGeneratorOpen}
              projectId={activeProject.id}
              projectName={activeProject.name}
              onClose={() => setIsScheduleGeneratorOpen(false)}
            />

            <ProjectMaterialsMrpModal
              isOpen={isMrpModalOpen}
              onClose={() => setIsMrpModalOpen(false)}
              projectId={activeProject.id}
              projectName={activeProject.name}
            />

            {/* 5 Global Benchmark Pillars Modals */}
            <MaterialSubmittalsModal
              open={isSubmittalsModalOpen}
              onClose={() => setIsSubmittalsModalOpen(false)}
              projectId={activeProject.id}
              projectName={activeProject.name}
            />

            <MaterialPriceEscalationModal
              open={isEscalationsModalOpen}
              onClose={() => setIsEscalationsModalOpen(false)}
              projectId={activeProject.id}
              projectName={activeProject.name}
            />

            <ProjectEvmMetricsModal
              open={isEvmModalOpen}
              onClose={() => setIsEvmModalOpen(false)}
              projectId={activeProject.id}
              projectName={activeProject.name}
            />

            <SubcontractorBackChargesModal
              open={isBackchargesModalOpen}
              onClose={() => setIsBackchargesModalOpen(false)}
              projectId={activeProject.id}
              projectName={activeProject.name}
            />

            <EquipmentFuelLogsModal
              open={isFuelLogsModalOpen}
              onClose={() => setIsFuelLogsModalOpen(false)}
              projectId={activeProject.id}
              projectName={activeProject.name}
            />
          </>
        )}

        <ContractingWorkflowMapModal
          open={isWorkflowMapOpen}
          onClose={() => setIsWorkflowMapOpen(false)}
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
