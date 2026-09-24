import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaxIntegrationSection } from '@/shared/components/TaxIntegrationSection';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import {
  taxInvoicesApi,
  type EtaPendingInvoice,
  type ZatcaPendingInvoice,
} from '@/features/sales/api/tax-invoices.api';
import { DataTable } from '@/shared/ui/data-table';
import { FormSection } from '@/shared/components/form-section';
import { PageHeader } from '@/shared/components/page-header';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatCurrency } from '@/lib/format';

import { systemAlert } from '@/shared/components/system-alert';
import { DialogShell } from '@/shared/components/dialog-shell';
import { XIcon, DownloadIcon, ShieldCheckIcon } from '@/shared/components/icons/AppIcons';

export function TaxDispatcherPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'zatca' | 'eta' | 'settings'>('zatca');

  // ─── Egypt ETA Queries & Mutations ─────────────────────────────────────────
  const etaInvoicesQuery = useQuery({
    queryKey: ['tax-invoices-pending'],
    queryFn: taxInvoicesApi.getPendingInvoices,
    enabled: activeTab === 'eta',
  });

  const etaInvoices = etaInvoicesQuery.data || [];
  const [selectedEtaIds, setSelectedEtaIds] = useState<Set<string>>(new Set());

  const etaSubmitMutation = useMutation({
    mutationFn: (ids: string[]) => taxInvoicesApi.submitInvoices(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tax-invoices-pending'] });
      setSelectedEtaIds(new Set());
      systemAlert(res.message || 'تم إرسال الفواتير لمصلحة الضرائب المصرية بنجاح', 'عملية ناجحة', 'success');
    },
    onError: (err: any) => {
      systemAlert(err?.message || 'حدث خطأ أثناء الإرسال لمصلحة الضرائب المصرية', 'خطأ', 'error');
    },
  });

  const handleSendEta = () => {
    if (selectedEtaIds.size === 0) return;
    etaSubmitMutation.mutate(Array.from(selectedEtaIds));
  };

  // ─── Saudi ZATCA Queries & Mutations ───────────────────────────────────────
  const zatcaInvoicesQuery = useQuery({
    queryKey: ['zatca-invoices-pending'],
    queryFn: taxInvoicesApi.getZatcaPendingInvoices,
    enabled: activeTab === 'zatca',
  });

  const zatcaInvoices = zatcaInvoicesQuery.data || [];
  const [selectedZatcaIds, setSelectedZatcaIds] = useState<Set<string>>(new Set());

  const zatcaSubmitMutation = useMutation({
    mutationFn: (ids: string[]) => taxInvoicesApi.submitZatcaInvoicesBulk(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['zatca-invoices-pending'] });
      setSelectedZatcaIds(new Set());
      const data = res.data;
      const msg = `تم إتمام الإرسال: ${data.cleared} معتمدة (Clearance)، ${data.reported} مُبلغة (Reporting)${data.rejected > 0 ? `، ${data.rejected} مرفوضة` : ''}${data.failed > 0 ? `، ${data.failed} فشل` : ''}.`;
      systemAlert(msg, data.success ? 'نجاح الاعتماد والإبلاغ' : 'تنبيه نتيجة الإرسال', data.success ? 'success' : 'warning');
    },
    onError: (err: any) => {
      systemAlert(err?.message || 'حدث خطأ أثناء الاتصال بهيئة الزكاة والضريبة والجمارك', 'خطأ', 'error');
    },
  });

  const handleSendZatca = () => {
    if (selectedZatcaIds.size === 0) return;
    zatcaSubmitMutation.mutate(Array.from(selectedZatcaIds));
  };

  const handleSingleZatcaSubmit = async (saleId: string | number) => {
    try {
      const res = await taxInvoicesApi.submitZatcaInvoice(saleId);
      queryClient.invalidateQueries({ queryKey: ['zatca-invoices-pending'] });
      const item = res.data;
      systemAlert(item.message, item.success ? 'نجاح الإرسال' : 'تنبيه زاتكا', item.success ? 'success' : 'error');
    } catch (err: any) {
      systemAlert(err?.message || 'فشل إرسال الفاتورة لهيئة الزكاة', 'خطأ', 'error');
    }
  };

  // ─── ZATCA Inspection Modal State ──────────────────────────────────────────
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

  const handleInspectZatca = async (invId: string | number, docNo?: string | null) => {
    setSelectedZatcaModal({ open: true, loading: true, invoiceNo: docNo || String(invId) });
    try {
      const res = await taxInvoicesApi.getZatcaPackage(invId);
      setSelectedZatcaModal({
        open: true,
        loading: false,
        invoiceNo: docNo || String(invId),
        data: res.data,
      });
    } catch (err: any) {
      setSelectedZatcaModal({
        open: true,
        loading: false,
        invoiceNo: docNo || String(invId),
        error: err?.message || 'تعذر توليد حزمة زاتكا التشفيرية',
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

  // ─── ZATCA Table Columns ───────────────────────────────────────────────────
  const zatcaColumns = [
    {
      key: 'doc_no',
      header: 'رقم الفاتورة',
      className: 'text-center',
      cell: (inv: ZatcaPendingInvoice) => (
        <span style={{ fontWeight: 700, color: '#170e5e' }}>{inv.doc_no || `#${inv.id}`}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'التاريخ',
      className: 'text-center',
      cell: (inv: ZatcaPendingInvoice) => new Date(inv.created_at).toLocaleDateString('en-GB'),
    },
    {
      key: 'customer',
      header: 'العميل',
      className: 'text-center',
      cell: (inv: ZatcaPendingInvoice) => inv.customer_name || 'عميل نقدي',
    },
    {
      key: 'type',
      header: 'نوع الفاتورة',
      className: 'text-center',
      cell: (inv: ZatcaPendingInvoice) =>
        inv.zatca_invoice_type === 'standard' ? (
          <span
            className="badge"
            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
          >
            ضريبية (B2B Clearance)
          </span>
        ) : (
          <span
            className="badge"
            style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
          >
            مبسطة (B2C Reporting)
          </span>
        ),
    },
    {
      key: 'total',
      header: 'الإجمالي (شامل الضريبة)',
      className: 'text-center',
      cell: (inv: ZatcaPendingInvoice) => (
        <div>
          <div style={{ fontWeight: 700 }}>{formatCurrency(inv.total)}</div>
          <small style={{ color: '#64748b', fontSize: '11px' }}>
            الضريبة: {formatCurrency(inv.tax_amount)}
          </small>
        </div>
      ),
    },
    {
      key: 'zatca_status',
      header: 'حالة زاتكا',
      className: 'text-center',
      cell: (inv: ZatcaPendingInvoice) => {
        const s = inv.zatca_status;
        if (s === 'cleared') {
          return (
            <span
              className="badge"
              style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}
            >
              معتمدة (CLEARED)
            </span>
          );
        }
        if (s === 'reported') {
          return (
            <span
              className="badge"
              style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}
            >
              مُبلغة (REPORTED)
            </span>
          );
        }
        if (s === 'warning') {
          return (
            <span
              className="badge"
              style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
            >
              تحذير (WARNING)
            </span>
          );
        }
        if (s === 'rejected') {
          return (
            <span
              className="badge"
              style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
            >
              مرفوضة (REJECTED)
            </span>
          );
        }
        if (s === 'failed') {
          return (
            <span
              className="badge"
              style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
            >
              فشل الاتصال
            </span>
          );
        }
        if (s === 'generated') {
          return (
            <span
              className="badge"
              style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
            >
              تم التوليد (جاهزة)
            </span>
          );
        }
        return (
          <span
            className="badge"
            style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}
          >
            غير مرسلة
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'الإجراءات والاعتماد',
      className: 'text-center',
      cell: (inv: ZatcaPendingInvoice) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleInspectZatca(inv.id, inv.doc_no)}
            style={{ height: '30px', fontSize: '11.5px', padding: '0 8px' }}
          >
            فحص الحزمة
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleSingleZatcaSubmit(inv.id)}
            style={{ height: '30px', fontSize: '11.5px', padding: '0 10px', background: '#170e5e' }}
          >
            إرسال / تخليص
          </Button>
        </div>
      ),
    },
  ];

  // ─── ETA Table Columns ─────────────────────────────────────────────────────
  const etaColumns = [
    {
      key: 'id',
      header: 'رقم الفاتورة',
      className: 'text-center',
      cell: (inv: EtaPendingInvoice) => inv.doc_no || inv.id,
    },
    {
      key: 'date',
      header: 'التاريخ',
      className: 'text-center',
      cell: (inv: EtaPendingInvoice) => new Date(inv.created_at).toLocaleDateString('en-GB'),
    },
    {
      key: 'customer',
      header: 'العميل',
      className: 'text-center',
      cell: (inv: EtaPendingInvoice) => inv.customer_name || 'عميل نقدي',
    },
    {
      key: 'amount',
      header: 'الإجمالي',
      className: 'text-center',
      cell: (inv: EtaPendingInvoice) => formatCurrency(inv.total),
    },
    {
      key: 'status',
      header: 'حالة الإرسال',
      className: 'text-center',
      cell: () => <span className="badge badge-warning">معلقة (Pending)</span>,
    },
    {
      key: 'actions',
      header: 'حزمة الفاتورة',
      className: 'text-center',
      cell: (inv: EtaPendingInvoice) => (
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleInspectZatca(inv.id, inv.doc_no)}
          style={{ height: '30px', fontSize: '11px', padding: '0 8px' }}
        >
          فحص UBL
        </Button>
      ),
    },
  ];

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader
          title="لوحة الإرسال والربط الضريبي والفوترة الإلكترونية (ZATCA / ETA)"
          description="الربط السحابي المباشر، الإبلاغ والتخليص اللحظي مع هيئة الزكاة والضريبة والجمارك السعودية ومصلحة الضرائب المصرية."
          actions={
            <div className="actions compact-actions">
              {activeTab === 'zatca' && (
                <Button
                  disabled={selectedZatcaIds.size === 0 || zatcaSubmitMutation.isPending}
                  onClick={handleSendZatca}
                  style={{ background: '#170e5e', color: '#ffffff' }}
                >
                  <ShieldCheckIcon size={15} style={{ marginLeft: '6px' }} />
                  {zatcaSubmitMutation.isPending
                    ? 'جاري الاعتماد والإبلاغ...'
                    : `إرسال وإبلاغ هيئة الزكاة (${selectedZatcaIds.size})`}
                </Button>
              )}
              {activeTab === 'eta' && (
                <Button
                  disabled={selectedEtaIds.size === 0 || etaSubmitMutation.isPending}
                  onClick={handleSendEta}
                >
                  {etaSubmitMutation.isPending
                    ? 'جاري الإرسال...'
                    : `إرسال (${selectedEtaIds.size}) للضرائب (ETA)`}
                </Button>
              )}
            </div>
          }
        />

        <div className="filter-chip-row toolbar-chip-row" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <Button
            variant={activeTab === 'zatca' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('zatca')}
            style={activeTab === 'zatca' ? { background: '#170e5e', color: '#ffffff' } : {}}
          >
            المملكة العربية السعودية (ZATCA Phase 2)
          </Button>
          <Button
            variant={activeTab === 'eta' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('eta')}
            style={activeTab === 'eta' ? { background: '#170e5e', color: '#ffffff' } : {}}
          >
            جمهورية مصر العربية (ETA)
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('settings')}
            style={activeTab === 'settings' ? { background: '#170e5e', color: '#ffffff' } : {}}
          >
            إعدادات وحدات الربط وأجهزة EGS
          </Button>
        </div>

        {activeTab === 'zatca' ? (
          <FormSection
            title="فواتير المبيعات غير المعتمدة / بانتظار الإرسال لهيئة الزكاة السعودية"
            className="workspace-panel p-0"
          >
            <QueryFeedback
              isLoading={zatcaInvoicesQuery.isLoading}
              isError={zatcaInvoicesQuery.isError}
              error={zatcaInvoicesQuery.error}
            >
              <DataTable
                columns={zatcaColumns}
                rows={zatcaInvoices}
                rowKey={(inv) => inv.id}
                rowTitle={() => 'تفاصيل الفاتورة'}
                selection={{
                  selectedKeys: Array.from(selectedZatcaIds),
                  onChange: (keys) => setSelectedZatcaIds(new Set(keys)),
                }}
                empty={
                  <EmptyState
                    title="لا توجد فواتير معلقة لهيئة الزكاة"
                    hint="جميع فواتيرك تم تشفيرها وإبلاغها أو تخليصها بنجاح مع هيئة الزكاة والضريبة والجمارك (ZATCA)."
                  />
                }
              />
            </QueryFeedback>
          </FormSection>
        ) : activeTab === 'eta' ? (
          <FormSection
            title="قائمة الفواتير غير المرسلة لمصلحة الضرائب المصرية"
            className="workspace-panel p-0"
          >
            <QueryFeedback
              isLoading={etaInvoicesQuery.isLoading}
              isError={etaInvoicesQuery.isError}
              error={etaInvoicesQuery.error}
            >
              <DataTable
                columns={etaColumns}
                rows={etaInvoices}
                rowKey={(inv) => inv.id}
                rowTitle={() => 'تفاصيل الفاتورة'}
                selection={{
                  selectedKeys: Array.from(selectedEtaIds),
                  onChange: (keys) => setSelectedEtaIds(new Set(keys)),
                }}
                empty={
                  <EmptyState
                    title="لا توجد فواتير معلقة"
                    hint="جميع فواتيرك تم إرسالها لمصلحة الضرائب المصرية بنجاح."
                  />
                }
              />
            </QueryFeedback>
          </FormSection>
        ) : (
          <div
            className="workspace-panel"
            style={{
              padding: '24px',
              backgroundColor: 'var(--surface-color)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <TaxIntegrationSection />
          </div>
        )}

        {/* Inspect ZATCA Modal */}
        <DialogShell
          open={selectedZatcaModal.open}
          onClose={() => setSelectedZatcaModal({ open: false, loading: false })}
          width="min(850px, 95vw)"
          ariaLabel="فحص حزمة الفاتورة ZATCA"
        >
          <div
            style={{
              background: '#ffffff',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
              direction: 'rtl',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#170e5e' }}>
                فحص حزمة الفاتورة التشفيرية (ZATCA Phase 2) - #{selectedZatcaModal.invoiceNo}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedZatcaModal({ open: false, loading: false })}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
                aria-label="إغلاق"
              >
                <XIcon size={16} />
              </button>
            </div>

            {selectedZatcaModal.loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                جاري تشفير وتوليد حزمة زاتكا (UBL 2.1 والختم الرقمي وسلاسل الـ PIH)...
              </div>
            ) : selectedZatcaModal.error ? (
              <div
                style={{
                  padding: '12px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: '6px',
                }}
              >
                {selectedZatcaModal.error}
              </div>
            ) : selectedZatcaModal.data ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    بصمة الفاتورة الرقمية (Invoice SHA-256 Hash):
                  </div>
                  <code style={{ fontSize: '11px', wordBreak: 'break-all', color: '#0284c7' }}>
                    {selectedZatcaModal.data.invoiceHash}
                  </code>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    التوقيع الرقمي بجهاز الـ EGS (ECDSA Cryptographic Signature):
                  </div>
                  <code style={{ fontSize: '11px', wordBreak: 'break-all', color: '#16a34a' }}>
                    {selectedZatcaModal.data.digitalSignature}
                  </code>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    رمز الاستجابة السريع المرحلة الثانية (Phase 2 TLV 8-Tags QR):
                  </div>
                  <code style={{ fontSize: '11px', wordBreak: 'break-all', color: '#475569' }}>
                    {selectedZatcaModal.data.qrCodeBase64.substring(0, 100)}...
                  </code>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleDownloadXml}
                    style={{ background: '#170e5e', color: '#ffffff' }}
                  >
                    <DownloadIcon size={14} style={{ marginLeft: '6px' }} />
                    تحميل ملف XML (UBL 2.1)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedZatcaModal({ open: false, loading: false })}
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogShell>
      </main>
    </div>
  );
}
