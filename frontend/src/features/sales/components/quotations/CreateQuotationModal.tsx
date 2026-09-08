import { DialogShell } from '@/shared/components/dialog-shell';
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
  const totals = calculateTotals();

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(860px, 95vw)"
      ariaLabel="إنشاء عرض سعر جديد"
      showCloseButton={true}
    >
      <div className="dialog-card" style={{ padding: '20px', direction: 'rtl' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
          إنشاء عرض سعر جديد للعميل
        </h3>

        {/* Customer Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>اسم العميل *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="اسم الشركة أو العميل"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>رقم الهاتف</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>صالح حتى تاريخ</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>العنوان أو تفاصيل التسليم</label>
          <input
            type="text"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="المحافظة / المدينة / العنوان"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
        </div>

        {/* Items Table */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '14px', color: '#1e293b' }}>قائمة الأصناف والخدمات</strong>
            <Button variant="secondary" onClick={addItem} style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <PlusIcon size={14} />
              <span>إضافة صنف</span>
            </Button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ textAlign: 'right', color: '#64748b', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px' }}>اسم الصنف / الخدمة</th>
                  <th style={{ padding: '8px', width: '80px' }}>الكمية</th>
                  <th style={{ padding: '8px', width: '100px' }}>السعر</th>
                  <th style={{ padding: '8px', width: '80px' }}>الضريبة %</th>
                  <th style={{ padding: '8px', width: '100px' }}>الإجمالي</th>
                  <th style={{ padding: '8px', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                  const lineTax = lineTotal * ((Number(item.tax_rate) || 0) / 100);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="text"
                          required
                          value={item.product_name}
                          onChange={(e) => updateItem(idx, 'product_name', e.target.value)}
                          placeholder="الصنف..."
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="number"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.tax_rate || 0}
                          onChange={(e) => updateItem(idx, 'tax_rate', Number(e.target.value))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '6px', fontWeight: 800, color: '#170e5e' }}>
                        {(lineTotal + lineTax).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <Trash2Icon size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', marginTop: '12px', fontSize: '13px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
            <span>المجموع الفرعي: <strong>{totals.subtotal.toFixed(2)} ج.م</strong></span>
            <span>الضريبة: <strong>{totals.taxTotal.toFixed(2)} ج.م</strong></span>
            <span style={{ fontSize: '15px', color: '#170e5e' }}>الإجمالي: <strong>{totals.grandTotal.toFixed(2)} ج.م</strong></span>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>ملاحظات داخلية</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>الشروط والأحكام المطبوعة</label>
            <textarea
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button
            variant="primary"
            style={{ background: '#170e5e', borderColor: '#170e5e', color: '#fff', fontWeight: 800 }}
            onClick={onSubmit}
            disabled={isPending || !customerName.trim()}
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ عرض السعر'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
