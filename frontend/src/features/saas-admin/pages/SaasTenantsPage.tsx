import { Navigate } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
import { Field } from '@/shared/ui/field';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { StatsGrid } from '@/shared/components/stats-grid';
import { TenantDataTable } from '../components/TenantDataTable';
import { TenantCredentialsHero } from '../components/TenantCredentialsHero';
import { TenantModalsManager } from '../components/TenantModalsManager';
import { useSaasTenants } from '../hooks/useSaasTenants';

export function SaasTenantsPage() {
  const vm = useSaasTenants();

  if (!vm.canAccess) return <Navigate to="/" replace />;

  return (
    <div className="page-stack page-shell saas-tenants-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title="إدارة النسخ والمستأجرين"
          description="لوحة التحكم المركزية لإنشاء ومتابعة واشتراكات نسخ العملاء السحابية."
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
              <span>إنشاء نسخة تجريبية</span>
            </button>
          }
        />

        {vm.feedback ? <div className={vm.isForbiddenByApi ? 'warning-box' : 'success-box'}>{vm.feedback}</div> : null}
        {vm.isForbiddenByApi ? <div className="warning-box">هذه الصفحة مخصّصة لإدارة المنصة فقط.</div> : null}

        <TenantCredentialsHero
          result={vm.ownerResetResult}
          onClose={() => vm.setOwnerResetResult(null)}
          onCopy={vm.copyToClipboard}
        />

        <FormSection title="نسخ العملاء المسجلة">
          <SearchToolbar
            search={vm.search}
            onSearchChange={vm.setSearch}
            searchPlaceholder="ابحث بالاسم أو slug أو المالك أو رقم الهاتف..."
          >
            <Field label="فلترة حسب الحالة">
              <select value={vm.status} onChange={(event) => vm.setStatus(event.target.value as any)}>
                <option value="all">جميع الحالات (الكل)</option>
                <option value="trial">تجريبية (Trial)</option>
                <option value="active">مفعلة (Active)</option>
                <option value="expired">منتهية (Expired)</option>
                <option value="suspended">موقوفة (Suspended)</option>
              </select>
            </Field>
          </SearchToolbar>

          <StatsGrid items={vm.stats} className="stats-grid compact-grid saas-stats-grid-5" />

          {/* Quick Filter Tabs */}
          <div className="saas-filter-tabs">
            <button
              type="button"
              className={`saas-filter-tab-btn ${vm.tabFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => vm.setTabFilter('all')}
            >
              <span>جميع النسخ</span>
              <span className="saas-filter-badge">{vm.allTenants.length}</span>
            </button>
            <button
              type="button"
              className={`saas-filter-tab-btn ${vm.tabFilter === 'active' ? 'is-active' : ''}`}
              onClick={() => vm.setTabFilter('active')}
            >
              <span>مفعلة (نشطة)</span>
              <span className="saas-filter-badge">{vm.allTenants.filter((r) => r.status === 'active').length}</span>
            </button>
            <button
              type="button"
              className={`saas-filter-tab-btn ${vm.tabFilter === 'trial' ? 'is-active' : ''}`}
              onClick={() => vm.setTabFilter('trial')}
            >
              <span>تجريبية</span>
              <span className="saas-filter-badge">{vm.allTenants.filter((r) => r.status === 'trial').length}</span>
            </button>
            <button
              type="button"
              className={`saas-filter-tab-btn ${vm.tabFilter === 'expiring_soon' ? 'is-active' : ''}`}
              onClick={() => vm.setTabFilter('expiring_soon')}
              style={vm.tabFilter !== 'expiring_soon' ? { borderColor: '#fed7aa', color: '#c2410c' } : {}}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>تنتهي قريباً (≤ 7 أيام)</span>
              <span className="saas-filter-badge" style={{ background: '#ffedd5', color: '#9a3412' }}>
                {vm.allTenants.filter((r) => vm.isExpiringSoon(r)).length}
              </span>
            </button>
            <button
              type="button"
              className={`saas-filter-tab-btn ${vm.tabFilter === 'blocked' ? 'is-active' : ''}`}
              onClick={() => vm.setTabFilter('blocked')}
            >
              <span>منتهية / موقوفة</span>
              <span className="saas-filter-badge">
                {vm.allTenants.filter((r) => r.status === 'expired' || r.status === 'suspended' || vm.isExpiringSoon(r) === false && r.subscriptionEndDate && new Date(r.subscriptionEndDate).getTime() < Date.now()).length}
              </span>
            </button>
          </div>

          <QueryFeedback
            isLoading={vm.tenantsQuery.isLoading}
            isError={vm.tenantsQuery.isError}
            error={vm.tenantsQuery.error}
            isEmpty={!vm.filteredTenants.length}
            loadingText="جاري تحميل قائمة النسخ والمستأجرين..."
            errorTitle={vm.isForbiddenByApi ? 'غير مسموح' : 'تعذر تحميل نسخ العملاء'}
            emptyTitle="لا توجد نسخ مطابقة"
            emptyHint="جرّب تعديل معايير البحث أو أنشئ نسخة تجريبية جديدة."
          >
            <TenantDataTable
              tenants={vm.filteredTenants}
              platformTenantId={vm.platformTenantId}
              currentTenantId={vm.currentTenantId}
              isImpersonating={vm.impersonateMutation.isPending}
              onImpersonate={(id, name) => {
                if (window.confirm(`هل تريد تسجيل الدخول وتصفح نسخة (${name}) كمالك؟`)) {
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
