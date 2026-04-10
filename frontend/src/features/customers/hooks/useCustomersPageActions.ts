import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { customersApi } from '@/features/customers/api/customers.api';
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';

interface Params {
  search: string;
  filterMode: 'all' | 'vip' | 'debt' | 'cash';
  summary?: { totalCustomers?: number; totalBalance?: number; totalCredit?: number; vipCount?: number };
  onBulkDeleteSuccess: () => void;
}

export function useCustomersPageActions({ search, filterMode, summary, onBulkDeleteSuccess }: Params) {
  const queryClient = useQueryClient();
  const bulkDeleteMutation = useMutation({
    mutationFn: async (customerIds: string[]) => {
      const failures: string[] = [];
      for (const customerId of customerIds) {
        try {
          await customersApi.remove(customerId);
        } catch (error) {
          failures.push(error instanceof Error ? error.message : `تعذر حذف العميل ${customerId}`);
        }
      }
      if (failures.length) throw new Error(failures.join('\n'));
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeCustomers: true, includeCustomerBalances: true });
      onBulkDeleteSuccess();
    }
  });

  const exportCustomersCsv = useCallback(async () => {
    const payload = await customersApi.listAll({ q: search, filter: filterMode });
    const exportRows = payload.customers || [];
    downloadCsvFile('customers-register.csv', ['name', 'phone', 'address', 'type', 'balance', 'creditLimit'], exportRows.map((customer) => [
      customer.name,
      customer.phone || '',
      customer.address || '',
      customer.type === 'vip' ? 'vip' : 'cash',
      Number(customer.balance || 0),
      Number(customer.creditLimit || 0)
    ]));
  }, [filterMode, search]);

  const printCustomersRegister = useCallback(async () => {
    if (!summary?.totalCustomers) return;
    const payload = await customersApi.listAll({ q: search, filter: filterMode });
    const printRows = payload.customers || [];
    printHtmlDocument('سجل العملاء', `
      <h1>سجل العملاء الحالي</h1>
      <div class="meta">عدد العملاء المطابقين: ${payload.summary?.totalCustomers || printRows.length} · عملاء VIP: ${payload.summary?.vipCount || 0}</div>
      <table>
        <thead><tr><th>العميل</th><th>الهاتف</th><th>العنوان</th><th>النوع</th><th>الرصيد</th><th>حد الائتمان</th></tr></thead>
        <tbody>${printRows.map((customer) => `<tr><td>${escapeHtml(customer.name)}</td><td>${escapeHtml(customer.phone || '—')}</td><td>${escapeHtml(customer.address || '—')}</td><td>${customer.type === 'vip' ? 'مميز' : 'نقدي'}</td><td>${formatCurrency(customer.balance || 0)}</td><td>${formatCurrency(customer.creditLimit || 0)}</td></tr>`).join('')}</tbody>
      </table>
    `);
  }, [filterMode, search, summary?.totalCustomers]);

  const copyCustomersSummary = useCallback(async () => {
    if (!summary?.totalCustomers || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    const payload = await customersApi.listAll({ q: search, filter: filterMode });
    const exportRows = payload.customers || [];
    const debtRows = exportRows.filter((customer) => Number(customer.balance || 0) > 0);
    const lines = [
      'ملخص العملاء',
      `عدد العملاء: ${payload.summary?.totalCustomers || exportRows.length}`,
      `عملاء VIP: ${payload.summary?.vipCount || 0}`,
      `العملاء الذين عليهم رصيد: ${debtRows.length}`,
      `إجمالي الأرصدة: ${formatCurrency(payload.summary?.totalBalance || 0)}`,
      `إجمالي حدود الائتمان: ${formatCurrency(payload.summary?.totalCredit || 0)}`
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
  }, [filterMode, search, summary?.totalCustomers]);

  return { bulkDeleteMutation, exportCustomersCsv, printCustomersRegister, copyCustomersSummary };
}
