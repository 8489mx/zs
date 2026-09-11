import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingSubcontract } from '../contracting.types';
import { ContractingSubcontractsTab } from '../components/ContractingSubcontractsTab';
import { CreateSubcontractModal } from '../components/CreateSubcontractModal';

export function ContractingSubcontractsPage() {
  const { selectedProjectId, activeProject } = useContracting();
  const [subcontracts, setSubcontracts] = useState<ContractingSubcontract[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateSubcontractOpen, setIsCreateSubcontractOpen] = useState(false);

  const loadSubcontracts = useCallback(async () => {
    if (!selectedProjectId) {
      setSubcontracts([]);
      return;
    }
    try {
      setLoading(true);
      const data = await contractingApi.getSubcontracts(selectedProjectId);
      setSubcontracts(data);
    } catch (err) {
      console.error('Failed to load subcontracts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadSubcontracts();
  }, [loadSubcontracts]);

  return (
    <>
      <ContractingSubcontractsTab
        subcontracts={subcontracts}
        loading={loading}
        projectId={selectedProjectId || undefined}
        projectName={activeProject?.name}
        onNewSubcontract={() => setIsCreateSubcontractOpen(true)}
      />

      {selectedProjectId && (
        <CreateSubcontractModal
          open={isCreateSubcontractOpen}
          projectId={selectedProjectId}
          projectName={activeProject?.name}
          onClose={() => setIsCreateSubcontractOpen(false)}
          onCreated={loadSubcontracts}
        />
      )}
    </>
  );
}
