import React from 'react';
import { KdsTicket, KdsItemStatus } from '@/features/pos/api/kds.api';
import { CheckIcon, ClockIcon, AlertTriangleIcon } from '@/shared/components/icons/AppIcons';

interface KdsTicketCardProps {
  ticket: KdsTicket;
  onAdvanceStatus: (ticketId: number) => void;
  isAdvancing: boolean;
  onItemStatusChange: (ticketId: number, itemId: number, status: KdsItemStatus) => void;
}

const formatElapsed = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const getUrgencyBadge = (level: 'normal' | 'warning' | 'critical', elapsedMins: number) => {
  if (level === 'critical') {
    return {
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#991b1b',
      topColor: '#ef4444',
      indicator: 'متأخر',
      label: `${elapsedMins} دقيقة`,
    };
  }
  if (level === 'warning') {
    return {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#92400e',
      topColor: '#f59e0b',
      indicator: 'اقترب الحد',
      label: `${elapsedMins} دقيقة`,
    };
  }
  return {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#166534',
    topColor: '#170e5e',
    indicator: 'في الموعد',
    label: `${elapsedMins} دقيقة`,
  };
};

const getOrderTypeBadge = (type: string, tableNumber?: string, aggregatorChannel?: string) => {
  if (aggregatorChannel) {
    const chName = aggregatorChannel === 'jahez' ? 'جاهز'
      : aggregatorChannel === 'hungerstation' ? 'هنقرستيشن'
      : aggregatorChannel === 'talabat' ? 'طلبات'
      : aggregatorChannel === 'keeta' ? 'كيتا'
      : aggregatorChannel === 'deliveroo' ? 'دليفرو'
      : aggregatorChannel.toUpperCase();
    return {
      label: `توصيل (${chName})`,
      bg: '#fdf2f8',
      border: '#fbcfe8',
      text: '#9d174d',
    };
  }
  if (type === 'dine_in') {
    return {
      label: tableNumber ? `طاولة ${tableNumber}` : 'صالة',
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#1e40af',
    };
  }
  if (type === 'takeaway') {
    return {
      label: 'سفري',
      bg: '#fefce8',
      border: '#fef08a',
      text: '#854d0e',
    };
  }
  return {
    label: 'دليفري',
    bg: '#fff7ed',
    border: '#fed7aa',
    text: '#9a3412',
  };
};

export const KdsTicketCard: React.FC<KdsTicketCardProps> = ({
  ticket,
  onAdvanceStatus,
  isAdvancing,
  onItemStatusChange,
}) => {
  const urgency = getUrgencyBadge(ticket.urgencyLevel, ticket.elapsedMinutes);
  const orderType = getOrderTypeBadge(ticket.orderType, ticket.tableNumber, ticket.aggregatorChannel);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: `1px solid ${
          ticket.urgencyLevel === 'critical'
            ? '#ef4444'
            : ticket.urgencyLevel === 'warning'
            ? '#f59e0b'
            : '#e2e8f0'
        }`,
        borderTop: `4px solid ${urgency.topColor}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow:
          ticket.urgencyLevel === 'critical'
            ? '0 6px 20px rgba(239, 68, 68, 0.15)'
            : '0 4px 16px rgba(15, 23, 42, 0.05)',
      }}
    >
      {/* Card Header */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          padding: '12px 14px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '0.5px',
              }}
            >
              {ticket.orderNumber}
            </span>
            <span
              style={{
                backgroundColor: orderType.bg,
                border: `1px solid ${orderType.border}`,
                color: orderType.text,
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {orderType.label}
            </span>
            {ticket.course && (
              <span
                style={{
                  backgroundColor: ticket.course === 'appetizer' ? '#fef3c7' : ticket.course === 'main' ? '#dbeafe' : '#f3e8ff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {ticket.course === 'appetizer' ? 'مقبلات' : ticket.course === 'main' ? 'طبق رئيسي' : ticket.course === 'dessert' ? 'حلوى' : 'مشروب'}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#64748b',
              marginTop: '2px',
              fontWeight: 600,
            }}
          >
            {ticket.customerName ? `العميل: ${ticket.customerName}` : ''}
            {ticket.cashierName ? ` • الكاشير: ${ticket.cashierName}` : ''}
          </div>
        </div>

        {/* Elapsed Timer Tag */}
        <div
          style={{
            backgroundColor: urgency.bg,
            color: urgency.text,
            border: `1px solid ${urgency.border}`,
            padding: '4px 8px',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'monospace' }}>
            {formatElapsed(ticket.elapsedSeconds)}
          </div>
          <div style={{ fontSize: '9px', fontWeight: 800 }}>{urgency.indicator}</div>
        </div>
      </div>

      {/* Ticket Items List */}
      <div style={{ padding: '12px 14px', flex: 1 }}>
        {/* Expediter Progress Bar */}
        {ticket.items.length > 1 && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
              <span>جاهزية الأصناف ({ticket.items.filter(i => i.status === 'ready').length}/{ticket.items.length})</span>
              <span style={{ fontWeight: 700, color: ticket.items.filter(i => i.status === 'ready').length === ticket.items.length ? '#16a34a' : '#64748b' }}>
                {Math.round((ticket.items.filter(i => i.status === 'ready').length / ticket.items.length) * 100)}%
              </span>
            </div>
            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.round((ticket.items.filter(i => i.status === 'ready').length / ticket.items.length) * 100)}%`,
                background: ticket.items.filter(i => i.status === 'ready').length === ticket.items.length ? '#16a34a' : '#170e5e',
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ticket.items.map((item) => {
            const isDone = item.status === 'ready';

            return (
              <div
                key={item.id}
                onClick={() => {
                  const nextStatus: KdsItemStatus = isDone ? 'cooking' : 'ready';
                  onItemStatusChange(ticket.id, item.id, nextStatus);
                }}
                style={{
                  padding: '8px 10px',
                  backgroundColor: isDone ? '#f8fafc' : '#ffffff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${isDone ? '#e2e8f0' : '#cbd5e1'}`,
                  transition: 'all 0.15s ease',
                  opacity: isDone ? 0.65 : 1,
                }}
                title="انقر لتأكيد تجهيز الصنف والشطب عليه"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 900,
                        color: isDone ? '#94a3b8' : '#170e5e',
                        backgroundColor: isDone ? '#e2e8f0' : 'rgba(23, 14, 94, 0.08)',
                        padding: '2px 6px',
                        borderRadius: '5px',
                      }}
                    >
                      {item.qty}×
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: isDone ? '#94a3b8' : '#0f172a',
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}
                    >
                      {item.name}
                    </span>
                    {item.station && item.station !== 'all' && item.station !== 'general' && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: item.station === 'beverages' ? '#e0f2fe' : item.station === 'grill' ? '#ffedd5' : '#f1f5f9',
                        color: item.station === 'beverages' ? '#0369a1' : item.station === 'grill' ? '#c2410c' : '#475569',
                      }}>
                        {item.station === 'beverages' ? 'بار' : item.station === 'grill' ? 'شواية' : item.station === 'bakery' ? 'حلويات' : 'مطبخ'}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      color: isDone ? '#16a34a' : '#94a3b8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isDone ? (
                      <>
                        <CheckIcon size={12} color="#16a34a" strokeWidth={2.5} />
                        <span style={{ fontWeight: 800 }}>تم</span>
                      </>
                    ) : (
                      <ClockIcon size={12} color="#94a3b8" />
                    )}
                  </span>
                </div>

                {/* Modifiers & Extra notes */}
                {item.modifiers && item.modifiers.length > 0 && (
                  <div
                    style={{
                      marginTop: '3px',
                      paddingRight: '24px',
                      fontSize: '11px',
                      color: '#b45309',
                      fontWeight: 600,
                    }}
                  >
                    {item.modifiers.map((m, idx) => (
                      <div key={idx}>+ {m.name}</div>
                    ))}
                  </div>
                )}

                {item.notes && (
                  <div
                    style={{
                      marginTop: '3px',
                      paddingRight: '24px',
                      fontSize: '11px',
                      color: '#dc2626',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <AlertTriangleIcon size={11} color="#dc2626" strokeWidth={2} />
                    <span>{item.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Order Level Special Note */}
        {ticket.notes && (
          <div
            style={{
              marginTop: '8px',
              backgroundColor: '#fffbeb',
              color: '#92400e',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangleIcon size={12} color="#92400e" strokeWidth={2} />
            <span>ملاحظة عامة: {ticket.notes}</span>
          </div>
        )}
      </div>

      {/* Card Action Footer Button */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        {ticket.status === 'pending' && (
          <button
            type="button"
            onClick={() => onAdvanceStatus(ticket.id)}
            disabled={isAdvancing}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(23, 14, 94, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>بدء التحضير</span>
          </button>
        )}

        {ticket.status === 'cooking' && (
          <button
            type="button"
            onClick={() => onAdvanceStatus(ticket.id)}
            disabled={isAdvancing}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>جاهز للاستلام</span>
          </button>
        )}

        {ticket.status === 'ready' && (
          <button
            type="button"
            onClick={() => onAdvanceStatus(ticket.id)}
            disabled={isAdvancing}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>تم التسليم للعميل</span>
          </button>
        )}
      </div>
    </div>
  );
};
