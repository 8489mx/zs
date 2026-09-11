import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingSubcontract, ContractingMaterialRequisition, ContractingBoqItem } from '../contracting.types';
import { ContractingSubcontractsTab } from '../components/ContractingSubcontractsTab';
import { ContractingMaterialsTab } from '../components/ContractingMaterialsTab';
import { CreateSubcontractModal } from '../components/CreateSubcontractModal';
import { CreateMaterialRequisitionModal } from '../components/CreateMaterialRequisitionModal';

interface ContractingProcurementPageProps {
  initialSubTab?: 'subcontracts' | 'materials';
}

export function ContractingProcurementPage({ initialSubTab }: ContractingProcurementPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = (searchParams.get('sub') as 'subcontracts' | 'materials') || initialSubTab || 'subcontracts';
  const [activeSubTab, setActiveSubTab] = useState<'subcontracts' | 'materials'>(subParam);

  const { selectedProjectId, activeProject } = useContracting();

  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Subcontracts state
  const [subcontracts, setSubcontracts] = useState<ContractingSubcontract[]>([]);
  const [subcontractsLoading, setSubcontractsLoading] = useState(false);
  const [isCreateSubcontractOpen, setIsCreateSubcontractOpen] = useState(false);

  // Materials state
  const [requisitions, setRequisitions] = useState<ContractingMaterialRequisition[]>([]);
  const [boqItems, setBoqItems] = useState<ContractingBoqItem[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [isCreateRequisitionOpen, setIsCreateRequisitionOpen] = useState(false);

  const handleSubTabChange = (tab: 'subcontracts' | 'materials') => {
    setActiveSubTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sub', tab);
    setSearchParams(newParams, { replace: true });
  };

  const loadSubcontracts = useCallback(async () => {
    if (!selectedProjectId) {
      setSubcontracts([]);
      return;
    }
    try {
      setSubcontractsLoading(true);
      const data = await contractingApi.getSubcontracts(selectedProjectId);
      setSubcontracts(data);
    } catch (err) {
      console.error('Failed to load subcontracts:', err);
    } finally {
      setSubcontractsLoading(false);
    }
  }, [selectedProjectId]);

  const loadMaterials = useCallback(async () => {
    if (!selectedProjectId) {
      setRequisitions([]);
      setBoqItems([]);
      return;
    }
    try {
      setMaterialsLoading(true);
      const [reqData, boqData] = await Promise.all([
        contractingApi.getMaterialRequisitions(selectedProjectId),
        contractingApi.getBoqItems(selectedProjectId),
      ]);
      setRequisitions(reqData);
      setBoqItems(boqData);
    } catch (err) {
      console.error('Failed to load materials data:', err);
    } finally {
      setMaterialsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (activeSubTab === 'subcontracts') {
      loadSubcontracts();
    } else {
      loadMaterials();
    }
  }, [activeSubTab, loadSubcontracts, loadMaterials]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* شريط التبديل الفرعي */}
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
          onClick={() => handleSubTabChange('subcontracts')}
          style={{
            padding: '7px 18px',
            borderRadius: '8px',
            fontSize: 'var(--font-body)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeSubTab === 'subcontracts' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'subcontracts' ? '#170e5e' : '#64748b',
            boxShadow: activeSubTab === 'subcontracts' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          عقود والتزامات مقاولي الباطن
        </button>

        <button
          type="button"
          onClick={() => handleSubTabChange('materials')}
          style={{
            padding: '7px 18px',
            borderRadius: '8px',
            fontSize: 'var(--font-body)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeSubTab === 'materials' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'materials' ? '#170e5e' : '#64748b',
            boxShadow: activeSubTab === 'materials' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          خامات وتشوينات الموقع (MRP)
        </button>
      </div>

      {/* محتوى التبويب النشط */}
      {activeSubTab === 'subcontracts' ? (
        <>
          <ContractingSubcontractsTab
            subcontracts={subcontracts}
            loading={subcontractsLoading}
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
      ) : (
        <>
          <ContractingMaterialsTab
            requisitions={requisitions}
            loading={materialsLoading}
            projectId={selectedProjectId || undefined}
            projectName={activeProject?.name}
            onNewRequisition={() => setIsCreateRequisitionOpen(true)}
            onRequisitionDeleted={loadMaterials}
          />

          {selectedProjectId && (
            <CreateMaterialRequisitionModal
              open={isCreateRequisitionOpen}
              projectId={selectedProjectId}
              projectName={activeProject?.name}
              boqItems={boqItems}
              onClose={() => setIsCreateRequisitionOpen(false)}
              onCreated={loadMaterials}
            />
          )}
        </>
      )}
    </div>
  );
}
