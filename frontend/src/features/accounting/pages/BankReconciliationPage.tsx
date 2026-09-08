import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatCurrency } from '@/lib/format';
import { CheckIcon, XIcon, SearchIcon, RefreshCwIcon, PlusIcon } from '@/shared/components/icons/AppIcons';
import { PageHeader } from '@/shared/components/page-header';
import {
  bankReconciliationApi,
  accountingApi,
  type BankStatementListItem,
  type BankStatementLine,
} from '@/features/accounting/api/accounting.api';

export function BankReconciliationPage() {
  const queryClient = useQueryClient();
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeTargetLine, setFeeTargetLine] = useState<BankStatementLine | null>(null);
  const [selectedExpenseAccountId, setSelectedExpenseAccountId] = useState<number>(0);
  const [statementFilterStatus, setStatementFilterStatus] = useState<'all' | 'pending' | 'reconciled'>('all');
  const [glFilterText, setGlFilterText] = useState('');
  const [selectedStatementLineId, setSelectedStatementLineId] = useState<number | null>(null);
  const [selectedGlLineId, setSelectedGlLineId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Fetch Accounts (for bank accounts and expense accounts)
  const accountsQuery = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: accountingApi.accounts,
  });

  const accounts = useMemo(() => {
    const raw = accountsQuery.data?.accounts || [];
    return Array.isArray(raw) ? raw : [];
  }, [accountsQuery.data]);

  const bankAccounts = useMemo(() => {
    return accounts.filter((a: any) => a.flags?.isCashBank || a.accountGroup === 'current_assets' || a.accountType === 'asset');
  }, [accounts]);

  const expenseAccounts = useMemo(() => {
    return accounts.filter((a: any) => a.accountType === 'expense');
  }, [accounts]);

  // Fetch Statements List
  const statementsQuery = useQuery({
    queryKey: ['bank-statements'],
    queryFn: () => bankReconciliationApi.listStatements(),
  });

  // Fetch Active Workspace (when a statement is selected)
  const workspaceQuery = useQuery({
    queryKey: ['bank-reconciliation-workspace', selectedStatementId],
    queryFn: () => bankReconciliationApi.getWorkspace(selectedStatementId!),
    enabled: selectedStatementId !== null,
  });

  // Reconcile Match Mutation
  const matchMutation = useMutation({
    mutationFn: (data: { statementLineId: number; journalLineId: number }) =>
      bankReconciliationApi.reconcileMatch(data),
    onSuccess: () => {
      setSelectedStatementLineId(null);
      setSelectedGlLineId(null);
      setStatusMessage('تمت مطابقة السطر البنكي مع القيد المحاسبي بنجاح.');
      void queryClient.invalidateQueries({ queryKey: ['bank-reconciliation-workspace', selectedStatementId] });
      void queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
    },
    onError: (err: any) => {
      setStatusMessage(err?.message || 'تعذر إجراء المطابقة');
    },
  });

  // Unreconcile Match Mutation
  const unmatchMutation = useMutation({
    mutationFn: (statementLineId: number) => bankReconciliationApi.unreconcileMatch(statementLineId),
    onSuccess: () => {
      setStatusMessage('تم إلغاء المطابقة وإعادة السطر للحركات المعلقة.');
      void queryClient.invalidateQueries({ queryKey: ['bank-reconciliation-workspace', selectedStatementId] });
      void queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
    },
  });

  // Fee Adjustment Mutation
  const feeAdjustmentMutation = useMutation({
    mutationFn: (data: { statementLineId: number; expenseAccountId: number; description?: string }) =>
      bankReconciliationApi.createFeeAdjustment(data),
    onSuccess: () => {
      setIsFeeModalOpen(false);
      setFeeTargetLine(null);
      setStatusMessage('تم إنشاء قيد المصاريف البنكية ومطابقته فورياً بنجاح.');
      void queryClient.invalidateQueries({ queryKey: ['bank-reconciliation-workspace', selectedStatementId] });
      void queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
    },
    onError: (err: any) => {
      setStatusMessage(err?.message || 'تعذر إنشاء قيد المصاريف البنكية');
    },
  });

  // Form state for creating a statement
  const [newStmtAccountId, setNewStmtAccountId] = useState<number>(0);
  const [newStmtNo, setNewStmtNo] = useState('');
  const [newStmtDate, setNewStmtDate] = useState(new Date().toISOString().slice(0, 10));
  const [newStmtStartBal, setNewStmtStartBal] = useState<number>(0);
  const [newStmtEndBal, setNewStmtEndBal] = useState<number>(0);
  const [newStmtNotes, setNewStmtNotes] = useState('');
  const [newStmtLines, setNewStmtLines] = useState<Array<{ lineDate: string; description: string; reference: string; amount: number }>>([
    { lineDate: new Date().toISOString().slice(0, 10), description: '', reference: '', amount: 0 },
    { lineDate: new Date().toISOString().slice(0, 10), description: '', reference: '', amount: 0 },
  ]);

  const createStatementMutation = useMutation({
    mutationFn: (data: any) => bankReconciliationApi.createStatement(data),
    onSuccess: (res) => {
      setIsCreateModalOpen(false);
      setStatusMessage('تم إنشاء كشف الحساب البنكي بنجاح.');
      void queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      if (res?.statement?.id) {
        setSelectedStatementId(Number(res.statement.id));
      }
    },
    onError: (err: any) => {
      setStatusMessage(err?.message || 'تعذر إنشاء كشف الحساب');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStmtAccountId || !newStmtNo.trim()) {
      setStatusMessage('يرجى اختيار الحساب البنكي وإدخال رقم كشف الحساب.');
      return;
    }
    const validLines = newStmtLines.filter((l) => l.description.trim() && l.amount !== 0);
    createStatementMutation.mutate({
      accountId: newStmtAccountId,
      statementNo: newStmtNo.trim(),
      statementDate: newStmtDate,
      startingBalance: Number(newStmtStartBal),
      endingBalance: Number(newStmtEndBal),
      notes: newStmtNotes.trim(),
      lines: validLines,
    });
  };

  const handleBatchAcceptSuggestions = async () => {
    const suggestions = workspaceQuery.data?.suggestions || [];
    if (!suggestions.length) return;
    for (const s of suggestions) {
      await matchMutation.mutateAsync({
        statementLineId: s.statementLineId,
        journalLineId: s.journalLineId,
      });
    }
    setStatusMessage(`تم اعتماد ${suggestions.length} مطابقة آلية مقترحة بنجاح.`);
  };

  // Filtered Lines in Workspace
  const filteredStatementLines = useMemo(() => {
    const lines = workspaceQuery.data?.statementLines || [];
    if (statementFilterStatus === 'pending') return lines.filter((l) => !l.isReconciled);
    if (statementFilterStatus === 'reconciled') return lines.filter((l) => l.isReconciled);
    return lines;
  }, [workspaceQuery.data?.statementLines, statementFilterStatus]);

  const filteredGlLines = useMemo(() => {
    const lines = workspaceQuery.data?.glLines || [];
    if (!glFilterText.trim()) return lines;
    const query = glFilterText.trim().toLowerCase();
    return lines.filter((l) =>
      l.description.toLowerCase().includes(query) ||
      l.entryNo.toLowerCase().includes(query) ||
      String(l.debit).includes(query) ||
      String(l.credit).includes(query)
    );
  }, [workspaceQuery.data?.glLines, glFilterText]);

  const summary = workspaceQuery.data?.summary;
  const currentStatement = workspaceQuery.data?.statement;

  return (
    <div className="page-stack page-shell bank-reconciliation-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader
          title="التسويات البنكية ومطابقة كشوف الحساب (Bank Reconciliation)"
          description="مطابقة كشوف الحسابات البنكية الواردة مع قيود وحركات الأستاذ العام وتسوية الفروقات والعمولات"
          badge={<span className="nav-pill">المحاسبة والتسويات</span>}
          actions={
            selectedStatementId !== null ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedStatementId(null);
                  setSelectedStatementLineId(null);
                  setSelectedGlLineId(null);
                }}
                style={{ fontSize: '13px', fontWeight: 700 }}
              >
                ← العودة لقائمة كشوف الحسابات
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setIsCreateModalOpen(true);
                  if (bankAccounts.length > 0 && !newStmtAccountId) {
                    setNewStmtAccountId(Number(bankAccounts[0].id));
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#170e5e',
                  borderColor: '#170e5e',
                  fontSize: '13px',
                  fontWeight: 800,
                }}
              >
                <PlusIcon size={16} />
                إضافة / استيراد كشف حساب بنكي
              </Button>
            )
          }
        />

      {/* Global Status Message */}
      {statusMessage && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e40af' }}>
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* VIEW A: STATEMENTS LIST */}
      {selectedStatementId === null ? (
        <Card title="سجل كشوف الحسابات البنكية" className="workspace-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {statementsQuery.isLoading ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>جارٍ تحميل كشوف الحسابات...</div>
            ) : !statementsQuery.data || statementsQuery.data.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 700 }}>
                  لا توجد كشوف حسابات بنكية مسجلة حالياً.
                </p>
                <p style={{ margin: '6px 0 16px', fontSize: '12px', color: '#94a3b8' }}>
                  ابدأ بإضافة أول كشف حساب بنكي لمطابقة أرصدة البنك مع دفتر الأستاذ العام.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsCreateModalOpen(true)}
                  style={{ background: '#170e5e', borderColor: '#170e5e', fontSize: '13px', fontWeight: 800 }}
                >
                  + إضافة كشف حساب بنكي
                </Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>
                      <th style={{ padding: '10px 14px', color: '#475569' }}>رقم الكشف</th>
                      <th style={{ padding: '10px 14px', color: '#475569' }}>الحساب البنكي</th>
                      <th style={{ padding: '10px 14px', color: '#475569' }}>تاريخ الكشف</th>
                      <th style={{ padding: '10px 14px', color: '#475569' }}>رصيد البداية</th>
                      <th style={{ padding: '10px 14px', color: '#475569' }}>رصيد النهاية</th>
                      <th style={{ padding: '10px 14px', color: '#475569' }}>الحالة</th>
                      <th style={{ padding: '10px 14px', color: '#475569', textAlign: 'center' }}>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementsQuery.data.map((stmt: BankStatementListItem) => (
                      <tr key={stmt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{stmt.statementNo}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{stmt.accountNameAr}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>كود: {stmt.accountCode}</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{stmt.statementDate}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{formatCurrency(stmt.startingBalance)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e' }}>{formatCurrency(stmt.endingBalance)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '11.5px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: stmt.status === 'reconciled' ? '#f0fdf4' : stmt.status === 'in_progress' ? '#eff6ff' : '#f8fafc',
                            color: stmt.status === 'reconciled' ? '#166534' : stmt.status === 'in_progress' ? '#1e40af' : '#475569',
                            border: `1px solid ${stmt.status === 'reconciled' ? '#bbf7d0' : stmt.status === 'in_progress' ? '#bfdbfe' : '#cbd5e1'}`,
                          }}>
                            {stmt.status === 'reconciled' ? 'متطابق بالكامل' : stmt.status === 'in_progress' ? 'جاري المطابقة' : 'مسودة'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setSelectedStatementId(stmt.id)}
                            style={{ borderColor: '#170e5e', color: '#170e5e', fontSize: '12px', fontWeight: 800, padding: '4px 12px' }}
                          >
                            فتح مساحة المطابقة ↵
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* VIEW B: INTERACTIVE RECONCILIATION WORKSPACE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Statement Header Card */}
          <Card className="workspace-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                    كشف حساب: {currentStatement?.statementNo} ({currentStatement?.accountNameAr})
                  </h3>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: summary?.isBalanced ? '#f0fdf4' : '#fff7ed',
                    color: summary?.isBalanced ? '#166534' : '#c2410c',
                    border: `1px solid ${summary?.isBalanced ? '#bbf7d0' : '#fed7aa'}`,
                  }}>
                    {summary?.isBalanced ? 'الحساب متطابق 100%' : `فارق غير مطابق: ${formatCurrency(summary?.difference || 0)}`}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  تاريخ الكشف: {currentStatement?.statementDate} • كود الحساب: {currentStatement?.accountCode}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void workspaceQuery.refetch()}
                  style={{ fontSize: '12px', fontWeight: 700 }}
                >
                  <RefreshCwIcon size={14} style={{ marginInlineEnd: '4px' }} />
                  تحديث
                </Button>
              </div>
            </div>

            {/* 4 Enterprise KPI Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginTop: '16px',
            }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>رصيد بداية الكشف:</span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  {formatCurrency(summary?.startingBalance || 0)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>رصيد نهاية الكشف المستهدف:</span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#170e5e', marginTop: '2px' }}>
                  {formatCurrency(summary?.endingBalance || 0)}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '11.5px', color: '#166534', fontWeight: 700 }}>إجمالي الحركات المطابقة:</span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#166534', marginTop: '2px' }}>
                  {formatCurrency(summary?.reconciledAmount || 0)}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#4ade80', marginInlineStart: '6px' }}>
                    ({summary?.reconciledLinesCount || 0} من {summary?.totalLines || 0} بنود)
                  </span>
                </div>
              </div>

              <div style={{
                background: summary?.isBalanced ? '#f0fdf4' : '#fef2f2',
                border: `1.5px solid ${summary?.isBalanced ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '10px',
                padding: '12px 16px',
              }}>
                <span style={{ fontSize: '11.5px', color: summary?.isBalanced ? '#166534' : '#991b1b', fontWeight: 700 }}>
                  {summary?.isBalanced ? 'حالة التطابق:' : 'الفارق المتبقي (Difference):'}
                </span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: summary?.isBalanced ? '#166534' : '#dc2626', marginTop: '2px' }}>
                  {summary?.isBalanced ? '0.00 ج.م (متطابق بالكامل)' : formatCurrency(summary?.difference || 0)}
                </div>
              </div>
            </div>

            {/* Smart Auto-Match Banner */}
            {(workspaceQuery.data?.suggestions || []).length > 0 && (
              <div style={{
                marginTop: '14px',
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckIcon size={18} color="#1d4ed8" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
                    اكتشف النظام الذكي {workspaceQuery.data?.suggestions.length} مطابقة آلية محتملة ذات ثقة عالية بين كشف الحساب ودفتر الأستاذ.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void handleBatchAcceptSuggestions()}
                  disabled={matchMutation.isPending}
                  style={{ background: '#1d4ed8', borderColor: '#1d4ed8', fontSize: '12px', fontWeight: 800, padding: '4px 14px' }}
                >
                  {matchMutation.isPending ? 'جارٍ الاعتماد...' : 'اعتماد جميع المطابقات المقترحة بضغطة زر'}
                </Button>
              </div>
            )}
          </Card>

          {/* Action Bar when an item is selected */}
          {(selectedStatementLineId || selectedGlLineId) && (
            <div style={{
              background: '#170e5e',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 700 }}>
                <span>العناصر المحددة للمطابقة:</span>
                <span>السطر البنكي: <strong>{selectedStatementLineId ? `#${selectedStatementLineId}` : 'لم يحدد'}</strong></span>
                <span>•</span>
                <span>قيد الأستاذ: <strong>{selectedGlLineId ? `#${selectedGlLineId}` : 'لم يحدد'}</strong></span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="button"
                  variant="success"
                  disabled={!selectedStatementLineId || !selectedGlLineId || matchMutation.isPending}
                  onClick={() => {
                    if (selectedStatementLineId && selectedGlLineId) {
                      matchMutation.mutate({ statementLineId: selectedStatementLineId, journalLineId: selectedGlLineId });
                    }
                  }}
                  style={{ fontWeight: 800, fontSize: '12.5px' }}
                >
                  تأكيد مطابقة العنصرين (Match)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSelectedStatementLineId(null);
                    setSelectedGlLineId(null);
                  }}
                  style={{ color: '#ffffff', borderColor: '#ffffff', fontSize: '12px' }}
                >
                  إلغاء التحديد
                </Button>
              </div>
            </div>
          )}

          {/* DUAL SIDE-BY-SIDE LEDGER PANELS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* RIGHT: Bank Statement Lines */}
            <Card title="حركات كشف الحساب البنكي (Bank Statement)" className="workspace-panel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Filters */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['all', 'pending', 'reconciled'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatementFilterStatus(filter)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: statementFilterStatus === filter ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                        background: statementFilterStatus === filter ? '#170e5e' : '#ffffff',
                        color: statementFilterStatus === filter ? '#ffffff' : '#475569',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {filter === 'all' ? 'الكل' : filter === 'pending' ? 'المعلق فقط' : 'المطابق'}
                    </button>
                  ))}
                </div>

                {/* Table */}
                <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                        <th style={{ padding: '8px 10px', color: '#64748b' }}>التاريخ</th>
                        <th style={{ padding: '8px 10px', color: '#64748b' }}>البيان والمرجع</th>
                        <th style={{ padding: '8px 10px', color: '#64748b' }}>المبلغ</th>
                        <th style={{ padding: '8px 10px', color: '#64748b', textAlign: 'center' }}>الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStatementLines.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>لا توجد أسطر مطابقة للمحدد</td>
                        </tr>
                      ) : (
                        filteredStatementLines.map((line) => {
                          const isSelected = selectedStatementLineId === line.id;
                          const isDeposit = line.amount > 0;

                          return (
                            <tr
                              key={line.id}
                              onClick={() => !line.isReconciled && setSelectedStatementLineId(isSelected ? null : line.id)}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: isSelected ? '#eff6ff' : line.isReconciled ? '#f0fdf4' : '#ffffff',
                                cursor: line.isReconciled ? 'default' : 'pointer',
                              }}
                            >
                              <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{line.lineDate}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{line.description}</div>
                                {line.reference && <div style={{ fontSize: '11px', color: '#64748b' }}>مرجع: {line.reference}</div>}
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 800, color: isDeposit ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                                {isDeposit ? `+${formatCurrency(line.amount)}` : formatCurrency(line.amount)}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {line.isReconciled ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '10.5px', color: '#166534', fontWeight: 800 }}>مطابق</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        unmatchMutation.mutate(line.id);
                                      }}
                                      title="إلغاء المطابقة"
                                      style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                                    >
                                      <XIcon size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    <button
                                      type="button"
                                      style={{
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        border: isSelected ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                                        background: isSelected ? '#170e5e' : '#ffffff',
                                        color: isSelected ? '#ffffff' : '#0f172a',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {isSelected ? 'محدد' : 'تحديد'}
                                    </button>
                                    {!isDeposit && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFeeTargetLine(line);
                                          if (expenseAccounts.length > 0 && !selectedExpenseAccountId) {
                                            setSelectedExpenseAccountId(Number(expenseAccounts[0].id));
                                          }
                                          setIsFeeModalOpen(true);
                                        }}
                                        title="تسوية عمولة ومصاريف بنكية فورية"
                                        style={{
                                          padding: '3px 6px',
                                          borderRadius: '4px',
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          border: '1px solid #fca5a5',
                                          background: '#fef2f2',
                                          color: '#b91c1c',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        عمولة
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* LEFT: General Ledger Journal Lines */}
            <Card title="حركات دفتر الأستاذ العام (General Ledger)" className="workspace-panel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="بحث برقم القيد أو البيان أو المبلغ..."
                    value={glFilterText}
                    onChange={(e) => setGlFilterText(e.target.value)}
                    style={{ width: '100%', padding: '6px 30px 6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                  <div style={{ position: 'absolute', right: '8px', top: '8px', color: '#94a3b8' }}>
                    <SearchIcon size={14} />
                  </div>
                </div>

                {/* Table */}
                <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                        <th style={{ padding: '8px 10px', color: '#64748b' }}>التاريخ والقيد</th>
                        <th style={{ padding: '8px 10px', color: '#64748b' }}>البيان</th>
                        <th style={{ padding: '8px 10px', color: '#64748b' }}>مدين (+)</th>
                        <th style={{ padding: '8px 10px', color: '#64748b' }}>دائن (-)</th>
                        <th style={{ padding: '8px 10px', color: '#64748b', textAlign: 'center' }}>الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGlLines.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>لا توجد قيود معلقة في دفتر الأستاذ لهذا الحساب</td>
                        </tr>
                      ) : (
                        filteredGlLines.map((gl) => {
                          const isSelected = selectedGlLineId === gl.id;

                          return (
                            <tr
                              key={gl.id}
                              onClick={() => setSelectedGlLineId(isSelected ? null : gl.id)}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: isSelected ? '#eff6ff' : '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 800, color: '#170e5e' }}>{gl.entryNo}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{gl.entryDate}</div>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ color: '#0f172a', fontWeight: 600 }}>{gl.description || 'قيد مرحل'}</div>
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: gl.debit > 0 ? '#16a34a' : '#94a3b8', whiteSpace: 'nowrap' }}>
                                {gl.debit > 0 ? formatCurrency(gl.debit) : '-'}
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: gl.credit > 0 ? '#dc2626' : '#94a3b8', whiteSpace: 'nowrap' }}>
                                {gl.credit > 0 ? formatCurrency(gl.credit) : '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    border: isSelected ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                                    background: isSelected ? '#170e5e' : '#ffffff',
                                    color: isSelected ? '#ffffff' : '#0f172a',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isSelected ? 'محدد' : 'تحديد'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / IMPORT STATEMENT */}
      {isCreateModalOpen && (
        <DialogShell
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          width="820px"
          zIndex={95}
          ariaLabel="إضافة كشف حساب بنكي"
        >
          <Card title="إضافة كشف حساب بنكي جديد" className="dialog-card">
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>الحساب البنكي:</label>
                  <select
                    value={newStmtAccountId}
                    onChange={(e) => setNewStmtAccountId(Number(e.target.value))}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  >
                    <option value={0}>اختر الحساب البنكي...</option>
                    {bankAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رقم كشف الحساب:</label>
                  <input
                    type="text"
                    placeholder="مثال: STMT-2026-001"
                    value={newStmtNo}
                    onChange={(e) => setNewStmtNo(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>تاريخ كشف الحساب:</label>
                  <input
                    type="date"
                    value={newStmtDate}
                    onChange={(e) => setNewStmtDate(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>ملاحظات:</label>
                  <input
                    type="text"
                    placeholder="ملاحظات اختيارية..."
                    value={newStmtNotes}
                    onChange={(e) => setNewStmtNotes(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رصيد البداية (Starting Balance):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newStmtStartBal}
                    onChange={(e) => setNewStmtStartBal(Number(e.target.value))}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رصيد النهاية المطلوب (Ending Balance):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newStmtEndBal}
                    onChange={(e) => setNewStmtEndBal(Number(e.target.value))}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Lines */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>أسطر الحركات في كشف الحساب:</strong>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setNewStmtLines((prev) => [...prev, { lineDate: newStmtDate, description: '', reference: '', amount: 0 }])}
                    style={{ fontSize: '11.5px', padding: '3px 10px' }}
                  >
                    + إضافة سطر حركة
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {newStmtLines.map((line, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 110px 30px', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="date"
                        value={line.lineDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewStmtLines((prev) => prev.map((l, i) => i === idx ? { ...l, lineDate: val } : l));
                        }}
                        style={{ padding: '5px', fontSize: '11.5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="text"
                        placeholder="البيان (مثال: تحويل عميل / مصاريف بنكية)"
                        value={line.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewStmtLines((prev) => prev.map((l, i) => i === idx ? { ...l, description: val } : l));
                        }}
                        style={{ padding: '5px', fontSize: '11.5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="text"
                        placeholder="رقم المرجع"
                        value={line.reference}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewStmtLines((prev) => prev.map((l, i) => i === idx ? { ...l, reference: val } : l));
                        }}
                        style={{ padding: '5px', fontSize: '11.5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="المبلغ (+ أو -)"
                        value={line.amount || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewStmtLines((prev) => prev.map((l, i) => i === idx ? { ...l, amount: val } : l));
                        }}
                        style={{ padding: '5px', fontSize: '11.5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <button
                        type="button"
                        onClick={() => setNewStmtLines((prev) => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createStatementMutation.isPending}
                  style={{ background: '#170e5e', borderColor: '#170e5e', fontWeight: 800 }}
                >
                  {createStatementMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ كشف الحساب'}
                </Button>
              </div>
            </form>
          </Card>
        </DialogShell>
      )}

      {/* MODAL 2: BANK FEE ADJUSTMENT */}
      {isFeeModalOpen && feeTargetLine && (
        <DialogShell
          open={isFeeModalOpen}
          onClose={() => setIsFeeModalOpen(false)}
          width="500px"
          zIndex={95}
          ariaLabel="تسوية عمولة ومصاريف بنكية"
        >
          <Card title="تسوية عمولة ومصاريف بنكية فورية" className="dialog-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <div>البيان: <strong>{feeTargetLine.description}</strong></div>
                <div style={{ marginTop: '4px' }}>
                  قيمة العمولة المخصومة: <strong style={{ color: '#dc2626' }}>{formatCurrency(Math.abs(feeTargetLine.amount))}</strong>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  حساب المصروفات البنكية (شجرة الحسابات):
                </label>
                <select
                  value={selectedExpenseAccountId}
                  onChange={(e) => setSelectedExpenseAccountId(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {expenseAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>
                  ))}
                </select>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                  سيتم إنشاء قيد يومية متزن آلياً (من ح/ مصاريف بنكية إلى ح/ البنك) ومطابقة الحركة فورياً.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <Button type="button" variant="secondary" onClick={() => setIsFeeModalOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={feeAdjustmentMutation.isPending || !selectedExpenseAccountId}
                  onClick={() => {
                    feeAdjustmentMutation.mutate({
                      statementLineId: feeTargetLine.id,
                      expenseAccountId: selectedExpenseAccountId,
                    });
                  }}
                  style={{ background: '#170e5e', borderColor: '#170e5e', fontWeight: 800 }}
                >
                  {feeAdjustmentMutation.isPending ? 'جارٍ التسوية...' : 'إنشاء القيد ومطابقة السطر'}
                </Button>
              </div>
            </div>
          </Card>
        </DialogShell>
      )}
      </main>
    </div>
  );
}
