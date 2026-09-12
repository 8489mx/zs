import { useState, useEffect, useMemo } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { contractingApi } from '../api/contracting.api';
import { suppliersApi } from '@/shared/api/suppliers.api';
import type { Supplier } from '@/types/domain';
import { AppIcons } from '@/shared/components/icons/AppIcons';

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

  const subcontractorOptions = useMemo(() => {
    return suppliers.map((s) => ({
      value: String(s.id),
      label: s.name + (s.phone ? ` (${s.phone})` : ''),
      hint: (s as any).taxNumber ? `ضريبي: ${(s as any).taxNumber}` : undefined,
    }));
  }, [suppliers]);

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
      width="min(920px, 95vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText="إصدار وتوثيق عقد المقاولة"
          isSubmitting={isSubmitting}
        />
      )}
    >
      <style>{`
        .subcontract-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .subcontract-compact-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .subcontract-compact-modal input,
        .subcontract-compact-modal textarea {
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
        .subcontract-compact-modal input:focus,
        .subcontract-compact-modal textarea:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 2px rgba(23, 14, 94, 0.1) !important;
        }
        .subcontract-compact-modal .custom-select-trigger {
          min-height: 33px !important;
          height: 33px !important;
          font-size: 0.8125rem !important;
          padding: 0 10px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="subcontract-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '9px' }} dir="rtl">
        {errorMsg && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* 1. بيانات مقاول الباطن والتعاقد */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Users size={15} />
            <span>1. بيانات مقاول الباطن وأمر الإسناد (Subcontractor & Commitment)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', alignItems: 'start' }}>
            <Field label="مقاول الباطن (جهة التنفيذ) *">
              <CustomSelect
                value={formData.subcontractorId}
                options={subcontractorOptions}
                onChange={(val) => setFormData({ ...formData, subcontractorId: val })}
                placeholder={isLoadingSuppliers ? 'جاري جلب سجل الموردين...' : '-- اختر مقاول الباطن --'}
              />
            </Field>

            <Field label="رقم أمر التكليف / العقد *">
              <input
                type="text"
                value={formData.contractNumber}
                onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                placeholder="مثال: SUB-2026-001"
                required
              />
            </Field>
          </div>
        </div>

        {/* 2. القيمة المالية ونسب الاستقطاع والمدد */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calculator size={15} />
            <span>2. القيمة المالية والضمان والمواعيد (Financials & Schedule)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '10px', alignItems: 'start' }}>
            <Field label="إجمالي القيمة التعاقدية *">
              <input
                type="number"
                min="0"
                step="any"
                dir="ltr"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="0.00"
                style={{
                  fontWeight: 800,
                  color: '#170e5e',
                  border: '2px solid #170e5e',
                }}
                required
              />
            </Field>

            <Field label="نسبة ضمان الأعمال %">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                dir="ltr"
                value={formData.retentionPercent}
                onChange={(e) => setFormData({ ...formData, retentionPercent: e.target.value })}
                placeholder="5"
                style={{ fontWeight: 700 }}
              />
            </Field>

            <Field label="تاريخ البدء المخطط">
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </Field>

            <Field label="تاريخ التسليم والنهو">
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </Field>
          </div>
        </div>

        {/* 3. نطاق وتوصيف الأعمال والشروط */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.FileText size={15} />
            <span>3. نطاق الأعمال والاشتراطات التعاقدية (Scope of Work & Terms)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Field label="نطاق وتوصيف الأعمال المسندة (Scope of Work) *">
              <input
                type="text"
                value={formData.scopeOfWork}
                onChange={(e) => setFormData({ ...formData, scopeOfWork: e.target.value })}
                placeholder="مثال: توريد وتركيب مجاري الهواء والتكييف المركزي للدور الأرضي والأول شامل مخارج الهواء والاختبارات..."
                required
              />
            </Field>

            <Field label="شروط الدفعات والملاحظات الخاصة (اختياري)">
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="شروط الدفعات، غرامات التأخير، متطلبات الاعتماد..."
              />
            </Field>
          </div>
        </div>
      </form>
    </StandardDialog>
  );
}
