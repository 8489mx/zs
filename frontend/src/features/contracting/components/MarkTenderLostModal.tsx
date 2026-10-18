import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { contractingApi } from '../api/contracting.api';
import { toast } from '@/shared/components/system-alert';

interface MarkTenderLostModalProps {
  open: boolean;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const LOSS_REASON_OPTIONS = [
  { value: 'price_higher_than_competitor', label: 'السعر أعلى من المنافس الفائز', hint: 'سعر العرض المالي تجاوز ميزانية أو عروض الشركات المنافسة' },
  { value: 'client_cancelled_project', label: 'إلغاء أو تأجيل المشروع من المالك', hint: 'تم إيقاف أو إلغاء الطرح بالكامل من جهة الإسناد' },
  { value: 'payment_terms_conflict', label: 'عدم التوافق مع شروط الدفع والتمويل', hint: 'شروط الدفعة المقدمة أو فترات سداد المستخلصات غير مناسبة' },
  { value: 'technical_specifications', label: 'اشتراطات فنية أو خبرات مطلوبة', hint: 'متطلبات فنية أو سابقة أعمال أو معدات غير متاحة حالياً' },
  { value: 'duration_too_short', label: 'مدة التنفيذ غير كافية', hint: 'الجدول الزمني المطلوب من العميل يمثل مخاطرة تشغيلية عالية' },
  { value: 'other', label: 'أسباب أخرى', hint: 'أسباب إدارية أو تعاقدية أخرى' },
];

export function MarkTenderLostModal({
  open,
  projectId,
  projectCode,
  projectName,
  onClose,
  onSuccess,
}: MarkTenderLostModalProps) {
  const { t } = useTranslation();
  const [lossReason, setLossReason] = useState('price_higher_than_competitor');
  const [competitorPrice, setCompetitorPrice] = useState<number | ''>('');
  const [lossNotes, setLossNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lossReason) {
      toast.warning('يرجى اختيار سبب عدم الترسية');
      return;
    }

    setIsSubmitting(true);
    try {
      await contractingApi.markTenderLost(projectId, {
        lossReason,
        lossNotes: lossNotes.trim() || undefined,
        competitorPrice: competitorPrice !== '' ? Number(competitorPrice) : undefined,
      });
      toast.success('تمت أرشفة العطاء في سجل العطاءات التاريخية المرجعية بنجاح دون حذفه');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر أرشفة العطاء');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={t('contracting.mark_tender_lost_modal.s0', "أرشفة العطاء كـ (غير مرسّى / لم يُوفّق فيه)")}
      subtitle={`العطاء: [${projectCode || ''}] ${projectName || ''} - حفظ مرجعي دائم في قاعدة البيانات`}
      width="640px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.5 }}>
          <strong>{t('contracting.mark_tender_lost_modal.s1', "تنبيه هندسي:")}</strong> {t('contracting.mark_tender_lost_modal.s2', "العطاء لن يتم حذفه من المنظومة، بل سيتم نقله إلى")} <strong>{t('contracting.mark_tender_lost_modal.s3', "«أرشيف العطاءات التاريخية المرجعية»")}</strong> {t('contracting.mark_tender_lost_modal.s4', "للاحتفاظ بحسابات التكلفة وتفكيك أسعار الخامات والمصنعيات كمرجع تسعيري للعمليات المستقبلية.")}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
            {t('contracting.mark_tender_lost_modal.s5', "سبب عدم الترسية أو الرفض")} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <CustomSelect
            value={lossReason}
            options={LOSS_REASON_OPTIONS}
            onChange={(val) => setLossReason(val || 'price_higher_than_competitor')}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
            {t('contracting.mark_tender_lost_modal.s6', "السعر الفائز للمنافس (إن توفر للدراسة التحليلية)")}
          </label>
          <input
            type="number"
            min={0}
            step="any"
            value={competitorPrice}
            onChange={(e) => setCompetitorPrice(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={t('contracting.mark_tender_lost_modal.s7', "مثال: 1450000")}
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: 'var(--font-body)',
              color: '#0f172a',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
            {t('contracting.mark_tender_lost_modal.s8', "ملاحظات ودروس مستفادة للمكتب الفني")}
          </label>
          <textarea
            rows={3}
            value={lossNotes}
            onChange={(e) => setLossNotes(e.target.value)}
            placeholder={t('contracting.mark_tender_lost_modal.s9', "اكتب أي تفاصيل بخصوص أسعار السوق، عروض المنافسين، أو ملاحظات العميل...")}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: 'var(--font-body)',
              color: '#0f172a',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
            }}
          >
            {t('contracting.mark_tender_lost_modal.s10', "إلغاء")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              height: '36px',
              padding: '0 18px',
              borderRadius: '8px',
              fontWeight: 700,
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: 'var(--font-body)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isSubmitting ? 0.7 : 1,
              boxShadow: '0 1px 3px rgba(23, 14, 94, 0.2)',
            }}
          >
            <AppIcons.Archive size={15} />
            <span>{isSubmitting ? t('contracting.mark_tender_lost_modal.s11', "جاري الأرشفة...") : t('contracting.mark_tender_lost_modal.s12', "أرشفة العطاء في السجل التاريخي")}</span>
          </button>
        </div>
      </form>
    </StandardDialog>
  );
}
