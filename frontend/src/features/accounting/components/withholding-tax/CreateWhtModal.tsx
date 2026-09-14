import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { FileTextIcon, DollarSignIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrencyWithSymbol } from '@/lib/format';
import type { CreateWhtTransactionPayload } from '@/features/accounting/api/accounting.api';

interface CreateWhtModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTx: CreateWhtTransactionPayload;
  onChange: (payload: CreateWhtTransactionPayload) => void;
  onSubmit: () => void;
  isPending: boolean;
}

const WHT_TYPE_OPTIONS = [
  { value: 'goods', label: 'توريدات وسلع (1%)' },
  { value: 'services', label: 'خدمات ومصنعيات (3%)' },
  { value: 'professional', label: 'مهن حرة واستشارات (5%)' },
  { value: 'custom', label: 'نسبة مخصصة أخرى' },
];

export function CreateWhtModal({
  isOpen,
  onClose,
  newTx,
  onChange,
  onSubmit,
  isPending,
}: CreateWhtModalProps) {
  if (!isOpen) return null;

  const handleWhtTypeChange = (type: 'goods' | 'services' | 'professional' | 'custom') => {
    let rate = 1;
    if (type === 'goods') rate = 1;
    else if (type === 'services') rate = 3;
    else if (type === 'professional') rate = 5;
    onChange({
      ...newTx,
      wht_type: type,
      wht_rate: rate,
    });
  };

  return (
    <StandardDialog
      open={isOpen}
      onClose={onClose}
      title="تسجيل معاملة خصم وتحصيل جديدة (نموذج 41)"
      subtitle="إثبات خصم الضريبة من منبع الفاتورة وتوريدها لمصلحة الضرائب"
      size="lg"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Card 1: Partner & Invoice Details */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <FileTextIcon size={16} style={{ color: '#170e5e' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0 }}>بيانات المورد والفاتورة</h4>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
              اسم المورد / الممول <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="text"
              value={newTx.partner_name}
              onChange={(e) => onChange({ ...newTx, partner_name: e.target.value })}
              placeholder="اسم الشركة أو التاجر أو المهني"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                رقم الفاتورة <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                value={newTx.invoice_number}
                onChange={(e) => onChange({ ...newTx, invoice_number: e.target.value })}
                placeholder="INV-10492"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                تاريخ الفاتورة <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="date"
                value={newTx.invoice_date}
                onChange={(e) => onChange({ ...newTx, invoice_date: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                الرقم الضريبي (9 أرقام)
              </label>
              <input
                type="text"
                value={newTx.tax_id_number || ''}
                onChange={(e) => onChange({ ...newTx, tax_id_number: e.target.value })}
                placeholder="100234567"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                المأمورية الضريبية
              </label>
              <input
                type="text"
                value={newTx.tax_office_code || ''}
                onChange={(e) => onChange({ ...newTx, tax_office_code: e.target.value })}
                placeholder="مأمورية قصر النيل"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Calculation & Rates */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <DollarSignIcon size={16} style={{ color: '#170e5e' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0 }}>وعاء الخصم والنسبة المحتسبة</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                نوع التعامل <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <CustomSelect
                value={newTx.wht_type}
                onChange={(val) => handleWhtTypeChange(val as any)}
                options={WHT_TYPE_OPTIONS}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                نسبة الخصم (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={newTx.wht_rate || 0}
                onChange={(e) => onChange({ ...newTx, wht_rate: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
              القيمة الإجمالية للتعامل (وعاء الخصم قبل الضريبة) <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={newTx.base_amount || ''}
              onChange={(e) => onChange({ ...newTx, base_amount: Number(e.target.value) })}
              placeholder="0.00"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, backgroundColor: '#ffffff', boxSizing: 'border-box' }}
            />
          </div>

          {newTx.base_amount > 0 && (
            <div style={{
              backgroundColor: '#ecfdf5',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #a7f3d0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px', color: '#047857' }}>قيمة الضريبة المحتسبة:</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#047857' }}>
                {formatCurrencyWithSymbol(newTx.base_amount * ((newTx.wht_rate || 1) / 100))}
              </span>
            </div>
          )}
        </div>
      </div>

      <StandardDialogFooter>
        <Button variant="secondary" onClick={onClose} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}>
          إلغاء
        </Button>
        <Button
          onClick={onSubmit}
          disabled={
            isPending ||
            !newTx.partner_name ||
            !newTx.invoice_number ||
            !newTx.base_amount
          }
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: isPending || !newTx.partner_name || !newTx.invoice_number || !newTx.base_amount ? 0.6 : 1,
          }}
        >
          {isPending ? 'جاري الحفظ...' : 'حفظ المعاملة'}
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
}
