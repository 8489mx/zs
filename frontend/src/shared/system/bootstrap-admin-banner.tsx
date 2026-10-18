import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export function BootstrapAdminBanner() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const show = user?.role === 'super_admin' && user?.usingDefaultAdminPassword === true;
  const inSetupFlow = location.pathname.startsWith('/settings/') && location.search.includes('setup=1');

  if (!show || inSetupFlow) return null;

  return (
    <div className="system-banner system-banner-warning" role="status">
      {t('shared.system.bootstrap_admin_banner.s0', "حساب التثبيت")} <strong>{user?.username}</strong> {t('shared.system.bootstrap_admin_banner.s1', "ما زال بكلمة المرور الافتراضية. أنشئ مستخدم إدارة للعمل اليومي من")} <Link to="/settings/users?setup=1">{t('shared.system.bootstrap_admin_banner.s2', "إدارة المستخدمين")}</Link> {t('shared.system.bootstrap_admin_banner.s3', "ثم غيّر كلمة مرور حساب الإدارة الرئيسي.")}
    </div>
  );
}
