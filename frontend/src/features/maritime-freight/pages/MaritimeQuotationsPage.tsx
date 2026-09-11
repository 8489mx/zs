import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { maritimeApi, MaritimeQuotation } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';
import { MaritimeQuotationsTab } from '../components/MaritimeQuotationsTab';

export function MaritimeQuotationsPage() {
  const navigate = useNavigate();
  const { refreshCounts } = useMaritime();
  const [quotations, setQuotations] = useState<MaritimeQuotation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.getQuotations();
      setQuotations(data);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const handleConvertToJob = async (quote: MaritimeQuotation) => {
    if (!confirm(`هل ترغب في تعميد عرض السعر ${quote.quotation_number} وتحويله مباشرة إلى أمر تشغيل ملاحي وفتح ملف الشحنة؟`)) return;
    try {
      const job = await maritimeApi.autoConvertQuotationToJob(quote.id);
      alert(`تم بنجاح فتح ملف الشحنة وأمر التشغيل رقم: ${job.job_number}`);
      await refreshCounts();
      navigate('/maritime/jobs');
    } catch (err: any) {
      alert(err?.message || 'فشل تحويل أمر التشغيل');
    }
  };

  const handleUpdateQuotationStatus = async (id: string, status: 'approved' | 'rejected' | 'sent') => {
    try {
      await maritimeApi.updateQuotationStatus(id, status);
      await loadQuotations();
      await refreshCounts();
    } catch (err: any) {
      alert(err?.message || 'فشل تحديث حالة العرض');
    }
  };

  return (
    <MaritimeQuotationsTab
      quotations={quotations}
      loading={loading}
      onConvertToJob={handleConvertToJob}
      onUpdateStatus={handleUpdateQuotationStatus}
    />
  );
}
