import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { RestaurantOperationsDialog } from './RestaurantOperationsDialog';
import { toast } from '@/shared/components/system-alert';
import { CheckCircleIcon, PlusCircleIcon } from '@/shared/components/icons/AppIcons';
import { restaurantAdvancedFnbApi } from '@/features/pos/api/restaurant-advanced-fnb.api';

interface PosCustomerPunchCardModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName?: string;
  onBack?: () => void;
}

export function PosCustomerPunchCardModal({
  open,
  onClose,
  customerId,
  customerName = 'العميل',
  onBack,
}: PosCustomerPunchCardModalProps) {
  const { t } = useTranslation();
  const { data: card, refetch } = useQuery({
    queryKey: ['restaurant-stamp-card', customerId],
    queryFn: () => restaurantAdvancedFnbApi.getStampCard(customerId),
    enabled: open && !!customerId,
  });

  const stampMutation = useMutation({
    mutationFn: (count: number) => restaurantAdvancedFnbApi.addCustomerStamp(customerId, count),
    onSuccess: (res) => {
      toast.success(res.message);
      refetch();
    },
    onError: () => {
      toast.error('تعذر إضافة الختم للعميل');
    },
  });

  const target = card?.target_stamps || 6;
  const current = card?.current_stamps || 0;
  const completed = card?.total_completed_cards || 0;
  const rewardDesc = card?.reward_description || 'مشروب مجاني عند اكتمال الختم';

  const stampSlots = Array.from({ length: target }, (_, i) => i < current);

  return (
    <RestaurantOperationsDialog
      open={open}
      onClose={onClose}
      onBack={onBack}
      backText={t('pos.pos_workspace.pos_customer_punch_card_modal.s0', "الرجوع لعمليات المطعم")}
      title={t('pos.pos_workspace.pos_customer_punch_card_modal.s1', "كرت الأختام الرقمي للعميل (Digital Stamp Loyalty Card)")}
      subtitle={`برنامج ولاء المقاهي والمطاعم المباشر للعميل: ${customerName}`}
      footerNote={t('pos.pos_workspace.pos_customer_punch_card_modal.s2', "الأختام الرقمية تتزامن فورياً مع حساب العميل وبرنامج مكافآت المتجر")}
      bodyStyle={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '100%', maxWidth: '480px' }}>
        {/* Visual Punch Card Simulation */}
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            background: 'linear-gradient(135deg, #170e5e 0%, #2e1065 100%)',
            borderRadius: '16px',
            padding: '20px',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(23, 14, 94, 0.25)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: 600 }}>{t('pos.pos_workspace.pos_customer_punch_card_modal.s3', "كوبون الولاء الرقمي")}</div>
              <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.3px' }}>{card?.program_name || t('pos.pos_workspace.pos_customer_punch_card_modal.s4', "كوبون المشروبات والقهوة")}</div>
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#fef08a',
              }}
            >
              {completed} {t('pos.pos_workspace.pos_customer_punch_card_modal.s5', "كروت مكتملة")}
            </div>
          </div>

          {/* Stamp Circles Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(target, 6)}, 1fr)`,
              gap: '12px',
              margin: '18px 0',
            }}
          >
            {stampSlots.map((isStamped, idx) => (
              <div
                key={idx}
                style={{
                  aspectRatio: '1',
                  borderRadius: '50%',
                  border: isStamped ? '2px solid #4ade80' : '2px dashed rgba(255,255,255,0.3)',
                  background: isStamped ? '#16a34a' : 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isStamped ? '0 0 10px rgba(74, 222, 128, 0.5)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isStamped ? (
                  <CheckCircleIcon size={20} color="#ffffff" />
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{idx + 1}</span>
                )}
              </div>
            ))}
          </div>

          {/* Reward Footer */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <span>{t('pos.pos_workspace.pos_customer_punch_card_modal.s6', "المكافأة:")} <strong>{rewardDesc}</strong></span>
            <span style={{ color: '#c4b5fd', fontWeight: 700 }}>
              {target - current > 0 ? `متبقي ${target - current} أختام` : t('pos.pos_workspace.pos_customer_punch_card_modal.s7', "مكافأة جاهزة!")}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '460px' }}>
          <button
            type="button"
            onClick={() => stampMutation.mutate(1)}
            disabled={stampMutation.isPending}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              background: '#16a34a',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
            }}
          >
            <PlusCircleIcon size={16} />
            <span>{t('pos.pos_workspace.pos_customer_punch_card_modal.s8', "ختم الكرت الآن (+1 ختم للعميل)")}</span>
          </button>
        </div>
      </div>
    </RestaurantOperationsDialog>
  );
}
