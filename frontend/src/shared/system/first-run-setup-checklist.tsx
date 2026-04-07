import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { queryKeys } from '@/app/query-keys';
import { referenceDataApi } from '@/services/reference-data.api';
import { settingsApi } from '@/features/settings/api/settings.api';
import { useAuthStore } from '@/stores/auth-store';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  to: string;
  actionLabel: string;
}

export function FirstRunSetupChecklist() {
  const user = useAuthStore((state) => state.user);
  const storeName = useAuthStore((state) => state.storeName);

  const shouldInspect = user?.role === 'super_admin';

  const [branchesQuery, locationsQuery, usersQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.branches, queryFn: referenceDataApi.branches, enabled: shouldInspect, staleTime: 60_000 },
      { queryKey: queryKeys.locations, queryFn: referenceDataApi.locations, enabled: shouldInspect, staleTime: 60_000 },
      { queryKey: queryKeys.settingsUsers, queryFn: settingsApi.users, enabled: shouldInspect, staleTime: 60_000 }
    ]
  });

  if (!shouldInspect) return null;

  const branches = branchesQuery.data || [];
  const locations = locationsQuery.data || [];
  const users = usersQuery.data || [];

  const activeOperationalAdmins = users.filter((candidate) => candidate.isActive !== false && candidate.role === 'admin');
  const setupItems: ChecklistItem[] = [
    {
      key: 'store-name',
      label: 'مراجعة اسم المنشأة والإعدادات الأساسية',
      done: Boolean(String(storeName || '').trim() && String(storeName || '').trim() !== 'Z Systems'),
      to: '/settings/core',
      actionLabel: 'افتح الإعدادات الأساسية'
    },
    ...(SINGLE_STORE_MODE
      ? [{
          key: 'store-setup',
          label: 'تعريف المتجر والمخزن الأساسي',
          done: branches.length > 0 && locations.length > 0,
          to: '/settings/reference',
          actionLabel: 'افتح بيانات المتجر والمخزن'
        }]
      : [{
          key: 'branch',
          label: 'إضافة أول فرع',
          done: branches.length > 0,
          to: '/settings/reference',
          actionLabel: 'افتح الفرع الرئيسي'
        }, {
          key: 'location',
          label: 'إضافة المخزن الأساسي',
          done: locations.length > 0,
          to: '/settings/reference',
          actionLabel: 'افتح المخزن الأساسي'
        }]),
    {
      key: 'admin',
      label: 'إنشاء Admin تشغيلي',
      done: activeOperationalAdmins.length > 0,
      to: '/settings/users',
      actionLabel: 'افتح فريق العمل'
    },
    {
      key: 'password',
      label: 'تغيير كلمة مرور حساب التثبيت',
      done: user?.usingDefaultAdminPassword !== true,
      to: '/settings/users',
      actionLabel: 'أمّن حساب التثبيت'
    }
  ];

  const completed = setupItems.filter((item) => item.done).length;
  const total = setupItems.length;
  const isLoading = [branchesQuery, locationsQuery, usersQuery].some((query) => query.isLoading);
  const hasError = [branchesQuery, locationsQuery, usersQuery].some((query) => query.isError);
  const show = hasError || completed < total || user?.usingDefaultAdminPassword === true;

  if (!show) return null;

  return (
    <Card
      title={SINGLE_STORE_MODE ? 'قبل أول عملية بيع' : 'قائمة تهيئة أول تشغيل'}
      actions={<span className="status-badge">{isLoading ? 'جاري الفحص...' : `${completed}/${total}`}</span>}
      className="first-run-checklist"
    >
      <div className="list-stack">
        {setupItems.map((item) => (
          <div key={item.key} className="list-row stacked-row first-run-checklist-row">
            <div>
              <strong>{item.done ? '✓ ' : '• '}{item.label}</strong>
            </div>
            {item.done ? (
              <span className="status-badge">مكتمل</span>
            ) : (
              <Link className="button button-secondary" to={item.to}>{item.actionLabel}</Link>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
