import { useCallback } from 'react';
import { treasuryApi } from '@/features/treasury/api/treasury.api';
import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { ExpenseRecord, TreasuryTransaction } from '@/types/domain';

function printTransactionsRegister(rows: TreasuryTransaction[]) {
  const body = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.txnType || row.type || '—')}</td>
      <td>${formatCurrency(Number(row.amount || 0))}</td>
      <td>${escapeHtml(row.note || '—')}</td>
      <td>${escapeHtml(row.referenceType || '—')}</td>
      <td>${SINGLE_STORE_MODE ? escapeHtml(row.locationName || 'المخزن الأساسي') : `${escapeHtml(row.branchName || '—')} / ${escapeHtml(row.locationName || '—')}`}</td>
      <td>${escapeHtml(formatDate(row.createdAt || row.date))}</td>
    </tr>
  `).join('');
  printHtmlDocument('سجل حركات الخزينة', `
    <h1>سجل حركات الخزينة</h1>
    <div class="meta">عدد الحركات المطابقة: ${rows.length}</div>
    <table>
      <thead><tr><th>النوع</th><th>المبلغ</th><th>البيان</th><th>المرجع</th><th>${SINGLE_STORE_MODE ? 'المخزن' : 'الفرع/المخزن'}</th><th>التاريخ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="6">لا توجد حركات</td></tr>'}</tbody>
    </table>
  `);
}

function printExpensesRegister(rows: ExpenseRecord[]) {
  const body = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.title || '—')}</td>
      <td>${formatCurrency(Number(row.amount || 0))}</td>
      <td>${escapeHtml(row.note || '—')}</td>
      <td>${SINGLE_STORE_MODE ? escapeHtml(row.locationName || 'المخزن الأساسي') : `${escapeHtml(row.branchName || '—')} / ${escapeHtml(row.locationName || '—')}`}</td>
      <td>${escapeHtml(row.createdBy || '—')}</td>
      <td>${escapeHtml(formatDate(row.date))}</td>
    </tr>
  `).join('');
  printHtmlDocument('سجل المصروفات', `
    <h1>سجل المصروفات</h1>
    <div class="meta">عدد المصروفات المطابقة: ${rows.length}</div>
    <table>
      <thead><tr><th>المصروف</th><th>المبلغ</th><th>الملاحظات</th><th>${SINGLE_STORE_MODE ? 'المخزن' : 'الفرع/المخزن'}</th><th>المنفذ</th><th>التاريخ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="6">لا توجد مصروفات</td></tr>'}</tbody>
    </table>
  `);
}

function printTreasurySummary(rows: TreasuryTransaction[], expenses: ExpenseRecord[], totals: { cashIn: number; cashOut: number; net: number; expenseCount: number; expenseTotal: number }) {
  const transactionsRows = rows.slice(0, 18).map((row) => `
    <tr>
      <td>${escapeHtml(row.txnType || row.note || '—')}</td>
      <td>${escapeHtml(row.referenceType || '—')}</td>
      <td>${formatCurrency(Number(row.amount || 0))}</td>
      <td>${escapeHtml(formatDate(row.createdAt || row.date))}</td>
    </tr>
  `).join('');
  const expensesRows = expenses.slice(0, 12).map((row) => `
    <tr>
      <td>${escapeHtml(row.title || '—')}</td>
      <td>${formatCurrency(Number(row.amount || 0))}</td>
      <td>${escapeHtml((row.locationName || 'المخزن الأساسي'))}</td>
      <td>${escapeHtml(formatDate(row.date))}</td>
    </tr>
  `).join('');

  printHtmlDocument('ملخص الخزينة', `
    <h1>ملخص الخزينة</h1>
    <div class="meta">تاريخ الطباعة: ${escapeHtml(formatDate(new Date().toISOString()))}</div>
    <div class="totals">
      <div><strong>داخل الخزينة:</strong> ${formatCurrency(totals.cashIn)}</div>
      <div><strong>خارج الخزينة:</strong> ${formatCurrency(totals.cashOut)}</div>
      <div><strong>صافي الخزينة:</strong> ${formatCurrency(totals.net)}</div>
      <div><strong>إجمالي المصروفات:</strong> ${formatCurrency(totals.expenseTotal)}</div>
      <div><strong>عدد المصروفات:</strong> ${totals.expenseCount}</div>
    </div>
    <h2>الحركات المطابقة</h2>
    <table>
      <thead><tr><th>النوع</th><th>المرجع</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
      <tbody>${transactionsRows || '<tr><td colspan="4">لا توجد حركات</td></tr>'}</tbody>
    </table>
    <h2>المصروفات المطابقة</h2>
    <table>
      <thead><tr><th>المصروف</th><th>المبلغ</th><th>${SINGLE_STORE_MODE ? 'المخزن' : 'الفرع'}</th><th>التاريخ</th></tr></thead>
      <tbody>${expensesRows || '<tr><td colspan="4">لا توجد مصروفات</td></tr>'}</tbody>
    </table>
  `);
}

export function useTreasuryPageActions() {
  const printMatchingTransactions = useCallback(async (search: string, filter: 'all' | 'today' | 'in' | 'out' | 'expense') => {
    const payload = await treasuryApi.listAllTransactions({ search, filter });
    printTransactionsRegister(payload.rows || []);
  }, []);

  const printMatchingExpenses = useCallback(async (search: string) => {
    const payload = await treasuryApi.listAllExpenses({ search });
    printExpensesRegister(payload.rows || []);
  }, []);

  const printMatchingTreasurySummary = useCallback(async (
    search: string,
    filter: 'all' | 'today' | 'in' | 'out' | 'expense',
    expenseSearch: string,
    transactionSummary: { cashIn: number; cashOut: number; net: number },
    expenseSummary: { totalItems: number; totalAmount: number }
  ) => {
    const [transactionsPayload, expensesPayload] = await Promise.all([
      treasuryApi.listAllTransactions({ search, filter }),
      treasuryApi.listAllExpenses({ search: expenseSearch }),
    ]);
    printTreasurySummary(transactionsPayload.rows || [], expensesPayload.rows || [], {
      ...transactionSummary,
      expenseCount: expenseSummary.totalItems,
      expenseTotal: expenseSummary.totalAmount,
    });
  }, []);


  const exportTransactions = useCallback(async (search: string, filter: 'all' | 'today' | 'in' | 'out' | 'expense') => {
    const payload = await treasuryApi.listAllTransactions({ search, filter });
    return payload.rows || [];
  }, []);

  const exportExpenses = useCallback(async (search: string) => {
    const payload = await treasuryApi.listAllExpenses({ search });
    return payload.rows || [];
  }, []);

  return { printMatchingTransactions, printMatchingExpenses, printMatchingTreasurySummary, exportTransactions, exportExpenses };
}
