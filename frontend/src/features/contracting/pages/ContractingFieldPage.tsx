import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
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

  const { selectedProjectId, activeProject } = useContracting();

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

  const loadGanttData = useCallback(async () => {
    if (!selectedProjectId) {
      setTasks([]);
      setBoqItems([]);
      return;
    }
    try {
      setTasksLoading(true);
      const [tasksData, boqData] = await Promise.all([
        contractingApi.getScheduleTasks(selectedProjectId),
        contractingApi.getBoqItems(selectedProjectId),
      ]);
      setTasks(tasksData);
      setBoqItems(boqData);
    } catch (err) {
      console.error('Failed to load schedule tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }, [selectedProjectId]);

  const loadDailyLogs = useCallback(async () => {
    if (!selectedProjectId) {
      setDailyLogs([]);
      return;
    }
    try {
      setDailyLogsLoading(true);
      const data = await contractingApi.getDailyLogs(selectedProjectId);
      setDailyLogs(data);
    } catch (err) {
      console.error('Failed to load daily logs:', err);
    } finally {
      setDailyLogsLoading(false);
    }
  }, [selectedProjectId]);

  const loadRfis = useCallback(async () => {
    if (!selectedProjectId) {
      setRfis([]);
      return;
    }
    try {
      setRfisLoading(true);
      const data = await contractingApi.getRfiList(selectedProjectId);
      setRfis(data);
    } catch (err) {
      console.error('Failed to load RFIs:', err);
    } finally {
      setRfisLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (activeSubTab === 'gantt') {
      loadGanttData();
    } else if (activeSubTab === 'daily-logs') {
      loadDailyLogs();
    } else {
      loadRfis();
    }
  }, [activeSubTab, loadGanttData, loadDailyLogs, loadRfis]);

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
          الجدول الزمني ومخطط جانت
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
          يوميات الموقع الميدانية والعمالة
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
          الاستفسارات الفنية (RFIs)
        </button>
      </div>

      {/* محتوى التبويب النشط */}
      {activeSubTab === 'gantt' && (
        <>
          <ContractingGanttTab
            tasks={tasks}
            loading={tasksLoading}
            projectName={activeProject?.name}
            onNewTask={() => setIsCreateTaskOpen(true)}
            onTaskUpdated={loadGanttData}
          />

          {selectedProjectId && (
            <CreateScheduleTaskModal
              open={isCreateTaskOpen}
              projectId={selectedProjectId}
              projectName={activeProject?.name}
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
            projectId={selectedProjectId || undefined}
            projectName={activeProject?.name}
            onNewLog={() => setIsCreateDailyLogOpen(true)}
          />

          {selectedProjectId && (
            <CreateDailyLogModal
              open={isCreateDailyLogOpen}
              projectId={selectedProjectId}
              projectName={activeProject?.name}
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
            projectName={activeProject?.name}
            onNewRfi={() => setIsCreateRfiOpen(true)}
            onAnswerRfi={(rfi) => setSelectedRfiForAnswer(rfi)}
          />

          {selectedProjectId && (
            <CreateRfiModal
              open={isCreateRfiOpen}
              projectId={selectedProjectId}
              projectName={activeProject?.name}
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
