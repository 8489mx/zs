import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon, SparklesIcon } from '@/shared/components/icons/AppIcons';
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

export function ExtractWhtModal({
  isOpen,
  onClose,
  extractDates,
  onChange,
  onSubmit,
  isPending,
}: ExtractWhtModalProps) {
  if (!isOpen) return null;

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(540px, 95vw)"
      ariaLabel="استيراد آلي من فواتير المشتريات المسجلة"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}>
              <SparklesIcon size={18} />
              <h3 className="standard-dialog-title" style={{ color: '#065f46' }}>استيراد آلي من فواتير المشتريات المسجلة</h3>
            </div>
            <p className="standard-dialog-subtitle">فحص الفواتير التي تجاوزت 300 {getGlobalCurrencySymbol()} واستخراج بيانات الموردين</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            يقوم هذا المعالج بفحص جميع فواتير الشراء غير الملغاة التي تجاوزت 300 {getGlobalCurrencySymbol()} في الفترة المحددة، ويستخرج بيانات المورد والرقم الضريبي والوعاء تلقائياً لتضمينها في نموذج 41 دون تكرار.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>من تاريخ</label>
              <input
                type="date"
                value={extractDates.fromDate}
                onChange={(e) => onChange({ ...extractDates, fromDate: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>إلى تاريخ</label>
              <input
                type="date"
                value={extractDates.toDate}
                onChange={(e) => onChange({ ...extractDates, toDate: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>نسبة الخصم الافتراضية</label>
              <select
                value={extractDates.defaultWhtRate}
                onChange={(e) =>
                  onChange({
                    ...extractDates,
                    defaultWhtRate: Number(e.target.value),
                    defaultWhtType: Number(e.target.value) === 1 ? 'goods' : Number(e.target.value) === 5 ? 'professional' : 'services',
                  })
                }
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              >
                <option value={1}>1% (توريدات ومشتريات سلع وبضائع)</option>
                <option value={3}>3% (خدمات ومقاولات ومصنعيات)</option>
                <option value={5}>5% (مهن حرة واستشارات)</option>
              </select>
            </div>
          </div>

          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isPending}
              style={{ backgroundColor: '#059669', color: '#ffffff' }}
            >
              {isPending ? 'جاري الفحص والاستيراد...' : 'بدء الاستيراد الآلي'}
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
