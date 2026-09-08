import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  salesOrdersApi,
  type SalesOrderRecord,
  type CreateSalesOrderPayload,
  type SalesOrderItem,
} from '../api/sales-orders.api';
import { workOrdersApi } from '@/features/manufacturing/api/work-orders.api';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { formatCurrency } from '@/lib/format';
import {
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  Trash2Icon,
  XIcon,
  CheckCircleIcon,
  LockIcon,
  ShoppingCartIcon,
  PackageIcon,
  EyeIcon,
} from '@/shared/components/icons/AppIcons';
import { useAppToolbar } from '@/stores/toolbar-store';

export function SalesOrdersPage() {
  useAppToolbar([{ label: 'المبيعات', to: '/sales' }, { label: 'أوامر البيع وحجز المخزون' }]);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Form state for creating sales order
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [reservationExpiresAt, setReservationExpiresAt] = useState('');
  const [autoReserve, setAutoReserve] = useState(true);
  const [notes, setNotes] = useState('');
  const termsConditions = 'يتم حجز الأصناف المحددة بالمخزون لحين استلام العميل وسداد قيمة الفاتورة.';
  const [items, setItems] = useState<Array<SalesOrderItem & { productId: number; productName: string }>>([
    { productId: 1, productName: '', unitName: 'قطعة', quantity: 1, unitPrice: 0, discount: 0, total: 0 },
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders-list', statusFilter, search],
    queryFn: () =>
      salesOrdersApi.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      }),
  });

  const { data: orderDetailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['sales-order-details', selectedOrder?.id],
    queryFn: () => salesOrdersApi.getById(selectedOrder!.id),
    enabled: Boolean(selectedOrder?.id && isDetailsModalOpen),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSalesOrderPayload) => salesOrdersApi.create(payload),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'فشل حفظ أمر البيع');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => salesOrdersApi.confirmAndReserve(id),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] });
      if (selectedOrder?.id) {
        queryClient.invalidateQueries({ queryKey: ['sales-order-details', selectedOrder.id] });
      }
    },
    onError: (err: any) => {
      alert(err.message || 'فشل تأكيد أمر البيع وحجز المخزون');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => salesOrdersApi.cancel(id),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] });
      if (selectedOrder?.id) {
        queryClient.invalidateQueries({ queryKey: ['sales-order-details', selectedOrder.id] });
      }
    },
    onError: (err: any) => {
      alert(err.message || 'فشل إلغاء أمر البيع');
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => salesOrdersApi.convertToSale(id),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] });
      setIsDetailsModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.message || 'فشل تحويل أمر البيع إلى فاتورة');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => salesOrdersApi.delete(id),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] });
    },
    onError: (err: any) => {
      alert(err.message || 'فشل حذف أمر البيع');
    },
  });

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setDeliveryDate('');
    setReservationExpiresAt('');
    setAutoReserve(true);
    setNotes('');
    setItems([
      { productId: 1, productName: '', unitName: 'قطعة', quantity: 1, unitPrice: 0, discount: 0, total: 0 },
    ]);
  };

  const handleItemChange = (index: number, field: keyof SalesOrderItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
    const price = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
    const discount = Number(field === 'discount' ? value : item.discount) || 0;
    item.total = Math.max(0, qty * price - discount);
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: items.length + 1,
        productName: '',
        unitName: 'قطعة',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0),
    0
  );
  const totalDiscount = items.reduce((sum, it) => sum + Number(it.discount || 0), 0);
  const totalAmount = Math.max(0, subtotal - totalDiscount);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('يرجى كتابة اسم العميل');
      return;
    }

    const validItems = items.filter((it) => it.productName.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل باسم وكمية صحيحة');
      return;
    }

    createMutation.mutate({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      deliveryDate: deliveryDate || undefined,
      reservationExpiresAt: reservationExpiresAt || undefined,
      autoReserve,
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: 0,
      totalAmount,
      notes: notes.trim() || undefined,
      termsConditions: termsConditions.trim() || undefined,
      items: validItems.map((it) => ({
        productId: it.productId,
        productName: it.productName.trim(),
        unitName: it.unitName?.trim(),
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount || 0),
        total: Number(it.total),
        notes: it.notes?.trim(),
      })),
    });
  };

  const orders = data?.orders || [];
  const summary = data?.summary || { all: 0, draft: 0, confirmed: 0, converted: 0, cancelled: 0 };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'confirmed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
            <LockIcon size={12} color="#1e40af" />
            مؤكد ومحجوز بالمخزن
          </span>
        );
      case 'converted':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
            <CheckCircleIcon size={12} color="#065f46" />
            تم التحويل لفاتورة
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '999px', backgroundColor: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' }}>
            <XIcon size={12} color="#9f1239" />
            ملغي
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '999px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            مسودة غير محجوزة
          </span>
        );
    }
  };

  return (
    <div className="page-stack page-shell sales-orders-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="أوامر البيع وحجز المخزون"
          description="إدارة وتأكيد أوامر البيع التجارية وحجز الكميات مؤقتاً في المستودع ومنع البيع المزدوج قبل إصدار الفاتورة النهائية."
          badge={<span className="nav-pill">{summary.all} أمر بيع</span>}
          actions={
            <div className="actions compact-actions page-header-actions">
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
                className="btn btn-primary flex items-center gap-1.5"
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                <PlusIcon size={16} color="#ffffff" />
                <span>+ أمر بيع جديد</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] })}
                className="flex items-center gap-1.5"
              >
                <RefreshCwIcon size={14} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* Stats Grid */}
        <div style={{ marginBottom: '16px' }}>
          <StatsGrid
            items={[
              {
                key: 'all',
                label: 'إجمالي أوامر البيع',
                value: `${summary.all} أمر`,
              },
              {
                key: 'confirmed',
                label: 'أوامر مؤكدة وحاجزة للمخزون',
                value: `${summary.confirmed} أمر`,
              },
              {
                key: 'draft',
                label: 'مسودات قيد المراجعة',
                value: `${summary.draft} مسودة`,
              },
              {
                key: 'converted',
                label: 'مكتملة ومحولة لفواتير',
                value: `${summary.converted} فاتورة`,
              },
            ]}
          />
        </div>

        {/* Main Workspace Panel & Table */}
        <section className="document-prototype-section workspace-panel">
          <div className="section-header-compact-row">
            <h3 className="document-prototype-section-title">سجل أوامر البيع وحجز المخزون</h3>
            <div className="section-header-actions-group">
              <span className="text-xs text-slate-500 font-medium">عرض {orders.length} من أصل {summary.all}</span>
            </div>
          </div>
          <p className="muted small section-header-subtitle">
            متابعة حجز المخزون المؤقت، فحص الجاهزية والربط بالتصنيع MTO، والتحويل لفواتير معتمدة.
          </p>

          {/* Filters and Search Bar */}
          <div className="products-table-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '12px 0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {[
                  { key: 'all', label: 'الكل' },
                  { key: 'confirmed', label: 'المؤكدة والحاجزة للمخزون' },
                  { key: 'draft', label: 'المسودات' },
                  { key: 'converted', label: 'المحولة لفواتير' },
                  { key: 'cancelled', label: 'الملغاة' },
                ].map((st) => {
                  const isActive = statusFilter === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setStatusFilter(st.key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: isActive ? '1px solid #170e5e' : '1px solid #cbd5e1',
                        backgroundColor: isActive ? '#170e5e' : '#ffffff',
                        color: isActive ? '#ffffff' : '#475569',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 1px 3px rgba(23, 14, 94, 0.25)' : 'none',
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ position: 'relative', minWidth: '280px' }}>
                <input
                  type="text"
                  placeholder="بحث برقم الأمر أو العميل أو الهاتف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <SearchIcon size={15} color="#94a3b8" />
                </div>
              </div>
            </div>
          </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                  <th className="p-3.5">رقم أمر البيع</th>
                  <th className="p-3.5">العميل</th>
                  <th className="p-3.5">تاريخ التسليم / الصلاحية</th>
                  <th className="p-3.5">المبلغ الإجمالي</th>
                  <th className="p-3.5">حالة الأمر وحجز المخزون</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-500">
                      جاري تحميل أوامر البيع...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <PackageIcon size={32} color="#cbd5e1" />
                        <p className="font-semibold text-slate-600">لا توجد أوامر بيع مطابقة</p>
                        <p className="text-xs text-slate-400">
                          اضغط على "أمر بيع جديد" لإنشاء طلبية وحجز المخزون للعميل
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        <span className="font-mono text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{order.customer_name}</div>
                        {order.customer_phone && (
                          <div className="text-[11px] text-slate-500 font-mono">{order.customer_phone}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {order.delivery_date ? (
                          <div>تسليم: {new Date(order.delivery_date).toLocaleDateString('ar-EG')}</div>
                        ) : (
                          <div>{new Date(order.created_at).toLocaleDateString('ar-EG')}</div>
                        )}
                        {order.reservation_expires_at && (
                          <div className="text-[11px] text-amber-700 font-medium">
                            صلاحية الحجز: {new Date(order.reservation_expires_at).toLocaleDateString('ar-EG')}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {formatCurrency(Number(order.total_amount))}
                      </td>
                      <td className="p-3.5">{getStatusBadge(order.status)}</td>
                      <td className="p-3.5 text-center">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailsModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer',
                            }}
                            title="عرض التفاصيل وجاهزية المخزون"
                          >
                            <EyeIcon size={13} color="#475569" />
                            <span>التفاصيل</span>
                          </button>

                          {/* Confirm & Reserve Button (if draft) */}
                          {order.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => confirmMutation.mutate(order.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe',
                                backgroundColor: '#eff6ff',
                                color: '#1e40af',
                                cursor: 'pointer',
                              }}
                              title="تأكيد وحجز كميات المخزون"
                            >
                              <LockIcon size={13} color="#1e40af" />
                              <span>حجز المخزون</span>
                            </button>
                          )}

                          {/* Convert to Sale Button */}
                          {(order.status === 'confirmed' || order.status === 'draft') && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `هل تريد تحويل أمر البيع رقم ${order.order_number} إلى فاتورة بيع فعلية وخصم المخزون؟`
                                  )
                                ) {
                                  convertMutation.mutate(order.id);
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                borderRadius: '6px',
                                border: '1px solid #059669',
                                backgroundColor: '#059669',
                                color: '#ffffff',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
                              }}
                              title="تحويل مباشر لفاتورة بيع"
                            >
                              <ShoppingCartIcon size={13} color="#ffffff" />
                              <span>تحويل لفاتورة</span>
                            </button>
                          )}

                          {/* Cancel Order (if draft or confirmed) */}
                          {(order.status === 'confirmed' || order.status === 'draft') && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `هل أنت متأكد من إلغاء أمر البيع رقم ${order.order_number}؟ سيتم فك حجز الكميات فوراً وإعادتها للمخزون المتاح.`
                                  )
                                ) {
                                  cancelMutation.mutate(order.id);
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 8px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #fecdd3',
                                backgroundColor: '#ffffff',
                                color: '#be123c',
                                cursor: 'pointer',
                              }}
                              title="إلغاء أمر البيع وفك الحجز"
                            >
                              <span>إلغاء</span>
                            </button>
                          )}

                          {/* Delete (if cancelled or draft) */}
                          {(order.status === 'draft' || order.status === 'cancelled') && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف أمر البيع ${order.order_number} نهائياً؟`)) {
                                  deleteMutation.mutate(order.id);
                                }
                              }}
                              style={{
                                padding: '5px',
                                color: '#94a3b8',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title="حذف نهائي"
                            >
                              <Trash2Icon size={14} color="#94a3b8" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </section>
      </main>

      {/* 1. Create Sales Order Modal */}
      {isCreateModalOpen && (
        <DialogShell
          open={true}
          onClose={() => setIsCreateModalOpen(false)}
          width="min(820px, 95vw)"
          ariaLabel="إنشاء أمر بيع جديد"
        >
          <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="standard-dialog-header">
              <div className="standard-dialog-header-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PackageIcon size={18} color="#170e5e" />
                  </div>
                  <div>
                    <h3 className="standard-dialog-title">إنشاء أمر بيع جديد (Sales Order)</h3>
                    <p className="standard-dialog-subtitle">حجز المخزون وتثبيت الأسعار والكميات للعميل</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="standard-dialog-close-btn"
                aria-label="إغلاق"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer and General Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    اسم العميل <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="اسم العميل أو المنشأة..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    هاتف العميل
                  </label>
                  <input
                    type="text"
                    placeholder="رقم الهاتف للتواصل..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    تاريخ التسليم المتوقع
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    صلاحية حجز المخزون حتى
                  </label>
                  <input
                    type="date"
                    value={reservationExpiresAt}
                    onChange={(e) => setReservationExpiresAt(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    عنوان العميل / موقع التسليم
                  </label>
                  <input
                    type="text"
                    placeholder="العنوان التفصيلي..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Stock Reservation Toggle Option */}
              <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LockIcon size={16} color="#1d4ed8" />
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a', display: 'block' }}>
                      تفعيل حجز المخزون المؤقت فور الحفظ (Stock Reservation)
                    </span>
                    <span style={{ fontSize: '11px', color: '#1d4ed8' }}>
                      يتم زيادة الكمية المحجوزة للمنتجات ومنع بيعها في الكاشير أو المتجر الإلكتروني
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoReserve}
                  onChange={(e) => setAutoReserve(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Items Table */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', fontWeight: 700, fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1' }}>
                  <span>أصناف وكميات أمر البيع</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{ fontSize: '12px', color: '#170e5e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <PlusIcon size={14} />
                    <span>إضافة صنف</span>
                  </button>
                </div>
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          placeholder="اسم الصنف أو كوده..."
                          required
                          value={it.productName}
                          onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ width: '80px' }}>
                        <input
                          type="number"
                          min="1"
                          placeholder="الكمية"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ width: '96px' }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="سعر الوحدة"
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ width: '80px' }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="خصم"
                          value={it.discount}
                          onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ width: '96px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: '#1e293b', paddingLeft: '4px' }}>
                        {formatCurrency(Number(it.total))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        style={{ padding: '4px', color: items.length <= 1 ? '#cbd5e1' : '#ef4444', background: 'none', border: 'none', cursor: items.length <= 1 ? 'not-allowed' : 'pointer' }}
                      >
                        <Trash2Icon size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>المجموع قبل الخصم: </span>
                  <strong style={{ color: '#1e293b' }}>{formatCurrency(subtotal)}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>إجمالي الخصم: </span>
                  <strong style={{ color: '#dc2626' }}>{formatCurrency(totalDiscount)}</strong>
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#170e5e' }}>
                  <span>الصافي المطلوب: </span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="standard-dialog-footer">
                <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
                >
                  {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ أمر البيع وحجز المخزون'}
                </Button>
              </div>
            </form>
          </div>
        </DialogShell>
      )}

      {/* 2. Order Details & Real-Time Stock Readiness Modal */}
      {isDetailsModalOpen && (
        <DialogShell
          open={true}
          onClose={() => setIsDetailsModalOpen(false)}
          width="min(850px, 95vw)"
          ariaLabel="تفاصيل أمر البيع"
        >
          <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="standard-dialog-header">
              <div className="standard-dialog-header-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PackageIcon size={18} color="#170e5e" />
                  </div>
                  <div>
                    <h3 className="standard-dialog-title">
                      تفاصيل أمر البيع #{orderDetailsData?.order_number || selectedOrder?.order_number}
                    </h3>
                    <p className="standard-dialog-subtitle">فحص توفر المخزون، الحجوزات، والجاهزية للفوترة</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="standard-dialog-close-btn"
                aria-label="إغلاق"
              >
                <XIcon size={18} />
              </button>
            </div>

            {isDetailsLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>جاري فحص تفاصيل المخزون...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Meta Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>العميل:</span>
                    <strong style={{ color: '#0f172a', fontSize: '13px' }}>{orderDetailsData?.customer_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>الهاتف:</span>
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                      {orderDetailsData?.customer_phone || '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>الحالة:</span>
                    <div>{getStatusBadge(orderDetailsData?.status || '')}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>الإجمالي:</span>
                    <strong style={{ color: '#170e5e', fontSize: '14px' }}>
                      {formatCurrency(Number(orderDetailsData?.total_amount || 0))}
                    </strong>
                  </div>
                </div>

                {/* Items & Stock Availability Table */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                        <th style={{ padding: '10px 12px' }}>الصنف</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>الكمية المطلوبة</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>الكمية المحجوزة</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>المخزون الفعلي</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>المتاح للآخرين</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>سعر الوحدة</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetailsData?.items?.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{item.product_name || item.productName}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>
                            {item.quantity} {item.unit_name || item.unitName || 'قطعة'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, border: '1px solid #bfdbfe', fontSize: '11px' }}>
                              {item.reserved_quantity || 0}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#334155' }}>
                            {item.current_stock_qty ?? '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>
                            {item.available_qty ?? '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>{formatCurrency(Number(item.unit_price || item.unitPrice || 0))}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>
                            {formatCurrency(Number(item.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Footer */}
                <div className="standard-dialog-footer" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {orderDetailsData?.status === 'draft' && (
                      <Button
                        variant="primary"
                        onClick={() => confirmMutation.mutate(orderDetailsData.id)}
                        style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12px' }}
                      >
                        تأكيد أمر البيع وحجز المخزون
                      </Button>
                    )}

                    {(orderDetailsData?.status === 'confirmed' || orderDetailsData?.status === 'draft') && (
                      <Button
                        variant="success"
                        onClick={() => {
                          if (
                            confirm(
                              `هل تريد تحويل أمر البيع رقم ${orderDetailsData.order_number} إلى فاتورة بيع فعلية؟`
                            )
                          ) {
                            convertMutation.mutate(orderDetailsData.id);
                          }
                        }}
                        style={{ backgroundColor: '#059669', color: '#ffffff', fontSize: '12px' }}
                      >
                        تحويل إلى فاتورة بيع وخصم المخزون
                      </Button>
                    )}

                    {(orderDetailsData?.status === 'confirmed' || orderDetailsData?.status === 'draft') && (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const firstItem = orderDetailsData.items?.[0];
                          if (!firstItem) return;
                          if (
                            confirm(
                              `هل ترغب في توليد أمر تصنيع وتشغيل فوري (MTO) للصنف "${firstItem.product_name || firstItem.productName}" بالكمية المطلوبة (${firstItem.quantity})؟`
                            )
                          ) {
                            try {
                              const res = await workOrdersApi.createMto({
                                salesOrderId: orderDetailsData.id,
                                productId: firstItem.productId || (firstItem as any).product_id,
                                quantityToProduce: Number(firstItem.quantity),
                              });
                              alert(res.message || 'تم توليد أمر التشغيل بنجاح');
                            } catch (err: any) {
                              alert(err?.message || 'فشل توليد أمر التصنيع - تأكد من وجود BOM نشطة للصنف');
                            }
                          }
                        }}
                        style={{ fontSize: '12px', border: '1px solid #c7d2fe', color: '#170e5e' }}
                      >
                        توليد أمر تصنيع (MTO)
                      </Button>
                    )}
                  </div>

                  <Button variant="secondary" onClick={() => setIsDetailsModalOpen(false)}>
                    إغلاق
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogShell>
      )}
    </div>
  );
}
