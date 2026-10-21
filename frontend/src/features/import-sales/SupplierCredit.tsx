import { toast } from '@/shared/components/system-alert';
import { useTranslation } from 'react-i18next';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useRef, useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { useSuppliersQuery } from '@/shared/hooks/use-catalog-queries';
import { useTreasury } from '@/shared/hooks/use-treasury';
import { useRecordForeignTransferMutation, useForeignTransfersQuery } from './api/shipments.api';
import {
  BuildingIcon,
  CreditCardIcon,
  GlobeIcon,
  RefreshCwIcon,
  FileTextIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';

export default function SupplierCredit() {
  const { t } = useTranslation();
  const suppliersQuery = useSuppliersQuery();
  const treasuryQuery = useTreasury({});
  const transferMutation = useRecordForeignTransferMutation();
  const transfersQuery = useForeignTransfersQuery();

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [amountEgp, setAmountEgp] = useState('');
  const [amountForeign, setAmountForeign] = useState('');
  const [notes, setNotes] = useState('');
  // Preserve the key across network retries of the *same* request.
  const transferAttempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const factories = suppliersQuery.data?.filter(s => s.metadata?.supplierType === 'factory') || [];
  // suppliers.balance is a base-currency EGP balance, NOT outstanding USD.
  const totalDebtEgp = factories.reduce((sum, s) => sum + Number(s.balance || 0), 0);
  const availableEgp = treasuryQuery.data?.summary?.net || 0;

  const egpNum = Number(amountEgp) || 0;
  const foreignNum = Number(amountForeign) || 0;
  const exchangeRate = egpNum > 0 && foreignNum > 0 ? (egpNum / foreignNum).toFixed(2) : '0.00';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    { if (!selectedSupplier) { toast.error('يرجى اختيار المصنع أو المورد الأجنبي'); return; } }
    { if (egpNum <= 0) { toast.error('المبلغ المسحوب من الخزينة يجب أن يكون أكبر من صفر'); return; } }
    { if (foreignNum <= 0) { toast.error('المبلغ المحول للمصنع يجب أن يكون أكبر من صفر'); return; } }

    const payload = { supplierId: selectedSupplier, amountEgp: egpNum, amountForeign: foreignNum, notes };
    const fingerprint = JSON.stringify(payload);
    if (!transferAttempt.current || transferAttempt.current.fingerprint !== fingerprint) {
      transferAttempt.current = { fingerprint, key: crypto.randomUUID() };
    }

    transferMutation.mutate({
      ...payload,
      idempotencyKey: transferAttempt.current.key,
    }, {
      onSuccess: () => {
        transferAttempt.current = null;
        toast.success('تم تسجيل الحوالة البنكية وتحديث مديونية المصنع والخزينة بنجاح');
        setAmountEgp('');
        setAmountForeign('');
        setNotes('');
        void suppliersQuery.refetch();
        void treasuryQuery.refetch();
        void transfersQuery.refetch();
      }
    });
  };

  const handleRefresh = () => {
    void suppliersQuery.refetch();
    void treasuryQuery.refetch();
    void transfersQuery.refetch();
  };

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader 
          title={t('import_sales.supplier_credit.s0', "محفظة سداد موردي الخارج (مديونية المصانع)")} 
          description={t('import_sales.supplier_credit.s1', "متابعة مديونيات المصانع الأجنبية وتسجيل حوالات الدفع وتدبير العملة وحساب سعر الصرف الفعلي.")}
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button 
                variant="secondary" 
                onClick={handleRefresh}
                disabled={suppliersQuery.isLoading || transfersQuery.isLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <RefreshCwIcon size={15} />
                <span>{t('import_sales.supplier_credit.s2', "تحديث البيانات")}</span>
              </Button>
            </div>
          } 
        />

        {/* KPI Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '8px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.supplier_credit.s3', "إجمالي مديونية المصانع الأجنبية")} (بالجنيه الدفتري)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {totalDebtEgp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}><CurrencySymbol /></span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
              <BuildingIcon size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.supplier_credit.s4', "الرصيد المتاح للتحويل بالخزينة")}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {formatCurrency(availableEgp)}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <CreditCardIcon size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.supplier_credit.s5', "المصانع والشركات المسجلة")}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {factories.length} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.supplier_credit.s6', "مصنع")}</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <GlobeIcon size={20} />
            </div>
          </div>
        </div>

        {/* Transfer Entry Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{t('import_sales.supplier_credit.s7', "تسجيل حوالة بنكية جديدة (تدبير عملة)")}</span>
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              {t('import_sales.supplier_credit.s8', "هذه العملية تسجل النقدية بالجنيه ورصيد المورد الدفتري بالجنيه، مع الاحتفاظ بقيمة التحويل الأجنبية بشكل مستقل. راجع التزام الـProforma بالعملة الأصلية قبل السداد.")}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  {t('import_sales.supplier_credit.s9', "المصنع / المورد الأجنبي")} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select 
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    fontSize: '0.84rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  value={selectedSupplier}
                  onChange={e => setSelectedSupplier(e.target.value)}
                  required
                  disabled={transferMutation.isPending}
                >
                  <option value="">{t('import_sales.supplier_credit.s10', "-- اختر المصنع الأجنبي --")}</option>
                  {factories.map(f => (
                    <option key={f.id} value={f.id}>{f.name} {t('import_sales.supplier_credit.s11', "(مديونية:")} {formatCurrency(f.balance || 0)})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  {t('import_sales.supplier_credit.s12', "المبلغ المسحوب من الخزينة (جنيه)")} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    fontSize: '0.84rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  value={amountEgp}
                  onChange={e => setAmountEgp(e.target.value)}
                  required
                  disabled={transferMutation.isPending}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  {t('import_sales.supplier_credit.s13', "المبلغ المحول للمصنع (عملة أجنبية $)")} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    fontSize: '0.84rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  value={amountForeign}
                  onChange={e => setAmountForeign(e.target.value)}
                  required
                  disabled={transferMutation.isPending}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  {t('import_sales.supplier_credit.s14', "سعر الصرف المحتسب للحوالة")}
                </label>
                <div style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  padding: '0 12px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  color: '#170e5e',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                }}>
                  {exchangeRate} <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', marginInlineStart: '6px' }}><CurrencySymbol /> {t('import_sales.supplier_credit.s15', "/ عملة")}</span>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  {t('import_sales.supplier_credit.s16', "ملاحظات التحويل والبنك")}
                </label>
                <input 
                  type="text" 
                  placeholder={t('import_sales.supplier_credit.s17', "رقم الحوالة البنكية، اسم البنك المنفذ، كود التحويل SWIFT، أو أي تفاصيل...")}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    fontSize: '0.84rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={transferMutation.isPending}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <Button 
                type="submit" 
                variant="primary" 
                disabled={transferMutation.isPending}
                style={{
                  height: '38px',
                  padding: '0 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <CheckCircleIcon size={16} />
                <span>{transferMutation.isPending ? t('import_sales.supplier_credit.s18', "جاري تسجيل الحوالة...") : t('import_sales.supplier_credit.s19', "تأكيد تسجيل الحوالة")}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Transfers History Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                {t('import_sales.supplier_credit.s20', "سجل حوالات المصانع الأجنبية")}
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                {t('import_sales.supplier_credit.s21', "تاريخ الحوالات والتحويلات البنكية الصادرة لموردي ومصانع الخارج")}
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
              {(transfersQuery.data || []).length} {t('import_sales.supplier_credit.s22', "حوالة مسجلة")}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}>
                  <th style={{ padding: '10px 16px', width: '140px' }}>{t('import_sales.supplier_credit.s23', "تاريخ التحويل")}</th>
                  <th style={{ padding: '10px 16px', minWidth: '180px' }}>{t('import_sales.supplier_credit.s24', "اسم المصنع / المورد")}</th>
                  <th style={{ padding: '10px 16px', width: '180px' }}>{t('import_sales.supplier_credit.s25', "المبلغ المحول (عملة أجنبية)")}</th>
                  <th style={{ padding: '10px 16px', minWidth: '220px' }}>{t('import_sales.supplier_credit.s26', "البيان والملاحظات")}</th>
                  <th style={{ padding: '10px 16px', width: '120px', textAlign: 'center' }}>{t('import_sales.supplier_credit.s27', "حالة الحوالة")}</th>
                </tr>
              </thead>
              <tbody>
                {transfersQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      {t('import_sales.supplier_credit.s28', "جاري تحميل سجل الحوالات...")}
                    </td>
                  </tr>
                ) : (transfersQuery.data || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', color: '#94a3b8' }}>
                        <FileTextIcon size={22} />
                      </div>
                      <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.88rem' }}>{t('import_sales.supplier_credit.s29', "لا توجد حوالات أجنبية مسجلة بعد")}</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>{t('import_sales.supplier_credit.s30', "قم بتسجيل حوالة جديدة من النموذج أعلاه لتدبير العملة للمصانع.")}</div>
                    </td>
                  </tr>
                ) : (
                  (transfersQuery.data || []).map((row, idx) => (
                    <tr 
                      key={row.id || idx} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '11px 16px', color: '#475569', fontWeight: 600, fontFamily: 'monospace' }}>
                        {row.payment_date ? new Date(row.payment_date).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: '#0f172a' }}>
                        {row.supplier_name || '—'}
                      </td>
                      <td style={{ padding: '11px 16px', fontWeight: 800, color: '#170e5e', fontFamily: 'monospace', fontSize: '0.86rem' }}>
                        {Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>$</span>
                      </td>
                      <td style={{ padding: '11px 16px', color: '#64748b' }}>
                        {row.note || '—'}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                          {t('import_sales.supplier_credit.s31', "تم التنفيذ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

