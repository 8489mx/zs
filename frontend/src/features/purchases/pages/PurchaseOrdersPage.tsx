import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  purchaseOrdersApi,
  type PurchaseOrderRecord,
  type CreatePurchaseOrderPayload,
  type PurchaseOrderItem,
  type ReceivePurchaseOrderPayload,
} from '../api/purchase-orders.api';
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
  PackageIcon,
  EyeIcon,
  PrinterIcon,
} from '@/shared/components/icons/AppIcons';
import { suppliersApi } from '@/shared/api/suppliers.api';
import { sharedProductsApi } from '@/shared/api/products';
import { useAppToolbar } from '@/stores/toolbar-store';

export function PurchaseOrdersPage() {
  useAppToolbar([{ label: 'المشتريات والموردين', to: '/purchases' }, { label: 'أوامر الشراء (PO)' }]);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<Array<{ itemId: number; productId: number; productName: string; quantity: number; receivedQuantity: number; toReceive: number }>>([]);

  // Form state for creating purchase order
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [warehouseName, setWarehouseName] = useState('المخزن الرئيسي');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const termsConditions = 'يتم فحص ومطابقة البضاعة الموردة مع أمر الشراء قبل الاستلام النهائي.';
  const [items, setItems] = useState<Array<PurchaseOrderItem & { productId: number; productName: string }>>([
    { productId: 1, productName: '', unitName: 'قطعة', quantity: 1, unitCost: 0, taxRate: 0, discount: 0, total: 0 },
  ]);

  // Fetch Suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list-for-po'],
    queryFn: () => suppliersApi.list(),
  });

  // Fetch Products
  const { data: productsData } = useQuery({
    queryKey: ['products-list-for-po'],
    queryFn: () => sharedProductsApi.list(),
  });

  const suppliers = Array.isArray(suppliersData) ? suppliersData : [];
  const products = Array.isArray(productsData) ? productsData : [];

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders-list', statusFilter, search],
    queryFn: () =>
      purchaseOrdersApi.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      }),
  });

  const { data: orderDetailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['purchase-order-details', selectedOrder?.id],
    queryFn: () => purchaseOrdersApi.getById(selectedOrder!.id),
    enabled: Boolean(selectedOrder?.id && (isDetailsModalOpen || isReceiveModalOpen)),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => purchaseOrdersApi.create(payload),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'فشل حفظ أمر الشراء');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => purchaseOrdersApi.confirm(id),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      if (selectedOrder?.id) {
        queryClient.invalidateQueries({ queryKey: ['purchase-order-details', selectedOrder.id] });
      }
    },
    onError: (err: any) => {
      alert(err.message || 'فشل اعتماد أمر الشراء');
    },
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReceivePurchaseOrderPayload }) =>
      purchaseOrdersApi.receive(id, payload),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      if (selectedOrder?.id) {
        queryClient.invalidateQueries({ queryKey: ['purchase-order-details', selectedOrder.id] });
      }
      setIsReceiveModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.message || 'فشل تسجيل استلام البضاعة');
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => purchaseOrdersApi.convertToBill(id),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      setIsDetailsModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.message || 'فشل تحويل أمر الشراء لفاتورة رسمية');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => purchaseOrdersApi.cancel(id),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      if (selectedOrder?.id) {
        queryClient.invalidateQueries({ queryKey: ['purchase-order-details', selectedOrder.id] });
      }
    },
    onError: (err: any) => {
      alert(err.message || 'فشل إلغاء أمر الشراء');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseOrdersApi.delete(id),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      setIsDetailsModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.message || 'فشل حذف أمر الشراء');
    },
  });

  const resetForm = () => {
    setSelectedSupplierId(null);
    setSupplierName('');
    setSupplierPhone('');
    setWarehouseName('المخزن الرئيسي');
    setExpectedDeliveryDate('');
    setNotes('');
    setItems([
      { productId: 1, productName: '', unitName: 'قطعة', quantity: 1, unitCost: 0, taxRate: 0, discount: 0, total: 0 },
    ]);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { productId: 0, productName: '', unitName: 'قطعة', quantity: 1, unitCost: 0, taxRate: 0, discount: 0, total: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    const target = { ...updated[index], [field]: val };

    if (field === 'productId') {
      const prod = products.find((p: any) => p.id === Number(val));
      if (prod) {
        target.productName = prod.name;
        target.unitCost = Number((prod as any).costPrice || (prod as any).cost_price || 0);
      }
    }

    const qty = Number(target.quantity || 0);
    const cost = Number(target.unitCost || 0);
    const disc = Number(target.discount || 0);
    const taxRate = Number(target.taxRate || 0);

    const sub = Math.max(0, qty * cost - disc);
    const tax = sub * (taxRate / 100);
    target.total = sub + tax;

    updated[index] = target;
    setItems(updated);
  };

  const subtotal = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitCost || 0), 0);
  const discountTotal = items.reduce((sum, it) => sum + Number(it.discount || 0), 0);
  const taxTotal = items.reduce((sum, it) => {
    const lineSub = Math.max(0, Number(it.quantity || 0) * Number(it.unitCost || 0) - Number(it.discount || 0));
    return sum + lineSub * (Number(it.taxRate || 0) / 100);
  }, 0);
  const totalAmount = Math.max(0, subtotal - discountTotal + taxTotal);

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('يرجى تحديد اسم المورد');
      return;
    }
    const validItems = items.filter((it) => it.productId > 0 && it.quantity > 0);
    if (!validItems.length) {
      alert('يرجى إضافة صنف واحد على الأقل مع كمية وتكلفة صالحة');
      return;
    }

    createMutation.mutate({
      supplierId: selectedSupplierId,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim() || undefined,
      warehouseName: warehouseName.trim(),
      subtotal,
      discountAmount: discountTotal,
      taxAmount: taxTotal,
      totalAmount,
      expectedDeliveryDate: expectedDeliveryDate || null,
      notes: notes.trim() || undefined,
      termsConditions,
      items: validItems.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        unitName: it.unitName,
        quantity: it.quantity,
        unitCost: it.unitCost,
        taxRate: it.taxRate,
        discount: it.discount,
        total: it.total,
      })),
    });
  };

  const openReceiveModal = (order: PurchaseOrderRecord) => {
    setSelectedOrder(order);
    const currentItems = orderDetailsData?.items || [];
    setReceiveItems(
      currentItems.map((it: any) => ({
        itemId: it.id,
        productId: it.product_id,
        productName: it.product_name,
        quantity: Number(it.quantity),
        receivedQuantity: Number(it.received_quantity || 0),
        toReceive: Math.max(0, Number(it.quantity) - Number(it.received_quantity || 0)),
      }))
    );
    setIsReceiveModalOpen(true);
  };

  const handleConfirmReceive = () => {
    if (!selectedOrder?.id) return;
    const toSubmit = receiveItems
      .filter((it) => it.toReceive > 0)
      .map((it) => ({
        itemId: it.itemId,
        productId: it.productId,
        quantityToReceive: it.toReceive,
      }));

    if (!toSubmit.length) {
      alert('يرجى تحديد كميات مستلمة أكبر من الصفر');
      return;
    }

    receiveMutation.mutate({
      id: selectedOrder.id,
      payload: { items: toSubmit },
    });
  };

  const getStatusBadge = (status: string) => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      fontSize: '11px',
      fontWeight: 700,
      borderRadius: '999px',
    };
    switch (status) {
      case 'draft':
        return <span style={{ ...baseStyle, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>مسودة</span>;
      case 'confirmed':
        return <span style={{ ...baseStyle, backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>معتمد وبانتظار التوريد</span>;
      case 'partially_received':
        return <span style={{ ...baseStyle, backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>استلام جزئي بالمخزن</span>;
      case 'received':
        return <span style={{ ...baseStyle, backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>تم الاستلام بالكامل</span>;
      case 'converted_to_bill':
        return <span style={{ ...baseStyle, backgroundColor: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}>مرحل لفاتورة مشتريات</span>;
      case 'cancelled':
        return <span style={{ ...baseStyle, backgroundColor: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' }}>ملغي</span>;
      default:
        return <span style={{ ...baseStyle, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>{status}</span>;
    }
  };

  const orders = data?.orders || [];
  const summary = data?.summary || { all: 0, draft: 0, confirmed: 0, partially_received: 0, received: 0, converted_to_bill: 0, cancelled: 0 };

  return (
    <div className="page-stack page-shell purchases-orders-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* 1. Page Header */}
        <PageHeader
          title="أوامر الشراء (PO)"
          description="دورة المشتريات المعيارية: إصدار أوامر الشراء، الاعتماد، استلام المخزون، والتحويل المباشر لفاتورة مشتريات رسمية."
          badge={<span className="nav-pill">{summary.all} أمر</span>}
          actions={(
            <div className="actions compact-actions page-header-actions">
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary flex items-center gap-1.5"
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                <PlusIcon className="w-4 h-4" />
                <span>+ أمر شراء جديد</span>
              </Button>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] })}
                variant="secondary"
                className="flex items-center gap-1.5"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
                <span>تحديث</span>
              </Button>
            </div>
          )}
        />

        {/* 2. Stats Grid */}
        <div style={{ marginBottom: '16px' }}>
          <StatsGrid
            items={[
              { key: 'all', label: 'إجمالي أوامر الشراء', value: `${summary.all} أمر` },
              { key: 'pending', label: 'بانتظار التوريد', value: `${summary.draft + summary.confirmed} أمر` },
              { key: 'received', label: 'تم استلامها بالمخزن', value: `${summary.received + summary.partially_received} أمر` },
              { key: 'converted', label: 'فواتير محررة', value: `${summary.converted_to_bill} فاتورة` },
            ]}
          />
        </div>

        {/* 3. Main Workspace Panel & Table */}
        <section className="document-prototype-section workspace-panel">
          <div className="section-header-compact-row">
            <h3 className="document-prototype-section-title">قائمة أوامر الشراء والتوريد</h3>
            <div className="section-header-actions-group">
              <span className="text-xs text-slate-500 font-medium">عرض {orders.length} من أصل {summary.all}</span>
            </div>
          </div>
          <p className="muted small section-header-subtitle">
            متابعة حالات التوريد، استلام الشحنات بالمستودعات، والتحويل المباشر لفواتير المشتريات.
          </p>

          {/* Controls & Filter Bar */}
          <div className="products-table-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '12px 0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'draft', label: 'مسودات' },
                  { id: 'confirmed', label: 'معتمدة' },
                  { id: 'partially_received', label: 'استلام جزئي' },
                  { id: 'received', label: 'مستلمة' },
                  { id: 'converted_to_bill', label: 'مرحلة لفاتورة' },
                  { id: 'cancelled', label: 'ملغاة' },
                ].map((tab) => {
                  const isActive = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
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
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ position: 'relative', minWidth: '280px' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث برقم الأمر، اسم المورد، أو الهاتف..."
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

          {/* Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>رقم الأمر</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>المورد</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>تاريخ الأمر</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>تاريخ التوريد المتوقع</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>مستودع الاستلام</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>الإجمالي</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>الحالة</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        جاري تحميل أوامر الشراء...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                        لا توجد أوامر شراء مطابقة للبحث
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '11px 16px', fontWeight: 600, color: '#170e5e' }}>{order.order_number}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.supplier_name}</div>
                          {order.supplier_phone && (
                            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{order.supplier_phone}</div>
                          )}
                        </td>
                        <td style={{ padding: '11px 16px', color: '#475569' }}>
                          {order.created_at ? String(order.created_at).slice(0, 10) : '—'}
                        </td>
                        <td style={{ padding: '11px 16px', color: '#475569' }}>
                          {order.expected_delivery_date ? String(order.expected_delivery_date).slice(0, 10) : '—'}
                        </td>
                        <td style={{ padding: '11px 16px', color: '#334155' }}>{order.warehouse_name || 'المخزن الرئيسي'}</td>
                        <td style={{ padding: '11px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(Number(order.total_amount || 0))}
                        </td>
                        <td style={{ padding: '11px 16px' }}>{getStatusBadge(order.status)}</td>
                        <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsDetailsModalOpen(true);
                              }}
                              className="h-7 px-2 text-slate-600 hover:text-[#170e5e]"
                            >
                              <EyeIcon size={13} color="#475569" />
                              <span>عرض</span>
                            </Button>

                            {order.status === 'confirmed' || order.status === 'partially_received' ? (
                              <Button
                                variant="secondary"
                                onClick={() => openReceiveModal(order)}
                                className="h-7 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              >
                                <PackageIcon size={13} color="#047857" />
                                <span>استلام</span>
                              </Button>
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
        </section>
      </main>

      {/* 5. Create Order Modal */}
      <DialogShell
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        ariaLabel="إنشاء أمر شراء جديد للمورد"
        width="min(880px, 96vw)"
      >
        <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="standard-dialog-header">
            <div className="standard-dialog-header-info">
              <h3 className="standard-dialog-title">إنشاء أمر شراء جديد (Purchase Order)</h3>
              <p className="standard-dialog-subtitle">إصدار أمر الشراء للمورد وحجز الكميات بانتظار استلام البضاعة</p>
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

          <form onSubmit={handleSubmitCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>المورد *</label>
                <select
                  value={selectedSupplierId || ''}
                  onChange={(e) => {
                    const sId = Number(e.target.value);
                    setSelectedSupplierId(sId || null);
                    const found = suppliers.find((s: any) => s.id === sId);
                    if (found) {
                      setSupplierName(found.name);
                      setSupplierPhone(found.phone || '');
                    }
                  }}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="">اختر المورد من القائمة أو أدخل يدوياً</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>اسم المورد (تأكيد) *</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="أدخل اسم المورد"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>هاتف المورد</label>
                <input
                  type="text"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="رقم التواصل"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>مستودع الاستلام</label>
                <input
                  type="text"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  placeholder="اسم المستودع أو الفرع"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>تاريخ التوريد المتوقع</label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>ملاحظات داخلية</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي شروط أو متطلبات خاصة للتوريد"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Items Table */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', fontWeight: 700, fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1' }}>
                <span>بنود وأصناف أمر الشراء</span>
                <Button type="button" variant="secondary" onClick={handleAddItem} style={{ fontSize: '12px', height: '28px', padding: '0 10px' }}>
                  <PlusIcon className="w-3.5 h-3.5 ml-1" />
                  إضافة صنف
                </Button>
              </div>

              <div style={{ padding: '12px', overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ paddingBottom: '8px' }}>الصنف</th>
                      <th style={{ paddingBottom: '8px', width: '90px' }}>الكمية</th>
                      <th style={{ paddingBottom: '8px', width: '110px' }}>سعر التكلفة</th>
                      <th style={{ paddingBottom: '8px', width: '90px' }}>الخصم</th>
                      <th style={{ paddingBottom: '8px', width: '110px' }}>الإجمالي</th>
                      <th style={{ paddingBottom: '8px', width: '36px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 4px' }}>
                          <select
                            value={it.productId || ''}
                            onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                            style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff' }}
                          >
                            <option value="">اختر صنفاً</option>
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (التكلفة الحالية: {formatCurrency(p.costPrice || p.cost_price || 0)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.unitCost}
                            onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                            style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.discount}
                            onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                            style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '6px 4px', fontWeight: 700, color: '#1e293b' }}>
                          {formatCurrency(Number(it.total || 0))}
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          >
                            <XIcon size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <div style={{ textAlign: 'left', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>المجموع:</span>
                    <strong>{formatCurrency(subtotal)}</strong>
                  </div>
                  {discountTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span>إجمالي الخصم:</span>
                      <strong>{formatCurrency(discountTotal)}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13.5px', color: '#170e5e', paddingTop: '4px', borderTop: '1px solid #cbd5e1' }}>
                    <span>الصافي المطلوب:</span>
                    <strong>{formatCurrency(totalAmount)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="standard-dialog-footer">
              <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ أمر الشراء كمسودة'}
              </Button>
            </div>
          </form>
        </div>
      </DialogShell>

      {/* 6. Order Details & Actions Modal */}
      <DialogShell
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        ariaLabel={`تفاصيل أمر الشراء #${selectedOrder?.order_number || ''}`}
        width="min(980px, 96vw)"
      >
        <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="standard-dialog-header">
            <div className="standard-dialog-header-info">
              <h3 className="standard-dialog-title">تفاصيل أمر الشراء #{selectedOrder?.order_number || ''}</h3>
              <p className="standard-dialog-subtitle">متابعة حالة الاعتماد، استلام الشحنات بالمخازن، وترحيل الفواتير</p>
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
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>جاري تحميل بيانات أمر الشراء...</div>
          ) : selectedOrder ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Action Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getStatusBadge(selectedOrder.status)}
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    المستودع: <strong style={{ color: '#0f172a' }}>{selectedOrder.warehouse_name || 'المخزن الرئيسي'}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                  {selectedOrder.status === 'draft' && (
                    <Button
                      onClick={() => confirmMutation.mutate(selectedOrder.id)}
                      disabled={confirmMutation.isPending}
                      style={{ backgroundColor: '#2563eb', color: '#ffffff', fontSize: '12px', height: '32px' }}
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5 ml-1" />
                      اعتماد وإرسال للمورد
                    </Button>
                  )}

                  {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'partially_received') && (
                    <>
                      <Button
                        onClick={() => openReceiveModal(selectedOrder)}
                        style={{ backgroundColor: '#059669', color: '#ffffff', fontSize: '12px', height: '32px' }}
                      >
                        <PackageIcon className="w-3.5 h-3.5 ml-1" />
                        استلام بضاعة بالمخزن
                      </Button>
                      <Button
                        onClick={() => convertMutation.mutate(selectedOrder.id)}
                        disabled={convertMutation.isPending}
                        style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '12px', height: '32px' }}
                      >
                        تحويل لفاتورة مشتريات رسمية
                      </Button>
                    </>
                  )}

                  {selectedOrder.status === 'received' && (
                    <Button
                      onClick={() => convertMutation.mutate(selectedOrder.id)}
                      disabled={convertMutation.isPending}
                      style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '12px', height: '32px' }}
                    >
                      تحرير فاتورة المشتريات
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    onClick={() => window.print()}
                    style={{ fontSize: '12px', height: '32px' }}
                  >
                    <PrinterIcon className="w-3.5 h-3.5 ml-1" />
                    طباعة A4
                  </Button>

                  {selectedOrder.status !== 'converted_to_bill' && selectedOrder.status !== 'cancelled' && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من إلغاء أمر الشراء هذا؟')) {
                          cancelMutation.mutate(selectedOrder.id);
                        }
                      }}
                      style={{ fontSize: '12px', height: '32px', color: '#be123c', borderColor: '#fecdd3' }}
                    >
                      إلغاء الأمر
                    </Button>
                  )}

                  {(selectedOrder.status === 'draft' || selectedOrder.status === 'cancelled') && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا الأمر نهائياً؟')) {
                          deleteMutation.mutate(selectedOrder.id);
                        }
                      }}
                      style={{ fontSize: '12px', height: '32px', color: '#be123c', borderColor: '#fecdd3' }}
                    >
                      <Trash2Icon className="w-3.5 h-3.5 ml-1" />
                      حذف
                    </Button>
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>المورد:</span>
                  <strong style={{ color: '#0f172a', fontSize: '13px' }}>{selectedOrder.supplier_name}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>الهاتف:</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedOrder.supplier_phone || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>تاريخ الإصدار:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedOrder.created_at ? String(selectedOrder.created_at).slice(0, 10) : '—'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>تاريخ التوريد المتوقع:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedOrder.expected_delivery_date
                      ? String(selectedOrder.expected_delivery_date).slice(0, 10)
                      : '—'}
                  </strong>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                    <tr>
                      <th style={{ padding: '10px 12px' }}>الصنف</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>الكمية المطلوبة</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>الكمية المستلمة</th>
                      <th style={{ padding: '10px 12px' }}>سعر التكلفة</th>
                      <th style={{ padding: '10px 12px' }}>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orderDetailsData?.items || []).map((item: any) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{item.product_name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: Number(item.received_quantity) >= Number(item.quantity)
                                ? '#059669'
                                : Number(item.received_quantity) > 0
                                ? '#d97706'
                                : '#94a3b8',
                            }}
                          >
                            {item.received_quantity || 0}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{formatCurrency(Number(item.unit_cost))}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(Number(item.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ textAlign: 'left', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>المجموع:</span>
                    <strong>{formatCurrency(Number(selectedOrder.subtotal || 0))}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13.5px', color: '#170e5e', paddingTop: '4px', borderTop: '1px solid #cbd5e1' }}>
                    <span>الإجمالي الكلي:</span>
                    <strong>{formatCurrency(Number(selectedOrder.total_amount || 0))}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogShell>

      {/* 7. Receive Goods Modal */}
      <DialogShell
        open={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        ariaLabel={`إثبات استلام بضاعة لأمر الشراء #${selectedOrder?.order_number || ''}`}
        width="min(820px, 96vw)"
      >
        <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="standard-dialog-header">
            <div className="standard-dialog-header-info">
              <h3 className="standard-dialog-title">إثبات استلام بضاعة لأمر الشراء #{selectedOrder?.order_number || ''}</h3>
              <p className="standard-dialog-subtitle">أدخل الكميات المستلمة فعلياً في المستودع لتغذية المخزون وتحديث رصيد الصنف تلقائياً</p>
            </div>
            <button
              type="button"
              onClick={() => setIsReceiveModalOpen(false)}
              className="standard-dialog-close-btn"
              aria-label="إغلاق"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                  <tr>
                    <th style={{ padding: '10px 12px' }}>الصنف</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>المطلوب</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>المستلم مسبقاً</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '130px' }}>الكمية المستلمة الآن</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveItems.map((it, idx) => (
                    <tr key={it.itemId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{it.productName}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>{it.quantity}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{it.receivedQuantity}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          min="0"
                          max={it.quantity - it.receivedQuantity}
                          value={it.toReceive}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            const copy = [...receiveItems];
                            copy[idx].toReceive = val;
                            setReceiveItems(copy);
                          }}
                          style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontWeight: 700, boxSizing: 'border-box' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="standard-dialog-footer">
              <Button variant="secondary" onClick={() => setIsReceiveModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleConfirmReceive}
                disabled={receiveMutation.isPending}
                style={{ backgroundColor: '#059669', color: '#ffffff', fontSize: '12px' }}
              >
                {receiveMutation.isPending ? 'جاري تسجيل الاستلام...' : 'تأكيد الاستلام وتغذية المخزن'}
              </Button>
            </div>
          </div>
        </div>
      </DialogShell>
    </div>
  );
}
