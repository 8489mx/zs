import { useState, useEffect, useCallback } from 'react';
import { maritimeApi, MaritimeJob } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';
import { MaritimeJobsTab } from '../components/MaritimeJobsTab';
import { JobDetailsModal } from '../components/JobDetailsModal';

export function MaritimeJobsPage() {
  const { setIsCreateRfqOpen, refreshCounts, refreshKey } = useMaritime();
  const [jobs, setJobs] = useState<MaritimeJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.getJobs();
      setJobs(data);
    } catch (err) {
      console.error('Failed to load maritime jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs, refreshKey]);

  return (
    <>
      <MaritimeJobsTab
        jobs={jobs}
        loading={loading}
        onSelectJob={(j) => setSelectedJobId(j.id)}
        onOpenCreateJob={() => setIsCreateRfqOpen(true)}
      />

      <JobDetailsModal
        open={Boolean(selectedJobId)}
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onUpdated={async () => {
          await loadJobs();
          await refreshCounts();
        }}
      />
    </>
  );
}
