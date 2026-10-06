import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { systemConfirm, toast } from '@/shared/components/system-alert';
import {
  CheckCircleIcon,
  XIcon,
  RefreshCwIcon,
  SearchIcon,
  ClockIcon,
  DollarSignIcon,
} from '@/shared/components/icons/AppIcons';
import {
  vanSalesApi,
  PreSalesOrderRecord,
} from '../api/van-sales.api';

interface VanPreSalesAdminTabProps {
  reps: Array<{ id: number; name: string }>;
}

export const VanPreSalesAdminTab: React.FC<VanPreSalesAdminTabProps> = ({ reps }) => {
  const queryClient = useQueryClient();

  const [selectedRepId, setSelectedRepId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected Order for Details Modal
  const [inspectingOrderId, setInspectingOrderId] = useState<number | null>(null);

  // Rejection Dialog State
  const [rejectingOrderId, setRejectingOrderId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const {
    data: orders = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'van-admin-presales-orders',
      selectedRepId,
      selectedStatus,
      dateFrom,
      dateTo,
      searchQuery,
    ],
    queryFn: () =>
      vanSalesApi.listAdminPreSalesOrders({
        repId: selectedRepId ? Number(selectedRepId) : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: searchQuery.trim() || undefined,
      }),
  });

  const { data: inspectedOrder, isLoading: isInspectingLoading } = useQuery({
    queryKey: ['van-admin-presales-order-details', inspectingOrderId],
    queryFn: () => (inspectingOrderId ? vanSalesApi.getAdminPreSalesOrderDetails(inspectingOrderId) : null),
    enabled: inspectingOrderId != null,
  });

  // Approve Order Mutation
  const approveMutation = useMutation({
    mutationFn: (orderId: number) => vanSalesApi.approveAdminPreSalesOrder(orderId),
    onSuccess: () => {
      toast.success('تم اعتماد طلبية المندوب وتثبيت الحجز بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['van-admin-presales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['van-admin-presales-order-details'] });
      setInspectingOrderId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر اعتماد طلبية المندوب');
    },
  });

  // Reject Order Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) =>
      vanSalesApi.rejectAdminPreSalesOrder(orderId, reason),
    onSuccess: () => {
      toast.success('تم رفض الطلبية وتحرير كميات المخزون المحجوزة بالمخزن الرئيسي بنجاح');
      queryClient.invalidateQueries({ queryKey: ['van-admin-presales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['van-admin-presales-order-details'] });
      setRejectingOrderId(null);
      setRejectionReason('');
      setInspectingOrderId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر رفض الطلبية');
    },
  });

  const handleApprove = async (order: PreSalesOrderRecord) => {
    const confirmed = await systemConfirm({
      title: 'اعتماد طلبية المندوب',
      message: `هل تود بالتأكيد اعتماد الطلبية رقم #${order.orderNumber} للعميل "${order.customerName || 'عميل'}" بقيمة إجمالية ${Number(order.totalAmount).toFixed(2)}؟`,
      confirmText: 'نعم، اعتمد الطلبية',
      cancelText: 'تراجع',
    });
    if (confirmed) {
      approveMutation.mutate(order.id);
    }
  };

  const openRejectDialog = (orderId: number) => {
    setRejectingOrderId(orderId);
    setRejectionReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectingOrderId) return;
    if (!rejectionReason.trim()) {
      toast.warning('يرجى كتابة سبب رفض الطلبية للمندوب');
      return;
    }
    rejectMutation.mutate({ orderId: rejectingOrderId, reason: rejectionReason.trim() });
  };

  // Metrics
  const pendingCount = orders.filter((o) => o.status === 'pending_supervisor' || o.status === 'pending_approval').length;
  const approvedCount = orders.filter((o) => o.status === 'approved').length;
  const rejectedCount = orders.filter((o) => o.status === 'rejected').length;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_supervisor':
      case 'pending_approval':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
            }}
          >
            بانتظار الاعتماد
          </span>
        );
      case 'approved':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #bbf7d0',
            }}
          >
            معتمدة وجاهزة
          </span>
        );
      case 'rejected':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
            }}
          >
            مرفوضة
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#f1f5f9',
              color: '#475569',
            }}
          >
            {status}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* TOP KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ClockIcon size={20} color="#b45309" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>بانتظار الاعتماد</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#b45309' }}>{pendingCount}</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleIcon size={20} color="#15803d" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>معتمدة</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>{approvedCount}</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XIcon size={20} color="#b91c1c" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>مرفوضة / محررة</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#b91c1c' }}>{rejectedCount}</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSignIcon size={20} color="#4338ca" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>إجمالي قيمة الطلبيات</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#170e5e' }}>
              {totalAmount.toFixed(2)} <CurrencySymbol />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '12px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '180px' }}>
            <input
              type="text"
              placeholder="ابحث برقم الطلب أو العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 28px 0 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
            <SearchIcon
              size={14}
              color="#94a3b8"
              style={{ position: 'absolute', right: '9px', top: '10px' }}
            />
          </div>

          <select
            value={selectedRepId}
            onChange={(e) => setSelectedRepId(e.target.value ? Number(e.target.value) : '')}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              color: '#0f172a',
            }}
          >
            <option value="">جميع المناديب</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              color: '#0f172a',
            }}
          >
            <option value="all">كافة الحالات</option>
            <option value="pending_supervisor">بانتظار الاعتماد فقط</option>
            <option value="approved">المعتمدة</option>
            <option value="rejected">المرفوضة</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>من:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                height: '34px',
                padding: '0 6px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
              }}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>إلى:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                height: '34px',
                padding: '0 6px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
              }}
            />
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => refetch()}
          disabled={isFetching}
          style={{
            height: '34px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <RefreshCwIcon size={14} className={isFetching ? 'spin' : ''} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* ORDERS TABLE CARD */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'right',
              fontSize: '12.5px',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '11.5px',
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: '10px 14px' }}>رقم الطلبية</th>
                <th style={{ padding: '10px 14px' }}>المندوب</th>
                <th style={{ padding: '10px 14px' }}>العميل</th>
                <th style={{ padding: '10px 14px' }}>المخزن المطلوب</th>
                <th style={{ padding: '10px 14px' }}>طريقة الدفع</th>
                <th style={{ padding: '10px 14px' }}>عدد البنود</th>
                <th style={{ padding: '10px 14px' }}>الإجمالي</th>
                <th style={{ padding: '10px 14px' }}>الحالة</th>
                <th style={{ padding: '10px 14px' }}>تاريخ الحجز</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    جاري تحميل طلبيات المناديب الميدانية...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    لا توجد طلبيات حجز ميدانية مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr
                    key={ord.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.1s',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace', color: '#170e5e' }}>
                      #{ord.orderNumber}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {ord.repName || `مندوب #${ord.repId}`}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{ord.customerName || 'عميل نقدي'}</div>
                      {ord.customerPhone ? (
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>{ord.customerPhone}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px' }}>
                      {ord.warehouseLocationName || 'المخزن الرئيسي'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: ord.paymentTerms === 'cash' ? '#dcfce7' : '#fef3c7',
                          color: ord.paymentTerms === 'cash' ? '#15803d' : '#b45309',
                        }}
                      >
                        {ord.paymentTerms === 'cash' ? 'كاش نقدي' : 'آجل على الحساب'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{ord.itemsCount} أصناف</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e' }}>
                      {Number(ord.totalAmount).toFixed(2)} <CurrencySymbol />
                    </td>
                    <td style={{ padding: '10px 14px' }}>{getStatusBadge(ord.status)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '11px', color: '#64748b' }}>
                      {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          onClick={() => setInspectingOrderId(ord.id)}
                          style={{
                            height: '28px',
                            padding: '0 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          التفاصيل
                        </Button>

                        {(ord.status === 'pending_supervisor' || ord.status === 'pending_approval') ? (
                          <>
                            <Button
                              variant="primary"
                              onClick={() => handleApprove(ord)}
                              disabled={approveMutation.isPending}
                              style={{
                                height: '28px',
                                padding: '0 8px',
                                fontSize: '11px',
                                fontWeight: 800,
                                backgroundColor: '#15803d',
                                color: '#ffffff',
                              }}
                            >
                              اعتماد
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => openRejectDialog(ord.id)}
                              disabled={rejectMutation.isPending}
                              style={{
                                height: '28px',
                                padding: '0 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#b91c1c',
                                borderColor: '#fca5a5',
                              }}
                            >
                              رفض
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ORDER DETAILS MODAL */}
      {inspectingOrderId != null && (
        <StandardDialog
          open={true}
          onClose={() => setInspectingOrderId(null)}
          title={`تفاصيل طلبية المندوب #${inspectedOrder?.orderNumber || inspectingOrderId}`}
          subtitle="مراجعة بنود الحجز من المخزن الرئيسي ومستويات الأسعار"
          badge="Pre-Sales"
          width="min(820px, 96vw)"
          footerActions={
            <StandardDialogFooter
              onClose={() => setInspectingOrderId(null)}
              cancelText="إغلاق"
              extraActions={
                (inspectedOrder?.status === 'pending_supervisor' || inspectedOrder?.status === 'pending_approval') ? (
                  <div style={{ display: 'inline-flex', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      onClick={() => openRejectDialog(inspectedOrder.id)}
                      style={{ color: '#b91c1c', borderColor: '#fca5a5', fontWeight: 700, fontSize: '12px' }}
                    >
                      رفض الطلبية
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleApprove(inspectedOrder)}
                      style={{ backgroundColor: '#15803d', color: '#fff', fontWeight: 800, fontSize: '12px' }}
                    >
                      اعتماد الطلبية الآن
                    </Button>
                  </div>
                ) : undefined
              }
            />
          }
        >
          {isInspectingLoading || !inspectedOrder ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              جاري تحميل تفاصيل الطلبية وبنود الحجز...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* ORDER SUMMARY STRIP */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '8px',
                  backgroundColor: '#f8fafc',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>المندوب: </span>
                  <strong style={{ color: '#0f172a' }}>{inspectedOrder.repName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>العميل: </span>
                  <strong style={{ color: '#0f172a' }}>{inspectedOrder.customerName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>طريقة الدفع: </span>
                  <strong style={{ color: inspectedOrder.paymentTerms === 'cash' ? '#15803d' : '#b45309' }}>
                    {inspectedOrder.paymentTerms === 'cash' ? 'كاش نقدي' : 'آجل على الحساب'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>المخزن المحجوز منه: </span>
                  <strong style={{ color: '#170e5e' }}>{inspectedOrder.warehouseLocationName || 'المخزن الرئيسي'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>الحالة: </span>
                  {getStatusBadge(inspectedOrder.status)}
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>تاريخ التسليم المتوقع: </span>
                  <strong>{inspectedOrder.deliveryDate || 'فوري / اليوم'}</strong>
                </div>
              </div>

              {inspectedOrder.notes ? (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                  <b>ملاحظات المندوب:</b> {inspectedOrder.notes}
                </div>
              ) : null}

              {inspectedOrder.supervisorRejectionReason ? (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#b91c1c' }}>
                  <b>سبب الرفض:</b> {inspectedOrder.supervisorRejectionReason}
                </div>
              ) : null}

              {/* ITEMS BREAKDOWN TABLE */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 700, fontSize: '11.5px' }}>
                      <th style={{ padding: '8px 12px' }}>الصنف</th>
                      <th style={{ padding: '8px 12px' }}>الوحدة</th>
                      <th style={{ padding: '8px 12px' }}>الكمية</th>
                      <th style={{ padding: '8px 12px' }}>سعر البيع (للمحل)</th>
                      <th style={{ padding: '8px 12px' }}>سعر المستهلك (SRP)</th>
                      <th style={{ padding: '8px 12px' }}>وفر العرض</th>
                      <th style={{ padding: '8px 12px' }}>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inspectedOrder.items || []).map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{it.productName}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{it.unitName}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{it.quantity}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                          {Number(it.unitPrice).toFixed(2)} <CurrencySymbol />
                          {it.pricingTierType === 'credit' ? (
                            <span style={{ fontSize: '10px', color: '#b45309', marginRight: '4px' }}>(سعر آجل)</span>
                          ) : it.pricingTierType === 'offer' ? (
                            <span style={{ fontSize: '10px', color: '#15803d', marginRight: '4px' }}>(سعر عرض)</span>
                          ) : null}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#2563eb', fontWeight: 600 }}>
                          {it.consumerPrice != null && Number(it.consumerPrice) > 0 ? (
                            <>
                              {Number(it.consumerPrice).toFixed(2)} <CurrencySymbol />
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#16a34a', fontWeight: 600 }}>
                          {it.unitOfferSavings != null && Number(it.unitOfferSavings) > 0 ? (
                            <>
                              {Number(it.unitOfferSavings).toFixed(2)} <CurrencySymbol />
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 800, color: '#170e5e' }}>
                          {Number(it.lineTotal).toFixed(2)} <CurrencySymbol />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f8fafc', fontWeight: 800, borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={6} style={{ padding: '10px 12px', textAlign: 'left' }}>
                        إجمالي الطلبية المستحقة:
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '14px', color: '#059669' }}>
                        {Number(inspectedOrder.totalAmount).toFixed(2)} <CurrencySymbol />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </StandardDialog>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingOrderId != null && (
        <StandardDialog
          open={true}
          onClose={() => setRejectingOrderId(null)}
          title="رفض طلبية المندوب"
          subtitle="سيتم إلغاء الطلبية وتحرير حجز الأصناف وإعادتها فوراً للرصيد المتاح بالمخزن"
          badge="إلغاء حجز"
          width="min(460px, 96vw)"
          footerActions={
            <StandardDialogFooter
              onClose={() => setRejectingOrderId(null)}
              cancelText="تراجع"
              extraActions={
                <Button
                  variant="primary"
                  onClick={handleConfirmReject}
                  disabled={rejectMutation.isPending || !rejectionReason.trim()}
                  style={{ backgroundColor: '#b91c1c', color: '#fff', fontWeight: 800, fontSize: '12px' }}
                >
                  {rejectMutation.isPending ? 'جاري التحرير...' : 'تأكيد الرفض وتحرير المخزون'}
                </Button>
              }
            />
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
              سبب الرفض (سيظهر للمندوب في سجله):
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="مثال: رصيد العميل تجاوز سقف الائتمان / خط سير غير مصرح..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </StandardDialog>
      )}
    </div>
  );
};
