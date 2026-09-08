import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppToolbar } from '@/stores/toolbar-store';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  crmApi,
  type CrmDeal,
  type DealStage,
} from '../api/crm.api';
import {
  PlusIcon,
  SearchIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import { STAGES } from '../components/CrmConstants';
import { CrmStageRow } from '../components/CrmStageRow';
import { CrmDealCreateModal } from '../components/CrmDealCreateModal';
import { CrmDealDetailModal } from '../components/CrmDealDetailModal';
import { CrmDealTable } from '../components/CrmDealTable';

export function CrmPipelinePage() {
  const queryClient = useQueryClient();

  useAppToolbar([
    { label: 'المبيعات', to: '/sales' },
    { label: 'إدارة علاقات العملاء (CRM)' },
  ]);

  // State filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries
  const { data: deals = [] } = useQuery({
    queryKey: ['crm-deals'],
    queryFn: () => crmApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['crm-summary'],
    queryFn: crmApi.getSummary,
  });

  // Mutations
  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => crmApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || 'فشل تحديث الفرصة.');
    },
  });

  function showFeedback(type: 'success' | 'error', text: string) {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  }

  function handleStageChange(deal: CrmDeal, nextStage: DealStage) {
    const stageObj = STAGES.find((s) => s.key === nextStage);
    const newProb = stageObj ? stageObj.defaultProbability : deal.probability;
    updateDealMutation.mutate({
      id: deal.id,
      data: {
        stage: nextStage,
        probability: newProb,
      },
    });
  }

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
      if (stageFilter !== 'all' && d.stage !== stageFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchContact = d.contactName?.toLowerCase().includes(q);
        const matchCompany = d.companyName?.toLowerCase().includes(q);
        const matchPhone = d.contactPhone?.includes(q);
        if (!matchTitle && !matchContact && !matchCompany && !matchPhone) return false;
      }
      return true;
    });
  }, [deals, priorityFilter, stageFilter, searchQuery]);

  return (
    <div className="page-stack page-shell crm-pipeline-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* Top Header */}
        <PageHeader
          title="إدارة علاقات العملاء والصفقات (CRM Pipeline)"
          description="تتبع مسار المبيعات والفرص التجارية، إدارة الأنشطة والمهام، والتحويل الفوري إلى عملاء وفواتير بيع."
          badge={<span className="nav-pill">خط المبيعات</span>}
          actions={
            <div className="actions compact-actions page-header-actions">
              <Button
                variant="primary"
                onClick={() => setIsCreateOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <PlusIcon size={16} />
                <span>إضافة فرصة بيعية</span>
              </Button>
            </div>
          }
        />

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            style={{
              margin: '16px 0',
              padding: '12px 16px',
              borderRadius: '8px',
              background: feedbackMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${feedbackMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              color: feedbackMessage.type === 'success' ? '#065f46' : '#991b1b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <span>{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <XIcon size={16} />
            </button>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div style={{ marginBottom: '16px' }}>
          <StatsGrid
            items={[
              {
                key: 'active-deals',
                label: 'إجمالي الفرص النشطة',
                value: `${summary?.totalActiveCount ?? 0} فرصة`,
              },
              {
                key: 'pipeline-amount',
                label: 'قيمة المسار النشط',
                value: formatCurrency(summary?.totalActiveAmount ?? 0),
              },
              {
                key: 'weighted-amount',
                label: 'القيمة الموزونة المتوقعة',
                value: formatCurrency(summary?.weightedAmount ?? 0),
              },
              {
                key: 'win-rate',
                label: 'معدل الإغلاق والنجاح',
                value: `${summary?.winRate ?? 0}%`,
              },
            ]}
          />
        </div>

        {/* Main Workspace Panel */}
        <section className="document-prototype-section workspace-panel">
          <div className="section-header-compact-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="document-prototype-section-title" style={{ margin: 0 }}>مسار الصفقات والمتابعات</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>إدارة ومتابعة تحويل الفرص البيعية والأنشطة</p>
            </div>
          </div>

          {/* Control Bar: Filters, Search & View Switcher */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
            <input
              type="text"
              placeholder="بحث بالفرصة، العميل، الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 36px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <SearchIcon size={16} color="#94a3b8" />
            </span>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: '#ffffff',
              color: '#334155',
            }}
          >
            <option value="all">كافة الأولويات</option>
            <option value="urgent">عاجلة جداً</option>
            <option value="high">مرتفعة</option>
            <option value="medium">متوسطة</option>
            <option value="low">منخفضة</option>
          </select>

          {/* Stage Filter (for table view) */}
          {viewMode === 'table' && (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: '#ffffff',
                color: '#334155',
              }}
            >
              <option value="all">كافة المراحل</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
              <option value="lost">صفقة خاسرة</option>
            </select>
          )}
        </div>

        {/* View Switcher Buttons */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'kanban' ? '#ffffff' : 'transparent',
              color: viewMode === 'kanban' ? '#170e5e' : '#64748b',
              boxShadow: viewMode === 'kanban' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            لوحة كانبان (Kanban)
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'table' ? '#ffffff' : 'transparent',
              color: viewMode === 'table' ? '#170e5e' : '#64748b',
              boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            جدول تفصيلي (Table)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'kanban' ? (
        /* Kanban Vertical Layout - كل مرحلة row كامل العرض */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {STAGES.map((stage) => (
            <CrmStageRow
              key={stage.key}
              stage={stage}
              deals={filteredDeals}
              onSelectDeal={setSelectedDealId}
              onStageChange={handleStageChange}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <CrmDealTable deals={filteredDeals} onSelectDeal={setSelectedDealId} />
      )}
      </section>
    </main>

      {/* Modal: Create New Deal */}
      <CrmDealCreateModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(msg) => showFeedback('success', msg)}
      />

      {/* Modal: Deal Details */}
      <CrmDealDetailModal
        dealId={selectedDealId}
        onClose={() => setSelectedDealId(null)}
        onStageChange={handleStageChange}
        onFeedback={showFeedback}
      />
    </div>
  );
}
