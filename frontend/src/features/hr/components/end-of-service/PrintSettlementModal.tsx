import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { XIcon, PrinterIcon } from '@/shared/components/icons/AppIcons';
import type { SettlementRecord } from '../../api/end-of-service.api';

interface PrintSettlementModalProps {
  settlement: SettlementRecord | null;
  onClose: () => void;
}

export function PrintSettlementModal({
  settlement,
  onClose,
}: PrintSettlementModalProps) {
  if (!settlement) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="min(860px, 96vw)">
      <div dir="rtl" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
            معاينة وطباعة نموذج المخالصة وإخلاء الطرف ({settlement.settlementNo})
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="button"
              variant="primary"
              onClick={() => window.print()}
              style={{ background: '#170e5e', borderColor: '#170e5e', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <PrinterIcon size={16} />
              <span>طباعة المستند</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
            >
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* The Formal Document */}
        <div style={{ border: '2px solid #0f172a', borderRadius: 12, padding: 32, background: '#ffffff', color: '#0f172a', lineHeight: 1.8 }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: 16, marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>إقرار مخالصة نهائية وإبراء ذمة وإخلاء طرف</h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>رقم المستند: {settlement.settlementNo} | التاريخ: {settlement.terminationDate}</div>
          </div>

          <p style={{ fontSize: '0.95rem', margin: '0 0 16px', textAlign: 'justify' }}>
            أقر أنا الموقع أدناه: <strong>{settlement.employeeName}</strong> {settlement.employeeNo ? `(كود: ${settlement.employeeNo})` : ''}،
            بأنني قد استلمت كافة حقوقي ومستحقاتي المالية العمالية والنظامية المقررة طبقاً لنظام العمل عن كامل فترة خدمتي من تاريخ التعيين وحتى تاريخ انتهاء الخدمة في <strong>{settlement.terminationDate}</strong>،
            والبالغة <strong>{settlement.serviceYears} سنة و {settlement.serviceMonths} شهر</strong>، وتشمل مكافأة نهاية الخدمة وبدل الإجازات وأي رواتب أو بدلات.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: '0.85rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px 12px', background: '#f8fafc', width: '30%', fontWeight: 700 }}>مكافأة نهاية الخدمة:</td>
                <td style={{ padding: '8px 12px' }}>{formatCurrency(settlement.gratuityAmount)}</td>
                <td style={{ padding: '8px 12px', background: '#f8fafc', width: '30%', fontWeight: 700 }}>بدل رصيد الإجازات:</td>
                <td style={{ padding: '8px 12px' }}>{formatCurrency(settlement.leaveEncashment)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 700 }}>مستحقات وبدلات أخرى:</td>
                <td style={{ padding: '8px 12px' }}>{formatCurrency((settlement.noticePeriodAmount || 0) + (settlement.customEntitlements || 0))}</td>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 700 }}>استقطاعات وقروض وعهد:</td>
                <td style={{ padding: '8px 12px', color: '#dc2626' }}>{formatCurrency((settlement.loanDeduction || 0) + (settlement.assetsDeduction || 0) + (settlement.otherDeductions || 0))}</td>
              </tr>
              <tr style={{ background: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>
                <td colSpan={2} style={{ padding: '12px 14px', borderTop: '2px solid #0f172a' }}>الصافي المستلم النهائي:</td>
                <td colSpan={2} style={{ padding: '12px 14px', borderTop: '2px solid #0f172a', color: '#15803d' }}>{formatCurrency(settlement.netSettlementAmount)}</td>
              </tr>
            </tbody>
          </table>

          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '16px 0', textAlign: 'justify' }}>
            وبموجب هذا التوقيع، فإن ذمة الشركة تعتبر بريئة براءة تامة وشاملة ونهائية لا رجعة فيها من أي مبالغ أو مطالبات عمالية أو قانونية من أي نوع،
            كما تقر إدارة الشركة باستلامها كافة العهد العينية والأجهزة وإخلاء طرف الموظف نهائياً.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 40, textAlign: 'center', fontSize: '0.85rem' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 40 }}>الموظف (المقر بما فيه)</div>
              <div style={{ borderBottom: '1px dashed #64748b', width: '80%', margin: '0 auto' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 40 }}>مدير الموارد البشرية</div>
              <div style={{ borderBottom: '1px dashed #64748b', width: '80%', margin: '0 auto' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 40 }}>الإدارة المالية / الخزينة</div>
              <div style={{ borderBottom: '1px dashed #64748b', width: '80%', margin: '0 auto' }}></div>
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
