import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import { ContractingBoqItem, ContractingProject } from '../contracting.types';
import { getTextDirection } from '@/lib/arabic-normalization';

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
      width="min(950px, 95vw)"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
          <Field label="عن الفترة من">
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>
          <Field label="إلى تاريخ">
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>
          <Field label="استقطاع الدفعة المقدمة %">
            <input
              type="number"
              min="0"
              max="50"
              value={advRecoveryPercent}
              onChange={(e) => setAdvRecoveryPercent(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>
          <Field label="استقطاع ضمان أعمال %">
            <input
              type="number"
              min="0"
              max="20"
              value={retentionPercent}
              onChange={(e) => setRetentionPercent(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>
        </div>

        {/* Schedule of Values Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '340px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-table-head)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                <th style={{ padding: '10px 12px' }}>كود</th>
                <th style={{ padding: '10px 12px', minWidth: '180px' }}>بند المقايسة</th>
                <th style={{ padding: '10px 8px' }}>الوحدة</th>
                <th style={{ padding: '10px 8px' }}>الفئة</th>
                <th style={{ padding: '10px 8px' }}>التعاقدي</th>
                <th style={{ padding: '10px 8px' }}>السابق</th>
                <th style={{ padding: '10px 8px', minWidth: '90px' }}>الحالي *</th>
                <th style={{ padding: '10px 8px', minWidth: '90px' }}>تشوينات بالموقع</th>
                <th style={{ padding: '10px 12px' }}>إجمالي الفترة</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const itemPeriodSum = (it.currentQty + it.storedMaterialsQty) * it.unitPrice;
                return (
                  <tr key={it.boqItemId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.itemCode}</td>
                    {(() => {
                      const dir = getTextDirection(it.description);
                      const isRtl = dir === 'rtl';
                      return (
                        <td
                          dir={dir}
                          style={{
                            padding: '8px 12px',
                            textAlign: isRtl ? 'right' : 'left',
                            direction: dir,
                          }}
                        >
                          {it.description}
                        </td>
                      );
                    })()}
                    <td style={{ padding: '8px 8px', color: '#64748b' }}>{it.unit}</td>
                    <td style={{ padding: '8px 8px' }}>{it.unitPrice.toLocaleString('ar-EG')}</td>
                    <td style={{ padding: '8px 8px', color: '#64748b' }}>{it.contractQty}</td>
                    <td style={{ padding: '8px 8px', color: '#64748b' }}>{it.previousQty}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={it.currentQty || ''}
                        onChange={(e) => handleQtyChange(idx, 'currentQty', e.target.value)}
                        placeholder="0"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={it.storedMaterialsQty || ''}
                        onChange={(e) => handleQtyChange(idx, 'storedMaterialsQty', e.target.value)}
                        placeholder="0"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: itemPeriodSum > 0 ? '#170e5e' : '#94a3b8' }}>
                      {itemPeriodSum.toLocaleString('ar-EG')} ج.م
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Box */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            textAlign: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', display: 'block' }}>إجمالي أعمال الفترة:</span>
            <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{periodGrossTotal.toLocaleString('ar-EG')} ج.م</strong>
          </div>
          <div>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', display: 'block' }}>استقطاع دفعة مقدمة:</span>
            <span style={{ fontSize: '0.95rem', color: '#dc2626', fontWeight: 600 }}>- {advDeduction.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', display: 'block' }}>ضمان حسن تنفيذ:</span>
            <span style={{ fontSize: '0.95rem', color: '#dc2626', fontWeight: 600 }}>- {retDeduction.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', display: 'block' }}>استقطاعات أخرى:</span>
            <input
              type="number"
              min="0"
              value={otherDeductions}
              onChange={(e) => setOtherDeductions(e.target.value)}
              style={{ width: '80px', padding: '4px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#170e5e', display: 'block', fontWeight: 700 }}>صافي المستحق للصرف:</span>
            <strong style={{ fontSize: '1.1rem', color: '#170e5e' }}>{netPayable.toLocaleString('ar-EG')} ج.م</strong>
          </div>
        </div>

        <Field label="ملاحظات واستدراكات المستخلص">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات مهندس الموقع أو الاستشاري على قياسات الأعمال..."
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText={isSubmitting ? 'جاري الحفظ...' : 'حفظ المستخلص ومراجعة البنود'}
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
