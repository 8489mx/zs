import { useTranslation } from 'react-i18next';
import React from 'react';
import { KdsTicket, KdsItemStatus } from '@/features/pos/api/kds.api';
import { CheckIcon, ClockIcon, AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { formatKitchenNote } from '@/features/pos/utils/kitchen-notes.util';

interface KdsTicketCardProps {
  ticket: KdsTicket;
  onAdvanceStatus: (ticketId: number) => void;
  isAdvancing: boolean;
  onItemStatusChange: (ticketId: number, itemId: number, status: KdsItemStatus) => void;
  isExpoMode?: boolean;
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
      topColor: '#dc2626',
      indicator: 'متأخر',
      label: `${elapsedMins} دقيقة`,
    };
  }
  if (level === 'warning') {
    return {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#92400e',
      topColor: '#d97706',
      indicator: 'اقترب الحد',
      label: `${elapsedMins} دقيقة`,
    };
  }
  return {
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#0f172a',
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
      : aggregatorChannel === 'deliveroo' ? 'دليفرو'
      : aggregatorChannel === 'cari' ? 'كاري'
      : aggregatorChannel === 'keeta' ? 'كيتا'
      : aggregatorChannel.toUpperCase();
    return {
      label: `توصيل (${chName})`,
      bg: '#f8fafc',
      border: '#cbd5e1',
      text: '#0f172a',
    };
  }
  if (type === 'dine_in') {
    return {
      label: tableNumber ? `طاولة ${tableNumber}` : 'صالة',
      bg: '#eef2ff',
      border: '#c7d2fe',
      text: '#170e5e',
    };
  }
  if (type === 'takeaway') {
    return {
      label: 'سفري',
      bg: '#f1f5f9',
      border: '#e2e8f0',
      text: '#334155',
    };
  }
  return {
    label: 'دليفري',
    bg: '#f1f5f9',
    border: '#e2e8f0',
    text: '#334155',
  };
};

export const KdsTicketCard: React.FC<KdsTicketCardProps> = ({
  ticket,
  onAdvanceStatus,
  isAdvancing,
  onItemStatusChange,
  isExpoMode = false,
}) => {
  const { t } = useTranslation();
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
                {ticket.course === 'appetizer' ? t('pos.kds.kds_ticket_card.s0', "مقبلات") : ticket.course === 'main' ? t('pos.kds.kds_ticket_card.s1', "طبق رئيسي") : ticket.course === 'dessert' ? t('pos.kds.kds_ticket_card.s2', "حلوى") : t('pos.kds.kds_ticket_card.s3', "مشروب")}
              </span>
            )}
            {ticket.pagerNumber && (
              <span
                style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '11px',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {t('pos.kds.kds_ticket_card.s4', "بيجر:")} {ticket.pagerNumber}
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
              <span>{t('pos.kds.kds_ticket_card.s5', "جاهزية الأصناف (")}{ticket.items.filter(i => i.status === 'ready').length}/{ticket.items.length})</span>
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
          {(() => {
            const itemPrepEstimates = ticket.items.map((i) => {
              return Number(i.prepTimeMinutes || (i.station === 'grill' ? 14 : i.station === 'kitchen' ? 10 : i.station === 'bakery' ? 8 : 4));
            });
            const maxTicketPrep = Math.max(...itemPrepEstimates, 10);

            return ticket.items.map((item, idx) => {
              const isDone = item.status === 'ready';
              const itemPrepTime = itemPrepEstimates[idx];
              const staggerDelay = Math.max(0, maxTicketPrep - itemPrepTime);
              const isHeld = !isDone && ticket.items.length > 1 && ticket.elapsedMinutes < staggerDelay;
              const minutesUntilFire = Math.max(1, staggerDelay - ticket.elapsedMinutes);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    const nextStatus: KdsItemStatus = isDone ? 'cooking' : 'ready';
                    onItemStatusChange(ticket.id, item.id, nextStatus);
                  }}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: isDone ? '#f8fafc' : isHeld ? '#fffbeb' : '#ffffff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: `1px solid ${isDone ? '#e2e8f0' : isHeld ? '#fef3c7' : '#cbd5e1'}`,
                    transition: 'all 0.15s ease',
                    opacity: isDone ? 0.65 : 1,
                  }}
                  title={t('pos.kds.kds_ticket_card.s6', "انقر لتأكيد تجهيز الصنف والشطب عليه")}
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
                      {(() => {
                        const englishName = (item as any).nameEn || (item as any).name_en || (item as any).englishName || (() => {
                          const parenMatch = item.name.match(/\(([^)]*[a-zA-Z]{2,}[^)]*)\)/);
                          if (parenMatch) return parenMatch[1].trim();
                          const slashMatch = item.name.match(/[\/|\-]\s*([a-zA-Z\s]{2,})$/);
                          if (slashMatch) return slashMatch[1].trim();
                          return null;
                        })();
                        return englishName ? (
                          <span
                            dir="ltr"
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: isDone ? '#94a3b8' : '#475569',
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                              backgroundColor: isDone ? 'transparent' : '#f1f5f9',
                              border: isDone ? 'none' : '1px solid #e2e8f0',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {englishName}
                          </span>
                        ) : null;
                      })()}
                      {item.seatNumber && (
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          border: '1px solid #bfdbfe',
                        }}>
                          {t('pos.kds.kds_ticket_card.s7', "مقعد")} {item.seatNumber}
                        </span>
                      )}
                      {item.station && item.station !== 'all' && item.station !== 'general' && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: item.station === 'beverages' ? '#e0f2fe' : item.station === 'grill' ? '#ffedd5' : '#f1f5f9',
                          color: item.station === 'beverages' ? '#0369a1' : item.station === 'grill' ? '#c2410c' : '#475569',
                        }}>
                          {item.station === 'beverages' ? t('pos.kds.kds_ticket_card.s8', "بار") : item.station === 'grill' ? t('pos.kds.kds_ticket_card.s9', "شواية") : item.station === 'bakery' ? t('pos.kds.kds_ticket_card.s10', "حلويات") : t('pos.kds.kds_ticket_card.s11', "مطبخ")}
                        </span>
                      )}

                      {/* Smart Kitchen Pacing Indicator */}
                      {!isDone && (
                        isHeld ? (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                            }}
                            title={`تنسيق خروج الأطباق معاً: انتظر ${minutesUntilFire} دقيقة قبل بدء طهي هذا الصنف ليتزامن مع الصنف الأطول (${maxTicketPrep} د)`}
                          >
                            {t('pos.kds.kds_ticket_card.s12', "انتظار")} {minutesUntilFire} {t('pos.kds.kds_ticket_card.s13', "د")}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                            }}
                            title={`وقت الطهي المقدر: ${itemPrepTime} دقيقة`}
                          >
                            {t('pos.kds.kds_ticket_card.s14', "ابدأ الطهي (")}{itemPrepTime} {t('pos.kds.kds_ticket_card.s15', "د)")}
                          </span>
                        )
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
                        <span style={{ fontWeight: 800 }}>{t('pos.kds.kds_ticket_card.s16', "تم")}</span>
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
                    <span>{formatKitchenNote(item.notes, 'dual')}</span>
                  </div>
                )}
              </div>
            );
          });
        })()}
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
            <span>{t('pos.kds.kds_ticket_card.s17', "ملاحظة عامة:")} {formatKitchenNote(ticket.notes, 'dual')}</span>
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
        {isExpoMode ? (
          <button
            type="button"
            onClick={() => onAdvanceStatus(ticket.id)}
            disabled={isAdvancing}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: ticket.items.every((i) => i.status === 'ready') ? '#16a34a' : '#d97706',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: ticket.items.every((i) => i.status === 'ready')
                ? '0 2px 8px rgba(22, 163, 74, 0.3)'
                : '0 2px 6px rgba(217, 119, 6, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            {ticket.items.every((i) => i.status === 'ready') ? (
              <>
                <CheckIcon size={16} color="#ffffff" />
                <span>{t('pos.kds.kds_ticket_card.s18', "تجميع وتسليم الطلب كاملاً (Expo Release)")}</span>
              </>
            ) : (
              <>
                <ClockIcon size={15} color="#ffffff" />
                <span>
                  {t('pos.kds.kds_ticket_card.s19', "بانتظار اكتمال المحطات (")}{ticket.items.filter((i) => i.status === 'ready').length} {t('pos.kds.kds_ticket_card.s20', "من")}{' '}
                  {ticket.items.length} {t('pos.kds.kds_ticket_card.s21', "جاهز)")}
                </span>
              </>
            )}
          </button>
        ) : (
          <>
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
                <span>{t('pos.kds.kds_ticket_card.s22', "بدء التحضير")}</span>
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
                <span>{t('pos.kds.kds_ticket_card.s23', "جاهز للاستلام")}</span>
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
                <span>{t('pos.kds.kds_ticket_card.s24', "تم التسليم للعميل")}</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
