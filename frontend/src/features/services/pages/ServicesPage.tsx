import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { FilterChipGroup } from '@/shared/components/filter-chip-group';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { StatsGrid } from '@/shared/components/stats-grid';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatCurrency, formatDate } from '@/lib/format';
import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { getErrorMessage } from '@/lib/errors';
import type { ServiceRecord } from '@/types/domain';
import { ServiceFormCard, type ServiceSuggestionOption } from '@/features/services/components/ServiceFormCard';
import { useDeleteServiceMutation } from '@/features/services/hooks/useServiceMutations';
import { useServicesPage } from '@/features/services/hooks/useServicesPage';
import { useServicesPageActions } from '@/features/services/hooks/useServicesPageActions';
import { useScrollIntoViewOnChange } from '@/shared/hooks/use-scroll-into-view-on-change';

type ServicePresetKey = 'computer' | 'printing' | 'beauty' | 'mobile' | 'general' | 'manual';

interface PresetServiceDraft {
  id: string;
  name: string;
  amountInput: string;
}

interface ServiceCatalogItem {
  name: string;
  defaultAmount?: number | null;
}

interface ServicePresetOption {
  key: ServicePresetKey;
  label: string;
  services: string[];
}

const SERVICE_PRESETS: ServicePresetOption[] = [
  {
    key: 'computer',
    label: 'محل كمبيوتر',
    services: ['صيانة', 'تثبيت ويندوز', 'تعريفات وبرامج', 'طباعة', 'سكانر', 'كتابة ملفات', 'نسخ ملفات', 'استرجاع بيانات'],
  },
  {
    key: 'printing',
    label: 'مكتبة / طباعة',
    services: ['طباعة', 'تصوير مستندات', 'سكانر', 'تغليف', 'تجليد', 'كتابة أبحاث', 'طباعة ألوان', 'طباعة أبيض وأسود'],
  },
  {
    key: 'beauty',
    label: 'صالون / تجميل',
    services: ['قص شعر', 'استشوار', 'صبغة', 'تنظيف بشرة', 'مكياج', 'عناية أظافر', 'حلاقة', 'باقة عناية'],
  },
  {
    key: 'mobile',
    label: 'صيانة موبايلات',
    services: ['كشف عطل', 'تغيير شاشة', 'تغيير بطارية', 'سوفت وير', 'تنظيف سماعة', 'تغيير سوكت شحن', 'تركيب إسكرينة', 'نقل بيانات'],
  },
  {
    key: 'general',
    label: 'مركز خدمات عام',
    services: ['خدمة توصيل', 'تركيب', 'صيانة', 'استشارة', 'معاينة', 'تغليف', 'خدمة إضافية'],
  },
  {
    key: 'manual',
    label: 'تخصيص يدوي',
    services: [],
  },
];

const serviceFilterOptions = [
  { value: 'all', label: 'الكل' },
  { value: 'today', label: 'اليوم' },
  { value: 'high', label: 'الأعلى قيمة' },
  { value: 'notes', label: 'بملاحظات' },
] as const;

const SERVICES_CATALOG_STORAGE_KEY = 'services:catalog:v1';

function readServicesCatalog(): ServiceCatalogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SERVICES_CATALOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ServiceCatalogItem[] => {
      if (!item || typeof item !== 'object') return [];
      const name = String((item as { name?: string }).name || '').trim();
      if (!name) return [];
      const defaultAmountRaw = (item as { defaultAmount?: unknown }).defaultAmount;
      const defaultAmount = typeof defaultAmountRaw === 'number' && Number.isFinite(defaultAmountRaw)
        ? defaultAmountRaw
        : null;
      return [{ name, defaultAmount }];
    });
  } catch {
    return [];
  }
}

function writeServicesCatalog(items: ServiceCatalogItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SERVICES_CATALOG_STORAGE_KEY, JSON.stringify(items));
}

function formatServicePaymentChannel(channel?: string) {
  return channel === 'card' ? 'فيزا' : 'نقدي';
}

function printServiceReceipt(service: ServiceRecord) {
  printHtmlDocument(`إيصال خدمة ${service.name}`, `
    <h1>إيصال خدمة</h1>
    <div class="meta">الخدمة: ${escapeHtml(service.name)} · التاريخ: ${escapeHtml(formatDate(service.serviceDate))}</div>
    <div class="section"><strong>القيمة:</strong> ${formatCurrency(service.amount)}</div>
    <div class="section"><strong>طريقة التحصيل:</strong> ${escapeHtml(formatServicePaymentChannel(service.paymentChannel))}</div>
    <div class="section"><strong>الملاحظات:</strong> ${escapeHtml(service.notes || '—')}</div>
    <div class="section"><strong>المنفذ:</strong> ${escapeHtml(service.createdByName || '—')}</div>
  `);
}

function normalizeServiceName(value: string) {
  return value.trim().toLocaleLowerCase('ar-EG');
}

function buildPresetDrafts(key: ServicePresetKey) {
  const preset = SERVICE_PRESETS.find((entry) => entry.key === key);
  const names = preset?.services || [];
  return names.map((name, index) => ({
    id: `${key}-${index + 1}`,
    name,
    amountInput: '',
  }));
}

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

  const serviceFormSectionRef = useRef<HTMLDivElement | null>(null);
  const customServiceNameInputRef = useRef<HTMLInputElement | null>(null);

  const query = useServicesPage({ page, pageSize, search, filter: viewFilter });
  const deleteMutation = useDeleteServiceMutation(() => {
    setSelectedService(null);
    setServiceToDelete(null);
  });

  const { exportServices, printServices } = useServicesPageActions({ search, filter: viewFilter });

  useScrollIntoViewOnChange(selectedService?.id || '', serviceFormSectionRef, { enabled: Boolean(selectedService) });

  const rows = useMemo(() => query.data?.services || [], [query.data?.services]);
  const summary = query.data?.summary;

  useEffect(() => {
    if (selectedService && !rows.some((row) => String(row.id) === String(selectedService.id))) {
      setSelectedService(null);
    }
  }, [rows, selectedService]);

  useEffect(() => {
    if (!showCustomDraftInputs) return;
    requestAnimationFrame(() => {
      customServiceNameInputRef.current?.focus();
    });
  }, [showCustomDraftInputs]);

  useEffect(() => {
    writeServicesCatalog(serviceCatalog);
  }, [serviceCatalog]);

  const resetServicesView = () => {
    setSearch('');
    setViewFilter('all');
    setSelectedService(null);
    setPage(1);
  };

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

  const selectedDrafts = useMemo(
    () => presetDrafts.filter((item) => selectedDraftIds[item.id]),
    [presetDrafts, selectedDraftIds],
  );
  const selectedDraftCount = selectedDrafts.length;
  const serviceSuggestionOptions = useMemo<ServiceSuggestionOption[]>(
    () => serviceCatalog.map((item) => ({ name: item.name, defaultAmount: item.defaultAmount ?? null })),
    [serviceCatalog],
  );

  function openServiceFormForCreate() {
    setSelectedService(null);
    window.setTimeout(() => {
      const section = serviceFormSectionRef.current;
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const firstField = section.querySelector<HTMLElement>('input, textarea, select, button');
      firstField?.focus();
    }, 0);
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
    setSelectedPresetKey(nextPresetKey);
    const nextDrafts = buildPresetDrafts(nextPresetKey);
    setPresetDrafts(nextDrafts);
    setSelectedDraftIds(Object.fromEntries(nextDrafts.map((service) => [service.id, true])));
    setPresetMessage('');
    setShowCustomDraftInputs(nextPresetKey === 'manual');
  }

  function toggleDraftSelection(id: string) {
    setSelectedDraftIds((current) => ({ ...current, [id]: !current[id] }));
  }

  function addCustomDraftService() {
    const name = customDraftName.trim();

    if (!name) {
      setPresetMessage('اكتب اسم الخدمة أولًا.');
      setPresetMessageTone('error');
      return;
    }

    const normalizedName = normalizeServiceName(name);
    const alreadyExists = presetDrafts.some((service) => normalizeServiceName(service.name) === normalizedName);
    if (alreadyExists) {
      setPresetMessage('الخدمة موجودة بالفعل.');
      setPresetMessageTone('error');
      return;
    }

    const id = `custom-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const nextService: PresetServiceDraft = {
      id,
      name,
      amountInput: customDraftAmount.trim(),
    };

    setPresetDrafts((current) => [...current, nextService]);
    setSelectedDraftIds((current) => ({ ...current, [id]: true }));
    setCustomDraftName('');
    setCustomDraftAmount('');
    setPresetMessage('');
    setPresetMessageTone('success');

    requestAnimationFrame(() => {
      customServiceNameInputRef.current?.focus();
    });
  }

  async function savePresetServices() {
    if (!selectedDraftCount) {
      setPresetMessage('لا توجد خدمات مختارة للحفظ.');
      setPresetMessageTone('error');
      return;
    }

    setIsPresetSavePending(true);
    setPresetMessage('');

    try {
      const existingByName = new Map(
        serviceCatalog.map((item) => [normalizeServiceName(item.name), item] as const),
      );
      const seen = new Set<string>();
      const nextCatalog = [...serviceCatalog];

      selectedDrafts.forEach((item) => {
        const normalized = normalizeServiceName(item.name);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);

        const parsedAmount = item.amountInput.trim() === '' ? null : Number(item.amountInput);
        const defaultAmount = typeof parsedAmount === 'number' && Number.isFinite(parsedAmount)
          ? parsedAmount
          : null;
        const nextItem: ServiceCatalogItem = {
          name: item.name.trim(),
          defaultAmount,
        };

        if (existingByName.has(normalized)) {
          const existingIndex = nextCatalog.findIndex((entry) => normalizeServiceName(entry.name) === normalized);
          if (existingIndex !== -1) {
            nextCatalog[existingIndex] = nextItem;
          }
          return;
        }

        nextCatalog.push(nextItem);
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

  return (
    <div className="page-stack page-shell services-page">
      <PageHeader
        title="الخدمات"
        description="أضف خدمات نشاطك وحدد أسعارها لتظهر في الكاشير عند الحاجة."
        badge={<span className="nav-pill">الخدمات</span>}
        actions={(
          <div className="actions compact-actions">
            <Button type="button" variant="secondary" onClick={openPresetDialog}>تخصيص الخدمات</Button>
            <Button type="button" onClick={openServiceFormForCreate}>إضافة خدمة جديدة</Button>
          </div>
        )}
      />

      <StatsGrid items={stats} />

      {pageNotice ? (
        <div className={`notice-banner ${pageNoticeTone === 'error' ? 'is-error' : 'is-success'}`}>{pageNotice}</div>
      ) : null}

      <Card title="سجل الخدمات">
        <SearchToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="ابحث باسم الخدمة أو الملاحظات أو المنفذ"
        />
        <FilterChipGroup
          value={viewFilter}
          options={serviceFilterOptions}
          onChange={(value) => {
            setViewFilter(value);
            setPage(1);
          }}
          className="filter-chip-row services-filter-row"
        />
        <div className="actions compact-actions">
          <Button type="button" variant="secondary" onClick={resetServicesView}>إعادة الضبط</Button>
        </div>

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
              {
                key: 'actions',
                header: 'إجراءات',
                cell: (row) => (
                  <div className="actions compact-actions">
                    <Button type="button" variant="secondary" onClick={() => printServiceReceipt(row)}>طباعة</Button>
                    <Button type="button" variant="secondary" onClick={() => setSelectedService(row)}>تعديل</Button>
                    <Button type="button" variant="danger" onClick={() => setServiceToDelete(row)}>حذف</Button>
                  </div>
                ),
              },
            ]}
            pagination={{
              page,
              pageSize,
              totalItems: insights.totalItems || rows.length,
              onPageChange: setPage,
              onPageSizeChange: (nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              },
              itemLabel: 'خدمة',
            }}
          />
        </QueryFeedback>
      </Card>

      <div className="two-column-grid services-workspace-grid">
        <div ref={serviceFormSectionRef}>
          <Card
            title={selectedService ? `تعديل: ${selectedService.name}` : 'إضافة خدمة جديدة'}
            actions={<span className="nav-pill">النموذج</span>}
            description="أضف خدمة يقدمها نشاطك وحدد سعرها لتظهر في الكاشير عند الحاجة."
          >
            <ServiceFormCard
              service={selectedService || undefined}
              onSaved={() => setSelectedService(null)}
              suggestions={serviceSuggestionOptions}
            />
          </Card>
        </div>

        <Card
          title="مؤشرات سريعة"
          actions={(
            <div className="actions compact-actions">
              <Button type="button" variant="secondary" onClick={() => void exportServices()} disabled={!insights.totalItems}>تصدير CSV</Button>
              <Button type="button" variant="secondary" onClick={() => void printServices()} disabled={!insights.totalItems}>طباعة السجل</Button>
            </div>
          )}
          description="النطاق الحالي يعتمد على نتائج البحث والفلاتر النشطة."
        >
          <div className="metric-list services-insights-list">
            <div className="metric-row"><span>خدمات مطابقة للبحث</span><strong>{insights.totalItems}</strong></div>
            <div className="metric-row"><span>آخر خدمة</span><strong>{insights.latestServiceName}</strong></div>
            <div className="metric-row"><span>آخر منفذ</span><strong>{insights.latestCreatedByName}</strong></div>
            <div className="metric-row"><span>أعلى خدمة قيمة</span><strong>{insights.totalItems ? formatCurrency(insights.highestAmount) : '—'}</strong></div>
          </div>
        </Card>
      </div>

      <DialogShell open={isPresetDialogOpen} onClose={closePresetDialog} width="min(760px, 100%)" zIndex={75}>
        <Card
          title="تخصيص خدمات النشاط"
          className="dialog-card"
          description="اختر قالبًا جاهزًا أو أضف خدماتك يدويًا حسب طبيعة نشاطك."
        >
          <div className="page-stack" style={{ gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {SERVICE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handlePresetSelection(preset.key)}
                  className={`nav-pill ${selectedPresetKey === preset.key ? 'is-active' : ''}`}
                  tabIndex={isCustomNameFocused ? -1 : 0}
                  style={{
                    border: selectedPresetKey === preset.key ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedPresetKey === preset.key ? 'var(--primary-soft)' : 'var(--surface)',
                    padding: '10px 12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderRadius: 12,
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <Card title="الخدمات المقترحة" description="يمكنك تعديل الأسعار أو إلغاء أي خدمة قبل الحفظ.">
              <div className="page-stack" style={{ gap: 10 }}>
                {!presetDrafts.length ? (
                  <div className="muted">لا توجد خدمات مقترحة لهذا الاختيار. أضف خدماتك يدويًا من الزر التالي.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {presetDrafts.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: '10px 12px',
                          background: 'var(--surface)',
                          display: 'grid',
                          gap: 8,
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(selectedDraftIds[item.id])}
                            onChange={() => toggleDraftSelection(item.id)}
                            style={{ width: 16, height: 16, margin: 0, flexShrink: 0 }}
                          />
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                        </label>
                        <label className="field" style={{ margin: 0 }}>
                          <span className="muted small">السعر الافتراضي اختياري</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.amountInput}
                            onChange={(event) => {
                              setPresetDrafts((current) => current.map((entry) => (
                                entry.id === item.id ? { ...entry, amountInput: event.target.value } : entry
                              )));
                            }}
                            placeholder="اختياري"
                            style={{ minHeight: 36 }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <div className="actions compact-actions" style={{ justifyContent: 'flex-start' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCustomDraftInputs((current) => !current)}
                  >
                    إضافة خدمة مخصصة +
                  </Button>
                </div>

                {showCustomDraftInputs ? (
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      background: 'var(--surface-soft)',
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    <div className="muted small" style={{ fontWeight: 600 }}>إضافة خدمة مخصصة</div>
                    <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr auto', gap: 10 }}>
                      <div className="field" style={{ margin: 0 }}>
                        <label>
                          <span>اسم الخدمة</span>
                          <input
                            ref={customServiceNameInputRef}
                            value={customDraftName}
                            onFocus={() => setIsCustomNameFocused(true)}
                            onBlur={() => setIsCustomNameFocused(false)}
                            onChange={(event) => setCustomDraftName(event.target.value)}
                            placeholder="اسم الخدمة"
                          />
                        </label>
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label>
                          <span>السعر (اختياري)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={customDraftAmount}
                            onChange={(event) => setCustomDraftAmount(event.target.value)}
                            placeholder="0"
                          />
                        </label>
                      </div>
                      <div className="actions compact-actions" style={{ alignItems: 'flex-end' }}>
                        <Button type="button" onClick={addCustomDraftService}>إضافة للقائمة</Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>

            {presetMessage ? (
              <div className={`notice-banner ${presetMessageTone === 'error' ? 'is-error' : 'is-success'}`}>{presetMessage}</div>
            ) : null}

            <div className="actions sticky-form-actions">
              <Button type="button" variant="secondary" onClick={closePresetDialog} disabled={isPresetSavePending}>إلغاء</Button>
              <Button type="button" onClick={() => void savePresetServices()} disabled={isPresetSavePending}>
                {isPresetSavePending ? 'جاري الحفظ...' : `حفظ التخصيص (${selectedDraftCount})`}
              </Button>
            </div>
          </div>
        </Card>
      </DialogShell>

      <ActionConfirmDialog
        open={Boolean(serviceToDelete)}
        title="تأكيد حذف الخدمة"
        description={serviceToDelete ? `سيتم حذف الخدمة ${serviceToDelete.name}.` : ''}
        confirmLabel="نعم، حذف الخدمة"
        isBusy={deleteMutation.isPending}
        onCancel={() => setServiceToDelete(null)}
        onConfirm={async () => {
          if (!serviceToDelete) return;
          await deleteMutation.mutateAsync(serviceToDelete.id);
        }}
      />
    </div>
  );
}
