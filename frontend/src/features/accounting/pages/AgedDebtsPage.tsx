import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { DownloadIcon, PrinterIcon, SearchIcon } from '@/shared/components/icons/AppIcons';
import {
  financialReportsApi,
  type AgedDebtsSummary,
  type AgedPartnerRow,
} from '@/features/accounting/api/accounting.api';

export function AgedDebtsPage() {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low' | 'current'>('all');

  const receivablesQuery = useQuery({
    queryKey: ['aged-receivables', asOfDate],
    queryFn: () => financialReportsApi.agedReceivables({ asOfDate }),
    enabled: activeTab === 'receivables',
  });

  const payablesQuery = useQuery({
    queryKey: ['aged-payables', asOfDate],
    queryFn: () => financialReportsApi.agedPayables({ asOfDate }),
    enabled: activeTab === 'payables',
  });

  const activeQuery = activeTab === 'receivables' ? receivablesQuery : payablesQuery;
  const data: AgedDebtsSummary | undefined = activeQuery.data;

  const filteredPartners = (data?.partners || []).filter((p) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = p.partnerName.toLowerCase().includes(q);
      const matchPhone = p.phone ? p.phone.includes(q) : false;
      if (!matchName && !matchPhone) return false;
    }
    if (riskFilter !== 'all' && p.riskLevel !== riskFilter) {
      return false;
    }
    return true;
  });

  const handleExportCsv = () => {
    if (!data) return;
    const isRec = activeTab === 'receivables';
    const lines: string[] = [
      `الاسم,الهاتف,إجمالي الرصيد,حالي (غير مستحق),1-30 يوم,31-60 يوم,61-90 يوم,+90 يوم (حرج),أقدم حركة,أيام التأخير,مستوى المخاطرة`,
    ];

    for (const p of filteredPartners) {
      lines.push(
        `"${p.partnerName}","${p.phone || ''}",${p.totalBalance},${p.currentAmount},${p.days1To30},${p.days31To60},${p.days61To90},${p.days91Plus},"${p.oldestInvoiceDate || ''}",${p.oldestInvoiceDays || 0},"${p.riskLevel}"`,
      );
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `aged-${isRec ? 'receivables' : 'payables'}-${asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRiskBadge = (level: AgedPartnerRow['riskLevel']) => {
    switch (level) {
      case 'critical':
        return <span style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>حرج (+90)</span>;
      case 'high':
        return <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>عالي (61-90)</span>;
      case 'medium':
        return <span style={{ backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>متوسط (31-60)</span>;
      case 'low':
        return <span style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>منخفض (1-30)</span>;
      default:
        return <span style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>حالي (ساري)</span>;
    }
  };

  return (
    <div className="page-stack page-shell aged-debts-workspace" dir="rtl" style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            تقرير أعمار الديون التحليلي
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Aged Partner Balances — تحليل فترات الاستحقاق والتأخير للعملاء والموردين لتعزيز التدفقات والتحصيل
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button type="button" variant="secondary" onClick={handleExportCsv} disabled={!data}>
            <DownloadIcon size={14} style={{ marginInlineEnd: '6px' }} />
            تصدير CSV
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()} disabled={!data}>
            <PrinterIcon size={14} style={{ marginInlineEnd: '6px' }} />
            طباعة
          </Button>
        </div>
      </div>

      {/* Main Tabs Card */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('receivables')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === 'receivables' ? '2px solid #170e5e' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'receivables' ? '#170e5e' : '#ffffff',
            color: activeTab === 'receivables' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          أعمار ديون العملاء (المدينون - Receivables)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payables')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === 'payables' ? '2px solid #170e5e' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'payables' ? '#170e5e' : '#ffffff',
            color: activeTab === 'payables' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          أعمار ديون الموردين (الدائنون - Payables)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              احتساب الأعمار حتى تاريخ
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              style={{ width: '100%', height: '36px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              البحث بالاسم أو رقم الهاتف
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="ابحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', height: '36px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 32px 0 10px', fontSize: '0.875rem' }}
              />
              <span style={{ position: 'absolute', right: '10px', top: '10px', color: '#94a3b8' }}>
                <SearchIcon size={16} />
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              تصفية حسب شريحة المخاطرة
            </label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              style={{ width: '100%', height: '36px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', fontSize: '0.875rem' }}
            >
              <option value="all">كافة الشرائح</option>
              <option value="critical">الحرجة فقط (+90 يوم)</option>
              <option value="high">عالية التأخير (61-90 يوم)</option>
              <option value="medium">متوسطة التأخير (31-60 يوم)</option>
              <option value="low">منخفضة (1-30 يوم)</option>
              <option value="current">الحالية (غير متأخرة)</option>
            </select>
          </div>

          <div>
            <Button
              type="button"
              variant="primary"
              onClick={() => void activeQuery.refetch()}
              style={{ height: '36px', width: '100%', backgroundColor: '#170e5e', color: '#fff', fontWeight: 700 }}
            >
              تحديث البيانات
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading & Error feedback */}
      {activeQuery.isLoading && (
        <Card style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          جاري احتساب أعمار الديون وتقسيم الشرائح الزمنية...
        </Card>
      )}

      {data && (
        <>
          {/* 6 Aging Bucket Highlight Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <Card style={{ padding: '14px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>إجمالي المديونيات</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {formatCurrency(data.totalBalance)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                عدد: {data.totalPartnersCount} {activeTab === 'receivables' ? 'عميل' : 'مورد'}
              </div>
            </Card>

            <Card style={{ padding: '14px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>حالي (ساري / غير متأخر)</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                {formatCurrency(data.totalCurrent)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                {data.totalBalance > 0 ? `${((data.totalCurrent / data.totalBalance) * 100).toFixed(1)}%` : '0%'}
              </div>
            </Card>

            <Card style={{ padding: '14px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1' }}>1 - 30 يوماً</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                {formatCurrency(data.total1To30)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                {data.totalBalance > 0 ? `${((data.total1To30 / data.totalBalance) * 100).toFixed(1)}%` : '0%'}
              </div>
            </Card>

            <Card style={{ padding: '14px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854d0e' }}>31 - 60 يوماً</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ca8a04', marginTop: '4px' }}>
                {formatCurrency(data.total31To60)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                {data.totalBalance > 0 ? `${((data.total31To60 / data.totalBalance) * 100).toFixed(1)}%` : '0%'}
              </div>
            </Card>

            <Card style={{ padding: '14px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c2410c' }}>61 - 90 يوماً</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>
                {formatCurrency(data.total61To90)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                {data.totalBalance > 0 ? `${((data.total61To90 / data.totalBalance) * 100).toFixed(1)}%` : '0%'}
              </div>
            </Card>

            <Card style={{ padding: '14px', backgroundColor: '#fff5f5', border: '1px solid #fecaca', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b' }}>+90 يوماً (حرجة / متعثرة)</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                {formatCurrency(data.total91Plus)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '4px' }}>
                {data.totalBalance > 0 ? `${((data.total91Plus / data.totalBalance) * 100).toFixed(1)}%` : '0%'}
              </div>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card style={{ padding: '0', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto' }}>
            {filteredPartners.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                لا توجد مديونيات مطابقة لمعايير البحث الحالية
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <th style={{ padding: '12px 14px' }}>{activeTab === 'receivables' ? 'اسم العميل' : 'اسم المورد'}</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left' }}>إجمالي الرصيد</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left' }}>حالي</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left' }}>1-30 يوم</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left' }}>31-60 يوم</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left' }}>61-90 يوم</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: '#dc2626' }}>+90 يوم</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>أقدم حركة</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>مستوى المخاطرة</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>إجراءات التحصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((row) => (
                    <tr
                      key={row.partnerId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: row.riskLevel === 'critical' ? '#fffdfd' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <strong style={{ display: 'block', color: '#0f172a' }}>{row.partnerName}</strong>
                        {row.phone && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.phone}</span>}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(row.totalBalance)}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'left', color: row.currentAmount > 0 ? '#16a34a' : '#94a3b8' }}>
                        {formatCurrency(row.currentAmount)}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'left', color: row.days1To30 > 0 ? '#0284c7' : '#94a3b8' }}>
                        {formatCurrency(row.days1To30)}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'left', color: row.days31To60 > 0 ? '#ca8a04' : '#94a3b8' }}>
                        {formatCurrency(row.days31To60)}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'left', color: row.days61To90 > 0 ? '#ea580c' : '#94a3b8' }}>
                        {formatCurrency(row.days61To90)}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'left', fontWeight: row.days91Plus > 0 ? 800 : 400, color: row.days91Plus > 0 ? '#dc2626' : '#94a3b8' }}>
                        {formatCurrency(row.days91Plus)}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                        {row.oldestInvoiceDate ? (
                          <>
                            <div>{row.oldestInvoiceDate}</div>
                            <span style={{ color: (row.oldestInvoiceDays || 0) > 60 ? '#dc2626' : '#475569' }}>
                              ({row.oldestInvoiceDays} يوم)
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        {getRiskBadge(row.riskLevel)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {activeTab === 'receivables' && row.whatsAppUrl ? (
                          <a
                            href={row.whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              backgroundColor: '#25D366',
                              color: '#ffffff',
                            }}
                          >
                            تذكير واتساب
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
