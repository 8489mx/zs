import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { maritimeApi } from '../api/maritime-freight.api';
import { MaritimeInquiry } from '../maritime-freight.types';
import { useMaritime } from '../context/MaritimeContext';
import { MaritimeInquiriesTab } from '../components/MaritimeInquiriesTab';
import { CreateInquiryModal } from '../components/CreateInquiryModal';
import { MaritimeWorkflowStepper } from '../components/MaritimeWorkflowStepper';

export function MaritimeInquiriesPage() {
  const navigate = useNavigate();
  const { refreshCounts } = useMaritime();
  const [inquiries, setInquiries] = useState<MaritimeInquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadInquiries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.getInquiries();
      setInquiries(data);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const handleConvertToRfq = async (inquiryId: string) => {
    try {
      const res: any = await maritimeApi.convertInquiryToRfq(inquiryId);
      const rfqNumber = res?.rfq_number || res?.rfq?.rfq_number || '';
      alert(`تم بنجاح تحويل طلب العميل إلى طلب تسعير ملاحي رقم: ${rfqNumber}`);
      await loadInquiries();
      await refreshCounts();
      navigate('/maritime/rfqs');
    } catch (err: any) {
      alert(err?.message || 'فشل تحويل الطلب إلى طلب تسعير');
    }
  };

  const handleNavigateToRfq = (_rfqId: string) => {
    navigate('/maritime/rfqs');
  };

  return (
    <>
      <MaritimeWorkflowStepper
        currentStepId="inquiry"
        onStepClick={(stepId) => {
          if (stepId === 'rfq') navigate('/maritime/rfqs');
          if (stepId === 'quotation') navigate('/maritime/quotations');
          if (stepId === 'job') navigate('/maritime/jobs');
          if (stepId === 'tracking') navigate('/maritime/jobs');
          if (stepId === 'delivery') navigate('/maritime/containers');
        }}
      />

      <MaritimeInquiriesTab
        inquiries={inquiries}
        loading={loading}
        onOpenCreate={() => setIsCreateOpen(true)}
        onConvertToRfq={handleConvertToRfq}
        onNavigateToRfq={handleNavigateToRfq}
      />

      <CreateInquiryModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={async () => {
          await loadInquiries();
          await refreshCounts();
        }}
      />
    </>
  );
}

export default MaritimeInquiriesPage;
