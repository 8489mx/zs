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
        borderRadius: '14px',
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Accordion Header Button */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '13px 18px',
          background: isExpanded ? '#f8fafc' : '#ffffff',
          border: 'none',
          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'right',
          fontFamily: 'inherit',
          transition: 'background 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e0e7ff',
              flexShrink: 0,
            }}
          >
            <CalendarIcon size={16} color="#170e5e" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
            {group.label}
          </span>
          {group.isToday && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              اليوم
            </span>
          )}
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              background: '#f1f5f9',
              color: '#170e5e',
              border: '1px solid #e2e8f0',
              padding: '2px 9px',
              borderRadius: '999px',
            }}
          >
            {group.orders.length} {group.orders.length === 1 ? 'طلب' : 'طلبات'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>{group.totalAmount.toFixed(0)}</span>
            <CurrencySymbol />
          </span>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: isExpanded ? '#e2e8f0' : '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#475569',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease, background 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChevronDownIcon size={15} />
          </div>
        </div>
      </button>

      {/* Orders List for this Day */}
      {isExpanded && (
        <div
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#fafbfc',
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
