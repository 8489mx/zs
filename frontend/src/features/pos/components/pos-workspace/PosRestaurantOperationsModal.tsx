import { useTranslation } from 'react-i18next';
import React from 'react';
import { RestaurantOperationsDialog } from './RestaurantOperationsDialog';
import {
  UtensilsIcon,
  LayersIcon,
  PrinterIcon,
  AwardIcon,
  TruckIcon,
  CheckCircleIcon,
  TagIcon,
  ShieldCheckIcon,
  SlidersIcon,
  TrashIcon,
  UsersIcon,
  LaptopIcon,
} from '@/shared/components/icons/AppIcons';

interface PosRestaurantOperationsModalProps {
  open: boolean;
  onClose: () => void;
  isManager: boolean;
  count86: number;
  cartLength?: number;
  isPhoneOrdersActive: boolean;
  isRestaurantActive: boolean;
  isStorefrontActive: boolean;
  onOpenCombo?: () => void;
  onOpenCupLabels?: () => void;
  onOpenStampCard: () => void;
  onOpenDriveThru: () => void;
  onOpenUpsell: () => void;
  onOpen86: () => void;
  onOpenManagerComp?: () => void;
  onOpenPlateRadar: () => void;
  onOpenPrepSheet: () => void;
  onOpenFoodWaste: () => void;
  onOpenTipPool: () => void;
  onOpenAggregators: () => void;
  onOpenDriverDispatch: () => void;
}

interface ActionTileProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  badge?: React.ReactNode;
  tag?: string;
  isProtected?: boolean;
  fullWidth?: boolean;
}

function ActionTile({ icon, title, desc, onClick, badge, tag, isProtected, fullWidth }: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '11px 14px',
        borderRadius: '12px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        textAlign: 'right',
        width: '100%',
        minWidth: 0,
        height: fullWidth ? '50px' : '64px',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        gridColumn: fullWidth ? '1 / -1' : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f8fafc';
        e.currentTarget.style.borderColor = '#170e5e';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.06)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {tag && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                {tag}
              </span>
            )}
            {isProtected && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#170e5e', background: '#eef2ff', padding: '1px 6px', borderRadius: '4px' }}>
                PIN
              </span>
            )}
            {badge}
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {desc}
        </div>
      </div>
    </button>
  );
}

export function PosRestaurantOperationsModal({
  open,
  onClose,
  isManager,
  count86,
  isPhoneOrdersActive,
  isRestaurantActive,
  isStorefrontActive,
  onOpenCombo,
  onOpenCupLabels,
  onOpenStampCard,
  onOpenDriveThru,
  onOpenUpsell,
  onOpen86,
  onOpenManagerComp,
  onOpenPlateRadar,
  onOpenPrepSheet,
  onOpenFoodWaste,
  onOpenTipPool,
  onOpenAggregators,
  onOpenDriverDispatch,
}: PosRestaurantOperationsModalProps) {
  const { t } = useTranslation();
  const trigger = (action: () => void) => {
    onClose();
    action();
  };

  const salesActions: ActionTileProps[] = [
    ...(onOpenCombo ? [{
      icon: <LayersIcon size={18} color="#170e5e" />,
      title: 'بناء وجبة كومبو',
      desc: 'تجميع ساندوتش ومشروب وإضافات بسعر موحد',
      onClick: () => trigger(onOpenCombo),
    }] : []),
    ...(onOpenCupLabels ? [{
      icon: <PrinterIcon size={18} color="#170e5e" />,
      title: 'ملصقات الأكواب والعلب',
      desc: 'طباعة ستيكر حراري لاصق للباريستا 50x30 مم',
      onClick: () => trigger(onOpenCupLabels),
    }] : []),
    {
      icon: <AwardIcon size={18} color="#170e5e" />,
      title: 'كرت الأختام والولاء',
      desc: 'أختام رقمية ومكافآت المقاهي والمطاعم للعميل',
      onClick: () => trigger(onOpenStampCard),
    },
    {
      icon: <TruckIcon size={18} color="#170e5e" />,
      title: 'طلبات السيارات (Drive-Thru)',
      desc: 'متابعة طابور سيارات الخدمة ومؤشر سرعة SOS',
      onClick: () => trigger(onOpenDriveThru),
    },
    {
      icon: <CheckCircleIcon size={18} color="#170e5e" />,
      title: 'عروض ذكية وترقية الحجم',
      desc: 'اقتراحات زيادة متوسط الفاتورة والإضافات (Upsell)',
      onClick: () => trigger(onOpenUpsell),
    },
    {
      icon: <TagIcon size={18} color="#170e5e" />,
      title: 'استبعاد الأصناف (86)',
      desc: 'إيقاف الأصناف والمكونات النافذة لحظياً من الكاشير',
      onClick: () => trigger(onOpen86),
      badge: count86 > 0 ? (
        <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '9.5px', fontWeight: 900, padding: '1px 6px', borderRadius: '999px' }}>
          {count86}
        </span>
      ) : undefined,
    },
  ];

  const managerActions: ActionTileProps[] = [
    ...(onOpenManagerComp ? [{
      icon: <ShieldCheckIcon size={18} color="#170e5e" />,
      title: 'ضيافة الإدارة (Manager Comp)',
      desc: 'اعتماد ضيافة رسمية 100% وإعفاء الفاتورة برمز المشرف',
      onClick: () => trigger(onOpenManagerComp),
      isProtected: !isManager,
    }] : []),
    ...(isManager ? [
      {
        icon: <SlidersIcon size={18} color="#170e5e" />,
        title: 'رادار تكلفة الأطباق والهوامش',
        desc: 'كشف تكلفة الخامات وهوامش أرباح الأصناف لحظياً',
        onClick: () => trigger(onOpenPlateRadar),
        tag: 'سري',
      },
      {
        icon: <UtensilsIcon size={18} color="#170e5e" />,
        title: 'ورقة التحضير اليومية',
        desc: 'خطة تحضير خامات المطبخ والأصناف المجهزة',
        onClick: () => trigger(onOpenPrepSheet),
      },
      {
        icon: <TrashIcon size={18} color="#170e5e" />,
        title: 'هدر وتالف المطبخ',
        desc: 'تسجيل تالف الوجبات وخصم المواد الخام من المخزن',
        onClick: () => trigger(onOpenFoodWaste),
      },
      {
        icon: <UsersIcon size={18} color="#170e5e" />,
        title: 'مجمع الإكراميات (Tip Pool)',
        desc: 'توزيع حصص التبس على طاقم الصالة والمطبخ',
        onClick: () => trigger(onOpenTipPool),
      },
      {
        icon: <LaptopIcon size={18} color="#170e5e" />,
        title: 'منصات وتطبيقات التوصيل',
        desc: 'جاهز، هنقرستيشن، طلبات، كيتا ومزامنة القوائم',
        onClick: () => trigger(onOpenAggregators),
      },
      ...((isPhoneOrdersActive || isRestaurantActive || isStorefrontActive) ? [{
        icon: <TruckIcon size={18} color="#170e5e" />,
        title: 'ترحيل سائقي التوصيل',
        desc: 'إسناد وتوجيه طلبيات الدليفري لسائقي المطعم ومتابعة التحصيل',
        onClick: () => trigger(onOpenDriverDispatch),
        fullWidth: true,
      }] : []),
    ] : []),
  ];

  return (
    <RestaurantOperationsDialog
      open={open}
      onClose={onClose}
      title={t('pos.pos_workspace.pos_restaurant_operations_modal.s0', "مركز عمليات وتشغيل المطعم")}
      subtitle={t('pos.pos_workspace.pos_restaurant_operations_modal.s1', "التحكم الموحد في خدمات الصالة والبيع، أسطول التوصيل، والمطبخ والرقابة الإشرافية")}
      icon={<UtensilsIcon size={18} color="#170e5e" />}
      badge={
        count86 > 0 ? (
          <span
            style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 7px',
              borderRadius: '999px',
            }}
          >
            86: {count86} {t('pos.pos_workspace.pos_restaurant_operations_modal.s2', "أصناف نافذة")}
          </span>
        ) : undefined
      }
      scrollableBody={false}
      bodyStyle={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Section 1: Sales & Service (Available to Cashier & All) */}
      <div style={{ minWidth: 0, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '3px', height: '13px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{t('pos.pos_workspace.pos_restaurant_operations_modal.s3', "أدوات الصالة والمبيعات المباشرة")}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>{t('pos.pos_workspace.pos_restaurant_operations_modal.s4', "— لخدمة الزبائن وبناء الوجبات أثناء المحاسبة")}</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '10px',
            width: '100%',
          }}
        >
          {salesActions.map((item) => (
            <ActionTile key={item.title} {...item} />
          ))}
        </div>
      </div>

      {/* Section 2: Management & Supervisory Controls */}
      <div style={{ minWidth: 0, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheckIcon size={15} color="#170e5e" />
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
              {t('pos.pos_workspace.pos_restaurant_operations_modal.s5', "أدوات الإشراف والرقابة")}
            </span>
            {!isManager ? (
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                {t('pos.pos_workspace.pos_restaurant_operations_modal.s6', "— (تتطلب صلاحية مشرف أو رمز اعتماد PIN)")}
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {t('pos.pos_workspace.pos_restaurant_operations_modal.s7', "— للرقابة على التكاليف، هوامش الأرباح، وتالف المطبخ")}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isManager ? 'repeat(3, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '10px',
            width: '100%',
          }}
        >
          {managerActions.map((item) => (
            <ActionTile key={item.title} {...item} />
          ))}
        </div>
      </div>
    </RestaurantOperationsDialog>
  );
}
