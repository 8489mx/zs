import { useTranslation } from 'react-i18next';
import { useRef } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { ContractingInvoice, ContractingProject } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { getTextDirection } from '@/lib/arabic-normalization';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface PrintIpcCertificateModalProps {
  open: boolean;
  invoice: ContractingInvoice | null;
  project?: ContractingProject | null;
  onClose: () => void;
}

export function PrintIpcCertificateModal({ open, invoice, project: propProject, onClose }: PrintIpcCertificateModalProps) {
  const { t } = useTranslation();
  const { currencySymbol } = useSystemCurrency();
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const project = propProject || invoice.project;
  const originalContract = Number(project?.contractValue || 0);
  const revisedContract = Number(project?.revisedContractValue || originalContract);
  const netChangeOrders = revisedContract - originalContract;

  const currentWork = Number(invoice.currentAmount || 0);
  const storedMaterials = Number(invoice.storedMaterialsAmount || 0);
  const periodTotal = currentWork + storedMaterials;
  const previousWork = Number(invoice.previousAmount || 0);
  const cumulativeWork = previousWork + periodTotal;

  const advanceRecovery = Number(invoice.advanceRecoveryAmount || 0);
  const retentionHeld = Number(invoice.retentionHeldAmount || 0);
  const otherDeductions = Number(invoice.otherDeductions || 0);
  const netPayable = Number(invoice.netPayable || 0);

  const balanceToFinish = Math.max(0, revisedContract - cumulativeWork);

  const handlePrint = () => {
    window.print();
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`شهادة دفع ومستخلص تنفيذي معتمد - ${invoice.ipcNumber}`}
      subtitle={t('contracting.print_ipc_certificate_modal.s0', "نموذج الحصر والاعتماد الهندسي المعتمد (AIA G702 / G703 Application & Certificate for Payment)")}
      width="min(950px, 95vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Print Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            <AppIcons.Printer size={16} />
            {t('contracting.print_ipc_certificate_modal.s1', "طباعة شهادة المستخلص (A4)")}
          </button>
        </div>

        {/* Printable Document Container */}
        <div
          ref={printRef}
          className="printable-ipc-sheet"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '24px 28px',
            fontSize: '12px',
            color: '#0f172a',
            lineHeight: 1.5,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #170e5e', paddingBottom: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#170e5e' }}>{t('contracting.print_ipc_certificate_modal.s2', "شهادة استحقاق مستخلص أعمال جاري")}</h2>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>INTERIM PAYMENT CERTIFICATE & SUMMARY (AIA G702 STANDARD)</div>
              <div style={{ marginTop: '8px', fontWeight: 700, fontSize: '14px' }}>{t('contracting.print_ipc_certificate_modal.s3', "المشروع:")} {project?.name || '---'}</div>
              <div style={{ color: '#475569' }}>{t('contracting.print_ipc_certificate_modal.s4', "كود المشروع:")} {project?.code || '---'}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#170e5e' }}>{t('contracting.print_ipc_certificate_modal.s5', "رقم المستخلص:")} {invoice.ipcNumber}</div>
              <div>{t('contracting.print_ipc_certificate_modal.s6', "المستخلص رقم:")} {invoice.sequenceOrder}</div>
              <div>{t('contracting.print_ipc_certificate_modal.s7', "الفترة:")} {invoice.periodStart || '---'} {t('contracting.print_ipc_certificate_modal.s8', "إلى")} {invoice.periodEnd || '---'}</div>
              <div>{t('contracting.print_ipc_certificate_modal.s9', "تاريخ الإصدار:")} {new Date(invoice.createdAt).toLocaleDateString('ar-EG')}</div>
              <div style={{ marginTop: '4px' }}>
                {t('contracting.print_ipc_certificate_modal.s10', "الحالة:")} <strong style={{ color: invoice.status === 'approved' ? '#059669' : '#d97706' }}>
                  {invoice.status === 'approved' ? t('contracting.print_ipc_certificate_modal.s11', "معتمد رسمياً") : t('contracting.print_ipc_certificate_modal.s12', "مسودة قيد المراجعة")}
                </strong>
              </div>
              {invoice.journalEntryId && (
                <div style={{ marginTop: '2px', fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                  {t('contracting.print_ipc_certificate_modal.s13', "القيد الدفتري المرحل: #")}{invoice.journalEntryId}
                </div>
              )}
            </div>
          </div>

          {/* Stakeholders Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{t('contracting.print_ipc_certificate_modal.s14', "المالك / جهة الإسناد:")}</span>
              <strong>{project?.clientName || '---'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{t('contracting.print_ipc_certificate_modal.s15', "المقاول العام المنفذ:")}</span>
              <strong>{t('contracting.print_ipc_certificate_modal.s16', "شركة المقاولات العامة")}</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{t('contracting.print_ipc_certificate_modal.s17', "المهندس الاستشاري المشرف:")}</span>
              <strong>{t('contracting.print_ipc_certificate_modal.s18', "المكتب الاستشاري الهندسي المعتمد")}</strong>
            </div>
          </div>

          {/* AIA G702 Financial Contract Summary Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{t('contracting.print_ipc_certificate_modal.s19', "1. قيمة العقد الأصلي (Original Contract Sum)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>{originalContract.toLocaleString('ar-EG')} {currencySymbol}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{t('contracting.print_ipc_certificate_modal.s20', "2. صافي أوامر التغيير والملحقات المعتمدة (Net Change by Change Orders)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: netChangeOrders >= 0 ? '#059669' : '#dc2626' }}>
                  {netChangeOrders >= 0 ? `+ ${netChangeOrders.toLocaleString('ar-EG')}` : netChangeOrders.toLocaleString('ar-EG')} {currencySymbol}
                </td>
              </tr>
              <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>{t('contracting.print_ipc_certificate_modal.s21', "3. القيمة التعاقدية المعدلة حتى تاريخه (Contract Sum to Date)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#170e5e' }}>{revisedContract.toLocaleString('ar-EG')} {currencySymbol}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>{t('contracting.print_ipc_certificate_modal.s22', "4. إجمالي الأعمال السابقة المعتمدة (Work from Previous Certificates)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left' }}>{previousWork.toLocaleString('ar-EG')} {currencySymbol}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>{t('contracting.print_ipc_certificate_modal.s23', "5. إجمالي الأعمال المنفذة خلال الفترة الحالية (Work Completed This Period)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left' }}>{currentWork.toLocaleString('ar-EG')} {currencySymbol}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>{t('contracting.print_ipc_certificate_modal.s24', "6. تشوينات المواد والخامات بالموقع (Materials Stored on Site)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left' }}>{storedMaterials.toLocaleString('ar-EG')} {currencySymbol}</td>
              </tr>
              <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>{t('contracting.print_ipc_certificate_modal.s25', "7. إجمالي المنفذ والتشوينات التراكمي (Total Completed & Stored to Date)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800 }}>{cumulativeWork.toLocaleString('ar-EG')} {currencySymbol}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', color: '#dc2626' }}>{t('contracting.print_ipc_certificate_modal.s26', "8. خصم: استرداد نسبة الدفعة المقدمة (Advance Payment Recovery)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', color: '#dc2626' }}>- {advanceRecovery.toLocaleString('ar-EG')} {currencySymbol}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', color: '#dc2626' }}>{t('contracting.print_ipc_certificate_modal.s27', "9. خصم: تأمين ضمان الأعمال وحسن التنفيذ (Retainage Withheld)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', color: '#dc2626' }}>- {retentionHeld.toLocaleString('ar-EG')} {currencySymbol}</td>
              </tr>
              {otherDeductions > 0 && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 12px', color: '#dc2626' }}>{t('contracting.print_ipc_certificate_modal.s28', "10. خصم: استقطاعات وغرامات أخرى (Other Deductions)")}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'left', color: '#dc2626' }}>- {otherDeductions.toLocaleString('ar-EG')} {currencySymbol}</td>
                </tr>
              )}
              <tr style={{ borderTop: '2px solid #170e5e', borderBottom: '2px solid #170e5e', backgroundColor: '#eef2ff' }}>
                <td style={{ padding: '12px 12px', fontWeight: 800, fontSize: '13px', color: '#170e5e' }}>
                  {t('contracting.print_ipc_certificate_modal.s29', "صافي المبلغ المستحق للدفع حالياً (CURRENT PAYMENT DUE)")}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'left', fontWeight: 800, fontSize: '15px', color: '#170e5e' }}>
                  {netPayable.toLocaleString('ar-EG')} {currencySymbol}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: '#64748b' }}>{t('contracting.print_ipc_certificate_modal.s30', "11. الرصيد المتبقي لإنهاء المشروع شاملاً التأمين (Balance to Finish)")}</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>{balanceToFinish.toLocaleString('ar-EG')} {currencySymbol}</td>
              </tr>
            </tbody>
          </table>

          {/* Detailed Items Table (AIA G703 Summary) */}
          {invoice.items && invoice.items.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 8px 0', color: '#475569' }}>{t('contracting.print_ipc_certificate_modal.s31', "جدول حصر بنود الأعمال وتوزيع الكميات (G703 Continuation Sheet)")}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'right' }}>
                    <th style={{ padding: '6px 8px' }}>{t('contracting.print_ipc_certificate_modal.s32', "م")}</th>
                    <th style={{ padding: '6px 8px' }}>{t('contracting.print_ipc_certificate_modal.s33', "بيان الأعمال")}</th>
                    <th style={{ padding: '6px 8px' }}>{t('contracting.print_ipc_certificate_modal.s34', "الوحدة")}</th>
                    <th style={{ padding: '6px 8px' }}>{t('contracting.print_ipc_certificate_modal.s35', "سعر الفئة")}</th>
                    <th style={{ padding: '6px 8px' }}>{t('contracting.print_ipc_certificate_modal.s36', "كمية سابقة")}</th>
                    <th style={{ padding: '6px 8px' }}>{t('contracting.print_ipc_certificate_modal.s37', "كمية حالية")}</th>
                    <th style={{ padding: '6px 8px' }}>{t('contracting.print_ipc_certificate_modal.s38', "تشوينات")}</th>
                    <th style={{ padding: '6px 8px' }}>{t('contracting.print_ipc_certificate_modal.s39', "كمية إجمالية")}</th>
                    <th style={{ padding: '6px 8px' }}>{t('contracting.print_ipc_certificate_modal.s40', "إجمالي القيمة")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                      {(() => {
                        const dir = getTextDirection(it.description);
                        const isRtl = dir === 'rtl';
                        return (
                          <td
                            dir={dir}
                            style={{
                              padding: '6px 8px',
                              fontWeight: 600,
                              textAlign: isRtl ? 'right' : 'left',
                              direction: dir,
                            }}
                          >
                            {it.description}
                          </td>
                        );
                      })()}
                      <td style={{ padding: '6px 8px' }}>{it.unit}</td>
                      <td style={{ padding: '6px 8px' }}>{Number(it.unitPrice).toLocaleString('ar-EG')}</td>
                      <td style={{ padding: '6px 8px' }}>{Number(it.previousQty).toLocaleString('ar-EG')}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{Number(it.currentQty).toLocaleString('ar-EG')}</td>
                      <td style={{ padding: '6px 8px' }}>{Number(it.storedMaterialsQty || 0).toLocaleString('ar-EG')}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{Number(it.cumulativeQty).toLocaleString('ar-EG')}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#170e5e' }}>{Number(it.cumulativeTotal).toLocaleString('ar-EG')} {currencySymbol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Formal Signatures and Stamp Block */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '30px', paddingTop: '16px', borderTop: '1px solid #cbd5e1', textAlign: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>{t('contracting.print_ipc_certificate_modal.s41', "إعداد مهندس الموقع / المقاول")}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{t('contracting.print_ipc_certificate_modal.s42', "أقر بأن الأعمال المدرجة نُفذت طبقاً للمواصفات")}</div>
              <div style={{ height: '50px', borderBottom: '1px dashed #cbd5e1', margin: '8px 20px' }}></div>
              <div style={{ fontSize: '11px' }}>{t('contracting.print_ipc_certificate_modal.s43', "التوقيع: ...................................")}</div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>{t('contracting.print_ipc_certificate_modal.s44', "اعتماد المهندس الاستشاري")}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{t('contracting.print_ipc_certificate_modal.s45', "تمت المراجعة والمعاينة الميدانية ومطابقة الحصر")}</div>
              <div style={{ height: '50px', borderBottom: '1px dashed #cbd5e1', margin: '8px 20px' }}></div>
              <div style={{ fontSize: '11px' }}>{t('contracting.print_ipc_certificate_modal.s46', "الختم والاعتماد: .............................")}</div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>{t('contracting.print_ipc_certificate_modal.s47', "موافقة واعتماد المالك")}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{t('contracting.print_ipc_certificate_modal.s48', "الموافقة على الصرف وقيد الاستحقاق المالي")}</div>
              <div style={{ height: '50px', borderBottom: '1px dashed #cbd5e1', margin: '8px 20px' }}></div>
              <div style={{ fontSize: '11px' }}>{t('contracting.print_ipc_certificate_modal.s49', "توقيع الإدارة: ................................")}</div>
            </div>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
