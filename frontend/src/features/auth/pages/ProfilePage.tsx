import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { http } from '@/lib/http';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';

export function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);

  const [name, setName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
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
        body: JSON.stringify({ name, username })
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
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <header className="page-header" style={{ width: '100%', maxWidth: 600 }}>
        <h1 className="page-title" style={{ textAlign: 'center' }}>الملف الشخصي</h1>
      </header>

      <div className="stack gap-24" style={{ width: '100%', maxWidth: 600 }}>
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'center' }}>
            <h3 style={{ margin: 0 }}>بيانات المستخدم</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleProfileSubmit} className="stack gap-16" style={{ textAlign: 'start' }}>
              <Field label="الاسم">
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" required />
              </Field>
              <Field label="اسم المستخدم">
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="input" required dir="ltr" />
              </Field>
              <div style={{ marginTop: '1rem' }}>
                <Button type="submit" isLoading={isSavingProfile}>حفظ البيانات</Button>
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ justifyContent: 'center' }}>
            <h3 style={{ margin: 0 }}>تغيير كلمة المرور</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handlePasswordSubmit} className="stack gap-16" style={{ textAlign: 'start' }}>
              <Field label="كلمة المرور الحالية">
                <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="input" required dir="ltr" />
              </Field>
              <Field label="كلمة المرور الجديدة">
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" required dir="ltr" />
              </Field>
              <Field label="تأكيد كلمة المرور الجديدة">
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input" required dir="ltr" />
              </Field>
              <div style={{ marginTop: '1rem' }}>
                <Button type="submit" isLoading={isSavingPassword}>تغيير كلمة المرور</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
