import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingInvoice } from '../contracting.types';
import { ContractingInvoicesTab } from '../components/ContractingInvoicesTab';
import { CreateIpcInvoiceModal } from '../components/CreateIpcInvoiceModal';
import { PrintIpcCertificateModal } from '../components/PrintIpcCertificateModal';

export function ContractingInvoicesPage() {
  const { selectedProjectId, activeProject, reloadProjects } = useContracting();
  const [invoices, setInvoices] = useState<ContractingInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [ipcFilter, setIpcFilter] = useState<'client' | 'subcontractor'>('client');
  const [isCreateIpcOpen, setIsCreateIpcOpen] = useState(false);
  const [selectedIpcForPrint, setSelectedIpcForPrint] = useState<ContractingInvoice | null>(null);

  const loadInvoices = useCallback(async () => {
    if (!selectedProjectId) {
      setInvoices([]);
      return;
    }
    try {
      setLoading(true);
      const data = await contractingApi.getInvoices(selectedProjectId, ipcFilter);
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load contracting invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, ipcFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  return (
    <>
      <ContractingInvoicesTab
        invoices={invoices}
        loading={loading}
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

      {selectedIpcForPrint && (
        <PrintIpcCertificateModal
          open={Boolean(selectedIpcForPrint)}
          invoice={selectedIpcForPrint}
          onClose={() => setSelectedIpcForPrint(null)}
        />
      )}
    </>
  );
}
