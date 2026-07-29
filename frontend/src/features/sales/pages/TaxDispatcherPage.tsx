import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaxIntegrationSection } from '@/features/settings/components/workspace-sections/TaxIntegrationSection';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { taxInvoicesApi, type EtaPendingInvoice } from '@/features/sales/api/tax-invoices.api';
import { DataTable } from '@/shared/ui/data-table';
import { FormSection } from '@/shared/components/form-section';
import { PageHeader } from '@/shared/components/page-header';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatCurrency } from '@/lib/format';

import { systemAlert } from '@/shared/components/system-alert';

export function TaxDispatcherPage() {
  const invoicesQuery = useQuery({
    queryKey: ['tax-invoices-pending'],
    queryFn: taxInvoicesApi.getPendingInvoices
  });

  const invoices = invoicesQuery.data || [];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'invoices' | 'settings'>('invoices');

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: (ids: string[]) => taxInvoicesApi.submitInvoices(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tax-invoices-pending'] });
      setSelectedIds(new Set());
      systemAlert(res.message || 'تم الإرسال بنجاح', 'عملية ناجحة', 'success');
    },
    onError: (err: any) => {
      systemAlert(err?.message || 'حدث خطأ أثناء الإرسال', 'خطأ', 'error');
    }
  });

  const handleSend = () => {
    if (selectedIds.size === 0) return;
    submitMutation.mutate(Array.from(selectedIds));
  };

  const columns = [
    { key: 'id', header: 'رقم الفاتورة', className: 'text-center', cell: (inv: EtaPendingInvoice) => inv.doc_no || inv.id },
    { key: 'date', header: 'التاريخ', className: 'text-center', cell: (inv: EtaPendingInvoice) => new Date(inv.created_at).toLocaleDateString('en-GB') },
    { key: 'customer', header: 'العميل', className: 'text-center', cell: (inv: EtaPendingInvoice) => inv.customer_name || 'عميل نقدي' },
    { key: 'amount', header: 'الإجمالي', className: 'text-center', cell: (inv: EtaPendingInvoice) => formatCurrency(inv.total) },
    { 
      key: 'status', 
      header: 'حالة الإرسال', 
      className: 'text-center',
      cell: () => <span className="badge badge-warning">معلقة (Pending)</span> 
    }
  ];

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader 
          title="لوحة الإرسال الضريبي (ETA)" 
          description="تحديد الفواتير المعلقة وإرسالها لمصلحة الضرائب المصرية."
          actions={(
            <div className="actions compact-actions">
              <Button 
                disabled={selectedIds.size === 0 || activeTab !== 'invoices' || submitMutation.isPending}
                onClick={handleSend}
              >
                {submitMutation.isPending ? 'جاري الإرسال...' : `إرسال (${selectedIds.size}) للضرائب`}
              </Button>
            </div>
          )}
        />

        <div className="filter-chip-row toolbar-chip-row" style={{ marginBottom: '16px' }}>
          <Button 
            variant={activeTab === 'invoices' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('invoices')}
          >
            الفواتير المعلقة
          </Button>
          <Button 
            variant={activeTab === 'settings' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('settings')}
          >
            إعدادات النشاط الضريبية
          </Button>
        </div>

        {activeTab === 'invoices' ? (
          <FormSection title="قائمة الفواتير غير المرسلة" className="workspace-panel p-0">
            <QueryFeedback 
              isLoading={invoicesQuery.isLoading} 
              isError={invoicesQuery.isError} 
              error={invoicesQuery.error}
            >
              <DataTable 
                columns={columns} 
                rows={invoices} 
                rowKey={(inv) => inv.id} 
                rowTitle={() => 'تفاصيل الفاتورة'}
                selection={{
                  selectedKeys: Array.from(selectedIds),
                  onChange: (keys) => setSelectedIds(new Set(keys))
                }}
                empty={<EmptyState title="لا توجد فواتير معلقة" hint="جميع فواتيرك تم إرسالها لمصلحة الضرائب بنجاح." />}
              />
            </QueryFeedback>
          </FormSection>
        ) : (
          <div className="workspace-panel" style={{ padding: '24px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <TaxIntegrationSection />
          </div>
        )}
      </main>
    </div>
  );
}
