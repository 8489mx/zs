import { useState, useEffect, useCallback } from 'react';
import { maritimeApi, MaritimeContainer } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';
import { DemurrageRadarTab } from './DemurrageRadarTab';
import { ContainerReturnModal } from './ContainerReturnModal';

export function MaritimeRadarTab() {
  const { refreshCounts, refreshKey } = useMaritime();
  const [containers, setContainers] = useState<MaritimeContainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<MaritimeContainer | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const loadContainers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.getContainers();
      setContainers(data);
    } catch (err) {
      console.error('Failed to load containers in radar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContainers();
  }, [loadContainers, refreshKey]);

  return (
    <>
      <DemurrageRadarTab
        containers={containers}
        loading={loading}
        onOpenReturnModal={(c) => {
          setSelectedContainer(c);
          setIsReturnModalOpen(true);
        }}
        onRefresh={loadContainers}
      />

      <ContainerReturnModal
        open={isReturnModalOpen}
        container={selectedContainer}
        onClose={() => {
          setIsReturnModalOpen(false);
          setSelectedContainer(null);
        }}
        onUpdated={async () => {
          await loadContainers();
          await refreshCounts();
        }}
      />
    </>
  );
}
