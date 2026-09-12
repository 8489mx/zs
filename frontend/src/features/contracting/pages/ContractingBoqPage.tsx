import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import { toast } from '@/shared/components/system-alert';
import type { ContractingBoqItem } from '../contracting.types';
import { ContractingBoqTab } from '../components/ContractingBoqTab';
import { CreateBoqItemModal } from '../components/CreateBoqItemModal';

export function ContractingBoqPage() {
  const { projects, selectedProjectId, setSelectedProjectId, activeProject, setIsCreateProjectOpen } = useContracting();
  const [items, setItems] = useState<ContractingBoqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateBoqItemOpen, setIsCreateBoqItemOpen] = useState(false);

  const effectiveProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
  const effectiveProject = activeProject || (projects.length > 0 ? (projects.find((p) => p.id === effectiveProjectId) || projects[0]) : null);

  const loadBoqItems = useCallback(async () => {
    if (!effectiveProjectId) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      const data = await contractingApi.getBoqItems(effectiveProjectId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load BOQ items:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    loadBoqItems();
  }, [loadBoqItems]);

  const handleOpenNewItem = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً؛ بنود المقايسة ترتبط بمشروع محدد.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateBoqItemOpen(true);
  };

  return (
    <>
      <ContractingBoqTab
        items={items}
        loading={loading}
        projectId={effectiveProjectId || undefined}
        projectName={effectiveProject?.name}
        clientName={(effectiveProject as any)?.clientName || (effectiveProject as any)?.client}
        onNewItem={handleOpenNewItem}
        onRefresh={loadBoqItems}
      />

      {effectiveProjectId && (
        <CreateBoqItemModal
          open={isCreateBoqItemOpen}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
          onClose={() => setIsCreateBoqItemOpen(false)}
          onCreated={loadBoqItems}
        />
      )}
    </>
  );
}
