import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Field } from '@/shared/ui/field';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Customer, CustomerLedgerEntry, LedgerPagination, LedgerSummary, Supplier, SupplierLedgerEntry } from '@/types/domain';
import { documentDetailsApi } from '@/shared/api/document-details';
import { AccountsInvoiceDetailCard } from '@/features/accounts/components/AccountsInvoiceDetailCard';

type Entry = CustomerLedgerEntry | SupplierLedgerEntry;
type SupportedDocumentType = 'sale' | 'purchase';
type SelectedLedgerDocument = { key: string; type: SupportedDocumentType; referenceId: string; label: string };

function getDocumentReference(entry: Entry, index: number): SelectedLedgerDocument | null {
  const referenceType = String(entry.reference_type || '').trim();
  const referenceId = String(entry.reference_id || '').trim();
  if (!referenceId || (referenceType !== 'sale' && referenceType !== 'purchase')) return null;
  return {
    key: `${referenceType}-${referenceId}-${index}`,
    type: referenceType,
    referenceId,
    label: String(entry.doc_no || entry.note || `${referenceType} #${referenceId}`),
  };
}

export function LedgerPanel({
  title,
  value,
  onChange,
  options,
  emptyLabel,
  entries,
  search,
  onSearchChange,
  pagination,
  onPageChange,
  onPageSizeChange,
  summary
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<Customer | Supplier>;
  emptyLabel: string;
  entries: Entry[];
  search: string;
  onSearchChange: (value: string) => void;
  pagination?: LedgerPagination | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  summary?: LedgerSummary | null;
}) {
  const selectedOption = useMemo(() => options.find((option) => String(option.id) === String(value)) || null, [options, value]);
  const [selectedDocument, setSelectedDocument] = useState<SelectedLedgerDocument | null>(null);

  useEffect(() => {
    setSelectedDocument(null);
  }, [value, search]);

  const saleDetailQuery = useQuery({
    queryKey: ['accounts-ledger-sale-detail', selectedDocument?.type, selectedDocument?.referenceId],
    queryFn: () => documentDetailsApi.saleById(String(selectedDocument?.referenceId || '')),
    enabled: selectedDocument?.type === 'sale' && Boolean(selectedDocument?.referenceId),
  });

  const purchaseDetailQuery = useQuery({
    queryKey: ['accounts-ledger-purchase-detail', selectedDocument?.type, selectedDocument?.referenceId],
    queryFn: () => documentDetailsApi.purchaseById(String(selectedDocument?.referenceId || '')),
    enabled: selectedDocument?.type === 'purchase' && Boolean(selectedDocument?.referenceId),
  });

  return (
    <Card title={title}>
      <div className="inline-create-grid">
        <Field label={emptyLabel}>
          <select value={value} onChange={(event) => onChange(event.target.value)}>
            <option value="">{emptyLabel}</option>
            {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </Field>
        <Field label="بحث داخل الكشف">
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="رقم مستند أو ملاحظة" disabled={!value} />
        </Field>
      </div>
      {selectedOption ? (
        <div className="stats-grid compact-grid">
          <div className="stat-card"><span>الاسم</span><strong>{selectedOption.name}</strong></div>
          <div className="stat-card"><span>عدد القيود</span><strong>{summary?.totalItems ?? entries.length}</strong></div>
          <div className="stat-card"><span>إجمالي المدين</span><strong>{formatCurrency(summary?.debitTotal || 0)}</strong></div>
          <div className="stat-card"><span>إجمالي الدائن</span><strong>{formatCurrency(summary?.creditTotal || 0)}</strong></div>
          <div className="stat-card"><span>آخر رصيد</span><strong>{formatCurrency(summary?.lastBalance || 0)}</strong></div>
        </div>
      ) : null}
      <DataTable
        ariaLabel={title}
        density="compact"
        rows={entries}
        empty={<div className="muted small">{value ? 'لا توجد قيود مطابقة لهذا الكشف.' : 'اختر عنصرًا لعرض الكشف.'}</div>}
        columns={[
          { key: 'type', header: 'النوع', cell: (entry) => entry.entry_type || 'قيد' },
          { key: 'note', header: 'الملاحظة', cell: (entry) => entry.note || '—' },
          { key: 'date', header: 'التاريخ', cell: (entry) => formatDate(entry.created_at || entry.date) },
          { key: 'debit', header: 'مدين', className: 'numeric-cell', cell: (entry) => formatCurrency(entry.debit || 0) },
          { key: 'credit', header: 'دائن', className: 'numeric-cell', cell: (entry) => formatCurrency(entry.credit || 0) },
          { key: 'balance', header: 'الرصيد', className: 'numeric-cell', cell: (entry) => formatCurrency(entry.balance_after || 0) },
          {
            key: 'document',
            header: 'الفاتورة',
            cell: (entry) => {
              const rowPosition = entries.indexOf(entry);
              const document = getDocumentReference(entry, rowPosition);
              if (!document) return <span className="muted small">—</span>;
              return (
                <Button
                  type="button"
                  variant={selectedDocument?.key === document.key ? 'primary' : 'secondary'}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedDocument((current) => current?.key === document.key ? null : document);
                  }}
                >
                  تفاصيل الفاتورة
                </Button>
              );
            },
          },
        ]}
        rowKey={(entry, index) => `${entry.doc_no || 'doc'}-${entry.created_at || entry.date || 'date'}-${index}`}
        pagination={value ? {
          page: pagination?.page || 1,
          pageSize: pagination?.pageSize || 10,
          totalItems: pagination?.totalItems || entries.length,
          onPageChange,
          onPageSizeChange,
          itemLabel: 'قيد'
        } : undefined}
      />
      <div className="page-stack" style={{ marginTop: 12 }}>
        <AccountsInvoiceDetailCard
          selectedLabel={selectedDocument?.label || ''}
          documentType={selectedDocument?.type || null}
          isLoading={saleDetailQuery.isLoading || purchaseDetailQuery.isLoading}
          error={saleDetailQuery.error || purchaseDetailQuery.error}
          sale={saleDetailQuery.data || null}
          purchase={purchaseDetailQuery.data || null}
        />
      </div>
    </Card>
  );
}
