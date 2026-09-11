import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingBoqItem } from '../contracting.types';
import { ContractingBoqTab } from '../components/ContractingBoqTab';
import { CreateBoqItemModal } from '../components/CreateBoqItemModal';

export function ContractingBoqPage() {
  const { selectedProjectId, activeProject } = useContracting();
  const [items, setItems] = useState<ContractingBoqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateBoqItemOpen, setIsCreateBoqItemOpen] = useState(false);

  const loadBoqItems = useCallback(async () => {
    if (!selectedProjectId) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      const data = await contractingApi.getBoqItems(selectedProjectId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load BOQ items:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadBoqItems();
  }, [loadBoqItems]);

  return (
    <>
      <ContractingBoqTab
        items={items}
        loading={loading}
        projectId={selectedProjectId || undefined}
        projectName={activeProject?.name}
        clientName={(activeProject as any)?.clientName || (activeProject as any)?.client}
        onNewItem={() => setIsCreateBoqItemOpen(true)}
        onRefresh={loadBoqItems}
      />

      {selectedProjectId && (
        <CreateBoqItemModal
          open={isCreateBoqItemOpen}
          projectId={selectedProjectId}
          projectName={activeProject?.name}
          onClose={() => setIsCreateBoqItemOpen(false)}
          onCreated={loadBoqItems}
        />
      )}
    </>
  );
}
