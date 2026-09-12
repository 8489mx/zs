import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingInvoice, ContractingChangeOrder } from '../contracting.types';
import { ContractingInvoicesTab } from '../components/ContractingInvoicesTab';
import { ContractingChangeOrdersTab } from '../components/ContractingChangeOrdersTab';
import { CreateIpcInvoiceModal } from '../components/CreateIpcInvoiceModal';
import { PrintIpcCertificateModal } from '../components/PrintIpcCertificateModal';
import { CreateChangeOrderModal } from '../components/CreateChangeOrderModal';

interface ContractingFinancialsPageProps {
  initialSubTab?: 'invoices' | 'change-orders';
}

export function ContractingFinancialsPage({ initialSubTab }: ContractingFinancialsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = (searchParams.get('sub') as 'invoices' | 'change-orders') || initialSubTab || 'invoices';
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'change-orders'>(subParam);

  const { selectedProjectId, activeProject, reloadProjects } = useContracting();

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

  // Update URL on sub-tab change
  const handleSubTabChange = (tab: 'invoices' | 'change-orders') => {
    setActiveSubTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sub', tab);
    setSearchParams(newParams, { replace: true });
  };

  const loadInvoices = useCallback(async () => {
    if (!selectedProjectId) {
      setInvoices([]);
      return;
    }
    try {
      setInvoicesLoading(true);
      const data = await contractingApi.getInvoices(selectedProjectId, ipcFilter);
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load contracting invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, [selectedProjectId, ipcFilter]);

  const loadChangeOrders = useCallback(async () => {
    if (!selectedProjectId) {
      setChangeOrders([]);
      return;
    }
    try {
      setChangeOrdersLoading(true);
      const data = await contractingApi.getChangeOrders(selectedProjectId);
      setChangeOrders(data);
    } catch (err) {
      console.error('Failed to load change orders:', err);
    } finally {
      setChangeOrdersLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (activeSubTab === 'invoices') {
      loadInvoices();
    } else {
      loadChangeOrders();
    }
  }, [activeSubTab, loadInvoices, loadChangeOrders]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* شريط التبديل الفرعي (Sub-Pill Toggle) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '16px',
          width: 'fit-content',
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

      {/* محتوى التبويب الفرعي النشط */}
      {activeSubTab === 'invoices' ? (
        <>
          <ContractingInvoicesTab
            invoices={invoices}
            loading={invoicesLoading}
            project={activeProject}
            ipcFilter={ipcFilter}
            onFilterChange={setIpcFilter}
            onNewInvoice={() => setIsCreateIpcOpen(true)}
            onPrintCertificate={(inv) => setSelectedIpcForPrint(inv)}
            onRefresh={() => {
              reloadProjects();
              loadInvoices();
            }}
          />

          {activeProject && (
            <CreateIpcInvoiceModal
              open={isCreateIpcOpen}
              project={activeProject}
              onClose={() => setIsCreateIpcOpen(false)}
              onCreated={() => {
                reloadProjects();
                loadInvoices();
              }}
            />
          )}

          {selectedIpcForPrint && activeProject && (
            <PrintIpcCertificateModal
              open={Boolean(selectedIpcForPrint)}
              invoice={selectedIpcForPrint}
              project={activeProject}
              onClose={() => setSelectedIpcForPrint(null)}
            />
          )}
        </>
      ) : (
        <>
          <ContractingChangeOrdersTab
            changeOrders={changeOrders}
            loading={changeOrdersLoading}
            projectName={activeProject?.name}
            onNewChangeOrder={() => setIsCreateChangeOrderOpen(true)}
            onRefresh={() => {
              reloadProjects();
              loadChangeOrders();
            }}
          />

          {selectedProjectId && (
            <CreateChangeOrderModal
              open={isCreateChangeOrderOpen}
              projectId={selectedProjectId}
              projectName={activeProject?.name}
              onClose={() => setIsCreateChangeOrderOpen(false)}
              onCreated={() => {
                reloadProjects();
                loadChangeOrders();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
