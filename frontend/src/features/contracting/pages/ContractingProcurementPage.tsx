import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import { toast } from '@/shared/components/system-alert';
import type { ContractingSubcontract, ContractingMaterialRequisition, ContractingBoqItem } from '../contracting.types';
import { ContractingSubcontractsTab } from '../components/ContractingSubcontractsTab';
import { ContractingMaterialsTab } from '../components/ContractingMaterialsTab';
import { CreateSubcontractModal } from '../components/CreateSubcontractModal';
import { CreateMaterialRequisitionModal } from '../components/CreateMaterialRequisitionModal';
import { MaterialSubmittalsModal } from '../components/MaterialSubmittalsModal';
import { MaterialPriceEscalationModal } from '../components/MaterialPriceEscalationModal';
import { ProjectMaterialsMrpModal } from '../components/ProjectMaterialsMrpModal';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface ContractingProcurementPageProps {
  initialSubTab?: 'subcontracts' | 'materials';
}

export function ContractingProcurementPage({ initialSubTab }: ContractingProcurementPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = (searchParams.get('sub') as 'subcontracts' | 'materials') || initialSubTab || 'subcontracts';
  const [activeSubTab, setActiveSubTab] = useState<'subcontracts' | 'materials'>(subParam);

  const { projects, selectedProjectId, setSelectedProjectId, activeProject, setIsCreateProjectOpen } = useContracting();

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

  // Advanced Global Benchmark Modals (Procore & RIB iTWO)
  const [isSubmittalsModalOpen, setIsSubmittalsModalOpen] = useState(false);
  const [isEscalationsModalOpen, setIsEscalationsModalOpen] = useState(false);
  const [isMrpModalOpen, setIsMrpModalOpen] = useState(false);

  const handleSubTabChange = (tab: 'subcontracts' | 'materials') => {
    setActiveSubTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sub', tab);
    setSearchParams(newParams, { replace: true });
  };

  const effectiveProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
  const effectiveProject = activeProject || (projects.length > 0 ? (projects.find((p) => p.id === effectiveProjectId) || projects[0]) : null);

  const loadSubcontracts = useCallback(async () => {
    if (!effectiveProjectId) {
      setSubcontracts([]);
      return;
    }
    try {
      setSubcontractsLoading(true);
      const data = await contractingApi.getSubcontracts(effectiveProjectId);
      setSubcontracts(data);
    } catch (err) {
      console.error('Failed to load subcontracts:', err);
    } finally {
      setSubcontractsLoading(false);
    }
  }, [effectiveProjectId]);

  const loadMaterials = useCallback(async () => {
    if (!effectiveProjectId) {
      setRequisitions([]);
      setBoqItems([]);
      return;
    }
    try {
      setMaterialsLoading(true);
      const [reqData, boqData] = await Promise.all([
        contractingApi.getMaterialRequisitions(effectiveProjectId),
        contractingApi.getBoqItems(effectiveProjectId),
      ]);
      setRequisitions(reqData);
      setBoqItems(boqData);
    } catch (err) {
      console.error('Failed to load materials data:', err);
    } finally {
      setMaterialsLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    if (activeSubTab === 'subcontracts') {
      loadSubcontracts();
    } else {
      loadMaterials();
    }
  }, [activeSubTab, loadSubcontracts, loadMaterials]);

  const handleOpenNewSubcontract = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً لإسناد أعمال لمقاول باطن.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateSubcontractOpen(true);
  };

  const handleOpenNewRequisition = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً لصرف وتخصيص خامات له.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateRequisitionOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* شريط التبديل الفرعي وأدوات الاعتمادات وفروق الأسعار */}
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
            عقود وإسناد مقاولي الباطن
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

        {/* أزرار الميزات العالمية: خطة الاحتياجات MRP واعتماد المواد MAR وفروق الأسعار */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsMrpModalOpen(true)}
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
            <AppIcons.Package size={15} />
            <span>خطة الاحتياجات (MRP)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSubmittalsModalOpen(true)}
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
            <AppIcons.FileCheck size={15} />
            <span>اعتمادات المواد والمخططات (MAR / MAS)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEscalationsModalOpen(true)}
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
            <span>فروق أسعار الخامات (Escalations)</span>
          </button>
        </div>
      </div>

      {/* محتوى التبويب النشط */}
      {activeSubTab === 'subcontracts' ? (
        <>
          <ContractingSubcontractsTab
            subcontracts={subcontracts}
            loading={subcontractsLoading}
            projectId={effectiveProjectId || undefined}
            projectName={effectiveProject?.name}
            project={effectiveProject}
            onNewSubcontract={handleOpenNewSubcontract}
            onRefresh={loadSubcontracts}
          />

          {effectiveProjectId && (
            <CreateSubcontractModal
              open={isCreateSubcontractOpen}
              projectId={effectiveProjectId}
              projectName={effectiveProject?.name}
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
            projectId={effectiveProjectId || undefined}
            projectName={effectiveProject?.name}
            onNewRequisition={handleOpenNewRequisition}
            onRequisitionDeleted={loadMaterials}
          />

          {effectiveProjectId && (
            <CreateMaterialRequisitionModal
              open={isCreateRequisitionOpen}
              projectId={effectiveProjectId}
              projectName={effectiveProject?.name}
              boqItems={boqItems}
              onClose={() => setIsCreateRequisitionOpen(false)}
              onCreated={loadMaterials}
            />
          )}
        </>
      )}

      {/* نافذة اعتمادات المواد والمخططات التنفيذية MAR / MAS */}
      {isSubmittalsModalOpen && effectiveProjectId && (
        <MaterialSubmittalsModal
          open={isSubmittalsModalOpen}
          onClose={() => setIsSubmittalsModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}

      {/* نافذة مطالبات فروق أسعار الخامات والتضخم */}
      {isEscalationsModalOpen && effectiveProjectId && (
        <MaterialPriceEscalationModal
          open={isEscalationsModalOpen}
          onClose={() => setIsEscalationsModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}

      {/* نافذة خطة الاحتياجات من المواد للمشروع (MRP) */}
      {isMrpModalOpen && effectiveProjectId && (
        <ProjectMaterialsMrpModal
          isOpen={isMrpModalOpen}
          onClose={() => setIsMrpModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}
    </div>
  );
}
