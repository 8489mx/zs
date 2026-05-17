import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
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
  return (
    <Card title="إضافة طلب إجازة">
      <div className="form-grid">
        <label className="field">
          <span>الموظف</span>
          <select value={leaveForm.employeeId} onChange={(event) => onLeaveFormChange((prev) => ({ ...prev, employeeId: normalizeArabicDigits(event.target.value) }))}>
            <option value="">اختر الموظف</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplay(employee)}</option>)}
          </select>
          {errors.employeeId ? <small className="field-error">{errors.employeeId}</small> : null}
        </label>
        <label className="field">
          <span>نوع الإجازة</span>
          <select value={leaveForm.leaveTypeId} onChange={(event) => onLeaveFormChange((prev) => ({ ...prev, leaveTypeId: normalizeArabicDigits(event.target.value) }))}>
            <option value="">اختر النوع</option>
            {leaveTypes.map((type) => <option key={type.id} value={type.id}>{text(type.name) || '—'}</option>)}
          </select>
          {errors.leaveTypeId ? <small className="field-error">{errors.leaveTypeId}</small> : null}
        </label>
        <label className="field">
          <span>من تاريخ</span>
          <input
            type="date"
            value={leaveForm.startDate}
            onChange={(event) => {
              const startDate = normalizeArabicDigits(event.target.value);
              onLeaveFormChange((prev) => ({ ...prev, startDate, daysCount: calculateInclusiveDays(startDate, prev.endDate) || prev.daysCount }));
            }}
          />
          {errors.startDate ? <small className="field-error">{errors.startDate}</small> : null}
        </label>
        <label className="field">
          <span>إلى تاريخ</span>
          <input
            type="date"
            value={leaveForm.endDate}
            onChange={(event) => {
              const endDate = normalizeArabicDigits(event.target.value);
              onLeaveFormChange((prev) => ({ ...prev, endDate, daysCount: calculateInclusiveDays(prev.startDate, endDate) || prev.daysCount }));
            }}
          />
          {errors.endDate ? <small className="field-error">{errors.endDate}</small> : null}
        </label>
        <label className="field">
          <span>عدد الأيام</span>
          <input inputMode="decimal" value={leaveForm.daysCount} onChange={(event) => onLeaveFormChange((prev) => ({ ...prev, daysCount: normalizeArabicDigits(event.target.value) }))} />
        </label>
        <label className="field field-wide">
          <span>السبب</span>
          <input value={leaveForm.reason} onChange={(event) => onLeaveFormChange((prev) => ({ ...prev, reason: event.target.value }))} />
        </label>
        <label className="field field-wide">
          <span>ملاحظات</span>
          <input value={leaveForm.notes} onChange={(event) => onLeaveFormChange((prev) => ({ ...prev, notes: event.target.value }))} />
        </label>
      </div>
      <div className="actions compact-actions" style={{ marginTop: 12 }}>
        <Button type="button" onClick={onCreate} disabled={isPending}>{isPending ? 'جاري الحفظ...' : 'حفظ الطلب'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
      </div>
    </Card>
  );
}
