import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingSiteDailyLog } from '../contracting.types';
import { ContractingDailyLogsTab } from '../components/ContractingDailyLogsTab';
import { CreateDailyLogModal } from '../components/CreateDailyLogModal';

export function ContractingDailyLogsPage() {
  const { selectedProjectId, activeProject } = useContracting();
  const [dailyLogs, setDailyLogs] = useState<ContractingSiteDailyLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDailyLogOpen, setIsCreateDailyLogOpen] = useState(false);

  const loadDailyLogs = useCallback(async () => {
    if (!selectedProjectId) {
      setDailyLogs([]);
      return;
    }
    try {
      setLoading(true);
      const data = await contractingApi.getDailyLogs(selectedProjectId);
      setDailyLogs(data);
    } catch (err) {
      console.error('Failed to load daily logs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadDailyLogs();
  }, [loadDailyLogs]);

  return (
    <>
      <ContractingDailyLogsTab
        dailyLogs={dailyLogs}
        loading={loading}
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
  );
}
