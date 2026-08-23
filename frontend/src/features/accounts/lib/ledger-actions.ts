import { downloadExcelFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CustomerLedgerEntry, SupplierLedgerEntry } from '@/types/domain';
import { formatLedgerEntryType } from '@/features/accounts/utils/ledger-format.utils';

type Entry = CustomerLedgerEntry | SupplierLedgerEntry;

export function exportLedgerCsv(filename: string, entries: Entry[]) {
  if (!entries.length) return;
  downloadExcelFile(
    filename,
    ['نوع الحركة', 'الملاحظة', 'التاريخ', 'مدين', 'دائن', 'الرصيد بعد الحركة'],
    entries.map((entry) => [
      formatLedgerEntryType(entry.entry_type, entry.note),
      entry.note || '',
      entry.created_at || entry.date || '',
      Number(entry.debit || 0),
      Number(entry.credit || 0),
      Number(entry.balance_after || 0)
    ])
  );
}

export async function copyLedgerSummary(title: string, ownerName: string, entries: Entry[], fetchAll?: () => Promise<Entry[]>) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
  const sourceEntries = fetchAll ? await fetchAll() : entries;
  if (!sourceEntries.length) return;
  const content = [
    title,
    `الاسم: ${ownerName || '—'}`,
    `عدد القيود: ${sourceEntries.length}`,
    '',
    ...sourceEntries.map((entry) => `${formatLedgerEntryType(entry.entry_type, entry.note)} | ${entry.note || '—'} | ${formatDate(entry.created_at || entry.date)} | مدين: ${formatCurrency(entry.debit || 0)} | دائن: ${formatCurrency(entry.credit || 0)}`)
  ].join('\n');
  await navigator.clipboard.writeText(content);
}

export async function printLedgerSummary(title: string, ownerName: string, entries: Entry[], fetchAll?: () => Promise<Entry[]>) {
  const sourceEntries = fetchAll ? await fetchAll() : entries;
  if (!sourceEntries.length) return;
  printHtmlDocument(
    title,
    `
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">الاسم: ${escapeHtml(ownerName || '—')} · عدد القيود: ${sourceEntries.length}</div>
    <table>
      <thead><tr><th>النوع</th><th>الملاحظة</th><th>التاريخ</th><th>مدين</th><th>دائن</th></tr></thead>
      <tbody>${sourceEntries
        .map(
          (entry) =>
            `<tr><td>${escapeHtml(formatLedgerEntryType(entry.entry_type, entry.note))}</td><td>${escapeHtml(entry.note || '—')}</td><td>${escapeHtml(
              formatDate(entry.created_at || entry.date)
            )}</td><td>${formatCurrency(entry.debit || 0)}</td><td>${formatCurrency(entry.credit || 0)}</td></tr>`
        )
        .join('')}</tbody>
    </table>
  `
  );
}
