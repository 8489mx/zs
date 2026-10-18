import { useTranslation } from 'react-i18next';
import React from 'react';
import { RestaurantOperationsDialog } from './RestaurantOperationsDialog';
import {
  MonitorIcon,
  LaptopIcon,
  UtensilsIcon,
  CheckCircleIcon,
  UsersIcon,
  SlidersIcon,
  Maximize2Icon,
} from '@/shared/components/icons/AppIcons';
import {
  openCustomerDisplayWindow,
  openKitchenDisplayWindow,
  openDigitalSignageWindow,
} from '@/features/pos/lib/pos-customer-display-bridge';
import { toast } from '@/shared/components/system-alert';

interface PosDisplaysModalProps {
  open: boolean;
  onClose: () => void;
  isRestaurantActive: boolean;
}

interface DisplayTile {
  key: string;
  title: string;
  tag: string;
  icon: React.ReactNode;
  description: string;
  hint: string;
  onLaunch: () => void;
  isRestaurantOnly?: boolean;
}

interface DisplayCardProps {
  tile: DisplayTile;
}

function DisplayCard({ tile }: DisplayCardProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={tile.onLaunch}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tile.onLaunch();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#f8fafc' : '#ffffff',
        border: `1px solid ${hovered ? '#170e5e' : '#e2e8f0'}`,
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '8px',
        cursor: 'pointer',
        boxSizing: 'border-box',
        minWidth: 0,
        height: '128px',
        boxShadow: hovered ? '0 6px 18px rgba(15, 23, 42, 0.06)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
    >
      {/* Top section: Icon + Content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0 }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: hovered ? '#eef2ff' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s ease',
          }}
        >
          {tile.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tile.title}
            </h4>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                color: '#475569',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                padding: '1.5px 8px',
                borderRadius: '6px',
                flexShrink: 0,
              }}
            >
              {tile.tag}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              color: '#64748b',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textAlign: 'justify',
              textJustify: 'inter-word',
              textAlignLast: 'start',
            }}
          >
            {tile.description}
          </p>
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '8px',
          marginTop: 'auto',
        }}
      >
        <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>
          {tile.hint}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 11px',
            borderRadius: '6px',
            background: hovered ? '#170e5e' : '#eef2ff',
            color: hovered ? '#ffffff' : '#170e5e',
            border: `1px solid ${hovered ? '#170e5e' : '#c7d2fe'}`,
            fontSize: '10.5px',
            fontWeight: 800,
            transition: 'all 0.15s ease',
          }}
        >
          <Maximize2Icon size={12} color={hovered ? '#ffffff' : '#170e5e'} />
          <span>{t('pos.pos_workspace.pos_displays_modal.s0', "تشغيل الشاشة")}</span>
        </span>
      </div>
    </div>
  );
}

export function PosDisplaysModal({ open, onClose, isRestaurantActive }: PosDisplaysModalProps) {
  const { t: __t } = useTranslation();
  const handleLaunch = (name: string, fn: () => void) => {
    fn();
    toast.success(`تم فتح ${name} بنجاح`);
    onClose();
  };

  const tiles: DisplayTile[] = [
    {
      key: 'customer-display',
      title: 'شاشة العميل (Customer Display)',
      tag: 'مواجهة للزبون',
      icon: <MonitorIcon size={20} color="#170e5e" />,
      description: 'شاشة تفاعلية مواجهة للزبون تعرض الأصناف الممسوحة والأسعار والإجمالي ورمز الدفع الإلكتروني لحظياً.',
      hint: 'شاشة مزدوجة · Dual Screen',
      onLaunch: () => handleLaunch('شاشة العميل', () => openCustomerDisplayWindow()),
    },
    {
      key: 'signage',
      title: 'شاشة العروض والأسعار (Signage)',
      tag: 'تلفزيون الصالة',
      icon: <LaptopIcon size={20} color="#170e5e" />,
      description: 'بث ترويجي حي على شاشات التلفزيون لعرض المنتجات والتخفيضات الكبرى وقوائم الأسعار دورياً مع رمز QR.',
      hint: 'تلفزيون المعرض · TV Signage',
      onLaunch: () => handleLaunch('شاشة العروض والأسعار', () => openDigitalSignageWindow()),
    },
    {
      key: 'kds',
      title: 'شاشة المطبخ (Kitchen Display - KDS)',
      tag: 'المطبخ والشيف',
      icon: <UtensilsIcon size={20} color="#170e5e" />,
      description: 'شاشة تفاعلية لطاقم المطبخ تستقبل طلبات الكاشير والصالة والتوصيل لحظياً مع تنبيهات صوتية وتنظيم المحطات.',
      hint: 'محطة التحضير · KDS Station',
      isRestaurantOnly: true,
      onLaunch: () => handleLaunch('شاشة المطبخ KDS', () => openKitchenDisplayWindow()),
    },
    {
      key: 'order-status',
      title: 'شاشة جاهزية الطلبات (Pickup Board)',
      tag: 'صالة الانتظار',
      icon: <CheckCircleIcon size={20} color="#170e5e" />,
      description: 'شاشة صالة الانتظار والاستلام، تعرض الطلبات الجاهزة وقيد التحضير للعملاء وسائقي التوصيل مع نداء صوتي.',
      hint: 'لوحة الاستلام · Pickup Board',
      isRestaurantOnly: true,
      onLaunch: () =>
        handleLaunch('شاشة جاهزية الطلبات', () => {
          window.open('/pos/order-status', 'OrderStatusBoardWindow', 'menubar=no,toolbar=no,location=no,status=no,resizable=yes');
        }),
    },
    {
      key: 'waiter',
      title: 'محطة الويتر وكابتن الصالة (Captain Station)',
      tag: 'أجهزة لوحية',
      icon: <UsersIcon size={20} color="#170e5e" />,
      description: 'واجهة لمسية سريعة وخفيفة للأجهزة المحمولة باليد لطاقم الخدمة لأخذ طلبات الطاولات وفتح الشيكات الميدانية.',
      hint: 'أجهزة محمولة · Handheld Waiter',
      isRestaurantOnly: true,
      onLaunch: () =>
        handleLaunch('محطة الويتر وكابتن الصالة', () => {
          window.open('/pos/waiter', 'WaiterStationWindow', 'menubar=no,toolbar=no,location=no,status=no,resizable=yes');
        }),
    },
    {
      key: 'displays-portal',
      title: 'بوابة وإعدادات شاشات العرض',
      tag: 'إدارة متقدمة',
      icon: <SlidersIcon size={20} color="#170e5e" />,
      description: 'مركز تخصيص وإعدادات شاشات العرض، وتحديد البانرات وقوائم الأسعار المعروضة وتنسيقات البث المباشر.',
      hint: 'لوحة التحكم · Displays Portal',
      onLaunch: () =>
        handleLaunch('بوابة شاشات العرض', () => {
          window.open('/displays', 'DisplaysPortalWindow', 'menubar=no,toolbar=no,location=no,status=no,resizable=yes');
        }),
    },
  ];

  const visibleTiles = tiles.filter((t) => !t.isRestaurantOnly || isRestaurantActive);

  return (
    <RestaurantOperationsDialog
      open={open}
      onClose={onClose}
      title={__t('pos.pos_workspace.pos_displays_modal.s1', __t('pos.pos_workspace.pos_displays_modal.s0', "مركز شاشات العرض ومحطات العمل التفاعلية"))}
      subtitle={__t('pos.pos_workspace.pos_displays_modal.s2', __t('pos.pos_workspace.pos_displays_modal.s1', "إطلاق وتشغيل شاشات العرض الخارجية للعملاء، التلفزيون، المطبخ KDS، ومحطات الخدمة المحمولة"))}
      icon={<MonitorIcon size={18} color="#170e5e" />}
      footerNote={__t('pos.pos_workspace.pos_displays_modal.s3', __t('pos.pos_workspace.pos_displays_modal.s2', "تعمل الشاشات في نوافذ مستقلة متعددة وتتزامن لحظياً مع نقطة البيع والصالة عبر مسبح أحداث Z-Systems"))}
      scrollableBody={false}
      bodyStyle={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {visibleTiles.map((tile) => (
          <DisplayCard key={tile.key} tile={tile} />
        ))}
      </div>
    </RestaurantOperationsDialog>
  );
}
