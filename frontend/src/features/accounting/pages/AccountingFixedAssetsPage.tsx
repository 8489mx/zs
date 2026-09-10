import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { accountingApi, type FixedAsset } from '@/features/accounting/api/accounting.api';
import { StatsGrid } from '@/shared/components/stats-grid';
import { AddFixedAssetModal } from '../components/fixed-assets/AddFixedAssetModal';
import { DepreciateAssetModal, BatchDepreciateModal } from '../components/fixed-assets/DepreciateModals';
import { FixedAssetsTable } from '../components/fixed-assets/FixedAssetsTable';
import { FixedAssetsLogsTable } from '../components/fixed-assets/FixedAssetsLogsTable';
import { ClockIcon, RefreshCwIcon } from '@/shared/components/icons/AppIcons';

export function AccountingFixedAssetsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'assets' | 'logs'>('assets');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [depreciateModalAsset, setDepreciateModalAsset] = useState<FixedAsset | null>(null);
  const [depreciateMonths, setDepreciateMonths] = useState(1);
  const [depreciateNote, setDepreciateNote] = useState('');
  const [batchDepreciateOpen, setBatchDepreciateOpen] = useState(false);
  const [batchMonths, setBatchMonths] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for New Asset
  const [newAsset, setNewAsset] = useState({
    code: '',
    name: '',
    category: 'equipment',
    purchaseCost: '',
    salvageValue: '0',
    usefulLifeMonths: '60',
    depreciationMethod: 'straight_line' as 'straight_line' | 'declining_balance',
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  const assetsQuery = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: async () => {
      const res = await accountingApi.listFixedAssets();
      return res.assets || [];
    },
  });

  const logsQuery = useQuery({
    queryKey: ['fixed-assets-logs'],
    queryFn: async () => {
      const res = await accountingApi.listAssetDepreciationLogs();
      return res.logs || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newAsset) => {
      return await accountingApi.createFixedAsset({
        code: data.code,
        name: data.name,
        category: data.category,
        purchaseCost: Number(data.purchaseCost),
        salvageValue: Number(data.salvageValue || 0),
        usefulLifeMonths: Number(data.usefulLifeMonths || 60),
        depreciationMethod: data.depreciationMethod,
        purchaseDate: data.purchaseDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      setAddModalOpen(false);
      setNewAsset({
        code: '',
        name: '',
        category: 'equipment',
        purchaseCost: '',
        salvageValue: '0',
        usefulLifeMonths: '60',
        depreciationMethod: 'straight_line',
        purchaseDate: new Date().toISOString().split('T')[0],
      });
    },
  });

  const depreciateMutation = useMutation({
    mutationFn: async ({ id, months, note }: { id: number; months: number; note: string }) => {
      return await accountingApi.depreciateFixedAsset(id, { months, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets-logs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-journals'] });
      setDepreciateModalAsset(null);
      setDepreciateNote('');
      setDepreciateMonths(1);
    },
  });

  const batchDepreciateMutation = useMutation({
    mutationFn: async ({ months, note }: { months: number; note: string }) => {
      return await accountingApi.depreciateAllFixedAssets({ months, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets-logs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-journals'] });
      setBatchDepreciateOpen(false);
      setBatchMonths(1);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await accountingApi.deleteFixedAsset(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
    },
  });

  // Automated Scheduler Query & Mutations
  const schedulerQuery = useQuery({
    queryKey: ['fixed-assets-auto-scheduler'],
    queryFn: async () => {
      return await accountingApi.getAutoDepreciationStatus();
    },
  });

  const toggleAutoMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await accountingApi.toggleAutoDepreciation(enabled);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets-auto-scheduler'] });
    },
  });

  const triggerAutoMutation = useMutation({
    mutationFn: async () => {
      return await accountingApi.triggerAutoDepreciation();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets-logs'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets-auto-scheduler'] });
    },
  });

  const assets = assetsQuery.data || [];
  const logs = logsQuery.data || [];

  // Summary Metrics
  const summary = useMemo(() => {
    let totalCost = 0;
    let totalAccum = 0;
    let totalBook = 0;
    let activeCount = 0;
    for (const a of assets) {
      if (a.status !== 'retired') {
        totalCost += Number(a.purchase_cost || 0);
        totalAccum += Number(a.accumulated_depreciation || 0);
        totalBook += Number(a.book_value || 0);
        if (a.status === 'active') activeCount++;
      }
    }
    return { totalCost, totalAccum, totalBook, activeCount };
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchCat = selectedCategory === 'all' || a.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQ = !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [assets, selectedCategory, searchQuery]);

  const stats = [
    { key: 'cost', label: 'إجمالي تكلفة الشراء', value: formatCurrency(summary.totalCost) },
    { key: 'accum', label: 'مجمع الإهلاك (1290)', value: formatCurrency(summary.totalAccum) },
    { key: 'book', label: 'صافي القيمة الدفترية', value: formatCurrency(summary.totalBook) },
    { key: 'active', label: 'الأصول النشطة القابلة للإهلاك', value: `${summary.activeCount} أصل` },
  ] as const;

  return (
    <div className="page-stack page-shell fixed-assets-workspace" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        {/* Header */}
        <PageHeader
          title="الأصول الثابتة والإهلاك المحاسبي"
          description="تسجيل وإدارة الأصول الرأسمالية واحتساب قسط الإهلاك وتوليد القيود الآلية في شجرة الحسابات."
          badge={<span className="nav-pill">{summary.activeCount} أصل نشط</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                type="button"
                variant={activeTab === 'assets' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('assets')}
              >
                سجل الأصول
              </Button>
              <Button
                type="button"
                variant={activeTab === 'logs' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('logs')}
              >
                سجل القيود ({logs.length})
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setBatchDepreciateOpen(true)}
                style={{ borderColor: '#f59e0b', color: '#b45309', fontWeight: 700 }}
                disabled={summary.activeCount === 0}
              >
                إهلاك شهري عام
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setAddModalOpen(true)}
              >
                + إضافة أصل جديد
              </Button>
            </div>
          }
        />

        {/* Summary KPI Cards */}
        <StatsGrid items={stats} />

        {/* Automated Monthly Depreciation Scheduler Banner */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: schedulerQuery.data?.enabled ? '#ecfdf5' : '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: schedulerQuery.data?.enabled ? '#059669' : '#64748b',
                border: '1px solid #e2e8f0',
              }}
            >
              <ClockIcon size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--font-section-title)', color: '#0f172a' }}>
                  الجدولة المؤتمتة للإهلاك الشهري (Automated Monthly Depreciation)
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: 'var(--font-badge)',
                    fontWeight: 600,
                    backgroundColor: schedulerQuery.data?.enabled ? '#dcfce7' : '#f1f5f9',
                    color: schedulerQuery.data?.enabled ? '#15803d' : '#64748b',
                  }}
                >
                  {schedulerQuery.data?.enabled ? 'مفعلة وتعمل تلقائياً' : 'معطلة (يدوي فقط)'}
                </span>
              </div>
              <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', marginTop: '2px' }}>
                موعد الإهلاك الآلي القادم: <strong>{schedulerQuery.data?.nextScheduledDate || 'نهاية الشهر'}</strong>
                {schedulerQuery.data?.lastRunMonth && (
                  <span style={{ marginInlineStart: '12px' }}>
                    | آخر إهلاك مجدول تم بنجاح: <strong>{schedulerQuery.data.lastRunMonth}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => triggerAutoMutation.mutate()}
              disabled={triggerAutoMutation.isPending || summary.activeCount === 0}
              style={{ fontSize: 'var(--font-body)', fontWeight: 600 }}
            >
              <RefreshCwIcon size={14} />
              {triggerAutoMutation.isPending ? 'جاري التنفيذ وتوليد القيود...' : 'تشغيل الإهلاك الآن'}
            </Button>

            <Button
              type="button"
              variant={schedulerQuery.data?.enabled ? 'danger' : 'primary'}
              onClick={() => toggleAutoMutation.mutate(!schedulerQuery.data?.enabled)}
              disabled={toggleAutoMutation.isPending}
              style={{ fontSize: 'var(--font-body)', fontWeight: 600 }}
            >
              {schedulerQuery.data?.enabled ? 'تعطيل الجدولة الآلية' : 'تفعيل الجدولة الآلية'}
            </Button>
          </div>
        </div>

        {activeTab === 'assets' ? (
          <FixedAssetsTable
            assets={filteredAssets}
            totalCount={assets.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onDepreciate={(asset) => setDepreciateModalAsset(asset)}
            onDelete={(asset) => {
              if (window.confirm(`هل أنت متأكد من حذف أو استبعاد الأصل: ${asset.name}؟`)) {
                deleteMutation.mutate(asset.id);
              }
            }}
          />
        ) : (
          <FixedAssetsLogsTable logs={logs} />
        )}
      </main>

      <AddFixedAssetModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        asset={newAsset}
        setAsset={setNewAsset}
        isPending={createMutation.isPending}
        onSubmit={() => createMutation.mutate(newAsset)}
      />

      <DepreciateAssetModal
        asset={depreciateModalAsset}
        months={depreciateMonths}
        setMonths={setDepreciateMonths}
        note={depreciateNote}
        setNote={setDepreciateNote}
        isPending={depreciateMutation.isPending}
        onClose={() => setDepreciateModalAsset(null)}
        onSubmit={() => {
          if (depreciateModalAsset) {
            depreciateMutation.mutate({
              id: depreciateModalAsset.id,
              months: depreciateMonths,
              note: depreciateNote,
            });
          }
        }}
      />

      <BatchDepreciateModal
        isOpen={batchDepreciateOpen}
        activeCount={summary.activeCount}
        months={batchMonths}
        setMonths={setBatchMonths}
        isPending={batchDepreciateMutation.isPending}
        onClose={() => setBatchDepreciateOpen(false)}
        onSubmit={() => batchDepreciateMutation.mutate({
          months: batchMonths,
          note: `إهلاك دوري مجمع لعدد ${batchMonths} شهر`,
        })}
      />
    </div>
  );
}
