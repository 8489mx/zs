import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { text, money, normalize } from '@/features/hr/pages/payroll/hr-payroll.helpers';
import { PrinterIcon, XIcon, FileTextIcon, PlusCircleIcon, Trash2Icon, SlidersIcon } from '@/shared/components/icons/AppIcons';
import type { HrPayrollRunItem, HrPayrollAdjustment } from '@/types/domain';

interface PayrollReviewItemModalProps {
  item: HrPayrollRunItem | null;
  onClose: () => void;
  canViewSalaryAmounts: boolean;
  runIsFinal: boolean;
  isDraft: boolean;
  periodMonth?: string;
  onAddAdjustment?: (payload: { adjustmentType: 'allowance' | 'deduction'; label: string; amount: number; notes?: string }) => Promise<void>;
  onDeleteAdjustment?: (adjustmentId: string) => Promise<void>;
  onNavigateToAttendance?: (employeeId: string) => void;
  onNavigateToEmployee?: (employeeId: string) => void;
  onPrintSummary?: (item: HrPayrollRunItem) => void;
  onPrintDetailed?: (item: HrPayrollRunItem) => void;
}

export function PayrollReviewItemModal({
  item,
  onClose,
  canViewSalaryAmounts,
  runIsFinal,
  isDraft,
  periodMonth,
  onAddAdjustment,
  onDeleteAdjustment,
  onNavigateToAttendance,
  onNavigateToEmployee,
}: PayrollReviewItemModalProps) {
  const { t } = useTranslation();

  // Adjustment form states
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [adjType, setAdjType] = useState<'allowance' | 'deduction'>('allowance');
  const [adjLabel, setAdjLabel] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!item) return null;

  const baseSalary = Number(item.baseSalary || 0);
  const allowanceAmount = Number(item.allowanceAmount || 0);
  const deductionAmount = Number(item.deductionAmount || 0);
  const loanDeduction = Number(item.loanDeductionAmount || 0);
  const insuranceDeduction = Number((item as any).employeeSocialInsurance || 0);
  const taxDeduction = Number((item as any).incomeTax || 0);
  const grossPay = Number(item.grossPay || (baseSalary + allowanceAmount));
  const totalDeductions = deductionAmount + loanDeduction + insuranceDeduction + taxDeduction;
  const netPay = Number(item.netPay || (grossPay - totalDeductions));
  const adjustments = (item.adjustments || []) as HrPayrollAdjustment[];

  const isHourly = normalize(item.compensationType) === 'hourly' || (Number(item.hourlyRate || 0) > 0 && normalize(item.compensationType) !== 'monthly');
  const hourlyRate = Number(item.hourlyRate || 0);
  const expectedDailyHours = Number(item.expectedDailyHours || 8);
  const calculatedHours = hourlyRate > 0 ? Number((baseSalary / hourlyRate).toFixed(2)) : 0;

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddAdjustment) return;
    const num = Number(adjAmount);
    if (!adjLabel.trim() || isNaN(num) || num <= 0) return;

    try {
      setIsSubmittingAdj(true);
      await onAddAdjustment({
        adjustmentType: adjType,
        label: adjLabel.trim(),
        amount: num,
        notes: adjNotes.trim() || undefined,
      });
      setAdjLabel('');
      setAdjAmount('');
      setAdjNotes('');
      setShowAddAdjustment(false);
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const handleDeleteAdj = async (id: string) => {
    if (!onDeleteAdjustment) return;
    try {
      setDeletingId(id);
      await onDeleteAdjustment(id);
    } finally {
      setDeletingId(null);
    }
  };

  const printPayslip = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>قسيمة استلام راتب - ${text(item.employeeName)} (${periodMonth || ''}) - Z-Systems ERP</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
            @page { size: A4 portrait; margin: 15mm; }
            body {
              font-family: 'Tajawal', Tahoma, Arial, sans-serif;
              padding: 0;
              margin: 0;
              color: #1e293b;
              line-height: 1.6;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .payslip-container {
              border: 2px solid #170e5e;
              border-radius: 12px;
              padding: 24px;
              max-width: 760px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .header-info h1 {
              margin: 0;
              color: #170e5e;
              font-size: 22px;
              font-weight: 800;
            }
            .header-info p {
              margin: 4px 0 0;
              color: #64748b;
              font-size: 13px;
            }
            .doc-badge {
              background: #f8fafc;
              border: 1.5px solid #170e5e;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: 800;
              font-size: 13.5px;
              color: #170e5e;
              text-align: center;
              box-shadow: 0 1px 3px rgba(23,14,94,0.06);
            }
            .employee-card {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 20px;
              font-size: 12.5px;
            }
            .card-item .label {
              color: #64748b;
              font-size: 11px;
              margin-bottom: 2px;
            }
            .card-item .val {
              font-weight: 700;
              color: #0f172a;
            }
            .columns-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 20px;
            }
            .section-box {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
            }
            .section-header {
              padding: 8px 12px;
              font-weight: 700;
              font-size: 13px;
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #cbd5e1;
            }
            .section-header.earnings {
              background: #f0fdf4;
              color: #166534;
              border-bottom-color: #bbf7d0;
            }
            .section-header.deductions {
              background: #fef2f2;
              color: #991b1b;
              border-bottom-color: #fecdd3;
            }
            .row-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              border-bottom: 1px dashed #e2e8f0;
              font-size: 12.5px;
            }
            .row-item:last-child {
              border-bottom: none;
            }
            .row-item.total {
              font-weight: 700;
              background: #fafafa;
              border-top: 1px solid #cbd5e1;
            }
            .net-banner {
              background: #170e5e;
              color: #ffffff;
              border-radius: 8px;
              padding: 14px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }
            .net-banner .title {
              font-size: 15px;
              font-weight: 700;
            }
            .net-banner .amount {
              font-size: 24px;
              font-weight: 800;
            }
            .notes-box {
              background: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 8px;
              padding: 10px 14px;
              font-size: 12px;
              color: #92400e;
              margin-bottom: 24px;
            }
            .signatures {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px dashed #cbd5e1;
            }
            .sig-title {
              font-size: 12px;
              font-weight: 700;
              color: #475569;
              margin-bottom: 45px;
            }
            .sig-line {
              border-bottom: 1px solid #94a3b8;
              width: 75%;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <div class="header">
              <div class="header-info">
                <h1>قسيمة استلام راتب (Payslip)</h1>
                <p>مسير شهر: ${text(periodMonth)} | تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</p>
              </div>
              <div class="doc-badge">
                <span style="display: block; font-size: 14px; font-weight: 800; color: #170e5e; letter-spacing: 0.5px;">Z-Systems ERP</span>
                <small style="color: #64748b; font-weight: 600; font-size: 10.5px;">إدارة الموارد البشرية والرواتب</small>
              </div>
            </div>

            <div class="employee-card" style="grid-template-columns: repeat(${isHourly ? 5 : 4}, 1fr);">
              <div class="card-item">
                <div class="label">اسم الموظف:</div>
                <div class="val">${text(item.employeeName)}</div>
              </div>
              <div class="card-item">
                <div class="label">كود الموظف:</div>
                <div class="val">${text(item.employeeNo)}</div>
              </div>
              <div class="card-item">
                <div class="label">نظام العمل:</div>
                <div class="val">${isHourly ? 'أجر بالساعة/اليوم' : 'راتب شهري تعاقدي'}</div>
              </div>
              ${isHourly ? `
              <div class="card-item">
                <div class="label">أجر الساعة:</div>
                <div class="val" style="color: #166534;">${canViewSalaryAmounts && hourlyRate > 0 ? money(hourlyRate) + ' / س' : '—'}</div>
              </div>
              <div class="card-item">
                <div class="label">ساعات العمل المحتسبة:</div>
                <div class="val" style="color: #1e40af;">${calculatedHours > 0 ? calculatedHours + ' ساعة' : '—'}</div>
              </div>
              ` : `
              <div class="card-item">
                <div class="label">حالة المسير:</div>
                <div class="val">${runIsFinal ? 'معتمد نهائياً' : 'مسودة قيد المراجعة'}</div>
              </div>
              `}
            </div>

            <div class="columns-grid">
              <div class="section-box">
                <div class="section-header earnings">
                  <span>الاستحقاقات المالية</span>
                  <span>المبلغ (ج.م)</span>
                </div>
                <div class="row-item">
                  <span>الراتب الأساسي ${isHourly && calculatedHours > 0 ? `(${calculatedHours}س × ${money(hourlyRate)}/س)` : ''}</span>
                  <span>${canViewSalaryAmounts ? money(baseSalary) : '—'}</span>
                </div>
                <div class="row-item">
                  <span>البدلات والمكافآت والإضافي</span>
                  <span>${canViewSalaryAmounts ? money(allowanceAmount) : '—'}</span>
                </div>
                <div class="row-item total">
                  <span>إجمالي الاستحقاقات (Gross):</span>
                  <span style="color: #166534;">${canViewSalaryAmounts ? money(grossPay) : '—'}</span>
                </div>
              </div>

              <div class="section-box">
                <div class="section-header deductions">
                  <span>الاستقطاعات والجزاءات</span>
                  <span>المبلغ (ج.م)</span>
                </div>
                <div class="row-item">
                  <span>جزاءات التأخير والغياب</span>
                  <span style="color: #dc2626;">${canViewSalaryAmounts ? money(deductionAmount) : '—'}</span>
                </div>
                <div class="row-item">
                  <span>أقساط السلف والمديونيات</span>
                  <span style="color: #dc2626;">${canViewSalaryAmounts ? money(loanDeduction) : '—'}</span>
                </div>
                ${insuranceDeduction > 0 ? `
                <div class="row-item">
                  <span>تأمينات اجتماعية (حصة الموظف)</span>
                  <span style="color: #dc2626;">${canViewSalaryAmounts ? money(insuranceDeduction) : '—'}</span>
                </div>` : ''}
                ${taxDeduction > 0 ? `
                <div class="row-item">
                  <span>ضريبة كسب العمل</span>
                  <span style="color: #dc2626;">${canViewSalaryAmounts ? money(taxDeduction) : '—'}</span>
                </div>` : ''}
                <div class="row-item total">
                  <span>إجمالي الاستقطاعات:</span>
                  <span style="color: #dc2626;">${canViewSalaryAmounts ? money(totalDeductions) : '—'}</span>
                </div>
              </div>
            </div>

            <div class="net-banner">
              <div class="title">صافي الراتب المستحق للصرف:</div>
              <div class="amount">${canViewSalaryAmounts ? money(netPay) : '—'}</div>
            </div>

            ${(item.payrollReviewNotes || item.notes) ? `
            <div class="notes-box">
              <strong>ملاحظات مراجعة الحضور والتدقيق:</strong><br>
              ${text(item.payrollReviewNotes || item.notes)}
            </div>` : ''}

            <div class="signatures">
              <div>
                <div class="sig-title">توقيع الموظف بالاستلام</div>
                <div class="sig-line"></div>
              </div>
              <div>
                <div class="sig-title">إعداد وتدقيق الموارد البشرية</div>
                <div class="sig-line"></div>
              </div>
              <div>
                <div class="sig-title">اعتماد الإدارة المالية</div>
                <div class="sig-line"></div>
              </div>
            </div>

            <div style="margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748b; clear: both; page-break-inside: avoid;">
              <span>تم إصدار واعتماد قسيمة الراتب إلكترونياً عبر منظومة <strong>Z-Systems Cloud ERP</strong> لإدارة المؤسسات والموارد البشرية</span>
              <span dir="ltr" style="font-weight: 700; color: #170e5e;">Powered by Z-Systems ERP • www.z-systems.io</span>
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const printThermalReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>إيصال استلام راتب - ${text(item.employeeName)} - Z-Systems</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
            @page {
              size: 80mm auto;
              margin: 3mm 4mm;
            }
            body {
              font-family: 'Tajawal', Tahoma, Arial, sans-serif;
              margin: 0;
              padding: 4px;
              color: #0f172a;
              background: #ffffff;
              width: 72mm;
              font-size: 11px;
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .thermal-header {
              text-align: center;
              border-bottom: 1.5px dashed #0f172a;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .brand-title {
              font-size: 15px;
              font-weight: 800;
              margin: 0;
              color: #170e5e;
            }
            .doc-title {
              font-size: 13px;
              font-weight: 800;
              margin: 3px 0 2px;
            }
            .meta-text {
              font-size: 10px;
              color: #475569;
            }
            .info-block {
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 6px;
              margin-bottom: 6px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 3px;
            }
            .info-label {
              color: #475569;
            }
            .info-val {
              font-weight: 700;
              color: #0f172a;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              background: #f1f5f9;
              padding: 3px 6px;
              border-radius: 4px;
              margin: 6px 0 4px;
              display: flex;
              justify-content: space-between;
            }
            .line-item {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              padding: 2px 2px;
            }
            .net-box {
              border: 1.5px solid #0f172a;
              background: #f8fafc;
              border-radius: 6px;
              padding: 8px 6px;
              margin: 8px 0;
              text-align: center;
            }
            .net-label {
              font-size: 11px;
              font-weight: 700;
              color: #334155;
            }
            .net-amount {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }
            .signatures {
              margin-top: 14px;
              padding-top: 8px;
              border-top: 1px dashed #cbd5e1;
              text-align: center;
            }
            .sig-title {
              font-size: 10.5px;
              font-weight: 700;
              margin-bottom: 30px;
            }
            .sig-line {
              border-bottom: 1px solid #475569;
              width: 70%;
              margin: 0 auto;
            }
            .thermal-footer {
              margin-top: 10px;
              text-align: center;
              font-size: 9px;
              color: #64748b;
              border-top: 1px dashed #e2e8f0;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="thermal-header">
            <h1 class="brand-title">Z-Systems ERP</h1>
            <div class="doc-title">إيصال استلام راتب / أجر</div>
            <div class="meta-text">مسير: ${text(periodMonth)} • التاريخ: ${new Date().toLocaleDateString('ar-EG')}</div>
          </div>

          <div class="info-block">
            <div class="info-row">
              <span class="info-label">الموظف:</span>
              <span class="info-val">${text(item.employeeName)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الكود:</span>
              <span class="info-val">${text(item.employeeNo)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">نظام الأجر:</span>
              <span class="info-val">${isHourly ? 'أجر بالساعة / اليوم' : 'راتب شهري تعاقدي'}</span>
            </div>
            ${isHourly ? `
            <div class="info-row" style="background: #f0fdf4; padding: 2px 4px; border-radius: 4px;">
              <span class="info-label" style="color: #166534; font-weight: 600;">أجر الساعة:</span>
              <span class="info-val" style="color: #166534;">${canViewSalaryAmounts && hourlyRate > 0 ? money(hourlyRate) + ' / س' : '—'}</span>
            </div>
            <div class="info-row" style="background: #f0fdf4; padding: 2px 4px; border-radius: 4px;">
              <span class="info-label" style="color: #166534; font-weight: 600;">ساعات العمل:</span>
              <span class="info-val" style="color: #166534;">${calculatedHours > 0 ? calculatedHours + ' ساعة' : '—'}</span>
            </div>
            ` : ''}
          </div>

          <div class="section-title">
            <span>الاستحقاقات</span>
            <span>المبلغ</span>
          </div>
          <div class="line-item">
            <span>الأساسي ${isHourly && calculatedHours > 0 ? `(${calculatedHours}س × ${money(hourlyRate)})` : ''}</span>
            <span>${canViewSalaryAmounts ? money(baseSalary) : '—'}</span>
          </div>
          ${allowanceAmount > 0 ? `
          <div class="line-item">
            <span>البدلات والإضافي والمكافآت</span>
            <span>+${canViewSalaryAmounts ? money(allowanceAmount) : '—'}</span>
          </div>` : ''}
          <div class="line-item" style="font-weight: 700; border-top: 1px dashed #e2e8f0; margin-top: 2px; padding-top: 2px;">
            <span>إجمالي المستحق (Gross):</span>
            <span>${canViewSalaryAmounts ? money(grossPay) : '—'}</span>
          </div>

          <div class="section-title" style="background: #fef2f2; color: #991b1b;">
            <span>الاستقطاعات والجزاءات</span>
            <span>المبلغ</span>
          </div>
          ${deductionAmount > 0 ? `
          <div class="line-item">
            <span>تأخير وغياب وحضور</span>
            <span style="color: #dc2626;">-${canViewSalaryAmounts ? money(deductionAmount) : '—'}</span>
          </div>` : ''}
          ${loanDeduction > 0 ? `
          <div class="line-item">
            <span>أقساط سلف ومديونيات</span>
            <span style="color: #dc2626;">-${canViewSalaryAmounts ? money(loanDeduction) : '—'}</span>
          </div>` : ''}
          ${insuranceDeduction > 0 ? `
          <div class="line-item">
            <span>تأمينات اجتماعية</span>
            <span style="color: #dc2626;">-${canViewSalaryAmounts ? money(insuranceDeduction) : '—'}</span>
          </div>` : ''}
          ${taxDeduction > 0 ? `
          <div class="line-item">
            <span>ضريبة كسب العمل</span>
            <span style="color: #dc2626;">-${canViewSalaryAmounts ? money(taxDeduction) : '—'}</span>
          </div>` : ''}
          ${totalDeductions === 0 ? `
          <div class="line-item" style="color: #64748b; font-size: 10px;">
            <span>لا توجد استقطاعات</span>
            <span>0.00 ج.م</span>
          </div>` : ''}
          <div class="line-item" style="font-weight: 700; border-top: 1px dashed #e2e8f0; margin-top: 2px; padding-top: 2px; color: #991b1b;">
            <span>إجمالي الاستقطاعات:</span>
            <span>-${canViewSalaryAmounts ? money(totalDeductions) : '—'}</span>
          </div>

          <div class="net-box">
            <div class="net-label">صافي الراتب المستحق للصرف</div>
            <div class="net-amount">${canViewSalaryAmounts ? money(netPay) : '—'}</div>
          </div>

          ${(item.payrollReviewNotes || item.notes) ? `
          <div style="font-size: 9.5px; color: #78350f; background: #fffbeb; padding: 4px; border-radius: 4px; margin-bottom: 6px;">
            ملاحظات: ${text(item.payrollReviewNotes || item.notes)}
          </div>` : ''}

          <div class="signatures">
            <div class="sig-title">توقيع الموظف بالاستلام</div>
            <div class="sig-line"></div>
          </div>

          <div class="thermal-footer">
            طُبعت آلياً عبر منظومة Z-Systems ERP<br>
            www.z-systems.io
          </div>

          <script>
            setTimeout(() => { window.print(); window.close(); }, 400);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <DialogShell open={true} onClose={onClose} width="760px">
      <div style={{ padding: '20px 24px', maxHeight: '85vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '3px', height: '16px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <FileTextIcon size={18} color="#170e5e" />
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {t('hr.payroll.payroll_review_item_modal.s0', "مفردات وتفاصيل الراتب")}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12.5px', color: '#64748b' }}>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{text(item.employeeName)}</span>
              <span>•</span>
              <span>{t('hr.payroll.payroll_review_item_modal.s1', "كود:")} {text(item.employeeNo)}</span>
              {periodMonth && (
                <>
                  <span>•</span>
                  <span>شهر: <strong>{periodMonth}</strong></span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={t('common.close', "إغلاق")}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Quick KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
              {isHourly ? 'أجر ساعات العمل' : 'الأساسي التعاقدي'}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              {canViewSalaryAmounts ? money(baseSalary) : '—'}
            </div>
            {isHourly && calculatedHours > 0 && hourlyRate > 0 && (
              <div style={{ fontSize: '10.5px', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                {calculatedHours} س × {money(hourlyRate)}
              </div>
            )}
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>البدلات والإضافي</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>
              {canViewSalaryAmounts ? money(allowanceAmount) : '—'}
            </div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>الاستقطاعات والجزاءات</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
              {canViewSalaryAmounts ? money(totalDeductions) : '—'}
            </div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, marginBottom: '2px' }}>صافي الراتب المستحق</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#15803d' }}>
              {canViewSalaryAmounts ? money(netPay) : '—'}
            </div>
          </div>
        </div>

        {/* Dual-Column Financial Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
          {/* Earnings Column */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{ background: '#f0fdf4', padding: '8px 12px', borderBottom: '1px solid #dcfce7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#166534' }}>الاستحقاقات المالية (Earnings)</span>
              <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>المبلغ (ج.م)</span>
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                <span style={{ color: '#475569' }}>الراتب الأساسي:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{canViewSalaryAmounts ? money(baseSalary) : '—'}</span>
              </div>
              {isHourly && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 8px', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#166534', fontWeight: 600 }}>أجر الساعة التعاقدي:</span>
                    <strong style={{ color: '#166534' }}>{canViewSalaryAmounts && hourlyRate > 0 ? `${money(hourlyRate)} / ساعة` : '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#166534', fontWeight: 600 }}>ساعات العمل المحتسبة:</span>
                    <strong style={{ color: '#1e40af' }}>{calculatedHours > 0 ? `${calculatedHours} ساعة` : '—'}</strong>
                  </div>
                  {hourlyRate > 0 && calculatedHours > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #86efac', paddingTop: '3px', marginTop: '2px', color: '#14532d', fontSize: '11px' }}>
                      <span>معادلة الأجر:</span>
                      <span dir="ltr" style={{ fontWeight: 700 }}>{calculatedHours} hrs × {money(hourlyRate)} = {money(baseSalary)}</span>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                <span style={{ color: '#475569' }}>البدلات والمكافآت:</span>
                <span style={{ fontWeight: 600 }}>{canViewSalaryAmounts ? money(allowanceAmount) : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                <span style={{ color: '#475569' }}>نوع الأجر والتعاقد:</span>
                <span style={{ fontWeight: 600, color: isHourly ? '#166534' : '#64748b' }}>
                  {isHourly ? 'بالساعة / اليوم' : 'راتب شهري'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', marginTop: '2px', borderTop: '1px solid #e2e8f0', fontWeight: 700 }}>
                <span style={{ color: '#0f172a' }}>إجمالي الاستحقاق (Gross):</span>
                <span style={{ color: '#166534' }}>{canViewSalaryAmounts ? money(grossPay) : '—'}</span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{ background: '#fef2f2', padding: '8px 12px', borderBottom: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#991b1b' }}>الاستقطاعات والجزاءات (Deductions)</span>
              <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>المبلغ (ج.م)</span>
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                <span style={{ color: '#475569' }}>جزاءات الحضور (تأخير وغياب):</span>
                <span style={{ fontWeight: 600, color: deductionAmount > 0 ? '#dc2626' : 'inherit' }}>
                  {canViewSalaryAmounts ? money(deductionAmount) : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                <span style={{ color: '#475569' }}>أقساط السلف والمديونيات:</span>
                <span style={{ fontWeight: 600, color: loanDeduction > 0 ? '#dc2626' : 'inherit' }}>
                  {canViewSalaryAmounts ? money(loanDeduction) : '—'}
                </span>
              </div>
              {insuranceDeduction > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>تأمينات اجتماعية:</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>{canViewSalaryAmounts ? money(insuranceDeduction) : '—'}</span>
                </div>
              )}
              {taxDeduction > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>ضريبة كسب العمل:</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>{canViewSalaryAmounts ? money(taxDeduction) : '—'}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', marginTop: '2px', borderTop: '1px solid #e2e8f0', fontWeight: 700 }}>
                <span style={{ color: '#0f172a' }}>إجمالي الاستقطاعات:</span>
                <span style={{ color: '#dc2626' }}>{canViewSalaryAmounts ? money(totalDeductions) : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Net Payable Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #170e5e 0%, #1e1b4b 100%)',
          color: '#ffffff',
          borderRadius: '10px',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          boxShadow: '0 2px 4px rgba(23, 14, 94, 0.12)',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>صافي الراتب المستحق للصرف:</div>
            <div style={{ fontSize: '11px', opacity: 0.75 }}>بعد احتساب الاستحقاقات وكافة الجزاءات والاستقطاعات</div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            {canViewSalaryAmounts ? money(netPay) : '—'}
          </div>
        </div>

        {/* Manual Adjustments Section (Edit & Modify Salary) */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: adjustments.length || showAddAdjustment ? '12px' : '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              <SlidersIcon size={16} color="#170e5e" />
              <span>التسويات والتعديلات اليدوية على الراتب</span>
              {adjustments.length > 0 && (
                <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '11px', padding: '1px 7px', borderRadius: '10px', fontWeight: 700 }}>
                  {adjustments.length}
                </span>
              )}
            </div>

            {isDraft && onAddAdjustment && !showAddAdjustment && (
              <Button
                variant="secondary"
                onClick={() => setShowAddAdjustment(true)}
                style={{ padding: '3px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#170e5e', borderColor: '#c7d2fe', background: '#eef2ff', fontWeight: 600 }}
              >
                <PlusCircleIcon size={14} />
                <span>إضافة تسوية (مكافأة / خصم يدوي)</span>
              </Button>
            )}
          </div>

          {/* Existing Adjustments List */}
          {adjustments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: showAddAdjustment ? '12px' : '0' }}>
              {adjustments.map((adj) => {
                const isAllowance = adj.adjustmentType === 'allowance';
                return (
                  <div
                    key={adj.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: isAllowance ? '#dcfce7' : '#fee2e2',
                        color: isAllowance ? '#166534' : '#991b1b',
                      }}>
                        {isAllowance ? '+ إضافة / مكافأة' : '- استقطاع / جزاء'}
                      </span>
                      <strong style={{ color: '#1e293b' }}>{adj.label}</strong>
                      {adj.notes && <span style={{ color: '#64748b', fontSize: '11.5px' }}>({adj.notes})</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 700, color: isAllowance ? '#166534' : '#dc2626' }}>
                        {isAllowance ? '+' : '-'}{money(adj.amount)}
                      </span>
                      {isDraft && onDeleteAdjustment && (
                        <button
                          onClick={() => handleDeleteAdj(adj.id)}
                          disabled={deletingId === adj.id}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                          title="حذف التسوية"
                        >
                          <Trash2Icon size={14} color="#dc2626" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Adjustment Form */}
          {showAddAdjustment && (
            <form onSubmit={handleSaveAdjustment} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#170e5e', marginBottom: '10px' }}>
                تسجيل تسوية جديدة للموظف لشهر {periodMonth || 'الحالي'}:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1.5fr 110px 1.5fr auto', gap: '8px', alignItems: 'center' }}>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as 'allowance' | 'deduction')}
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                >
                  <option value="allowance">مكافأة / بدل (+)</option>
                  <option value="deduction">خصم / جزاء (-)</option>
                </select>

                <input
                  type="text"
                  placeholder="بيان التسوية (مثال: مكافأة أداء، خصم إتلاف)"
                  value={adjLabel}
                  onChange={(e) => setAdjLabel(e.target.value)}
                  required
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="المبلغ (ج.م)"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  required
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />

                <input
                  type="text"
                  placeholder="ملاحظات اختيارية..."
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />

                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingAdj || !adjLabel.trim() || !adjAmount}
                    style={{ padding: '5px 12px', fontSize: '12px', background: '#170e5e', color: '#fff', borderColor: '#170e5e' }}
                  >
                    {isSubmittingAdj ? 'جارٍ...' : 'حفظ'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddAdjustment(false)}
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </form>
          )}

          {!adjustments.length && !showAddAdjustment && (
            <div style={{ color: '#64748b', fontSize: '11.5px' }}>
              لا توجد تسويات يدوية مسجلة لهذا الموظف في هذا الكشف. يمكنك إضافة مكافأة أو خصم استثنائي بالضغط على الزر أعلاه.
            </div>
          )}
        </div>

        {/* Attendance & Root Navigation Section */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <span>تدقيق البصمة والدوام للمسير</span>
            </div>

            {/* Root Edit Links */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {onNavigateToAttendance && (
                <Button
                  variant="secondary"
                  onClick={() => onNavigateToAttendance(item.employeeId)}
                  style={{ padding: '2px 8px', fontSize: '11px', color: '#334155' }}
                >
                  فتح سجل بصمات الموظف
                </Button>
              )}
              {onNavigateToEmployee && (
                <Button
                  variant="secondary"
                  onClick={() => onNavigateToEmployee(item.employeeId)}
                  style={{ padding: '2px 8px', fontSize: '11px', color: '#334155' }}
                >
                  فتح عقد وملف الموظف
                </Button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isHourly ? 4 : 3}, 1fr)`, gap: '10px', fontSize: '12px', marginBottom: (item.payrollReviewNotes || item.notes) ? '10px' : '0' }}>
            {isHourly && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 10px' }}>
                <span style={{ color: '#166534', fontWeight: 600 }}>ساعات العمل المعتمدة: </span>
                <strong style={{ color: '#166534' }}>
                  {calculatedHours > 0 ? `${calculatedHours} ساعة` : '0'}
                </strong>
              </div>
            )}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ color: '#64748b' }}>أيام الغياب: </span>
              <strong style={{ color: Number(item.attendanceAbsentDays || 0) > 0 ? '#dc2626' : '#0f172a' }}>
                {item.attendanceAbsentDays || 0} يوم
              </strong>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ color: '#64748b' }}>تأخير وانصراف مبكر: </span>
              <strong style={{ color: deductionAmount > 0 ? '#ea580c' : '#0f172a' }}>
                {deductionAmount > 0 ? `${money(deductionAmount)}` : 'لا يوجد'}
              </strong>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ color: '#64748b' }}>إجازات غير مدفوعة: </span>
              <strong>{item.unpaidLeaveDays || 0} يوم</strong>
            </div>
          </div>

          {(item.payrollReviewNotes || item.notes) && (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#92400e' }}>
              <strong>تفاصيل مراجعة الحضور: </strong>
              <span>{text(item.payrollReviewNotes || item.notes)}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose} style={{ minWidth: '90px' }}>
            {t('common.close', "إغلاق")}
          </Button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={printThermalReceipt}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
                padding: '6px 14px',
                borderColor: '#cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
              }}
            >
              <PrinterIcon size={16} />
              <span>طباعة إيصال حراري (80mm)</span>
            </Button>

            <Button
              variant="primary"
              onClick={printPayslip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#170e5e',
                borderColor: '#170e5e',
                color: '#ffffff',
                fontWeight: 600,
                padding: '6px 16px',
              }}
            >
              <PrinterIcon size={16} />
              <span>طباعة قسيمة الراتب (A4)</span>
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
