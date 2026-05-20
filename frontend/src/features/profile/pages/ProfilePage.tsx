import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { useAuthStore } from '@/stores/auth-store';

function getInitial(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'م';
  return Array.from(trimmed)[0] || 'م';
}

function getRoleLabel(role?: string | null) {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'مدير النظام';
    case 'cashier':
      return 'أمين الصندوق';
    default:
      return 'مدير النظام';
  }
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const displayName = useMemo(() => user?.displayName || user?.username || 'محمود', [user]);
  const email = useMemo(() => user?.username || 'user@example.com', [user]);
  const roleLabel = useMemo(() => getRoleLabel(user?.role), [user?.role]);
  const avatarInitial = useMemo(() => getInitial(displayName), [displayName]);
  const [language, setLanguage] = useState('ar');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('تم حفظ التفضيلات محليًا');
  }

  return (
    <div className="page-stack page-shell profile-page" dir="rtl">
      <div className="stack gap-6">
        <h1>الملف الشخصي</h1>
        <p className="muted">عرض سريع لمعلومات الحساب مع إعدادات أساسية يمكن حفظها محليًا في هذا النموذج التجريبي.</p>
      </div>

      {message ? <div className="success-box" role="status">{message}</div> : null}

      <div className="two-column-grid profile-page-grid">
        <Card title="بيانات الحساب" description="معلومات التعريف الأساسية واللغة المفضلة">
          <div className="page-stack" style={{ gap: 14 }}>
            <div className="profile-user-identity" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 900,
                  flex: '0 0 auto',
                  boxShadow: '0 14px 28px rgba(37, 99, 235, 0.18)',
                }}
              >
                {avatarInitial}
              </div>
              <div className="page-stack" style={{ gap: 4, minWidth: 0 }}>
                <strong style={{ fontSize: 18 }}>{displayName}</strong>
                <span className="muted">{email}</span>
                <span className="muted small">{roleLabel}</span>
              </div>
            </div>

            <Field label="لغة الواجهة">
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card title="تغيير كلمة المرور" description="يمكنك تحديث كلمة المرور من هنا، والتجربة تبقى محلية فقط">
          <form className="page-stack" onSubmit={handleSave}>
            <Field label="كلمة المرور الحالية">
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </Field>
            <Field label="كلمة المرور الجديدة">
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </Field>
            <Field label="تأكيد كلمة المرور">
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button type="submit" variant="primary">حفظ التغييرات</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
