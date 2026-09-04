import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { vatDeclarationApi, type VatDeclarationData } from '@/features/sales/api/vat-declaration.api';
import { PrinterIcon } from '@/shared/components/icons/AppIcons';

export function VatDeclarationPage() {
  const [country, setCountry] = useState<'EG' | 'SA'>('EG');
  const [periodPreset, setPeriodPreset] = useState<'current_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'custom'>('current_month');
  const [customFrom, setCustomFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [customTo, setCustomTo] = useState(new Date().toISOString().split('T')[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Compute active date boundaries based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();

    if (periodPreset === 'current_month') {
      const from = new Date(year, now.getMonth(), 1).toISOString().split('T')[0];
      const to = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { from, to };
    }
    if (periodPreset === 'last_month') {
      const from = new Date(year, now.getMonth() - 1, 1).toISOString().split('T')[0];
      const to = new Date(year, now.getMonth(), 0).toISOString().split('T')[0];
      return { from, to };
    }
    if (periodPreset === 'q1') {
      return { from: `${year}-01-01`, to: `${year}-03-31` };
    }
    if (periodPreset === 'q2') {
      return { from: `${year}-04-01`, to: `${year}-06-30` };
    }
    if (periodPreset === 'q3') {
      return { from: `${year}-07-01`, to: `${year}-09-30` };
    }
    if (periodPreset === 'q4') {
      return { from: `${year}-10-01`, to: `${year}-12-31` };
    }
    return { from: customFrom, to: customTo };
  }, [periodPreset, customFrom, customTo]);

  const declarationQuery = useQuery({
    queryKey: ['vat-declaration', country, dateRange.from, dateRange.to],
    queryFn: () =>
      vatDeclarationApi.getDeclaration({
        country,
        from: dateRange.from,
        to: dateRange.to,
      }),
  });

  const data: VatDeclarationData | undefined = declarationQuery.data;

  const copyToClipboard = (text: string | number, key: string) => {
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyAllSummary = () => {
    if (!data) return;
    const summaryText = `--- إقرار ضريبة القيمة المضافة (${country === 'EG' ? 'مصر نموذج 10' : 'السعودية ZATCA'}) ---
الفترة: من ${data.period.from} إلى ${data.period.to}
المنشأة: ${data.entity.business_name} | الرقم الضريبي: ${data.entity.tax_id}
إجمالي وعاء المبيعات: ${data.output_tax.total_sales_base}
ضريبة المخرجات: ${data.output_tax.total_output_vat}
إجمالي وعاء المشتريات: ${data.input_tax.total_purchases_base}
ضريبة المدخلات المخصومة: ${data.input_tax.total_input_vat}
صافي الضريبة واجبة السداد: ${data.summary.net_vat_due} (${data.summary.status === 'payable' ? 'سداد' : 'استرداد'})
`;
    navigator.clipboard.writeText(summaryText);
    setCopiedKey('all_summary');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div dir="rtl" style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>
            الإقرار الضريبي الرسمي الجاهز (Official VAT Declaration)
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            توليد واحتساب أوعية وضريبة القيمة المضافة مطابقة لـ نموذج 10 المصري وهيئة الزكاة والضريبة والجمارك ZATCA
          </p>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={copyAllSummary}
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '9px 14px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {copiedKey === 'all_summary' ? 'تم نسخ الملخص ✓' : 'نسخ الأرقام للتقديم'}
          </Button>

          <Button
            onClick={() => window.print()}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              padding: '9px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <PrinterIcon size={16} color="#ffffff" />
            <span>طباعة الإقرار الرسمي (A4)</span>
          </Button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Country Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>نظام الإقرار:</span>
            <button
              onClick={() => setCountry('EG')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: country === 'EG' ? '#170e5e' : '#f1f5f9',
                color: country === 'EG' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🇪🇬</span> نموذج 10 (مصلحة الضرائب المصرية 14%)
            </button>
            <button
              onClick={() => setCountry('SA')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: country === 'SA' ? '#170e5e' : '#f1f5f9',
                color: country === 'SA' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🇸🇦</span> إقرار القيمة المضافة (ZATCA السعودية 15%)
            </button>
          </div>

          {/* Period Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>الفترة:</span>
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="current_month">الشهر الحالي</option>
              <option value="last_month">الشهر السابق</option>
              <option value="q1">الربع الأول (Q1)</option>
              <option value="q2">الربع الثاني (Q2)</option>
              <option value="q3">الربع الثالث (Q3)</option>
              <option value="q4">الربع الرابع (Q4)</option>
              <option value="custom">فترة مخصصة</option>
            </select>

            {periodPreset === 'custom' && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <span>إلى</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* KPI 1 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>إجمالي وعاء المبيعات الصافي</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
            {formatCurrency(data?.output_tax.total_sales_base || 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '500' }}>
            {data?.output_tax.invoices_count || 0} فاتورة صادرة بالفترة
          </div>
        </div>

        {/* KPI 2 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>ضريبة المخرجات المحصلة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>
            {formatCurrency(data?.output_tax.total_output_vat || 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '500' }}>
            النسبة المقررة: {data?.period.standard_rate_percent || (country === 'SA' ? 15 : 14)}%
          </div>
        </div>

        {/* KPI 3 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>ضريبة المدخلات القابلة للخصم</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
            {formatCurrency(data?.input_tax.total_input_vat || 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
            عن {data?.input_tax.bills_count || 0} فاتورة مشتريات محلية
          </div>
        </div>

        {/* KPI 4 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: `1px solid ${data?.summary.status === 'payable' ? '#bbf7d0' : '#bfdbfe'}`,
            borderRadius: '12px',
            padding: '18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '8px' }}>
            {data?.summary.status === 'payable' ? 'صافي الضريبة واجبة السداد' : 'رصيد دائن مرحل للاسترداد'}
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: data?.summary.status === 'payable' ? '#166534' : '#1d4ed8',
              marginBottom: '4px',
            }}
          >
            {formatCurrency(Math.abs(data?.summary.net_vat_due || 0))}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
            {data?.summary.status === 'payable' ? 'واجبة التوريد إلى مصلحة الضرائب' : 'رصيد لصالح المنشأة يُخصم من الفترة القادمة'}
          </div>
        </div>
      </div>

      {/* Official Form Presentation Card (Printable Section) */}
      <div
        id="official-vat-declaration-print"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Form Official Header */}
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                {country === 'EG'
                  ? '🇪🇬 جمهورية مصر العربية - مصلحة الضرائب المصرية'
                  : '🇸🇦 المملكة العربية السعودية - هيئة الزكاة والضريبة والجمارك (ZATCA)'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginTop: '2px' }}>
                {country === 'EG'
                  ? 'إقرار ضريبة القيمة المضافة (نموذج رقم 10 ض.ق.م)'
                  : 'إقرار ضريبة القيمة المضافة الدوري'}
              </div>
            </div>
            <div style={{ textAlign: 'left', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
              <div><strong>المنشأة:</strong> {data?.entity.business_name || '-'}</div>
              <div><strong>الرقم الضريبي:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{data?.entity.tax_id || '-'}</span></div>
              <div><strong>الفترة الضريبية:</strong> من {data?.period.from} إلى {data?.period.to}</div>
            </div>
          </div>
        </div>

        {/* Section 1: Sales / Output Tax */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>أولاً: المبيعات والمخرجات (Sales & Output Tax)</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>ضريبة المبيعات المستحقة</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', fontSize: '12px' }}>
                <th style={{ padding: '8px 12px', width: '50px' }}>البند</th>
                <th style={{ padding: '8px 12px' }}>البيان والتوصيف الرسمي</th>
                <th style={{ padding: '8px 12px', width: '160px' }}>القيمة الصافية (الوعاء)</th>
                <th style={{ padding: '8px 12px', width: '140px' }}>الضريبة المستحقة</th>
                <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>نسخ</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>1</td>
                <td style={{ padding: '10px 12px' }}>
                  التوريدات والسلع الخاضعة للنسبة الأساسية ({data?.period.standard_rate_percent || (country === 'SA' ? 15 : 14)}%)
                </td>
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                  {formatCurrency(data?.output_tax.standard_rated_base || 0)}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#166534' }}>
                  {formatCurrency(data?.output_tax.standard_rated_tax || 0)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => copyToClipboard(data?.output_tax.standard_rated_tax || 0, 'out_std')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'out_std' ? '✓' : 'نسخ'}
                  </button>
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>2</td>
                <td style={{ padding: '10px 12px' }}>
                  الصادرات أو التوريدات الخاضعة للنسبة الصفرية (0%)
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {formatCurrency(data?.output_tax.zero_rated_base || 0)}
                </td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>0.00</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => copyToClipboard(data?.output_tax.zero_rated_base || 0, 'out_zero')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'out_zero' ? '✓' : 'نسخ'}
                  </button>
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>3</td>
                <td style={{ padding: '10px 12px' }}>
                  التوريدات والسلع المعفاة من الضريبة
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {formatCurrency(data?.output_tax.exempt_base || 0)}
                </td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>0.00</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>-</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#fff7ed' }}>
                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>4</td>
                <td style={{ padding: '10px 12px' }}>
                  مردودات المبيعات وإشعارات الخصم الدائنة (يُخصم من الضريبة)
                </td>
                <td style={{ padding: '10px 12px', color: '#9a3412' }}>
                  -{formatCurrency(data?.output_tax.returns_base || 0)}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#9a3412' }}>
                  -{formatCurrency(data?.output_tax.returns_tax || 0)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => copyToClipboard(data?.output_tax.returns_tax || 0, 'out_ret')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'out_ret' ? '✓' : 'نسخ'}
                  </button>
                </td>
              </tr>

              {/* Total Output Tax */}
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '12px', color: '#0f172a' }}>
                  إجمالي ضريبة المخرجات الخاضعة للتوريد (أ)
                </td>
                <td style={{ padding: '12px' }}>
                  {formatCurrency(data?.output_tax.total_sales_base || 0)}
                </td>
                <td style={{ padding: '12px', fontSize: '15px', color: '#166534' }}>
                  {formatCurrency(data?.output_tax.total_output_vat || 0)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => copyToClipboard(data?.output_tax.total_output_vat || 0, 'out_tot')}
                    style={{ background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'out_tot' ? '✓' : 'نسخ'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Purchases / Input Tax */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>ثانياً: المشتريات والمدخلات (Purchases & Input Tax)</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>الضريبة القابلة للخصم</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', fontSize: '12px' }}>
                <th style={{ padding: '8px 12px', width: '50px' }}>البند</th>
                <th style={{ padding: '8px 12px' }}>البيان والتوصيف الرسمي</th>
                <th style={{ padding: '8px 12px', width: '160px' }}>القيمة الصافية (الوعاء)</th>
                <th style={{ padding: '8px 12px', width: '140px' }}>الضريبة القابلة للخصم</th>
                <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>نسخ</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>5</td>
                <td style={{ padding: '10px 12px' }}>
                  المشتريات المحلية الخاضعة للنسبة الأساسية ({data?.period.standard_rate_percent || (country === 'SA' ? 15 : 14)}%)
                </td>
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                  {formatCurrency(data?.input_tax.standard_rated_base || 0)}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#0f172a' }}>
                  {formatCurrency(data?.input_tax.standard_rated_tax || 0)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => copyToClipboard(data?.input_tax.standard_rated_tax || 0, 'in_std')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'in_std' ? '✓' : 'نسخ'}
                  </button>
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>6</td>
                <td style={{ padding: '10px 12px' }}>
                  المشتريات المعفاة أو غير الخاضعة للضريبة
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {formatCurrency(data?.input_tax.zero_rated_base || 0)}
                </td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>0.00</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>-</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#fff7ed' }}>
                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>7</td>
                <td style={{ padding: '10px 12px' }}>
                  مردودات المشتريات وإشعارات الإضافة (تُخصم من ضريبة المدخلات)
                </td>
                <td style={{ padding: '10px 12px', color: '#9a3412' }}>
                  -{formatCurrency(data?.input_tax.returns_base || 0)}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#9a3412' }}>
                  -{formatCurrency(data?.input_tax.returns_tax || 0)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => copyToClipboard(data?.input_tax.returns_tax || 0, 'in_ret')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'in_ret' ? '✓' : 'نسخ'}
                  </button>
                </td>
              </tr>

              {/* Total Input Tax */}
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '12px', color: '#0f172a' }}>
                  إجمالي ضريبة المدخلات المخصومة (ب)
                </td>
                <td style={{ padding: '12px' }}>
                  {formatCurrency(data?.input_tax.total_purchases_base || 0)}
                </td>
                <td style={{ padding: '12px', fontSize: '15px', color: '#0f172a' }}>
                  {formatCurrency(data?.input_tax.total_input_vat || 0)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => copyToClipboard(data?.input_tax.total_input_vat || 0, 'in_tot')}
                    style={{ background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'in_tot' ? '✓' : 'نسخ'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Final Net VAT Due / Refund Box */}
        <div
          style={{
            border: '2px solid #170e5e',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
              {country === 'EG'
                ? 'ثالثاً: صافي الضريبة المستحقة للسداد (الخانة 15 في نموذج 10)'
                : 'ثالثاً: صافي ضريبة القيمة المضافة المستحقة للسداد / الاسترداد (ZATCA)'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              معادلة الاحتساب الرسمية: ضريبة المخرجات ({formatCurrency(data?.output_tax.total_output_vat || 0)}) - ضريبة المدخلات ({formatCurrency(data?.input_tax.total_input_vat || 0)})
            </div>
          </div>

          <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                {data?.summary.status === 'payable' ? 'صافي المبلغ الواجب سداده' : 'رصيد دائن للاسترداد / الترحيل'}
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: data?.summary.status === 'payable' ? '#166534' : '#1d4ed8',
                }}
              >
                {formatCurrency(Math.abs(data?.summary.net_vat_due || 0))}
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(Math.abs(data?.summary.net_vat_due || 0), 'net_vat')}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {copiedKey === 'net_vat' ? 'تم النسخ ✓' : 'نسخ الصافي'}
            </button>
          </div>
        </div>

        {/* Official Signatures Box for A4 Print */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            textAlign: 'center',
            paddingTop: '20px',
            borderTop: '1px dashed #cbd5e1',
            marginTop: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '40px' }}>
              المحاسب المسؤول / مدخل البيانات
            </div>
            <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '40px' }}>
              المدير المالي / مراجع الحسابات
            </div>
            <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '40px' }}>
              اعتماد صاحب المنشأة / المفوض
            </div>
            <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
