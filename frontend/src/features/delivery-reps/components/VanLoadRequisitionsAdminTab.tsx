import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { systemConfirm, toast } from '@/shared/components/system-alert';
import { vanSalesApi, type VanLoadRequisitionRecord, type DriverAvailableProduct } from '../api/van-sales.api';
import {
  RefreshCwIcon,
  FileTextIcon,
  TruckIcon,
  PlusIcon,
  MinusIcon,
  Trash2Icon,
  XIcon,
} from '@/shared/components/icons/AppIcons';

export interface AdminReviewLine {
  productId: number;
  productName: string;
  barcode?: string;
  requestedQty: number;
  approvedQty: number;
  warehouseAvailQty: number;
}

export function VanLoadRequisitionsAdminTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedReq, setSelectedReq] = useState<VanLoadRequisitionRecord | null>(null);
  const [reviewLines, setReviewLines] = useState<AdminReviewLine[]>([]);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  // 1. Fetch available products in the warehouse for adding items
  const { data: warehouseProducts = [] } = useQuery<DriverAvailableProduct[]>({
    queryKey: ['admin-warehouse-products', selectedReq?.sourceWarehouseId],
    queryFn: () => vanSalesApi.getAdminAvailableProducts(selectedReq?.sourceWarehouseId),
    enabled: Boolean(selectedReq && selectedReq.status === 'pending'),
    staleTime: 30_000,
  });

  // Sync real-time warehouse available quantities
  useEffect(() => {
    if (!warehouseProducts || warehouseProducts.length === 0) return;
    setReviewLines((prev) =>
      prev.map((line) => {
        const found = warehouseProducts.find((p) => p.id === line.productId);
        if (found) {
          return { ...line, warehouseAvailQty: found.totalStock };
        }
        return line;
      }),
    );
  }, [warehouseProducts]);

  // Rejection modal state
  const [rejectModalReq, setRejectModalReq] = useState<VanLoadRequisitionRecord | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');

  const {
    data: requisitions = [],
    isLoading,
    refetch,
  } = useQuery<VanLoadRequisitionRecord[]>({
    queryKey: ['van-admin-load-requisitions', statusFilter],
    queryFn: () => vanSalesApi.listAdminRequisitions({ status: statusFilter || undefined }),
    refetchInterval: 15000,
  });

  const pendingReqs = requisitions.filter((r) => r.status === 'pending');
  const dispatchedReqs = requisitions.filter((r) => r.status === 'dispatched');
  const rejectedReqs = requisitions.filter((r) => r.status === 'rejected');

  const openReviewModal = (req: VanLoadRequisitionRecord) => {
    setSelectedReq(req);
    setAdminNotes(req.notes || '');
    setIsAddProductOpen(false);
    setProductSearch('');
    const items = (req.approvedItems && req.approvedItems.length > 0 ? req.approvedItems : req.requestedItems) || [];
    const lines: AdminReviewLine[] = items.map((it: any) => {
      const orig = (req.requestedItems || []).find((r) => r.productId === it.productId);
      return {
        productId: it.productId,
        productName: it.productName || orig?.productName || 'صنف',
        barcode: it.barcode || orig?.barcode || '',
        requestedQty: orig ? orig.qty : 0,
        approvedQty: it.qty,
        warehouseAvailQty: it.warehouseAvailQty ?? orig?.warehouseAvailQty ?? 0,
      };
    });
    setReviewLines(lines);
  };

  const handleUpdateLineApprovedQty = (productId: number, newQty: number) => {
    setReviewLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, approvedQty: Math.max(0, newQty) } : l)),
    );
  };

  const handleRemoveReviewLine = (productId: number) => {
    setReviewLines((prev) => prev.filter((l) => l.productId !== productId));
    toast.info('تم استبعاد الصنف من إذن التحميل');
  };

  const handleAddProductToReview = (prod: DriverAvailableProduct) => {
    setReviewLines((prev) => {
      const existing = prev.find((l) => l.productId === prod.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === prod.id ? { ...l, approvedQty: l.approvedQty + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          barcode: prod.barcode || '',
          requestedQty: 0,
          approvedQty: 1,
          warehouseAvailQty: prod.totalStock,
        },
      ];
    });
    setIsAddProductOpen(false);
    setProductSearch('');
    toast.success(`تمت إضافة الصنف "${prod.name}" بنجاح`);
  };

  // Review (Update Quantities & Items) Mutation
  const reviewMutation = useMutation({
    mutationFn: ({ id, items, notes }: { id: number; items: { productId: number; qty: number; productName?: string; barcode?: string }[]; notes?: string }) =>
      vanSalesApi.reviewRequisition(id, items, notes),
    onSuccess: () => {
      toast.success('تم حفظ تعديل أصناف وكميات إذن التحميل بنجاح');
      queryClient.invalidateQueries({ queryKey: ['van-admin-load-requisitions'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تحديث كميات الطلب');
    },
  });

  // Dispatch Mutation
  const dispatchMutation = useMutation({
    mutationFn: (id: number) => vanSalesApi.dispatchRequisition(id),
    onSuccess: (data) => {
      toast.success(`تم اعتماد وصرف البضاعة وتحميل السيارة بنجاح! تم فتح الرحلة #${data.tripId}`);
      queryClient.invalidateQueries({ queryKey: ['van-admin-load-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['van-sales-admin-trips'] });
      setSelectedReq(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل صرف وتحميل السيارة');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => vanSalesApi.rejectRequisition(id, reason),
    onSuccess: () => {
      toast.info('تم رفض طلب التحميل');
      queryClient.invalidateQueries({ queryKey: ['van-admin-load-requisitions'] });
      setSelectedReq(null);
      setRejectModalReq(null);
      setRejectReasonInput('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل رفض طلب التحميل');
    },
  });

  const handleDispatch = async (req: VanLoadRequisitionRecord) => {
    if (reviewLines.length === 0) {
      toast.error('لا يمكن اعتماد إذن تحميل خالٍ من الأصناف');
      return;
    }
    const hasZeroApproved = reviewLines.some((l) => l.approvedQty <= 0);
    if (hasZeroApproved) {
      toast.error('يرجى حذف الأصناف ذات الكمية الصفرية أو اعتماد كمية أكبر من صفر قبل الصرف');
      return;
    }

    const ok = await systemConfirm({
      title: 'اعتماد وصرف وتحميل السيارة',
      message: `هل تود صرف البضاعة من مستودع "${req.sourceWarehouseName}" وتحميل سيارة المندوب "${req.repName}" وبدء رحلة التوزيع فوراً؟ سيتم خصم الكميات من المستودع وتحويلها لعهدة السيارة.`,
      confirmText: 'اعتماد وصرف وتحميل الآن',
      cancelText: 'إلغاء',
      variant: 'primary',
    });
    if (ok) {
      try {
        // Automatically save reviewed items first, then dispatch!
        await vanSalesApi.reviewRequisition(
          req.id,
          reviewLines.map((l) => ({
            productId: l.productId,
            qty: l.approvedQty,
            productName: l.productName,
            barcode: l.barcode,
          })),
          adminNotes,
        );
        dispatchMutation.mutate(req.id);
      } catch (err: any) {
        toast.error(err?.message || 'فشل تحديث بيانات الإذن قبل الصرف');
      }
    }
  };

  const handleSaveReviewedItems = () => {
    if (!selectedReq) return;
    if (reviewLines.length === 0) {
      toast.error('لا يمكن حفظ إذن تحميل بدون أي أصناف');
      return;
    }
    reviewMutation.mutate({
      id: selectedReq.id,
      items: reviewLines.map((l) => ({
        productId: l.productId,
        qty: l.approvedQty,
        productName: l.productName,
        barcode: l.barcode,
      })),
      notes: adminNotes,
    });
  };

  const openRejectDialog = (req: VanLoadRequisitionRecord) => {
    setRejectModalReq(req);
    setRejectReasonInput('');
  };

  const confirmReject = () => {
    if (!rejectModalReq) return;
    rejectMutation.mutate({
      id: rejectModalReq.id,
      reason: rejectReasonInput.trim() || 'تم رفض طلب التحميل بواسطة إدارة المستودعات',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', display: 'block' }}>طلبات قيد المراجعة والصرف</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', display: 'block', marginTop: '4px' }}>
            {pendingReqs.length} <span style={{ fontSize: '13px', color: '#f59e0b' }}>طلب تحميل</span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'block' }}>طلبات تم صرفها وبدء رحلتها</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', display: 'block', marginTop: '4px' }}>
            {dispatchedReqs.length} <span style={{ fontSize: '13px', color: '#86efac' }}>رحلة منطلقة</span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', display: 'block' }}>طلبات تحميل مرفوضة</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#991b1b', display: 'block', marginTop: '4px' }}>
            {rejectedReqs.length} <span style={{ fontSize: '13px', color: '#f87171' }}>طلب</span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#4338ca', display: 'block' }}>إجمالي أذونات التحميل المسجلة</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#312e81', display: 'block', marginTop: '4px' }}>
            {requisitions.length} <span style={{ fontSize: '13px', color: '#a5b4fc' }}>إذن</span>
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>تصفية حسب الحالة:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'كافة الطلبات', value: '' },
              { label: `بانتظار الصرف (${pendingReqs.length})`, value: 'pending' },
              { label: 'تم الصرف والتحميل', value: 'dispatched' },
              { label: 'مرفوض', value: 'rejected' },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === f.value ? '#170e5e' : '#f1f5f9',
                  color: statusFilter === f.value ? '#ffffff' : '#475569',
                  transition: 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
            إجمالي السجلات: {requisitions.length}
          </span>
          <Button
            variant="secondary"
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => refetch()}
          >
            <RefreshCwIcon size={13} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Requisitions Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
            جاري تحميل أذونات التحميل الصباحية...
          </div>
        ) : requisitions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            لا توجد أذونات تحميل مطابقة للفلتر المحدد.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>رقم الإذن</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>مندوب التوزيع</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>المركبة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>المستودع المصدر</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>عدد الأصناف</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>إجمالي القطع</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>تاريخ ووقت الطلب</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((r) => {
                const totalReqPieces = (r.requestedItems || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
                const isPending = r.status === 'pending';
                const isDispatched = r.status === 'dispatched';
                const isRejected = r.status === 'rejected';

                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: isPending ? '#fffdf7' : 'transparent' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                      {r.docNo}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {r.repName}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {r.vehiclePlate ? (
                        <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#334155', padding: '2px 7px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 700 }}>
                          لوحة: {r.vehiclePlate}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>غير محددة</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>
                      {r.sourceWarehouseName}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                      {(r.requestedItems || []).length} صنف
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#1e293b' }}>
                      {totalReqPieces} قطعة
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {isPending && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 700 }}>
                          بانتظار الصرف
                        </span>
                      )}
                      {isDispatched && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 700 }}>
                          تم الصرف والتحميل #{r.tripId}
                        </span>
                      )}
                      {isRejected && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 700 }}>
                          مرفوض
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '11px', color: '#64748b' }}>
                      {new Date(r.createdAt).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <Button
                          variant="secondary"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          onClick={() => openReviewModal(r)}
                        >
                          <FileTextIcon size={12} />
                          {isPending ? 'مراجعة واعتماد' : 'معاينة الإذن'}
                        </Button>
                        {isPending && (
                          <Button
                            variant="primary"
                            style={{ fontSize: '11px', padding: '4px 10px', background: '#15803d', color: '#ffffff' }}
                            onClick={() => handleDispatch(r)}
                            disabled={dispatchMutation.isPending}
                          >
                            <TruckIcon size={12} />
                            صرف وتحميل
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Review & Dispatch Modal */}
      {selectedReq && (
        <StandardDialog
          open={Boolean(selectedReq)}
          onClose={() => setSelectedReq(null)}
          title={`مراجعة إذن تحميل الصباح #${selectedReq.docNo}`}
          subtitle={`المندوب: ${selectedReq.repName} • المستودع: ${selectedReq.sourceWarehouseName}`}
          maxWidth="780px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            {/* Header summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>المندوب والسائق:</span>
                <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{selectedReq.repName}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>المركبة المسندة:</span>
                <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{selectedReq.vehiclePlate || '—'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>المستودع المصدر:</span>
                <strong style={{ fontSize: '12.5px', color: '#0369a1' }}>{selectedReq.sourceWarehouseName}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>الحالة:</span>
                <strong style={{ fontSize: '12.5px', color: selectedReq.status === 'dispatched' ? '#15803d' : selectedReq.status === 'rejected' ? '#b91c1c' : '#b45309' }}>
                  {selectedReq.status === 'dispatched' ? 'تم الصرف' : selectedReq.status === 'rejected' ? 'مرفوض' : 'بانتظار الصرف'}
                </strong>
              </div>
            </div>

            {/* Items Table with warehouse availability check */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                  الأصناف المطلوبة ومطابقة المخزون بالمستودع ({reviewLines.length} أصناف)
                </span>
                {selectedReq.status === 'pending' && (
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    يمكنك تعديل الكمية المعتمدة، إضافة أصناف جديدة، أو استبعاد صنف
                  </span>
                )}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 700, width: '38%' }}>الصنف والباركود</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center', width: '15%' }}>طلب المندوب</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center', width: '20%' }}>المتاح بالمستودع</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center', width: '20%' }}>المعتمد للصرف</th>
                    {selectedReq.status === 'pending' && (
                      <th style={{ padding: '8px 12px', width: '7%', textAlign: 'center' }}>حذف</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reviewLines.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        لا توجد أصناف في هذا الإذن. يمكنك إضافة أصناف بالأسفل.
                      </td>
                    </tr>
                  ) : (
                    reviewLines.map((it) => {
                      const avail = it.warehouseAvailQty ?? 0;
                      const isShortage = avail < it.approvedQty;

                      return (
                        <tr key={it.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{it.productName}</span>
                              {it.requestedQty === 0 && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    background: '#e0e7ff',
                                    color: '#3730a3',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  إضافة المشرف
                                </span>
                              )}
                            </div>
                            {it.barcode && (
                              <span style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'monospace', display: 'block' }}>
                                باركود: {it.barcode}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, fontSize: '13px' }}>
                            {it.requestedQty > 0 ? it.requestedQty : <span style={{ color: '#94a3b8' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isShortage ? '#fef2f2' : '#f0fdf4',
                                color: isShortage ? '#b91c1c' : '#15803d',
                                border: `1px solid ${isShortage ? '#fca5a5' : '#bbf7d0'}`,
                              }}
                            >
                              {avail} قطعة {isShortage ? '(عجز)' : '(متوفر)'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {selectedReq.status === 'pending' ? (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  backgroundColor: '#ffffff',
                                  overflow: 'hidden',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleUpdateLineApprovedQty(it.productId, it.approvedQty - 1)}
                                  disabled={it.approvedQty <= 0}
                                  style={{
                                    width: '26px',
                                    height: '28px',
                                    border: 'none',
                                    backgroundColor: '#f8fafc',
                                    color: '#475569',
                                    cursor: it.approvedQty <= 0 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="تقليل الكمية"
                                >
                                  <MinusIcon size={12} />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={it.approvedQty}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                    handleUpdateLineApprovedQty(it.productId, val);
                                  }}
                                  style={{
                                    width: '46px',
                                    height: '28px',
                                    border: 'none',
                                    textAlign: 'center',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    color: isShortage ? '#dc2626' : '#0f172a',
                                    outline: 'none',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateLineApprovedQty(it.productId, it.approvedQty + 1)}
                                  style={{
                                    width: '26px',
                                    height: '28px',
                                    border: 'none',
                                    backgroundColor: '#f8fafc',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="زيادة الكمية"
                                >
                                  <PlusIcon size={12} />
                                </button>
                              </div>
                            ) : (
                              <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                                {it.approvedQty} قطعة
                              </strong>
                            )}
                          </td>
                          {selectedReq.status === 'pending' && (
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveReviewLine(it.productId)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                }}
                                title="استبعاد هذا الصنف"
                              >
                                <Trash2Icon size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Add Extra Item Section for Admin */}
              {selectedReq.status === 'pending' && (
                <div style={{ padding: '10px 12px', background: '#fafafa', borderTop: '1px solid #e2e8f0' }}>
                  {!isAddProductOpen ? (
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setIsAddProductOpen(true)}
                      style={{ fontSize: '12px', fontWeight: 700, color: '#170e5e', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <PlusIcon size={14} />
                      + إضافة صنف إضافي للإذن
                    </Button>
                  ) : (
                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e' }}>
                          اختر صنفاً لإضافته من مستودع "{selectedReq.sourceWarehouseName}":
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddProductOpen(false);
                            setProductSearch('');
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}
                        >
                          <XIcon size={16} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="ابحث بالاسم أو الباركود..."
                        style={{
                          width: '100%',
                          height: '36px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          boxSizing: 'border-box',
                        }}
                        autoFocus
                      />

                      <div
                        style={{
                          maxHeight: '160px',
                          overflowY: 'auto',
                          marginTop: '6px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                        }}
                      >
                        {warehouseProducts
                          .filter((p) => {
                            if (!productSearch.trim()) return true;
                            const q = productSearch.toLowerCase().trim();
                            return (p.name || '').toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q);
                          })
                          .slice(0, 12)
                          .map((p) => {
                            const alreadyInReview = reviewLines.some((l) => l.productId === p.id);
                            return (
                              <div
                                key={p.id}
                                onClick={() => handleAddProductToReview(p)}
                                style={{
                                  padding: '8px 10px',
                                  borderBottom: '1px solid #f1f5f9',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  backgroundColor: alreadyInReview ? '#f8fafc' : '#ffffff',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor = alreadyInReview ? '#f8fafc' : '#ffffff')
                                }
                              >
                                <div>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                                  <span style={{ fontSize: '10.5px', color: '#94a3b8', marginRight: '6px' }}>
                                    {p.barcode || 'بدون باركود'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      color: p.totalStock > 0 ? '#15803d' : '#dc2626',
                                    }}
                                  >
                                    متاح: {p.totalStock} قطعة
                                  </span>
                                  <span style={{ fontSize: '11.5px', color: '#170e5e', fontWeight: 800 }}>
                                    {alreadyInReview ? '+ زيادة كمية' : '+ إضافة'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedReq.status === 'pending' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  ملاحظات وتوجيهات الإدارة:
                </label>
                <input
                  type="text"
                  placeholder="ملاحظات تظهر للمندوب في تقرير الصرف والرحلة..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {selectedReq.rejectionReason && (
              <div style={{ fontSize: '12px', color: '#991b1b', backgroundColor: '#fef2f2', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <strong>سبب الرفض:</strong> {selectedReq.rejectionReason}
              </div>
            )}

            {selectedReq.reviewedByName && (
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                تمت المراجعة بواسطة: <strong>{selectedReq.reviewedByName}</strong>{' '}
                {selectedReq.reviewedAt && `بتاريخ ${new Date(selectedReq.reviewedAt).toLocaleString('ar-EG')}`}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setSelectedReq(null)}>
                إغلاق
              </Button>
              {selectedReq.status === 'pending' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={handleSaveReviewedItems}
                    disabled={reviewMutation.isPending}
                    style={{ fontSize: '12px' }}
                  >
                    {reviewMutation.isPending ? 'جاري الحفظ...' : 'حفظ تعديل الكميات'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => openRejectDialog(selectedReq)}
                    style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '12px' }}
                  >
                    رفض الطلب
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleDispatch(selectedReq)}
                    disabled={dispatchMutation.isPending}
                    style={{ backgroundColor: '#15803d', color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <TruckIcon size={14} />
                    {dispatchMutation.isPending ? 'جاري الصرف والتحميل...' : 'اعتماد وصرف وتحميل وبدء الرحلة'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Reject Reason Modal */}
      {rejectModalReq && (
        <StandardDialog
          open={Boolean(rejectModalReq)}
          onClose={() => setRejectModalReq(null)}
          title={`رفض إذن تحميل الصباح #${rejectModalReq.docNo}`}
          subtitle={`المندوب: ${rejectModalReq.repName} • المستودع: ${rejectModalReq.sourceWarehouseName}`}
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                سبب رفض إذن التحميل <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder="وضح سبب رفض طلب التحميل ليظهر للمندوب في تطبيق الفان..."
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setRejectModalReq(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                disabled={rejectMutation.isPending}
                onClick={confirmReject}
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                {rejectMutation.isPending ? 'جاري الرفض...' : 'تأكيد رفض الإذن'}
              </Button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
