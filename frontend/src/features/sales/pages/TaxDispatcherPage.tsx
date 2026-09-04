import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaxIntegrationSection } from '@/shared/components/TaxIntegrationSection';
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

  const [selectedZatcaModal, setSelectedZatcaModal] = useState<{
    open: boolean;
    loading: boolean;
    invoiceNo?: string;
    data?: {
      ublXml: string;
      invoiceHash: string;
      qrCodeBase64: string;
      digitalSignature: string;
      publicKey: string;
    };
    error?: string;
  }>({ open: false, loading: false });

  const handleInspectZatca = async (inv: EtaPendingInvoice) => {
    setSelectedZatcaModal({ open: true, loading: true, invoiceNo: inv.doc_no || inv.id });
    try {
      const res = await taxInvoicesApi.getZatcaPackage(inv.id);
      setSelectedZatcaModal({
        open: true,
        loading: false,
        invoiceNo: inv.doc_no || inv.id,
        data: res.data
      });
    } catch (err: any) {
      setSelectedZatcaModal({
        open: true,
        loading: false,
        invoiceNo: inv.doc_no || inv.id,
        error: err?.message || 'تعذر توليد حزمة زاتكا'
      });
    }
  };

  const handleDownloadXml = () => {
    if (!selectedZatcaModal.data?.ublXml) return;
    const blob = new Blob([selectedZatcaModal.data.ublXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zatca-${selectedZatcaModal.invoiceNo || 'invoice'}.xml`;
    a.click();
    URL.revokeObjectURL(url);
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
    },
    {
      key: 'actions',
      header: 'حزمة ZATCA',
      className: 'text-center',
      cell: (inv: EtaPendingInvoice) => (
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleInspectZatca(inv)}
          style={{ height: '30px', fontSize: '11px', padding: '0 8px' }}
        >
          فحص ZATCA 🇸🇦
        </Button>
      )
    }
  ];

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader 
          title="لوحة الإرسال والربط الضريبي (ETA / ZATCA)" 
          description="إرسال الفواتير لمصلحة الضرائب المصرية أو توليد حزم زاتكا (المرحلة الثانية) للسعودية."
          actions={(
            <div className="actions compact-actions">
              <Button 
                disabled={selectedIds.size === 0 || activeTab !== 'invoices' || submitMutation.isPending}
                onClick={handleSend}
              >
                {submitMutation.isPending ? 'جاري الإرسال...' : `إرسال (${selectedIds.size}) للضرائب (ETA)`}
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

        {/* ZATCA Phase 2 Modal */}
        {selectedZatcaModal.open && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  🇸🇦 فحص حزمة الفاتورة (ZATCA Phase 2) - #{selectedZatcaModal.invoiceNo}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedZatcaModal({ open: false, loading: false })}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {selectedZatcaModal.loading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  جاري تشفير وتوليد حزمة زاتكا (UBL 2.1 والختم الرقمي)...
                </div>
              ) : selectedZatcaModal.error ? (
                <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px' }}>
                  {selectedZatcaModal.error}
                </div>
              ) : selectedZatcaModal.data ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#475569', marginBottom: '4px' }}>بصمة الفاتورة (Invoice SHA-256 Hash):</div>
                    <code style={{ fontSize: '11px', wordBreak: 'break-all', color: '#0284c7' }}>
                      {selectedZatcaModal.data.invoiceHash}
                    </code>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#475569', marginBottom: '4px' }}>الختم والتوقيع الرقمي (ECDSA Cryptographic Stamp):</div>
                    <code style={{ fontSize: '11px', wordBreak: 'break-all', color: '#16a34a' }}>
                      {selectedZatcaModal.data.digitalSignature}
                    </code>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#475569', marginBottom: '4px' }}>رمز الاستجابة السريع (Phase 2 TLV QR):</div>
                    <code style={{ fontSize: '11px', wordBreak: 'break-all', color: '#475569' }}>
                      {selectedZatcaModal.data.qrCodeBase64.substring(0, 100)}...
                    </code>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <Button type="button" variant="primary" onClick={handleDownloadXml}>
                      تحميل ملف XML (UBL 2.1)
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setSelectedZatcaModal({ open: false, loading: false })}>
                      إغلاق
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

