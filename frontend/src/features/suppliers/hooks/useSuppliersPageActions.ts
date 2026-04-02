import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { suppliersApi } from '@/features/suppliers/api/suppliers.api';
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';

interface Params {
  search: string;
  filterMode: 'all' | 'debt' | 'withNotes';
  summary?: { totalSuppliers?: number; totalBalance?: number; withNotes?: number };
  onBulkDeleteSuccess: () => void;
}

export function useSuppliersPageActions({ search, filterMode, summary, onBulkDeleteSuccess }: Params) {
  const queryClient = useQueryClient();
  const bulkDeleteMutation = useMutation({
    mutationFn: async (supplierIds: string[]) => {
      const failures: string[] = [];
      for (const supplierId of supplierIds) {
        try {
          await suppliersApi.remove(supplierId);
        } catch (error) {
          failures.push(error instanceof Error ? error.message : `تعذر حذف المورد ${supplierId}`);
        }
      }
      if (failures.length) throw new Error(failures.join('\n'));
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
      onBulkDeleteSuccess();
    }
  });

  const exportSuppliersCsv = useCallback(async () => {
    const payload = await suppliersApi.listAll({ q: search, filter: filterMode });
    const exportRows = payload.suppliers || [];
    downloadCsvFile('suppliers-register.csv', ['name', 'phone', 'address', 'balance', 'notes'], exportRows.map((supplier) => [
      supplier.name,
      supplier.phone || '',
      supplier.address || '',
      Number(supplier.balance || 0),
      supplier.notes || ''
    ]));
  }, [filterMode, search]);

  const printSuppliersRegister = useCallback(async () => {
    if (!summary?.totalSuppliers) return;
    const payload = await suppliersApi.listAll({ q: search, filter: filterMode });
    const printRows = payload.suppliers || [];
    printHtmlDocument('سجل الموردين', `
      <h1>سجل الموردين الحالي</h1>
      <div class="meta">عدد الموردين المطابقين: ${payload.summary?.totalSuppliers || printRows.length} · لديهم ملاحظات: ${payload.summary?.withNotes || 0}</div>
      <table>
        <thead><tr><th>المورد</th><th>الهاتف</th><th>العنوان</th><th>الرصيد</th><th>ملاحظات</th></tr></thead>
        <tbody>${printRows.map((supplier) => `<tr><td>${escapeHtml(supplier.name)}</td><td>${escapeHtml(supplier.phone || '—')}</td><td>${escapeHtml(supplier.address || '—')}</td><td>${formatCurrency(supplier.balance || 0)}</td><td>${escapeHtml(supplier.notes || '—')}</td></tr>`).join('')}</tbody>
      </table>
    `);
  }, [filterMode, search, summary?.totalSuppliers]);

  const copySuppliersSummary = useCallback(async () => {
    if (!summary?.totalSuppliers || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    const payload = await suppliersApi.listAll({ q: search, filter: filterMode });
    const exportRows = payload.suppliers || [];
    const debtRows = exportRows.filter((supplier) => Number(supplier.balance || 0) > 0);
    const lines = [
      'ملخص الموردين',
      `عدد الموردين: ${payload.summary?.totalSuppliers || exportRows.length}`,
      `الموردون الذين عليهم رصيد: ${debtRows.length}`,
      `لديهم ملاحظات: ${payload.summary?.withNotes || 0}`,
      `إجمالي الأرصدة: ${formatCurrency(payload.summary?.totalBalance || 0)}`
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
  }, [filterMode, search, summary?.totalSuppliers]);

  return { bulkDeleteMutation, exportSuppliersCsv, printSuppliersRegister, copySuppliersSummary };
}
