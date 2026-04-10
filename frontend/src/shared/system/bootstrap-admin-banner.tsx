import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export function BootstrapAdminBanner() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const show = user?.role === 'super_admin' && user?.usingDefaultAdminPassword === true;
  const inSetupFlow = location.pathname.startsWith('/settings/') && location.search.includes('setup=1');

  if (!show || inSetupFlow) return null;

  return (
    <div className="system-banner system-banner-warning" role="status">
      حساب التثبيت <strong>{user?.username}</strong> ما زال بكلمة المرور الافتراضية. أنشئ مستخدم إدارة للعمل اليومي من <Link to="/settings/users?setup=1">إدارة المستخدمين</Link> ثم غيّر كلمة مرور حساب الإدارة الرئيسي.
    </div>
  );
}
