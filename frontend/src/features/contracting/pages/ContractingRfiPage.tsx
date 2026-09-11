import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import type { ContractingRfi } from '../contracting.types';
import { ContractingRfiTab } from '../components/ContractingRfiTab';
import { CreateRfiModal } from '../components/CreateRfiModal';
import { AnswerRfiModal } from '../components/AnswerRfiModal';

export function ContractingRfiPage() {
  const { selectedProjectId, activeProject } = useContracting();
  const [rfis, setRfis] = useState<ContractingRfi[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateRfiOpen, setIsCreateRfiOpen] = useState(false);
  const [selectedRfiForAnswer, setSelectedRfiForAnswer] = useState<ContractingRfi | null>(null);

  const loadRfis = useCallback(async () => {
    if (!selectedProjectId) {
      setRfis([]);
      return;
    }
    try {
      setLoading(true);
      const data = await contractingApi.getRfiList(selectedProjectId);
      setRfis(data);
    } catch (err) {
      console.error('Failed to load RFIs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadRfis();
  }, [loadRfis]);

  return (
    <>
      <ContractingRfiTab
        rfis={rfis}
        loading={loading}
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
  );
}
