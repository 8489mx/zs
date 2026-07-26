import { FormEvent, useState } from 'react';
import { hrApi } from '@/features/hr/api/hr.api';
import { useQuery } from '@tanstack/react-query';
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

export function EndOfServiceModal({ employeeId, employeeName, isOpen, onClose, onSuccess }: Props) {
  const mutations = useHrMutations();
  const [endOfServiceDate, setEndOfServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endOfServiceReason, setEndOfServiceReason] = useState('');
  const [error, setError] = useState('');

    const previewQuery = useQuery({
    queryKey: ['eos-preview', employeeId, endOfServiceDate],
    queryFn: () => hrApi.getEndOfServicePreview(employeeId, endOfServiceDate),
    enabled: isOpen && !!endOfServiceDate,
  });

  const preview = previewQuery.data?.preview;

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
        payload: {
          endOfServiceDate,
          endOfServiceReason: endOfServiceReason.trim() || undefined,
        },
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
      <Card title="إنهاء خدمة الموظف" className="dialog-card">
      <div style={{ padding: '16px' }}>
      <form onSubmit={(e) => { void handleSubmit(e); }}>
        <p className="muted" style={{ marginBottom: 16 }}>
          أنت على وشك إنهاء خدمة الموظف <strong>{employeeName}</strong>.
          <br />
          سيتم تغيير حالة الموظف إلى "تم إنهاء الخدمة"، وسيتم إنهاء عقده النشط (إن وجد) بتاريخ اليوم أو التاريخ المحدد أدناه.
        </p>

        <div className="form-grid">
          <div className="field">
            <span>تاريخ إنهاء الخدمة</span>
            <input
              type="date"
              value={endOfServiceDate}
              onChange={(e) => setEndOfServiceDate(e.target.value)}
              required
            />
          </div>
          <div className="field field-wide">
            <span>السبب (اختياري)</span>
            <input
              type="text"
              value={endOfServiceReason}
              onChange={(e) => setEndOfServiceReason(e.target.value)}
              placeholder="مثال: استقالة، انتهاء العقد..."
            />
          </div>
        </div>

        
        {previewQuery.isLoading ? <div style={{ margin: '20px 0', textAlign: 'center' }}>جاري الحساب...</div> : null}
        {preview && !previewQuery.isLoading ? (
          <div style={{ margin: '20px 0', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, backgroundColor: 'var(--surface-color)' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>تفاصيل التسوية المالية</h4>
            <table className="table" style={{ width: '100%', marginBottom: 0 }}>
              <tbody>
                <tr><td>تاريخ التعيين</td><td>{preview.hireDate?.slice(0,10)}</td></tr>
                <tr><td>تاريخ إنهاء الخدمة</td><td>{preview.endDate}</td></tr>
                <tr><td>سنوات الخدمة</td><td>{preview.yearsWorked} سنة</td></tr>
                <tr><td>الراتب الأساسي</td><td>{preview.baseSalary} ج.م</td></tr>
                <tr><td>أجر اليوم الواحد</td><td>{preview.dailyRate} ج.م</td></tr>
                <tr><td>مكافأة نهاية الخدمة (قانون العمل)</td><td>{preview.severancePay} ج.م</td></tr>
                <tr><td>رصيد الإجازات المتبقي</td><td>{preview.remainingLeaves} يوم</td></tr>
                <tr><td>بدل نقدي للإجازات</td><td>{preview.leaveEncashment} ج.م</td></tr>
                <tr><td>سلف غير مسددة (تخصم)</td><td style={{ color: 'var(--danger-color)' }}>{preview.unpaidLoans} ج.م</td></tr>
                <tr style={{ fontWeight: 'bold', fontSize: '1.1em', backgroundColor: 'var(--border-color)' }}>
                  <td>إجمالي التسوية المستحقة للموظف</td>
                  <td>{preview.finalSettlementAmount} ج.م</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        {error ? <div className="error-box" style={{ marginTop: 12 }}>{error}</div> : null}

        <div className="actions compact-actions" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isPending} className="danger">
            {isPending ? 'جاري التنفيذ...' : 'تأكيد إنهاء الخدمة'}
          </Button>
        </div>
      </form>
      </div>
      </Card>
    </DialogShell>
  );
}
