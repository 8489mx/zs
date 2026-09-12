import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';
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
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(680px, 95vw)"
      ariaLabel="تسجيل معاملة خصم وتحصيل جديدة"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">تسجيل معاملة خصم وتحصيل جديدة (نموذج 41)</h3>
            <p className="standard-dialog-subtitle">إثبات خصم الضريبة من منبع الفاتورة وتوريدها لمصلحة الضرائب</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                اسم المورد / الممول <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newTx.partner_name}
                onChange={(e) => onChange({ ...newTx, partner_name: e.target.value })}
                placeholder="اسم الشركة أو التاجر أو المهني"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                رقم الفاتورة <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newTx.invoice_number}
                onChange={(e) => onChange({ ...newTx, invoice_number: e.target.value })}
                placeholder="مثال: INV-10492"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                تاريخ الفاتورة <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={newTx.invoice_date}
                onChange={(e) => onChange({ ...newTx, invoice_date: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                الرقم الضريبي (9 أرقام)
              </label>
              <input
                type="text"
                value={newTx.tax_id_number || ''}
                onChange={(e) => onChange({ ...newTx, tax_id_number: e.target.value })}
                placeholder="مثال: 100234567"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
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
                placeholder="مثال: مأمورية قصر النيل"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                نوع التعامل <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={newTx.wht_type}
                onChange={(e) => handleWhtTypeChange(e.target.value as any)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              >
                <option value="goods">توريدات وسلع (1%)</option>
                <option value="services">خدمات ومصنعيات (3%)</option>
                <option value="professional">مهن حرة واستشارات (5%)</option>
                <option value="custom">نسبة مخصصة أخرى</option>
              </select>
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
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                القيمة الإجمالية للتعامل (وعاء الخصم قبل الضريبة) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={newTx.base_amount || ''}
                onChange={(e) => onChange({ ...newTx, base_amount: Number(e.target.value) })}
                placeholder="0.00"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
              {newTx.base_amount > 0 && (
                <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#059669', fontWeight: 700 }}>
                  قيمة الضريبة المحتسبة: {formatCurrencyWithSymbol(newTx.base_amount * ((newTx.wht_rate || 1) / 100))}
                </div>
              )}
            </div>
          </div>

          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
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
              style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
            >
              {isPending ? 'جاري الحفظ...' : 'حفظ المعاملة'}
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
