import { useEffect, useMemo, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { invalidateReturnsDomain } from '@/app/query-invalidation';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { returnsApi } from '@/features/returns/api/returns.api';
import { useReturnsPage } from '@/features/returns/hooks/useReturnsPage';
import { catalogApi } from '@/lib/api/catalog';
import { ReturnsSelectedInvoiceCard } from '@/features/returns/components/ReturnsSelectedInvoiceCard';
import { ReturnsSelectedReturnCard } from '@/features/returns/components/ReturnsSelectedReturnCard';
import { ReturnsWorkspaceHeader } from '@/features/returns/components/ReturnsWorkspaceHeader';
import { ReturnsCreateCard } from '@/features/returns/components/ReturnsCreateCard';
import { ReturnsRegisterCard } from '@/features/returns/components/ReturnsRegisterCard';
import {
  createEmptyReturnForm,
  exportReturnsCsv,
  getReturnDateValue,
  printReturnRecord,
  printReturnsRegister,
  ReturnFormState,
  returnTypeLabel,
} from '@/features/returns/lib/returns-workspace.helpers';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Purchase, PurchaseItem, Sale, SaleItem } from '@/types/domain';

export function ReturnsWorkspace() {
  const location = useLocation();
  const isPurchaseMode = location.pathname.includes('purchase-returns');

  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'sales' | 'purchase' | 'today'>(isPurchaseMode ? 'purchase' : 'all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [selectedReturnId, setSelectedReturnId] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [form, setForm] = useState<ReturnFormState>(() => {
    const defaultForm = createEmptyReturnForm();
    if (isPurchaseMode) {
      defaultForm.type = 'purchase';
    }
    return defaultForm;
  });
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const detailsRef = useRef<HTMLDivElement>(null);

  const query = useReturnsPage({ page, pageSize, search, filter: viewFilter, employee: employeeFilter });
  const salesQuery = useQuery({ queryKey: ['sales'], queryFn: catalogApi.listSales });
  const purchasesQuery = useQuery({ queryKey: ['purchases'], queryFn: catalogApi.listPurchases });
  const queryClient = useQueryClient();

  const invoiceRows = useMemo(() => (
    form.type === 'sale'
      ? (salesQuery.data || []).filter((sale) => sale.status === 'posted')
      : (purchasesQuery.data || []).filter((purchase) => purchase.status === 'posted')
  ), [form.type, purchasesQuery.data, salesQuery.data]);

  const selectedInvoice = invoiceRows.find((row) => String(row.id) === String(form.invoiceId)) as Sale | Purchase | undefined;
  const rows = useMemo(() => query.data?.returns || [], [query.data?.returns]);
  const invoiceItems = useMemo(() => (selectedInvoice?.items || []) as Array<SaleItem | PurchaseItem>, [selectedInvoice?.items]);
  const returnedQtyByProduct = useMemo(() => {
    if (!selectedInvoice) return {};
    const selectedInvoiceId = String(selectedInvoice.id);
    const selectedType = form.type;
    return rows
      .filter((row) => String(row.invoiceId || '') === selectedInvoiceId && String(row.returnType || 'sale') === selectedType)
      .reduce<Record<string, number>>((acc, row) => {
        const productId = String(row.productId || '');
        if (!productId) return acc;
        acc[productId] = Number(acc[productId] || 0) + Number(row.qty || 0);
        return acc;
      }, {});
  }, [form.type, rows, selectedInvoice]);
  const settlementNeedsRefundMethod = form.settlementMode === 'refund';
  const canUseCreditSettlement = form.type === 'sale' && Boolean(selectedInvoice && 'customerId' in selectedInvoice && selectedInvoice.customerId);

  const selectedReturnItems = useMemo(() => invoiceItems
    .map((item) => {
      const lineId = String(item.id || item.productId || '');
      const qty = Number(selectedItems[lineId] || 0);
      const baseQty = Number(item.qty || 0);
      const lineTotal = qty > 0 ? qty * (baseQty > 0 ? Number(item.total || 0) / baseQty : 0) : 0;
      return { item, qty, lineTotal };
    })
    .filter((entry) => entry.qty > 0), [invoiceItems, selectedItems]);

  const selectedItemsCount = selectedReturnItems.length;
  const selectedQtyTotal = selectedReturnItems.reduce((sum, entry) => sum + Number(entry.qty || 0), 0);
  const expectedReturnValue = selectedReturnItems.reduce((sum, entry) => sum + Number(entry.lineTotal || 0), 0);

  const summary = query.data?.summary;
  const salesReturns = Number(summary?.salesReturns || 0);
  const purchaseReturns = Number(summary?.purchaseReturns || 0);
  const total = Number(summary?.totalAmount || 0);
  const selectedReturn = rows.find((row) => String(row.id) === String(selectedReturnId)) || rows[0] || null;

  useEffect(() => {
    if (selectedReturnId && !rows.some((row) => String(row.id) === String(selectedReturnId))) {
      setSelectedReturnId('');
      setPage(1);
    }
  }, [rows, selectedReturnId]);

  useEffect(() => {
    setViewFilter(isPurchaseMode ? 'purchase' : 'all');
    setForm(current => {
      const nextType = isPurchaseMode ? 'purchase' : 'sale';
      if (current.type !== nextType) {
        return { ...createEmptyReturnForm(), type: nextType };
      }
      return current;
    });
    setSelectedItems({});
  }, [isPurchaseMode]);

  const createMutation = useMutation({
    mutationFn: ({ managerPin, reason }: { managerPin: string; reason: string }) => returnsApi.create({
      type: form.type,
      invoiceId: form.invoiceId,
      items: selectedReturnItems.map(({ item, qty }) => ({ 
        productId: Number(item.productId || 0), 
        productName: item.name, 
        qty,
        saleItemId: form.type === 'sale' ? Number(item.id || 0) : undefined,
        purchaseItemId: form.type === 'purchase' ? Number(item.id || 0) : undefined,
      })),
      settlementMode: form.settlementMode,
      refundMethod: form.refundMethod,
      note: [reason.trim(), String(form.note || '').trim()].filter(Boolean).join(' — '),
      managerPin
    }),
    onSuccess: async () => {
      await invalidateReturnsDomain(queryClient);
      setForm(createEmptyReturnForm());
      setSelectedItems({});
      setConfirmReturn(false);
    }
  });

  const resetReturnsView = () => {
    setSearch('');
    setViewFilter('all');
    setEmployeeFilter('');
    setSelectedReturnId('');
    setPage(1);
  };

  const resetReturnForm = () => {
    setForm(createEmptyReturnForm());
    setSelectedItems({});
  };

  const updateForm = (updater: (current: ReturnFormState) => ReturnFormState) => {
    setForm((current) => {
      const next = updater(current);
      if (next.type !== current.type || next.invoiceId !== current.invoiceId) {
        setSelectedItems({});
      }
      return next;
    });
  };

  const toggleItem = (itemId: string, checked: boolean) => {
    setSelectedItems((current) => {
      const next = { ...current };
      if (!checked) {
        delete next[itemId];
        return next;
      }
      next[itemId] = next[itemId] || '1';
      return next;
    });
  };

  const setItemQty = (itemId: string, value: string) => {
    const invoiceItem = invoiceItems.find((item) => String(item.id || item.productId || '') === String(itemId));
    if (!invoiceItem) return;
    const productId = String(invoiceItem.productId || '');
    const alreadyReturnedQty = Number(returnedQtyByProduct[productId] || 0);
    const remainingQty = Math.max(0, Number(invoiceItem.qty || 0) - alreadyReturnedQty);
    const requestedQty = Number(value || 0);
    if (requestedQty > remainingQty) {
      setSelectedItems((current) => ({ ...current, [itemId]: String(remainingQty) }));
      return;
    }
    setSelectedItems((current) => ({ ...current, [itemId]: value }));
  };

  const copyReturnsSummary = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const lines = [
      'ملخص المرتجعات',
      `إجمالي المرتجعات المطابقة: ${summary?.totalItems || 0}`,
      `مرتجع بيع: ${salesReturns}`,
      `مرتجع شراء: ${purchaseReturns}`,
      `الإجمالي: ${formatCurrency(total)}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyFeedback({ kind: 'success', text: 'تم نسخ ملخص المرتجعات.' });
    } catch {
      setCopyFeedback({ kind: 'error', text: 'تعذر نسخ ملخص المرتجعات.' });
    }
  };

  const copySelectedReturn = async () => {
    if (!selectedReturn || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const lines = [
      `المستند: ${selectedReturn.docNo || selectedReturn.id}`,
      `النوع: ${returnTypeLabel(selectedReturn)}`,
      `الصنف: ${selectedReturn.productName || '—'}`,
      `الكمية: ${selectedReturn.qty || 0}`,
      `الإجمالي: ${formatCurrency(Number(selectedReturn.total || 0))}`,
      `التاريخ: ${formatDate(getReturnDateValue(selectedReturn))}`,
      `الملاحظات: ${selectedReturn.note || '—'}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyFeedback({ kind: 'success', text: 'تم نسخ تفاصيل المرتجع المحدد.' });
    } catch {
      setCopyFeedback({ kind: 'error', text: 'تعذر نسخ تفاصيل المرتجع المحدد.' });
    }
  };

  const printReturns = async () => {
    const payload = await returnsApi.listAll({ search, filter: viewFilter, employee: employeeFilter });
    printReturnsRegister(payload.returns || [], { totalItems: payload.summary?.totalItems, totalAmount: payload.summary?.totalAmount });
  };

  const handleRegisterSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (value: 'all' | 'sales' | 'purchase' | 'today') => {
    setViewFilter(value);
    setPage(1);
  };

  return (
    <div className="page-stack page-shell returns-workspace" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <ReturnsWorkspaceHeader
        totalItems={summary?.totalItems || 0}
        salesReturns={salesReturns}
        purchaseReturns={purchaseReturns}
        copyFeedback={copyFeedback}
        onReset={resetReturnsView}
        onCopySummary={copyReturnsSummary}
        onExportCsv={() => exportReturnsCsv({ search, filter: viewFilter })}
        onPrint={printReturns}
      />

      <ReturnsRegisterCard
        search={search}
        viewFilter={viewFilter}
        page={page}
        pageSize={pageSize}
        rows={rows}
        totalItems={summary?.totalItems || rows.length}
        selectedReturnId={selectedReturn ? String(selectedReturn.id) : ''}
        isLoading={query.isLoading}
        onSearchChange={handleRegisterSearchChange}
        onReset={resetReturnsView}
        onFilterChange={handleFilterChange}
        employeeFilter={employeeFilter}
        onEmployeeFilterChange={(value) => { setEmployeeFilter(value); setPage(1); }}
        onSelectReturn={(id) => {
          setSelectedReturnId(id);
          setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }}
        onPrintReturn={printReturnRecord}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

        <ReturnsCreateCard
          form={form}
          invoiceRows={invoiceRows}
          selectedInvoice={selectedInvoice}
          invoiceItems={invoiceItems}
          selectedItems={selectedItems}
          selectedItemsCount={selectedItemsCount}
          canUseCreditSettlement={canUseCreditSettlement}
          settlementNeedsRefundMethod={settlementNeedsRefundMethod}
          isBusy={createMutation.isPending}
          isError={createMutation.isError}
          isSuccess={createMutation.isSuccess}
          error={createMutation.error}
          onFormChange={updateForm}
          onResetForm={resetReturnForm}
          onToggleItem={toggleItem}
          onSetItemQty={setItemQty}
          onOpenConfirm={() => setConfirmReturn(true)}
          returnedQtyByProduct={returnedQtyByProduct}
        />
        <ReturnsSelectedInvoiceCard
            selectedInvoice={selectedInvoice}
            selectedItemsCount={selectedItemsCount}
            selectedQtyTotal={selectedQtyTotal}
            expectedReturnValue={expectedReturnValue}
          />

        <div ref={detailsRef}>
          <ReturnsSelectedReturnCard
            selectedReturn={selectedReturn}
            onPrint={() => selectedReturn ? printReturnRecord(selectedReturn) : undefined}
            onCopy={() => void copySelectedReturn()}
          />
        </div>
      </main>

      <ActionConfirmDialog
        open={confirmReturn}
        title={form.type === 'sale' ? 'تأكيد مرتجع البيع' : 'تأكيد مرتجع الشراء'}
        description={selectedInvoice ? `سيتم إنشاء مرتجع على الفاتورة ${selectedInvoice.docNo || selectedInvoice.id} بعدد ${selectedItemsCount} بند بقيمة متوقعة ${formatCurrency(expectedReturnValue)}.` : 'راجع البيانات قبل حفظ المرتجع.'}
        confirmLabel={form.type === 'sale' ? 'تسجيل مرتجع البيع' : 'تسجيل مرتجع الشراء'}
        confirmVariant="danger"
        managerPinRequired
        managerPinLabel="كلمة مرور المستخدم"
        managerPinHint="أدخل كلمة مرور المستخدم الحالي لتأكيد العملية."
        reasonRequired
        reasonLabel="سبب المرتجع"
        reasonPlaceholder="اكتب سبب المرتجع"
        reasonHint="هذا السبب سيظهر في السجل ويُستخدم للمراجعة لاحقًا."
        minReasonLength={1}
        isBusy={createMutation.isPending}
        onCancel={() => setConfirmReturn(false)}
        onConfirm={({ managerPin, reason }) => void createMutation.mutate({ managerPin, reason })}
      />
    </div>
  );
}
