import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { maritimeApi, MaritimeRfq } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';
import { MaritimeRfqTab } from '../components/MaritimeRfqTab';
import { CarrierBidEntryModal } from '../components/CarrierBidEntryModal';
import { DispatchRfqModal } from '../components/DispatchRfqModal';

export function MaritimeRfqsPage() {
  const navigate = useNavigate();
  const { setIsCreateRfqOpen, refreshCounts } = useMaritime();
  const [rfqs, setRfqs] = useState<MaritimeRfq[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAddBidOpen, setIsAddBidOpen] = useState(false);
  const [selectedRfqForBid, setSelectedRfqForBid] = useState<MaritimeRfq | null>(null);

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedRfqForDispatch, setSelectedRfqForDispatch] = useState<MaritimeRfq | null>(null);

  const loadRfqs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.getRfqs();
      setRfqs(data);
    } catch (err) {
      console.error('Failed to load RFQs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRfqs();
  }, [loadRfqs]);

  const handleSelectRfqForMatrix = (rfq: MaritimeRfq) => {
    navigate(`/maritime/matrix?rfqId=${rfq.id}`);
  };

  const handleOpenAddBid = (rfq: MaritimeRfq) => {
    setSelectedRfqForBid(rfq);
    setIsAddBidOpen(true);
  };

  const handleOpenDispatchModal = (rfq: MaritimeRfq) => {
    setSelectedRfqForDispatch(rfq);
    setIsDispatchModalOpen(true);
  };

  return (
    <>
      <MaritimeRfqTab
        rfqs={rfqs}
        loading={loading}
        onOpenCreate={() => setIsCreateRfqOpen(true)}
        onSelectRfqForMatrix={handleSelectRfqForMatrix}
        onOpenAddBid={handleOpenAddBid}
        onDispatchEmails={handleOpenDispatchModal}
      />

      <CarrierBidEntryModal
        open={isAddBidOpen}
        rfq={selectedRfqForBid}
        onClose={() => {
          setIsAddBidOpen(false);
          setSelectedRfqForBid(null);
        }}
        onSaved={async () => {
          await loadRfqs();
          await refreshCounts();
        }}
      />

      <DispatchRfqModal
        open={isDispatchModalOpen}
        rfq={selectedRfqForDispatch}
        onClose={() => {
          setIsDispatchModalOpen(false);
          setSelectedRfqForDispatch(null);
        }}
        onDispatched={async () => {
          await loadRfqs();
          await refreshCounts();
        }}
      />
    </>
  );
}
