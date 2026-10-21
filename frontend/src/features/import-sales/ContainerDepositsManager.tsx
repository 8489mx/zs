import React, { useRef, useState } from 'react';
import {
  useContainerDepositsQuery,
  useRecordContainerDepositMutation,
  useRefundContainerDepositMutation,
} from './api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';
import {
  PlusCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';

export function ContainerDepositsManager() {
  const { data: deposits = [], refetch } = useContainerDepositsQuery();
  const recordDepositMutation = useRecordContainerDepositMutation();
  const refundDepositMutation = useRefundContainerDepositMutation();

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedDepositForRefund, setSelectedDepositForRefund] = useState<any | null>(null);
  const refundRequestKey = useRef<string | null>(null);

  // Record Deposit Form State
  const [shipmentId, setShipmentId] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [shippingLine, setShippingLine] = useState('MSC Mediterranean Shipping Company');
  const [depositAmountEgp, setDepositAmountEgp] = useState<number>(40000);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [notes, setNotes] = useState('');

  // Refund Form State
  const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [refundedAmountEgp, setRefundedAmountEgp] = useState<number>(40000);
  const [deductionsAmountEgp, setDeductionsAmountEgp] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [refundTreasuryAccountId, setRefundTreasuryAccountId] = useState('');

  const { data: shipments = [] } = useQuery({
    queryKey: ['import-shipments'],
    queryFn: async () => {
      const res = await http<any[]>('/api/import-sales/shipments');
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

  const handleRecordDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNo.trim()) {
      toast.error('رقم الحاوية مطلوب');
      return;
    }
    if (depositAmountEgp <= 0) {
      toast.error('مبلغ التأمين يجب أن يكون أكبر من صفر');
      return;
    }

    try {
      await recordDepositMutation.mutateAsync({
        projectId: undefined,
        shipmentId: shipmentId || undefined,
        containerNo: containerNo.trim(),
        shippingLine,
        depositAmountEgp: Number(depositAmountEgp),
        expectedReturnDate: expectedReturnDate || undefined,
        treasuryAccountId: treasuryAccountId || undefined,
        notes: notes || undefined,
      });
      toast.success('تم إثبات دفع تأمين الحاوية كأصل مدين مسترد');
      setIsRecordOpen(false);
      setContainerNo('');
      refetch();
    } catch (err: any) {
      toast.error('فشل إثبات التأمين: ' + (err.message || 'خطأ'));
    }
  };

  const handleRefundDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepositForRefund) return;
    if (!refundRequestKey.current) refundRequestKey.current = crypto.randomUUID();

    try {
      await refundDepositMutation.mutateAsync({
        depositId: selectedDepositForRefund.id,
        dto: {
          idempotencyKey: refundRequestKey.current,
          actualReturnDate,
          refundedAmountEgp: Number(refundedAmountEgp),
          deductionsAmountEgp: Number(deductionsAmountEgp),
          deductionReason: deductionReason || undefined,
          treasuryAccountId: refundTreasuryAccountId || undefined,
        },
      });
      toast.success('تمت تسوية استرداد التأمين وتحديث حالة الحاوية إلى تم تسليم الفارغ');
      setSelectedDepositForRefund(null);
      refundRequestKey.current = null;
      refetch();
    } catch (err: any) {
      toast.error('فشل تسوية التأمين: ' + (err.message || 'خطأ'));
    }
  };

  const pendingDeposits = deposits.filter((d: any) => d.refund_status === 'pending');
  const totalPendingEgp = pendingDeposits.reduce((sum: number, d: any) => sum + Number(d.deposit_amount_egp || 0), 0);

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Action & KPI Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>إجمالي مبالغ التأمين المعلقة طرف الخطوط: </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: totalPendingEgp > 0 ? '#b45309' : '#15803d' }}>
              {formatCurrency(totalPendingEgp)}
            </span>
          </div>
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>حاويات قيد الانتظار واسترجاع الفارغ: </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#170e5e' }}>{pendingDeposits.length}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsRecordOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            backgroundColor: '#170e5e',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <PlusCircleIcon size={14} />
          إثبات دفع تأمين حاوية جديد
        </button>
      </div>

      {/* Deposits Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>رقم الحاوية</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>الخط الملاحي</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>مبلغ التأمين المدفوع</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>المسترد الفعلي</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>الخصومات / غرامات التأخير</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>حالة التأمين</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {deposits.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد تأمينات حاويات مسجلة حالياً
                </td>
              </tr>
            ) : (
              deposits.map((d: any) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e', fontFamily: 'monospace' }}>
                    {d.container_number}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{d.shipping_line}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{formatCurrency(d.deposit_amount_egp)}</td>
                  <td style={{ padding: '10px 14px', color: '#15803d', fontWeight: 600 }}>
                    {d.refunded_amount_egp ? formatCurrency(d.refunded_amount_egp) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: Number(d.deductions_amount_egp) > 0 ? '#b91c1c' : '#64748b' }}>
                    {Number(d.deductions_amount_egp) > 0 ? formatCurrency(d.deductions_amount_egp) : '0.00 ج.م'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: d.refund_status === 'refunded' ? '#dcfce7' : '#fef3c7',
                        color: d.refund_status === 'refunded' ? '#166534' : '#b45309',
                      }}
                    >
                      {d.refund_status === 'refunded' ? 'تم الاسترداد والتسوية' : 'معلق طرف الخط الملاحي'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {d.refund_status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDepositForRefund(d);
                          setRefundedAmountEgp(Number(d.deposit_amount_egp));
                          setDeductionsAmountEgp(0);
                        }}
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
                        تسليم الفارغ واسترداد
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, color: '#64748b' }}>تم الإغلاق</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Record Deposit */}
      <StandardDialog
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="إثبات دفع تأمين حاوية (Container Security Deposit)"
        subtitle="تسجيل شيك أو تحويل تأمين الحاوية المسدد للتوكيل الملاحي واسترداده عند تسليم الفارغ"
        width="600px"
        compact
      >
        <form onSubmit={handleRecordDeposit} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                رقم الحاوية: *
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13, fontFamily: 'monospace' }}
                value={containerNo}
                placeholder="مثال: MSCU9482019"
                onChange={(e) => setContainerNo(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                الخط الملاحي / التوكيل: *
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={shippingLine}
                onChange={(e) => setShippingLine(e.target.value)}
              >
                <option value="MSC Mediterranean Shipping Company">MSC (البحر المتوسط للملاحة)</option>
                <option value="Maersk Line">Maersk (ميرسك لاين)</option>
                <option value="CMA CGM">CMA CGM</option>
                <option value="COSCO Shipping Lines">COSCO (كوسكو الصينية)</option>
                <option value="Hapag-Lloyd">Hapag-Lloyd (هاباج لويد)</option>
                <option value="ONE (Ocean Network Express)">ONE</option>
                <option value="Evergreen Marine">Evergreen (إيفرجرين)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                مبلغ التأمين (ج.م): *
              </label>
              <input
                type="number"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={depositAmountEgp}
                onChange={(e) => setDepositAmountEgp(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                حساب السداد (الخزينة/البنك):
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={treasuryAccountId}
                onChange={(e) => setTreasuryAccountId(e.target.value)}
              >
                <option value="">-- البنك / الصندوق --</option>
                {treasuryAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameAr || acc.nameEn || acc.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                ربط بالحاوية المسجلة:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={shipmentId}
                onChange={(e) => {
                  setShipmentId(e.target.value);
                  const found = shipments.find((s: any) => s.id === e.target.value);
                  if (found) setContainerNo(found.container_number);
                }}
              >
                <option value="">-- اختياري --</option>
                {shipments.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.container_number} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                تاريخ الإرجاع المتوقع للفارغ:
              </label>
              <input
                type="date"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              ملاحظات:
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={notes}
              placeholder="مثال: شيك تأمين مسترد عند تسليم الفارغ بمستودع الدخيلة"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setIsRecordOpen(false)}
              style={{ padding: '7px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5, cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              style={{ padding: '7px 16px', backgroundColor: '#170e5e', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              حفظ التأمين
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* Modal: Refund Deposit */}
      {selectedDepositForRefund && (
        <StandardDialog
          isOpen={!!selectedDepositForRefund}
          onClose={() => setSelectedDepositForRefund(null)}
          title={`تسوية استرداد تأمين الحاوية: ${selectedDepositForRefund.container_number}`}
          subtitle={`الخط الملاحي: ${selectedDepositForRefund.shipping_line} | التأمين الأصلي: ${formatCurrency(selectedDepositForRefund.deposit_amount_egp)}`}
          width="600px"
          compact
        >
          <form onSubmit={handleRefundDeposit} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  تاريخ تسليم الفارغ للخط: *
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                  value={actualReturnDate}
                  onChange={(e) => setActualReturnDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  حساب إيداع المبلغ المسترد:
                </label>
                <select
                  className="input"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                  value={refundTreasuryAccountId}
                  onChange={(e) => setRefundTreasuryAccountId(e.target.value)}
                >
                  <option value="">-- البنك / الصندوق --</option>
                  {treasuryAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameAr || acc.nameEn || acc.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  المبلغ المسترد نقداً أو بالحساب (ج.م): *
                </label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                  value={refundedAmountEgp}
                  onChange={(e) => setRefundedAmountEgp(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  الخصومات ومصاريف التأخير (Detention):
                </label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                  value={deductionsAmountEgp}
                  onChange={(e) => setDeductionsAmountEgp(Number(e.target.value))}
                />
              </div>
            </div>

            {deductionsAmountEgp > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#b91c1c', marginBottom: 4 }}>
                  سبب الخصم (سيتم إثباته كمصروف غرامات/تلفيات): *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                  value={deductionReason}
                  placeholder="مثال: خصم 3 أيام تأخير detention بعد انتهاء فترة السماح"
                  onChange={(e) => setDeductionReason(e.target.value)}
                  required={deductionsAmountEgp > 0}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedDepositForRefund(null)}
                style={{ padding: '7px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5, cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                style={{ padding: '7px 16px', backgroundColor: '#15803d', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                تأكيد الاسترداد وإغلاق التأمين
              </button>
            </div>
          </form>
        </StandardDialog>
      )}
    </div>
  );
}
