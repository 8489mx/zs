import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { DialogShell } from '@/shared/components/dialog-shell';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { FilterChipGroup } from '@/shared/components/filter-chip-group';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { StatsGrid } from '@/shared/components/stats-grid';
import { formatCurrency, formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import type { ServiceRecord } from '@/types/domain';
import { ServiceFormCard, type ServiceSuggestionOption } from '@/features/services/components/ServiceFormCard';
import { ServicePresetDialog } from '@/features/services/components/ServicePresetDialog';
import { useDeleteServiceMutation } from '@/features/services/hooks/useServiceMutations';
import { useServicesPage } from '@/features/services/hooks/useServicesPage';
import { useServicesPageActions } from '@/features/services/hooks/useServicesPageActions';
import { serviceFilterOptions, type PresetServiceDraft, type ServiceCatalogItem, type ServicePresetKey } from '@/features/services/lib/services-page.constants';
import { buildPresetDrafts, formatServicePaymentChannel, normalizeServiceName, printServiceReceipt, readServicesCatalog, writeServicesCatalog } from '@/features/services/lib/services-page.helpers';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

export function ServicesPage() {
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'today' | 'high' | 'notes'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState<ServicePresetKey>('computer');
  const [presetDrafts, setPresetDrafts] = useState<PresetServiceDraft[]>(() => buildPresetDrafts('computer'));
  const [selectedDraftIds, setSelectedDraftIds] = useState<Record<string, boolean>>(() => (
    Object.fromEntries(buildPresetDrafts('computer').map((service) => [service.id, true]))
  ));
  const [showCustomDraftInputs, setShowCustomDraftInputs] = useState(false);
  const [customDraftName, setCustomDraftName] = useState('');
  const [customDraftAmount, setCustomDraftAmount] = useState('');
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogItem[]>(() => readServicesCatalog());
  const [presetMessage, setPresetMessage] = useState('');
  const [presetMessageTone, setPresetMessageTone] = useState<'success' | 'error'>('success');
  const [isPresetSavePending, setIsPresetSavePending] = useState(false);
  const [isCustomNameFocused, setIsCustomNameFocused] = useState(false);
  const [pageNotice, setPageNotice] = useState('');
  const [pageNoticeTone, setPageNoticeTone] = useState<'success' | 'error'>('success');

  const customServiceNameInputRef = useRef<HTMLInputElement | null>(null);
  const query = useServicesPage({ page, pageSize, search, filter: viewFilter });
  const settingsQuery = useSettingsQuery();
  const deleteMutation = useDeleteServiceMutation(() => {
    setSelectedService(null);
    setServiceToDelete(null);
  });
  const { exportServices, printServices } = useServicesPageActions({ search, filter: viewFilter });

  const rows = useMemo(() => query.data?.services || [], [query.data?.services]);
  const summary = query.data?.summary;
  const insights = useMemo(() => ({
    totalItems: Number(summary?.totalItems || 0),
    totalAmount: Number(summary?.totalAmount || 0),
    cashAmount: Number(summary?.cashAmount || 0),
    cardAmount: Number(summary?.cardAmount || 0),
    todayCount: Number(summary?.todayCount || 0),
    averageAmount: Number(summary?.averageAmount || 0),
    highestAmount: Number(summary?.highestAmount || 0),
    latestServiceName: summary?.latestServiceName || '—',
    latestCreatedByName: summary?.latestCreatedByName || '—',
  }), [summary]);
  const stats = [
    { key: 'count', label: 'عدد الخدمات', value: insights.totalItems },
    { key: 'amount', label: 'إجمالي القيمة', value: formatCurrency(insights.totalAmount) },
    { key: 'cash', label: 'خدمات نقدي', value: formatCurrency(insights.cashAmount) },
    { key: 'card', label: 'خدمات فيزا', value: formatCurrency(insights.cardAmount) },
    { key: 'today', label: 'خدمات اليوم', value: insights.todayCount },
    { key: 'avg', label: 'متوسط الخدمة', value: formatCurrency(insights.averageAmount) },
  ] as const;
  const selectedDrafts = useMemo(() => presetDrafts.filter((item) => selectedDraftIds[item.id]), [presetDrafts, selectedDraftIds]);
  const serviceSuggestionOptions = useMemo<ServiceSuggestionOption[]>(
    () => serviceCatalog.map((item) => ({ name: item.name, defaultAmount: item.defaultAmount ?? null })),
    [serviceCatalog],
  );

  useEffect(() => {
    if (selectedService && !rows.some((row) => String(row.id) === String(selectedService.id))) setSelectedService(null);
  }, [rows, selectedService]);
  useEffect(() => {
    if (!showCustomDraftInputs) return;
    requestAnimationFrame(() => customServiceNameInputRef.current?.focus());
  }, [showCustomDraftInputs]);
  useEffect(() => writeServicesCatalog(serviceCatalog), [serviceCatalog]);

  function openServiceFormForCreate() {
    setSelectedService(null);
    setIsCreateOpen(true);
  }

  function openPresetDialog() {
    setPresetMessage('');
    setPresetMessageTone('success');
    setPageNotice('');
    setIsPresetDialogOpen(true);
  }

  const closePresetDialog = useCallback(() => {
    if (isPresetSavePending) return;
    setIsPresetDialogOpen(false);
    setPresetMessage('');
    setShowCustomDraftInputs(false);
    setCustomDraftName('');
    setCustomDraftAmount('');
    setIsCustomNameFocused(false);
  }, [isPresetSavePending]);

  function handlePresetSelection(nextPresetKey: ServicePresetKey) {
    const nextDrafts = buildPresetDrafts(nextPresetKey);
    setSelectedPresetKey(nextPresetKey);
    setPresetDrafts(nextDrafts);
    setSelectedDraftIds(Object.fromEntries(nextDrafts.map((service) => [service.id, true])));
    setPresetMessage('');
    setShowCustomDraftInputs(nextPresetKey === 'manual');
  }

  function addCustomDraftService() {
    const name = customDraftName.trim();
    if (!name) {
      setPresetMessage('اكتب اسم الخدمة أولًا.');
      setPresetMessageTone('error');
      return;
    }
    const normalizedName = normalizeServiceName(name);
    if (presetDrafts.some((service) => normalizeServiceName(service.name) === normalizedName)) {
      setPresetMessage('الخدمة موجودة بالفعل.');
      setPresetMessageTone('error');
      return;
    }
    const id = `custom-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    setPresetDrafts((current) => [...current, { id, name, amountInput: customDraftAmount.trim() }]);
    setSelectedDraftIds((current) => ({ ...current, [id]: true }));
    setCustomDraftName('');
    setCustomDraftAmount('');
    setPresetMessage('');
    setPresetMessageTone('success');
    requestAnimationFrame(() => customServiceNameInputRef.current?.focus());
  }

  async function savePresetServices() {
    if (!selectedDrafts.length) {
      setPresetMessage('لا توجد خدمات مختارة للحفظ.');
      setPresetMessageTone('error');
      return;
    }
    setIsPresetSavePending(true);
    setPresetMessage('');
    try {
      const existingByName = new Map(serviceCatalog.map((item) => [normalizeServiceName(item.name), item] as const));
      const seen = new Set<string>();
      const nextCatalog = [...serviceCatalog];
      selectedDrafts.forEach((item) => {
        const normalized = normalizeServiceName(item.name);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        const parsedAmount = item.amountInput.trim() === '' ? null : Number(item.amountInput);
        const defaultAmount = typeof parsedAmount === 'number' && Number.isFinite(parsedAmount) ? parsedAmount : null;
        const nextItem = { name: item.name.trim(), defaultAmount };
        const existingIndex = existingByName.has(normalized) ? nextCatalog.findIndex((entry) => normalizeServiceName(entry.name) === normalized) : -1;
        if (existingIndex !== -1) nextCatalog[existingIndex] = nextItem;
        else nextCatalog.push(nextItem);
      });
      setServiceCatalog(nextCatalog);
      setPresetMessage('تم حفظ تخصيص الخدمات بنجاح.');
      setPresetMessageTone('success');
      setPageNotice('تم حفظ تخصيص الخدمات بنجاح.');
      setPageNoticeTone('success');
      setIsPresetDialogOpen(false);
    } catch (error) {
      const message = getErrorMessage(error, 'تعذر حفظ التخصيص.');
      setPresetMessage(message);
      setPresetMessageTone('error');
      setPageNotice(message);
      setPageNoticeTone('error');
    } finally {
      setIsPresetSavePending(false);
    }
  }

  const emptyServicesActions = (
    <div className="actions compact-actions" style={{ justifyContent: 'center' }}>
      <Button type="button" variant="secondary" onClick={openPresetDialog}>تخصيص الخدمات</Button>
      <Button type="button" onClick={openServiceFormForCreate}>إضافة خدمة جديدة</Button>
    </div>
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="page-stack page-shell services-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
      <PageHeader
        title="الخدمات"
        description="أضف خدمات نشاطك وحدد أسعارها لتظهر في الكاشير عند الحاجة."
        badge={<span className="nav-pill">الخدمات</span>}
        actions={
          <div className="actions compact-actions">
            <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)}>+ خدمة جديدة</Button>
            <Button type="button" variant="secondary" onClick={openPresetDialog}>تخصيص</Button>
            <Button type="button" variant="secondary" onClick={() => void exportServices()} disabled={!insights.totalItems}>تصدير</Button>
            <Button type="button" variant="secondary" onClick={() => void printServices()} disabled={!insights.totalItems}>طباعة</Button>
          </div>
        }
      />
      <StatsGrid items={stats} className="stats-grid compact-grid grid-cols-3" />
      {pageNotice ? <div className={`notice-banner ${pageNoticeTone === 'error' ? 'is-error' : 'is-success'}`}>{pageNotice}</div> : null}

      <section className="document-prototype-section">
        <div className="section-header-compact-row">
          <h3 className="document-prototype-section-title">سجل الخدمات</h3>
          <div className="section-header-actions-group">
            <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="section-header-action-btn">
              + خدمة جديدة
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setSearch(''); setViewFilter('all'); setSelectedService(null); setPage(1); }} className="section-header-action-btn">
              إلغاء الفلاتر
            </Button>
          </div>
        </div>

        <SearchToolbar
          title="بحث وتصفية"
          actions={<span className="nav-pill">{viewFilter === 'all' ? 'كل الخدمات' : viewFilter === 'today' ? 'اليوم' : viewFilter === 'high' ? 'الأعلى قيمة' : 'بملاحظات'}</span>}
          search={search}
          onSearchChange={(value) => { setSearch(value); setPage(1); }}
          searchPlaceholder="ابحث باسم الخدمة أو الملاحظات أو المنفذ"
          onReset={() => { setSearch(''); setViewFilter('all'); setSelectedService(null); setPage(1); }}
          resetLabel="تفريغ"
        >
          <FilterChipGroup value={viewFilter} options={serviceFilterOptions} onChange={(value) => { setViewFilter(value); setPage(1); }} className="filter-chip-row services-filter-row" />
        </SearchToolbar>
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!insights.totalItems}
          loadingText="جاري تحميل الخدمات..."
          errorTitle="تعذر تحميل الخدمات"
          emptyTitle="لا توجد خدمات مسجلة حاليًا."
          emptyHint="ابدأ بتخصيص خدمات نشاطك أو أضف خدمة جديدة يدويًا."
          emptyAction={emptyServicesActions}
        >
          <DataTable<ServiceRecord>
            rows={rows}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => setSelectedService(row)}
            rowClassName={(row) => (selectedService?.id === row.id ? 'table-row-selected' : undefined)}
            columns={[
              { key: 'name', header: 'الخدمة', cell: (row) => row.name },
              { key: 'amount', header: 'القيمة', cell: (row) => formatCurrency(row.amount) },
              { key: 'payment', header: 'التحصيل', cell: (row) => formatServicePaymentChannel(row.paymentChannel) },
              { key: 'notes', header: 'ملاحظات', cell: (row) => row.notes || '—' },
              { key: 'user', header: 'المنفذ', cell: (row) => row.createdByName || '—' },
              { key: 'date', header: 'التاريخ', cell: (row) => formatDate(row.serviceDate) },
              { key: 'actions', header: 'إجراءات', cell: (row) => <div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}><Button type="button" variant="secondary" onClick={() => printServiceReceipt(row, settingsQuery.data)}>طباعة</Button><Button type="button" variant="secondary" onClick={() => setSelectedService(row)}>تعديل</Button><Button type="button" variant="danger" onClick={() => setServiceToDelete(row)}>حذف</Button></div> },
            ]}
            pagination={{ page, pageSize, totalItems: insights.totalItems || rows.length, onPageChange: setPage, onPageSizeChange: (next) => { setPageSize(next); setPage(1); }, itemLabel: 'خدمة' }}
          />
        </QueryFeedback>
      </section>

      {/* Modal for Creating Service */}
      <DialogShell
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        width="min(680px, 95vw)"
        ariaLabel="إضافة خدمة جديدة"
        showCloseButton={true}
      >
        <div className="dialog-card">
          <div className="mb-4 border-b pb-3">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">إضافة خدمة جديدة</h3>
            <p className="text-xs text-muted-foreground mt-1">أضف خدمة يقدمها نشاطك وحدد سعرها لتظهر في الكاشير عند الحاجة.</p>
          </div>
          <ServiceFormCard onSaved={() => setIsCreateOpen(false)} suggestions={serviceSuggestionOptions} />
        </div>
      </DialogShell>

      {/* Modal for Editing Service */}
      <DialogShell
        open={Boolean(selectedService)}
        onClose={() => setSelectedService(null)}
        width="min(680px, 95vw)"
        ariaLabel="تعديل الخدمة"
        showCloseButton={true}
      >
        <div className="dialog-card">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">تعديل: {selectedService?.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">تعديل بيانات الخدمة أو حذفها.</p>
            </div>
            {selectedService && (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setServiceToDelete(selectedService);
                  setSelectedService(null);
                }}
              >
                حذف الخدمة
              </Button>
            )}
          </div>
          <ServiceFormCard service={selectedService || undefined} onSaved={() => setSelectedService(null)} suggestions={serviceSuggestionOptions} />
        </div>
      </DialogShell>

      <ServicePresetDialog
        open={isPresetDialogOpen}
        selectedPresetKey={selectedPresetKey}
        presetDrafts={presetDrafts}
        selectedDraftIds={selectedDraftIds}
        selectedDraftCount={selectedDrafts.length}
        showCustomDraftInputs={showCustomDraftInputs}
        customDraftName={customDraftName}
        customDraftAmount={customDraftAmount}
        isCustomNameFocused={isCustomNameFocused}
        isPresetSavePending={isPresetSavePending}
        presetMessage={presetMessage}
        presetMessageTone={presetMessageTone}
        customServiceNameInputRef={customServiceNameInputRef}
        onClose={closePresetDialog}
        onPresetSelection={handlePresetSelection}
        onToggleDraftSelection={(id) => setSelectedDraftIds((current) => ({ ...current, [id]: !current[id] }))}
        onDraftAmountChange={(id, value) => setPresetDrafts((current) => current.map((entry) => (entry.id === id ? { ...entry, amountInput: value } : entry)))}
        onToggleCustomDraftInputs={() => setShowCustomDraftInputs((current) => !current)}
        onCustomDraftNameChange={setCustomDraftName}
        onCustomDraftAmountChange={setCustomDraftAmount}
        onCustomNameFocusChange={setIsCustomNameFocused}
        onAddCustomDraftService={addCustomDraftService}
        onSavePresetServices={() => void savePresetServices()}
      />
      <ActionConfirmDialog
        open={Boolean(serviceToDelete)}
        title="تأكيد حذف الخدمة"
        description={serviceToDelete ? `سيتم حذف الخدمة ${serviceToDelete.name}.` : ''}
        confirmLabel="نعم، حذف الخدمة"
        isBusy={deleteMutation.isPending}
        onCancel={() => setServiceToDelete(null)}
        onConfirm={async () => { if (serviceToDelete) await deleteMutation.mutateAsync(serviceToDelete.id); }}
      />
      </main>
    </div>
  );
}
