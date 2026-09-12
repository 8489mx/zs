import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { maritimeApi, MaritimeQuotation } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';
import { MaritimeQuotationsTab } from '../components/MaritimeQuotationsTab';
import { toast, systemConfirm } from '@/shared/components/system-alert';

export function MaritimeQuotationsPage() {
  const navigate = useNavigate();
  const { refreshCounts, refreshKey } = useMaritime();
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
  }, [loadQuotations, refreshKey]);

  const handleConvertToJob = async (quote: MaritimeQuotation) => {
    const confirmed = await systemConfirm({
      title: 'تعميد عرض السعر وفتح ملف الشحنة',
      badge: quote.quotation_number,
      message: 'هل ترغب في تعميد عرض السعر وتحويله مباشرة إلى أمر تشغيل ملاحي رسمي وفتح ملف الشحنة؟',
      impactItems: [
        'فتح ملف أمر تشغيل ملاحي رسمي في سجل الشحنات المعتمدة.',
        'تحويل حالة عرض السعر إلى "معتمد ومُعَمَّد" (Approved).',
        'تفعيل تتبع مراحل الشحنة القياسية (DCSA) وإتاحة إصدار إذن التسليم.',
      ],
      confirmText: 'تأكيد التحويل وأمر التشغيل',
      cancelText: 'تراجع',
      variant: 'primary',
    });
    if (!confirmed) return;
    try {
      const job = await maritimeApi.autoConvertQuotationToJob(quote.id);
      toast.success(`تم بنجاح فتح ملف الشحنة وأمر التشغيل رقم: ${job.job_number}`, 'أمر التشغيل');
      await refreshCounts();
      navigate('/maritime/jobs');
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحويل أمر التشغيل', 'خطأ في التحويل');
    }
  };

  const handleUpdateQuotationStatus = async (id: string, status: 'approved' | 'rejected' | 'sent') => {
    try {
      await maritimeApi.updateQuotationStatus(id, status);
      await loadQuotations();
      await refreshCounts();
      toast.info('تم تحديث حالة العرض بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث حالة العرض', 'خطأ في التحديث');
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
