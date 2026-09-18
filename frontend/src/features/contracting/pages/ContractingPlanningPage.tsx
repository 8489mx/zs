import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import { toast } from '@/shared/components/system-alert';
import type { ContractingScheduleTask, ContractingBoqItem } from '../contracting.types';
import { ContractingGanttTab } from '../components/ContractingGanttTab';
import { CreateScheduleTaskModal } from '../components/CreateScheduleTaskModal';
import { GovernmentLicensesModal } from '../components/GovernmentLicensesModal';
import { SiteMobilizationModal } from '../components/SiteMobilizationModal';
import { AppIcons } from '@/shared/components/icons/AppIcons';

export function ContractingPlanningPage() {
  const { projects, selectedProjectId, setSelectedProjectId, activeProject, setIsCreateProjectOpen } = useContracting();

  const [tasks, setTasks] = useState<ContractingScheduleTask[]>([]);
  const [boqItems, setBoqItems] = useState<ContractingBoqItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isLicensesModalOpen, setIsLicensesModalOpen] = useState(false);
  const [isMobilizationModalOpen, setIsMobilizationModalOpen] = useState(false);

  const effectiveProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
  const effectiveProject = activeProject || (projects.length > 0 ? (projects.find((p) => p.id === effectiveProjectId) || projects[0]) : null);

  const loadData = useCallback(async () => {
    if (!effectiveProjectId) {
      setTasks([]);
      setBoqItems([]);
      return;
    }
    try {
      setLoading(true);
      const [tasksData, boqData] = await Promise.all([
        contractingApi.getScheduleTasks(effectiveProjectId),
        contractingApi.getBoqItems(effectiveProjectId),
      ]);
      setTasks(tasksData);
      setBoqItems(boqData);
    } catch (err) {
      console.error('Failed to load schedule tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenNewTask = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً لإضافة مهام الجدول الزمني إليه.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateTaskOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* هيدر التجهيز الميداني والتراخيص والموافقات */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170e5e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcons.Calendar size={20} />
            <span>المرحلة 3: التجهيز الميداني والجدول الزمني الإنشائي (Mobilization & Schedule)</span>
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            {effectiveProject ? `المشروع: [${effectiveProject.code}] ${effectiveProject.name}` : 'متابعة تراخيص البناء، تجهيز الموقع والمرافق، ومخطط جانت للمسار الحرج (CPM)'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsLicensesModalOpen(true)}
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
            <AppIcons.CheckShield size={15} />
            <span>التراخيص والموافقات الحكومية</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobilizationModalOpen(true)}
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
            <AppIcons.Tool size={15} />
            <span>تجهيزات الموقع (Mobilization)</span>
          </button>
        </div>
      </div>

      {/* مخطط جانت وجدول الأنشطة */}
      <ContractingGanttTab
        tasks={tasks}
        loading={loading}
        projectId={effectiveProjectId || undefined}
        projectName={effectiveProject?.name}
        onNewTask={handleOpenNewTask}
        onTaskUpdated={loadData}
      />

      {/* النوافذ المنبثقة التابعة للمرحلة 3 */}
      {effectiveProjectId && (
        <>
          <CreateScheduleTaskModal
            open={isCreateTaskOpen}
            projectId={effectiveProjectId}
            projectName={effectiveProject?.name}
            boqItems={boqItems}
            existingTasks={tasks}
            onClose={() => setIsCreateTaskOpen(false)}
            onCreated={loadData}
          />

          <GovernmentLicensesModal
            open={isLicensesModalOpen}
            projectId={effectiveProjectId}
            projectName={effectiveProject?.name}
            onClose={() => setIsLicensesModalOpen(false)}
          />

          <SiteMobilizationModal
            open={isMobilizationModalOpen}
            projectId={effectiveProjectId}
            projectName={effectiveProject?.name}
            onClose={() => setIsMobilizationModalOpen(false)}
          />
        </>
      )}
    </div>
  );
}
