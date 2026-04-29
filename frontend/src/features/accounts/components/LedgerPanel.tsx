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

function readEntryText(entry: Entry, keys: string[]) {
  const row = entry as Entry & Record<string, unknown>;
  for (const key of keys) {
    const value = row[key];
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function inferDocumentType(entry: Entry): SupportedDocumentType | '' {
  const referenceType = readEntryText(entry, ['reference_type', 'referenceType']).toLowerCase();
  if (referenceType === 'sale' || referenceType === 'purchase') return referenceType;

  const entryType = readEntryText(entry, ['entry_type', 'entryType', 'type']).toLowerCase();
  const note = readEntryText(entry, ['note', 'description']);
  const docNo = readEntryText(entry, ['doc_no', 'docNo', 'documentNo']);

  if (entryType.includes('purchase') || entryType.includes('supplier') || /(^|\s)P-\d+/i.test(`${docNo} ${note}`) || note.includes('شراء')) {
    return 'purchase';
  }
  if (entryType.includes('sale') || entryType.includes('customer') || /(^|\s)S-\d+/i.test(`${docNo} ${note}`) || note.includes('بيع')) {
    return 'sale';
  }

  return '';
}

function inferDocumentId(entry: Entry, type: SupportedDocumentType | '') {
  const referenceId = readEntryText(entry, ['reference_id', 'referenceId']);
  if (referenceId) return referenceId;

  const docNo = readEntryText(entry, ['doc_no', 'docNo', 'documentNo']);
  const note = readEntryText(entry, ['note', 'description']);
  const haystack = `${docNo} ${note}`;

  if (type === 'sale') {
    const match = haystack.match(/\bS-(\d+)\b/i);
    if (match?.[1]) return match[1];
  }

  if (type === 'purchase') {
    const match = haystack.match(/\bP-(\d+)\b/i);
    if (match?.[1]) return match[1];
  }

  const genericMatch = haystack.match(/#?(\d+)/);
  return genericMatch?.[1] || '';
}

function getDocumentReference(entry: Entry): SelectedLedgerDocument | null {
  const type = inferDocumentType(entry);
  if (type !== 'sale' && type !== 'purchase') return null;

  const referenceId = inferDocumentId(entry, type);
  if (!referenceId) return null;

  const docNo = readEntryText(entry, ['doc_no', 'docNo', 'documentNo']);
  const note = readEntryText(entry, ['note', 'description']);
  const label = docNo || note || `${type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'} #${referenceId}`;

  return {
    key: `${type}-${referenceId}`,
    type,
    referenceId,
    label,
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

  function toggleDocument(entry: Entry) {
    const document = getDocumentReference(entry);
    if (!document) return;
    setSelectedDocument((current) => current?.key === document.key ? null : document);
  }

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
          { key: 'type', header: 'النوع', cell: (entry) => readEntryText(entry, ['entry_type', 'entryType', 'type']) || 'قيد' },
          { key: 'note', header: 'الملاحظة', cell: (entry) => readEntryText(entry, ['note', 'description']) || '—' },
          { key: 'date', header: 'التاريخ', cell: (entry) => formatDate(readEntryText(entry, ['created_at', 'createdAt', 'date'])) },
          { key: 'debit', header: 'مدين', className: 'numeric-cell', cell: (entry) => formatCurrency(Number((entry as Entry & Record<string, unknown>).debit || 0)) },
          { key: 'credit', header: 'دائن', className: 'numeric-cell', cell: (entry) => formatCurrency(Number((entry as Entry & Record<string, unknown>).credit || 0)) },
          { key: 'balance', header: 'الرصيد', className: 'numeric-cell', cell: (entry) => formatCurrency(Number((entry as Entry & Record<string, unknown>).balance_after || (entry as Entry & Record<string, unknown>).balanceAfter || 0)) },
          {
            key: 'document',
            header: 'الفاتورة',
            cell: (entry) => {
              const document = getDocumentReference(entry);
              if (!document) return <span className="muted small">—</span>;
              return (
                <Button
                  type="button"
                  variant={selectedDocument?.key === document.key ? 'primary' : 'secondary'}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleDocument(entry);
                  }}
                >
                  {selectedDocument?.key === document.key ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                </Button>
              );
            },
          },
        ]}
        rowKey={(entry, index) => `${readEntryText(entry, ['id']) || readEntryText(entry, ['doc_no', 'docNo']) || 'doc'}-${readEntryText(entry, ['created_at', 'createdAt', 'date']) || 'date'}-${index}`}
        onRowClick={(entry) => toggleDocument(entry)}
        rowClassName={(entry) => {
          const document = getDocumentReference(entry);
          if (!document) return undefined;
          return selectedDocument?.key === document.key ? 'table-row-selected table-row-clickable' : 'table-row-clickable';
        }}
        rowTitle={(entry) => getDocumentReference(entry) ? 'اضغط لعرض تفاصيل الفاتورة' : undefined}
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
