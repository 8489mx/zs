import React, { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { arCollectionsApi, type ArCollectionCaseItem } from '../../api/ar-collections.api';
import { PhoneIcon } from '@/shared/components/icons/AppIcons';

interface ArInteractionLogModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  caseItem: ArCollectionCaseItem | null;
}

export const ArInteractionLogModal: React.FC<ArInteractionLogModalProps> = ({
  open,
  onClose,
  onSuccess,
  caseItem,
}) => {
  const [interactionType, setInteractionType] = useState('call');
  const [resultStatus, setResultStatus] = useState('answered');
  const [details, setDetails] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [promisedAmount, setPromisedAmount] = useState<number>(0);
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interactionTypeOptions = [
    { value: 'call', label: 'اتصال هاتفي' },
    { value: 'whatsapp', label: 'محادثة وتنبيه واتساب' },
    { value: 'visit', label: 'زيارة ميدانية للمقر / المتجر' },
    { value: 'letter', label: 'خطاب مطالبة رسمي مسجل' },
    { value: 'dispute', label: 'جلسة تسوية ونزاع فواتير' },
    { value: 'other', label: 'إجراء تحصيل آخر' },
  ];

  const resultStatusOptions = [
    { value: 'answered', label: 'تم الرد والتواصل الإيجابي' },
    { value: 'promise_to_pay', label: 'تعهد العميل بالسداد في موعد محدد' },
    { value: 'no_answer', label: 'لا يوجد رد / الهاتف مغلق' },
    { value: 'disputed', label: 'اعتراض أو نزاع على الفاتورة' },
    { value: 'refused', label: 'رفض أو مماطلة في السداد' },
    { value: 'escalated', label: 'تصعيد الملف للشؤون القانونية / الإدارة' },
    { value: 'settled', label: 'تم سداد المستحقات بالكامل' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseItem) return;

    if (!details.trim()) {
      toast.warning('يرجى تدوين تفاصيل أو نتيجة التواصل.');
      return;
    }

    if (resultStatus === 'promise_to_pay' && !promisedDate) {
      toast.warning('يرجى تحديد تاريخ السداد المتعهد به.');
      return;
    }

    setIsSubmitting(true);
    try {
      await arCollectionsApi.logInteraction(caseItem.id, {
        interactionType,
        resultStatus,
        details: details.trim(),
        promisedDate: promisedDate || undefined,
        promisedAmount: promisedAmount > 0 ? promisedAmount : undefined,
        nextFollowupDate: nextFollowupDate || undefined,
      });

      toast.success('تم توثيق إجراء التحصيل وتحديث سجل المتابعة.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر توثيق الإجراء');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="توثيق إجراء تحصيل ومتابعة"
      subtitle={`العميل: ${caseItem?.customer_name || ''} | الهاتف: ${caseItem?.customer_phone || 'غير مسجل'}`}
      size="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              نوع قناة التواصل *
            </label>
            <CustomSelect
              options={interactionTypeOptions}
              value={interactionType}
              onChange={(val) => setInteractionType(val)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              نتيجة الإجراء والموقف الحالي *
            </label>
            <CustomSelect
              options={resultStatusOptions}
              value={resultStatus}
              onChange={(val) => setResultStatus(val)}
            />
          </div>
        </div>

        {resultStatus === 'promise_to_pay' && (
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
                تاريخ السداد المتعهد به *
              </label>
              <input
                type="date"
                required
                value={promisedDate}
                onChange={(e) => setPromisedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #6ee7b7',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
                المبلغ المتعهد بسداده (ج.م)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={promisedAmount || ''}
                onChange={(e) => setPromisedAmount(parseFloat(e.target.value) || 0)}
                placeholder={String(caseItem?.total_overdue || 0)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #6ee7b7',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                }}
              />
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            تفاصيل وملخص التواصل والردود *
          </label>
          <textarea
            required
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="اكتب خلاصة المكالمة أو المقابلة، رد العميل، مبررات التأخير أو أي التزامات تمت مناقشتها..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            تاريخ المتابعة القادمة (اختياري)
          </label>
          <input
            type="date"
            value={nextFollowupDate}
            onChange={(e) => setNextFollowupDate(e.target.value)}
            style={{
              width: '240px',
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
            }}
          />
        </div>

        <StandardDialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
          >
            {isSubmitting ? 'جاري التوثيق...' : 'حفظ الإجراء في السجل'}
          </Button>
        </StandardDialogFooter>
      </form>
    </StandardDialog>
  );
};
