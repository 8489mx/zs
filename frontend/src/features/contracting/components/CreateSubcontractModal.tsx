import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import { suppliersApi } from '@/shared/api/suppliers.api';
import type { Supplier } from '@/types/domain';

interface CreateSubcontractModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

export function CreateSubcontractModal({
  open,
  projectId,
  projectName,
  onClose,
  onCreated,
}: CreateSubcontractModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  const [formData, setFormData] = useState({
    subcontractorId: '',
    contractNumber: '',
    scopeOfWork: '',
    totalAmount: '',
    retentionPercent: '5',
    startDate: '',
    endDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    setIsLoadingSuppliers(true);
    suppliersApi.list()
      .then((data) => {
        setSuppliers(data || []);
      })
      .catch(() => {
        setSuppliers([]);
      })
      .finally(() => {
        setIsLoadingSuppliers(false);
      });
  }, [open]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.subcontractorId) {
      setErrorMsg('يرجى اختيار مقاول الباطن');
      return;
    }
    if (!formData.contractNumber.trim()) {
      setErrorMsg('يرجى إدخال رقم أمر الإسناد / عقد مقاول الباطن');
      return;
    }
    if (!formData.scopeOfWork.trim()) {
      setErrorMsg('يرجى إدخال نطاق وتوصيف الأعمال المسندة');
      return;
    }
    const val = Number(formData.totalAmount || 0);
    if (val <= 0) {
      setErrorMsg('يرجى إدخال قيمة تعاقدية صحيحة');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createSubcontract(projectId, {
        subcontractorId: Number(formData.subcontractorId),
        contractNumber: formData.contractNumber.trim(),
        scopeOfWork: formData.scopeOfWork.trim(),
        totalAmount: val,
        retentionPercent: Number(formData.retentionPercent || 5),
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        notes: formData.notes.trim() || undefined,
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ عقد مقاول الباطن');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إسناد أعمال لمقاول باطن (Subcontract Commitment)"
      subtitle={projectName ? `المشروع: ${projectName}` : 'تسجيل أمر تكليف وعقد مقاولة باطن جديد'}
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

        {/* مقاول الباطن ورقم العقد */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="مقاول الباطن (جهة التنفيذ) *">
            <select
              value={formData.subcontractorId}
              onChange={(e) => setFormData({ ...formData, subcontractorId: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              disabled={isLoadingSuppliers}
              required
            >
              <option value="">-- اختر مقاول الباطن من سجل الموردين --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="رقم أمر التكليف / العقد *">
            <input
              type="text"
              value={formData.contractNumber}
              onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
              placeholder="مثال: SUB-2026-001"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>
        </div>

        {/* نطاق الأعمال */}
        <Field label="نطاق وتوصيف الأعمال المسندة (Scope of Work) *">
          <textarea
            value={formData.scopeOfWork}
            onChange={(e) => setFormData({ ...formData, scopeOfWork: e.target.value })}
            placeholder="مثال: توريد وتركيب مجاري الهواء والتكييف المركزي للدور الأرضي والأول شامل مخارج الهواء والاختبارات..."
            className="form-input"
            rows={2}
            style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', resize: 'vertical' }}
            required
          />
        </Field>

        {/* القيمة التعاقدية ونسبة ضمان حسن التنفيذ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="إجمالي القيمة التعاقدية (شامل الضريبة) *">
            <input
              type="number"
              min="0"
              step="any"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              placeholder="0.00"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <Field label="نسبة استقطاع ضمان حسن التنفيذ (%)" hint="تُحجز تلقائياً من مستخلصات مقاول الباطن">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={formData.retentionPercent}
              onChange={(e) => setFormData({ ...formData, retentionPercent: e.target.value })}
              placeholder="5"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>
        </div>

        {/* التواريخ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="تاريخ البدء المخطط">
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>

          <Field label="تاريخ التسليم والنهو">
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>
        </div>

        {/* ملاحظات وشروط إضافية */}
        <Field label="ملاحظات وشروط خاصة بالعقد">
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="شروط الدفعات، غرامات التأخير، متطلبات السلامة في الموقع..."
            className="form-input"
            rows={2}
            style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', resize: 'vertical' }}
          />
        </Field>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText="إصدار وتوثيق عقد المقاولة"
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
