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
  onCancelOrder: (order: OnlineOrderRecord) => void;
  isCancelling: boolean;
}

export function StorefrontOrderDateGroupCard({
  group,
  isExpanded,
  onToggle,
  info,
  onEditOrder,
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
          padding: '12px 16px',
          background: isExpanded ? '#f8fafc' : '#ffffff',
          border: 'none',
          borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'right',
          fontFamily: 'inherit',
          transition: 'background 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>📅</span>
          <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
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
                padding: '1px 6px',
                borderRadius: '5px',
              }}
            >
              اليوم
            </span>
          )}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              background: '#f1f5f9',
              color: '#170e5e',
              padding: '1px 7px',
              borderRadius: '999px',
            }}
          >
            {group.orders.length} {group.orders.length === 1 ? 'طلب' : 'طلبات'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
            {group.totalAmount.toFixed(0)} {info.currency || 'ج.م'}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#64748b',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Orders List for this Day */}
      {isExpanded && (
        <div
          style={{
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: '#fafbfc',
          }}
        >
          {group.orders.map((order) => (
            <StorefrontCustomerOrderCard
              key={order.id}
              order={order}
              info={info}
              onEditOrder={onEditOrder}
              onCancelOrder={onCancelOrder}
              isCancelling={isCancelling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
