import { useState, useEffect } from 'react';
import { useHrPayrollPolicies, useHrMutations } from '@/features/hr/hooks/useHr';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/components/form-section';

type NavigateTo = (path: string) => void;

export function HrSettingsDocumentsSection({ navigate }: { navigate: NavigateTo }) {
  return (
    <FormSection title="المستندات" description="القوائم المتقدمة لأنواع المستندات وإعدادات الصلاحية.">
      <div className="card-soft" style={{ padding: 16 }}>
        <p className="muted" style={{ margin: '0 0 12px 0' }}>إدارة أنواع المستندات وتنبيهات انتهاء الصلاحية.</p>
        <div className="compact-actions"><Button type="button" variant="secondary" onClick={() => navigate('/hr/documents')}>الذهاب لصفحة المستندات</Button></div>
      </div>
    </FormSection>
  );
}

export function HrSettingsAttendanceSection({ navigate }: { navigate: NavigateTo }) {
  return (
    <FormSection title="الحضور والانصراف" description="إعدادات القواعد التشغيلية للحضور.">
      <div className="card-soft" style={{ padding: 16 }}>
        <p className="muted" style={{ margin: '0 0 12px 0' }}>تتضمن إعدادات الحضور، أجهزة البصمة، سياسات التأخير.</p>
        <div className="compact-actions"><Button type="button" variant="secondary" onClick={() => navigate('/hr/attendance')}>الذهاب لصفحة الحضور</Button></div>
      </div>
    </FormSection>
  );
}

export function HrSettingsPayrollSection({ navigate }: { navigate: NavigateTo }) {
  const policiesQuery = useHrPayrollPolicies();
  const mutations = useHrMutations();
  const [draft, setDraft] = useState({
    workHoursPerDay: '8',
    latenessGracePeriodMinutes: '15',
    latenessPenaltyMultiplier: '0.25',
    absencePenaltyMultiplier: '1',
    overtimeMultiplier: '1.5'
  });

  useEffect(() => {
    if (policiesQuery.data) {
      setDraft({
        workHoursPerDay: String((policiesQuery.data as any).workHoursPerDay ?? '8'),
        latenessGracePeriodMinutes: String((policiesQuery.data as any).latenessGracePeriodMinutes ?? '15'),
        latenessPenaltyMultiplier: String((policiesQuery.data as any).latenessPenaltyMultiplier ?? '0.25'),
        absencePenaltyMultiplier: String((policiesQuery.data as any).absencePenaltyMultiplier ?? '1'),
        overtimeMultiplier: String((policiesQuery.data as any).overtimeMultiplier ?? '1.5'),
      });
    }
  }, [policiesQuery.data]);

  async function handleSave() {
    await mutations.updatePayrollPolicies.mutateAsync({
      workHoursPerDay: Number(draft.workHoursPerDay) || 8,
      latenessGracePeriodMinutes: Number(draft.latenessGracePeriodMinutes) || 0,
      latenessPenaltyMultiplier: Number(draft.latenessPenaltyMultiplier) || 0,
      absencePenaltyMultiplier: Number(draft.absencePenaltyMultiplier) || 0,
      overtimeMultiplier: Number(draft.overtimeMultiplier) || 0,
    });
  }

  return (
    <FormSection title="المرتبات والحضور" description="إعدادات القواعد الحسابية وساعات العمل والخصومات.">
      <QueryFeedback isLoading={policiesQuery.isLoading} isError={policiesQuery.isError} error={policiesQuery.error} isEmpty={false}>
        <div className="card-soft" style={{ padding: 16 }}>
          <div className="form-grid">
            <label className="field">
              <span>ساعات العمل اليومية</span>
              <input type="number" step="0.5" value={draft.workHoursPerDay} onChange={(e) => setDraft({ ...draft, workHoursPerDay: e.target.value })} />
            </label>
            <label className="field">
              <span>فترة السماح للتأخير (دقائق)</span>
              <input type="number" value={draft.latenessGracePeriodMinutes} onChange={(e) => setDraft({ ...draft, latenessGracePeriodMinutes: e.target.value })} />
            </label>
            <label className="field">
              <span>مُعامل خصم التأخير</span>
              <input type="number" step="0.1" value={draft.latenessPenaltyMultiplier} onChange={(e) => setDraft({ ...draft, latenessPenaltyMultiplier: e.target.value })} />
            </label>
            <label className="field">
              <span>مُعامل خصم الغياب</span>
              <input type="number" step="0.1" value={draft.absencePenaltyMultiplier} onChange={(e) => setDraft({ ...draft, absencePenaltyMultiplier: e.target.value })} />
            </label>
            <label className="field">
              <span>مُعامل حساب الإضافي</span>
              <input type="number" step="0.1" value={draft.overtimeMultiplier} onChange={(e) => setDraft({ ...draft, overtimeMultiplier: e.target.value })} />
            </label>
          </div>
          <div className="compact-actions" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Button type="button" variant="primary" onClick={() => void handleSave()} disabled={mutations.updatePayrollPolicies.isPending}>
              {mutations.updatePayrollPolicies.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/loans')}>فتح السلف</Button>
          </div>
        </div>
      </QueryFeedback>
    </FormSection>
  );
}

export function HrSettingsOperationalNote() {
  return (
    <FormSection title="ملاحظة تشغيلية">
      <p className="muted" style={{ margin: 0 }}>
        نوصي بمراجعة وتحديث هذه الإعدادات دوريًا لضمان توافقها مع الهيكل الإداري للشركة، مما يقلل من الأخطاء أثناء إضافة الموظفين الجدد أو إعداد كشوف المرتبات.
      </p>
    </FormSection>
  );
}


