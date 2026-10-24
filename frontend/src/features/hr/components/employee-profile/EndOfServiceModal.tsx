import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { useHrMutations } from '@/features/hr/hooks/useHr';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  employeeId: string;
  employeeName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function todayInBrowserCalendar(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** This is ONLY an administrative termination, never a gratuity preview.
 * Official wage/leave/EOS settlement is handled by /hr/settlements.
 */
export function EndOfServiceModal({ employeeId, employeeName, isOpen, onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [endOfServiceDate, setEndOfServiceDate] = useState(todayInBrowserCalendar);
  const [endOfServiceReason, setEndOfServiceReason] = useState('');
  const [error, setError] = useState('');
  const isPending = mutations.endOfService.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!endOfServiceDate) {
      setError('تاريخ إنهاء الخدمة مطلوب.');
      return;
    }
    try {
      await mutations.endOfService.mutateAsync({
        id: employeeId,
        payload: { endOfServiceDate, endOfServiceReason: endOfServiceReason.trim() || undefined },
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر إنهاء خدمة الموظف'));
    }
  }

  if (!isOpen) return null;

  return (
    <DialogShell open={isOpen} onClose={onClose} width="500px">
      <Card title="إنهاء الخدمة الإداري المباشر" className="dialog-card">
        <div style={{ padding: 16 }}>
          <p className="muted" style={{ marginBottom: 12 }}>
            أنت على وشك إنهاء خدمة الموظف <strong>{employeeName}</strong> وتحديث حالة الموظف وعقوده.
          </p>
          <p style={{ padding: 12, background: 'var(--bg-subtle)', borderRadius: 8, marginBottom: 16 }}>
            <strong>هذه العملية لا تحسب أو تصرف مكافأة نهاية الخدمة.</strong>
            {' '}أي مستحقات، إجازات، رواتب غير مصروفة أو سلف يجب تسويتها ومراجعتها أولاً من شاشة المخالصات.
            النظام سيمنع الإنهاء المباشر عند وجود عهد أو سلف أو مخالصة غير مقفلة أو تعارض مع مرتب معتمد.
          </p>
          <div style={{ marginBottom: 16 }}>
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => { onClose(); navigate('/hr/settlements'); }}>
              فتح مخالصات نهاية الخدمة
            </Button>
          </div>
          <form onSubmit={(e) => { void handleSubmit(e); }}>
            <div className="form-grid">
              <label className="field">
                <span>تاريخ إنهاء الخدمة الفعلي</span>
                <input type="date" value={endOfServiceDate} onChange={e => setEndOfServiceDate(e.target.value)} required />
              </label>
              <label className="field field-wide">
                <span>سبب إنهاء الخدمة</span>
                <input type="text" value={endOfServiceReason} onChange={e => setEndOfServiceReason(e.target.value)} placeholder="مثال: استقالة، انتهاء العقد" />
              </label>
            </div>
            {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}
            <div className="actions compact-actions" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>إلغاء</Button>
              <Button type="submit" disabled={isPending} className="danger">
                {isPending ? 'جاري التنفيذ...' : 'تأكيد الإنهاء الإداري'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </DialogShell>
  );
}
