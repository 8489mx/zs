import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { CalendarIcon, ChevronDownIcon } from '@/shared/components/icons/AppIcons';
import { OnlineOrderRecord, StorefrontInfo } from '../types/storefront.types';
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
}: StorefrontOrderDateGroupCardProps) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.03)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Accordion Header Button */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: isExpanded ? '#f8fafc' : '#ffffff',
          border: 'none',
          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          cursor: 'pointer',
          textAlign: 'right',
          fontFamily: 'inherit',
          transition: 'background 0.15s ease',
          boxSizing: 'border-box',
        }}
      >
        {/* Right Info: Date + Today + Order Count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: 'var(--storefront-primary-subtle, #f0f3ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CalendarIcon size={14} color="var(--storefront-primary-color, #170e5e)" />
          </div>

          <span
            style={{
              fontWeight: 800,
              fontSize: '12.5px',
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
                fontSize: '10px',
                fontWeight: 800,
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '1px 5px',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              اليوم
            </span>
          )}

          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              padding: '1px 6px',
              borderRadius: '999px',
              flexShrink: 0,
            }}
          >
            {group.orders.length} {group.orders.length === 1 ? 'طلب' : 'طلبات'}
          </span>
        </div>

        {/* Left Total & Chevron (Guaranteed Never Clipped) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: '#166534',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{group.totalAmount.toFixed(0)}</span>
            <CurrencySymbol />
          </span>

          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: isExpanded ? '#e2e8f0' : '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
            }}
          >
            <ChevronDownIcon size={13} color="#475569" />
          </div>
        </div>
      </button>

      {/* Orders List for this Day */}
      {isExpanded && (
        <div
          style={{
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: '#f8fafc',
          }}
        >
          {group.orders.map((order) => (
            <StorefrontCustomerOrderCard
              key={order.id}
              order={order}
              info={info}
              onEditOrder={onEditOrder}
              onReorder={onReorder}
              onCancelOrder={onCancelOrder}
              isCancelling={isCancelling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
