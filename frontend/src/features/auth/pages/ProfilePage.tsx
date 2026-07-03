import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { http } from '@/lib/http';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';

export function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);

  const [name, setName] = useState(user?.displayName || '');
  const username = user?.username || '';
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await http<any>('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      if (res.user) {
        updateUser(res.user);
      }
      alert('تم تحديث البيانات بنجاح');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    
    setIsSavingPassword(true);
    try {
      await http('/api/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword })
      });
      alert('تم تغيير كلمة المرور بنجاح');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="page-stack page-shell profile-page" dir="rtl">
      <main className="document-prototype-column" style={{ maxWidth: '800px' }}>
        <PageHeader title="الملف الشخصي" description="تحديث بيانات حسابك وتغيير كلمة المرور" />

        <div className="stack gap-24">
          <FormSection title="بيانات المستخدم" className="profile-section">
            <form onSubmit={handleProfileSubmit} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <Field label="الاسم">
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" required />
              </Field>
              <Field label="اسم المستخدم">
                <input type="text" value={username} disabled className="input" title="لا يمكن تغيير اسم المستخدم لأسباب أمنية" dir="ltr" />
              </Field>
              <div className="actions" style={{ gridColumn: '1 / -1' }}>
                <Button type="submit" variant="primary" disabled={isSavingProfile}>حفظ البيانات</Button>
              </div>
            </form>
          </FormSection>

          <FormSection title="تغيير كلمة المرور" className="profile-section">
            <form onSubmit={handlePasswordSubmit} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <Field label="كلمة المرور الحالية">
                <input type="text" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="input secure-password-field" required dir="ltr" />
              </Field>
              <Field label="كلمة المرور الجديدة">
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input secure-password-field" required dir="ltr" />
              </Field>
              <Field label="تأكيد كلمة المرور الجديدة">
                <input type="text" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input secure-password-field" required dir="ltr" />
              </Field>
              <div className="actions" style={{ gridColumn: '1 / -1' }}>
                <Button type="submit" variant="primary" disabled={isSavingPassword}>تغيير كلمة المرور</Button>
              </div>
            </form>
          </FormSection>
        </div>
      </main>
    </div>
  );
}
