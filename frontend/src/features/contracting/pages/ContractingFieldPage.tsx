import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import { toast } from '@/shared/components/system-alert';
import type {
  ContractingScheduleTask,
  ContractingBoqItem,
  ContractingSiteDailyLog,
  ContractingRfi,
} from '../contracting.types';
import { ContractingGanttTab } from '../components/ContractingGanttTab';
import { ContractingDailyLogsTab } from '../components/ContractingDailyLogsTab';
import { ContractingRfiTab } from '../components/ContractingRfiTab';
import { CreateScheduleTaskModal } from '../components/CreateScheduleTaskModal';
import { CreateDailyLogModal } from '../components/CreateDailyLogModal';
import { CreateRfiModal } from '../components/CreateRfiModal';
import { AnswerRfiModal } from '../components/AnswerRfiModal';

interface ContractingFieldPageProps {
  initialSubTab?: 'gantt' | 'daily-logs' | 'rfis';
}

export function ContractingFieldPage({ initialSubTab }: ContractingFieldPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = (searchParams.get('sub') as 'gantt' | 'daily-logs' | 'rfis') || initialSubTab || 'gantt';
  const [activeSubTab, setActiveSubTab] = useState<'gantt' | 'daily-logs' | 'rfis'>(subParam);

  const { projects, selectedProjectId, setSelectedProjectId, activeProject, setIsCreateProjectOpen } = useContracting();

  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Gantt tasks state
  const [tasks, setTasks] = useState<ContractingScheduleTask[]>([]);
  const [boqItems, setBoqItems] = useState<ContractingBoqItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  // Daily logs state
  const [dailyLogs, setDailyLogs] = useState<ContractingSiteDailyLog[]>([]);
  const [dailyLogsLoading, setDailyLogsLoading] = useState(false);
  const [isCreateDailyLogOpen, setIsCreateDailyLogOpen] = useState(false);

  // RFIs state
  const [rfis, setRfis] = useState<ContractingRfi[]>([]);
  const [rfisLoading, setRfisLoading] = useState(false);
  const [isCreateRfiOpen, setIsCreateRfiOpen] = useState(false);
  const [selectedRfiForAnswer, setSelectedRfiForAnswer] = useState<ContractingRfi | null>(null);

  const handleSubTabChange = (tab: 'gantt' | 'daily-logs' | 'rfis') => {
    setActiveSubTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sub', tab);
    setSearchParams(newParams, { replace: true });
  };

  const effectiveProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
  const effectiveProject = activeProject || (projects.length > 0 ? (projects.find((p) => p.id === effectiveProjectId) || projects[0]) : null);

  const loadGanttData = useCallback(async () => {
    if (!effectiveProjectId) {
      setTasks([]);
      setBoqItems([]);
      return;
    }
    try {
      setTasksLoading(true);
      const [tasksData, boqData] = await Promise.all([
        contractingApi.getScheduleTasks(effectiveProjectId),
        contractingApi.getBoqItems(effectiveProjectId),
      ]);
      setTasks(tasksData);
      setBoqItems(boqData);
    } catch (err) {
      console.error('Failed to load schedule tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }, [effectiveProjectId]);

  const loadDailyLogs = useCallback(async () => {
    if (!effectiveProjectId) {
      setDailyLogs([]);
      return;
    }
    try {
      setDailyLogsLoading(true);
      const data = await contractingApi.getDailyLogs(effectiveProjectId);
      setDailyLogs(data);
    } catch (err) {
      console.error('Failed to load daily logs:', err);
    } finally {
      setDailyLogsLoading(false);
    }
  }, [effectiveProjectId]);

  const loadRfis = useCallback(async () => {
    if (!effectiveProjectId) {
      setRfis([]);
      return;
    }
    try {
      setRfisLoading(true);
      const data = await contractingApi.getRfiList(effectiveProjectId);
      setRfis(data);
    } catch (err) {
      console.error('Failed to load RFIs:', err);
    } finally {
      setRfisLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    if (activeSubTab === 'gantt') {
      loadGanttData();
    } else if (activeSubTab === 'daily-logs') {
      loadDailyLogs();
    } else {
      loadRfis();
    }
  }, [activeSubTab, loadGanttData, loadDailyLogs, loadRfis]);

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

  const handleOpenNewLog = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً لتسجيل يومية موقع.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateDailyLogOpen(true);
  };

  const handleOpenNewRfi = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً لإرسال استفسار فني.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateRfiOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
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
          onClick={() => handleSubTabChange('gantt')}
          style={{
            padding: '7px 18px',
            borderRadius: '8px',
            fontSize: 'var(--font-body)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeSubTab === 'gantt' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'gantt' ? '#170e5e' : '#64748b',
            boxShadow: activeSubTab === 'gantt' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          الجدول الزمني ومخطط جانت (CPM)
        </button>

        <button
          type="button"
          onClick={() => handleSubTabChange('daily-logs')}
          style={{
            padding: '7px 18px',
            borderRadius: '8px',
            fontSize: 'var(--font-body)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeSubTab === 'daily-logs' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'daily-logs' ? '#170e5e' : '#64748b',
            boxShadow: activeSubTab === 'daily-logs' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          يوميات الموقع وتقارير التنفيذ
        </button>

        <button
          type="button"
          onClick={() => handleSubTabChange('rfis')}
          style={{
            padding: '7px 18px',
            borderRadius: '8px',
            fontSize: 'var(--font-body)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeSubTab === 'rfis' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'rfis' ? '#170e5e' : '#64748b',
            boxShadow: activeSubTab === 'rfis' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          الاستفسارات الهندسية (RFI)
        </button>
      </div>

      {/* محتوى التبويب النشط */}
      {activeSubTab === 'gantt' && (
        <>
          <ContractingGanttTab
            tasks={tasks}
            loading={tasksLoading}
            projectId={effectiveProjectId || undefined}
            projectName={effectiveProject?.name}
            onNewTask={handleOpenNewTask}
            onTaskUpdated={loadGanttData}
          />

          {effectiveProjectId && (
            <CreateScheduleTaskModal
              open={isCreateTaskOpen}
              projectId={effectiveProjectId}
              projectName={effectiveProject?.name}
              boqItems={boqItems}
              existingTasks={tasks}
              onClose={() => setIsCreateTaskOpen(false)}
              onCreated={loadGanttData}
            />
          )}
        </>
      )}

      {activeSubTab === 'daily-logs' && (
        <>
          <ContractingDailyLogsTab
            dailyLogs={dailyLogs}
            loading={dailyLogsLoading}
            projectId={effectiveProjectId || undefined}
            projectName={effectiveProject?.name}
            onNewLog={handleOpenNewLog}
          />

          {effectiveProjectId && (
            <CreateDailyLogModal
              open={isCreateDailyLogOpen}
              projectId={effectiveProjectId}
              projectName={effectiveProject?.name}
              onClose={() => setIsCreateDailyLogOpen(false)}
              onCreated={loadDailyLogs}
            />
          )}
        </>
      )}

      {activeSubTab === 'rfis' && (
        <>
          <ContractingRfiTab
            rfis={rfis}
            loading={rfisLoading}
            projectName={effectiveProject?.name}
            onNewRfi={handleOpenNewRfi}
            onAnswerRfi={(rfi) => setSelectedRfiForAnswer(rfi)}
          />

          {effectiveProjectId && (
            <CreateRfiModal
              open={isCreateRfiOpen}
              projectId={effectiveProjectId}
              projectName={effectiveProject?.name}
              onClose={() => setIsCreateRfiOpen(false)}
              onCreated={loadRfis}
            />
          )}

          {selectedRfiForAnswer && (
            <AnswerRfiModal
              open={Boolean(selectedRfiForAnswer)}
              rfi={selectedRfiForAnswer}
              onClose={() => setSelectedRfiForAnswer(null)}
              onAnswered={loadRfis}
            />
          )}
        </>
      )}
    </div>
  );
}
