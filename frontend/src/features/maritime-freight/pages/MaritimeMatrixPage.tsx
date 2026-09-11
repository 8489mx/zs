import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { maritimeApi, MaritimeRfq, MaritimeRfqBid } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';
import { MaritimeMatrixTab } from '../components/MaritimeMatrixTab';
import { ApplyMarginModal } from '../components/ApplyMarginModal';
import { CarrierBidEntryModal } from '../components/CarrierBidEntryModal';

export function MaritimeMatrixPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rfqIdParam = searchParams.get('rfqId');

  const { refreshCounts } = useMaritime();
  const [rfqs, setRfqs] = useState<MaritimeRfq[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(rfqIdParam || null);

  const [isApplyMarginOpen, setIsApplyMarginOpen] = useState(false);
  const [selectedBidForMargin, setSelectedBidForMargin] = useState<{ rfq: MaritimeRfq; bid: MaritimeRfqBid } | null>(null);

  const [isAddBidOpen, setIsAddBidOpen] = useState(false);
  const [selectedRfqForBid, setSelectedRfqForBid] = useState<MaritimeRfq | null>(null);

  const loadRfqs = useCallback(async () => {
    try {
      const data = await maritimeApi.getRfqs();
      setRfqs(data);
      if (!selectedRfqId && data.length > 0) {
        setSelectedRfqId(rfqIdParam || data[0].id);
      }
    } catch (err) {
      console.error('Failed to load RFQs for matrix:', err);
    }
  }, [rfqIdParam, selectedRfqId]);

  useEffect(() => {
    loadRfqs();
  }, [loadRfqs]);

  const handleSelectRfqId = (id: string | null) => {
    setSelectedRfqId(id);
    if (id) {
      setSearchParams({ rfqId: id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleApproveBid = (rfq: MaritimeRfq, bid: MaritimeRfqBid) => {
    setSelectedBidForMargin({ rfq, bid });
    setIsApplyMarginOpen(true);
  };

  const handleOpenAddBid = (rfq: MaritimeRfq) => {
    setSelectedRfqForBid(rfq);
    setIsAddBidOpen(true);
  };

  return (
    <>
      <MaritimeMatrixTab
        rfqs={rfqs}
        selectedRfqId={selectedRfqId}
        onSelectRfqId={handleSelectRfqId}
        onApproveBid={handleApproveBid}
        onOpenAddBid={handleOpenAddBid}
      />

      <ApplyMarginModal
        open={isApplyMarginOpen}
        rfq={selectedBidForMargin?.rfq || null}
        bid={selectedBidForMargin?.bid || null}
        onClose={() => {
          setIsApplyMarginOpen(false);
          setSelectedBidForMargin(null);
        }}
        onSuccess={async () => {
          await refreshCounts();
          navigate('/maritime/quotations');
        }}
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
