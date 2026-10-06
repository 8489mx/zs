import { useState } from 'react';
import { useMaritime } from '../context/MaritimeContext';
import { FreightAuditTab } from './FreightAuditTab';
import { JobDetailsModal } from './JobDetailsModal';

export function MaritimeAuditTab() {
  const { refreshCounts } = useMaritime();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  return (
    <>
      <FreightAuditTab
        onOpenJobModal={(jobId) => setSelectedJobId(jobId)}
      />

      <JobDetailsModal
        open={Boolean(selectedJobId)}
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onUpdated={async () => {
          await refreshCounts();
        }}
      />
    </>
  );
}
