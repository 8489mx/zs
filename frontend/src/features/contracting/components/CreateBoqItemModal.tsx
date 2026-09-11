import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import { ContractingBoqItem } from '../contracting.types';

interface CreateBoqItemModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onCreated: () => void;
  initialItem?: ContractingBoqItem | null;
}

export function CreateBoqItemModal({ open, projectId, projectName, onClose, onCreated, initialItem }: CreateBoqItemModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    itemCode: initialItem?.itemCode || '',
    description: initialItem?.description || '',
    category: initialItem?.category || 'concrete',
    unit: initialItem?.unit || 'm3',
    contractQty: initialItem ? String(initialItem.contractQty) : '',
    unitPrice: initialItem ? String(initialItem.unitPrice) : '',
    estimatedUnitCost: initialItem ? String(initialItem.estimatedUnitCost) : '',
    notes: initialItem?.notes || '',
  });

  const qty = Number(formData.contractQty || 0);
  const price = Number(formData.unitPrice || 0);
  const cost = Number(formData.estimatedUnitCost || 0);
  const totalContract = qty * price;
  const totalCost = qty * cost;
  const marginPercent = totalContract > 0 ? Math.round(((totalContract - totalCost) / totalContract) * 100) : 0;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.itemCode.trim() || !formData.description.trim()) {
      setErrorMsg('كود ووصف بند المقايسة مطلوبان');
      return;
    }
    if (qty <= 0 || price <= 0) {
      setErrorMsg('يرجى تحديد كمية وسعر فئة صالحين');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (initialItem) {
        await contractingApi.updateBoqItem(initialItem.id, {
          description: formData.description.trim(),
          category: formData.category,
          unit: formData.unit,
          contractQty: qty,
          unitPrice: price,
          estimatedUnitCost: cost,
          notes: formData.notes.trim() || undefined,
        });
      } else {
        await contractingApi.createBoqItem(projectId, {
          itemCode: formData.itemCode.trim(),
          description: formData.description.trim(),
          category: formData.category,
          unit: formData.unit,
          contractQty: qty,
          unitPrice: price,
          estimatedUnitCost: cost,
          notes: formData.notes.trim() || undefined,
        });
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ البند');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={initialItem ? 'تعديل بند في المقايسة التثمينية' : 'إضافة بند جديد لجدول الكميات والمقايسة (BOQ)'}
      subtitle={projectName ? `المشروع: ${projectName}` : 'تحديد مواصفات البند والكميات التعاقدية وسعر الفئة والتكلفة التقديرية'}
      width="min(720px, 95vw)"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="كود البند *" hint="مثال: 1.01 أو C-01">
            <input
              type="text"
              required
              disabled={Boolean(initialItem)}
              value={formData.itemCode}
              onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
              placeholder="1.01"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>

          <Field label="تصنيف الأعمال">
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="earthworks">أعمال الحفر والردم والأساسات</option>
              <option value="concrete">خرسانات عادية ومسلحة</option>
              <option value="masonry">أعمال المباني والطوب</option>
              <option value="finishes">أعمال التشطيبات والديكور</option>
              <option value="mep">أعمال الكهروميكانيك والصحي</option>
              <option value="other">أعمال أخرى وموقع عام</option>
            </select>
          </Field>
        </div>

        <Field label="وصف البند والمواصفة الفنية *" hint="النص التعاقدي للبند في كراسة الشروط">
          <textarea
            rows={3}
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="مثال: بالمتر المكعب - توريد وصب خرسانة مسلحة للأسقف والكمرات مع الحديد والاختبارات المعتمدة..."
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <Field label="وحدة القياس">
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="m3">متر مكعب (م³)</option>
              <option value="m2">متر مربع (م²)</option>
              <option value="m">متر طولي (م.ط)</option>
              <option value="ton">طن (Ton)</option>
              <option value="item">عدد / بالقطعة</option>
              <option value="lump_sum">مقطوعية (Lump Sum)</option>
            </select>
          </Field>

          <Field label="الكمية التعاقدية *">
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={formData.contractQty}
              onChange={(e) => setFormData({ ...formData, contractQty: e.target.value })}
              placeholder="0.00"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>

          <Field label="سعر الفئة للعميل (ج.م) *">
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              placeholder="0.00"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="التكلفة التقديرية للوحدة (خامات + مصنعية)" hint="Direct Unit Cost Target">
            <input
              type="number"
              step="any"
              min="0"
              value={formData.estimatedUnitCost}
              onChange={(e) => setFormData({ ...formData, estimatedUnitCost: e.target.value })}
              placeholder="0.00"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>إجمالي قيمة البند التعاقدية:</span>
            <strong style={{ fontSize: '1rem', color: '#170e5e' }}>{totalContract.toLocaleString('ar-EG')} ج.م</strong>
            {totalCost > 0 && (
              <span style={{ fontSize: 'var(--font-micro)', color: '#059669', marginTop: '2px' }}>
                هامش الربح التقديري: {marginPercent}% ({(totalContract - totalCost).toLocaleString('ar-EG')} ج.م)
              </span>
            )}
          </div>
        </div>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText={isSubmitting ? 'جاري الحفظ...' : initialItem ? 'حفظ التعديلات' : 'إضافة البند للمقايسة'}
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
