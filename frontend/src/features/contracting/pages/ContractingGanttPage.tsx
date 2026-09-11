import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingScheduleTask, ContractingBoqItem } from '../contracting.types';
import { ContractingGanttTab } from '../components/ContractingGanttTab';
import { CreateScheduleTaskModal } from '../components/CreateScheduleTaskModal';

export function ContractingGanttPage() {
  const { selectedProjectId, activeProject } = useContracting();
  const [tasks, setTasks] = useState<ContractingScheduleTask[]>([]);
  const [boqItems, setBoqItems] = useState<ContractingBoqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedProjectId) {
      setTasks([]);
      setBoqItems([]);
      return;
    }
    try {
      setLoading(true);
      const [tasksData, boqData] = await Promise.all([
        contractingApi.getScheduleTasks(selectedProjectId),
        contractingApi.getBoqItems(selectedProjectId),
      ]);
      setTasks(tasksData);
      setBoqItems(boqData);
    } catch (err) {
      console.error('Failed to load schedule tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <ContractingGanttTab
        tasks={tasks}
        loading={loading}
        projectName={activeProject?.name}
        onNewTask={() => setIsCreateTaskOpen(true)}
        onTaskUpdated={loadData}
      />

      {selectedProjectId && (
        <CreateScheduleTaskModal
          open={isCreateTaskOpen}
          projectId={selectedProjectId}
          projectName={activeProject?.name}
          boqItems={boqItems}
          existingTasks={tasks}
          onClose={() => setIsCreateTaskOpen(false)}
          onCreated={loadData}
        />
      )}
    </>
  );
}
