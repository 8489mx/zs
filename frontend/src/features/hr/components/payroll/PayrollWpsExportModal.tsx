import { useEffect, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { hrApi } from '@/features/hr/api/hr.api';
import { getErrorMessage } from '@/lib/errors';

interface PayrollWpsExportModalProps {
  runId: string;
  runMonth?: string;
  runName?: string;
  onClose: () => void;
}

type WpsResult = Awaited<ReturnType<typeof hrApi.generatePayrollWps>>;

export function PayrollWpsExportModal({ runId, runMonth, runName, onClose }: PayrollWpsExportModalProps) {
  const [payerCrNo, setPayerCrNo] = useState('');
  const [payerBankRoutingCode, setPayerBankRoutingCode] = useState('RIBL');
  const [payerName, setPayerName] = useState('');
  const [currency, setCurrency] = useState('SAR');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [wpsData, setWpsData] = useState<WpsResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setIsLoading(true);
    setError('');
    try {
      const res = await hrApi.generatePayrollWps(runId, {
        payerCrNo: payerCrNo.trim() || undefined,
        payerBankRoutingCode: payerBankRoutingCode.trim() || undefined,
        payerName: payerName.trim() || undefined,
        currency: currency.trim() || undefined,
      });
      setWpsData(res);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر إنشاء ملف حماية الأجور (WPS / SIF).'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void handleGenerate();
  }, [runId]);

  function downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownloadSif() {
    if (!wpsData?.sifContent) return;
    const cleanMonth = (wpsData.periodMonth || runMonth || 'payroll').replace('-', '_');
    downloadFile(wpsData.sifContent, `WPS_SIF_${cleanMonth}_run${runId}.sif`, 'text/plain;charset=utf-8');
  }

  function handleDownloadCsv() {
    if (!wpsData?.csvContent) return;
    const cleanMonth = (wpsData.periodMonth || runMonth || 'payroll').replace('-', '_');
    // Prepend BOM for Excel Arabic character compatibility
    const bomCsv = '\uFEFF' + wpsData.csvContent;
    downloadFile(bomCsv, `Payroll_Bank_Transfer_${cleanMonth}_run${runId}.csv`, 'text/csv;charset=utf-8');
  }

  async function handleCopySif() {
    if (!wpsData?.sifContent) return;
    try {
      await navigator.clipboard.writeText(wpsData.sifContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  }

  const summary = wpsData?.summary;
  const records = wpsData?.records || [];

  return (
    <DialogShell
      open
      onClose={onClose}
      width="min(950px, 95vw)"
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#0f172a' }}>
        <div style={{ paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            تصدير ملف حماية الأجور والتحويلات البنكية (WPS / SIF)
          </h3>
        </div>
        
        {/* Header Description */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              مسير الرواتب: {runName || `مسير رقم #${runId}`} {runMonth ? `(شهر ${runMonth})` : ''}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              الملف المعتمد متوافق مع نظام حماية الأجور السعودي (مدد / GOSI / مسار) وبنوك الخليج ومصر (SIF Standard Interchange Format).
            </div>
          </div>
        </div>

        {/* Configuration Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              رقم المنشأة / السجل التجاري
            </label>
            <input
              value={payerCrNo}
              onChange={(e) => setPayerCrNo(e.target.value)}
              placeholder="مثال: 7001234567"
              dir="ltr"
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              رمز بنك المنشأة (Routing / SWIFT)
            </label>
            <input
              value={payerBankRoutingCode}
              onChange={(e) => setPayerBankRoutingCode(e.target.value.toUpperCase())}
              placeholder="مثال: RIBL / RJHI / NCBK"
              dir="ltr"
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              اسم المنشأة في البنك
            </label>
            <input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="اسم الشركة / المؤسسة"
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              العملة
            </label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="SAR / AED / EGP"
              dir="ltr"
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleGenerate()}
              disabled={isLoading}
              style={{ width: '100%', height: '36px', fontSize: '0.85rem' }}
            >
              {isLoading ? 'جاري التحديث...' : 'إعادة توليد الملف'}
            </Button>
          </div>
        </div>

        {error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
            {error}
          </div>
        ) : null}

        {summary ? (
          <>
            {/* KPI Summary Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>إجمالي صافي الرواتب</span>
                <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>
                  {summary.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {summary.currency}
                </strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>عدد الموظفين المشمولين</span>
                <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{summary.totalEmployees} موظف</strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>إجمالي الأساسي</span>
                <strong style={{ fontSize: '1rem', color: '#334155' }}>
                  {summary.totalBaseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })} {summary.currency}
                </strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>إجمالي البدلات والخصومات</span>
                <strong style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  +{summary.totalAllowances.toFixed(2)} / -{summary.totalDeductions.toFixed(2)}
                </strong>
              </div>
              {summary.missingIbanCount > 0 ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#92400e', display: 'block' }}>تنبيه الحسابات البنكية</span>
                  <strong style={{ fontSize: '0.9rem', color: '#b45309' }}>
                    {summary.missingIbanCount} موظف بدون آيبان
                  </strong>
                </div>
              ) : null}
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  type="button"
                  onClick={handleDownloadSif}
                  style={{ background: '#170e5e', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  تحميل ملف حماية الأجور (.sif)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDownloadCsv}
                  style={{ fontSize: '0.85rem' }}
                >
                  تحميل جدول التحويلات (.csv)
                </Button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleCopySif()}
                  style={{ fontSize: '0.8rem' }}
                >
                  {copied ? 'تم النسخ إلى الحافظة' : 'نسخ كود SIF'}
                </Button>
              </div>
            </div>

            {/* Employee Bank Mapping Preview Table */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'right' }}>
                <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>الكود</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>اسم الموظف</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>الهوية / الإقامة</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>البنك</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>الآيبان / الحساب</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>الصافي</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const hasBank = rec.iban !== 'N/A' || rec.bankAccountNumber !== 'N/A';
                    return (
                      <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{rec.employeeNo}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 600 }}>{rec.displayName}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#64748b' }}>{rec.nationalId}</td>
                        <td style={{ padding: '6px 10px' }}>{rec.bankName}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left', color: hasBank ? '#0f172a' : '#dc2626' }}>
                          {rec.iban !== 'N/A' ? rec.iban : rec.bankAccountNumber}
                        </td>
                        <td style={{ padding: '6px 10px', fontWeight: 700, color: '#10b981' }}>
                          {rec.netPay.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>

      </div>
    </DialogShell>
  );
}
