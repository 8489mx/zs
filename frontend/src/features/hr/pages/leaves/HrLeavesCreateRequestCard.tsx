import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { FileTextIcon } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import type { HrEmployee, HrLeaveType } from '@/types/domain';
import {
  calculateInclusiveDays,
  employeeDisplay,
  normalizeArabicDigits,
  text,
} from '@/features/hr/pages/leaves/hr-leaves.helpers';

type LeaveFormState = {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: string;
  reason: string;
  notes: string;
};

type Props = {
  leaveForm: LeaveFormState;
  employees: HrEmployee[];
  leaveTypes: HrLeaveType[];
  errors: Record<string, string>;
  isPending: boolean;
  onLeaveFormChange: (updater: (prev: LeaveFormState) => LeaveFormState) => void;
  onCreate: () => void;
  onClose: () => void;
};

export function HrLeavesCreateRequestCard({
  leaveForm,
  employees,
  leaveTypes,
  errors,
  isPending,
  onLeaveFormChange,
  onCreate,
  onClose,
}: Props) {
  const { t } = useTranslation();
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <strong style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileTextIcon size={16} /> {t('hr.leaves.hr_leaves_create_request_card.s0', "إضافة طلب إجازة جديد")}
        </strong>
        <Button type="button" variant="secondary" onClick={onClose} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.leaves.hr_leaves_create_request_card.s1', "إغلاق")}</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{t('hr.leaves.hr_leaves_create_request_card.s2', "الموظف")} <span style={{ color: '#dc2626' }}>*</span></label>
          <CustomSelect
            value={leaveForm.employeeId}
            onChange={(val) => onLeaveFormChange((prev) => ({ ...prev, employeeId: normalizeArabicDigits(val) }))}
            options={[
              { value: '', label: t('hr.leaves.hr_leaves_create_request_card.s3', "اختر الموظف...") },
              ...employees.map((employee) => ({ value: employee.id, label: employeeDisplay(employee) })),
            ]}
          />
          {errors.employeeId ? <small style={{ color: '#dc2626', fontSize: '0.725rem', marginTop: '2px', display: 'block' }}>{errors.employeeId}</small> : null}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{t('hr.leaves.hr_leaves_create_request_card.s4', "نوع الإجازة")} <span style={{ color: '#dc2626' }}>*</span></label>
          <CustomSelect
            value={leaveForm.leaveTypeId}
            onChange={(val) => onLeaveFormChange((prev) => ({ ...prev, leaveTypeId: normalizeArabicDigits(val) }))}
            options={[
              { value: '', label: t('hr.leaves.hr_leaves_create_request_card.s5', "اختر النوع...") },
              ...leaveTypes.map((type) => ({ value: type.id, label: text(type.name) || '—' })),
            ]}
          />
          {errors.leaveTypeId ? <small style={{ color: '#dc2626', fontSize: '0.725rem', marginTop: '2px', display: 'block' }}>{errors.leaveTypeId}</small> : null}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{t('hr.leaves.hr_leaves_create_request_card.s6', "من تاريخ")} <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            type="date"
            value={leaveForm.startDate}
            onChange={(event) => {
              const startDate = normalizeArabicDigits(event.target.value);
              onLeaveFormChange((prev) => ({ ...prev, startDate, daysCount: calculateInclusiveDays(startDate, prev.endDate) || prev.daysCount }));
            }}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.825rem', boxSizing: 'border-box' }}
          />
          {errors.startDate ? <small style={{ color: '#dc2626', fontSize: '0.725rem', marginTop: '2px', display: 'block' }}>{errors.startDate}</small> : null}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{t('hr.leaves.hr_leaves_create_request_card.s7', "إلى تاريخ")} <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            type="date"
            value={leaveForm.endDate}
            onChange={(event) => {
              const endDate = normalizeArabicDigits(event.target.value);
              onLeaveFormChange((prev) => ({ ...prev, endDate, daysCount: calculateInclusiveDays(prev.startDate, endDate) || prev.daysCount }));
            }}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.825rem', boxSizing: 'border-box' }}
          />
          {errors.endDate ? <small style={{ color: '#dc2626', fontSize: '0.725rem', marginTop: '2px', display: 'block' }}>{errors.endDate}</small> : null}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{t('hr.leaves.hr_leaves_create_request_card.s8', "عدد الأيام")}</label>
          <input
            inputMode="decimal"
            value={leaveForm.daysCount}
            onChange={(event) => onLeaveFormChange((prev) => ({ ...prev, daysCount: normalizeArabicDigits(event.target.value) }))}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.825rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{t('hr.leaves.hr_leaves_create_request_card.s9', "سبب الإجازة")}</label>
          <input
            value={leaveForm.reason}
            onChange={(event) => onLeaveFormChange((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder={t('hr.leaves.hr_leaves_create_request_card.s10', "السبب...")}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.825rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{t('hr.leaves.hr_leaves_create_request_card.s11', "ملاحظات إدارية")}</label>
          <input
            value={leaveForm.notes}
            onChange={(event) => onLeaveFormChange((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder={t('hr.leaves.hr_leaves_create_request_card.s12', "أي ملاحظات إضافية...")}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.825rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div className="actions compact-actions" style={{ justifyContent: 'flex-start', gap: '8px' }}>
        <Button type="button" onClick={onCreate} disabled={isPending} style={{ padding: '4px 14px', fontSize: '0.8rem' }}>{isPending ? t('hr.leaves.hr_leaves_create_request_card.s13', "جاري الحفظ...") : t('hr.leaves.hr_leaves_create_request_card.s14', "حفظ الطلب")}</Button>
        <Button type="button" variant="secondary" onClick={onClose} style={{ padding: '4px 14px', fontSize: '0.8rem' }}>{t('hr.leaves.hr_leaves_create_request_card.s15', "إلغاء")}</Button>
      </div>
    </div>
  );
}
