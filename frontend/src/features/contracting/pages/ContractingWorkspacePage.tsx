import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { useAppToolbar } from '@/stores/toolbar-store';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import {
  contractingApi,
} from '../api/contracting.api';
import type {
  ContractingProject,
  ContractingBoqItem,
  ContractingChangeOrder,
  ContractingInvoice,
  ContractingSubcontract,
  ContractingSiteDailyLog,
  ContractingRfi,
  ContractingSummaryKpis,
  ContractingScheduleTask,
  ContractingMaterialRequisition,
} from '../contracting.types';

// Modals
import { CreateProjectModal } from '../components/CreateProjectModal';
import { CreateBoqItemModal } from '../components/CreateBoqItemModal';
import { CreateChangeOrderModal } from '../components/CreateChangeOrderModal';
import { CreateIpcInvoiceModal } from '../components/CreateIpcInvoiceModal';
import { PrintIpcCertificateModal } from '../components/PrintIpcCertificateModal';
import { CreateSubcontractModal } from '../components/CreateSubcontractModal';
import { CreateDailyLogModal } from '../components/CreateDailyLogModal';
import { CreateRfiModal } from '../components/CreateRfiModal';
import { AnswerRfiModal } from '../components/AnswerRfiModal';
import { CreateScheduleTaskModal } from '../components/CreateScheduleTaskModal';
import { CreateMaterialRequisitionModal } from '../components/CreateMaterialRequisitionModal';

// Tabs
import { ContractingProjectsTab } from '../components/ContractingProjectsTab';
import { ContractingBoqTab } from '../components/ContractingBoqTab';
import { ContractingGanttTab } from '../components/ContractingGanttTab';
import { ContractingChangeOrdersTab } from '../components/ContractingChangeOrdersTab';
import { ContractingInvoicesTab } from '../components/ContractingInvoicesTab';
import { ContractingSubcontractsTab } from '../components/ContractingSubcontractsTab';
import { ContractingMaterialsTab } from '../components/ContractingMaterialsTab';
import { ContractingDailyLogsTab } from '../components/ContractingDailyLogsTab';
import { ContractingRfiTab } from '../components/ContractingRfiTab';

const VALID_TABS = ['projects', 'boq', 'gantt', 'change-orders', 'invoices', 'subcontracts', 'materials', 'daily-logs', 'rfis'] as const;
type ContractingTabKey = typeof VALID_TABS[number];

export function ContractingWorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ContractingTabKey;
  const activeTab: ContractingTabKey = VALID_TABS.includes(tabParam) ? tabParam : 'projects';
  const projectParam = searchParams.get('projectId');

  useAppToolbar([
    { label: 'الرئيسية', to: '/dashboard' },
    { label: 'المقاولات وإدارة المشاريع الإنشائية', to: '/contracting' },
  ]);

  const [projects, setProjects] = useState<ContractingProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectParam || null);
  const [kpis, setKpis] = useState<ContractingSummaryKpis | null>(null);
  const [loading, setLoading] = useState(false);

  // Selected project details & items
  const [boqItems, setBoqItems] = useState<ContractingBoqItem[]>([]);
  const [changeOrders, setChangeOrders] = useState<ContractingChangeOrder[]>([]);
  const [invoices, setInvoices] = useState<ContractingInvoice[]>([]);
  const [subcontracts, setSubcontracts] = useState<ContractingSubcontract[]>([]);
  const [dailyLogs, setDailyLogs] = useState<ContractingSiteDailyLog[]>([]);
  const [rfis, setRfis] = useState<ContractingRfi[]>([]);
  const [scheduleTasks, setScheduleTasks] = useState<ContractingScheduleTask[]>([]);
  const [materialRequisitions, setMaterialRequisitions] = useState<ContractingMaterialRequisition[]>([]);
  const [ipcFilter, setIpcFilter] = useState<'client' | 'subcontractor'>('client');

  // Modals state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateBoqItemOpen, setIsCreateBoqItemOpen] = useState(false);
  const [isCreateChangeOrderOpen, setIsCreateChangeOrderOpen] = useState(false);
  const [isCreateIpcOpen, setIsCreateIpcOpen] = useState(false);
  const [selectedIpcForPrint, setSelectedIpcForPrint] = useState<ContractingInvoice | null>(null);
  const [isCreateSubcontractOpen, setIsCreateSubcontractOpen] = useState(false);
  const [isCreateDailyLogOpen, setIsCreateDailyLogOpen] = useState(false);
  const [isCreateRfiOpen, setIsCreateRfiOpen] = useState(false);
  const [selectedRfiForAnswer, setSelectedRfiForAnswer] = useState<ContractingRfi | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateRequisitionOpen, setIsCreateRequisitionOpen] = useState(false);

  // Switch tab & persist in URL
  const switchTab = (tab: ContractingTabKey, projectId?: string) => {
    const nextParams: Record<string, string> = { tab };
    const pid = projectId || selectedProjectId;
    if (pid) nextParams.projectId = pid;
    setSearchParams(nextParams, { replace: true });
  };

  // Load all projects & summary KPIs
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const allProjects = await contractingApi.getProjects();
      setProjects(allProjects);

      const computedKpis: ContractingSummaryKpis = allProjects.reduce(
        (acc: ContractingSummaryKpis, p: ContractingProject) => ({
          totalContractValue: acc.totalContractValue + Number(p.revisedContractValue || p.contractValue || 0),
          totalBilledToDate: acc.totalBilledToDate + Number(p.totalBilledClient || 0),
          totalRetentionsHeld: acc.totalRetentionsHeld + Number(p.retentionTotalHeld || 0),
          activeProjectsCount: acc.activeProjectsCount + (p.status === 'active' ? 1 : 0),
        }),
        { totalContractValue: 0, totalBilledToDate: 0, totalRetentionsHeld: 0, activeProjectsCount: 0 }
      );
      setKpis(computedKpis);

      // Auto-select first project if none selected and projects exist
      if (!selectedProjectId && allProjects.length > 0) {
        setSelectedProjectId(allProjects[0].id);
      }
    } catch (e) {
      console.error('Failed to load contracting projects:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load project-specific data when selectedProjectId changes
  const loadProjectData = async (pid: string) => {
    if (!pid) return;
    try {
      const [items, cos, invs, subs, logs, rfiList, tasks, reqs] = await Promise.all([
        contractingApi.getBoqItems(pid),
        contractingApi.getChangeOrders(pid),
        contractingApi.getInvoices(pid, ipcFilter),
        contractingApi.getSubcontracts(pid),
        contractingApi.getDailyLogs(pid),
        contractingApi.getRfiList(pid),
        contractingApi.getScheduleTasks(pid),
        contractingApi.getMaterialRequisitions(pid),
      ]);
      setBoqItems(items);
      setChangeOrders(cos);
      setInvoices(invs);
      setSubcontracts(subs);
      setDailyLogs(logs);
      setRfis(rfiList);
      setScheduleTasks(tasks);
      setMaterialRequisitions(reqs);
    } catch (e) {
      console.error('Failed to load project details:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectData(selectedProjectId);
    }
  }, [selectedProjectId, ipcFilter]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || null;

  const handleSelectProject = (projectId: string, targetTab: string = 'boq') => {
    setSelectedProjectId(projectId);
    switchTab(targetTab as ContractingTabKey, projectId);
  };

  const handleProjectDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setSelectedProjectId(pid);
    const nextParams: Record<string, string> = { tab: activeTab };
    if (pid) nextParams.projectId = pid;
    setSearchParams(nextParams, { replace: true });
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
                onClick={() => {
                  loadInitialData();
                  if (selectedProjectId) loadProjectData(selectedProjectId);
                }}
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

        {/* شريط اختيار المشروع السريع إذا كان المستخدم في تبويبات المشروع */}
        {activeTab !== 'projects' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              padding: '12px 18px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              marginBottom: '14px',
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
              <div style={{ display: 'flex', gap: '16px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
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

        {/* شريط التبويبات القياسي الثابت */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: '#ffffff',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => switchTab('projects')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              background: activeTab === 'projects' ? '#170e5e' : 'transparent',
              color: activeTab === 'projects' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            المشاريع والعقود ({projects.length})
          </button>

          <button
            type="button"
            onClick={() => switchTab('boq')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              background: activeTab === 'boq' ? '#170e5e' : 'transparent',
              color: activeTab === 'boq' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            جدول الكميات (SOV/BOQ)
          </button>

          <button
            type="button"
            onClick={() => switchTab('gantt')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              background: activeTab === 'gantt' ? '#170e5e' : 'transparent',
              color: activeTab === 'gantt' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            الجدول ومخطط جانت (CPM)
          </button>

          <button
            type="button"
            onClick={() => switchTab('change-orders')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              background: activeTab === 'change-orders' ? '#170e5e' : 'transparent',
              color: activeTab === 'change-orders' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            الأوامر التغييرية والمطالبات
          </button>

          <button
            type="button"
            onClick={() => switchTab('invoices')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              background: activeTab === 'invoices' ? '#170e5e' : 'transparent',
              color: activeTab === 'invoices' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            المستخلصات وشهادات الدفع (IPC)
          </button>

          <button
            type="button"
            onClick={() => switchTab('subcontracts')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              background: activeTab === 'subcontracts' ? '#170e5e' : 'transparent',
              color: activeTab === 'subcontracts' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            مقاولي الباطن والالتزامات
          </button>

          <button
            type="button"
            onClick={() => switchTab('materials')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              background: activeTab === 'materials' ? '#170e5e' : 'transparent',
              color: activeTab === 'materials' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            أذون صرف الخامات
          </button>

          <button
            type="button"
            onClick={() => switchTab('daily-logs')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              background: activeTab === 'daily-logs' ? '#170e5e' : 'transparent',
              color: activeTab === 'daily-logs' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            يوميات الموقع الميدانية
          </button>

          <button
            type="button"
            onClick={() => switchTab('rfis')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              background: activeTab === 'rfis' ? '#170e5e' : 'transparent',
              color: activeTab === 'rfis' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            الاستفسارات الفنية (RFIs)
          </button>
        </div>

        {/* محتوى التبويب النشط */}
        {activeTab === 'projects' && (
          <ContractingProjectsTab
            projects={projects}
            loading={loading}
            onSelectProject={handleSelectProject}
            onNewProject={() => setIsCreateProjectOpen(true)}
          />
        )}

        {activeTab === 'boq' && (
          <ContractingBoqTab
            items={boqItems}
            loading={loading}
            projectId={selectedProjectId || undefined}
            projectName={activeProject?.name}
            onNewItem={() => setIsCreateBoqItemOpen(true)}
            onRefresh={() => {
              if (selectedProjectId) loadProjectData(selectedProjectId);
            }}
          />
        )}

        {activeTab === 'gantt' && (
          <ContractingGanttTab
            tasks={scheduleTasks}
            loading={loading}
            projectName={activeProject?.name}
            onNewTask={() => setIsCreateTaskOpen(true)}
            onTaskUpdated={() => {
              if (selectedProjectId) loadProjectData(selectedProjectId);
            }}
          />
        )}

        {activeTab === 'change-orders' && (
          <ContractingChangeOrdersTab
            changeOrders={changeOrders}
            loading={loading}
            projectName={activeProject?.name}
            onNewChangeOrder={() => setIsCreateChangeOrderOpen(true)}
            onRefresh={() => {
              loadInitialData();
              if (selectedProjectId) loadProjectData(selectedProjectId);
            }}
          />
        )}

        {activeTab === 'invoices' && (
          <ContractingInvoicesTab
            invoices={invoices}
            loading={loading}
            project={activeProject}
            ipcFilter={ipcFilter}
            onFilterChange={setIpcFilter}
            onNewInvoice={() => setIsCreateIpcOpen(true)}
            onPrintCertificate={(inv) => setSelectedIpcForPrint(inv)}
            onRefresh={() => {
              loadInitialData();
              if (selectedProjectId) loadProjectData(selectedProjectId);
            }}
          />
        )}

        {activeTab === 'subcontracts' && (
          <ContractingSubcontractsTab
            subcontracts={subcontracts}
            loading={loading}
            projectName={activeProject?.name}
            onNewSubcontract={() => setIsCreateSubcontractOpen(true)}
          />
        )}

        {activeTab === 'materials' && (
          <ContractingMaterialsTab
            requisitions={materialRequisitions}
            loading={loading}
            projectName={activeProject?.name}
            onNewRequisition={() => setIsCreateRequisitionOpen(true)}
            onRequisitionDeleted={() => {
              if (selectedProjectId) loadProjectData(selectedProjectId);
            }}
          />
        )}

        {activeTab === 'daily-logs' && (
          <ContractingDailyLogsTab
            dailyLogs={dailyLogs}
            loading={loading}
            projectName={activeProject?.name}
            onNewLog={() => setIsCreateDailyLogOpen(true)}
          />
        )}

        {activeTab === 'rfis' && (
          <ContractingRfiTab
            rfis={rfis}
            loading={loading}
            projectName={activeProject?.name}
            onNewRfi={() => setIsCreateRfiOpen(true)}
            onAnswerRfi={(rfi) => setSelectedRfiForAnswer(rfi)}
          />
        )}
      </main>

      {/* النوافذ المنبثقة القياسية */}
      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreated={loadInitialData}
      />

      {selectedProjectId && (
        <>
          <CreateBoqItemModal
            open={isCreateBoqItemOpen}
            projectId={selectedProjectId}
            projectName={activeProject?.name}
            onClose={() => setIsCreateBoqItemOpen(false)}
            onCreated={() => loadProjectData(selectedProjectId)}
          />

          <CreateChangeOrderModal
            open={isCreateChangeOrderOpen}
            projectId={selectedProjectId}
            projectName={activeProject?.name}
            onClose={() => setIsCreateChangeOrderOpen(false)}
            onCreated={() => {
              loadInitialData();
              loadProjectData(selectedProjectId);
            }}
          />

          {activeProject && (
            <CreateIpcInvoiceModal
              open={isCreateIpcOpen}
              project={activeProject}
              onClose={() => setIsCreateIpcOpen(false)}
              onCreated={() => {
                loadInitialData();
                loadProjectData(selectedProjectId);
              }}
            />
          )}

          <CreateSubcontractModal
            open={isCreateSubcontractOpen}
            projectId={selectedProjectId}
            projectName={activeProject?.name}
            onClose={() => setIsCreateSubcontractOpen(false)}
            onCreated={() => loadProjectData(selectedProjectId)}
          />

          <CreateDailyLogModal
            open={isCreateDailyLogOpen}
            projectId={selectedProjectId}
            projectName={activeProject?.name}
            onClose={() => setIsCreateDailyLogOpen(false)}
            onCreated={() => loadProjectData(selectedProjectId)}
          />

          <CreateRfiModal
            open={isCreateRfiOpen}
            projectId={selectedProjectId}
            projectName={activeProject?.name}
            onClose={() => setIsCreateRfiOpen(false)}
            onCreated={() => loadProjectData(selectedProjectId)}
          />

          <CreateScheduleTaskModal
            open={isCreateTaskOpen}
            projectId={selectedProjectId}
            projectName={activeProject?.name}
            boqItems={boqItems}
            existingTasks={scheduleTasks}
            onClose={() => setIsCreateTaskOpen(false)}
            onCreated={() => loadProjectData(selectedProjectId)}
          />

          <CreateMaterialRequisitionModal
            open={isCreateRequisitionOpen}
            projectId={selectedProjectId}
            projectName={activeProject?.name}
            boqItems={boqItems}
            onClose={() => setIsCreateRequisitionOpen(false)}
            onCreated={() => loadProjectData(selectedProjectId)}
          />
        </>
      )}

      {selectedIpcForPrint && (
        <PrintIpcCertificateModal
          open={Boolean(selectedIpcForPrint)}
          invoice={selectedIpcForPrint}
          onClose={() => setSelectedIpcForPrint(null)}
        />
      )}

      {selectedRfiForAnswer && (
        <AnswerRfiModal
          open={Boolean(selectedRfiForAnswer)}
          rfi={selectedRfiForAnswer}
          onClose={() => setSelectedRfiForAnswer(null)}
          onAnswered={() => {
            if (selectedProjectId) loadProjectData(selectedProjectId);
          }}
        />
      )}
    </div>
  );
}

export default ContractingWorkspacePage;
