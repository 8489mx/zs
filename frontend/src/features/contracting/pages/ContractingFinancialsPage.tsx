import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import { toast } from '@/shared/components/system-alert';
import type { ContractingInvoice, ContractingChangeOrder } from '../contracting.types';
import { ContractingInvoicesTab } from '../components/ContractingInvoicesTab';
import { ContractingChangeOrdersTab } from '../components/ContractingChangeOrdersTab';
import { CreateIpcInvoiceModal } from '../components/CreateIpcInvoiceModal';
import { PrintIpcCertificateModal } from '../components/PrintIpcCertificateModal';
import { CreateChangeOrderModal } from '../components/CreateChangeOrderModal';
import { ProjectHandoverModal } from '../components/ProjectHandoverModal';
import { ProjectCostBreakdownModal } from '../components/ProjectCostBreakdownModal';
import { ProjectEvmMetricsModal } from '../components/ProjectEvmMetricsModal';
import { SubcontractorBackChargesModal } from '../components/SubcontractorBackChargesModal';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface ContractingFinancialsPageProps {
  initialSubTab?: 'invoices' | 'change-orders';
}

export function ContractingFinancialsPage({ initialSubTab }: ContractingFinancialsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = (searchParams.get('sub') as 'invoices' | 'change-orders') || initialSubTab || 'invoices';
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'change-orders'>(subParam);

  const { projects, selectedProjectId, setSelectedProjectId, activeProject, reloadProjects, setIsCreateProjectOpen } = useContracting();

  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Invoices state
  const [invoices, setInvoices] = useState<ContractingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [ipcFilter, setIpcFilter] = useState<'client' | 'subcontractor'>('client');
  const [isCreateIpcOpen, setIsCreateIpcOpen] = useState(false);
  const [selectedIpcForPrint, setSelectedIpcForPrint] = useState<ContractingInvoice | null>(null);

  // Change orders state
  const [changeOrders, setChangeOrders] = useState<ContractingChangeOrder[]>([]);
  const [changeOrdersLoading, setChangeOrdersLoading] = useState(false);
  const [isCreateChangeOrderOpen, setIsCreateChangeOrderOpen] = useState(false);

  // Global Pillars Modals
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isCostBreakdownModalOpen, setIsCostBreakdownModalOpen] = useState(false);
  const [isEvmModalOpen, setIsEvmModalOpen] = useState(false);
  const [isBackchargesModalOpen, setIsBackchargesModalOpen] = useState(false);

  // Update URL on sub-tab change
  const handleSubTabChange = (tab: 'invoices' | 'change-orders') => {
    setActiveSubTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sub', tab);
    setSearchParams(newParams, { replace: true });
  };

  const effectiveProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
  const effectiveProject = activeProject || (projects.length > 0 ? (projects.find((p) => p.id === effectiveProjectId) || projects[0]) : null);

  const loadInvoices = useCallback(async () => {
    if (!effectiveProjectId) {
      setInvoices([]);
      return;
    }
    try {
      setInvoicesLoading(true);
      const data = await contractingApi.getInvoices(effectiveProjectId, ipcFilter);
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load contracting invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, [effectiveProjectId, ipcFilter]);

  const loadChangeOrders = useCallback(async () => {
    if (!effectiveProjectId) {
      setChangeOrders([]);
      return;
    }
    try {
      setChangeOrdersLoading(true);
      const data = await contractingApi.getChangeOrders(effectiveProjectId);
      setChangeOrders(data);
    } catch (err) {
      console.error('Failed to load change orders:', err);
    } finally {
      setChangeOrdersLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    if (activeSubTab === 'invoices') {
      loadInvoices();
    } else {
      loadChangeOrders();
    }
  }, [activeSubTab, loadInvoices, loadChangeOrders]);

  const handleOpenNewInvoice = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً؛ المستخلصات تتطلب وجود مشروع نشط.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateIpcOpen(true);
  };

  const handleOpenNewChangeOrder = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً؛ أوامر التغيير تتطلب وجود مشروع نشط.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateChangeOrderOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* شريط التبديل الفرعي وأدوات EVM والاستقطاعات */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => handleSubTabChange('invoices')}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: 'var(--font-body)',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeSubTab === 'invoices' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'invoices' ? '#170e5e' : '#64748b',
              boxShadow: activeSubTab === 'invoices' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            مستخلصات المالك وشهادات الدفع (IPC)
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange('change-orders')}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: 'var(--font-body)',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeSubTab === 'change-orders' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'change-orders' ? '#170e5e' : '#64748b',
              boxShadow: activeSubTab === 'change-orders' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            الأوامر التغييرية والمطالبات التعاقدية
          </button>
        </div>

        {/* أزرار الإدارة المالية العالمية (EVM S-Curve, Back-Charges, Cost Breakdown) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsEvmModalOpen(true)}
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
            <AppIcons.TrendingUp size={15} />
            <span>القيمة المكتسبة (EVM & S-Curve)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBackchargesModalOpen(true)}
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
            <AppIcons.Receipt size={15} />
            <span>خصومات مقاولي الباطن (Back-Charges)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCostBreakdownModalOpen(true)}
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
            <AppIcons.BarChart size={15} />
            <span>تحليل التكاليف وميزانية المقايسة</span>
          </button>
        </div>
      </div>

      {/* محتوى التبويب الفرعي النشط */}
      {activeSubTab === 'invoices' ? (
        <>
          <ContractingInvoicesTab
            invoices={invoices}
            loading={invoicesLoading}
            project={activeProject}
            ipcFilter={ipcFilter}
            onFilterChange={setIpcFilter}
            onNewInvoice={handleOpenNewInvoice}
            onPrintCertificate={(inv) => setSelectedIpcForPrint(inv)}
            onRefresh={() => {
              reloadProjects();
              loadInvoices();
            }}
          />

          {effectiveProject && (
            <CreateIpcInvoiceModal
              open={isCreateIpcOpen}
              project={effectiveProject}
              onClose={() => setIsCreateIpcOpen(false)}
              onCreated={() => {
                reloadProjects();
                loadInvoices();
              }}
            />
          )}

          {selectedIpcForPrint && effectiveProject && (
            <PrintIpcCertificateModal
              open={Boolean(selectedIpcForPrint)}
              invoice={selectedIpcForPrint}
              project={effectiveProject}
              onClose={() => setSelectedIpcForPrint(null)}
            />
          )}
        </>
      ) : (
        <>
          <ContractingChangeOrdersTab
            changeOrders={changeOrders}
            loading={changeOrdersLoading}
            projectName={effectiveProject?.name}
            onNewChangeOrder={handleOpenNewChangeOrder}
            onRefresh={() => {
              reloadProjects();
              loadChangeOrders();
            }}
          />

          {effectiveProjectId && (
            <CreateChangeOrderModal
              open={isCreateChangeOrderOpen}
              projectId={effectiveProjectId}
              projectName={effectiveProject?.name}
              onClose={() => setIsCreateChangeOrderOpen(false)}
              onCreated={() => {
                reloadProjects();
                loadChangeOrders();
              }}
            />
          )}
        </>
      )}

      {/* مودال مؤشرات القيمة المكتسبة ومنحنى S-Curve العالمي */}
      {isEvmModalOpen && effectiveProjectId && (
        <ProjectEvmMetricsModal
          open={isEvmModalOpen}
          onClose={() => setIsEvmModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}

      {/* مودال خصومات ومخالفات مقاولي الباطن Back-Charges */}
      {isBackchargesModalOpen && effectiveProjectId && (
        <SubcontractorBackChargesModal
          open={isBackchargesModalOpen}
          onClose={() => setIsBackchargesModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}

      {/* مودال محاضر الاستلام الابتدائي والنهائي */}
      {isHandoverModalOpen && effectiveProject && (
        <ProjectHandoverModal
          open={isHandoverModalOpen}
          onClose={() => setIsHandoverModalOpen(false)}
          project={effectiveProject}
          onRefreshProject={reloadProjects}
        />
      )}

      {/* مودال تحليل التكاليف الفعلية الخماسية */}
      {isCostBreakdownModalOpen && effectiveProject && (
        <ProjectCostBreakdownModal
          open={isCostBreakdownModalOpen}
          onClose={() => setIsCostBreakdownModalOpen(false)}
          project={effectiveProject}
        />
      )}
    </div>
  );
}
