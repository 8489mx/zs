import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import { customersApi } from '@/shared/api/customers.api';
import { suppliersApi } from '@/shared/api/suppliers.api';
import {
  paymentAllocationApi,
  OpenInvoiceItem,
  UnallocatedPaymentItem,
} from '../api/accounting.api';

export const PaymentAllocationPage: React.FC = () => {
  const [partnerType, setPartnerType] = useState<'customer' | 'supplier'>('customer');
  const [partnerId, setPartnerId] = useState<number | null>(null);

  const [partners, setPartners] = useState<{ id: number; name: string; phone?: string }[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceItem[]>([]);
  const [unallocatedPayments, setUnallocatedPayments] = useState<UnallocatedPaymentItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [allocationInputs, setAllocationInputs] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  // Load partners list whenever partnerType changes
  useEffect(() => {
    setPartnerId(null);
    setOpenInvoices([]);
    setUnallocatedPayments([]);
    setSelectedPaymentId(null);
    setAllocationInputs({});
    setFeedback(null);
    loadPartners();
  }, [partnerType]);

  const loadPartners = async () => {
    setLoadingPartners(true);
    try {
      if (partnerType === 'customer') {
        const res = await customersApi.list();
        const list = Array.isArray(res) ? res : (res as any)?.customers || [];
        setPartners(list.map((c: any) => ({ id: Number(c.id), name: c.name, phone: c.phone })));
      } else {
        const res = await suppliersApi.list();
        const list = Array.isArray(res) ? res : (res as any)?.suppliers || [];
        setPartners(list.map((s: any) => ({ id: Number(s.id), name: s.name, phone: s.phone })));
      }
    } catch {
      setPartners([]);
    } finally {
      setLoadingPartners(false);
    }
  };

  // Load invoices and payments whenever partner is selected
  useEffect(() => {
    if (!partnerId) {
      setOpenInvoices([]);
      setUnallocatedPayments([]);
      setSelectedPaymentId(null);
      setAllocationInputs({});
      return;
    }
    loadPartnerData(partnerId);
  }, [partnerId, partnerType]);

  const loadPartnerData = async (pId: number) => {
    setLoadingData(true);
    setFeedback(null);
    setSelectedPaymentId(null);
    setAllocationInputs({});
    try {
      const [invs, pymts] = await Promise.all([
        paymentAllocationApi.getOpenInvoices(partnerType, pId),
        paymentAllocationApi.getUnallocatedPayments(partnerType, pId),
      ]);
      setOpenInvoices(invs || []);
      setUnallocatedPayments(pymts || []);
      if (pymts && pymts.length > 0) {
        setSelectedPaymentId(pymts[0].id);
      }
    } catch (err: any) {
      setFeedback({ text: err?.message || 'تعذر تحميل بيانات الفواتير والسندات', error: true });
    } finally {
      setLoadingData(false);
    }
  };

  // Selected payment details
  const selectedPayment = unallocatedPayments.find((p) => p.id === selectedPaymentId) || null;
  const availableToAllocate = selectedPayment ? selectedPayment.unallocatedAmount : 0;

  // Calculate current total allocating
  const totalAllocating = Object.values(allocationInputs).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const remainingPaymentBalance = Number((availableToAllocate - totalAllocating).toFixed(2));

  // Handle amount change for a specific invoice
  const handleAmountChange = (invoiceId: number, maxRemaining: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const clampedVal = Math.min(Math.max(0, val), maxRemaining);
    setAllocationInputs((prev) => ({
      ...prev,
      [invoiceId]: clampedVal,
    }));
  };

  // 1-Click FIFO Auto-Allocation
  const handleAutoFIFO = async () => {
    if (!partnerId || !selectedPaymentId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await paymentAllocationApi.autoAllocateFIFO(partnerType, partnerId, selectedPaymentId);
      setFeedback({
        text: `تمت التسوية الآلية (FIFO) بنجاح! تم تخصيص ${formatCurrency(res.totalAllocated)} على ${res.count} فاتورة.`,
      });
      loadPartnerData(partnerId);
    } catch (err: any) {
      setFeedback({ text: err?.message || 'تعذر إجراء التسوية الآلية', error: true });
    } finally {
      setSaving(false);
    }
  };

  // Manual allocation submission
  const handleManualAllocate = async () => {
    if (!partnerId) return;

    const allocations = Object.entries(allocationInputs)
      .map(([invId, amt]) => ({ invoiceId: Number(invId), amount: Number(amt) }))
      .filter((a) => a.amount > 0);

    if (!allocations.length) {
      setFeedback({ text: 'يرجى إدخال مبلغ مخصص لواحد أو أكثر من الفواتير', error: true });
      return;
    }

    if (selectedPayment && totalAllocating > selectedPayment.unallocatedAmount + 0.01) {
      setFeedback({ text: 'إجمالي المبالغ المخصصة يتجاوز الرصيد المتاح من السند المختار', error: true });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await paymentAllocationApi.allocatePayment({
        partnerType,
        partnerId,
        paymentType: partnerType === 'customer' ? 'customer_payment' : 'supplier_payment',
        paymentId: selectedPaymentId,
        allocations,
        notes: notes.trim() || undefined,
      });

      setFeedback({
        text: `تم حفظ التخصيص والمطابقة بنجاح! تم تخصيص ${formatCurrency(res.totalAllocated)} على ${res.count} فاتورة.`,
      });
      loadPartnerData(partnerId);
    } catch (err: any) {
      setFeedback({ text: err?.message || 'تعذر حفظ التخصيص', error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader
          title="تسوية وتخصيص المدفوعات على الفواتير (Payment Allocation & Reconciliation)"
          description="مطابقة وتوزيع سندات القبض والدفع النقدية والبنكية على الفواتير المفتوحة وفق المعايير المحاسبية المعتمدة (FIFO و IFRS)."
          badge={<span className="nav-pill">المحاسبة والتسويات</span>}
        />

        {feedback && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: feedback.error ? '#fef2f2' : '#f0fdf4',
              color: feedback.error ? '#991b1b' : '#166534',
              border: `1px solid ${feedback.error ? '#fecaca' : '#bbf7d0'}`,
              marginBottom: '16px',
            }}
          >
            {feedback.text}
          </div>
        )}

        {/* Partner Type & Selection Bar */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                نوع الشريك
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPartnerType('customer')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: partnerType === 'customer' ? '#170e5e' : '#f8fafc',
                    borderColor: partnerType === 'customer' ? '#170e5e' : '#cbd5e1',
                    color: partnerType === 'customer' ? '#ffffff' : '#334155',
                  }}
                >
                  عملاء (فواتير المبيعات)
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerType('supplier')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: partnerType === 'supplier' ? '#170e5e' : '#f8fafc',
                    borderColor: partnerType === 'supplier' ? '#170e5e' : '#cbd5e1',
                    color: partnerType === 'supplier' ? '#ffffff' : '#334155',
                  }}
                >
                  موردين (فواتير المشتريات)
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                اختر {partnerType === 'customer' ? 'العميل' : 'المورد'}
              </label>
              <select
                value={partnerId || ''}
                onChange={(e) => setPartnerId(e.target.value ? Number(e.target.value) : null)}
                disabled={loadingPartners}
                style={{
                  width: '100%',
                  maxWidth: '450px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="">-- اختر {partnerType === 'customer' ? 'العميل' : 'المورد'} لعرض فواتيره وسنداته --</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
            جاري تحميل الفواتير والسندات...
          </div>
        ) : partnerId ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '20px', alignItems: 'start' }}>
            {/* Right Card: Available Payments */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    سندات {partnerType === 'customer' ? 'القبض والتحصيل' : 'الصرف والسداد'} المتاحة
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                    السندات غير المخصصة كلياً أو جزئياً
                  </div>
                </div>
                <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                  {unallocatedPayments.length} سند
                </span>
              </div>

              {unallocatedPayments.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  لا توجد سندات نقدية أو بنكية غير مخصصة لهذا {partnerType === 'customer' ? 'العميل' : 'المورد'}.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {unallocatedPayments.map((p) => {
                    const isSelected = selectedPaymentId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPaymentId(p.id)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13px', color: '#170e5e' }}>
                            {p.docNo}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{p.date}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#475569' }}>
                            المبلغ الكلي: <strong>{formatCurrency(p.amount)}</strong>
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                              fontWeight: 700,
                            }}
                          >
                            المتاح للتخصيص: {formatCurrency(p.unallocatedAmount)}
                          </span>
                        </div>
                        {p.note && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            {p.note}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {selectedPayment && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                      <div
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>السند المختار:</span>
                          <strong>{selectedPayment.docNo}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>المبلغ المتاح:</span>
                          <strong style={{ color: '#059669' }}>{formatCurrency(selectedPayment.unallocatedAmount)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: '#64748b' }}>المتبقي بعد التخصيص:</span>
                          <strong style={{ color: remainingPaymentBalance < 0 ? '#dc2626' : '#1e293b' }}>
                            {formatCurrency(remainingPaymentBalance)}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAutoFIFO}
                        disabled={saving || openInvoices.length === 0}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #3b82f6',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <AppIcons.Refresh size={16} />
                        تسوية آلية وفق أسبقية الاستحقاق (FIFO Auto-Reconcile)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Left Card: Open Invoices */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    الفواتير المفتوحة والمستحقة
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                    فواتير {partnerType === 'customer' ? 'المبيعات' : 'المشتريات'} التي لها رصيد متبقي
                  </div>
                </div>
                <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                  {openInvoices.length} فاتورة مفتوحة
                </span>
              </div>

              {openInvoices.length === 0 ? (
                <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  كافة فواتير هذا {partnerType === 'customer' ? 'العميل' : 'المورد'} مسددة بالكامل (رصيد الفواتير 0).
                </div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                          <th style={{ textAlign: 'right', padding: '8px 10px' }}>رقم الفاتورة</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px' }}>التاريخ</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px' }}>الإجمالي</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px' }}>المتبقي</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px', width: '130px' }}>المبلغ المخصص</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openInvoices.map((inv) => {
                          const currentVal = allocationInputs[inv.id] ?? '';
                          return (
                            <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px', fontWeight: 700, color: '#1e293b' }}>
                                {inv.docNo}
                              </td>
                              <td style={{ padding: '10px', color: '#64748b' }}>
                                {inv.date}
                              </td>
                              <td style={{ padding: '10px', color: '#334155' }}>
                                {formatCurrency(inv.total)}
                              </td>
                              <td style={{ padding: '10px', fontWeight: 700, color: '#dc2626' }}>
                                {formatCurrency(inv.remainingAmount)}
                              </td>
                              <td style={{ padding: '10px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max={inv.remainingAmount}
                                  step="0.01"
                                  value={currentVal}
                                  placeholder="0.00"
                                  onChange={(e) => handleAmountChange(inv.id, inv.remainingAmount, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    textAlign: 'left',
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Notes & Confirmation */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                      ملاحظات التسوية
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="مثال: سداد دفعة عن الفواتير المستحقة..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>إجمالي التخصيص الحالي:</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#170e5e' }}>
                        {formatCurrency(totalAllocating)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleManualAllocate}
                      disabled={Boolean(saving || totalAllocating <= 0 || (selectedPayment && totalAllocating > selectedPayment.unallocatedAmount + 0.01))}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        backgroundColor: '#170e5e',
                        borderColor: '#170e5e',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        border: 'none',
                        opacity: saving || totalAllocating <= 0 || (selectedPayment && totalAllocating > selectedPayment.unallocatedAmount + 0.01) ? 0.6 : 1,
                      }}
                    >
                      {saving ? 'جاري الحفظ...' : 'تأكيد وحفظ التخصيص المحاسبي'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              color: '#64748b',
            }}
          >
            <AppIcons.FileText size={42} color="#94a3b8" />
            <div style={{ marginTop: '12px', fontSize: '15px', fontWeight: 700, color: '#334155' }}>
              اختر عميلاً أو مورداً للبدء في تخصيص ومطابقة المدفوعات
            </div>
            <div style={{ marginTop: '4px', fontSize: '13px', color: '#94a3b8' }}>
              يمكنك ربط كل سند دفع أو تحصيل بفاتورة معينة أو إجراء تسوية أوتوماتيكية بنظام FIFO
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
