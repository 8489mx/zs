import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  salesOrdersApi,
  type SalesOrderRecord,
  type CreateSalesOrderPayload,
} from '../api/sales-orders.api';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import {
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
} from '@/shared/components/icons/AppIcons';
import { useAppToolbar } from '@/stores/toolbar-store';
import { useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import { SalesOrdersTable } from '../components/SalesOrdersTable';
import { CreateSalesOrderModal } from '../components/CreateSalesOrderModal';
import { SalesOrderDetailsModal } from '../components/SalesOrderDetailsModal';
import { toast } from '@/shared/components/system-alert';

export function SalesOrdersPage() {
  useAppToolbar([{ label: 'المبيعات', to: '/sales' }, { label: 'أوامر البيع وحجز المخزون' }]);
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: catalogProducts = [] } = useProductsQuery();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders-list', statusFilter, search],
    queryFn: () =>
      salesOrdersApi.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSalesOrderPayload) => salesOrdersApi.create(payload),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] });
      setIsCreateModalOpen(false);
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

  const orders = data?.orders || [];
  const summary = data?.summary || { all: 0, draft: 0, confirmed: 0, converted: 0, cancelled: 0 };

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
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary flex items-center gap-1.5"
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                <PlusIcon size={16} color="#ffffff" />
                <span>+ أمر بيع جديد</span>
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    setIsRefreshing(true);
                    await queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] });
                    toast.success('تم تحديث قائمة أوامر البيع بنجاح', undefined, 2000);
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCwIcon
                  size={14}
                  style={{ animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none' }}
                />
                <span>{isRefreshing ? 'جارٍ التحديث...' : 'تحديث'}</span>
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

          <SalesOrdersTable
            orders={orders}
            isLoading={isLoading}
            onViewDetails={(order) => {
              setSelectedOrder(order);
              setIsDetailsModalOpen(true);
            }}
            onConfirm={(id) => confirmMutation.mutate(id)}
            onConvert={(order) => {
              if (confirm(`هل تريد تحويل أمر البيع رقم ${order.order_number} إلى فاتورة بيع فعلية وخصم المخزون؟`)) {
                convertMutation.mutate(order.id);
              }
            }}
            onCancel={(order) => {
              if (confirm(`هل أنت متأكد من إلغاء أمر البيع رقم ${order.order_number}؟ سيتم فك حجز الكميات فوراً وإعادتها للمخزون المتاح.`)) {
                cancelMutation.mutate(order.id);
              }
            }}
            onDelete={(order) => {
              if (confirm(`هل أنت متأكد من حذف أمر البيع ${order.order_number} نهائياً؟`)) {
                deleteMutation.mutate(order.id);
              }
            }}
          />
        </section>
      </main>

      <CreateSalesOrderModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        catalogProducts={catalogProducts}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isPending={createMutation.isPending}
      />

      <SalesOrderDetailsModal
        order={selectedOrder}
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onConfirm={(id) => confirmMutation.mutate(id)}
        onConvert={(id, num) => {
          if (confirm(`هل تريد تحويل أمر البيع رقم ${num} إلى فاتورة بيع فعلية؟`)) {
            convertMutation.mutate(id);
          }
        }}
      />
    </div>
  );
}
