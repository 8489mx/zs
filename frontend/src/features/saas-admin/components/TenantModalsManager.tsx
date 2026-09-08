import React from 'react';
import { CreateTrialTenantModal } from './CreateTrialTenantModal';
import { ResetTenantPasswordModal } from './ResetTenantPasswordModal';
import { UpgradeTenantModal } from './UpgradeTenantModal';
import { RenewTenantModal } from './RenewTenantModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { TenantDetailsModal } from './TenantDetailsModal';
import { UpdateTenantPlanModal } from './UpdateTenantPlanModal';
import { TenantSubscriptionsModal } from './TenantSubscriptionsModal';
import { TenantWelcomeShareModal } from './TenantWelcomeShareModal';
import { TenantActionHubModal } from './TenantActionHubModal';
import { EditTenantSlugModal } from './EditTenantSlugModal';
import { SeedTenantDemoModal } from './SeedTenantDemoModal';
import { WipeTenantDataModal } from './WipeTenantDataModal';
import { useSaasTenants } from '../hooks/useSaasTenants';

type UseSaasTenantsReturn = ReturnType<typeof useSaasTenants>;

interface TenantModalsManagerProps {
  vm: UseSaasTenantsReturn;
}

export const TenantModalsManager: React.FC<TenantModalsManagerProps> = ({ vm }) => {
  return (
    <>
      <CreateTrialTenantModal
        open={vm.isCreateOpen}
        onClose={() => vm.setIsCreateOpen(false)}
        featurePlans={vm.featurePlans}
        onShareWelcome={(data) => vm.setWelcomeShareTenant(data)}
        onSuccessFeedback={(msg) => vm.setFeedback(msg)}
      />

      <ResetTenantPasswordModal
        tenant={vm.resetTenant}
        password={vm.resetPassword}
        onChangePassword={vm.setResetPassword}
        onClose={() => vm.setResetTenant(null)}
        onSubmit={() => {
          if (vm.resetTenant) {
            vm.resetOwnerPasswordMutation.mutate({
              tenantId: vm.resetTenant.id,
              tenantName: vm.resetTenant.name,
              newPassword: vm.resetPassword,
            });
            vm.setResetTenant(null);
          }
        }}
        isPending={vm.resetOwnerPasswordMutation.isPending}
      />

      <UpgradeTenantModal
        tenant={vm.upgradeTenant}
        onClose={() => vm.setUpgradeTenant(null)}
        plans={vm.plans}
        planId={vm.upgradePlanId}
        onChangePlanId={vm.setUpgradePlanId}
        duration={vm.upgradeDuration}
        onChangeDuration={vm.setUpgradeDuration}
        paymentAmount={vm.upgradePaymentAmount}
        onChangePaymentAmount={vm.setUpgradePaymentAmount}
        paymentMethod={vm.upgradePaymentMethod}
        onChangePaymentMethod={vm.setUpgradePaymentMethod}
        onSubmit={() => {
          if (vm.upgradeTenant) {
            vm.tenantActionMutation.mutate({
              action: 'activate',
              tenantId: vm.upgradeTenant.id,
              durationMonths: vm.upgradeDuration,
              planId: vm.upgradePlanId || undefined,
              paymentAmount: vm.upgradePaymentAmount ? Number(vm.upgradePaymentAmount) : undefined,
              paymentMethod: vm.upgradePaymentMethod,
            });
            vm.setUpgradeTenant(null);
          }
        }}
        isPending={vm.tenantActionMutation.isPending}
      />

      <RenewTenantModal
        tenant={vm.renewTenant}
        onClose={() => vm.setRenewTenant(null)}
        plans={vm.plans}
        planId={vm.renewPlanId}
        onChangePlanId={vm.setRenewPlanId}
        duration={vm.renewDuration}
        onChangeDuration={vm.setRenewDuration}
        paymentAmount={vm.renewPaymentAmount}
        onChangePaymentAmount={vm.setRenewPaymentAmount}
        paymentMethod={vm.renewPaymentMethod}
        onChangePaymentMethod={vm.setRenewPaymentMethod}
        onSubmit={() => {
          if (vm.renewTenant) {
            vm.renewMutation.mutate({
              tenantId: vm.renewTenant.id,
              durationMonths: vm.renewDuration,
              planId: Number(vm.renewPlanId),
              paymentAmount: vm.renewPaymentAmount ? Number(vm.renewPaymentAmount) : undefined,
              paymentMethod: vm.renewPaymentMethod,
            });
            vm.setRenewTenant(null);
          }
        }}
        isPending={vm.renewMutation.isPending}
      />

      <RecordPaymentModal
        tenant={vm.recordPaymentTenant}
        onClose={() => vm.setRecordPaymentTenant(null)}
        amount={vm.paymentAmount}
        onChangeAmount={vm.setPaymentAmount}
        currency={vm.paymentCurrency}
        onChangeCurrency={vm.setPaymentCurrency}
        method={vm.paymentMethod}
        onChangeMethod={vm.setPaymentMethod}
        reference={vm.paymentReference}
        onChangeReference={vm.setPaymentReference}
        onSubmit={() => {
          if (vm.recordPaymentTenant) {
            vm.recordPaymentMutation.mutate({
              tenantId: vm.recordPaymentTenant.id,
              amount: Number(vm.paymentAmount),
              currency: vm.paymentCurrency,
              method: vm.paymentMethod,
              reference: vm.paymentReference,
            });
            vm.setRecordPaymentTenant(null);
          }
        }}
        isPending={vm.recordPaymentMutation.isPending}
      />

      {vm.detailsTenantId && (
        <TenantDetailsModal
          tenantId={vm.detailsTenantId}
          onClose={() => vm.setDetailsTenantId(null)}
        />
      )}

      {vm.updatePlanTenant && (
        <UpdateTenantPlanModal
          tenant={vm.updatePlanTenant}
          onClose={() => vm.setUpdatePlanTenant(null)}
          onSuccess={(msg) => {
            vm.setFeedback(msg);
            vm.setUpdatePlanTenant(null);
          }}
        />
      )}

      {vm.subscriptionsTenant && (
        <TenantSubscriptionsModal
          tenant={vm.subscriptionsTenant}
          onClose={() => vm.setSubscriptionsTenant(null)}
          onRenew={(r) => {
            vm.setSubscriptionsTenant(null);
            vm.setRenewTenant({ id: r.id, name: r.businessName || r.slug });
            vm.setRenewPlanId('');
            vm.setRenewPaymentAmount('');
          }}
          onRecordPayment={(r) => {
            vm.setSubscriptionsTenant(null);
            vm.setRecordPaymentTenant({ id: r.id, name: r.businessName || r.slug });
            vm.setPaymentAmount('');
            vm.setPaymentReference('');
          }}
        />
      )}

      {vm.welcomeShareTenant && (
        <TenantWelcomeShareModal
          tenant={vm.welcomeShareTenant.tenant}
          temporaryPassword={vm.welcomeShareTenant.temporaryPassword}
          username={vm.welcomeShareTenant.username}
          onClose={() => vm.setWelcomeShareTenant(null)}
        />
      )}

      {vm.actionHubTenant && (
        <TenantActionHubModal
          tenant={vm.actionHubTenant}
          platformTenantId={vm.platformTenantId}
          currentTenantId={vm.currentTenantId}
          onClose={() => vm.setActionHubTenant(null)}
          onImpersonate={(id, name) => {
            vm.setActionHubTenant(null);
            if (window.confirm(`هل تريد تسجيل الدخول وتصفح نسخة (${name}) كمالك؟`)) {
              vm.impersonateMutation.mutate(id);
            }
          }}
          onShowDetails={(id) => {
            vm.setActionHubTenant(null);
            vm.setDetailsTenantId(id);
          }}
          onShowSubscriptions={(r) => {
            vm.setActionHubTenant(null);
            vm.setSubscriptionsTenant(r);
          }}
          onShareWelcome={(r) => {
            vm.setActionHubTenant(null);
            vm.setWelcomeShareTenant({ tenant: r });
          }}
          onUpgrade={(r) => {
            vm.setActionHubTenant(null);
            vm.setUpgradeTenant({ id: r.id, name: r.businessName || r.slug });
            vm.setUpgradePlanId('');
            vm.setUpgradePaymentAmount('');
          }}
          onUpdatePlan={(r) => {
            vm.setActionHubTenant(null);
            vm.setUpdatePlanTenant(r);
          }}
          onRenew={(r) => {
            vm.setActionHubTenant(null);
            vm.setRenewTenant({ id: r.id, name: r.businessName || r.slug });
            vm.setRenewPlanId('');
            vm.setRenewPaymentAmount('');
          }}
          onRecordPayment={(r) => {
            vm.setActionHubTenant(null);
            vm.setRecordPaymentTenant({ id: r.id, name: r.businessName || r.slug });
            vm.setPaymentAmount('');
            vm.setPaymentReference('');
          }}
          onExtendTrial={(id) => {
            vm.setActionHubTenant(null);
            vm.extendTrialMutation.mutate({ tenantId: id, days: 7 });
          }}
          onResetPassword={(r) => {
            vm.setActionHubTenant(null);
            vm.setResetTenant({ id: r.id, name: r.businessName || r.slug });
            vm.setResetPassword('');
          }}
          onUnlockOwner={(id) => {
            vm.setActionHubTenant(null);
            vm.tenantActionMutation.mutate({ action: 'unlockOwner', tenantId: id });
          }}
          onSuspend={(id) => {
            vm.setActionHubTenant(null);
            if (window.confirm('هل تريد إيقاف هذه النسخة مؤقتاً؟ لن يتمكن المستخدمون من الدخول حتى إعادة التفعيل.')) {
              vm.tenantActionMutation.mutate({ action: 'suspend', tenantId: id });
            }
          }}
          onExpire={(id) => {
            vm.setActionHubTenant(null);
            vm.tenantActionMutation.mutate({ action: 'expire', tenantId: id });
          }}
          onEditSlug={(r) => {
            vm.setActionHubTenant(null);
            vm.setEditingSlugTenant(r);
          }}
          onDelete={(id, name) => {
            vm.setActionHubTenant(null);
            if (window.confirm(`هل أنت متأكد تماماً من حذف نسخة (${name}) بجميع قواعد بياناتها وسجلاتها؟\nلا يمكن التراجع عن هذا الإجراء!`)) {
              vm.tenantActionMutation.mutate({ action: 'delete', tenantId: id });
            }
          }}
          onSeedDemo={(r) => {
            vm.setActionHubTenant(null);
            vm.setSeedDemoTenant(r);
          }}
          onWipeData={(r) => {
            vm.setActionHubTenant(null);
            vm.setWipeDataTenant(r);
          }}
        />
      )}

      {vm.editingSlugTenant && (
        <EditTenantSlugModal
          tenant={vm.editingSlugTenant}
          onClose={() => vm.setEditingSlugTenant(null)}
          onSuccess={(msg) => {
            vm.setFeedback(msg);
            vm.setEditingSlugTenant(null);
          }}
        />
      )}

      {vm.seedDemoTenant && (
        <SeedTenantDemoModal
          tenant={vm.seedDemoTenant}
          onClose={() => vm.setSeedDemoTenant(null)}
          onSuccess={(msg) => {
            vm.setFeedback(msg);
            vm.setSeedDemoTenant(null);
          }}
        />
      )}

      {vm.wipeDataTenant && (
        <WipeTenantDataModal
          tenant={vm.wipeDataTenant}
          onClose={() => vm.setWipeDataTenant(null)}
          onSuccess={(msg) => {
            vm.setFeedback(msg);
            vm.setWipeDataTenant(null);
          }}
        />
      )}
    </>
  );
};
