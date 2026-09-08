import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { XIcon, CheckIcon, MessageSquareIcon } from '@/shared/components/icons/AppIcons';
import { CustomerInstallmentItem, InstallmentPlanItem } from '@/features/sales/api/installments.api';
import { installmentStatusBadges } from './InstallmentsScheduleTable';

interface InstallmentModalsManagerProps {
  payModalInstallment: CustomerInstallmentItem | null;
  onClosePayModal: () => void;
  payAmount: string;
  onChangePayAmount: (val: string) => void;
  payMethod: 'cash' | 'card' | 'bank_transfer' | 'instapay';
  onChangePayMethod: (val: 'cash' | 'card' | 'bank_transfer' | 'instapay') => void;
  payNotes: string;
  onChangePayNotes: (val: string) => void;
  onConfirmPay: () => void;
  isPaying: boolean;
  receiptData: {
    receipt_no: string;
    paid_amount: number;
    installment_number: number;
    paid_at: string;
    payment_method: string;
    customer_name: string;
    customer_phone: string;
  } | null;
  onCloseReceipt: () => void;
  onSendReceiptWhatsApp: () => void;
  selectedPlanDetails: InstallmentPlanItem | null;
  onClosePlanDetails: () => void;
  planDetailsSchedule: CustomerInstallmentItem[];
  onOpenPayForInstallment: (inst: CustomerInstallmentItem) => void;
}

export const InstallmentModalsManager: React.FC<InstallmentModalsManagerProps> = ({
  payModalInstallment,
  onClosePayModal,
  payAmount,
  onChangePayAmount,
  payMethod,
  onChangePayMethod,
  payNotes,
  onChangePayNotes,
  onConfirmPay,
  isPaying,
  receiptData,
  onCloseReceipt,
  onSendReceiptWhatsApp,
  selectedPlanDetails,
  onClosePlanDetails,
  planDetailsSchedule,
  onOpenPayForInstallment,
}) => {
  return (
    <>
      {/* 1. Pay Installment Modal */}
      {payModalInstallment && (
        <DialogShell
          open={true}
          onClose={onClosePayModal}
          width="min(480px, 95vw)"
          ariaLabel="تحصيل قسط عميل"
        >
          <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="standard-dialog-header">
              <div className="standard-dialog-header-info">
                <h3 className="standard-dialog-title">تحصيل قسط عميل</h3>
                <p className="standard-dialog-subtitle">تسجيل دفعة نقدية أو بنكية لحساب القسط</p>
              </div>
              <button type="button" onClick={onClosePayModal} className="standard-dialog-close-btn" aria-label="إغلاق">
                <XIcon size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>العميل:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{payModalInstallment.customer_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>القسط:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                  رقم #{payModalInstallment.installment_number}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>تاريخ الاستحقاق:</span>
                <span style={{ color: '#334155' }}>
                  {new Date(payModalInstallment.due_date).toLocaleDateString('ar-EG')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>قيمة القسط الكاملة:</span>
                <span style={{ fontWeight: 'bold', color: '#166534' }}>
                  {formatCurrency(payModalInstallment.amount)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                المبلغ المراد تحصيله الآن *
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => onChangePayAmount(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                طريقة الدفع *
              </label>
              <select
                value={payMethod}
                onChange={(e) => onChangePayMethod(e.target.value as any)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              >
                <option value="cash">نقداً (كاش)</option>
                <option value="card">بطاقة مدى / ائتمان (شبكة)</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="instapay">إنستاباي / محفظة إلكترونية</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                ملاحظات التحصيل
              </label>
              <input
                type="text"
                placeholder="مثلاً: دفعة عن طريق الحساب البنكي، أو نقداً بالفرع"
                value={payNotes}
                onChange={(e) => onChangePayNotes(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div className="standard-dialog-footer">
              <Button variant="secondary" onClick={onClosePayModal}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={onConfirmPay}
                disabled={!Number(payAmount) || isPaying}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                {isPaying ? 'جاري تسجيل السداد...' : 'تأكيد التحصيل وإصدار الإيصال'}
              </Button>
            </div>
          </div>
        </DialogShell>
      )}

      {/* 2. Receipt Modal */}
      {receiptData && (
        <DialogShell
          open={true}
          onClose={onCloseReceipt}
          width="min(400px, 95vw)"
          ariaLabel="إيصال استلام قسط"
        >
          <div dir="rtl" style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CheckIcon size={24} color="#16a34a" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px 0' }}>
              تم التحصيل بنجاح!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              تم إيداع المبلغ وتحديث رصيد العميل
            </p>

            <div
              id="installment-receipt-print"
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'right',
                fontSize: '12px',
                lineHeight: '1.8',
                backgroundColor: '#fafafa',
                marginBottom: '16px',
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                إيصال استلام قسط
              </div>
              <div><strong>رقم الإيصال:</strong> {receiptData.receipt_no}</div>
              <div><strong>العميل:</strong> {receiptData.customer_name}</div>
              <div><strong>القسط:</strong> رقم #{receiptData.installment_number}</div>
              <div><strong>المبلغ المحصل:</strong> {formatCurrency(receiptData.paid_amount)}</div>
              <div><strong>طريقة الدفع:</strong> {receiptData.payment_method}</div>
              <div><strong>التاريخ:</strong> {new Date(receiptData.paid_at).toLocaleString('ar-EG')}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button
                onClick={() => window.print()}
                style={{ flex: 1, backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                طباعة الإيصال
              </Button>
              <Button
                onClick={onSendReceiptWhatsApp}
                style={{ flex: 1, backgroundColor: '#25D366', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <MessageSquareIcon size={16} color="#ffffff" />
                <span>إرسال واتساب</span>
              </Button>
              <Button variant="secondary" onClick={onCloseReceipt}>
                إغلاق
              </Button>
            </div>
          </div>
        </DialogShell>
      )}

      {/* 3. Plan Details Modal */}
      {selectedPlanDetails && (
        <DialogShell
          open={true}
          onClose={onClosePlanDetails}
          width="min(750px, 95vw)"
          ariaLabel="جدول أقساط العقد"
        >
          <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="standard-dialog-header">
              <div className="standard-dialog-header-info">
                <h3 className="standard-dialog-title">جدول أقساط العقد: {selectedPlanDetails.plan_number}</h3>
                <p className="standard-dialog-subtitle">
                  العميل: {selectedPlanDetails.customer_name} ({selectedPlanDetails.customer_phone})
                </p>
              </div>
              <button type="button" onClick={onClosePlanDetails} className="standard-dialog-close-btn" aria-label="إغلاق">
                <XIcon size={18} />
              </button>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px' }}>القسط</th>
                    <th style={{ padding: '10px 14px' }}>تاريخ الاستحقاق</th>
                    <th style={{ padding: '10px 14px' }}>القيمة</th>
                    <th style={{ padding: '10px 14px' }}>المسدد</th>
                    <th style={{ padding: '10px 14px' }}>تاريخ السداد</th>
                    <th style={{ padding: '10px 14px' }}>الحالة</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {planDetailsSchedule.map((inst) => {
                    const badge = installmentStatusBadges[inst.display_status || inst.status] || installmentStatusBadges.pending;
                    return (
                      <tr key={inst.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: '600' }}>#{inst.installment_number}</td>
                        <td style={{ padding: '10px 14px' }}>{new Date(inst.due_date).toLocaleDateString('ar-EG')}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{formatCurrency(inst.amount)}</td>
                        <td style={{ padding: '10px 14px', color: '#166534' }}>{formatCurrency(inst.paid_amount)}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>
                          {inst.paid_at ? new Date(inst.paid_at).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {inst.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => onOpenPayForInstallment(inst)}
                              style={{ backgroundColor: '#170e5e', color: '#ffffff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              تحصيل
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="standard-dialog-footer">
              <Button variant="secondary" onClick={onClosePlanDetails}>
                إغلاق
              </Button>
            </div>
          </div>
        </DialogShell>
      )}
    </>
  );
};
