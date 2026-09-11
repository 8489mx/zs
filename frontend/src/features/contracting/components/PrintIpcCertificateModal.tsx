import { useRef } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { ContractingInvoice, ContractingProject } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { getTextDirection } from '@/lib/arabic-normalization';

interface PrintIpcCertificateModalProps {
  open: boolean;
  invoice: ContractingInvoice | null;
  project?: ContractingProject | null;
  onClose: () => void;
}

export function PrintIpcCertificateModal({ open, invoice, project: propProject, onClose }: PrintIpcCertificateModalProps) {
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
      subtitle="نموذج الحصر والاعتماد الهندسي المعتمد (AIA G702 / G703 Application & Certificate for Payment)"
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
            طباعة شهادة المستخلص (A4)
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
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#170e5e' }}>شهادة استحقاق مستخلص أعمال جاري</h2>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>INTERIM PAYMENT CERTIFICATE & SUMMARY (AIA G702 STANDARD)</div>
              <div style={{ marginTop: '8px', fontWeight: 700, fontSize: '14px' }}>المشروع: {project?.name || '---'}</div>
              <div style={{ color: '#475569' }}>كود المشروع: {project?.code || '---'}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#170e5e' }}>رقم المستخلص: {invoice.ipcNumber}</div>
              <div>المستخلص رقم: {invoice.sequenceOrder}</div>
              <div>الفترة: {invoice.periodStart || '---'} إلى {invoice.periodEnd || '---'}</div>
              <div>تاريخ الإصدار: {new Date(invoice.createdAt).toLocaleDateString('ar-EG')}</div>
              <div style={{ marginTop: '4px' }}>
                الحالة: <strong style={{ color: invoice.status === 'approved' ? '#059669' : '#d97706' }}>
                  {invoice.status === 'approved' ? 'معتمد رسمياً' : 'مسودة قيد المراجعة'}
                </strong>
              </div>
              {invoice.journalEntryId && (
                <div style={{ marginTop: '2px', fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                  القيد الدفتري المرحل: #{invoice.journalEntryId}
                </div>
              )}
            </div>
          </div>

          {/* Stakeholders Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>المالك / جهة الإسناد:</span>
              <strong>{project?.clientName || '---'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>المقاول العام المنفذ:</span>
              <strong>شركة المقاولات العامة</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>المهندس الاستشاري المشرف:</span>
              <strong>المكتب الاستشاري الهندسي المعتمد</strong>
            </div>
          </div>

          {/* AIA G702 Financial Contract Summary Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>1. قيمة العقد الأصلي (Original Contract Sum)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>{originalContract.toLocaleString('ar-EG')} ج.م</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>2. صافي أوامر التغيير والملحقات المعتمدة (Net Change by Change Orders)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: netChangeOrders >= 0 ? '#059669' : '#dc2626' }}>
                  {netChangeOrders >= 0 ? `+ ${netChangeOrders.toLocaleString('ar-EG')}` : netChangeOrders.toLocaleString('ar-EG')} ج.م
                </td>
              </tr>
              <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>3. القيمة التعاقدية المعدلة حتى تاريخه (Contract Sum to Date)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#170e5e' }}>{revisedContract.toLocaleString('ar-EG')} ج.م</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>4. إجمالي الأعمال السابقة المعتمدة (Work from Previous Certificates)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left' }}>{previousWork.toLocaleString('ar-EG')} ج.م</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>5. إجمالي الأعمال المنفذة خلال الفترة الحالية (Work Completed This Period)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left' }}>{currentWork.toLocaleString('ar-EG')} ج.م</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>6. تشوينات المواد والخامات بالموقع (Materials Stored on Site)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left' }}>{storedMaterials.toLocaleString('ar-EG')} ج.م</td>
              </tr>
              <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>7. إجمالي المنفذ والتشوينات التراكمي (Total Completed & Stored to Date)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800 }}>{cumulativeWork.toLocaleString('ar-EG')} ج.م</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>
                <td style={{ padding: '8px 12px' }}>8. خصم: استرداد نسبة الدفعة المقدمة (Advance Payment Recovery)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left' }}>- {advanceRecovery.toLocaleString('ar-EG')} ج.م</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>
                <td style={{ padding: '8px 12px' }}>9. خصم: تأمين ضمان الأعمال وحسن التنفيذ (Retainage Withheld)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left' }}>- {retentionHeld.toLocaleString('ar-EG')} ج.م</td>
              </tr>
              {otherDeductions > 0 && (
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>
                  <td style={{ padding: '8px 12px' }}>10. خصم: استقطاعات وغرامات أخرى (Other Deductions)</td>
                  <td style={{ padding: '8px 12px', textAlign: 'left' }}>- {otherDeductions.toLocaleString('ar-EG')} ج.م</td>
                </tr>
              )}
              <tr style={{ borderTop: '2px solid #170e5e', borderBottom: '2px solid #170e5e', backgroundColor: '#eef2ff' }}>
                <td style={{ padding: '12px 12px', fontWeight: 800, fontSize: '13px', color: '#170e5e' }}>
                  صافي المبلغ المستحق للدفع حالياً (CURRENT PAYMENT DUE)
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'left', fontWeight: 800, fontSize: '15px', color: '#170e5e' }}>
                  {netPayable.toLocaleString('ar-EG')} ج.م
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: '#64748b' }}>11. الرصيد المتبقي لإنهاء المشروع شاملاً التأمين (Balance to Finish)</td>
                <td style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>{balanceToFinish.toLocaleString('ar-EG')} ج.م</td>
              </tr>
            </tbody>
          </table>

          {/* Detailed Items Table (AIA G703 Summary) */}
          {invoice.items && invoice.items.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 8px 0', color: '#475569' }}>جدول حصر بنود الأعمال وتوزيع الكميات (G703 Continuation Sheet)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'right' }}>
                    <th style={{ padding: '6px 8px' }}>م</th>
                    <th style={{ padding: '6px 8px' }}>بيان الأعمال</th>
                    <th style={{ padding: '6px 8px' }}>الوحدة</th>
                    <th style={{ padding: '6px 8px' }}>سعر الفئة</th>
                    <th style={{ padding: '6px 8px' }}>كمية سابقة</th>
                    <th style={{ padding: '6px 8px' }}>كمية حالية</th>
                    <th style={{ padding: '6px 8px' }}>تشوينات</th>
                    <th style={{ padding: '6px 8px' }}>كمية إجمالية</th>
                    <th style={{ padding: '6px 8px' }}>إجمالي القيمة</th>
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
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#170e5e' }}>{Number(it.cumulativeTotal).toLocaleString('ar-EG')} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Formal Signatures and Stamp Block */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '30px', paddingTop: '16px', borderTop: '1px solid #cbd5e1', textAlign: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>إعداد مهندس الموقع / المقاول</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>أقر بأن الأعمال المدرجة نُفذت طبقاً للمواصفات</div>
              <div style={{ height: '50px', borderBottom: '1px dashed #cbd5e1', margin: '8px 20px' }}></div>
              <div style={{ fontSize: '11px' }}>التوقيع: ...................................</div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>اعتماد المهندس الاستشاري</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>تمت المراجعة والمعاينة الميدانية ومطابقة الحصر</div>
              <div style={{ height: '50px', borderBottom: '1px dashed #cbd5e1', margin: '8px 20px' }}></div>
              <div style={{ fontSize: '11px' }}>الختم والاعتماد: .............................</div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>موافقة واعتماد المالك</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>الموافقة على الصرف وقيد الاستحقاق المالي</div>
              <div style={{ height: '50px', borderBottom: '1px dashed #cbd5e1', margin: '8px 20px' }}></div>
              <div style={{ fontSize: '11px' }}>توقيع الإدارة: ................................</div>
            </div>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
