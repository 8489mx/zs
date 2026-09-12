import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import { ContractingBoqItem, ContractingProject } from '../contracting.types';
import { getTextDirection } from '@/lib/arabic-normalization';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface CreateIpcInvoiceModalProps {
  open: boolean;
  project: ContractingProject;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

interface WorkingItem {
  boqItemId?: string;
  itemCode: string;
  description: string;
  unit: string;
  unitPrice: number;
  contractQty: number;
  previousQty: number;
  currentQty: number;
  storedMaterialsQty: number;
}

export function CreateIpcInvoiceModal({ open, project, onClose, onCreated }: CreateIpcInvoiceModalProps) {
  const { currencySymbol } = useSystemCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<WorkingItem[]>([]);

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [advRecoveryPercent, setAdvRecoveryPercent] = useState('10');
  const [retentionPercent, setRetentionPercent] = useState(String(project.retentionPercent || 5));
  const [otherDeductions, setOtherDeductions] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      contractingApi.getBoqItems(project.id).then((boqs: ContractingBoqItem[]) => {
        const working = boqs.map((b: ContractingBoqItem) => ({
          boqItemId: b.id,
          itemCode: b.itemCode,
          description: b.description,
          unit: b.unit,
          unitPrice: Number(b.unitPrice),
          contractQty: Number(b.contractQty),
          previousQty: Number(b.executedQty || 0),
          currentQty: 0,
          storedMaterialsQty: 0,
        }));
        setItems(working);
      }).catch(() => {});
    }
  }, [open, project.id]);

  const handleQtyChange = (index: number, field: 'currentQty' | 'storedMaterialsQty', val: string) => {
    const num = Math.max(0, Number(val || 0));
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: num };
      return copy;
    });
  };

  // Totals calculations
  let currentWorkTotal = 0;
  let storedMaterialsTotal = 0;
  let previousWorkTotal = 0;

  items.forEach((it) => {
    currentWorkTotal += it.currentQty * it.unitPrice;
    storedMaterialsTotal += it.storedMaterialsQty * it.unitPrice;
    previousWorkTotal += it.previousQty * it.unitPrice;
  });

  const periodGrossTotal = currentWorkTotal + storedMaterialsTotal;

  const advDeduction = (periodGrossTotal * Number(advRecoveryPercent || 0)) / 100;
  const retDeduction = (periodGrossTotal * Number(retentionPercent || 0)) / 100;
  const otherDed = Number(otherDeductions || 0);
  const netPayable = Math.max(0, periodGrossTotal - advDeduction - retDeduction - otherDed);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (periodGrossTotal <= 0) {
      setErrorMsg('يرجى إدخال كميات منفذة أو تشوينات في البنود لإصدار المستخلص');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createInvoice(project.id, {
        ipcType: 'client',
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        advanceRecoveryPercent: Number(advRecoveryPercent || 0),
        retentionPercent: Number(retentionPercent || 5),
        otherDeductions: otherDed,
        notes: notes.trim() || undefined,
        items: items
          .filter((it) => it.currentQty > 0 || it.storedMaterialsQty > 0 || it.previousQty > 0)
          .map((it) => ({
            boqItemId: it.boqItemId,
            description: it.description,
            unit: it.unit,
            unitPrice: it.unitPrice,
            previousQty: it.previousQty,
            currentQty: it.currentQty,
            storedMaterialsQty: it.storedMaterialsQty,
          })),
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء إنشاء المستخلص');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`إعداد مستخلص جاري للأعمال (AIA G702/G703) - ${project.name}`}
      subtitle="حصر الكميات الحالية، احتساب تشوينات المواد بالموقع، وخصم الدفعة المقدمة وضمان حسن التنفيذ"
      width="min(1020px, 96vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText={isSubmitting ? 'جاري الحفظ...' : 'حفظ المستخلص ومراجعة البنود'}
          isSubmitting={isSubmitting}
        />
      )}
    >
      <style>{`
        .ipc-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .ipc-compact-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .ipc-compact-modal input {
          height: 33px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
          padding: 0 10px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          outline: none !important;
          width: 100% !important;
          transition: border-color 0.15s, box-shadow 0.15s !important;
        }
        .ipc-compact-modal input:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 2px rgba(23, 14, 94, 0.1) !important;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="ipc-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '9px' }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* 1. فترة المستخلص ونسب الاستقطاع */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calendar size={15} />
            <span>1. فترة المستخلص ونسب الاستقطاع التعاقدي (Billing Period & Retentions)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'start' }}>
            <Field label="عن الفترة من">
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </Field>

            <Field label="إلى تاريخ">
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </Field>

            <Field label="استقطاع الدفعة المقدمة %">
              <input
                type="number"
                min="0"
                max="50"
                dir="ltr"
                value={advRecoveryPercent}
                onChange={(e) => setAdvRecoveryPercent(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </Field>

            <Field label="استقطاع ضمان أعمال %">
              <input
                type="number"
                min="0"
                max="20"
                dir="ltr"
                value={retentionPercent}
                onChange={(e) => setRetentionPercent(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </Field>
          </div>
        </div>

        {/* 2. جدول حصر كميات الإنجاز والتشوينات */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.FileText size={15} />
            <span>2. حصر كميات الإنجاز والتشوينات بالموقع (Schedule of Values - SOV)</span>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto', background: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#334155' }}>
                  <th style={{ padding: '8px 10px', width: '75px' }}>كود</th>
                  <th style={{ padding: '8px 10px', minWidth: '170px' }}>بند المقايسة</th>
                  <th style={{ padding: '8px 6px', width: '55px' }}>الوحدة</th>
                  <th style={{ padding: '8px 6px', width: '70px' }}>الفئة</th>
                  <th style={{ padding: '8px 6px', width: '65px' }}>التعاقدي</th>
                  <th style={{ padding: '8px 6px', width: '65px' }}>السابق</th>
                  <th style={{ padding: '8px 6px', width: '85px' }}>الحالي *</th>
                  <th style={{ padding: '8px 6px', width: '85px' }}>تشوينات</th>
                  <th style={{ padding: '8px 10px', width: '110px' }}>إجمالي الفترة</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const itemPeriodSum = (it.currentQty + it.storedMaterialsQty) * it.unitPrice;
                  return (
                    <tr key={it.boqItemId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 700, fontFamily: 'monospace', color: '#170e5e' }}>{it.itemCode}</td>
                      {(() => {
                        const dir = getTextDirection(it.description);
                        const isRtl = dir === 'rtl';
                        return (
                          <td
                            dir={dir}
                            style={{
                              padding: '6px 10px',
                              textAlign: isRtl ? 'right' : 'left',
                              direction: dir,
                              fontSize: '0.78rem',
                            }}
                          >
                            {it.description}
                          </td>
                        );
                      })()}
                      <td style={{ padding: '6px 6px', color: '#64748b' }}>{it.unit}</td>
                      <td style={{ padding: '6px 6px', fontFamily: 'monospace' }}>{it.unitPrice.toLocaleString('ar-EG')}</td>
                      <td style={{ padding: '6px 6px', color: '#64748b' }}>{it.contractQty}</td>
                      <td style={{ padding: '6px 6px', color: '#64748b' }}>{it.previousQty}</td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          dir="ltr"
                          value={it.currentQty || ''}
                          onChange={(e) => handleQtyChange(idx, 'currentQty', e.target.value)}
                          placeholder="0"
                          style={{ height: '28px !important', padding: '0 6px !important', textAlign: 'center', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          dir="ltr"
                          value={it.storedMaterialsQty || ''}
                          onChange={(e) => handleQtyChange(idx, 'storedMaterialsQty', e.target.value)}
                          placeholder="0"
                          style={{ height: '28px !important', padding: '0 6px !important', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: itemPeriodSum > 0 ? '#170e5e' : '#94a3b8' }}>
                        {itemPeriodSum.toLocaleString('ar-EG')} {currencySymbol}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. التسوية المالية وصافي المستحق */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calculator size={15} />
            <span>3. التسوية المالية وصافي المستحق للصرف (Financial Settlement)</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '8px 12px',
              textAlign: 'center',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>إجمالي أعمال الفترة:</span>
              <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>{periodGrossTotal.toLocaleString('ar-EG')} {currencySymbol}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>استقطاع دفعة مقدمة:</span>
              <span style={{ fontSize: '0.84rem', color: '#dc2626', fontWeight: 700 }}>- {advDeduction.toLocaleString('ar-EG')} {currencySymbol}</span>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>ضمان حسن تنفيذ:</span>
              <span style={{ fontSize: '0.84rem', color: '#dc2626', fontWeight: 700 }}>- {retDeduction.toLocaleString('ar-EG')} {currencySymbol}</span>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>استقطاعات أخرى:</span>
              <input
                type="number"
                min="0"
                dir="ltr"
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(e.target.value)}
                style={{ height: '26px !important', width: '80px', padding: '0 4px !important', textAlign: 'center', margin: '0 auto', display: 'block' }}
              />
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.72rem', color: '#170e5e', display: 'block', fontWeight: 700 }}>صافي المستحق للصرف:</span>
              <strong style={{ fontSize: '1rem', color: '#170e5e', fontWeight: 800 }}>{netPayable.toLocaleString('ar-EG')} {currencySymbol}</strong>
            </div>
          </div>
        </div>

        {/* 4. الاعتمادات والملاحظات */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Tag size={14} />
            <span>4. الاعتمادات والملاحظات الاستشارية (Consultant Notes & Approvals)</span>
          </div>

          <Field label="ملاحظات واستدراكات المستخلص (اختياري)">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات مهندس الموقع أو الاستشاري على قياسات الأعمال المنجزة..."
            />
          </Field>
        </div>
      </form>
    </StandardDialog>
  );
}
