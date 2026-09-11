import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import type { ContractingBoqItem, ContractingScheduleTask } from '../contracting.types';

interface CreateScheduleTaskModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  boqItems?: ContractingBoqItem[];
  existingTasks?: ContractingScheduleTask[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateScheduleTaskModal({
  open,
  projectId,
  projectName,
  boqItems = [],
  existingTasks = [],
  onClose,
  onCreated,
}: CreateScheduleTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    taskCode: '',
    taskName: '',
    wbsCode: '1.0',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    durationDays: '7',
    progressPercent: '0',
    predecessorId: '',
    isCriticalPath: false,
    status: 'not_started',
    boqItemId: '',
    assignedTeam: '',
    notes: '',
  });

  const handleStartDateChange = (val: string) => {
    const s = new Date(val);
    const e = new Date(formData.endDate);
    let diff = 1;
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      diff = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    }
    setFormData({ ...formData, startDate: val, durationDays: String(diff) });
  };

  const handleEndDateChange = (val: string) => {
    const s = new Date(formData.startDate);
    const e = new Date(val);
    let diff = 1;
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      diff = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    }
    setFormData({ ...formData, endDate: val, durationDays: String(diff) });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.taskName.trim()) {
      setErrorMsg('يرجى إدخال اسم أو بيان المهمة التنفيذية');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setErrorMsg('يرجى تحديد تواريخ البداية والنهاية للمهمة');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createScheduleTask(projectId, {
        taskCode: formData.taskCode.trim() || undefined,
        taskName: formData.taskName.trim(),
        wbsCode: formData.wbsCode.trim() || '1.0',
        startDate: formData.startDate,
        endDate: formData.endDate,
        durationDays: Number(formData.durationDays || 1),
        progressPercent: Number(formData.progressPercent || 0),
        predecessorId: formData.predecessorId || undefined,
        isCriticalPath: formData.isCriticalPath,
        status: formData.status as any,
        boqItemId: formData.boqItemId || undefined,
        assignedTeam: formData.assignedTeam.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ المهمة الجدولية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إضافة مهمة جدولية ومرحلة تنفيذية (Schedule Task)"
      subtitle={projectName ? `المشروع: ${projectName}` : 'جدولة الأعمال وتحديد مدد التنفيذ والمسار الحرج (CPM)'}
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

        {/* كود WBS واسم المهمة */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '14px' }}>
          <Field label="كود هيكل الأعمال (WBS)">
            <input
              type="text"
              value={formData.wbsCode}
              onChange={(e) => setFormData({ ...formData, wbsCode: e.target.value })}
              placeholder="مثال: 1.1.2"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>

          <Field label="كود المهمة">
            <input
              type="text"
              value={formData.taskCode}
              onChange={(e) => setFormData({ ...formData, taskCode: e.target.value })}
              placeholder="تلقائي: TSK-001"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>

          <Field label="اسم المهمة أو النشاط التنفيذي *">
            <input
              type="text"
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
              placeholder="مثال: أعمال الحفر والإحلال للموقع العام"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>
        </div>

        {/* التواريخ والمدة الزمنية */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <Field label="تاريخ البداية *">
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <Field label="تاريخ النهاية *">
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <Field label="مدة التنفيذ (أيام)">
            <input
              type="number"
              min="1"
              value={formData.durationDays}
              onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>
        </div>

        {/* الربط ببند المقايسة والمهمة السابقة */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <Field label="ربط ببند المقايسة (BOQ Item)">
            <select
              value={formData.boqItemId}
              onChange={(e) => setFormData({ ...formData, boqItemId: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            >
              <option value="">-- بدون ربط مباشر ببند مقايسة --</option>
              {boqItems.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.itemCode} - {b.description.substring(0, 35)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="المهمة السابقة المعتمدة عليها (Predecessor)">
            <select
              value={formData.predecessorId}
              onChange={(e) => setFormData({ ...formData, predecessorId: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            >
              <option value="">-- لا يوجد اعتمادية سابقة (تبدأ مباشرة) --</option>
              {existingTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.taskCode} - {t.taskName} ({t.durationDays} يوم)
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* الفريق المسؤول والمسار الحرج */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px', alignItems: 'center' }}>
          <Field label="الفريق أو المقاول المسؤول">
            <input
              type="text"
              value={formData.assignedTeam}
              onChange={(e) => setFormData({ ...formData, assignedTeam: e.target.value })}
              placeholder="مثال: طاقم الخرسانات / مقاول الحفر والتسوية"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
              <input
                type="checkbox"
                checked={formData.isCriticalPath}
                onChange={(e) => setFormData({ ...formData, isCriticalPath: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#dc2626' }}
              />
              <span>نشاط مسار حرج (Critical Path)</span>
            </label>
          </div>
        </div>

        <Field label="ملاحظات ومتطلبات التنفيذ">
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="ملاحظات مهندس التخطيط، اعتمادات الاستشاري المطلوبة قبل البدء..."
            className="form-input"
            style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
          />
        </Field>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText="إضافة المهمة للجدول الزمني"
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
