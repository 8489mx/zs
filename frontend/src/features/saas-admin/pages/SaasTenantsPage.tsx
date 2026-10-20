import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { TenantDataTable } from '../components/TenantDataTable';
import { TenantCredentialsHero } from '../components/TenantCredentialsHero';
import { TenantModalsManager } from '../components/TenantModalsManager';
import { systemConfirm } from '@/shared/components/system-alert';
import { useSaasTenants } from '../hooks/useSaasTenants';

export function SaasTenantsPage() {
  const { t } = useTranslation();
  const vm = useSaasTenants();

  if (!vm.canAccess) return <Navigate to="/" replace />;

  return (
    <div className="page-stack page-shell saas-tenants-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title={t('saas_admin.saas_tenants_page.s0', "إدارة النسخ والمستأجرين")}
          description={t('saas_admin.saas_tenants_page.s1', "لوحة التحكم المركزية لإنشاء ومتابعة واشتراكات نسخ العملاء السحابية.")}
          badge={<span className="nav-pill" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }}>SaaS Admin</span>}
          actions={
            <button 
              type="button" 
              className="button"
              style={{
                background: 'linear-gradient(135deg, #170c5c 0%, #312e81 100%)',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontWeight: 800,
              }}
              onClick={() => vm.setIsCreateOpen(true)}
            >
              <span>+</span>
              <span>{t('saas_admin.saas_tenants_page.s2', "إنشاء نسخة تجريبية")}</span>
            </button>
          }
        />

        {vm.feedback ? <div className={vm.isForbiddenByApi ? 'warning-box' : 'success-box'}>{vm.feedback}</div> : null}
        {vm.isForbiddenByApi ? <div className="warning-box">{t('saas_admin.saas_tenants_page.s3', "هذه الصفحة مخصّصة لإدارة المنصة فقط.")}</div> : null}

        <TenantCredentialsHero
          result={vm.ownerResetResult}
          onClose={() => vm.setOwnerResetResult(null)}
          onCopy={vm.copyToClipboard}
        />

        <FormSection title={t('saas_admin.saas_tenants_page.s4', "نسخ العملاء المسجلة")}>
          <SearchToolbar
            search={vm.search}
            onSearchChange={vm.setSearch}
            searchPlaceholder={t('saas_admin.saas_tenants_page.s5', "ابحث بالاسم أو المعرّف (slug) أو المالك أو رقم الهاتف...")}
          />

          {/* بطاقات التصفية الإحصائية التفاعلية (Monochrome Executive Metric Cards) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
              gap: '10px',
              margin: '12px 0 16px',
            }}
          >
            {[
              {
                key: 'all' as const,
                label: t('saas_admin.saas_tenants_page.s12', "جميع النسخ"),
                count: vm.allTenants.length,
                pill: 'الكل',
                pillColor: '#475569',
                pillBg: '#f1f5f9',
              },
              {
                key: 'active' as const,
                label: t('saas_admin.saas_tenants_page.s13', "مفعلة (نشطة)"),
                count: vm.allTenants.filter((r) => r.status === 'active').length,
                pill: 'نشطة',
                pillColor: '#166534',
                pillBg: '#f0fdf4',
              },
              {
                key: 'trial' as const,
                label: t('saas_admin.saas_tenants_page.s14', "تجريبية"),
                count: vm.allTenants.filter((r) => r.status === 'trial').length,
                pill: 'Trial',
                pillColor: '#1e40af',
                pillBg: '#eff6ff',
              },
              {
                key: 'expiring_soon' as const,
                label: t('saas_admin.saas_tenants_page.s15', "تنتهي قريباً (≤ 7 أيام)"),
                count: vm.allTenants.filter((r) => vm.isExpiringSoon(r)).length,
                pill: 'تنبيه',
                pillColor: '#9a3412',
                pillBg: '#fff7ed',
              },
              {
                key: 'blocked' as const,
                label: t('saas_admin.saas_tenants_page.s16', "منتهية / موقوفة"),
                count: vm.allTenants.filter((r) => r.status === 'expired' || r.status === 'suspended' || (vm.isExpiringSoon(r) === false && r.subscriptionEndDate && new Date(r.subscriptionEndDate).getTime() < Date.now())).length,
                pill: 'متوقفة',
                pillColor: '#64748b',
                pillBg: '#f1f5f9',
              },
            ].map((tab) => {
              const isSelected = vm.tabFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vm.setTabFilter(tab.key)}
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: isSelected ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                    boxShadow: isSelected ? '0 2px 8px rgba(23, 14, 94, 0.08), inset 0 2px 0 #170e5e' : '0 1px 2px rgba(0,0,0,0.02)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    textAlign: 'start',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#170e5e' : '#64748b' }}>
                      {tab.label}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px', color: '#0f172a' }}>
                      {tab.count}
                    </div>
                  </div>
                  <span style={{
                    background: tab.pillBg,
                    color: tab.pillColor,
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    border: `1px solid ${isSelected ? '#cbd5e1' : 'transparent'}`,
                  }}>
                    {tab.pill}
                  </span>
                </button>
              );
            })}
          </div>

          <QueryFeedback
            isLoading={vm.tenantsQuery.isLoading}
            isError={vm.tenantsQuery.isError}
            error={vm.tenantsQuery.error}
            isEmpty={!vm.filteredTenants.length}
            loadingText={t('saas_admin.saas_tenants_page.s17', "جاري تحميل قائمة النسخ والمستأجرين...")}
            errorTitle={vm.isForbiddenByApi ? t('saas_admin.saas_tenants_page.s18', "غير مسموح") : t('saas_admin.saas_tenants_page.s19', "تعذر تحميل نسخ العملاء")}
            emptyTitle={t('saas_admin.saas_tenants_page.s20', "لا توجد نسخ مطابقة")}
            emptyHint={t('saas_admin.saas_tenants_page.s21', "جرّب تعديل معايير البحث أو أنشئ نسخة تجريبية جديدة.")}
          >
            <TenantDataTable
              tenants={vm.filteredTenants}
              platformTenantId={vm.platformTenantId}
              currentTenantId={vm.currentTenantId}
              isImpersonating={vm.impersonateMutation.isPending}
              onImpersonate={async (id, name) => {
                const confirmed = await systemConfirm({
                  title: t('saas_admin.saas_tenants_page.s22', "تسجيل الدخول كمالك للنسخة"),
                  message: `هل تريد تسجيل الدخول وتصفح نسخة (${name}) كمالك؟`,
                  variant: 'info',
                  confirmText: t('saas_admin.saas_tenants_page.s23', "تصفح كمالك"),
                  cancelText: t('saas_admin.saas_tenants_page.s24', "إلغاء"),
                });
                if (confirmed) {
                  vm.impersonateMutation.mutate(id);
                }
              }}
              onShowDetails={(id) => vm.setDetailsTenantId(id)}
              onShowSubscriptions={(r) => vm.setSubscriptionsTenant(r)}
              onShareWelcome={(r) => vm.setWelcomeShareTenant({ tenant: r })}
              onRenew={(r) => {
                vm.setRenewTenant({ id: r.id, name: r.businessName || r.slug });
                vm.setRenewPlanId('');
                vm.setRenewPaymentAmount('');
              }}
              onOpenActionHub={(r) => vm.setActionHubTenant(r)}
            />
          </QueryFeedback>
        </FormSection>
      </main>

      <TenantModalsManager vm={vm} />
    </div>
  );
}
