import { useState } from 'react';
import {
  useProformaInvoicesQuery,
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
  const [totalAmountForeign, setTotalAmountForeign] = useState<number>(50000);
  const [incoterm, setIncoterm] = useState('FOB');
  const [deliveryPort, setDeliveryPort] = useState('Ningbo / Alexandria');
  const [paymentTerms, setPaymentTerms] = useState('30% Advance T/T, 70% before shipment');
  const [advancePercentage, setAdvancePercentage] = useState<number>(30);
  const [balancePercentage, setBalancePercentage] = useState<number>(70);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Projects for optional project binding
  const { data: projects = [] } = useQuery({
    queryKey: ['import-projects'],
    queryFn: async () => {
      const res = await http<any[]>('/api/import-sales/projects');
      return Array.isArray(res) ? res : (res as any)?.items || [];
    },
  });

  const handleGeneratePo = async (piId: string) => {
    try {
      const res = await generatePoMutation.mutateAsync(piId);
      setGeneratedPoResult(res);
      toast.success('تم توليد أمر الشراء الدولي (IPO) وتثبيت المواصفات الفنية والشروط التعاقدية');
      refetch();
    } catch (err: any) {
      toast.error('فشل إصدار أمر الشراء: ' + (err.message || 'خطأ'));
    }
  };

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
    if (totalAmountForeign <= 0) {
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
        totalAmountForeign: Number(totalAmountForeign),
        incoterm,
        deliveryPort: deliveryPort || undefined,
        paymentTerms: paymentTerms || undefined,
        advancePercentage: Number(advancePercentage),
        balancePercentage: Number(balancePercentage),
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
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>حالة السداد</th>
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
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor:
                            pi.payment_status === 'paid'
                              ? '#dcfce7'
                              : pi.payment_status === 'partial'
                              ? '#e0f2fe'
                              : '#fee2e2',
                          color:
                            pi.payment_status === 'paid'
                              ? '#166534'
                              : pi.payment_status === 'partial'
                              ? '#0369a1'
                              : '#b91c1c',
                        }}
                      >
                        {pi.payment_status === 'paid'
                          ? 'مسددة بالكامل'
                          : pi.payment_status === 'partial'
                          : 'مسددة جزئياً'
                          : 'غير مسددة'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {pi.po_number ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}>{pi.po_number}</span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>لم يصدر بعد</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {!pi.po_number ? (
                        <button
                          type="button"
                          onClick={() => handleGeneratePo(pi.id)}
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
        subtitle="تثبيت بيانات الفاتورة المبدئية PI وشروط التعاقد والإنكوتيرمز تمهيداً لإصدار أمر الشراء وتحويل الدفعة المقدمة"
        width="680px"
        compact
      >
        <form onSubmit={handleCreatePi} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                المصنع / المورد الصيني:
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
                    {s.name} {s.contact_person ? `(${s.contact_person})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                رقم الفاتورة المبدئية (PI Number):
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                placeholder="مثال: PI-2026-CN-001"
                value={piNumber}
                onChange={(e) => setPiNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                تاريخ إصدار الفاتورة:
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                إجمالي القيمة بالعملة الأجنبية:
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={totalAmountForeign}
                onChange={(e) => setTotalAmountForeign(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                شرط الشحن الدولي (Incoterm):
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
              >
                <option value="FOB">FOB - Free on Board (تسليم ظهر السفينة)</option>
                <option value="CIF">CIF - Cost, Insurance & Freight (شامل الشحن والتأمين)</option>
                <option value="CFR">CFR - Cost and Freight (شامل الشحن)</option>
                <option value="EXW">EXW - Ex Works (تسليم أرض المصنع)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                ميناء التحميل / الوصول:
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
                placeholder="مثال: Ningbo Port -> Alexandria"
                value={deliveryPort}
                onChange={(e) => setDeliveryPort(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                مشروع الاستيراد (اختياري):
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
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
              شروط السداد المتفق عليها (Payment Terms):
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }}
              placeholder="مثال: 30% Advance T/T, 70% against BL copy"
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
              placeholder="مثال: البضاعة مطابقة للعينة المعتمدة رقم SPL-001 مع شهادة فحص CIQ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              style={{
                padding: '8px 16px',
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
                padding: '8px 20px',
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
          title={`أمر الشراء الدولي المعتمد: ${generatedPoResult.poNumber}`}
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
                <div><strong>رقم الوثيقة:</strong> <span style={{ fontFamily: 'monospace' }}>{generatedPoResult.poNumber}</span></div>
                <div><strong>الحالة:</strong> معتمد وجاهز للطباعة والإرسال للمصنع</div>
                <div><strong>الشروط المثبتة:</strong> سداد دفعة مقدمة 30% مع ربط الفحص الميداني بالعينة القياسية المعتمدة</div>
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
