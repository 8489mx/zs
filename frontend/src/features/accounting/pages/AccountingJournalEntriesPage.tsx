import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { accountingApi, type JournalEntryListItem } from '@/features/accounting/api/accounting.api';

export function AccountingJournalEntriesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const query = useQuery({
    queryKey: ['accounting', 'journal-entries', page, pageSize],
    queryFn: () => accountingApi.journalEntries({ page, pageSize }),
  });

  const rows = query.data?.entries || [];
  const pagination = query.data?.pagination || {};
  const totalItems = Number((pagination as { totalItems?: number }).totalItems || rows.length);

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
            rows={rows}
            rowKey={(row) => row.id}
            columns={[
              { key: 'entryNo', header: 'رقم القيد', cell: (row) => row.entryNo },
              { key: 'date', header: 'التاريخ', cell: (row) => String(row.entryDate || '').slice(0, 10) },
              { key: 'source', header: 'المصدر', cell: (row) => row.sourceType || '' },
              { key: 'description', header: 'الوصف', cell: (row) => row.description || '' },
              { key: 'status', header: 'الحالة', cell: (row) => row.status },
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
    </div>
  );
}

