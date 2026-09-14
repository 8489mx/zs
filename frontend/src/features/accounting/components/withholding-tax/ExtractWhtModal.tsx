import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { RefreshCwIcon, CalendarIcon } from '@/shared/components/icons/AppIcons';
import { getGlobalCurrencySymbol } from '@/lib/currencies';

interface ExtractWhtModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractDates: {
    fromDate: string;
    toDate: string;
    defaultWhtType: 'goods' | 'services' | 'professional';
    defaultWhtRate: number;
  };
  onChange: (val: any) => void;
  onSubmit: () => void;
  isPending: boolean;
}

const DEFAULT_RATE_OPTIONS = [
  { value: '1', label: '1% (توريدات ومشتريات سلع وبضائع)' },
  { value: '3', label: '3% (خدمات ومقاولات ومصنعيات)' },
  { value: '5', label: '5% (مهن حرة واستشارات)' },
];

export function ExtractWhtModal({
  isOpen,
  onClose,
  extractDates,
  onChange,
  onSubmit,
  isPending,
}: ExtractWhtModalProps) {
  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="استيراد آلي لخصم ضريبة الأرباح التجارية من المشتريات"
      subtitle="فحص وتجميع الفواتير المستحقة لنموذج 41"
      maxWidth="560px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          backgroundColor: '#ecfdf5',
          borderRadius: '8px',
          padding: '12px 14px',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          fontSize: '12px',
          lineHeight: 1.6,
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}>
          <RefreshCwIcon size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#059669' }} />
          <span>
            يقوم هذا المعالج بفحص جميع فواتير الشراء غير الملغاة التي تجاوزت 300 {getGlobalCurrencySymbol()} في الفترة المحددة، ويستخرج بيانات المورد والرقم الضريبي والوعاء تلقائياً لتضمينها في نموذج 41 دون تكرار.
          </span>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <CalendarIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>فترة الفحص ونسبة الخصم المطبقة</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                من تاريخ <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="date"
                value={extractDates.fromDate}
                onChange={(e) => onChange({ ...extractDates, fromDate: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                إلى تاريخ <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="date"
                value={extractDates.toDate}
                onChange={(e) => onChange({ ...extractDates, toDate: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
              نسبة الخصم الافتراضية
            </label>
            <CustomSelect
              value={String(extractDates.defaultWhtRate)}
              onChange={(val) => {
                const rateNum = Number(val);
                onChange({
                  ...extractDates,
                  defaultWhtRate: rateNum,
                  defaultWhtType: rateNum === 1 ? 'goods' : rateNum === 5 ? 'professional' : 'services',
                });
              }}
              options={DEFAULT_RATE_OPTIONS}
            />
          </div>
        </div>
      </div>

      <StandardDialogFooter>
        <Button variant="secondary" onClick={onClose} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}>
          إلغاء
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isPending}
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'جاري الفحص والاستيراد...' : 'بدء الاستيراد الآلي'}
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
}
