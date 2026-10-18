import { useTranslation } from 'react-i18next';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { storefrontApi } from '@/features/storefront/api/storefront.api';
import { ConvertDeliveryModal } from '@/features/storefront/components/ConvertDeliveryModal';
import { loadOnlineOrderIntoPosCart } from '@/features/storefront/lib/storefront-pos-loader';
import type { OnlineOrderRecord } from '@/features/storefront/types/storefront.types';
import { Button } from '@/shared/ui/button';
import {
  CheckCircleIcon,
  ClockIcon,
  RefreshCwIcon,
  SearchIcon,
  ShoppingCartIcon,
  TruckIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
import { toast } from '@/shared/components/system-alert';

interface PosOnlineOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PosOnlineOrdersModal({ isOpen, onClose }: PosOnlineOrdersModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<OnlineOrderRecord | null>(null);
  const [loadingPosOrderId, setLoadingPosOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLoadToPos = async (orderId: number) => {
    setLoadingPosOrderId(orderId);
    try {
      await loadOnlineOrderIntoPosCart(orderId);
      queryClient.invalidateQueries({ queryKey: ['pos-online-orders-quick'] });
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders-count'] });
      queryClient.invalidateQueries({ queryKey: ['pos-pending-orders-count'] });
      toast.success('تم تنزيل طلب المتجر في سلة الكاشير بنجاح');
      onClose();
    } catch (err: any) {
      setLoadingPosOrderId(null);
      toast.error(`تعذر تنزيل الطلب في السلة: ${err.message || 'خطأ غير متوقع'}`);
    }
  };

  const ordersQuery = useQuery({
    queryKey: ['pos-online-orders-quick'],
    queryFn: () => storefrontApi.listOrders('pending'),
    enabled: isOpen,
    refetchInterval: 12 * 1000,
  });

  const orders = ordersQuery.data?.orders || [];

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter((order) => {
      const matchNum = order.orderNumber ? order.orderNumber.toLowerCase().includes(q) : false;
      const matchName = order.customerName ? order.customerName.toLowerCase().includes(q) : false;
      const matchPhone = order.customerPhone ? order.customerPhone.includes(q) : false;
      const matchAddress = order.customerAddress ? order.customerAddress.toLowerCase().includes(q) : false;
      const matchItems = order.items ? order.items.some(it => it.name && it.name.toLowerCase().includes(q)) : false;
      return matchNum || matchName || matchPhone || matchAddress || matchItems;
    });
  }, [orders, searchQuery]);

  if (!isOpen) return null;

  return (
    <>
      <DialogShell
        open={isOpen}
        onClose={onClose}
        width="min(1160px, 96vw)"
        ariaLabel={t('pos.pos_workspace.pos_online_orders_modal.s0', "طلبات المتجر الإلكتروني الواردة")}
      >
        <div
          dir="rtl"
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(88vh, 760px)',
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 20px',
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '4px',
                  height: '18px',
                  backgroundColor: '#170e5e',
                  borderRadius: '2px',
                  display: 'inline-block',
                }}
              />
              <h3 className="no-pseudo-bar" style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#170e5e' }}>
                {t('pos.pos_workspace.pos_online_orders_modal.s1', "طلبات المتجر الإلكتروني الواردة")}
              </h3>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: orders.length > 0 ? '#fee2e2' : '#f1f5f9',
                  color: orders.length > 0 ? '#b91c1c' : '#64748b',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  border: orders.length > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                }}
              >
                {orders.length} {orders.length === 1 ? t('pos.pos_workspace.pos_online_orders_modal.s2', "طلب جديد") : t('pos.pos_workspace.pos_online_orders_modal.s3', "طلبات جديدة")}
              </span>

              <button
                type="button"
                onClick={() => ordersQuery.refetch()}
                disabled={ordersQuery.isFetching}
                title={t('pos.pos_workspace.pos_online_orders_modal.s4', "تحديث فوري لقائمة الطلبات")}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '5px 9px',
                  cursor: ordersQuery.isFetching ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#475569',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <RefreshCwIcon
                  size={13}
                  style={{
                    animation: ordersQuery.isFetching ? 'spin 1s linear infinite' : 'none',
                  }}
                />
                <span>{t('pos.pos_workspace.pos_online_orders_modal.s5', "تحديث")}</span>
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: '1 1 240px',
                maxWidth: '360px',
                justifyContent: 'flex-end',
              }}
            >
              {orders.length > 0 && (
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('pos.pos_workspace.pos_online_orders_modal.s6', "بحث برقم الطلب، العميل، الهاتف...")}
                    style={{
                      width: '100%',
                      height: '32px',
                      padding: '0 30px 0 28px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '9px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <SearchIcon size={14} />
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        left: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <XIcon size={13} />
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                <XIcon size={16} />
              </button>
            </div>
          </div>

          {/* Orders Grid Body */}
          <div
            className="thin-scrollbar"
            style={{
              padding: '16px 20px',
              overflowY: 'auto',
              flex: 1,
              minHeight: '260px',
            }}
          >
            {ordersQuery.isLoading ? (
              <div
                style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                <RefreshCwIcon
                  size={24}
                  color="#170e5e"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('pos.pos_workspace.pos_online_orders_modal.s7', "جاري فحص الطلبات الواردة...")}</span>
              </div>
            ) : orders.length === 0 ? (
              <div
                style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  <CheckCircleIcon size={42} color="#10b981" />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  {t('pos.pos_workspace.pos_online_orders_modal.s8', "لا توجد طلبات جديدة معلقة")}
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                  {t('pos.pos_workspace.pos_online_orders_modal.s9', "أي طلب جديد يجريه العميل من المتجر سيظهر هنا مباشرة على الفور.")}
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div
                style={{
                  padding: '50px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <p style={{ margin: '0 0 8px', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                  {t('pos.pos_workspace.pos_online_orders_modal.s10', "لا توجد طلبات تطابق بحثك عن \"")}{searchQuery}"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#170e5e',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {t('pos.pos_workspace.pos_online_orders_modal.s11', "مسح البحث وعرض كافة الطلبات (")}{orders.length})
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                  gap: '14px',
                  alignItems: 'stretch',
                }}
              >
                {filteredOrders.map((order) => {
                  const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
                  const waPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

                  return (
                    <div
                      key={order.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        padding: '14px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Top Row: Order # & Status & Time */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#170e5e' }}>
                            #{order.orderNumber}
                          </span>
                          {order.orderType === 'dine_in' || order.tableNumber ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                              }}
                            >
                              {t('pos.pos_workspace.pos_online_orders_modal.s12', "طاولة")} {order.tableNumber || '—'}
                            </span>
                          ) : order.orderType === 'pickup' ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: '#eff6ff',
                                color: '#1e40af',
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              {t('pos.pos_workspace.pos_online_orders_modal.s13', "استلام من الفرع")}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                              }}
                            >
                              {t('pos.pos_workspace.pos_online_orders_modal.s14', "قيد الانتظار")}
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            color: '#64748b',
                            flexShrink: 0,
                          }}
                        >
                          <ClockIcon size={12} color="#94a3b8" />
                          <span>
                            {new Date(order.createdAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Customer & Address */}
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '12.5px' }}>
                            {order.customerName}
                          </span>
                          <span style={{ color: '#475569', direction: 'ltr', fontWeight: 600 }}>
                            {order.customerPhone}
                          </span>
                        </div>
                        <div
                          style={{
                            color: '#64748b',
                            fontSize: '11.5px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={order.customerAddress || t('pos.pos_workspace.pos_online_orders_modal.s15', "استلام من المتجر")}
                        >
                          {order.customerAddress || (order.orderType === 'dine_in' ? t('pos.pos_workspace.pos_online_orders_modal.s16', "تناول بالصالة") : t('pos.pos_workspace.pos_online_orders_modal.s17', "استلام من المتجر"))}
                        </div>
                        {order.customerNotes && (
                          <div
                            style={{
                              marginTop: '2px',
                              padding: '2px 6px',
                              background: '#fffbeb',
                              borderRadius: '4px',
                              color: '#92400e',
                              fontSize: '11px',
                              border: '1px solid #fef3c7',
                            }}
                          >
                            {t('pos.pos_workspace.pos_online_orders_modal.s18', "ملاحظات:")} {order.customerNotes}
                          </div>
                        )}
                      </div>

                      {/* Items Summary */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '11.5px', color: '#64748b' }}>
                            {t('pos.pos_workspace.pos_online_orders_modal.s19', "الأصناف (")}{order.items.length}):
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {t('pos.pos_workspace.pos_online_orders_modal.s20', "إجمالي:")} {order.items.reduce((s, it) => s + (it.quantity || 1), 0)} {t('pos.pos_workspace.pos_online_orders_modal.s21', "قطعة")}
                          </span>
                        </div>
                        <div
                          className="thin-scrollbar"
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '5px',
                            maxHeight: '64px',
                            overflowY: 'auto',
                            padding: '2px 0',
                          }}
                        >
                          {order.items.map((it, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#f1f5f9',
                                padding: '3px 7px',
                                borderRadius: '5px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: '#1e293b',
                                border: '1px solid #e2e8f0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <span>{it.name}</span>
                              <span style={{ color: '#047857', fontWeight: 700 }}>(×{it.quantity})</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Total & Action Buttons */}
                      <div
                        style={{
                          marginTop: 'auto',
                          paddingTop: '9px',
                          borderTop: '1px dashed #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t('pos.pos_workspace.pos_online_orders_modal.s22', "الإجمالي:")}</span>
                            <span style={{ fontSize: '15px', fontWeight: 900, color: '#170e5e' }}>
                              {order.totalAmount} {getGlobalCurrencySymbol()}
                            </span>
                          </div>

                          {waPhone && (
                            <a
                              href={`https://wa.me/${waPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: '#25D366',
                                color: '#ffffff',
                                textDecoration: 'none',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                              title={t('pos.pos_workspace.pos_online_orders_modal.s23', "مراسلة العميل عبر واتساب")}
                            >
                              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.181-.076.355.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                              </svg>
                              <span>{t('pos.pos_workspace.pos_online_orders_modal.s24', "واتساب")}</span>
                            </a>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <Button
                            type="button"
                            onClick={() => handleLoadToPos(order.id)}
                            disabled={loadingPosOrderId === order.id}
                            style={{
                              background: '#047857',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '7px 10px',
                              borderRadius: '7px',
                              width: '100%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                            }}
                          >
                            <ShoppingCartIcon size={14} />
                            <span>{loadingPosOrderId === order.id ? t('pos.pos_workspace.pos_online_orders_modal.s25', "جاري النقل...") : t('pos.pos_workspace.pos_online_orders_modal.s26', "تنزيل بالسلة")}</span>
                          </Button>

                          <Button
                            type="button"
                            onClick={() => setDeliveryModalOrder(order)}
                            style={{
                              background: '#170e5e',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '7px 10px',
                              borderRadius: '7px',
                              width: '100%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                            }}
                          >
                            <TruckIcon size={14} />
                            <span>{t('pos.pos_workspace.pos_online_orders_modal.s27', "دليفري ومندوب")}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div
            style={{
              padding: '12px 20px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px',
            }}
          >
            <span style={{ color: '#64748b' }}>
              {t('pos.pos_workspace.pos_online_orders_modal.s28', "النظام يسجل العميل تلقائياً ويخصم المخزون فوراً.")}
            </span>
            <Link
              to="/online-orders"
              onClick={onClose}
              style={{
                color: '#170e5e',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{t('pos.pos_workspace.pos_online_orders_modal.s29', "شاشة إدارة الطلبات الكاملة")}</span>
              <span>←</span>
            </Link>
          </div>
        </div>
      </DialogShell>

      <ConvertDeliveryModal
        order={deliveryModalOrder}
        isOpen={Boolean(deliveryModalOrder)}
        onClose={() => setDeliveryModalOrder(null)}
        onSuccess={(data) => {
          queryClient.invalidateQueries({ queryKey: ['pos-online-orders-quick'] });
          queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders-count'] });
          queryClient.invalidateQueries({ queryKey: ['pos-pending-orders-count'] });
          const custMsg = data.isNewCustomer
            ? ` وتم تسجيل (${data.customerName}) كعميل جديد في النظام!`
            : ` (العميل: ${data.customerName})`;
          toast.success(`تم تحويل الطلب بنجاح إلى فاتورة مبيعات دليفري رقم #${data.saleId}${custMsg}`);
        }}
        onLoadToPos={handleLoadToPos}
      />
    </>
  );
}