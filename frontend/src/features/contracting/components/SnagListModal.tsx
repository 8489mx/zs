import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import {
  ContractingSnagItem,
  SnagSeverity,
  SnagStatus,
  ContractingSubcontract,
} from '../contracting.types';
import { toast, systemConfirm } from '@/shared/components/system-alert';

interface SnagListModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

const SEVERITY_CONFIG: Record<SnagSeverity, { bg: string; color: string; border: string; label: string }> = {
  low: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'بسيطة (Low)' },
  medium: { bg: '#fef9c3', color: '#a16207', border: '#fde68a', label: 'متوسطة (Medium)' },
  high: { bg: '#fed7aa', color: '#c2410c', border: '#fdba74', label: 'عالية الأهمية (High)' },
  critical: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'حرجة / مانعة للتسليم (Critical)' },
};

const STATUS_CONFIG: Record<SnagStatus, { bg: string; color: string; border: string; label: string }> = {
  open: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'مفتوحة (Open)' },
  in_progress: { bg: '#fef9c3', color: '#a16207', border: '#fde68a', label: 'قيد الإصلاح (In Progress)' },
  rectified: { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', label: 'تم الإصلاح - بانتظار الفحص' },
  verified_closed: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'مغلقة ومعتمدة (Closed)' },
};

export function SnagListModal({ open, onClose, projectId, projectName }: SnagListModalProps) {
  const [items, setItems] = useState<ContractingSnagItem[]>([]);
  const [subcontracts, setSubcontracts] = useState<ContractingSubcontract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [locationDesc, setLocationDesc] = useState('');
  const [severity, setSeverity] = useState<SnagSeverity>('medium');
  const [responsibleParty, setResponsibleParty] = useState<'main_contractor' | 'subcontractor'>('main_contractor');
  const [subcontractId, setSubcontractId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Rectification review modal
  const [rectifyingItem, setRectifyingItem] = useState<ContractingSnagItem | null>(null);
  const [newStatus, setNewStatus] = useState<SnagStatus>('rectified');
  const [rectificationNotes, setRectificationNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [snags, subs] = await Promise.all([
        contractingApi.getSnagItems(projectId),
        contractingApi.getSubcontracts(projectId).catch(() => []),
      ]);
      setItems(snags || []);
      setSubcontracts(subs || []);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل قائمة العيوب والملاحظات');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleCreateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !locationDesc.trim()) {
      toast.error('يرجى كتابة وصف الملاحظة وتحديد موقعها بدقة');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSub = subcontracts.find((s) => s.id === subcontractId);
      await contractingApi.createSnagItem(projectId, {
        itemTitle: itemTitle.trim(),
        locationDesc: locationDesc.trim(),
        severity,
        responsibleParty,
        subcontractId: subcontractId || undefined,
        subcontractorId: selectedSub?.subcontractorId,
        assignedTo: assignedTo.trim() || undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      } as any);

      toast.success('تم تسجيل الملاحظة الهندسية في القائمة بنجاح');
      setItemTitle('');
      setLocationDesc('');
      setAssignedTo('');
      setNotes('');
      setActiveTab('list');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل الملاحظة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!rectifyingItem) return;
    setIsUpdatingStatus(true);
    try {
      await contractingApi.updateSnagItemStatus(rectifyingItem.id, {
        status: newStatus,
        rectificationNotes: rectificationNotes.trim() || undefined,
        closedDate: newStatus === 'verified_closed' ? new Date().toISOString().split('T')[0] : undefined,
      });
      toast.success('تم تحديث حالة الملاحظة بنجاح');
      setRectifyingItem(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث حالة الملاحظة');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await systemConfirm({
      title: 'حذف ملاحظة هندسية',
      message: `هل أنت متأكد من حذف الملاحظة "${title}" نهائياً من القائمة؟`,
      confirmText: 'نعم، احذف الملاحظة',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await contractingApi.deleteSnagItem(id);
      toast.success('تم حذف الملاحظة بنجاح');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حذف الملاحظة');
    }
  };

  // KPIs
  const totalSnags = items.length;
  const openCount = items.filter((i) => i.status === 'open').length;
  const inProgressCount = items.filter((i) => i.status === 'in_progress').length;
  const rectifiedCount = items.filter((i) => i.status === 'rectified').length;
  const closedCount = items.filter((i) => i.status === 'verified_closed').length;

  const filteredItems = items.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
    return true;
  });

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`قائمة الملاحظات وعيوب المصنعية والتسليم (Punch List) - ${projectName || 'المشروع'}`}
      subtitle="حصر عيوب التشطيب والملاحظات الاستشارية، تعيين المسؤوليات، ومتابعة الإغلاق قبل الاستلام والتحاسب"
      width="min(1080px, 96vw)"
      minHeight="min(560px, 85vh)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
        {/* شريط الإحصائيات لمتابعة العيوب */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي الملاحظات</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {loading ? '—' : totalSnags}
            </div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#b91c1c', fontWeight: 600 }}>ملاحظات مفتوحة</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
              {loading ? '—' : openCount}
            </div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#a16207', fontWeight: 600 }}>جاري الإصلاح</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a16207', marginTop: '2px' }}>
              {loading ? '—' : inProgressCount}
            </div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#3730a3', fontWeight: 600 }}>تم الإصلاح (بانتظار الفحص)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3730a3', marginTop: '2px' }}>
              {loading ? '—' : rectifiedCount}
            </div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#15803d', fontWeight: 600 }}>مغلقة ومسلّمة نهائياً</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {loading ? '—' : closedCount}
            </div>
          </div>
        </div>

        {/* شريط التحكم والتبديل والتصفية */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8125rem',
                background: activeTab === 'list' ? '#170e5e' : '#f1f5f9',
                color: activeTab === 'list' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              جدول الملاحظات والعيوب ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8125rem',
                background: activeTab === 'create' ? '#170e5e' : '#f1f5f9',
                color: activeTab === 'create' ? '#ffffff' : '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <AppIcons.Plus size={14} />
              <span>إضافة ملاحظة / عيب جديد</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* تصفية الحالة */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>الحالة:</span>
                {[
                  { key: 'all', label: 'الكل' },
                  { key: 'open', label: 'مفتوحة' },
                  { key: 'in_progress', label: 'قيد الإصلاح' },
                  { key: 'rectified', label: 'مُصلحة' },
                  { key: 'verified_closed', label: 'مغلقة' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatusFilter(s.key)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: statusFilter === s.key ? '#170e5e' : '#e2e8f0',
                      background: statusFilter === s.key ? '#170e5e' : '#ffffff',
                      color: statusFilter === s.key ? '#ffffff' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* تصفية الخطورة */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>الخطورة:</span>
                {[
                  { key: 'all', label: 'الكل' },
                  { key: 'critical', label: 'حرجة' },
                  { key: 'high', label: 'عالية' },
                  { key: 'medium', label: 'متوسطة' },
                  { key: 'low', label: 'بسيطة' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSeverityFilter(s.key)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: severityFilter === s.key ? '#170e5e' : '#e2e8f0',
                      background: severityFilter === s.key ? '#170e5e' : '#ffffff',
                      color: severityFilter === s.key ? '#ffffff' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* نموذج إضافة ملاحظة جديدة */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateSnag} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <Field label="وصف الملاحظة أو العيب الفني *">
                <input
                  type="text"
                  placeholder="مثال: تعشيش خرساني بالعمود C3، أو شروخ دهانات بالحائط الشرقي"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  style={{ width: '100%', height: '33px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.8125rem' }}
                />
              </Field>

              <Field label="مستوى الأهمية والخطورة *">
                <CustomSelect
                  value={severity}
                  onChange={(val) => setSeverity(val as SnagSeverity)}
                  options={[
                    { value: 'critical', label: 'حرجة / مانعة للاستلام (Critical)' },
                    { value: 'high', label: 'عالية الأهمية (High)' },
                    { value: 'medium', label: 'متوسطة (Medium)' },
                    { value: 'low', label: 'بسيطة / رتوش نهائية (Low)' },
                  ]}
                />
              </Field>

              <Field label="الجهة المسؤولة عن التدارك *">
                <CustomSelect
                  value={responsibleParty}
                  onChange={(val) => setResponsibleParty(val as any)}
                  options={[
                    { value: 'main_contractor', label: 'المقاول الرئيسي (تنفيذ ذاتي)' },
                    { value: 'subcontractor', label: 'مقاول باطن متخصص' },
                  ]}
                />
              </Field>

              <Field label="الموقع التفصيلي الدقيق بالمشروع *">
                <input
                  type="text"
                  placeholder="مثال: الدور الثاني - المدخل الرئيسي - محور B4"
                  value={locationDesc}
                  onChange={(e) => setLocationDesc(e.target.value)}
                  style={{ width: '100%', height: '33px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.8125rem' }}
                />
              </Field>

              {responsibleParty === 'subcontractor' ? (
                <Field label="عقد مقاول الباطن المسؤول">
                  <CustomSelect
                    value={subcontractId}
                    onChange={setSubcontractId}
                    placeholder="اختر مقاول الباطن..."
                    options={[
                      { value: '', label: 'غير محدد' },
                      ...subcontracts.map((s) => ({
                        value: s.id,
                        label: `${s.contractNumber} - ${s.subcontractorName || 'مقاول باطن'}`,
                      })),
                    ]}
                  />
                </Field>
              ) : (
                <Field label="المكلف بالإصلاح أو المشرف الميداني">
                  <input
                    type="text"
                    placeholder="مثال: فني الترميم / م. حسن"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    style={{ width: '100%', height: '33px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.8125rem' }}
                  />
                </Field>
              )}

              <Field label="تاريخ المعالجة المستهدف (Due Date)">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ width: '100%', height: '33px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.8125rem' }}
                />
              </Field>

              <div style={{ gridColumn: 'span 3' }}>
                <Field label="طريقة المعالجة المعتمدة أو ملاحظات الاستشاري">
                  <input
                    type="text"
                    placeholder="يتم تكسير الأجزاء الضعيفة وتطهير حديد التسليح ودهان مادة إيبوكسية ثم المونة غير القابلة للانكماش (Grout)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: '100%', height: '33px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.8125rem' }}
                  />
                </Field>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  height: '36px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Check size={16} />
                <span>{isSubmitting ? 'جاري الحفظ...' : 'تسجيل الملاحظة في القائمة'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* جدول الملاحظات */
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ flex: 1, minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '32px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8', fontWeight: 600 }}>جاري تحميل قائمة العيوب والملاحظات...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div style={{ flex: 1, minHeight: '280px', padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#15803d', marginBottom: '10px' }}>
                  <AppIcons.CheckCircle size={42} />
                </div>
                <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سجل الملاحظات خالٍ تماماً (أو لا توجد عناصر تطابق الفلتر)
                </div>
                <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '380px', margin: '0 auto 14px' }}>
                  توثيق الملاحظات يساعد في ضبط جودة الأعمال وتوجيه مقاولي الباطن لتفادي حجز الدفعات أو تأخير الاستلام.
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    background: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                  }}
                >
                  إضافة ملاحظة جديدة
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الملاحظة والموقع</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>مستوى الخطورة</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الجهة المسؤولة</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>تاريخ الاستحقاق</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الحالة</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const sevCfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.medium;
                      const statCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', maxWidth: '320px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.description}</div>
                            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px' }}>
                              الموقع: {item.location}
                            </div>
                            {item.rectificationNotes && (
                              <div style={{ fontSize: 'var(--font-micro)', color: '#15803d', marginTop: '2px' }}>
                                المعالجة: {item.rectificationNotes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: 'var(--font-micro)',
                                fontWeight: 700,
                                background: sevCfg.bg,
                                color: sevCfg.color,
                                border: `1px solid ${sevCfg.border}`,
                              }}
                            >
                              {sevCfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#475569' }}>
                            <div>{(item as any).subcontractorName || (item.assignedTo ? item.assignedTo : 'المقاول الرئيسي')}</div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#475569' }}>
                            {item.targetDate || '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: 'var(--font-badge)',
                                fontWeight: 600,
                                background: statCfg.bg,
                                color: statCfg.color,
                                border: `1px solid ${statCfg.border}`,
                              }}
                            >
                              {statCfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setRectifyingItem(item);
                                  setNewStatus(item.status);
                                  setRectificationNotes(item.rectificationNotes || '');
                                }}
                                style={{
                                  height: '28px',
                                  padding: '0 10px',
                                  borderRadius: '6px',
                                  fontSize: 'var(--font-badge)',
                                  fontWeight: 600,
                                  background: '#f8fafc',
                                  color: '#170e5e',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <AppIcons.Edit size={12} />
                                <span>تحديث المعالجة</span>
                              </button>
                              {item.status !== 'verified_closed' && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id, item.description)}
                                  style={{
                                    height: '28px',
                                    padding: '0 8px',
                                    borderRadius: '6px',
                                    fontSize: 'var(--font-badge)',
                                    fontWeight: 600,
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <AppIcons.Trash size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* نافذة تحديث حالة المعالجة */}
        {rectifyingItem && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                width: 'min(480px, 92vw)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              }}
              dir="rtl"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#170e5e', margin: 0 }}>
                  تحديث حالة معالجة الملاحظة
                </h3>
                <button
                  type="button"
                  onClick={() => setRectifyingItem(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <AppIcons.X size={18} />
                </button>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                <strong>الملاحظة:</strong> {rectifyingItem.description}
              </div>

              <Field label="الحالة الجديدة للملاحظة *">
                <CustomSelect
                  value={newStatus}
                  onChange={(val) => setNewStatus(val as SnagStatus)}
                  options={[
                    { value: 'open', label: 'مفتوحة (Open) - لم تبدأ المعالجة بعد' },
                    { value: 'in_progress', label: 'قيد المعالجة (In Progress) - جاري العمل عليها' },
                    { value: 'rectified', label: 'تم الإصلاح (Rectified) - بانتظار معاينة الاستشاري' },
                    { value: 'verified_closed', label: 'معتمدة ومغلقة (Closed) - تمت المعاينة وإغلاق الملاحظة' },
                  ]}
                />
              </Field>

              <Field label="ملاحظات المعالجة وتفاصيل المواد المستخدمة">
                <textarea
                  rows={3}
                  value={rectificationNotes}
                  onChange={(e) => setRectificationNotes(e.target.value)}
                  placeholder="تم إصلاح العيب ومعاينة السطح واستلامه بواسطة مهندس الموقع..."
                  style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '0.8125rem', resize: 'vertical' }}
                />
              </Field>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setRectifyingItem(null)}
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={handleUpdateStatus}
                  style={{
                    height: '34px',
                    padding: '0 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#170e5e',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isUpdatingStatus ? 'جاري الحفظ...' : 'تثبيت التحديث'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
