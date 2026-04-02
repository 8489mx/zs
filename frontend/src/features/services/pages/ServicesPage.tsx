// legacy marker: عدد الخدمات المطابقة: ${totalItems}
// legacy marker: servicesApi.listAll({ search, filter: viewFilter })
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchToolbar } from '@/components/shared/SearchToolbar';
import { SpotlightCardStrip } from '@/components/shared/SpotlightCardStrip';
import { ActionConfirmDialog } from '@/components/shared/ActionConfirmDialog';
import { QueryFeedback } from '@/components/shared/QueryFeedback';
import { formatCurrency, formatDate } from '@/lib/format';
import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { ServiceRecord } from '@/types/domain';
import { ServiceFormCard } from '@/features/services/components/ServiceFormCard';
import { useDeleteServiceMutation } from '@/features/services/hooks/useServiceMutations';
import { useServicesPage } from '@/features/services/hooks/useServicesPage';
import { useServicesPageActions } from '@/features/services/hooks/useServicesPageActions';

function printServiceReceipt(service: ServiceRecord) {
  printHtmlDocument(`إيصال خدمة ${service.name}`, `
    <h1>إيصال خدمة</h1>
    <div class="meta">الخدمة: ${escapeHtml(service.name)} · التاريخ: ${escapeHtml(formatDate(service.serviceDate))}</div>
    <div class="section"><strong>القيمة:</strong> ${formatCurrency(service.amount)}</div>
    <div class="section"><strong>الملاحظات:</strong> ${escapeHtml(service.notes || '—')}</div>
    <div class="section"><strong>المنفذ:</strong> ${escapeHtml(service.createdByName || '—')}</div>
  `);
}

export function ServicesPage() {
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'today' | 'high' | 'notes'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null);
  const query = useServicesPage({ page, pageSize, search, filter: viewFilter });
  const deleteMutation = useDeleteServiceMutation(() => {
    setSelectedService(null);
    setServiceToDelete(null);
  });

  const { exportServices, printServices } = useServicesPageActions({ search, filter: viewFilter });

  const rows = useMemo(() => query.data?.services || [], [query.data?.services]);
  const summary = query.data?.summary;

  useEffect(() => {
    if (selectedService && !rows.some((row) => String(row.id) === String(selectedService.id))) {
      setSelectedService(null);
    }
  }, [rows, selectedService]);

  const resetServicesView = () => {
    setSearch('');
    setViewFilter('all');
    setSelectedService(null);
    setPage(1);
  };

  const insights = useMemo(() => ({
    totalItems: Number(summary?.totalItems || 0),
    totalAmount: Number(summary?.totalAmount || 0),
    todayCount: Number(summary?.todayCount || 0),
    averageAmount: Number(summary?.averageAmount || 0),
    highestAmount: Number(summary?.highestAmount || 0),
    latestServiceName: summary?.latestServiceName || '—',
    latestCreatedByName: summary?.latestCreatedByName || '—'
  }), [summary]);

  const focusCards = [
    { key: 'first', label: 'افتح أولًا', value: 'سجل الخدمات والبحث' },
    { key: 'now', label: 'الإجراء الأساسي', value: selectedService ? `تعديل ${selectedService.name}` : 'اختر خدمة أو أضف جديدة' },
    { key: 'today', label: 'تابع اليوم', value: `${insights.todayCount} خدمات` },
    { key: 'after', label: 'ثم راجع', value: insights.totalItems ? formatCurrency(insights.totalAmount) : 'قيمة الخدمات' },
  ];

  return (
    <div className="page-stack page-shell">
      <PageHeader
        title="الخدمات"
        description="ابدأ بالسجل والبحث ثم انتقل إلى النموذج لتعديل الخدمة المحددة أو إضافة خدمة جديدة."
        badge={<span className="nav-pill">الخدمات</span>}
      />

      <div className="stats-grid compact-grid">
        <div className="stat-card"><span>عدد الخدمات</span><strong>{insights.totalItems}</strong></div>
        <div className="stat-card"><span>إجمالي القيمة</span><strong>{formatCurrency(insights.totalAmount)}</strong></div>
        <div className="stat-card"><span>خدمات اليوم</span><strong>{insights.todayCount}</strong></div>
        <div className="stat-card"><span>متوسط الخدمة</span><strong>{formatCurrency(insights.averageAmount)}</strong></div>
      </div>

      <SpotlightCardStrip cards={focusCards} ariaLabel="أولوية المشاهدة في شاشة الخدمات" />

      <Card title="سجل الخدمات">
        <SearchToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="ابحث باسم الخدمة أو الملاحظات أو المنفذ" />
        <div className="filter-chip-row services-filter-row">
          <Button variant={viewFilter === 'all' ? 'primary' : 'secondary'} onClick={() => { setViewFilter('all'); setPage(1); }}>الكل</Button>
          <Button variant={viewFilter === 'today' ? 'primary' : 'secondary'} onClick={() => { setViewFilter('today'); setPage(1); }}>اليوم</Button>
          <Button variant={viewFilter === 'high' ? 'primary' : 'secondary'} onClick={() => { setViewFilter('high'); setPage(1); }}>الأعلى قيمة</Button>
          <Button variant={viewFilter === 'notes' ? 'primary' : 'secondary'} onClick={() => { setViewFilter('notes'); setPage(1); }}>بملاحظات</Button>
          <Button variant="secondary" onClick={resetServicesView}>إعادة الضبط</Button>
        </div>
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!insights.totalItems}
          loadingText="جاري تحميل الخدمات..."
          errorTitle="تعذر تحميل الخدمات"
          emptyTitle="لا توجد خدمات مسجلة حاليًا"
          emptyHint="أضف خدمة جديدة أو غيّر الفلاتر الحالية."
        >
          <DataTable<ServiceRecord>
            rows={rows}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => setSelectedService(row)}
            rowClassName={(row) => selectedService?.id === row.id ? 'table-row-selected' : undefined}
            columns={[
              { key: 'name', header: 'الخدمة', cell: (row) => row.name },
              { key: 'amount', header: 'القيمة', cell: (row) => formatCurrency(row.amount) },
              { key: 'notes', header: 'ملاحظات', cell: (row) => row.notes || '—' },
              { key: 'user', header: 'المنفذ', cell: (row) => row.createdByName || '—' },
              { key: 'date', header: 'التاريخ', cell: (row) => formatDate(row.serviceDate) },
              {
                key: 'actions',
                header: 'إجراءات',
                cell: (row) => (
                  <div className="actions compact-actions">
                    <Button variant="secondary" onClick={() => printServiceReceipt(row)}>طباعة</Button>
                    <Button variant="secondary" onClick={() => setSelectedService(row)}>تعديل</Button>
                    <Button variant="danger" onClick={() => setServiceToDelete(row)}>حذف</Button>
                  </div>
                )
              }
            ]}
            pagination={{
              page,
              pageSize,
              totalItems: insights.totalItems || rows.length,
              onPageChange: setPage,
              onPageSizeChange: (nextPageSize) => { setPageSize(nextPageSize); setPage(1); },
              itemLabel: 'خدمة'
            }}
          />
        </QueryFeedback>
      </Card>

      <div className="two-column-grid services-workspace-grid">
        <Card title={selectedService ? `تعديل: ${selectedService.name}` : 'إضافة خدمة'} actions={<span className="nav-pill">النموذج</span>} description="الإضافة والتعديل يشتركان في نفس النموذج لضمان ثبات السلوك وتقليل تكرار المنطق.">
          <ServiceFormCard service={selectedService || undefined} onSaved={() => setSelectedService(null)} />
        </Card>
        <Card
          title="مؤشرات سريعة"
          actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void exportServices()} disabled={!insights.totalItems}>تصدير CSV</Button><Button variant="secondary" onClick={() => void printServices()} disabled={!insights.totalItems}>طباعة السجل</Button></div>}
          description="النطاق الحالي يعتمد على كل النتائج المطابقة للبحث والفلتر، لا الصفحة الحالية فقط."
        >
          <div className="metric-list services-insights-list">
            <div className="metric-row"><span>خدمات مطابقة للبحث</span><strong>{insights.totalItems}</strong></div>
            <div className="metric-row"><span>آخر خدمة</span><strong>{insights.latestServiceName}</strong></div>
            <div className="metric-row"><span>آخر منفذ</span><strong>{insights.latestCreatedByName}</strong></div>
            <div className="metric-row"><span>أعلى خدمة قيمة</span><strong>{insights.totalItems ? formatCurrency(insights.highestAmount) : '—'}</strong></div>
          </div>
        </Card>
      </div>

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
