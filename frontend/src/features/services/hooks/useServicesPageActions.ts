import { useCallback } from 'react';
import { servicesApi } from '@/features/services/api/services.api';
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import type { ServiceRecord } from '@/types/domain';

function printServicesRegister(rows: ServiceRecord[], meta?: { totalItems?: number; totalAmount?: number }) {
  const body = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.name || '—')}</td>
      <td>${formatCurrency(Number(row.amount || 0))}</td>
      <td>${escapeHtml(row.notes || '—')}</td>
      <td>${escapeHtml(row.createdByName || '—')}</td>
      <td>${escapeHtml(formatDate(row.serviceDate))}</td>
    </tr>
  `).join('');
  const total = Number(meta?.totalAmount ?? rows.reduce((sum, row) => sum + Number(row.amount || 0), 0));
  const totalItems = Number(meta?.totalItems ?? rows.length);
  printHtmlDocument('سجل الخدمات', `
    <h1>سجل الخدمات</h1>
    <div class="meta">عدد الخدمات المطابقة: ${totalItems} · الإجمالي: ${formatCurrency(total)}</div>
    <table>
      <thead><tr><th>الخدمة</th><th>القيمة</th><th>الملاحظات</th><th>المنفذ</th><th>التاريخ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="5">لا توجد خدمات</td></tr>'}</tbody>
    </table>
  `);
}

export function useServicesPageActions(params: { search: string; filter: 'all' | 'today' | 'high' | 'notes' }) {
  const { search, filter } = params;
  const exportServices = useCallback(async () => {
    const payload = await servicesApi.listAll({ search, filter });
    const exportRows = payload.services || [];
    downloadCsvFile('services-register.csv', ['name', 'amount', 'notes', 'createdBy', 'serviceDate'], exportRows.map((row) => [
      row.name,
      row.amount,
      row.notes || '',
      row.createdByName || '',
      row.serviceDate || ''
    ]));
  }, [filter, search]);

  const printServices = useCallback(async () => {
    const payload = await servicesApi.listAll({ search, filter });
    printServicesRegister(payload.services || [], { totalItems: payload.summary?.totalItems, totalAmount: payload.summary?.totalAmount });
  }, [filter, search]);

  return { exportServices, printServices };
}
