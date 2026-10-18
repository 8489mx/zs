import { useTranslation } from 'react-i18next';
import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import type { ManualAttendancePrompt } from './attendance-types';

interface ManualAttendanceModalProps {
  prompt: ManualAttendancePrompt;
  timeInput: string;
  setTimeInput: (val: string) => void;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  prompt,
  timeInput,
  setTimeInput,
  isPending,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  if (!prompt) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="400px">
      <form className="document-prototype-section" onSubmit={onSubmit}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem' }}>
          {t('hr.attendance.manual_attendance_modal.s0', "تسجيل")} {prompt.type === 'check_in' ? t('hr.attendance.manual_attendance_modal.s1', "حضور") : t('hr.attendance.manual_attendance_modal.s2', "انصراف")} {t('hr.attendance.manual_attendance_modal.s3', "يدوي")}
        </h3>
        <div className="form-grid">
          <label className="field field-wide">
            <span>{t('hr.attendance.manual_attendance_modal.s4', "أدخل الوقت")}</span>
            <input
              type="time"
              required
              autoFocus
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
            />
          </label>
        </div>
        <div className="actions compact-actions" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>{t('hr.attendance.manual_attendance_modal.s5', "إلغاء")}</Button>
          <Button type="submit" disabled={isPending}>{t('hr.attendance.manual_attendance_modal.s6', "تسجيل")}</Button>
        </div>
      </form>
    </DialogShell>
  );
};
