import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import {
  crmApi,
  type CrmDeal,
  type CrmActivity,
  type DealStage,
  type DealPriority,
  type CreateDealPayload,
} from '../api/crm.api';
import {
  PlusIcon,
  Trash2Icon,
  SearchIcon,
  TrendingUpIcon,
  DollarSignIcon,
  UsersIcon,
  AwardIcon,
  CalendarIcon,
  CheckIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';

const STAGES: Array<{ key: DealStage; label: string; defaultProbability: number; color: string; bg: string }> = [
  { key: 'new', label: 'جديد', defaultProbability: 20, color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)' },
  { key: 'contacted', label: 'تم التواصل', defaultProbability: 40, color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)' },
  { key: 'qualified', label: 'مؤهل للشراء', defaultProbability: 60, color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)' },
  { key: 'proposal', label: 'عرض سعر مرسل', defaultProbability: 75, color: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)' },
  { key: 'negotiation', label: 'قيد التفاوض', defaultProbability: 90, color: '#ea580c', bg: 'rgba(234, 88, 12, 0.08)' },
  { key: 'won', label: 'تمت الصفقة بنجاح', defaultProbability: 100, color: '#16a34a', bg: 'rgba(22, 163, 74, 0.08)' },
  { key: 'lost', label: 'صفقة خاسرة', defaultProbability: 0, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)' },
];

const PRIORITIES: Record<DealPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'منخفضة', color: '#64748b', bg: '#f1f5f9' },
  medium: { label: 'متوسطة', color: '#0284c7', bg: '#e0f2fe' },
  high: { label: 'مرتفعة', color: '#ea580c', bg: '#ffedd5' },
  urgent: { label: 'عاجلة جداً', color: '#dc2626', bg: '#fee2e2' },
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: 'مكالمة هاتفية',
  meeting: 'اجتماع عمل',
  task: 'مهمة متابعة',
  note: 'ملاحظة',
  stage_change: 'تغيير مرحلة',
  converted: 'تحويل إلى عميل',
};

export function CrmPipelinePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [newActivitySummary, setNewActivitySummary] = useState('');
  const [newActivityType, setNewActivityType] = useState('call');
  const [newActivityDueDate, setNewActivityDueDate] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Deal Form State
  const [dealForm, setDealForm] = useState<CreateDealPayload>({
    title: '',
    expectedAmount: 0,
    currency: 'EGP',
    probability: 20,
    stage: 'new',
    expectedCloseDate: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    companyName: '',
    source: 'direct',
    priority: 'medium',
    notes: '',
  });

  // Queries
  const { data: deals = [] } = useQuery({
    queryKey: ['crm-deals'],
    queryFn: () => crmApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['crm-summary'],
    queryFn: crmApi.getSummary,
  });

  const { data: activeDealDetail } = useQuery({
    queryKey: ['crm-deal-detail', selectedDealId],
    queryFn: () => crmApi.get(selectedDealId!),
    enabled: Boolean(selectedDealId),
  });

  // Mutations
  const createDealMutation = useMutation({
    mutationFn: crmApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
      setIsCreateOpen(false);
      resetDealForm();
      showFeedback('success', 'تمت إضافة الفرصة البيعية بنجاح.');
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || 'فشل إنشاء الفرصة البيعية.');
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => crmApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
      if (selectedDealId) {
        queryClient.invalidateQueries({ queryKey: ['crm-deal-detail', selectedDealId] });
      }
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || 'فشل تحديث الفرصة.');
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: crmApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
      setSelectedDealId(null);
      showFeedback('success', 'تم حذف الفرصة البيعية بنجاح.');
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || 'فشل حذف الفرصة.');
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: ({ dealId, data }: { dealId: number; data: any }) => crmApi.addActivity(dealId, data),
    onSuccess: () => {
      if (selectedDealId) {
        queryClient.invalidateQueries({ queryKey: ['crm-deal-detail', selectedDealId] });
      }
      setNewActivitySummary('');
      setNewActivityDueDate('');
      showFeedback('success', 'تم تسجيل النشاط بنجاح.');
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || 'فشل إضافة النشاط.');
    },
  });

  const toggleActivityMutation = useMutation({
    mutationFn: crmApi.toggleActivity,
    onSuccess: () => {
      if (selectedDealId) {
        queryClient.invalidateQueries({ queryKey: ['crm-deal-detail', selectedDealId] });
      }
    },
  });

  const convertCustomerMutation = useMutation({
    mutationFn: crmApi.convertToCustomer,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
      if (selectedDealId) {
        queryClient.invalidateQueries({ queryKey: ['crm-deal-detail', selectedDealId] });
      }
      showFeedback('success', `تم تحويل الفرصة إلى عميل مسجل برقم #${res.customerId} بنجاح.`);
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || 'فشل تحويل الفرصة إلى عميل.');
    },
  });

  function showFeedback(type: 'success' | 'error', text: string) {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  }

  function resetDealForm() {
    setDealForm({
      title: '',
      expectedAmount: 0,
      currency: 'EGP',
      probability: 20,
      stage: 'new',
      expectedCloseDate: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      companyName: '',
      source: 'direct',
      priority: 'medium',
      notes: '',
    });
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
    <div dir="rtl" style={{ width: '100%', minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      {/* Top Header */}
      <PageHeader
        title="إدارة علاقات العملاء والصفقات (CRM Pipeline)"
        description="تتبع مسار المبيعات والفرص التجارية، إدارة الأنشطة والمهام، والتحويل الفوري إلى عملاء وفواتير بيع."
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button
            variant="primary"
            style={{ background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => {
              resetDealForm();
              setIsCreateOpen(true);
            }}
          >
            <PlusIcon size={16} color="#ffffff" />
            <span>إضافة فرصة بيعية</span>
          </Button>
        </div>
      </PageHeader>

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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          margin: '20px 0',
        }}
      >
        {/* Total Active Deals */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>إجمالي الفرص النشطة</span>
            <UsersIcon size={20} color="#170e5e" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#170e5e' }}>
            {summary?.totalActiveCount ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            من أصل {summary?.totalDeals ?? 0} فرصة مسجلة
          </div>
        </div>

        {/* Total Pipeline Amount */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>قيمة المسار النشط</span>
            <DollarSignIcon size={20} color="#0284c7" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0284c7' }}>
            {formatCurrency(summary?.totalActiveAmount ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            إجمالي قيمة العقود المحتملة
          </div>
        </div>

        {/* Weighted Expected Amount */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>القيمة الموزونة المتوقعة</span>
            <TrendingUpIcon size={20} color="#16a34a" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
            {formatCurrency(summary?.weightedAmount ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            معدلة حسب احتمالية نجاح كل فرصة
          </div>
        </div>

        {/* Win Rate */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>معدل الإغلاق والنجاح</span>
            <AwardIcon size={20} color="#d97706" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#d97706' }}>
            {summary?.winRate ?? 0}%
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            {summary?.wonCount ?? 0} صفقات ناجحة بقيمة {formatCurrency(summary?.wonAmount ?? 0)}
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search & View Switcher */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
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
        /* Kanban Columns Container */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(260px, 1fr))',
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '16px',
            alignItems: 'start',
          }}
        >
          {STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage === stage.key);
            const stageTotalAmount = stageDeals.reduce((sum, d) => sum + Number(d.expectedAmount || 0), 0);

            return (
              <div
                key={stage.key}
                style={{
                  background: '#f1f5f9',
                  borderRadius: '12px',
                  padding: '12px',
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Stage Header */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: stage.color,
                        }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                        {stage.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: stage.bg,
                        color: stage.color,
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      {stageDeals.length}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>
                    {formatCurrency(stageTotalAmount)}
                  </div>
                </div>

                {/* Deal Cards in this Stage */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stageDeals.map((deal) => {
                    const priorityConfig = PRIORITIES[deal.priority] || PRIORITIES.medium;
                    const stageIndex = STAGES.findIndex((s) => s.key === deal.stage);

                    return (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDealId(deal.id)}
                        style={{
                          background: '#ffffff',
                          borderRadius: '10px',
                          padding: '12px',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                        }}
                      >
                        {/* Title & Priority Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                            {deal.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              background: priorityConfig.bg,
                              color: priorityConfig.color,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {priorityConfig.label}
                          </span>
                        </div>

                        {/* Customer / Company */}
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                          {deal.companyName || deal.contactName || 'بدون جهة اتصال'}
                        </div>

                        {/* Amount & Probability */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '10px',
                            paddingTop: '8px',
                            borderTop: '1px solid #f1f5f9',
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#170e5e' }}>
                            {formatCurrency(deal.expectedAmount)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                            {deal.probability}% احتمالية
                          </span>
                        </div>

                        {/* Fast Stage Shift Arrows */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '8px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            disabled={stageIndex === 0}
                            onClick={() => handleStageChange(deal, STAGES[stageIndex - 1].key)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              background: stageIndex === 0 ? '#f1f5f9' : '#e2e8f0',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: stageIndex === 0 ? 'not-allowed' : 'pointer',
                              color: '#475569',
                            }}
                            title="المرحلة السابقة"
                          >
                            →
                          </button>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {deal.contactPhone ? deal.contactPhone : ''}
                          </span>
                          <button
                            disabled={stageIndex === STAGES.length - 1}
                            onClick={() => handleStageChange(deal, STAGES[stageIndex + 1].key)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              background: stageIndex === STAGES.length - 1 ? '#f1f5f9' : '#170e5e',
                              color: stageIndex === STAGES.length - 1 ? '#94a3b8' : '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: stageIndex === STAGES.length - 1 ? 'not-allowed' : 'pointer',
                            }}
                            title="المرحلة التالية"
                          >
                            ←
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {stageDeals.length === 0 && (
                    <div
                      style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '12px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                      }}
                    >
                      لا توجد صفقات في هذه المرحلة
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>عنوان الفرصة</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>العميل / الشركة</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>المرحلة</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>القيمة المتوقعة</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>الاحتمالية</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>الأولوية</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>تاريخ الإغلاق</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal) => {
                const stageConfig = STAGES.find((s) => s.key === deal.stage);
                const priorityConfig = PRIORITIES[deal.priority] || PRIORITIES.medium;

                return (
                  <tr
                    key={deal.id}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => setSelectedDealId(deal.id)}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#170e5e' }}>{deal.title}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {deal.companyName || deal.contactName || '-'}
                      {deal.contactPhone && (
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{deal.contactPhone}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: stageConfig?.bg || '#f1f5f9',
                          color: stageConfig?.color || '#475569',
                        }}
                      >
                        {stageConfig?.label || deal.stage}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                      {formatCurrency(deal.expectedAmount)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{deal.probability}%</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: priorityConfig.bg,
                          color: priorityConfig.color,
                        }}
                      >
                        {priorityConfig.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {deal.expectedCloseDate ? formatDateOnly(deal.expectedCloseDate) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                        onClick={() => setSelectedDealId(deal.id)}
                      >
                        عرض التفاصيل
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredDeals.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    لا توجد فرص بيعية مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create New Deal */}
      <DialogShell
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        width="min(760px, 95%)"
        ariaLabel="إضافة فرصة بيعية جديدة"
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#170e5e', margin: 0 }}>
              إضافة فرصة بيعية جديدة (New Opportunity)
            </h2>
            <button
              onClick={() => setIsCreateOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <XIcon size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Field label="عنوان الفرصة البيعية *">
                <input
                  type="text"
                  placeholder="مثال: توريد شحنة معدات لمستشفى الشفاء"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div>
              <Field label="القيمة المتوقعة">
                <input
                  type="number"
                  placeholder="0.00"
                  value={dealForm.expectedAmount || ''}
                  onChange={(e) => setDealForm({ ...dealForm, expectedAmount: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div>
              <Field label="المرحلة الابتدائية">
                <select
                  value={dealForm.stage}
                  onChange={(e) => {
                    const st = e.target.value;
                    const defaultProb = STAGES.find((s) => s.key === st)?.defaultProbability || 20;
                    setDealForm({ ...dealForm, stage: st, probability: defaultProb });
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <Field label="نسبة الاحتمالية (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={dealForm.probability ?? 20}
                  onChange={(e) => setDealForm({ ...dealForm, probability: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div>
              <Field label="تاريخ الإغلاق المتوقع">
                <input
                  type="date"
                  value={dealForm.expectedCloseDate || ''}
                  onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div>
              <Field label="اسم جهة الاتصال / المسؤول">
                <input
                  type="text"
                  placeholder="مثال: أ. محمد عبد الله"
                  value={dealForm.contactName || ''}
                  onChange={(e) => setDealForm({ ...dealForm, contactName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div>
              <Field label="رقم الهاتف للتواصل">
                <input
                  type="tel"
                  placeholder="مثال: 01012345678"
                  value={dealForm.contactPhone || ''}
                  onChange={(e) => setDealForm({ ...dealForm, contactPhone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div>
              <Field label="اسم المنشأة أو الشركة">
                <input
                  type="text"
                  placeholder="مثال: شركة المستقبل للتقنية"
                  value={dealForm.companyName || ''}
                  onChange={(e) => setDealForm({ ...dealForm, companyName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div>
              <Field label="الأولوية">
                <select
                  value={dealForm.priority}
                  onChange={(e) => setDealForm({ ...dealForm, priority: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">مرتفعة</option>
                  <option value="urgent">عاجلة جداً</option>
                </select>
              </Field>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <Field label="ملاحظات ومتطلبات العميل">
                <textarea
                  rows={3}
                  placeholder="سجل أي تفاصيل هامة تخص احتياجات العميل..."
                  value={dealForm.notes || ''}
                  onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              style={{ background: '#170e5e', color: '#ffffff' }}
              onClick={() => {
                if (!dealForm.title.trim()) {
                  alert('يرجى إدخال عنوان الفرصة البيعية.');
                  return;
                }
                createDealMutation.mutate(dealForm);
              }}
              disabled={createDealMutation.isPending}
            >
              {createDealMutation.isPending ? 'جاري الحفظ...' : 'حفظ الفرصة البيعية'}
            </Button>
          </div>
        </div>
      </DialogShell>

      {/* Modal: Deal Details, Timeline & Quick Actions */}
      {selectedDealId && activeDealDetail?.deal && (
        <DialogShell
          open={Boolean(selectedDealId)}
          onClose={() => setSelectedDealId(null)}
          width="min(880px, 95%)"
          ariaLabel="تفاصيل الفرصة البيعية والأنشطة"
        >
          <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#170e5e', margin: 0 }}>
                    {activeDealDetail.deal.title}
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: STAGES.find((s) => s.key === activeDealDetail.deal.stage)?.bg || '#f1f5f9',
                      color: STAGES.find((s) => s.key === activeDealDetail.deal.stage)?.color || '#475569',
                    }}
                  >
                    {STAGES.find((s) => s.key === activeDealDetail.deal.stage)?.label || activeDealDetail.deal.stage}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                  {activeDealDetail.deal.companyName ? `${activeDealDetail.deal.companyName} • ` : ''}
                  {activeDealDetail.deal.contactName || 'بدون جهة اتصال'}
                  {activeDealDetail.deal.contactPhone ? ` (${activeDealDetail.deal.contactPhone})` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  style={{ color: '#dc2626' }}
                  onClick={() => {
                    if (confirm('هل أنت متأكد من رغبتك في حذف هذه الفرصة البيعية؟')) {
                      deleteDealMutation.mutate(activeDealDetail.deal.id);
                    }
                  }}
                >
                  <Trash2Icon size={16} />
                </Button>
                <button
                  onClick={() => setSelectedDealId(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            {/* Quick Actions Ribbon */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {activeDealDetail.deal.customerId ? (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#16a34a',
                      background: '#ecfdf5',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckIcon size={14} color="#16a34a" />
                    عميل مسجل بالنظام (رقم #{activeDealDetail.deal.customerId})
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    style={{ background: '#16a34a', color: '#ffffff', fontSize: '12px' }}
                    onClick={() => convertCustomerMutation.mutate(activeDealDetail.deal.id)}
                    disabled={convertCustomerMutation.isPending}
                  >
                    {convertCustomerMutation.isPending ? 'جاري التحويل...' : 'تحويل إلى عميل مسجل'}
                  </Button>
                )}

                {activeDealDetail.deal.contactPhone && (
                  <Button
                    variant="secondary"
                    style={{ fontSize: '12px', color: '#059669', borderColor: '#a7f3d0' }}
                    onClick={() => {
                      const cleanPhone = activeDealDetail.deal.contactPhone?.replace(/\D/g, '') || '';
                      window.open(
                        `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `مرحباً ${activeDealDetail.deal.contactName || ''}، بخصوص فرصة: ${activeDealDetail.deal.title}`
                        )}`,
                        '_blank'
                      );
                    }}
                  >
                    مراسلة واتساب
                  </Button>
                )}

                <Button
                  variant="secondary"
                  style={{ fontSize: '12px' }}
                  onClick={() => {
                    navigate('/pos');
                  }}
                >
                  فتح نقطة البيع (POS)
                </Button>
              </div>

              {/* Stage advancement dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>نقل المرحلة:</span>
                <select
                  value={activeDealDetail.deal.stage}
                  onChange={(e) => handleStageChange(activeDealDetail.deal, e.target.value as DealStage)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    background: '#ffffff',
                  }}
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                  <option value="lost">صفقة خاسرة</option>
                </select>
              </div>
            </div>

            {/* Deal Snapshot Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>القيمة المتوقعة</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#170e5e', marginTop: '2px' }}>
                  {formatCurrency(activeDealDetail.deal.expectedAmount)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>الاحتمالية</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0284c7', marginTop: '2px' }}>
                  {activeDealDetail.deal.probability}%
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>الأولوية</span>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {PRIORITIES[activeDealDetail.deal.priority]?.label || activeDealDetail.deal.priority}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>تاريخ الإغلاق</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                  {activeDealDetail.deal.expectedCloseDate ? formatDateOnly(activeDealDetail.deal.expectedCloseDate) : '-'}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {activeDealDetail.deal.notes && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  color: '#92400e',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>ملاحظات الصفقة:</div>
                <div>{activeDealDetail.deal.notes}</div>
              </div>
            )}

            {/* Activity Timeline Section */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#170e5e', marginBottom: '12px' }}>
                سجل المتابعات والأنشطة (Activity Timeline)
              </h3>

              {/* Add Activity Form */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '14px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 180px auto', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={newActivityType}
                    onChange={(e) => setNewActivityType(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="call">مكالمة هاتفية</option>
                    <option value="meeting">اجتماع عمل</option>
                    <option value="task">مهمة متابعة</option>
                    <option value="note">ملاحظة</option>
                  </select>

                  <input
                    type="text"
                    placeholder="ملخص المتابعة أو المهمة المطلوبة..."
                    value={newActivitySummary}
                    onChange={(e) => setNewActivitySummary(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />

                  <input
                    type="date"
                    value={newActivityDueDate}
                    onChange={(e) => setNewActivityDueDate(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />

                  <Button
                    variant="primary"
                    style={{ background: '#170e5e', color: '#ffffff', fontSize: '12px' }}
                    onClick={() => {
                      if (!newActivitySummary.trim()) {
                        alert('يرجى كتابة ملخص النشاط.');
                        return;
                      }
                      addActivityMutation.mutate({
                        dealId: activeDealDetail.deal.id,
                        data: {
                          activityType: newActivityType,
                          summary: newActivitySummary,
                          dueDate: newActivityDueDate || null,
                        },
                      });
                    }}
                    disabled={addActivityMutation.isPending}
                  >
                    إضافة نشاط
                  </Button>
                </div>
              </div>

              {/* Timeline List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {activeDealDetail.activities?.map((act: CrmActivity) => (
                  <div
                    key={act.id}
                    style={{
                      background: act.isCompleted ? '#f8fafc' : '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={act.isCompleted}
                        onChange={() => toggleActivityMutation.mutate(act.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            marginLeft: '8px',
                          }}
                        >
                          {ACTIVITY_LABELS[act.activityType] || act.activityType}
                        </span>
                        <span
                          style={{
                            fontSize: '13px',
                            color: act.isCompleted ? '#94a3b8' : '#1e293b',
                            textDecoration: act.isCompleted ? 'line-through' : 'none',
                          }}
                        >
                          {act.summary}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#94a3b8' }}>
                      {act.dueDate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarIcon size={12} />
                          {formatDateOnly(act.dueDate)}
                        </span>
                      )}
                      <span>{formatDateOnly(act.createdAt)}</span>
                    </div>
                  </div>
                ))}

                {(!activeDealDetail.activities || activeDealDetail.activities.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
                    لا توجد أنشطة مسجلة حتى الآن
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  );
}
