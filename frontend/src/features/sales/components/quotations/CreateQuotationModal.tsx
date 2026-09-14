import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { Button } from '@/shared/ui/button';
import { PlusIcon, Trash2Icon } from '@/shared/components/icons/AppIcons';
import { QuotationItem } from '@/features/sales/api/quotations.api';

interface CreateQuotationModalProps {
  open: boolean;
  onClose: () => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerAddress: string;
  setCustomerAddress: (v: string) => void;
  validUntil: string;
  setValidUntil: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  termsConditions: string;
  setTermsConditions: (v: string) => void;
  items: QuotationItem[];
  addItem: () => void;
  updateItem: (idx: number, field: keyof QuotationItem, val: any) => void;
  removeItem: (idx: number) => void;
  calculateTotals: () => { subtotal: number; taxTotal: number; grandTotal: number };
  onSubmit: () => void;
  isPending: boolean;
}

export function CreateQuotationModal({
  open,
  onClose,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  validUntil,
  setValidUntil,
  notes,
  setNotes,
  termsConditions,
  setTermsConditions,
  items,
  addItem,
  updateItem,
  removeItem,
  calculateTotals,
  onSubmit,
  isPending,
}: CreateQuotationModalProps) {
  const { currencySymbol } = useSystemCurrency();
  if (!open) return null;
  const totals = calculateTotals();

  return (
    <StandardDialog
      isOpen={open}
      onClose={onClose}
      title="إنشاء عرض سعر جديد (Quotation)"
      subtitle="تجهيز تسعير مفصل مع حساب الضرائب والشروط التعاقدية للعميل"
      maxWidth="880px"
      footer={
        <StandardDialogFooter
          onClose={onClose}
          closeLabel="إلغاء"
          primaryButton={{
            label: isPending ? 'جاري الحفظ...' : 'حفظ عرض السعر',
            onClick: onSubmit,
            disabled: isPending || !customerName.trim(),
          }}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Card 1: Customer Details */}
        <div
          style={{
            padding: 16,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#170e5e', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
            بيانات العميل وفترة الصلاحية
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>اسم العميل *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اسم الشركة أو العميل..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>رقم الهاتف</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="رقم الهاتف للتواصل..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>صالح حتى تاريخ</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>العنوان أو تفاصيل التسليم</label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="المحافظة / المدينة / العنوان التفصيلي..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Card 2: Items Table */}
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', color: '#170e5e' }}>قائمة الأصناف والخدمات المسعرة</strong>
            <Button
              variant="secondary"
              onClick={addItem}
              style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <PlusIcon size={14} />
              <span>إضافة صنف</span>
            </Button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
              <thead>
                <tr style={{ color: '#475569', backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontWeight: 700 }}>
                  <th style={{ padding: '8px 12px' }}>اسم الصنف / الخدمة</th>
                  <th style={{ padding: '8px 12px', width: '85px', textAlign: 'center' }}>الكمية</th>
                  <th style={{ padding: '8px 12px', width: '105px', textAlign: 'center' }}>السعر</th>
                  <th style={{ padding: '8px 12px', width: '85px', textAlign: 'center' }}>الضريبة %</th>
                  <th style={{ padding: '8px 12px', width: '110px', textAlign: 'left' }}>الإجمالي</th>
                  <th style={{ padding: '8px 12px', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                  const lineTax = lineTotal * ((Number(item.tax_rate) || 0) / 100);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          required
                          value={item.product_name}
                          onChange={(e) => updateItem(idx, 'product_name', e.target.value)}
                          placeholder="اسم الصنف أو التوصيف..."
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.tax_rate || 0}
                          onChange={(e) => updateItem(idx, 'tax_rate', Number(e.target.value))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: '#170e5e', textAlign: 'left' }}>
                        {(lineTotal + lineTax).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="حذف البند"
                        >
                          <Trash2Icon size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', padding: '12px 16px', backgroundColor: '#f8fafc', fontSize: '12.5px', borderTop: '1px solid #e2e8f0' }}>
            <span>المجموع الفرعي: <strong>{totals.subtotal.toFixed(2)} {currencySymbol}</strong></span>
            <span>الضريبة: <strong>{totals.taxTotal.toFixed(2)} {currencySymbol}</strong></span>
            <span style={{ fontSize: '14px', color: '#170e5e', fontWeight: 800 }}>
              الإجمالي: <strong>{totals.grandTotal.toFixed(2)} {currencySymbol}</strong>
            </span>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>ملاحظات داخلية</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>الشروط والأحكام المطبوعة</label>
            <textarea
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
