import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { ErrorState } from '@/shared/ui/error-state';
import { useFirstRunSetupPageController } from '@/features/activation/hooks/useFirstRunSetupPageController';

export function FirstRunSetupPage() {
  const { error, form, handleSubmit, submitting, updateField } = useFirstRunSetupPageController();

  return (
    <div className="screen-center auth-screen-shell setup-screen-shell">
      <Card title="التهيئة الأولى" description="أكمل بيانات المنشأة وأنشئ أول مستخدم إدارة مرة واحدة فقط." className="activation-card setup-card">
        <form className="stack gap-16" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid two-columns gap-12">
            <Field label="اسم المنشأة"><input value={form.storeName} onChange={(event) => updateField('storeName', event.target.value)} /></Field>
            <Field label="اسم الفرع"><input value={form.branchName} onChange={(event) => updateField('branchName', event.target.value)} /></Field>
            <Field label="كود الفرع (اختياري)"><input value={form.branchCode} onChange={(event) => updateField('branchCode', event.target.value)} /></Field>
            <Field label="اسم المخزن"><input value={form.locationName} onChange={(event) => updateField('locationName', event.target.value)} /></Field>
            <Field label="كود المخزن (اختياري)"><input value={form.locationCode} onChange={(event) => updateField('locationCode', event.target.value)} /></Field>
            <Field label="اسم مسؤول النظام"><input value={form.adminDisplayName} onChange={(event) => updateField('adminDisplayName', event.target.value)} /></Field>
            <Field label="اسم المستخدم"><input value={form.adminUsername} onChange={(event) => updateField('adminUsername', event.target.value)} /></Field>
            <Field label="كلمة المرور"><input type="password" value={form.adminPassword} onChange={(event) => updateField('adminPassword', event.target.value)} /></Field>
          </div>
          {error ? <ErrorState title="فشل التهيئة" hint={error} /> : null}
          <div className="inline-actions inline-actions-end">
            <Button type="submit" disabled={submitting}>{submitting ? 'جارٍ تجهيز البرنامج...' : 'إنشاء الحساب وبدء الاستخدام'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
