import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import type { ContractingBoqItem } from '../contracting.types';

interface CreateMaterialRequisitionModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  boqItems?: ContractingBoqItem[];
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

export function CreateMaterialRequisitionModal({
  open,
  projectId,
  projectName,
  boqItems = [],
  onClose,
  onCreated,
}: CreateMaterialRequisitionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    requisitionNumber: '',
    boqItemId: '',
    itemName: '',
    unit: 'طن',
    quantity: '',
    unitCost: '',
    issueDate: new Date().toISOString().split('T')[0],
    recipientName: '',
    notes: '',
  });

  const qty = Number(formData.quantity || 0);
  const unitCost = Number(formData.unitCost || 0);
  const totalCost = qty * unitCost;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.itemName.trim()) {
      setErrorMsg('يرجى كتابة اسم وتوصيف المادة أو الخامة المصروفة');
      return;
    }
    if (qty <= 0 || unitCost < 0) {
      setErrorMsg('يرجى إدخال كمية وسعر تكلفة صحيحين');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createMaterialRequisition(projectId, {
        requisitionNumber: formData.requisitionNumber.trim() || undefined,
        boqItemId: formData.boqItemId || undefined,
        itemName: formData.itemName.trim(),
        unit: formData.unit,
        quantity: qty,
        unitCost: unitCost,
        issueDate: formData.issueDate,
        recipientName: formData.recipientName.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تسجيل إذن صرف المواد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إذن صرف وتخصيص مواد وخامات للموقع (Material Requisition)"
      subtitle={projectName ? `المشروع: ${projectName}` : 'صرف خامات للمشروع وتحميل قيمتها مباشرة على بنود المقايسة ومراكز التكلفة'}
      width="min(720px, 95vw)"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: 'var(--font-body)',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* رقم الإذن وتاريخ الصرف والربط ببند المقايسة */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.8fr', gap: '14px' }}>
          <Field label="رقم إذن الصرف">
            <input
              type="text"
              value={formData.requisitionNumber}
              onChange={(e) => setFormData({ ...formData, requisitionNumber: e.target.value })}
              placeholder="تلقائي: MR-2026-0001"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>

          <Field label="تاريخ الصرف *">
            <input
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <Field label="تحميل على بند المقايسة (BOQ)">
            <select
              value={formData.boqItemId}
              onChange={(e) => setFormData({ ...formData, boqItemId: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            >
              <option value="">-- تحميل عام على مركز تكلفة المشروع --</option>
              {boqItems.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.itemCode} - {b.description.substring(0, 32)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* اسم المادة والوحدة */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '14px' }}>
          <Field label="بيان واسم المادة / الخامة *">
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              placeholder="مثال: حديد تسليح مشرشر 16 مم - عز الدخيلة"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <Field label="الوحدة">
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            >
              <option value="طن">طن (Ton)</option>
              <option value="م3">متر مكعب (م³)</option>
              <option value="م2">متر مربع (م²)</option>
              <option value="م.ط">متر طولي (م.ط)</option>
              <option value="شكارة">شكارة / كيس</option>
              <option value="قطعة">قطعة / عدد</option>
              <option value="لتر">لتر / جالون</option>
            </select>
          </Field>
        </div>

        {/* الكمية وسعر التكلفة وإجمالي القيمة */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '14px', alignItems: 'center' }}>
          <Field label="الكمية المصروفة *">
            <input
              type="number"
              step="any"
              min="0.001"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="0.00"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <Field label="تكلفة الوحدة (ج.م) *">
            <input
              type="number"
              step="any"
              min="0"
              value={formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
              placeholder="0.00"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <div style={{ background: '#f8fafc', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>إجمالي تكلفة الصرف الفعلية:</span>
            <strong style={{ fontSize: '1.1rem', color: '#170e5e' }}>
              {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </strong>
          </div>
        </div>

        {/* المستلم والملاحظات */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '14px' }}>
          <Field label="المستلم بالموقع (المشرف / الفورمان)">
            <input
              type="text"
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              placeholder="مثال: م. مصطفى كامل (مهندس التنفيذ)"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>

          <Field label="ملاحظات ورقم إذن المخزن الورقي">
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="مثال: تم الصرف من مستودع العاشر، إذن تسليم رقم W-449"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>
        </div>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText="توثيق إذن صرف المواد"
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
