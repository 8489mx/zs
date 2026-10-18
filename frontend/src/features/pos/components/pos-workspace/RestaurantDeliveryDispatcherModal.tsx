import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RestaurantOperationsDialog } from './RestaurantOperationsDialog';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { storefrontApi } from '@/features/storefront';
import { getGlobalCurrencySymbol, isKuwait } from '@/lib/currencies';
import { openWhatsAppChat, formatRestaurantOrderWhatsAppMessage } from '@/lib/whatsapp';
import {
  TruckIcon,
  PhoneIcon,
  MapPinIcon,
  CheckShieldIcon,
  CheckCircleIcon,
  SendIcon,
} from '@/shared/components/icons/AppIcons';

interface RestaurantDeliveryDispatcherModalProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export function RestaurantDeliveryDispatcherModal({
  open,
  onClose,
  onBack,
}: RestaurantDeliveryDispatcherModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currencySymbol = getGlobalCurrencySymbol();
  const isKwd = isKuwait();

  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [recentNotifications, setRecentNotifications] = useState<
    Array<{ recipientPhone: string; orderNumber: string; text: string }>
  >([]);

  // 1. Fetch available in-house drivers
  const repsQuery = useQuery({
    queryKey: ['delivery-reps-list'],
    queryFn: deliveryRepsApi.list,
    enabled: open,
    staleTime: 30_000,
  });
  const reps: DeliveryRep[] = (repsQuery.data as any) || [];
  const activeReps = reps.filter((r) => r.is_active !== false);

  // 2. Fetch pending online / storefront delivery orders
  const onlineOrdersQuery = useQuery({
    queryKey: ['dispatcher-online-orders'],
    queryFn: () => storefrontApi.listOrders('confirmed'),
    enabled: open,
    refetchInterval: 10_000,
  });
  const pendingOrders = onlineOrdersQuery.data?.orders || [];

  const toggleOrderSelection = (id: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrderIds.length === pendingOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(pendingOrders.map((o) => o.id));
    }
  };

  const dispatchMutation = useMutation({
    mutationFn: () => {
      if (!selectedRepId) throw new Error('يرجى اختيار كابتن التوصيل أولاً');
      if (selectedOrderIds.length === 0) throw new Error('يرجى اختيار طلب واحد على الأقل للإسناد');
      return deliveryRepsApi.dispatchOrders({
        repId: selectedRepId,
        onlineOrderIds: selectedOrderIds,
        notes: dispatchNotes.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      toast.success(data.message || 'تم إسناد وانطلاق الطلبات بنجاح');
      setRecentNotifications(data.notifications || []);
      setSelectedOrderIds([]);
      setDispatchNotes('');
      queryClient.invalidateQueries({ queryKey: ['dispatcher-online-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-online-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر إسناد الطلبات للكابتن');
    },
  });

  const selectedRep = useMemo(
    () => activeReps.find((r) => r.id === selectedRepId),
    [activeReps, selectedRepId]
  );

  return (
    <RestaurantOperationsDialog
      open={open}
      onClose={onClose}
      onBack={onBack}
      backText={t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s0', "الرجوع لعمليات المطعم")}
      title={t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s1', "لوحة توجيه وإسناد طلبات الدليفري (Restaurant Dispatcher)")}
      subtitle={t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s2', "توجيه الطلبات الجاهزة لكباتن المطعم بنقرة واحدة مع إشعارات واتساب فورية للعملاء")}
      footerNote={t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s3', "توجيه الطلبات يرسل إشعارات واتساب تلقائية للعملاء مع بيانات السائق")}
      icon={<TruckIcon size={18} color="#170e5e" />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Notifications Bar (if just dispatched) */}
        {recentNotifications.length > 0 && (
          <div
            style={{
              marginTop: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircleIcon size={14} color="#166534" />
              <span>{t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s4', "تم انطلاق الطلبات! إشعارات الواتساب الجاهزة للعملاء:")}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {recentNotifications.map((notif, idx) => (
                <a
                  key={idx}
                  href={`https://wa.me/${notif.recipientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(notif.text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#22c55e',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <SendIcon size={11} color="#ffffff" />
                  <span>{t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s5', "إرسال واتساب لطلب #")}{notif.orderNumber}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Two-Column Grid */}
        <div
          style={{
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
            gap: '16px',
          }}
        >
          {/* Column 1: Ready Orders */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '340px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '10px',
                borderBottom: '1px solid #f1f5f9',
                marginBottom: '10px',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                  {t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s6', "الطلبات الجاهزة للإسناد والتوصيل")}
                </strong>
                <span style={{ fontSize: '11px', color: '#64748b', marginRight: '6px' }}>
                  ({pendingOrders.length} {t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s7', "طلب جاهز)")}
                </span>
              </div>
              {pendingOrders.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllOrders}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#170e5e',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {selectedOrderIds.length === pendingOrders.length ? t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s8', "إلغاء تحديد الكل") : t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s9', "تحديد الكل")}
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '310px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingOrders.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '240px',
                    color: '#94a3b8',
                    gap: '8px',
                    fontSize: '12.5px',
                  }}
                >
                  <CheckShieldIcon size={24} color="#94a3b8" />
                  <span>{t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s10', "لا توجد طلبات دليفري معلقة بانتظار التوجيه حالياً")}</span>
                </div>
              ) : (
                pendingOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrderSelection(order.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                        background: isSelected ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ marginTop: '3px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                            {t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s11', "طلب #")}{order.orderNumber}
                          </strong>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e' }}>
                            {order.totalAmount} {currencySymbol}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{order.customerName}</span>
                          {order.customerPhone && (
                            <>
                              <span>•</span>
                              <PhoneIcon size={10} color="#64748b" />
                              <span>{order.customerPhone}</span>
                            </>
                          )}
                        </div>
                        {order.customerAddress && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPinIcon size={10} color="#64748b" />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {order.customerAddress}
                            </span>
                          </div>
                        )}
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: order.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
                              color: order.paymentStatus === 'paid' ? '#166534' : '#92400e',
                            }}
                          >
                            {order.paymentStatus === 'paid' ? t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s12', "مسدد إلكترونياً") : t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s13', "مطلوب تحصيل كاش (COD)")}
                          </span>
                          {order.customerPhone ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = formatRestaurantOrderWhatsAppMessage({
                                  customerName: order.customerName,
                                  orderNumber: order.orderNumber,
                                  total: Number(order.totalAmount || 0),
                                  deliveryFee: Number(order.deliveryFee || 0),
                                  storeName: t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s14', "المطعم"),
                                  currency: currencySymbol,
                                });
                                openWhatsAppChat(order.customerPhone!, msg);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#166534',
                                borderRadius: '4px',
                                padding: '2px 7px',
                                cursor: 'pointer',
                              }}
                              title={isKwd ? t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s15', "إرسال رسالة تفاصيل الطلب وخيارات السداد K-NET عبر الواتساب") : t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s16', "إرسال تفاصيل الطلب وخيارات السداد للعميل عبر الواتساب")}
                            >
                              <SendIcon size={11} color="#166534" />
                              <span>{isKwd ? t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s17', "واتساب K-NET") : t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s18', "إرسال واتساب")}</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: In-House Drivers & Dispatch CTA */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '340px',
            }}
          >
            <div>
              <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                {t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s19', "كباتن وسائقو المطعم المتاحون")}
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {activeReps.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8', padding: '12px', textAlign: 'center' }}>
                    {t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s20', "لم يتم تسجيل مناديب توصيل نشطين في النظام حتى الآن.")}
                  </div>
                ) : (
                  activeReps.map((rep) => {
                    const isSelected = selectedRepId === rep.id;
                    return (
                      <div
                        key={rep.id}
                        onClick={() => setSelectedRepId(rep.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                          background: isSelected ? '#ffffff' : '#f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{rep.name}</strong>
                          {rep.phone && (
                            <span style={{ fontSize: '11px', color: '#64748b', marginRight: '6px' }}>
                              ({rep.phone})
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isSelected ? '#170e5e' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : '#475569',
                          }}
                        >
                          {isSelected ? t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s21', "محدد") : t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s22', "متاح")}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dispatch Notes */}
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '11.5px', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  {t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s23', "ملاحظات الرحلة والتسليم (اختياري):")}
                </label>
                <input
                  type="text"
                  placeholder={t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s24', "مثال: توصيل مجمع في حي النزهة، صوص إضافي...")}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  style={{
                    width: '100%',
                    height: '32px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 8px',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                />
              </div>
            </div>

            {/* Action CTA */}
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s25', "الطلبات المحددة:")} <strong>{selectedOrderIds.length}</strong></span>
                <span>{t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s26', "الكابتن:")} <strong>{selectedRep ? selectedRep.name : t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s27', "لم يُحدد")}</strong></span>
              </div>
              <Button
                variant="primary"
                onClick={() => dispatchMutation.mutate()}
                disabled={
                  dispatchMutation.isPending ||
                  selectedOrderIds.length === 0 ||
                  !selectedRepId
                }
                style={{
                  width: '100%',
                  height: '42px',
                  background: '#170e5e',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <TruckIcon size={16} color="#ffffff" />
                <span>
                  {dispatchMutation.isPending
                    ? t('pos.pos_workspace.restaurant_delivery_dispatcher_modal.s28', "جارٍ الإسناد والتوجيه...")
                    : `انطلاق وتوجيه ${selectedOrderIds.length} طلب للكابتن`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </RestaurantOperationsDialog>
  );
}
