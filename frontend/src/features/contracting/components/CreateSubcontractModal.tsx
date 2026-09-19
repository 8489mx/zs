import { useState, useEffect, useMemo, useCallback } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { contractingApi } from '../api/contracting.api';
import type { ContractingSubcontractor, SubcontractType, PaymentLinkageMode } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CreateSubcontractorModal } from './CreateSubcontractorModal';

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
  const [subcontractors, setSubcontractors] = useState<ContractingSubcontractor[]>([]);
  const [isLoadingSubcontractors, setIsLoadingSubcontractors] = useState(false);
  const [isCreateSubcontractorOpen, setIsCreateSubcontractorOpen] = useState(false);

  const [formData, setFormData] = useState({
    subcontractorId: '',
    contractNumber: '',
    contractType: 'supply_and_apply' as SubcontractType,
    scopeOfWork: '',
    totalAmount: '',
    advancePct: '0',
    advanceRecoveryStartPct: '10',
    advanceRecoveryEndPct: '80',
    retentionPercent: '5',
    retentionLimitPct: '5',
    penaltyPerDay: '0',
    ldCapPct: '10',
    paymentLinkageMode: 'independent' as PaymentLinkageMode,
    wastageAllowancePct: '5',
    tailReservePct: '10',
    startDate: '',
    endDate: '',
    notes: '',
  });

  const loadSubcontractors = useCallback(async () => {
    setIsLoadingSubcontractors(true);
    try {
      const data = await contractingApi.getSubcontractors();
      setSubcontractors(data || []);
    } catch {
      setSubcontractors([]);
    } finally {
      setIsLoadingSubcontractors(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadSubcontractors();
  }, [open, loadSubcontractors]);

  const subcontractorOptions = useMemo(() => {
    return subcontractors.map((s) => ({
      value: String(s.id),
      label: `${s.name} (${s.tradeSpecialty || 'مقاولات عامة'})`,
      hint: s.phone ? `هاتف: ${s.phone}` : s.taxNumber ? `ضريبي: ${s.taxNumber}` : undefined,
    }));
  }, [subcontractors]);

  const contractTypeOptions = useMemo(() => [
    { value: 'supply_and_apply', label: 'توريد وتركيب (شامل المواد والمصنعية)' },
    { value: 'labor_only', label: 'مصنعية فقط (المواد من المقاول الرئيسي)' },
    { value: 'supply_only', label: 'توريد خامات ومهمات فقط' },
    { value: 'labor_plus_consumables', label: 'مصنعية ومواد استهلاكية' },
  ], []);

  const paymentLinkageOptions = useMemo(() => [
    { value: 'independent', label: 'مستقل (حسب اعتماد نسب إنجاز الموقع)' },
    { value: 'pay_when_paid', label: 'مشروط بتحصيل مستخلص المالك (Pay-When-Paid)' },
    { value: 'pay_when_certified', label: 'مشروط باعتماد استشاري المالك (Back-to-Back)' },
  ], []);

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

    const recStart = Number(formData.advanceRecoveryStartPct || 10);
    const recEnd = Number(formData.advanceRecoveryEndPct || 80);
    if (recEnd <= recStart) {
      setErrorMsg('نسبة إتمام استرداد الدفعة المقدمة يجب أن تكون أكبر من نسبة بدء الاسترداد (نافذة Bounded Recovery)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createSubcontract(projectId, {
        subcontractorId: Number(formData.subcontractorId),
        contractNumber: formData.contractNumber.trim(),
        contractType: formData.contractType,
        scopeOfWork: formData.scopeOfWork.trim(),
        totalAmount: val,
        advancePct: Number(formData.advancePct || 0),
        advanceRecoveryStartPct: recStart,
        advanceRecoveryEndPct: recEnd,
        retentionPercent: Number(formData.retentionPercent || 5),
        retentionLimitPct: Number(formData.retentionLimitPct || 5),
        penaltyPerDay: Number(formData.penaltyPerDay || 0),
        ldCapPct: Number(formData.ldCapPct || 10),
        paymentLinkageMode: formData.paymentLinkageMode,
        wastageAllowancePct: Number(formData.wastageAllowancePct || 5),
        tailReservePct: Number(formData.tailReservePct || 10),
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
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#334155' }}>مقاول الباطن (جهة التنفيذ) *</span>
                <button
                  type="button"
                  onClick={() => setIsCreateSubcontractorOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#170e5e',
                    fontSize: 'var(--font-micro)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 4px',
                  }}
                >
                  <AppIcons.Plus size={12} />
                  <span>+ مقاول جديد</span>
                </button>
              </div>
              <CustomSelect
                value={formData.subcontractorId}
                options={subcontractorOptions}
                onChange={(val) => setFormData({ ...formData, subcontractorId: val })}
                placeholder={isLoadingSubcontractors ? 'جاري جلب سجل مقاولي الباطن...' : '-- اختر مقاول الباطن --'}
              />
            </div>

            <Field label="رقم أمر التكليف / العقد *">
              <input
                type="text"
                value={formData.contractNumber}
                onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                placeholder="مثال: SUB-260914-0001"
                required
              />
            </Field>
          </div>
        </div>

        {/* 2. شروط التعاقد والتحكم المالي (FIDIC Contract Conditions) */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.FileText size={15} />
            <span>2. شروط التعاقد والتحكم المالي (FIDIC Contract Terms & Safeguards)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '10px', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '3px' }}>
                نوع التعاقد والمسؤولية *
              </span>
              <CustomSelect
                value={formData.contractType}
                options={contractTypeOptions}
                onChange={(val) => setFormData({ ...formData, contractType: val as SubcontractType })}
              />
            </div>

            <div>
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '3px' }}>
                نمط الدفع والربط المالي (Payment Linkage)
              </span>
              <CustomSelect
                value={formData.paymentLinkageMode}
                options={paymentLinkageOptions}
                onChange={(val) => setFormData({ ...formData, paymentLinkageMode: val as PaymentLinkageMode })}
              />
            </div>
          </div>

          {/* شروط الدفعة المقدمة ونافذة الاسترداد التعاقدية (Bounded Window) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'start', marginTop: '6px' }}>
            <Field label="الدفعة المقدمة %">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                dir="ltr"
                value={formData.advancePct}
                onChange={(e) => setFormData({ ...formData, advancePct: e.target.value })}
                placeholder="0"
                style={{ fontWeight: 600 }}
              />
            </Field>

            <Field label="بدء استرداد المقدمة عند %">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                dir="ltr"
                value={formData.advanceRecoveryStartPct}
                onChange={(e) => setFormData({ ...formData, advanceRecoveryStartPct: e.target.value })}
                placeholder="10"
                style={{ fontWeight: 600 }}
                title="نسبة الإنجاز التي يبدأ عندها استقطاع الدفعة المقدمة (افتراضي 10%)"
              />
            </Field>

            <Field label="إتمام استرداد المقدمة عند %">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                dir="ltr"
                value={formData.advanceRecoveryEndPct}
                onChange={(e) => setFormData({ ...formData, advanceRecoveryEndPct: e.target.value })}
                placeholder="80"
                style={{ fontWeight: 600 }}
                title="نسبة الإنجاز التي ينتهي عندها استرداد كامل الدفعة المقدمة (افتراضي 80%)"
              />
            </Field>

            <Field label="غرامة التأخير اليومية (ج.م/يوم)">
              <input
                type="number"
                min="0"
                step="any"
                dir="ltr"
                value={formData.penaltyPerDay}
                onChange={(e) => setFormData({ ...formData, penaltyPerDay: e.target.value })}
                placeholder="0.00"
                style={{ fontWeight: 600 }}
              />
            </Field>
          </div>

          {/* محددات الضمان والهالك وحجز التسليم النهائي */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'start', marginTop: '6px' }}>
            <Field label="احتجاز الذيل والتسليم % (Tail Reserve)">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                dir="ltr"
                value={formData.tailReservePct}
                onChange={(e) => setFormData({ ...formData, tailReservePct: e.target.value })}
                placeholder="10"
                style={{ fontWeight: 600 }}
              />
            </Field>

            <Field label={formData.contractType === 'labor_only' ? 'نسبة الهالك المسموحة % (إلزامي)' : 'نسبة هالك المواد %'}>
              <input
                type="number"
                min="0"
                max="50"
                step="any"
                dir="ltr"
                value={formData.wastageAllowancePct}
                onChange={(e) => setFormData({ ...formData, wastageAllowancePct: e.target.value })}
                placeholder="5"
                style={{
                  fontWeight: 600,
                  borderColor: formData.contractType === 'labor_only' ? '#170e5e' : undefined,
                }}
              />
            </Field>

            <Field label="سقف حجز الضمان % (Retention Cap)">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                dir="ltr"
                value={formData.retentionLimitPct}
                onChange={(e) => setFormData({ ...formData, retentionLimitPct: e.target.value })}
                placeholder="5"
                style={{ fontWeight: 600 }}
              />
            </Field>

            <Field label="سقف غرامات التأخير % (LD Cap)">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                dir="ltr"
                value={formData.ldCapPct}
                onChange={(e) => setFormData({ ...formData, ldCapPct: e.target.value })}
                placeholder="10"
                style={{ fontWeight: 600 }}
              />
            </Field>
          </div>
        </div>

        {/* 3. القيمة المالية ونسب الاستقطاع والمدد */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calculator size={15} />
            <span>3. القيمة المالية والضمان والمواعيد (Financials & Schedule)</span>
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

      <CreateSubcontractorModal
        open={isCreateSubcontractorOpen}
        onClose={() => setIsCreateSubcontractorOpen(false)}
        onSuccess={(created) => {
          loadSubcontractors();
          if (created?.id) {
            setFormData((prev) => ({ ...prev, subcontractorId: String(created.id) }));
          }
        }}
      />
    </StandardDialog>
  );
}
