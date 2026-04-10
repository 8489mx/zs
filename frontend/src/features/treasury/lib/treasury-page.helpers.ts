import { downloadCsvFile } from '@/lib/browser';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { ExpenseRecord, Location } from '@/types/domain';

export type TreasuryTransactionFilter = 'all' | 'in' | 'out' | 'expense' | 'today';

export interface TreasuryTransactionRow {
  txnType?: string;
  type?: string;
  amount?: number | string;
  referenceType?: string;
  note?: string;
  branchName?: string;
  locationName?: string;
  createdByName?: string;
  createdAt?: string;
  date?: string;
}

export const initialExpenseForm = () => ({ title: '', amount: '0', note: '', date: new Date().toISOString().slice(0, 16), branchId: '', locationId: '' });
export type ExpenseFormState = ReturnType<typeof initialExpenseForm>;

export function validateExpenseForm(form: ExpenseFormState, allLocations: Location[]) {
  const errors: string[] = [];
  if (!form.title.trim()) errors.push('اكتب اسم المصروف.');
  if (!(Number(form.amount || 0) > 0)) errors.push('المبلغ يجب أن يكون أكبر من صفر.');
  if (!form.date || Number.isNaN(new Date(form.date).getTime())) errors.push('أدخل تاريخًا صالحًا للمصروف.');
  if (form.locationId) {
    const location = allLocations.find((row) => row.id === form.locationId);
    if (!location) errors.push('الموقع المختار غير صالح.');
    else if (form.branchId && location.branchId && String(location.branchId) !== String(form.branchId)) errors.push('الموقع المختار لا يتبع الفرع المحدد.');
  }
  return errors;
}

export function formatScopeLabel(row: { branchName?: string; locationName?: string }) {
  return SINGLE_STORE_MODE ? (row.locationName || 'المخزن الأساسي') : `${row.branchName || '—'} / ${row.locationName || '—'}`;
}

export function exportTransactionCsv(rows: TreasuryTransactionRow[]) {
  downloadCsvFile(
    'treasury-transactions-results.csv',
    ['txnType', 'amount', 'referenceType', 'note', ...(SINGLE_STORE_MODE ? ['storeLocation'] : ['branch', 'location']), 'createdBy', 'createdAt'],
    rows.map((row) => [
      row.txnType || row.type || '',
      row.amount,
      row.referenceType || '',
      row.note || '',
      ...(SINGLE_STORE_MODE ? [row.locationName || ''] : [row.branchName || '', row.locationName || '']),
      row.createdByName || '',
      row.createdAt || row.date || ''
    ])
  );
}

export function exportExpenseCsv(rows: ExpenseRecord[]) {
  downloadCsvFile(
    'expenses-register-results.csv',
    ['title', 'amount', 'note', ...(SINGLE_STORE_MODE ? ['storeLocation'] : ['branch', 'location']), 'createdBy', 'date'],
    rows.map((row) => [
      row.title,
      row.amount,
      row.note || '',
      ...(SINGLE_STORE_MODE ? [row.locationName || ''] : [row.branchName || '', row.locationName || '']),
      row.createdBy || '',
      row.date || ''
    ])
  );
}
