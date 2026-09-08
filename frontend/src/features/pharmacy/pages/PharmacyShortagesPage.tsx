import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyShortage } from '../types/pharmacy.types';
import { MAJOR_DISTRIBUTORS } from '../constants/pharmacy.constants';
import { IconPlus, IconRefresh } from '../components/PharmacyIcons';
import { ShortagesKpiGrid } from '../components/shortages/ShortagesKpiGrid';
import { ShortageQuickAddBar } from '../components/shortages/ShortageQuickAddBar';
import { ShortageFilterBar } from '../components/shortages/ShortageFilterBar';
import { ShortagesTable } from '../components/shortages/ShortagesTable';
import { ShortageDetailModal } from '../components/shortages/ShortageDetailModal';

export default function PharmacyShortagesPage() {
  useAppToolbar([
    { label: 'الرئيسية', to: '/' },
    { label: 'الصيدلية والأدوية', to: '/pharmacy' },
    { label: 'كشكول النواقص الرقمي' },
  ]);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Fast inline addition state
  const [quickName, setQuickName] = useState('');
  const [quickQty, setQuickQty] = useState(1);
  const [quickDist, setQuickDist] = useState(MAJOR_DISTRIBUTORS[0]);
  const [quickPriority, setQuickPriority] = useState<'normal' | 'urgent' | 'customer_request'>('normal');

  // Detailed Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShortage, setEditingShortage] = useState<Partial<PharmacyShortage> | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pharmacy', 'shortages', searchQuery, statusFilter, priorityFilter, page],
    queryFn: () =>
      pharmacyApi.listShortages({
        q: searchQuery,
        status: statusFilter,
        priority: priorityFilter,
        page,
        pageSize: 20,
      }),
  });

  const upsertMutation = useMutation({
    mutationFn: pharmacyApi.upsertShortage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'shortages'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
      setModalOpen(false);
      setEditingShortage(null);
      setQuickName('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      pharmacyApi.updateShortageStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'shortages'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
    },
  });

  const totalItems = data?.pagination?.totalItems || (data?.shortages?.length || 0);
  const shortagesList = data?.shortages || [];

  const neededCount = shortagesList.filter((s: PharmacyShortage) => s.status === 'needed').length;
  const urgentCount = shortagesList.filter((s: PharmacyShortage) => s.priority === 'urgent').length;
  const customerCount = shortagesList.filter((s: PharmacyShortage) => s.priority === 'customer_request').length;
  const receivedCount = shortagesList.filter((s: PharmacyShortage) => s.status === 'received').length;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    upsertMutation.mutate({
      product_name: quickName.trim(),
      requested_quantity: Number(quickQty) || 1,
      suggested_distributor: quickDist,
      priority: quickPriority,
      status: 'needed',
    });
  };

  const handleOpenAdd = () => {
    setEditingShortage({
      product_name: '',
      active_ingredient: '',
      suggested_distributor: MAJOR_DISTRIBUTORS[0],
      requested_quantity: 2,
      priority: 'normal',
      customer_name: '',
      customer_phone: '',
      status: 'needed',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShortage || !editingShortage.product_name) return;
    upsertMutation.mutate(editingShortage);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="كشكول النواقص الرقمي اليومي (Shortages Book)"
          description="تسجيل الأدوية الناقصة، طلبات العملاء العاجلة، وإعداد طلبيات شركات التوزيع"
          badge={<span className="cashier-chip" style={{ fontWeight: 700, color: 'var(--primary, #1e1b4b)', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>{totalItems} صنف مسجل</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus size={15} />
                <span>تسجيل صنف مفصل</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void refetch()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh size={15} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* 4 Summary KPI Cards */}
        <ShortagesKpiGrid
          neededCount={neededCount}
          urgentCount={urgentCount}
          customerCount={customerCount}
          receivedCount={receivedCount}
        />

        {/* Quick Add Bar */}
        <ShortageQuickAddBar
          quickName={quickName}
          setQuickName={setQuickName}
          quickQty={quickQty}
          setQuickQty={setQuickQty}
          quickDist={quickDist}
          setQuickDist={setQuickDist}
          quickPriority={quickPriority}
          setQuickPriority={setQuickPriority}
          isPending={upsertMutation.isPending}
          onSubmit={handleQuickAdd}
        />

        {/* Filter Bar */}
        <ShortageFilterBar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalItems={totalItems}
          onPageReset={() => setPage(1)}
        />

        {/* Table */}
        <ShortagesTable
          shortages={shortagesList}
          isLoading={isLoading}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
          onEdit={(s) => {
            setEditingShortage(s);
            setModalOpen(true);
          }}
        />

        {/* Modal */}
        <ShortageDetailModal
          isOpen={modalOpen && !!editingShortage}
          onClose={() => setModalOpen(false)}
          shortage={editingShortage}
          setShortage={setEditingShortage}
          isPending={upsertMutation.isPending}
          onSubmit={handleSave}
        />
      </main>
    </div>
  );
}
