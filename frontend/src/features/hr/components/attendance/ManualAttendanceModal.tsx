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
  if (!prompt) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="400px">
      <form className="document-prototype-section" onSubmit={onSubmit}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem' }}>
          تسجيل {prompt.type === 'check_in' ? 'حضور' : 'انصراف'} يدوي
        </h3>
        <div className="form-grid">
          <label className="field field-wide">
            <span>أدخل الوقت</span>
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
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isPending}>تسجيل</Button>
        </div>
      </form>
    </DialogShell>
  );
};
