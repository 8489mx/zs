import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { maritimeApi, MaritimeRfq, MaritimeRfqBid } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';
import { MaritimeMatrixTab } from '../components/MaritimeMatrixTab';
import { ApplyMarginModal } from '../components/ApplyMarginModal';
import { CarrierBidEntryModal } from '../components/CarrierBidEntryModal';
import { toast } from '@/shared/components/system-alert';

export function MaritimeMatrixPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rfqIdParam = searchParams.get('rfqId');

  const { refreshCounts, refreshKey } = useMaritime();
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
  }, [loadRfqs, refreshKey]);

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

  const [syncing, setSyncing] = useState(false);

  const handleSyncEmails = async () => {
    try {
      setSyncing(true);
      const res = await maritimeApi.syncInboundBids();
      await loadRfqs();
      await refreshCounts();
      if (res.summary) {
        toast.success(res.summary, 'مزامنة البريد الملاحي');
      }
    } catch (err: any) {
      toast.error(err?.message || 'فشل مزامنة البريد الوارد', 'خطأ في المزامنة');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <MaritimeMatrixTab
        rfqs={rfqs}
        selectedRfqId={selectedRfqId}
        onSelectRfqId={handleSelectRfqId}
        onApproveBid={handleApproveBid}
        onOpenAddBid={handleOpenAddBid}
        onSyncEmails={handleSyncEmails}
        syncing={syncing}
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
