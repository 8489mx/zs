import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  purchaseOrdersApi,
  type PurchaseOrderRecord,
  type CreatePurchaseOrderPayload,
  type ReceivePurchaseOrderPayload,
} from '../api/purchase-orders.api';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { PlusIcon, SearchIcon, RefreshCwIcon } from '@/shared/components/icons/AppIcons';
import { suppliersApi } from '@/shared/api/suppliers.api';
import { sharedProductsApi } from '@/shared/api/products';
import { useAppToolbar } from '@/stores/toolbar-store';
import { PurchaseOrdersTable } from '../components/PurchaseOrdersTable';
import { CreatePurchaseOrderModal } from '../components/CreatePurchaseOrderModal';
import { PurchaseOrderDetailsModal } from '../components/PurchaseOrderDetailsModal';
import { ReceivePurchaseOrderModal } from '../components/ReceivePurchaseOrderModal';

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

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list-for-po'],
    queryFn: () => suppliersApi.list(),
  });

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
      alert(err.message || 'فشل استلام البضاعة');
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
      alert(err.message || 'فشل تحويل أمر الشراء إلى فاتورة مشتريات');
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

  const openReceiveModal = (order: PurchaseOrderRecord) => {
    setSelectedOrder(order);
    const itms = (order as any).items || orderDetailsData?.items || [];
    setReceiveItems(
      itms.map((it: any) => ({
        itemId: it.id,
        productId: it.product_id || it.productId,
        productName: it.product_name || it.productName,
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

  const orders = data?.orders || [];
  const summary = data?.summary || { all: 0, draft: 0, confirmed: 0, partially_received: 0, received: 0, converted_to_bill: 0, cancelled: 0 };

  return (
    <div className="page-stack page-shell purchases-orders-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
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

          <PurchaseOrdersTable
            isLoading={isLoading}
            orders={orders}
            onViewDetails={(ord) => {
              setSelectedOrder(ord);
              setIsDetailsModalOpen(true);
            }}
            onOpenReceive={openReceiveModal}
          />
        </section>
      </main>

      <CreatePurchaseOrderModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        suppliers={suppliers}
        products={products}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isPending={createMutation.isPending}
      />

      <PurchaseOrderDetailsModal
        order={selectedOrder}
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        orderDetailsData={orderDetailsData}
        isDetailsLoading={isDetailsLoading}
        onConfirm={(id) => confirmMutation.mutate(id)}
        isConfirmPending={confirmMutation.isPending}
        onOpenReceive={openReceiveModal}
        onConvert={(id) => convertMutation.mutate(id)}
        isConvertPending={convertMutation.isPending}
        onCancel={(id) => cancelMutation.mutate(id)}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <ReceivePurchaseOrderModal
        order={selectedOrder}
        open={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        receiveItems={receiveItems}
        onChangeItemReceive={(idx, val) => {
          const copy = [...receiveItems];
          copy[idx].toReceive = val;
          setReceiveItems(copy);
        }}
        onConfirm={handleConfirmReceive}
        isPending={receiveMutation.isPending}
      />
    </div>
  );
}
