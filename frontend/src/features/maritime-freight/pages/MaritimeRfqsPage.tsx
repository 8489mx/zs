import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { maritimeApi, MaritimeRfq } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';
import { MaritimeRfqTab } from '../components/MaritimeRfqTab';
import { CarrierBidEntryModal } from '../components/CarrierBidEntryModal';

export function MaritimeRfqsPage() {
  const navigate = useNavigate();
  const { setIsCreateRfqOpen, refreshCounts } = useMaritime();
  const [rfqs, setRfqs] = useState<MaritimeRfq[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAddBidOpen, setIsAddBidOpen] = useState(false);
  const [selectedRfqForBid, setSelectedRfqForBid] = useState<MaritimeRfq | null>(null);

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

  const handleDispatchEmails = async (rfqId: string) => {
    try {
      const res = await maritimeApi.dispatchRfqEmails(rfqId);
      alert(res.message);
      await loadRfqs();
      await refreshCounts();
    } catch (err: any) {
      alert(err?.message || 'فشل إرسال الإيميلات');
    }
  };

  return (
    <>
      <MaritimeRfqTab
        rfqs={rfqs}
        loading={loading}
        onOpenCreate={() => setIsCreateRfqOpen(true)}
        onSelectRfqForMatrix={handleSelectRfqForMatrix}
        onOpenAddBid={handleOpenAddBid}
        onDispatchEmails={handleDispatchEmails}
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
    </>
  );
}
