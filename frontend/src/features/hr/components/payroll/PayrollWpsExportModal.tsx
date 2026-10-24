import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { hrApi } from '@/features/hr/api/hr.api';
import { getErrorMessage } from '@/lib/errors';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { getCurrencySymbol } from '@/lib/currencies';

interface PayrollWpsExportModalProps {
  runId: string;
  runMonth?: string;
  runName?: string;
  onClose: () => void;
}

type WpsResult = Awaited<ReturnType<typeof hrApi.generatePayrollWps>>;

export function PayrollWpsExportModal({ runId, runMonth, runName, onClose }: PayrollWpsExportModalProps) {
  const { t } = useTranslation();
  const { currencyCode, currencySymbol } = useSystemCurrency();
  const { data: settings } = useSettingsQuery();

  const [payerCrNo, setPayerCrNo] = useState('');
  const [payerBankRoutingCode, setPayerBankRoutingCode] = useState('');
  const [payerName, setPayerName] = useState('');
  const [currency, setCurrency] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [wpsData, setWpsData] = useState<WpsResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-sync with tenant settings
  useEffect(() => {
    const cur = currencyCode || (settings as any)?.currency || '';
    if (!currency) setCurrency(cur);
    if (!payerBankRoutingCode) {
      setPayerBankRoutingCode('');
    }
    if (!payerName && ((settings as any)?.companyName || (settings as any)?.storeName)) {
      setPayerName((settings as any).companyName || (settings as any).storeName);
    }
    if (!payerCrNo && ((settings as any)?.crNumber || (settings as any)?.taxNumber)) {
      setPayerCrNo((settings as any).crNumber || (settings as any).taxNumber);
    }
  }, [currencyCode, settings]);

  async function handleGenerate(overrideCur?: string) {
    setIsLoading(true);
    setError('');
    try {
      const activeCur = (overrideCur || currency || currencyCode || (settings as any)?.currency || '').trim().toUpperCase();
      const res = await hrApi.generatePayrollWps(runId, {
        payerCrNo: payerCrNo.trim() || undefined,
        payerBankRoutingCode: payerBankRoutingCode.trim() || undefined,
        payerName: payerName.trim() || undefined,
        currency: activeCur,
      });
      setWpsData(res);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر إنشاء ملف حماية الأجور (WPS / SIF).'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const cur = currencyCode || (settings as any)?.currency || '';
    if (cur) void handleGenerate(cur);
  }, [runId, currencyCode, (settings as any)?.currency]);

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
    downloadFile(bomCsv, `Payroll_Review_Only_${cleanMonth}_run${runId}.csv`, 'text/csv;charset=utf-8');
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

  const activeCurrency = currency || summary?.currency || currencyCode || '';
  const activeSymbol = getCurrencySymbol(activeCurrency as any) || currencySymbol || activeCurrency;

  const wpsStandardDesc = 'تصدير CSV للمراجعة فقط، وليس ملف حماية أجور معتمد. صيغة WPS الرسمية تحتاج ربطًا مستقلًا بمتطلبات الدولة والبنك.';


  return (
    <DialogShell
      open
      onClose={onClose}
      width="min(950px, 95vw)"
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#0f172a' }}>
        <div style={{ paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '3px', height: '18px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
            {t('hr.payroll.payroll_wps_export_modal.s0', "تصدير كشف مراجعة الرواتب البنكية (CSV غير معتمد)")}
          </h3>
        </div>
        
        {/* Header Description */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {t('hr.payroll.payroll_wps_export_modal.s1', "مسير الرواتب:")} {runName || `مسير رقم #${runId}`} {runMonth ? `(شهر ${runMonth})` : ''}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              {wpsStandardDesc}
            </div>
          </div>
        </div>

        {/* Configuration Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              {t('hr.payroll.payroll_wps_export_modal.s3', "رقم المنشأة / السجل التجاري")}
            </label>
            <input
              value={payerCrNo}
              onChange={(e) => setPayerCrNo(e.target.value)}
              placeholder="رقم السجل أو البطاقة الضريبية"
              dir="ltr"
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              {t('hr.payroll.payroll_wps_export_modal.s5', "رمز بنك المنشأة (Routing / SWIFT)")}
            </label>
            <input
              value={payerBankRoutingCode}
              onChange={(e) => setPayerBankRoutingCode(e.target.value.toUpperCase())}
              placeholder={activeCurrency === 'SAR' ? 'مثال: RIBL / RJHI / NCBK' : activeCurrency === 'EGP' ? 'مثال: NBE / MISR / CIB' : 'مثال: SWIFT Code'}
              dir="ltr"
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              {t('hr.payroll.payroll_wps_export_modal.s7', "اسم المنشأة في البنك")}
            </label>
            <input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder={t('hr.payroll.payroll_wps_export_modal.s8', "اسم الشركة / المؤسسة")}
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              {t('hr.payroll.payroll_wps_export_modal.s9', "العملة الرسمية")}
            </label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="EGP / SAR / AED / USD"
              dir="ltr"
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', fontWeight: 700 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleGenerate()}
              disabled={isLoading}
              style={{ width: '100%', height: '36px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {isLoading ? t('hr.payroll.payroll_wps_export_modal.s10', "جاري التحديث...") : t('hr.payroll.payroll_wps_export_modal.s11', "إعادة توليد الملف")}
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
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{t('hr.payroll.payroll_wps_export_modal.s12', "إجمالي صافي الرواتب")}</span>
                <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>
                  {summary.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {activeSymbol}
                </strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{t('hr.payroll.payroll_wps_export_modal.s13', "عدد الموظفين المشمولين")}</span>
                <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{summary.totalEmployees} {t('hr.payroll.payroll_wps_export_modal.s14', "موظف")}</strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{t('hr.payroll.payroll_wps_export_modal.s15', "إجمالي الأساسي")}</span>
                <strong style={{ fontSize: '1rem', color: '#334155' }}>
                  {summary.totalBaseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })} {activeSymbol}
                </strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{t('hr.payroll.payroll_wps_export_modal.s16', "إجمالي البدلات والخصومات")}</span>
                <strong style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  +{summary.totalAllowances.toFixed(2)} / -{summary.totalDeductions.toFixed(2)}
                </strong>
              </div>
              {summary.missingIbanCount > 0 ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#92400e', display: 'block' }}>{t('hr.payroll.payroll_wps_export_modal.s17', "تنبيه الحسابات البنكية")}</span>
                  <strong style={{ fontSize: '0.9rem', color: '#b45309' }}>
                    {summary.missingIbanCount} {t('hr.payroll.payroll_wps_export_modal.s18', "موظف بدون آيبان")}
                  </strong>
                </div>
              ) : null}
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                type="button"
                variant="primary"
                onClick={handleDownloadSif}
                disabled
                style={{ padding: '8px 16px', fontSize: '0.875rem', fontWeight: 600, background: '#170e5e', borderColor: '#170e5e', color: '#fff' }}
              >
                صيغة SIF غير متاحة قبل الاعتماد البنكي
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDownloadCsv}
                style={{ padding: '8px 16px', fontSize: '0.875rem', fontWeight: 600 }}
              >
                {t('hr.payroll.payroll_wps_export_modal.s20', "تحميل جدول التحويلات (.csv)")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleCopySif()}
                disabled
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                {copied ? 'تم النسخ' : 'نسخ SIF غير متاح'}
              </Button>
            </div>

            {/* Employee Bank Mapping Preview Table */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'right' }}>
                <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>{t('hr.payroll.payroll_wps_export_modal.s23', "الكود")}</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>{t('hr.payroll.payroll_wps_export_modal.s24', "اسم الموظف")}</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>{t('hr.payroll.payroll_wps_export_modal.s25', "الهوية / الإقامة")}</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>{t('hr.payroll.payroll_wps_export_modal.s26', "البنك")}</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>{t('hr.payroll.payroll_wps_export_modal.s27', "الآيبان / الحساب")}</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>{t('hr.payroll.payroll_wps_export_modal.s28', "الصافي")}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const hasBank = Boolean(rec.iban || rec.bankAccountNumber);
                    return (
                      <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', textAlign: 'center' }}>{rec.employeeNo}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 600 }}>{rec.displayName}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#64748b', textAlign: 'center' }}>{rec.nationalId}</td>
                        <td style={{ padding: '6px 10px' }}>{rec.bankName}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', direction: 'ltr', textAlign: 'center', color: hasBank ? '#0f172a' : '#dc2626' }}>
                          {rec.iban || rec.bankAccountNumber}
                        </td>
                        <td style={{ padding: '6px 10px', fontWeight: 700, color: '#10b981', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {rec.netPay.toFixed(2)} {activeSymbol}
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
            {t('hr.payroll.payroll_wps_export_modal.s29', "إغلاق")}
          </Button>
        </div>

      </div>
    </DialogShell>
  );
}
