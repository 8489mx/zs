import { useState, useEffect } from 'react';
import { useHrPayrollPolicies, useHrMutations, useHrHolidays } from '@/features/hr/hooks/useHr';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';

import { systemAlert } from '@/shared/components/system-alert';

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
    overtimeMultiplier: '1.5',
    hrDelayPolicyEnabled: false,
    hrDelayPolicyFirstTimeDeduction: '0.25',
    hrDelayPolicySecondTimeDeduction: '0.5',
    hrDelayPolicyThirdTimeDeduction: '1',
    hrDelayPolicyFourthTimeDeduction: '1',
    hrCommissionType: 'none',
    hrCommissionValue: '0',
    hrCommissionTarget: '0',
    hrSocialInsuranceEnabled: false,
    hrSocialInsuranceEmployeePct: '11',
    hrIncomeTaxEnabled: false,
    taxPersonalExemption: '20000',
    taxBrackets: [{"max":40000,"rate":0},{"max":55000,"rate":10},{"max":70000,"rate":15},{"max":200000,"rate":20},{"max":400000,"rate":22.5},{"max":999999999,"rate":25}],
    insuranceConfig: {"employeePct":11,"employerPct":18.75,"minSalary":2000,"maxSalary":12600},
    hrWeekendDays: 'friday,saturday',
  });

  useEffect(() => {
    if (policiesQuery.data) {
      setDraft({
        workHoursPerDay: String((policiesQuery.data as any).workHoursPerDay ?? '8'),
        latenessGracePeriodMinutes: String((policiesQuery.data as any).latenessGracePeriodMinutes ?? '15'),
        latenessPenaltyMultiplier: String((policiesQuery.data as any).latenessPenaltyMultiplier ?? '0.25'),
        absencePenaltyMultiplier: String((policiesQuery.data as any).absencePenaltyMultiplier ?? '1'),
        overtimeMultiplier: String((policiesQuery.data as any).overtimeMultiplier ?? '1.5'),
        hrDelayPolicyEnabled: (policiesQuery.data as any).hrDelayPolicyEnabled === true,
        hrDelayPolicyFirstTimeDeduction: String((policiesQuery.data as any).hrDelayPolicyFirstTimeDeduction ?? '0.25'),
        hrDelayPolicySecondTimeDeduction: String((policiesQuery.data as any).hrDelayPolicySecondTimeDeduction ?? '0.5'),
        hrDelayPolicyThirdTimeDeduction: String((policiesQuery.data as any).hrDelayPolicyThirdTimeDeduction ?? '1'),
        hrDelayPolicyFourthTimeDeduction: String((policiesQuery.data as any).hrDelayPolicyFourthTimeDeduction ?? '1'),
        hrCommissionType: String((policiesQuery.data as any).hrCommissionType || 'none'),
        hrCommissionValue: String((policiesQuery.data as any).hrCommissionValue || '0'),
        hrCommissionTarget: String((policiesQuery.data as any).hrCommissionTarget || '0'),
        hrSocialInsuranceEnabled: (policiesQuery.data as any).hrSocialInsuranceEnabled === true,
        hrSocialInsuranceEmployeePct: String((policiesQuery.data as any).hrSocialInsuranceEmployeePct ?? '11'),
        hrIncomeTaxEnabled: (policiesQuery.data as any).hrIncomeTaxEnabled === true,
        taxPersonalExemption: String((policiesQuery.data as any).taxPersonalExemption ?? '20000'),
        taxBrackets: (policiesQuery.data as any).taxBrackets || [{"max":40000,"rate":0},{"max":55000,"rate":10},{"max":70000,"rate":15},{"max":200000,"rate":20},{"max":400000,"rate":22.5},{"max":999999999,"rate":25}],
        insuranceConfig: (policiesQuery.data as any).insuranceConfig || {"employeePct":11,"employerPct":18.75,"minSalary":2000,"maxSalary":12600},
        hrWeekendDays: String((policiesQuery.data as any).hrWeekendDays || 'friday,saturday'),
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
      hrDelayPolicyEnabled: draft.hrDelayPolicyEnabled,
      hrDelayPolicyFirstTimeDeduction: Number(draft.hrDelayPolicyFirstTimeDeduction) || 0,
      hrDelayPolicySecondTimeDeduction: Number(draft.hrDelayPolicySecondTimeDeduction) || 0,
      hrDelayPolicyThirdTimeDeduction: Number(draft.hrDelayPolicyThirdTimeDeduction) || 0,
      hrDelayPolicyFourthTimeDeduction: Number(draft.hrDelayPolicyFourthTimeDeduction) || 0,
      hrCommissionType: draft.hrCommissionType,
      hrCommissionValue: Number(draft.hrCommissionValue) || 0,
      hrCommissionTarget: Number(draft.hrCommissionTarget) || 0,
      hrSocialInsuranceEnabled: draft.hrSocialInsuranceEnabled,
      hrSocialInsuranceEmployeePct: Number(draft.hrSocialInsuranceEmployeePct) || 0,
      hrIncomeTaxEnabled: draft.hrIncomeTaxEnabled,
      taxPersonalExemption: Number(draft.taxPersonalExemption) || 0,
      taxBrackets: draft.taxBrackets,
      insuranceConfig: draft.insuranceConfig,
      hrWeekendDays: draft.hrWeekendDays,
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
              <span>مضاعف الوقت الإضافي</span>
              <input type="number" step="0.1" value={draft.overtimeMultiplier} onChange={(e) => setDraft({ ...draft, overtimeMultiplier: e.target.value })} />
            </label>
          </div>
          <div style={{ marginTop: 24, marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 16 }}>سياسة التأخير التصاعدية</h4>
            <p className="muted" style={{ margin: '4px 0 12px' }}>تطبيق خصم تصاعدي لمرات التأخير المتكررة في نفس الشهر بدل الخصم المباشر للدقائق.</p>
          </div>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" checked={draft.hrDelayPolicyEnabled} onChange={(e) => setDraft({ ...draft, hrDelayPolicyEnabled: e.target.checked })} style={{ width: 18, height: 18 }} />
              <span>تفعيل سياسة التأخير التصاعدية</span>
            </label>
            {draft.hrDelayPolicyEnabled && (
              <>
                <label className="field">
                  <span>خصم التأخير الأول (يوم/ساعة)</span>
                  <input type="number" step="0.1" value={draft.hrDelayPolicyFirstTimeDeduction} onChange={(e) => setDraft({ ...draft, hrDelayPolicyFirstTimeDeduction: e.target.value })} />
                </label>
                <label className="field">
                  <span>خصم التأخير الثاني</span>
                  <input type="number" step="0.1" value={draft.hrDelayPolicySecondTimeDeduction} onChange={(e) => setDraft({ ...draft, hrDelayPolicySecondTimeDeduction: e.target.value })} />
                </label>
                <label className="field">
                  <span>خصم التأخير الثالث</span>
                  <input type="number" step="0.1" value={draft.hrDelayPolicyThirdTimeDeduction} onChange={(e) => setDraft({ ...draft, hrDelayPolicyThirdTimeDeduction: e.target.value })} />
                </label>
                <label className="field">
                  <span>خصم التأخير الرابع فأكثر</span>
                  <input type="number" step="0.1" value={draft.hrDelayPolicyFourthTimeDeduction} onChange={(e) => setDraft({ ...draft, hrDelayPolicyFourthTimeDeduction: e.target.value })} />
                </label>
              </>
            )}
          </div>
          <div style={{ marginTop: 24, marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 16 }}>نظام العمولة الافتراضي للمبيعات</h4>
            <p className="muted" style={{ margin: '4px 0 12px' }}>هذا النظام يطبق على كل موظفي المبيعات، ويمكن تعديله لكل موظف على حدة في ملفه.</p>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>النوع الافتراضي</span>
              <select value={draft.hrCommissionType} onChange={(e) => setDraft({ ...draft, hrCommissionType: e.target.value })}>
                <option value="none">بدون عمولة</option>
                <option value="percentage">نسبة من المبيعات</option>
                <option value="target_percentage">نسبة بعد تحقيق التارجت</option>
                <option value="fixed">مكافأة ثابتة بعد التارجت</option>
              </select>
            </label>
            {draft.hrCommissionType !== 'none' && (
              <label className="field">
                <span>قيمة العمولة ({draft.hrCommissionType === 'fixed' ? 'مبلغ' : '%'})</span>
                <input type="number" step="0.1" value={draft.hrCommissionValue} onChange={(e) => setDraft({ ...draft, hrCommissionValue: e.target.value })} />
              </label>
            )}
            {draft.hrCommissionType === 'target_percentage' && (
              <label className="field">
                <span>تارجت المبيعات الشهري الافتراضي</span>
                <input type="number" value={draft.hrCommissionTarget} onChange={(e) => setDraft({ ...draft, hrCommissionTarget: e.target.value })} />
              </label>
            )}
          </div>
          <div style={{ marginTop: 24, marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 16 }}>الضرائب والتأمينات (القيم الافتراضية)</h4>
            <p className="muted" style={{ margin: '4px 0 12px' }}>فعل هذه الخيارات لتطبيق استقطاعات التأمينات والضرائب بشكل تلقائي وقت إصدار المرتب.</p>
          </div>
          <div className="form-grid">
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" checked={draft.hrSocialInsuranceEnabled} onChange={(e) => setDraft({ ...draft, hrSocialInsuranceEnabled: e.target.checked })} style={{ width: 18, height: 18 }} />
              <span>تفعيل استقطاع التأمينات الاجتماعية</span>
            </label>
            {draft.hrSocialInsuranceEnabled && (
              <label className="field">
                <span>حصة الموظف في التأمينات (%)</span>
                <input type="number" step="0.1" value={draft.hrSocialInsuranceEmployeePct} onChange={(e) => setDraft({ ...draft, hrSocialInsuranceEmployeePct: e.target.value })} />
              </label>
            )}
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" checked={draft.hrIncomeTaxEnabled} onChange={(e) => setDraft({ ...draft, hrIncomeTaxEnabled: e.target.checked })} style={{ width: 18, height: 18 }} />
              <span>تفعيل ضريبة كسب العمل</span>
            </label>
          </div>
          <div style={{ marginTop: 24, marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 16 }}>أيام الراحة الأسبوعية</h4>
            <p className="muted" style={{ margin: '4px 0 12px' }}>الأيام التي لا يُحسب فيها غياب على الموظفين.</p>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>أيام الراحة (مفصولة بفاصلة إنجليزية)</span>
              <input type="text" value={draft.hrWeekendDays} onChange={(e) => setDraft({ ...draft, hrWeekendDays: e.target.value })} placeholder="مثال: friday,saturday" dir="ltr" />
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

export function HrSettingsHolidaysSection() {
  const holidaysQuery = useHrHolidays({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();
  const [draft, setDraft] = useState({ name: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');

  const holidays = (holidaysQuery.data as any)?.rows || [];

  async function handleSave() {
    const name = draft.name.trim();
    if (!name || !draft.startDate || !draft.endDate) {
      setError('الرجاء تعبئة جميع الحقول.');
      return;
    }
    setError('');
    try {
      await mutations.saveHoliday.mutateAsync({ payload: { name, startDate: draft.startDate, endDate: draft.endDate } });
      setDraft({ name: '', startDate: '', endDate: '' });
    } catch (e) {
      setError(getErrorMessage(e, 'تعذر حفظ العطلة.'));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('هل أنت متأكد من حذف هذه العطلة؟')) return;
    try {
      await mutations.deleteHoliday.mutateAsync(id);
    } catch (e) {
      systemAlert(getErrorMessage(e, 'تعذر حذف العطلة.'));
    }
  }

  return (
    <FormSection title="العطلات الرسمية" description="إدارة أيام العطلات التي لا يُحتسب فيها غياب للموظفين.">
      <QueryFeedback isLoading={holidaysQuery.isLoading} isError={holidaysQuery.isError} error={holidaysQuery.error} isEmpty={false}>
        <div className="card-soft" style={{ padding: 16 }}>
          <div className="form-grid">
            <label className="field">
              <span>اسم العطلة</span>
              <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="مثال: عيد الفطر" />
            </label>
            <label className="field">
              <span>من تاريخ</span>
              <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </label>
            <label className="field">
              <span>إلى تاريخ</span>
              <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </label>
          </div>
          {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}
          <div className="compact-actions" style={{ marginTop: 16, marginBottom: 24 }}>
            <Button type="button" onClick={() => void handleSave()} disabled={mutations.saveHoliday.isPending}>
              {mutations.saveHoliday.isPending ? 'جاري الحفظ...' : 'حفظ العطلة'}
            </Button>
          </div>
          
          {holidays.length > 0 ? (
            <DataTable 
              rows={holidays} 
              rowKey={(row) => String(row.id)} 
              density="compact" 
              columns={[
                { key: 'name', header: 'اسم العطلة', cell: (row: any) => row.name },
                { key: 'startDate', header: 'من تاريخ', cell: (row: any) => row.startDate },
                { key: 'endDate', header: 'إلى تاريخ', cell: (row: any) => row.endDate },
                { key: 'actions', header: '', cell: (row: any) => (
                  <Button type="button" variant="danger" onClick={() => void handleDelete(row.id)}>
                    حذف
                  </Button>
                )}
              ]}
            />
          ) : (
            <p className="muted">لا توجد عطلات مسجلة.</p>
          )}
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


