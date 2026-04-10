import { useCallback } from 'react';
import { cashDrawerApi } from '@/lib/api/cash-drawer';
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

export function useCashDrawerPageActions(params: { search: string; shiftFilter: 'all' | 'open' | 'closed' | 'variance' | 'today'; totalItems: number; openShiftCount: number; totalVariance: number; }) {
  const { search, shiftFilter, totalItems, openShiftCount, totalVariance } = params;

  const exportShiftRows = useCallback(async () => {
    if (!totalItems) return;
    const payload = await cashDrawerApi.listAll({ search, filter: shiftFilter });
    downloadCsvFile(
      'cash-drawer-shifts-results.csv',
      SINGLE_STORE_MODE
        ? ['docNo', 'status', 'location', 'openingCash', 'expectedCash', 'countedCash', 'variance', 'openedBy', 'createdAt']
        : ['docNo', 'status', 'branch', 'location', 'openingCash', 'expectedCash', 'countedCash', 'variance', 'openedBy', 'createdAt'],
      payload.rows.map((row) => (SINGLE_STORE_MODE
        ? [row.docNo || row.id, row.status || '', row.locationName || '', Number(row.openingCash || 0), Number(row.expectedCash || 0), Number(row.countedCash || 0), Number(row.variance || 0), row.openedByName || '', row.createdAt || '']
        : [row.docNo || row.id, row.status || '', row.branchName || '', row.locationName || '', Number(row.openingCash || 0), Number(row.expectedCash || 0), Number(row.countedCash || 0), Number(row.variance || 0), row.openedByName || '', row.createdAt || '']))
    );
  }, [search, shiftFilter, totalItems]);

  const printShiftRows = useCallback(async () => {
    if (!totalItems) return;
    const payload = await cashDrawerApi.listAll({ search, filter: shiftFilter });
    printHtmlDocument(
      'الورديات والدرج النقدي',
      `
      <h1>الورديات والدرج النقدي</h1>
      <div class="meta">عدد الورديات المطابقة: ${payload.rows.length} · الورديات المفتوحة: ${openShiftCount} · إجمالي الفروقات: ${formatCurrency(totalVariance)}</div>
      <table>
        <thead><tr>${SINGLE_STORE_MODE ? '<th>رقم الوردية</th><th>الحالة</th><th>المخزن</th><th>رصيد الفتح</th><th>المتوقع</th><th>المعدود</th><th>الفرق</th><th>فتح بواسطة</th><th>التاريخ</th>' : '<th>رقم الوردية</th><th>الحالة</th><th>الفرع</th><th>الموقع</th><th>رصيد الفتح</th><th>المتوقع</th><th>المعدود</th><th>الفرق</th><th>فتح بواسطة</th><th>التاريخ</th>'}</tr></thead>
        <tbody>${payload.rows.map((row) => (SINGLE_STORE_MODE
          ? `<tr><td>${escapeHtml(row.docNo || row.id)}</td><td>${escapeHtml(row.status === 'open' ? 'مفتوحة' : 'مغلقة')}</td><td>${escapeHtml(row.locationName || '—')}</td><td>${formatCurrency(row.openingCash || 0)}</td><td>${formatCurrency(row.expectedCash || 0)}</td><td>${formatCurrency(row.countedCash || 0)}</td><td>${formatCurrency(row.variance || 0)}</td><td>${escapeHtml(row.openedByName || '—')}</td><td>${escapeHtml(formatDate(row.createdAt))}</td></tr>`
          : `<tr><td>${escapeHtml(row.docNo || row.id)}</td><td>${escapeHtml(row.status === 'open' ? 'مفتوحة' : 'مغلقة')}</td><td>${escapeHtml(row.branchName || '—')}</td><td>${escapeHtml(row.locationName || '—')}</td><td>${formatCurrency(row.openingCash || 0)}</td><td>${formatCurrency(row.expectedCash || 0)}</td><td>${formatCurrency(row.countedCash || 0)}</td><td>${formatCurrency(row.variance || 0)}</td><td>${escapeHtml(row.openedByName || '—')}</td><td>${escapeHtml(formatDate(row.createdAt))}</td></tr>`)).join('')}</tbody>
      </table>
    `
    );
  }, [openShiftCount, search, shiftFilter, totalItems, totalVariance]);

  return { exportShiftRows, printShiftRows };
}
