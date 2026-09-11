import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingMaterialRequisition, ContractingBoqItem } from '../contracting.types';
import { ContractingMaterialsTab } from '../components/ContractingMaterialsTab';
import { CreateMaterialRequisitionModal } from '../components/CreateMaterialRequisitionModal';

export function ContractingMaterialsPage() {
  const { selectedProjectId, activeProject } = useContracting();
  const [requisitions, setRequisitions] = useState<ContractingMaterialRequisition[]>([]);
  const [boqItems, setBoqItems] = useState<ContractingBoqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateRequisitionOpen, setIsCreateRequisitionOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedProjectId) {
      setRequisitions([]);
      setBoqItems([]);
      return;
    }
    try {
      setLoading(true);
      const [reqData, boqData] = await Promise.all([
        contractingApi.getMaterialRequisitions(selectedProjectId),
        contractingApi.getBoqItems(selectedProjectId),
      ]);
      setRequisitions(reqData);
      setBoqItems(boqData);
    } catch (err) {
      console.error('Failed to load materials data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <ContractingMaterialsTab
        requisitions={requisitions}
        loading={loading}
        projectId={selectedProjectId || undefined}
        projectName={activeProject?.name}
        onNewRequisition={() => setIsCreateRequisitionOpen(true)}
        onRequisitionDeleted={loadData}
      />

      {selectedProjectId && (
        <CreateMaterialRequisitionModal
          open={isCreateRequisitionOpen}
          projectId={selectedProjectId}
          projectName={activeProject?.name}
          boqItems={boqItems}
          onClose={() => setIsCreateRequisitionOpen(false)}
          onCreated={loadData}
        />
      )}
    </>
  );
}
