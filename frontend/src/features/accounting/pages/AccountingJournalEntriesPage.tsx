import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { formatCurrency } from '@/lib/format';
import { accountingApi, type JournalEntryDetail, type JournalEntryLine, type JournalEntryListItem } from '@/features/accounting/api/accounting.api';

function mapStatusLabel(status: string) {
  if (status === 'posted') return 'مرحّل';
  if (status === 'draft') return 'مسودة';
  if (status === 'cancelled') return 'ملغي';
  return status || '';
}

function mapSourceLabel(sourceType: string) {
  if (sourceType === 'sale') return 'بيع';
  if (sourceType === 'sale_edit') return 'تعديل بيع';
  if (sourceType === 'sale_edit_reversal') return 'عكس تعديل بيع';
  if (sourceType === 'sale_cancel' || sourceType === 'sale_reversal') return 'عكس بيع / إلغاء بيع';
  if (sourceType === 'sales_return') return 'مرتجع بيع';
  if (sourceType === 'return') return 'مرتجع';
  if (sourceType === 'purchase') return 'شراء';
  if (sourceType === 'purchase_cancel' || sourceType === 'purchase_reversal') return 'عكس شراء / إلغاء شراء';
  if (sourceType === 'supplier_payment') return 'سداد مورد';
  if (sourceType === 'supplier_payment_reversal') return 'عكس سداد مورد';
  if (sourceType === 'supplier_payment_schedule_settlement') return 'سداد مورد';
  if (sourceType === 'customer_payment') return 'تحصيل عميل';
  if (sourceType === 'customer_payment_reversal') return 'عكس تحصيل عميل';
  if (sourceType === 'expense') return 'مصروف';
  if (sourceType === 'treasury_expense') return 'مصروف خزنة';
  if (sourceType === 'expense_reversal') return 'عكس مصروف';
  if (sourceType === 'opening_balance') return 'رصيد افتتاحي';
  if (sourceType === 'manual') return 'يدوي';
  return sourceType || '';
}

export function AccountingJournalEntriesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [shouldAutoScrollToDetails, setShouldAutoScrollToDetails] = useState(false);
  const detailsRef = useRef<HTMLDivElement | null>(null);

  const query = useQuery({
    queryKey: ['accounting', 'journal-entries', page, pageSize],
    queryFn: () => accountingApi.journalEntries({ page, pageSize }),
  });

  const detailQuery = useQuery({
    queryKey: ['accounting', 'journal-entry', selectedEntryId],
    queryFn: () => accountingApi.journalEntry(String(selectedEntryId)),
    enabled: Boolean(selectedEntryId),
  });

  const rows = query.data?.entries || [];
  const pagination = query.data?.pagination || {};
  const totalItems = Number((pagination as { totalItems?: number }).totalItems || rows.length);
  const detailEntry: JournalEntryDetail | null = detailQuery.data?.entry || null;

  useEffect(() => {
    if (!shouldAutoScrollToDetails || !selectedEntryId || detailQuery.isLoading) return;
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShouldAutoScrollToDetails(false);
  }, [detailQuery.isLoading, selectedEntryId, shouldAutoScrollToDetails]);

  function handleSelectEntry(entryId: string) {
    setSelectedEntryId(entryId);
    setShouldAutoScrollToDetails(true);
  }

  return (
    <div className="page-stack page-shell">
      <PageHeader title="الحسابات" description="القيود اليومية" />
      <Card title="القيود اليومية">
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!rows.length}
          loadingText="جاري تحميل القيود اليومية..."
          errorTitle="تعذر تحميل القيود اليومية"
          emptyTitle="لا توجد قيود يومية"
        >
          <DataTable<JournalEntryListItem>
            data={rows}
            getRowKey={(row) => row.id}
            onRowClick={(row) => handleSelectEntry(row.id)}
            rowTitle={() => 'عرض تفاصيل القيد'}
            defaultSort={{ columnId: 'date', direction: 'desc' }}
            columns={[
              {
                id: 'entryNo',
                header: 'رقم القيد',
                sortable: true,
                sortValue: (row) => Number(row.id || 0),
                render: (row) => (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectEntry(row.id);
                    }}
                  >
                    {row.entryNo}
                  </button>
                ),
              },
              {
                id: 'date',
                header: 'التاريخ',
                render: (row) => String(row.entryDate || '').slice(0, 10),
                sortable: true,
                sortValue: (row) => row.entryDate,
              },
              {
                id: 'source',
                header: 'المصدر',
                render: (row) => mapSourceLabel(row.sourceType || ''),
                sortable: true,
                sortValue: (row) => mapSourceLabel(row.sourceType || ''),
              },
              { id: 'description', header: 'الوصف', render: (row) => row.description || '' },
              {
                id: 'status',
                header: 'الحالة',
                render: (row) => mapStatusLabel(row.status || ''),
                sortable: true,
                sortValue: (row) => mapStatusLabel(row.status || ''),
              },
            ]}
            pagination={{
              page,
              pageSize,
              totalItems,
              onPageChange: setPage,
              onPageSizeChange: (next) => {
                setPageSize(next);
                setPage(1);
              },
              itemLabel: 'قيد',
            }}
          />
        </QueryFeedback>
      </Card>

      {selectedEntryId ? (
        <div ref={detailsRef}>
          <Card title="تفاصيل القيد">
            <div className="actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedEntryId(null);
                  setShouldAutoScrollToDetails(false);
                }}
              >
                العودة للقيود اليومية
              </Button>
            </div>

            <QueryFeedback
              isLoading={detailQuery.isLoading}
              isError={detailQuery.isError}
              error={detailQuery.error}
              isEmpty={!detailEntry}
              loadingText="جاري تحميل تفاصيل القيد..."
              errorTitle="تعذر تحميل تفاصيل القيد"
              emptyTitle="لا توجد تفاصيل لهذا القيد"
            >
              {detailEntry ? (
                <div className="page-stack">
                  <div className="grid-2">
                    <div><strong>رقم القيد:</strong> {detailEntry.entryNo}</div>
                    <div><strong>التاريخ:</strong> {String(detailEntry.entryDate || '').slice(0, 10)}</div>
                    <div><strong>المصدر:</strong> {mapSourceLabel(detailEntry.sourceType || '')}</div>
                    <div><strong>الحالة:</strong> {mapStatusLabel(detailEntry.status || '')}</div>
                    <div><strong>الوصف:</strong> {detailEntry.description || '-'}</div>
                    <div><strong>إجمالي المدين:</strong> {formatCurrency(Number(detailEntry.totals?.debit || 0))}</div>
                    <div><strong>إجمالي الدائن:</strong> {formatCurrency(Number(detailEntry.totals?.credit || 0))}</div>
                  </div>

                  <Card title="سطور القيد">
                    {detailEntry.lines?.length ? (
                      <DataTable<JournalEntryLine>
                        data={detailEntry.lines}
                        getRowKey={(row) => row.id}
                        columns={[
                          {
                            id: 'account',
                            header: 'الحساب',
                            render: (row) => [row.accountCode, row.accountNameAr || row.accountNameEn || row.accountId].filter(Boolean).join(' - '),
                          },
                          { id: 'description', header: 'الوصف', render: (row) => row.description || '-' },
                          { id: 'debit', header: 'مدين', align: 'end', render: (row) => formatCurrency(Number(row.debit || 0)) },
                          { id: 'credit', header: 'دائن', align: 'end', render: (row) => formatCurrency(Number(row.credit || 0)) },
                        ]}
                      />
                    ) : (
                      <div className="muted">لا توجد سطور لهذا القيد</div>
                    )}
                  </Card>
                </div>
              ) : null}
            </QueryFeedback>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
