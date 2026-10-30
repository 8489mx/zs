import { useTranslation } from 'react-i18next';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { isThreeDecimalCurrency, getGlobalSystemCurrency } from '@/lib/currencies';
import { CalendarIcon, ChevronDownIcon } from '@/shared/components/icons/AppIcons';
import { OnlineOrderRecord, StorefrontInfo, StorefrontProduct } from '../types/storefront.types';
import { StorefrontCustomerOrderCard } from './StorefrontCustomerOrderCard';

export interface DateGroupedOrders {
  dateKey: string;
  label: string;
  isToday: boolean;
  orders: OnlineOrderRecord[];
  totalAmount: number;
}

interface StorefrontOrderDateGroupCardProps {
  group: DateGroupedOrders;
  isExpanded: boolean;
  onToggle: () => void;
  info: StorefrontInfo;
  onEditOrder: (order: OnlineOrderRecord) => void;
  onReorder?: (order: OnlineOrderRecord) => void;
  onCancelOrder: (order: OnlineOrderRecord) => void;
  isCancelling: boolean;
  allProducts?: StorefrontProduct[];
}

export function StorefrontOrderDateGroupCard({
  group,
  isExpanded,
  onToggle,
  info,
  onEditOrder,
  onReorder,
  onCancelOrder,
  isCancelling,
  allProducts,
}: StorefrontOrderDateGroupCardProps) {
  const { t } = useTranslation();
  const currCode = info?.currency || getGlobalSystemCurrency();
  const isThreeDec = isThreeDecimalCurrency(currCode);
  const formattedGroupTotal = isThreeDec
    ? Number(group.totalAmount).toFixed(3)
    : currCode === 'EGP' && Number(group.totalAmount) % 1 === 0
    ? Number(group.totalAmount).toFixed(0)
    : Number(group.totalAmount).toFixed(2);

  // If there's only 1 date group, render the orders directly without unnecessary accordion clutter
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Clean Date Header Pill */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          cursor: 'pointer',
          textAlign: 'right',
          fontFamily: 'inherit',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '9px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CalendarIcon size={14} color="#0f172a" />
          </div>

          <span
            style={{
              fontWeight: 800,
              fontSize: '13px',
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {group.label}
          </span>

          {group.isToday && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '2px 7px',
                borderRadius: '6px',
                flexShrink: 0,
              }}
            >
              {t('storefront.storefront_order_date_group_card.s0', 'اليوم')}
            </span>
          )}

          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              background: '#f1f5f9',
              color: '#475569',
              padding: '2px 8px',
              borderRadius: '6px',
              flexShrink: 0,
            }}
          >
            {group.orders.length}{' '}
            {group.orders.length === 1
              ? t('storefront.storefront_order_date_group_card.s1', 'طلب')
              : t('storefront.storefront_order_date_group_card.s2', 'طلبات')}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 900,
              color: '#0f172a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{formattedGroupTotal}</span>
            <CurrencySymbol currency={currCode} />
          </span>

          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
            }}
          >
            <ChevronDownIcon size={14} color="#475569" />
          </div>
        </div>
      </button>

      {/* Orders List for this Day */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {group.orders.map((order) => (
            <StorefrontCustomerOrderCard
              key={order.id || order.orderNumber}
              order={order}
              info={info}
              onEditOrder={onEditOrder}
              onReorder={onReorder}
              onCancelOrder={onCancelOrder}
              isCancelling={isCancelling}
              allProducts={allProducts}
              defaultExpanded={group.orders.length === 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
