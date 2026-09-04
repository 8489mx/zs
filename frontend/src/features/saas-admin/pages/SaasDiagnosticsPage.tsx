import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/components/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { StatsGrid } from '@/shared/components/stats-grid';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatDate } from '@/lib/format';
import { systemAlert } from '@/shared/components/system-alert';
import { saasAdminApi, SaasDiagnosticRow } from '../api/saas-admin.api';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function SaasDiagnosticsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedErrorRow, setSelectedErrorRow] = useState<SaasDiagnosticRow | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['saas-diagnostics', page, search],
    queryFn: () => saasAdminApi.listDiagnostics({ page, limit: 20, search }),
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => saasAdminApi.deleteDiagnostic(id),
    onSuccess: () => {
      systemAlert('تم حذف سجل التشخيص بنجاح');
      queryClient.invalidateQueries({ queryKey: ['saas-diagnostics'] });
    },
    onError: (err: any) => {
      systemAlert(err?.message || 'فشل حذف السجل');
    },
  });

  const handleDelete = (row: SaasDiagnosticRow) => {
    if (window.confirm(`هل أنت متأكد من حذف تقرير العميل "${row.clientName}" لفترة ${row.logPeriod}؟`)) {
      deleteMutation.mutate(row.id);
    }
  };

  const handleDownload = (row: SaasDiagnosticRow) => {
    const url = saasAdminApi.downloadDiagnosticUrl(row.id);
    window.open(url, '_blank');
  };

  const items = data?.data || [];
  const pagination = data?.pagination;

  // Stats calculation
  const stats = useMemo(() => {
    const total = pagination?.total || items.length;
    const withErrors = items.filter((i) => i.errorCount500 > 0).length;
    const healthy = items.filter((i) => i.errorCount500 === 0).length;
    return [
      { key: 'total', label: 'إجمالي التقارير المرفوعة', value: String(total) },
      { key: 'errors', label: 'تقارير تتضمن أخطاء (500)', value: String(withErrors) },
      { key: 'healthy', label: 'تقارير سليمة ونظيفة', value: String(healthy) },
    ];
  }, [items, pagination]);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="سجلات التشخيص والدعم الفني"
        description="متابعة وتحميل حزم اللوجات والفحص المرفوعة تلقائياً ويدوياً من أجهزة العملاء لحل المشاكل استباقياً."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <span>{isFetching ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
          </Button>
        }
      />

      <StatsGrid items={stats} />

      <FormSection title="سجلات العملاء المرفوعة">
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-80">
              <input
                type="text"
                placeholder="بحث باسم العميل أو المعرف أو الفترة..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500">
              يتم استلام اللوجات تلقائياً يوم 15 من كل شهر أو عند طلب الدعم الفني من العميل.
            </div>
          </div>

          <QueryFeedback
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={items.length === 0}
            emptyTitle="لا توجد تقارير تشخيصية مرفوعة حتى الآن."
            errorAction={
              <Button variant="secondary" onClick={() => refetch()}>
                إعادة المحاولة
              </Button>
            }
          >
            <DataTable
              getRowKey={(row) => String(row.id)}
              columns={[
                {
                  id: 'client',
                  header: 'العميل / المتجر',
                  render: (row: SaasDiagnosticRow) => (
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{row.clientName}</div>
                      <div className="text-xs text-slate-500 font-mono">{row.clientIdentifier}</div>
                    </div>
                  ),
                },
                {
                  id: 'version',
                  header: 'الإصدار',
                  render: (row: SaasDiagnosticRow) => (
                    <span className="inline-block px-2 py-0.5 text-xs font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      v{row.appVersion || '1.0.0'}
                    </span>
                  ),
                },
                {
                  id: 'period',
                  header: 'الفترة',
                  render: (row: SaasDiagnosticRow) => (
                    <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                      {row.logPeriod}
                    </span>
                  ),
                },
                {
                  id: 'status',
                  header: 'حالة الأخطاء (500)',
                  render: (row: SaasDiagnosticRow) => {
                    if (row.errorCount500 > 0) {
                      return (
                        <button
                          type="button"
                          onClick={() => setSelectedErrorRow(row)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-200 transition-colors"
                          title="اضغط لمعاينة تفاصيل الأخطاء"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          <span>{row.errorCount500} خطأ سيرفر</span>
                          <span className="text-[10px] underline">(معاينة)</span>
                        </button>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>نظيف (0 أخطاء)</span>
                      </span>
                    );
                  },
                },
                {
                  id: 'size',
                  header: 'حجم الحزمة',
                  render: (row: SaasDiagnosticRow) => (
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {formatBytes(row.fileSizeBytes)}
                    </span>
                  ),
                },
                {
                  id: 'uploadedAt',
                  header: 'تاريخ الرفع',
                  render: (row: SaasDiagnosticRow) => (
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {formatDate(row.uploadedAt)}
                    </span>
                  ),
                },
                {
                  id: 'actions',
                  header: 'الإجراءات',
                  render: (row: SaasDiagnosticRow) => (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleDownload(row)}
                        className="text-xs px-2.5 py-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                      >
                        تحميل ZIP
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleDelete(row)}
                        disabled={deleteMutation.isPending}
                        className="text-xs px-2 py-1 text-red-600 hover:bg-red-50"
                      >
                        حذف
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={items}
            />
          </QueryFeedback>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                صفحة {pagination.page} من {pagination.totalPages} (إجمالي {pagination.total} تقرير)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  السابق
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* Error Details Modal */}
      {selectedErrorRow && (
        <DialogShell
          open={true}
          onClose={() => setSelectedErrorRow(null)}
        >
          <div className="space-y-4 p-4 text-sm" dir="rtl">
            <div className="font-bold text-base text-slate-900 dark:text-white mb-2">
              {`تفاصيل أخطاء التقرير: ${selectedErrorRow.clientName} (${selectedErrorRow.logPeriod})`}
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="font-semibold text-red-800 dark:text-red-300">
                إجمالي الأخطاء المسجلة: {selectedErrorRow.errorCount500} خطأ
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                تم استخراج هذه العينات من ملفات السجلات الموجودة داخل الحزمة المضغوطة.
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                عينات من الأخطاء:
              </div>
              {selectedErrorRow.errorSummary?.samples && selectedErrorRow.errorSummary.samples.length > 0 ? (
                <div className="space-y-2">
                  {selectedErrorRow.errorSummary.samples.map((sample, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto"
                      dir="ltr"
                    >
                      {sample}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  لا تتوفر عينات نصية مفصلة. يمكنك تحميل ملف الـ ZIP لفحص اللوجات بالكامل.
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleDownload(selectedErrorRow)}
                className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                تحميل حزمة اللوج الكاملة (ZIP)
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setSelectedErrorRow(null)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  );
}
