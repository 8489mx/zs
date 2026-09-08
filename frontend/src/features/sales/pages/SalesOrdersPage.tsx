import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  salesOrdersApi,
  type SalesOrderRecord,
  type CreateSalesOrderPayload,
  type SalesOrderItem,
} from '../api/sales-orders.api';
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

export function SalesOrdersPage() {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <LockIcon size={12} color="#1d4ed8" />
            مؤكد (مخزون محجوز)
          </span>
        );
      case 'converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircleIcon size={12} color="#047857" />
            تم التحويل لفاتورة بيع
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            ملغي (فك الحجز)
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            مسودة أمر بيع
          </span>
        );
    }
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="أوامر البيع وحجز المخزون"
          description="إدارة وتأكيد أوامر البيع التجارية وحجز الكميات مؤقتاً في المستودع ومنع البيع المزدوج قبل إصدار الفاتورة النهائية"
          badge={<span className="nav-pill">Sales Orders & Reservation</span>}
          actions={
            <div className="flex items-center gap-2">
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
                <span>أمر بيع جديد</span>
              </Button>
            </div>
          }
        />

        {/* Stats Grid */}
        <div style={{ marginBottom: '20px' }}>
          <StatsGrid
            items={[
              {
                key: 'all',
                label: 'إجمالي أوامر البيع',
                value: summary.all,
              },
              {
                key: 'confirmed',
                label: 'أوامر مؤكدة وحاجزة للمخزون',
                value: summary.confirmed,
              },
              {
                key: 'draft',
                label: 'مسودات قيد المراجعة',
                value: summary.draft,
              },
              {
                key: 'converted',
                label: 'مكتملة ومحولة لفواتير',
                value: summary.converted,
              },
            ]}
          />
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600">تصفية الحالة:</span>
            {[
              { key: 'all', label: 'الكل' },
              { key: 'confirmed', label: 'المؤكدة والحاجزة للمخزون' },
              { key: 'draft', label: 'المسودات' },
              { key: 'converted', label: 'المحولة لفواتير' },
              { key: 'cancelled', label: 'الملغاة' },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === st.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث برقم الأمر أو العميل أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-72 pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
              <div className="absolute right-2.5 top-2 text-slate-400">
                <SearchIcon size={14} color="#94a3b8" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] })}
              className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
              title="تحديث القائمة"
            >
              <RefreshCwIcon size={14} color="#64748b" />
            </button>
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
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailsModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            title="عرض التفاصيل وجاهزية المخزون"
                          >
                            <span className="flex items-center gap-1">
                              <EyeIcon size={13} color="#475569" />
                              التفاصيل
                            </span>
                          </button>

                          {/* Confirm & Reserve Button (if draft) */}
                          {order.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => confirmMutation.mutate(order.id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800"
                              title="تأكيد وحجز كميات المخزون"
                            >
                              <span className="flex items-center gap-1">
                                <LockIcon size={13} color="#1e40af" />
                                حجز المخزون
                              </span>
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
                              className="px-2.5 py-1 text-xs font-bold rounded-md border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              title="تحويل مباشر لفاتورة بيع"
                            >
                              <span className="flex items-center gap-1">
                                <ShoppingCartIcon size={13} color="#ffffff" />
                                تحويل لفاتورة
                              </span>
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
                              className="px-2 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-rose-50 text-rose-700"
                              title="إلغاء أمر البيع وفك الحجز"
                            >
                              إلغاء
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
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
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
      </main>

      {/* 1. Create Sales Order Modal */}
      {isCreateModalOpen && (
        <DialogShell
          open={true}
          onClose={() => setIsCreateModalOpen(false)}
          width="820px"
        >
          <div className="p-6" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-900">
                  <PackageIcon size={18} color="#170e5e" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">إنشاء أمر بيع جديد (Sales Order)</h3>
                  <p className="text-xs text-slate-500">حجز المخزون وتثبيت الأسعار والكميات للعميل</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Customer and General Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم العميل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="اسم العميل أو المنشأة..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">هاتف العميل</label>
                  <input
                    type="text"
                    placeholder="رقم الهاتف للتواصل..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التسليم المتوقع</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">صلاحية حجز المخزون حتى</label>
                  <input
                    type="date"
                    value={reservationExpiresAt}
                    onChange={(e) => setReservationExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان العميل / موقع التسليم</label>
                  <input
                    type="text"
                    placeholder="العنوان التفصيلي..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Stock Reservation Toggle Option */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LockIcon size={16} color="#1d4ed8" />
                  <div>
                    <span className="text-xs font-bold text-blue-900 block">
                      تفعيل حجز المخزون المؤقت فور الحفظ (Stock Reservation)
                    </span>
                    <span className="text-[11px] text-blue-700">
                      يتم زيادة الكمية المحجوزة للمنتجات ومنع بيعها في الكاشير أو المتجر الإلكتروني
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoReserve}
                  onChange={(e) => setAutoReserve(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-2.5 font-bold text-xs text-slate-700 flex items-center justify-between">
                  <span>أصناف وكميات أمر البيع</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  >
                    <PlusIcon size={13} />
                    إضافة صنف
                  </button>
                </div>
                <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-lg border border-slate-200/80">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="اسم الصنف أو كوده..."
                          required
                          value={it.productName}
                          onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          placeholder="الكمية"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-center"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="سعر الوحدة"
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-center"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="خصم"
                          value={it.discount}
                          onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-center"
                        />
                      </div>
                      <div className="w-24 text-left font-bold text-xs text-slate-800 pl-1">
                        {formatCurrency(Number(it.total))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2Icon size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">المجموع قبل الخصم: </span>
                  <strong className="text-slate-800">{formatCurrency(subtotal)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">إجمالي الخصم: </span>
                  <strong className="text-rose-600">{formatCurrency(totalDiscount)}</strong>
                </div>
                <div className="text-sm font-bold text-indigo-900">
                  <span>الصافي المطلوب: </span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
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
          width="850px"
        >
          <div className="p-6" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-900">
                  <PackageIcon size={18} color="#170e5e" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    تفاصيل أمر البيع #{orderDetailsData?.order_number || selectedOrder?.order_number}
                  </h3>
                  <p className="text-xs text-slate-500">فحص توفر المخزون، الحجوزات، والجاهزية للفوترة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon size={18} />
              </button>
            </div>

            {isDetailsLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs">جاري فحص تفاصيل المخزون...</div>
            ) : (
              <div className="space-y-4">
                {/* Meta Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">العميل:</span>
                    <strong className="text-slate-900">{orderDetailsData?.customer_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الهاتف:</span>
                    <strong className="text-slate-900 font-mono">
                      {orderDetailsData?.customer_phone || '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الحالة:</span>
                    <div>{getStatusBadge(orderDetailsData?.status || '')}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الإجمالي:</span>
                    <strong className="text-indigo-900 text-sm">
                      {formatCurrency(Number(orderDetailsData?.total_amount || 0))}
                    </strong>
                  </div>
                </div>

                {/* Items & Stock Availability Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">الصنف</th>
                        <th className="p-3 text-center">الكمية المطلوبة</th>
                        <th className="p-3 text-center">الكمية المحجوزة</th>
                        <th className="p-3 text-center">المخزون الفعلي</th>
                        <th className="p-3 text-center">المتاح للآخرين</th>
                        <th className="p-3 text-center">سعر الوحدة</th>
                        <th className="p-3 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderDetailsData?.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{item.product_name || item.productName}</td>
                          <td className="p-3 text-center font-bold text-slate-800">
                            {item.quantity} {item.unit_name || item.unitName || 'قطعة'}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[11px]">
                              {item.reserved_quantity || 0}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-700">
                            {item.current_stock_qty ?? '—'}
                          </td>
                          <td className="p-3 text-center font-mono text-emerald-700 font-semibold">
                            {item.available_qty ?? '—'}
                          </td>
                          <td className="p-3 text-center">{formatCurrency(Number(item.unit_price || item.unitPrice || 0))}</td>
                          <td className="p-3 text-left font-bold text-slate-900">
                            {formatCurrency(Number(item.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    {orderDetailsData?.status === 'draft' && (
                      <Button
                        variant="primary"
                        onClick={() => confirmMutation.mutate(orderDetailsData.id)}
                        className="text-xs"
                        style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
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
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        تحويل إلى فاتورة بيع وخصم المخزون
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
