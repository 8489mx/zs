import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingChangeOrder } from '../contracting.types';
import { ContractingChangeOrdersTab } from '../components/ContractingChangeOrdersTab';
import { CreateChangeOrderModal } from '../components/CreateChangeOrderModal';

export function ContractingChangeOrdersPage() {
  const { selectedProjectId, activeProject, reloadProjects } = useContracting();
  const [changeOrders, setChangeOrders] = useState<ContractingChangeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateChangeOrderOpen, setIsCreateChangeOrderOpen] = useState(false);

  const loadChangeOrders = useCallback(async () => {
    if (!selectedProjectId) {
      setChangeOrders([]);
      return;
    }
    try {
      setLoading(true);
      const data = await contractingApi.getChangeOrders(selectedProjectId);
      setChangeOrders(data);
    } catch (err) {
      console.error('Failed to load change orders:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadChangeOrders();
  }, [loadChangeOrders]);

  return (
    <>
      <ContractingChangeOrdersTab
        changeOrders={changeOrders}
        loading={loading}
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
  );
}
