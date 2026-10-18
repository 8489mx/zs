import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RestaurantOperationsDialog } from './RestaurantOperationsDialog';
import { Button } from '@/shared/ui/button';
import {
  RefreshCwIcon,
  ClockIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';
import { deliveryAggregatorsApi } from '@/features/pos/api/delivery-aggregators.api';
import { formatCurrency } from '@/lib/format';
import { isKuwait, isSaudi } from '@/lib/currencies';
import { toast } from '@/shared/components/system-alert';

interface PosDeliveryAggregatorsModalProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export function PosDeliveryAggregatorsModal({ open, onClose, onBack }: PosDeliveryAggregatorsModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isKw = isKuwait();
  const isSa = isSaudi();
  const [activeTab, setActiveTab] = useState<'orders' | 'platforms' | 'stock86'>('orders');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchProductId, setSearchProductId] = useState('');

  // Queries
  const { data: orders = [], isLoading: isLoadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ['delivery-aggregator-orders', selectedStatus],
    queryFn: () => deliveryAggregatorsApi.listOrders({ status: selectedStatus }),
    enabled: open,
    refetchInterval: open ? 10_000 : false, // Poll live orders every 10s
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ['delivery-aggregators-list'],
    queryFn: () => deliveryAggregatorsApi.listAggregators(),
    enabled: open && activeTab === 'platforms',
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      deliveryAggregatorsApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-aggregator-orders'] });
      toast.success('تم تحديث حالة طلب التوصيل');
    },
    onError: () => {
      toast.error('تعذر تحديث حالة الطلب');
    },
  });

  const togglePlatformMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      deliveryAggregatorsApi.updateAggregator(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-aggregators-list'] });
      toast.success('تم تحديث إعدادات المنصة');
    },
    onError: () => {
      toast.error('تعذر تحديث المنصة');
    },
  });

  const trigger86Mutation = useMutation({
    mutationFn: ({ productId, isAvailable }: { productId: number; isAvailable: boolean }) =>
      deliveryAggregatorsApi.trigger86(productId, isAvailable),
    onSuccess: (data) => {
      toast.success(`تم إرسال إشعار 86 للمنصات بنجاح للصنف: ${data.productName}`);
      setSearchProductId('');
    },
    onError: () => {
      toast.error('تعذر إرسال إشعار نفاد الصنف');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return { text: 'جديد / بانتظار التحضير', color: '#b45309', bg: '#fef3c7' };
      case 'preparing':
        return { text: 'جاري التحضير بالمطبخ', color: '#1d4ed8', bg: '#dbeafe' };
      case 'ready':
        return { text: 'جاهز للتسليم للسائق', color: '#047857', bg: '#d1fae5' };
      case 'picked_up':
        return { text: 'تم الاستلام بواسطة السائق', color: '#4338ca', bg: '#e0e7ff' };
      case 'delivered':
        return { text: 'تم التوصيل للعميل', color: '#334155', bg: '#f1f5f9' };
      case 'cancelled':
        return { text: 'ملغي', color: '#b91c1c', bg: '#fee2e2' };
      default:
        return { text: status, color: '#475569', bg: '#f8fafc' };
    }
  };

  return (
    <RestaurantOperationsDialog
      open={open}
      onClose={onClose}
      onBack={onBack}
      backText={t('pos.pos_workspace.pos_delivery_aggregators_modal.s0', "الرجوع لعمليات المطعم")}
      title={
        isKw
          ? t('pos.pos_workspace.pos_delivery_aggregators_modal.s1', "منظومة تطبيقات التوصيل بالكويت (طلبات، دليفرو، كاري، جاهز، كيتا)")
          : isSa
          ? t('pos.pos_workspace.pos_delivery_aggregators_modal.s2', "منظومة تطبيقات التوصيل بالسعودية (جاهز، هنقرستيشن، تويو، ذا شفز، كيتا، مرسول)")
          : t('pos.pos_workspace.pos_delivery_aggregators_modal.s3', "منظومة تطبيقات التوصيل (طلبات، المنيوز، نون فود، مرسول، التوصيل المباشر)")
      }
      subtitle={t('pos.pos_workspace.pos_delivery_aggregators_modal.s4', "إدارة وتوجيه الطلبيات اللحظية، عمولات المنصات، وإيقاف الأصناف التلقائي (86 Out of Stock)")}
      footerNote={t('pos.pos_workspace.pos_delivery_aggregators_modal.s5', "تكامل واجهات برمجة تطبيقات التوصيل المتعددة مع منصة المطعم المركزية")}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'orders' ? '#170e5e' : '#ffffff',
              color: activeTab === 'orders' ? '#ffffff' : '#475569',
            }}
          >
            {t('pos.pos_workspace.pos_delivery_aggregators_modal.s6', "طلبات التوصيل الحية (")}{orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('platforms')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'platforms' ? '#170e5e' : '#ffffff',
              color: activeTab === 'platforms' ? '#ffffff' : '#475569',
            }}
          >
            {t('pos.pos_workspace.pos_delivery_aggregators_modal.s7', "منصات التوصيل والعمولات")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock86')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'stock86' ? '#170e5e' : '#ffffff',
              color: activeTab === 'stock86' ? '#ffffff' : '#475569',
            }}
          >
            {t('pos.pos_workspace.pos_delivery_aggregators_modal.s8', "إيقاف الأصناف الفوري (86 Dispatcher)")}
          </button>
        </div>

        {/* Tab 1: Live Orders */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'received', 'preparing', 'ready', 'picked_up'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #e2e8f0',
                      backgroundColor: selectedStatus === st ? '#e2e8f0' : '#ffffff',
                      color: selectedStatus === st ? '#0f172a' : '#64748b',
                    }}
                  >
                    {st === 'all'
                      ? t('pos.pos_workspace.pos_delivery_aggregators_modal.s9', "الكل")
                      : st === 'received'
                      ? t('pos.pos_workspace.pos_delivery_aggregators_modal.s10', "جديد")
                      : st === 'preparing'
                      ? t('pos.pos_workspace.pos_delivery_aggregators_modal.s11', "تحضير")
                      : st === 'ready'
                      ? t('pos.pos_workspace.pos_delivery_aggregators_modal.s12', "جاهز")
                      : t('pos.pos_workspace.pos_delivery_aggregators_modal.s13', "تم الاستلام")}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetchOrders()}
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCwIcon size={13} />
                {t('pos.pos_workspace.pos_delivery_aggregators_modal.s14', "تحديث لحظي")}
              </Button>
            </div>

            <div
              style={{
                height: '340px',
                minHeight: '340px',
                maxHeight: '340px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                padding: '8px',
              }}
            >
              {isLoadingOrders ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{t('pos.pos_workspace.pos_delivery_aggregators_modal.s15', "جاري جلب طلبات المنصات...")}</span>
                </div>
              ) : orders.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '8px',
                  }}
                >
                  <ClockIcon size={28} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    {t('pos.pos_workspace.pos_delivery_aggregators_modal.s16', "لا توجد طلبات توصيل واردة حالياً")}
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    {t('pos.pos_workspace.pos_delivery_aggregators_modal.s17', "الطلبات الواردة من جاهز وهنقرستيشن وطلبات وكيتا تظهر هنا لحظياً")}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orders.map((ord) => {
                    const badge = getStatusBadge(ord.status);
                    return (
                      <div
                        key={ord.id}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          padding: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#170e5e',
                                backgroundColor: '#eef2ff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {ord.display_number || ord.external_order_id}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                              {ord.aggregator_name}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                color: badge.color,
                                backgroundColor: badge.bg,
                              }}
                            >
                              {badge.text}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {t('pos.pos_workspace.pos_delivery_aggregators_modal.s18', "العميل:")} {ord.customer_name || '—'} {ord.customer_phone ? `(${ord.customer_phone})` : ''} {t('pos.pos_workspace.pos_delivery_aggregators_modal.s19', "|\n                            السائق:")} {ord.rider_name || t('pos.pos_workspace.pos_delivery_aggregators_modal.s20', "بانتظار تخصيص سائق")}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                              {formatCurrency(Number(ord.subtotal))}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                              {t('pos.pos_workspace.pos_delivery_aggregators_modal.s21', "الصافي بعد العمولة:")} {formatCurrency(Number(ord.net_payout))}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            {ord.status === 'received' && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: ord.id, status: 'preparing' })}
                                style={{ backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '11px' }}
                              >
                                {t('pos.pos_workspace.pos_delivery_aggregators_modal.s22', "بدء التحضير")}
                              </Button>
                            )}
                            {ord.status === 'preparing' && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: ord.id, status: 'ready' })}
                                style={{ backgroundColor: '#047857', color: '#ffffff', fontSize: '11px' }}
                              >
                                {t('pos.pos_workspace.pos_delivery_aggregators_modal.s23', "جاهز للتسليم")}
                              </Button>
                            )}
                            {ord.status === 'ready' && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: ord.id, status: 'picked_up' })}
                                style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '11px' }}
                              >
                                {t('pos.pos_workspace.pos_delivery_aggregators_modal.s24', "تسليم للسائق")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Aggregator Channels */}
        {activeTab === 'platforms' && (
          <div style={{ height: '380px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>{t('pos.pos_workspace.pos_delivery_aggregators_modal.s25', "المنصة")}</th>
                  <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    {t('pos.pos_workspace.pos_delivery_aggregators_modal.s26', "نسبة العمولة الافتراضية")}
                  </th>
                  <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    {t('pos.pos_workspace.pos_delivery_aggregators_modal.s27', "القبول التلقائي للطلبات")}
                  </th>
                  <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>{t('pos.pos_workspace.pos_delivery_aggregators_modal.s28', "الحالة")}</th>
                  <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>{t('pos.pos_workspace.pos_delivery_aggregators_modal.s29', "إجراء")}</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12.5px', color: '#64748b' }}>
                      %{Number(p.commission_rate)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12px', color: '#047857' }}>
                      {p.auto_accept_orders ? t('pos.pos_workspace.pos_delivery_aggregators_modal.s30', "مفعل (إرسال مباشر للمطبخ)") : t('pos.pos_workspace.pos_delivery_aggregators_modal.s31', "يدوي")}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: p.is_active ? '#dcfce7' : '#fee2e2',
                          color: p.is_active ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {p.is_active ? t('pos.pos_workspace.pos_delivery_aggregators_modal.s32', "نشط") : t('pos.pos_workspace.pos_delivery_aggregators_modal.s33', "معطل")}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => togglePlatformMutation.mutate({ id: p.id, is_active: !p.is_active })}
                        style={{ fontSize: '11px' }}
                      >
                        {p.is_active ? t('pos.pos_workspace.pos_delivery_aggregators_modal.s34', "تعطيل") : t('pos.pos_workspace.pos_delivery_aggregators_modal.s35', "تفعيل")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: 86 Out of Stock Dispatcher */}
        {activeTab === 'stock86' && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangleIcon size={18} />
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                {t('pos.pos_workspace.pos_delivery_aggregators_modal.s36', "إيقاف الصنف التلقائي على كافة منصات التوصيل (Instant 86 Dispatcher)")}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              {t('pos.pos_workspace.pos_delivery_aggregators_modal.s37', "عند نفاد أي صنف في المطبخ، أدخل رقم الصنف (Product ID) وسيتم فوراً إرسال إشعار 86 لمنصات (جاهز، هنقرستيشن،\n              طلبات، كيتا، دليفرو) لمنع الزبائن من طلبه وتفادي غرامات الإلغاء.")}
            </p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                placeholder={t('pos.pos_workspace.pos_delivery_aggregators_modal.s38', "أدخل رقم الصنف (ID)")}
                value={searchProductId}
                onChange={(e) => setSearchProductId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  width: '220px',
                }}
              />
              <Button
                onClick={() =>
                  trigger86Mutation.mutate({ productId: Number(searchProductId), isAvailable: false })
                }
                disabled={!searchProductId || trigger86Mutation.isPending}
                style={{ backgroundColor: '#b91c1c', color: '#ffffff', fontSize: '12px' }}
              >
                {t('pos.pos_workspace.pos_delivery_aggregators_modal.s39', "إيقاف الصنف فوراً (Out of Stock)")}
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  trigger86Mutation.mutate({ productId: Number(searchProductId), isAvailable: true })
                }
                disabled={!searchProductId || trigger86Mutation.isPending}
                style={{ fontSize: '12px' }}
              >
                {t('pos.pos_workspace.pos_delivery_aggregators_modal.s40', "إعادة تفعيل الصنف (Available)")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </RestaurantOperationsDialog>
  );
}
