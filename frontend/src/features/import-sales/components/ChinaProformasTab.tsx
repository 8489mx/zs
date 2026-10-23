import { useState } from 'react';
import {
  useProformaInvoicesQuery,
  useApproveProformaInvoiceMutation,
  useGenerateInternationalPoMutation,
  useCreateProformaInvoiceMutation,
  useChinaSuppliersQuery,
} from '../api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { CheckCircleIcon, PlusCircleIcon } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';

export function ChinaProformasTab() {
  const { data: proformas = [], refetch } = useProformaInvoicesQuery();
  const { data: suppliers = [] } = useChinaSuppliersQuery();
  const approvePiMutation = useApproveProformaInvoiceMutation();
  const generatePoMutation = useGenerateInternationalPoMutation('');
  const createPiMutation = useCreateProformaInvoiceMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [generatedPoResult, setGeneratedPoResult] = useState<any | null>(null);

  // Form State
  const [projectId, setProjectId] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [piNumber, setPiNumber] = useState('');
  const [piDate, setPiDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('USD');
  const [exchangeRateContract, setExchangeRateContract] = useState<number>(50);
  const [totalAmountForeign, setTotalAmountForeign] = useState<number>(50000);
  const [incoterm, setIncoterm] = useState('FOB');
  const [deliveryPort, setDeliveryPort] = useState('Ningbo / Alexandria');
  const [paymentTerms, setPaymentTerms] = useState('30% Advance T/T, 70% before shipment');
  const [advancePercentage, setAdvancePercentage] = useState<number>(30);
  const [balancePercentage, setBalancePercentage] = useState<number>(70);
  const [notes, setNotes] = useState('');
  const [piItems, setPiItems] = useState<Array<{ productId: number | ''; quantity: number; unitPriceForeign: number }>>([
    { productId: '', quantity: 1000, unitPriceForeign: 50 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Projects for optional project binding
  const { data: projects = [] } = useQuery({
    queryKey: ['import-projects'],
    queryFn: async () => {
      const res = await http<any[]>('/api/import-sales/projects');
      return Array.isArray(res) ? res : (res as any)?.items || [];
    },
  });

  // Fetch Products for PI line items
  const { data: products = [] } = useQuery({
    queryKey: ['products-catalog-import'],
    queryFn: async () => {
      const res = await http<any>('/api/products?limit=500');
      return Array.isArray(res) ? res : res?.items || res?.rows || res?.data || [];
    },
  });

  const handleApprovePi = async (piId: string) => {
    try {
      await approvePiMutation.mutateAsync(piId);
      toast.success('تم اعتماد الفاتورة المبدئية (PI) رسمياً');
      refetch();
    } catch (err: any) {
      toast.error('فشل اعتماد الفاتورة المبدئية: ' + (err.message || 'خطأ'));
    }
  };

  const handleGeneratePo = async (pi: any) => {
    try {
      if (pi.status !== 'approved') {
        await approvePiMutation.mutateAsync(pi.id);
      }
      const res = await generatePoMutation.mutateAsync(pi.id);
      setGeneratedPoResult(res);
      toast.success('تم توليد أمر الشراء الدولي (PO) وتثبيت المواصفات الفنية والشروط التعاقدية');
      refetch();
    } catch (err: any) {
      toast.error('فشل إصدار أمر الشراء: ' + (err.message || 'خطأ'));
    }
  };

  const validLines = piItems.filter((l) => l.productId && Number(l.quantity) > 0 && Number(l.unitPriceForeign) >= 0);
  const computedLinesTotal = validLines.reduce((acc, l) => acc + Number(l.quantity) * Number(l.unitPriceForeign), 0);

  const handleCreatePi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error('يرجى اختيار المصنع / المورد');
      return;
    }
    if (!piNumber.trim()) {
      toast.error('رقم الفاتورة المبدئية PI مطلوب');
      return;
    }
    const finalTotal = validLines.length > 0 ? Number(computedLinesTotal.toFixed(2)) : Number(totalAmountForeign);
    if (finalTotal <= 0) {
      toast.error('إجمالي قيمة الفاتورة يجب أن يكون أكبر من صفر');
      return;
    }

    try {
      setIsSubmitting(true);
      await createPiMutation.mutateAsync({
        projectId: projectId || undefined,
        supplierId: Number(supplierId),
        piNumber: piNumber.trim(),
        piDate,
        currency,
        exchangeRateContract: Number(exchangeRateContract) || 50,
        totalAmountForeign: finalTotal,
        incoterm,
        deliveryPort: deliveryPort || undefined,
        paymentTerms: paymentTerms || undefined,
        advancePercentage: Number(advancePercentage),
        balancePercentage: Number(balancePercentage),
        items: validLines.map((l) => ({
          productId: Number(l.productId),
          quantity: Number(l.quantity),
          unitPriceForeign: Number(l.unitPriceForeign),
        })),
        notes: notes || undefined,
      });
      toast.success('تم تسجيل الفاتورة المبدئية (PI) بنجاح');
      setIsCreateOpen(false);
      setPiNumber('');
      setNotes('');
      refetch();
    } catch (err: any) {
      toast.error('فشل تسجيل الفاتورة المبدئية: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
            الفواتير المبدئية وأوامر الشراء الدولية (Proforma Invoices & International PO)
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            إدارة الفواتير المبدئية PI وتوليد أوامر الشراء الرسمية المعتمدة طبقاً لمعايير الغرفة التجارية الدولية (ICC)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            backgroundColor: '#170e5e',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <PlusCircleIcon size={16} />
          <span>إضافة فاتورة مبدئية (New PI)</span>
        </button>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>رقم الفاتورة (PI No)</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>المصنع / المورد</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>إجمالي القيمة بالعملة الأجنبية</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>المسدد فعلياً بالحوالات</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>حالة الاعتماد والسداد</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>أمر الشراء الدولي (PO)</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {proformas.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد فواتير مبدئية مسجلة حالياً
                </td>
              </tr>
            ) : (
              proformas.map((pi: any) => {
                const total = Number(pi.total_amount_foreign || 0);
                const paid = Number(pi.paid_amount_foreign || 0);
                const isPaid = pi.payment_status === 'paid';
                const isPartial = pi.payment_status === 'partial' || pi.payment_status === 'partially_paid';
                return (
                  <tr key={pi.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e', fontFamily: 'monospace' }}>
                      {pi.pi_number}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{pi.supplier_name || `مورد #${pi.supplier_id}`}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0369a1' }}>
                      ${total.toLocaleString()} {pi.currency || 'USD'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#15803d' }}>
                      ${paid.toLocaleString()} {pi.currency || 'USD'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: pi.status === 'approved' ? '#dcfce7' : '#fef3c7',
                            color: pi.status === 'approved' ? '#166534' : '#b45309',
                          }}
                        >
                          {pi.status === 'approved' ? 'معتمدة' : 'مسودة'}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: isPaid ? '#dcfce7' : isPartial ? '#e0f2fe' : '#fee2e2',
                            color: isPaid ? '#166534' : isPartial ? '#0369a1' : '#b91c1c',
                          }}
                        >
                          {isPaid ? 'مسددة بالكامل' : isPartial ? 'مسددة جزئياً' : 'غير مسددة'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {pi.po_number ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}>{pi.po_number}</span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>لم يصدر بعد</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {pi.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleApprovePi(pi.id)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#15803d',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            اعتماد PI
                          </button>
                        )}
                        {!pi.po_number ? (
                          <button
                            type="button"
                            onClick={() => handleGeneratePo(pi)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#170e5e',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            توليد أمر الشراء (PO)
                          </button>
                        ) : (
                          <span style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700 }}>أمر شراء معتمد</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Proforma Invoice Dialog */}
      <StandardDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="تسجيل فاتورة مبدئية جديدة (New Proforma Invoice)"
        subtitle="تثبيت بيانات الفاتورة المبدئية PI وبنود الأصناف وشروط التعاقد تمهيداً لإصدار أمر الشراء وتحويل الدفعة المقدمة"
        width="760px"
        compact
      >
        <form onSubmit={handleCreatePi} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                المصنع / المورد الصيني: *
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">-- اختر المصنع --</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                رقم الفاتورة المبدئية (PI Number): *
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                placeholder="مثال: PI-261023-0001"
                value={piNumber}
                onChange={(e) => setPiNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                تاريخ إصدار الفاتورة: *
              </label>
              <input
                type="date"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={piDate}
                onChange={(e) => setPiDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                العملة الأجنبية:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">الدولار الأمريكي ($ - USD)</option>
                <option value="CNY">اليوان الصيني (¥ - CNY)</option>
                <option value="EUR">اليورو (€ - EUR)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                سعر صرف التعاقد (ج.م):
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={exchangeRateContract}
                onChange={(e) => setExchangeRateContract(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                إجمالي القيمة الأجنبية:
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={validLines.length > 0 ? computedLinesTotal : totalAmountForeign}
                onChange={(e) => setTotalAmountForeign(Number(e.target.value))}
                readOnly={validLines.length > 0}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                شرط الشحن (Incoterm):
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
              >
                <option value="FOB">FOB (تسليم ظهر السفينة)</option>
                <option value="CIF">CIF (شامل الشحن والتأمين)</option>
                <option value="CFR">CFR (شامل الشحن)</option>
                <option value="EXW">EXW (تسليم أرض المصنع)</option>
              </select>
            </div>
          </div>

          {/* PI Product Line Items */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#170e5e' }}>
                بنود الأصناف المتعاقد عليها في الفاتورة المبدئية (لإصدار أمر الشراء الآلي PO)
              </span>
              <button
                type="button"
                onClick={() => setPiItems([...piItems, { productId: '', quantity: 100, unitPriceForeign: 10 }])}
                style={{
                  padding: '3px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  backgroundColor: '#eef2ff',
                  color: '#170e5e',
                  border: '1px solid #c7d2fe',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
              >
                + إضافة بند صنف
              </button>
            </div>
            <div className="thin-scrollbar" style={{ maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {piItems.map((line, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                  <select
                    className="input"
                    style={{ width: '100%', padding: '5px 8px', fontSize: 12 }}
                    value={line.productId}
                    onChange={(e) => {
                      const next = [...piItems];
                      next[idx].productId = e.target.value ? Number(e.target.value) : '';
                      setPiItems(next);
                    }}
                  >
                    <option value="">-- اختر الصنف من الكتالوج --</option>
                    {products.map((pr: any) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name} {pr.sku ? `(${pr.sku})` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    style={{ width: '100%', padding: '5px 8px', fontSize: 12 }}
                    placeholder="الكمية"
                    value={line.quantity}
                    onChange={(e) => {
                      const next = [...piItems];
                      next[idx].quantity = Number(e.target.value);
                      setPiItems(next);
                    }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    style={{ width: '100%', padding: '5px 8px', fontSize: 12 }}
                    placeholder="سعر الوحدة ($)"
                    value={line.unitPriceForeign}
                    onChange={(e) => {
                      const next = [...piItems];
                      next[idx].unitPriceForeign = Number(e.target.value);
                      setPiItems(next);
                    }}
                  />
                  {piItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPiItems(piItems.filter((_, i) => i !== idx))}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                ميناء التحميل / الوصول:
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                placeholder="Ningbo -> Alexandria"
                value={deliveryPort}
                onChange={(e) => setDeliveryPort(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                مشروع الاستيراد:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">-- بدون ربط بمشروع --</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.project_no} - {p.title || p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                نسبة الدفعة المقدمة (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={advancePercentage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAdvancePercentage(val);
                  setBalancePercentage(Math.max(0, 100 - val));
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                نسبة المتبقي (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={balancePercentage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBalancePercentage(val);
                  setAdvancePercentage(Math.max(0, 100 - val));
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                شروط السداد المتفق عليها (Payment Terms):
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                ملاحظات وشروط فنية خاصة:
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              style={{
                padding: '7px 16px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '7px 20px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ الفاتورة المبدئية'}
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* PO Success Result Dialog */}
      {generatedPoResult && (
        <StandardDialog
          isOpen={!!generatedPoResult}
          onClose={() => setGeneratedPoResult(null)}
          title={`أمر الشراء الدولي المعتمد: ${generatedPoResult.po_number || generatedPoResult.poNumber || ''}`}
          subtitle="تم تثبيت بنود الاتفاق التعاقدي مع المصنع الصيني بنجاح"
          width="600px"
          compact
        >
          <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 800, fontSize: 14 }}>
                <CheckCircleIcon size={18} />
                تم توليد وتثبيت أمر الشراء الدولي بنجاح
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                <div><strong>رقم الوثيقة:</strong> <span style={{ fontFamily: 'monospace' }}>{generatedPoResult.po_number || generatedPoResult.poNumber}</span></div>
                <div><strong>الحالة:</strong> معتمد وجاهز للطباعة والإرسال للمصنع</div>
                <div><strong>الشروط المثبتة:</strong> سداد دفعة مقدمة {generatedPoResult.advance_percentage || 30}% مع ربط الفحص الميداني بالعينة القياسية المعتمدة</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setGeneratedPoResult(null)}
                style={{ padding: '7px 16px', backgroundColor: '#170e5e', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
