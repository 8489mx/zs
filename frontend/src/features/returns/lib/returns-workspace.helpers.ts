import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import { returnsApi } from '@/features/returns/api/returns.api';
import type { ReturnRecord } from '@/types/domain';

export type ReturnFormState = {
  type: 'sale' | 'purchase';
  invoiceId: string;
  settlementMode: 'refund' | 'store_credit';
  refundMethod: 'cash' | 'card';
  note: string;
};

export function createEmptyReturnForm(): ReturnFormState {
  return { type: 'sale', invoiceId: '', settlementMode: 'refund', refundMethod: 'cash', note: '' };
}

export function getReturnTypeValue(row: ReturnRecord) {
  return row.returnType || row.type || 'sale';
}

export function getReturnDateValue(row: ReturnRecord) {
  return row.createdAt || row.date || '';
}

export function returnTypeLabel(row: ReturnRecord) {
  return getReturnTypeValue(row) === 'purchase' ? 'مرتجع شراء' : 'مرتجع بيع';
}

export function printReturnsRegister(rows: ReturnRecord[], meta?: { totalItems?: number; totalAmount?: number }) {
  const body = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.docNo || row.id)}</td>
      <td>${escapeHtml(returnTypeLabel(row))}</td>
      <td>${escapeHtml(row.productName || '—')}</td>
      <td>${escapeHtml(String(row.qty || 0))}</td>
      <td>${formatCurrency(Number(row.total || 0))}</td>
      <td>${escapeHtml(formatDate(getReturnDateValue(row)))}</td>
    </tr>
  `).join('');
  const total = Number(meta?.totalAmount ?? rows.reduce((sum, row) => sum + Number(row.total || 0), 0));
  const totalItems = Number(meta?.totalItems ?? rows.length);
  printHtmlDocument('سجل المرتجعات', `
    <h1>سجل المرتجعات</h1>
    <div class="meta">عدد المستندات المطابقة: ${totalItems} · الإجمالي: ${formatCurrency(total)}</div>
    <table>
      <thead><tr><th>المستند</th><th>النوع</th><th>الصنف</th><th>الكمية</th><th>الإجمالي</th><th>التاريخ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="6">لا توجد بيانات</td></tr>'}</tbody>
    </table>
  `);
}

export function printReturnRecord(row: ReturnRecord) {
  printHtmlDocument(`مستند مرتجع ${row.docNo || row.id}`, `
    <div class="meta-grid">
      <div class="meta-box"><strong>النوع</strong><span>${escapeHtml(returnTypeLabel(row))}</span></div>
      <div class="meta-box"><strong>رقم المستند</strong><span>${escapeHtml(row.docNo || row.id)}</span></div>
      <div class="meta-box"><strong>التاريخ</strong><span>${escapeHtml(formatDate(getReturnDateValue(row)))}</span></div>
      <div class="meta-box"><strong>الإجمالي</strong><span>${formatCurrency(Number(row.total || 0))}</span></div>
    </div>
    <table>
      <thead><tr><th>الصنف</th><th>الكمية</th><th>القيمة</th><th>ملاحظات</th></tr></thead>
      <tbody><tr><td>${escapeHtml(row.productName || '—')}</td><td>${escapeHtml(String(row.qty || 0))}</td><td>${formatCurrency(Number(row.total || 0))}</td><td>${escapeHtml(row.note || '—')}</td></tr></tbody>
    </table>
  `, { subtitle: 'نسخة مخصصة لطباعة المرتجع ومراجعة سبب التنفيذ' });
}

export async function exportReturnsCsv(params: { search: string; filter: 'all' | 'sales' | 'purchase' | 'today' }) {
  const payload = await returnsApi.listAll(params);
  const exportRows = payload.returns || [];
  downloadCsvFile('returns-register.csv', ['docNo', 'type', 'productName', 'qty', 'total', 'note', 'createdAt'], exportRows.map((row) => [
    row.docNo || '',
    getReturnTypeValue(row),
    row.productName || '',
    row.qty,
    row.total,
    row.note || '',
    getReturnDateValue(row)
  ]));
}
