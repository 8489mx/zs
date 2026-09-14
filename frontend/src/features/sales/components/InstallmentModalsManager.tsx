import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { formatCurrency } from '@/lib/format';
import { CheckIcon, MessageSquareIcon, PrinterIcon } from '@/shared/components/icons/AppIcons';
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

const paymentMethodOptions = [
  { value: 'cash', label: 'نقداً (كاش)', hint: 'الخزينة النقدية' },
  { value: 'card', label: 'بطاقة مدى / ائتمان (شبكة)', hint: 'نقاط البيع' },
  { value: 'bank_transfer', label: 'تحويل بنكي', hint: 'الحساب الجاري' },
  { value: 'instapay', label: 'إنستاباي / محفظة إلكترونية', hint: 'تحويل فوري' },
];

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
        <StandardDialog
          isOpen={true}
          onClose={onClosePayModal}
          title="تحصيل قسط عميل"
          subtitle="تسجيل دفعة نقدية أو بنكية لحساب القسط"
          maxWidth="500px"
          footer={
            <StandardDialogFooter
              onClose={onClosePayModal}
              closeLabel="إلغاء"
              primaryButton={{
                label: isPaying ? 'جاري تسجيل السداد...' : 'تأكيد التحصيل وإصدار الإيصال',
                onClick: onConfirmPay,
                disabled: !Number(payAmount) || isPaying,
              }}
            />
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* بطاقة ملخص القسط */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>العميل:</span>
                <strong style={{ color: '#0f172a' }}>{payModalInstallment.customer_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>القسط:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  رقم #{payModalInstallment.installment_number}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>تاريخ الاستحقاق:</span>
                <span style={{ color: '#334155' }}>
                  {new Date(payModalInstallment.due_date).toLocaleDateString('ar-EG')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                <span style={{ color: '#64748b' }}>قيمة القسط الكاملة:</span>
                <strong style={{ color: '#166534', fontSize: '13.5px' }}>
                  {formatCurrency(payModalInstallment.amount)}
                </strong>
              </div>
            </div>

            {/* حقول التحصيل */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                المبلغ المراد تحصيله الآن *
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => onChangePayAmount(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                طريقة الدفع *
              </label>
              <CustomSelect
                value={payMethod}
                onChange={(val) => onChangePayMethod(val as any)}
                options={paymentMethodOptions}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                ملاحظات التحصيل
              </label>
              <input
                type="text"
                placeholder="مثلاً: دفعة عن طريق الحساب البنكي، أو نقداً بالفرع"
                value={payNotes}
                onChange={(e) => onChangePayNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </StandardDialog>
      )}

      {/* 2. Receipt Modal */}
      {receiptData && (
        <StandardDialog
          isOpen={true}
          onClose={onCloseReceipt}
          title="تم التحصيل بنجاح"
          subtitle="تم إيداع المبلغ وتحديث رصيد العميل وإصدار الإيصال"
          maxWidth="460px"
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <Button
                variant="primary"
                onClick={() => window.print()}
                style={{ flex: 1, backgroundColor: '#170e5e', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <PrinterIcon size={15} />
                <span>طباعة الإيصال</span>
              </Button>
              <Button
                onClick={onSendReceiptWhatsApp}
                style={{ flex: 1, backgroundColor: '#16a34a', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <MessageSquareIcon size={15} color="#ffffff" />
                <span>إرسال واتساب</span>
              </Button>
              <Button variant="secondary" onClick={onCloseReceipt}>
                إغلاق
              </Button>
            </div>
          }
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CheckIcon size={24} color="#16a34a" />
            </div>

            <div
              id="installment-receipt-print"
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'right',
                fontSize: '12.5px',
                lineHeight: '1.9',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '13.5px', color: '#170e5e', marginBottom: '8px' }}>
                سند قبض واستلام قسط
              </div>
              <div><span style={{ color: '#64748b' }}>رقم الإيصال: </span><strong>{receiptData.receipt_no}</strong></div>
              <div><span style={{ color: '#64748b' }}>العميل: </span><strong>{receiptData.customer_name}</strong></div>
              <div><span style={{ color: '#64748b' }}>القسط: </span><strong>رقم #{receiptData.installment_number}</strong></div>
              <div><span style={{ color: '#64748b' }}>المبلغ المحصل: </span><strong style={{ color: '#166534', fontSize: '13px' }}>{formatCurrency(receiptData.paid_amount)}</strong></div>
              <div><span style={{ color: '#64748b' }}>طريقة الدفع: </span><strong>{receiptData.payment_method}</strong></div>
              <div><span style={{ color: '#64748b' }}>التاريخ: </span><span>{new Date(receiptData.paid_at).toLocaleString('ar-EG')}</span></div>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* 3. Plan Details Modal */}
      {selectedPlanDetails && (
        <StandardDialog
          isOpen={true}
          onClose={onClosePlanDetails}
          title={`جدول أقساط العقد: ${selectedPlanDetails.plan_number}`}
          subtitle={`العميل: ${selectedPlanDetails.customer_name} (${selectedPlanDetails.customer_phone})`}
          maxWidth="780px"
          footer={
            <StandardDialogFooter
              onClose={onClosePlanDetails}
              closeLabel="إغلاق"
            />
          }
        >
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
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
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>#{inst.installment_number}</td>
                      <td style={{ padding: '10px 14px' }}>{new Date(inst.due_date).toLocaleDateString('ar-EG')}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>{formatCurrency(inst.amount)}</td>
                      <td style={{ padding: '10px 14px', color: '#166534', fontWeight: 600 }}>{formatCurrency(inst.paid_amount)}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>
                        {inst.paid_at ? new Date(inst.paid_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {inst.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => onOpenPayForInstallment(inst)}
                            style={{ backgroundColor: '#170e5e', color: '#ffffff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
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
        </StandardDialog>
      )}
    </>
  );
};
