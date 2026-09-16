import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import type {
  ContractingSubmittal,
  SubmittalType,
  SubmittalStatus,
  ContractingBoqItem,
  ContractingSubcontract,
} from '../contracting.types';
import { toast } from '@/shared/components/system-alert';

interface MaterialSubmittalsModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

const TYPE_CONFIG: Record<SubmittalType, { label: string; hint: string }> = {
  material: { label: 'اعتماد مادة / مواصفة (Material Approval - MAR)', hint: 'كتالوجات، شهادات اختبار المصنع، ومواصفات الخامات' },
  shop_drawing: { label: 'اعتماد مخطط تنفيذي (Shop Drawing Submittal)', hint: 'لوحات تفصيلية للأوتوكاد ونماذج التسليح' },
  sample: { label: 'اعتماد عينة طبيعية (Physical Sample)', hint: 'عينات رخام، دهانات، سيراميك، وقطاعات ألومنيوم' },
  method_statement: { label: 'منهجية وطريقة تنفيذ (Method Statement)', hint: 'خطوات صب خرسانة خاصة، عزل، أو اختبارات ضغط' },
};

const STATUS_CONFIG: Record<SubmittalStatus, { bg: string; color: string; border: string; label: string; code: string }> = {
  submitted: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: 'قيد مراجعة الاستشاري', code: 'Under Review' },
  approved: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'معتمد نهائياً بدون ملاحظات', code: 'Code A: Approved' },
  approved_as_noted: { bg: '#fef9c3', color: '#a16207', border: '#fde68a', label: 'معتمد مع ملاحظات استشارية', code: 'Code B: Approved as Noted' },
  revise_and_resubmit: { bg: '#fed7aa', color: '#c2410c', border: '#fdba74', label: 'مرفوض ويعدل ويعاد تقديمه', code: 'Code C: Revise & Resubmit' },
  rejected: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'مرفوض كلياً وغير مطابق', code: 'Code D: Rejected' },
};

export function MaterialSubmittalsModal({ open, onClose, projectId, projectName }: MaterialSubmittalsModalProps) {
  const [submittals, setSubmittals] = useState<ContractingSubmittal[]>([]);
  const [boqItems, setBoqItems] = useState<ContractingBoqItem[]>([]);
  const [subcontracts, setSubcontracts] = useState<ContractingSubcontract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittalType, setSubmittalType] = useState<SubmittalType>('material');
  const [title, setTitle] = useState('');
  const [specificationSection, setSpecificationSection] = useState('');
  const [supplierManufacturer, setSupplierManufacturer] = useState('');
  const [boqItemId, setBoqItemId] = useState('');
  const [subcontractId, setSubcontractId] = useState('');
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [reviewDueDate, setReviewDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Review Modal State
  const [reviewingSubmittal, setReviewingSubmittal] = useState<ContractingSubmittal | null>(null);
  const [newStatus, setNewStatus] = useState<SubmittalStatus>('approved');
  const [consultantName, setConsultantName] = useState('');
  const [consultantComments, setConsultantComments] = useState('');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [subsData, boqData, subcontractsData] = await Promise.all([
        contractingApi.getSubmittals(projectId),
        contractingApi.getBoqItems(projectId).catch(() => []),
        contractingApi.getSubcontracts(projectId).catch(() => []),
      ]);
      setSubmittals(subsData || []);
      setBoqItems(boqData || []);
      setSubcontracts(subcontractsData || []);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل سجل اعتمادات المواد والمخططات');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleCreateSubmittal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان أو وصف المادة/المخطط المطلوب اعتماده');
      return;
    }
    try {
      setIsSubmitting(true);
      await contractingApi.createSubmittal(projectId, {
        submittalType,
        title: title.trim(),
        specificationSection: specificationSection.trim() || undefined,
        supplierManufacturer: supplierManufacturer.trim() || undefined,
        boqItemId: boqItemId || undefined,
        subcontractId: subcontractId || undefined,
        submissionDate,
        reviewDueDate: reviewDueDate || undefined,
        notes: notes.trim() || undefined,
      } as any);

      toast.success('تم تقديم طلب الاعتماد وتسجيله برقم رسمي بنجاح');
      setTitle('');
      setSpecificationSection('');
      setSupplierManufacturer('');
      setBoqItemId('');
      setSubcontractId('');
      setNotes('');
      setActiveTab('list');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تقديم طلب الاعتماد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!reviewingSubmittal) return;
    try {
      setIsSubmitting(true);
      await contractingApi.updateSubmittalStatus(reviewingSubmittal.id, {
        status: newStatus,
        consultantName: consultantName.trim() || undefined,
        consultantComments: consultantComments.trim() || undefined,
        consultantReviewDate: new Date().toISOString().split('T')[0],
      });

      toast.success('تم توثيق قرار واعتماد الاستشاري بنجاح');
      setReviewingSubmittal(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث حالة الاعتماد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubmittals = submittals.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="اعتمادات المواد والمخططات التنفيذية (Material & Shop Drawing Submittals)"
      subtitle={`إدارة دورة اعتماد العينات والمواصفات ولوحات الشوب دروينج مع الاستشاري — ${projectName || ''}`}
      maxWidth="1100px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {/* شريط التبويبات العلوي */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: 'var(--font-table-head)',
                border: activeTab === 'list' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                background: activeTab === 'list' ? '#170e5e' : '#f8fafc',
                color: activeTab === 'list' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              سجل الاعتمادات ({submittals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: 'var(--font-table-head)',
                border: activeTab === 'create' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                background: activeTab === 'create' ? '#170e5e' : '#f8fafc',
                color: activeTab === 'create' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              تقديم طلب اعتماد جديد (MAR / MAS)
            </button>
          </div>

          {activeTab === 'list' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#64748b' }}>تصفية الحالة:</span>
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val || 'all')}
                options={[
                  { value: 'all', label: 'كافة الحالات' },
                  { value: 'submitted', label: 'قيد المراجعة' },
                  { value: 'approved', label: 'معتمد كود A' },
                  { value: 'approved_as_noted', label: 'معتمد بملاحظات كود B' },
                  { value: 'revise_and_resubmit', label: 'مرفوض ويعدل كود C' },
                  { value: 'rejected', label: 'مرفوض كود D' },
                ]}
              />
            </div>
          )}
        </div>

        {/* محتوى التبويب: إنشاء طلب جديد */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateSubmittal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <Field label="نوع الاعتماد الهندسي (Submittal Type)">
                <CustomSelect
                  value={submittalType}
                  onChange={(val) => setSubmittalType((val as SubmittalType) || 'material')}
                  options={Object.entries(TYPE_CONFIG).map(([key, item]) => ({
                    value: key,
                    label: item.label,
                    hint: item.hint,
                  }))}
                />
              </Field>

              <Field label="عنوان ووصف المادة / اللوحة التنفيذية">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: اعتماد كابلات نحاس معزولة 4×35 مم² — السويدي للكابلات"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="بند المواصفة التعاقدية (Specification Code)">
                <input
                  type="text"
                  value={specificationSection}
                  onChange={(e) => setSpecificationSection(e.target.value)}
                  placeholder="مثال: Section 16120 - Low Voltage Cables"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="الشركة المصنعة / المورد المقترح">
                <input
                  type="text"
                  value={supplierManufacturer}
                  onChange={(e) => setSupplierManufacturer(e.target.value)}
                  placeholder="مثال: شركة السويدي إليكتريك / سيمنس"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="ربط ببند المقايسة المعتمد (BOQ Item)">
                <CustomSelect
                  value={boqItemId}
                  onChange={(val) => setBoqItemId(val || '')}
                  options={[
                    { value: '', label: '— اختياري: غير مرتبط ببند محدد —' },
                    ...boqItems.map((b) => ({
                      value: b.id,
                      label: `[${b.itemCode}] ${b.description}`,
                    })),
                  ]}
                />
              </Field>

              <Field label="مقاول الباطن التابع للتقديم">
                <CustomSelect
                  value={subcontractId}
                  onChange={(val) => setSubcontractId(val || '')}
                  options={[
                    { value: '', label: '— اختياري: المقاول العام الرئيسي —' },
                    ...subcontracts.map((s) => ({
                      value: s.id,
                      label: `[${s.contractNumber || (s as any).subcontractNumber || ''}] ${s.subcontractorName || ''} (${s.scopeOfWork || (s as any).workScope || ''})`,
                    })),
                  ]}
                />
              </Field>

              <Field label="تاريخ التقديم الرسمي">
                <input
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="موعد استحقاق رد الاستشاري (Review Due Date)">
                <input
                  type="date"
                  value={reviewDueDate}
                  onChange={(e) => setReviewDueDate(e.target.value)}
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <Field label="ملاحظات تفصيلية أو روابط المرفقات والكتالوجات">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تدوين أي شروط خاصة أو بيانات اختبار المصنع أو متطلبات استشارية خاصة..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                style={{ height: '36px', padding: '0 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ height: '36px', padding: '0 20px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
              >
                {isSubmitting ? 'جارٍ الإرسال...' : 'تسجيل وإرسال طلب الاعتماد للاستشاري'}
              </button>
            </div>
          </form>
        )}

        {/* محتوى التبويب: جدول الاعتمادات */}
        {activeTab === 'list' && (
          <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جارٍ تحميل سجل الاعتمادات...</div>
            ) : filteredSubmittals.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <AppIcons.FileText size={36} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, color: '#334155' }}>لا توجد اعتمادات مسجلة مطابقة للفلاتر</div>
                <div style={{ fontSize: 'var(--font-subtitle)', marginTop: '4px' }}>اضغط على "تقديم طلب اعتماد جديد" لتوثيق عينات وخامات المشروع</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 'var(--font-body)' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>رقم الاعتماد</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>النوع</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>عنوان المادة / المخطط</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>المصنع / المورد</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>تاريخ التقديم</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>حالة الاعتماد</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155', textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmittals.map((sub) => {
                    const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.submitted;
                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#170e5e' }}>{sub.submittalNumber}</td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>
                          {TYPE_CONFIG[sub.submittalType]?.label.split('(')[0] || sub.submittalType}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{sub.title}</div>
                          {sub.specificationSection && (
                            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>كود: {sub.specificationSection}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#334155' }}>
                          {sub.supplierManufacturer || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                          {sub.submissionDate}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-micro)',
                              fontWeight: 700,
                              background: statusCfg.bg,
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.border}`,
                            }}
                          >
                            {statusCfg.code}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingSubmittal(sub);
                              setNewStatus(sub.status === 'submitted' ? 'approved' : sub.status);
                              setConsultantName(sub.consultantName || '');
                              setConsultantComments(sub.consultantComments || '');
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-micro)',
                              fontWeight: 700,
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#170e5e',
                              cursor: 'pointer',
                            }}
                          >
                            مراجعة الاستشاري
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* نافذة فرعية لتوثيق قرار الاستشاري */}
        {reviewingSubmittal && (
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '16px',
              marginTop: '10px',
            }}
          >
            <h4 style={{ margin: '0 0 10px', fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170e5e' }}>
              توثيق قرار واعتماد استشاري المشروع: [{reviewingSubmittal.submittalNumber}] {reviewingSubmittal.title}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <Field label="قرار الاعتماد الرسمي (Consultant Code)">
                <CustomSelect
                  value={newStatus}
                  onChange={(val) => setNewStatus((val as SubmittalStatus) || 'approved')}
                  options={[
                    { value: 'approved', label: 'Code A: معتمد نهائياً بدون ملاحظات (Approved)' },
                    { value: 'approved_as_noted', label: 'Code B: معتمد مع ملاحظات استشارية (Approved as Noted)' },
                    { value: 'revise_and_resubmit', label: 'Code C: مرفوض ويعدل ويعاد تقديمه (Revise & Resubmit)' },
                    { value: 'rejected', label: 'Code D: مرفوض كلياً وغير مطابق (Rejected)' },
                  ]}
                />
              </Field>

              <Field label="اسم الاستشاري / مهندس المراجعة">
                <input
                  type="text"
                  value={consultantName}
                  onChange={(e) => setConsultantName(e.target.value)}
                  placeholder="مثال: د. م. أحمد خليل — الاستشاري العام"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <Field label="ملاحظات وتوجيهات الاستشاري الفنية">
              <textarea
                value={consultantComments}
                onChange={(e) => setConsultantComments(e.target.value)}
                placeholder="تدوين ملاحظات الاعتماد، شروط الموقع، أو أسباب الرفض وإعادة التقديم..."
                rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setReviewingSubmittal(null)}
                style={{ height: '32px', padding: '0 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isSubmitting}
                style={{ height: '32px', padding: '0 18px', borderRadius: '6px', border: 'none', background: '#15803d', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
              >
                {isSubmitting ? 'جارٍ الحفظ...' : 'اعتماد وحفظ قرار الاستشاري'}
              </button>
            </div>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
