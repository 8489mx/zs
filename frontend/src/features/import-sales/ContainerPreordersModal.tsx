import React, { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import {
  useContainerPreordersQuery,
  useCreateContainerPreorderMutation,
  ShipmentDetails,
} from './api/shipments.api';
import { formatCurrency } from '@/lib/format';
import {
  PlusCircleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  SlidersIcon,
  UsersIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';

interface ContainerPreordersModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: ShipmentDetails;
}

export function ContainerPreordersModal({ isOpen, onClose, shipment }: ContainerPreordersModalProps) {
  const { data: preorders = [], isLoading, refetch } = useContainerPreordersQuery(shipment.id);
  const createPreorderMutation = useCreateContainerPreorderMutation();

  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState(shipment.items[0]?.product_id || '');
  const [quantity, setQuantity] = useState<number>(100);
  const [unitPrice, setUnitPrice] = useState<number>(1500);
  const [depositAmount, setDepositAmount] = useState<number>(20000);
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res = await http<any[]>('/api/customers');
      return Array.isArray(res) ? res : (res as any)?.items || [];
    },
  });

  // Fetch treasury accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => http<any>('/api/accounting/accounts').catch(() => ({ accounts: [] })),
  });
  const treasuryAccounts = (accountsData?.accounts || (Array.isArray(accountsData) ? accountsData : [])).filter(
    (a: any) => a.accountGroup === 'current_assets' || a.isCashBank
  );

  if (!isOpen) return null;

  // Selected item capacity on B/L
  const selectedItem = shipment.items.find((i) => String(i.product_id) === String(productId));
  const blCapacity = selectedItem ? Number(selectedItem.quantity) : 0;
  const bookedForProduct = preorders
    .filter((p) => String(p.product_id) === String(productId) && p.status !== 'cancelled')
    .reduce((sum, p) => sum + Number(p.reserved_quantity), 0);
  const remainingCapacity = Math.max(0, blCapacity - bookedForProduct);
  const capacityPercent = blCapacity > 0 ? Math.min(100, (bookedForProduct / blCapacity) * 100) : 0;

  const handleCreatePreorder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('يرجى اختيار العميل');
      return;
    }
    if (!productId) {
      toast.error('يرجى اختيار الصنف');
      return;
    }
    if (quantity <= 0) {
      toast.error('الكمية يجب أن تكون أكبر من صفر');
      return;
    }
    if (quantity > remainingCapacity) {
      toast.error(`الكمية المطلوبة (${quantity}) تتجاوز السعة المتبقية بالبوليصة (${remainingCapacity})`);
      return;
    }

    try {
      setIsSubmitting(true);
      await createPreorderMutation.mutateAsync({
        shipmentId: shipment.id,
        projectId: (shipment as any).project_id || undefined,
        customerId,
        productId,
        reservedQuantity: Number(quantity),
        unitPriceEgp: Number(unitPrice),
        depositAmountEgp: Number(depositAmount),
        depositTreasuryAccountId: treasuryAccountId || undefined,
        expectedDeliveryDate: expectedDate || undefined,
        notes: notes || undefined,
      });
      toast.success('تم تسجيل حجز البضاعة العايمة وتوريد العربون بنجاح');
      setCustomerId('');
      setNotes('');
      refetch();
    } catch (err: any) {
      toast.error('فشل تسجيل الحجز: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="حجوزات البضاعة العايمة في البحر (In-Transit Container Pre-orders)"
      subtitle={`إدارة حجوزات التجار للسلع قبل وصول الحاوية ${shipment.container_number} وقيد العربون كالتزام`}
      width="1180px"
      compact
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Capacity Gauge & Safety Invariant Alert */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              متابعة سعة بوليصة الشحن (B/L Capacity Guard) للصنف المختار:
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: capacityPercent >= 100 ? '#b91c1c' : '#15803d' }}>
              {bookedForProduct} محجوز / {blCapacity} إجمالي بالبوليصة (المتاح: {remainingCapacity})
            </span>
          </div>
          <div style={{ width: '100%', height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${capacityPercent}%`,
                height: '100%',
                backgroundColor: capacityPercent >= 100 ? '#ef4444' : capacityPercent > 80 ? '#f59e0b' : '#10b981',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 16 }}>
          {/* Booking Form */}
          <form
            onSubmit={handleCreatePreorder}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
              تسجيل حجز مسبق جديد
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                العميل / التاجر:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                <option value="">-- اختر العميل --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                الصنف المحجوز من الحاوية:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                {shipment.items.map((i) => (
                  <option key={i.id} value={i.product_id}>
                    {i.product_name} (سعة البوليصة: {i.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                  الكمية المحجوزة:
                </label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                  value={quantity}
                  max={remainingCapacity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                  سعر البيع المتفق (ج.م):
                </label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                  عربون الحجز المدفوع (ج.م):
                </label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                  حساب استلام العربون:
                </label>
                <select
                  className="input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                  value={treasuryAccountId}
                  onChange={(e) => setTreasuryAccountId(e.target.value)}
                >
                  <option value="">-- خزينة / بنك --</option>
                  {treasuryAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameAr || acc.nameEn || acc.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                ملاحظات الاتفاق:
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={notes}
                placeholder="مثال: تسليم أرض الميناء أو المستودع الرئيسي"
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                إجمالي قيمة الصفقة: {formatCurrency(quantity * unitPrice)} | المتبقي عند الاستلام:{' '}
                {formatCurrency(Math.max(0, quantity * unitPrice - depositAmount))}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || remainingCapacity <= 0}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  backgroundColor: remainingCapacity > 0 ? '#170e5e' : '#94a3b8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: remainingCapacity > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                تأكيد حجز البضاعة وقيد العربون
              </button>
            </div>
          </form>

          {/* Bookings Table */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              سجل الحجوزات القائمة للحاوية ({preorders.length})
            </div>
            {preorders.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                لا توجد حجوزات مسجلة على هذه الحاوية حالياً
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>العميل</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>الكمية</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>سعر البيع</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>العربون</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>الحالة</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {preorders.map((po: any) => (
                    <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                        {po.customer_name || `عميل #${po.customer_id}`}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{po.reserved_quantity}</td>
                      <td style={{ padding: '8px 10px' }}>{formatCurrency(po.unit_price_egp)}</td>
                      <td style={{ padding: '8px 10px', color: '#15803d', fontWeight: 600 }}>
                        {formatCurrency(po.deposit_amount_egp)}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor:
                              po.status === 'allocated'
                                ? '#dcfce7'
                                : po.status === 'fulfilled'
                                ? '#e0f2fe'
                                : '#fef3c7',
                            color:
                              po.status === 'allocated'
                                ? '#166534'
                                : po.status === 'fulfilled'
                                ? '#0369a1'
                                : '#b45309',
                          }}
                        >
                          {po.status === 'allocated' ? 'مخصصة بالمخزن' : po.status === 'fulfilled' ? 'تم التسليم' : 'محجوز عايم'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>
                        {new Date(po.created_at).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
