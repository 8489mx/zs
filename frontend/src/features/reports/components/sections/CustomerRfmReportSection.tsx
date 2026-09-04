import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, type CustomerRfmItem, type CustomerRfmSegment } from '@/features/reports/api/reports.api';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { DataTable } from '@/shared/ui/data-table';
import { formatCurrency } from '@/lib/format';
import { downloadExcelFile } from '@/lib/browser';

const segmentBadges: Record<CustomerRfmSegment, { label: string; bg: string; color: string; desc: string }> = {
  champions: { label: 'أبطال / VIP 🌟', bg: '#fef3c7', color: '#92400e', desc: 'أعلى إنفاق وشراء متكرر حديث' },
  loyal: { label: 'عملاء مخلصون 💎', bg: '#e0f2fe', color: '#0369a1', desc: 'شراء منتظم ومستقر' },
  promising: { label: 'عملاء جدد / واعدون 🚀', bg: '#dcfce7', color: '#166534', desc: 'أولى عمليات الشراء حديثاً' },
  at_risk: { label: 'في خطر الفقدان ⚠️', bg: '#fee2e2', color: '#b91c1c', desc: 'انقطعوا منذ 60-120 يوم' },
  lost: { label: 'منقطعون 💤', bg: '#f1f5f9', color: '#475569', desc: 'لم يزوروا المتجر منذ أكثر من 120 يوم' },
};

export function CustomerRfmReportSection() {
  const [segmentFilter, setSegmentFilter] = useState<'all' | CustomerRfmSegment>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'customer-rfm'],
    queryFn: () => reportsApi.customerRfm(),
    staleTime: 60_000,
  });

  const items = data?.items || [];
  const summary = data?.summary;

  const filteredItems = useMemo(() => {
    return items.filter((item: CustomerRfmItem) => {
      if (segmentFilter !== 'all' && item.segment !== segmentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.phone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, segmentFilter, search]);

  const handleExportExcel = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      'اسم العميل',
      'رقم الهاتف',
      'تصنيف الشريحة',
      'عدد الفواتير',
      'إجمالي المشتريات',
      'متوسط الفاتورة (AOV)',
      'الأيام منذ آخر شراء',
      'تاريخ آخر فاتورة',
      'نقاط الولاء',
      'الرصيد الحالي',
    ];
    const rows = filteredItems.map((c) => [
      c.name,
      c.phone,
      segmentBadges[c.segment]?.label || c.segment,
      c.frequency,
      c.monetary,
      c.aov,
      c.recencyDays,
      c.lastSaleDate ? new Date(c.lastSaleDate).toLocaleDateString('ar-EG') : '—',
      c.loyaltyPoints,
      c.balance,
    ]);
    await downloadExcelFile(`تحليل_سلوك_العملاء_${today}.xlsx`, headers, rows);
  };

  const handleSendWhatsApp = (customer: CustomerRfmItem) => {
    if (!customer.phone) {
      alert('رقم هاتف العميل غير مسجل.');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const target = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

    let message = `مرحباً أستاذ/ة ${customer.name}، يسعدنا دائماً تواصلكم معنا!`;
    if (customer.segment === 'champions' || customer.segment === 'loyal') {
      message = `مرحباً أستاذ/ة ${customer.name}، تقديراً لكونك من عملائنا المميزين، يسعدنا إهداؤك كود خصم حصري لزيارتك القادمة!`;
    } else if (customer.segment === 'at_risk' || customer.segment === 'lost') {
      message = `مرحباً أستاذ/ة ${customer.name}، افتقدناك في متجرنا! جهزنا لك عروض وتخفيضات خاصة ستنال إعجابك، في انتظار زيارتك!`;
    }

    window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
        جاري تحليل سلوك العملاء ومصفوفة RFM...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#dc2626' }}>
        تعذر تحميل تقرير سلوك العملاء. <Button variant="secondary" onClick={() => refetch()}>إعادة المحاولة</Button>
      </div>
    );
  }

  return (
    <div className="page-stack" style={{ gap: '16px' }} dir="rtl">
      {/* Header Banner */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold' }}>
              👥 تحليل سلوك العملاء ومصفوفة الولاء (Customer RFM Analysis)
            </h2>
            <p className="muted small" style={{ margin: '4px 0 0 0' }}>
              تصنيف العملاء تلقائياً استناداً لمعدل التكرار (Frequency)، الحداثة (Recency)، والقيمة المنفقة (Monetary) لاستهدافهم تسويقياً.
            </p>
          </div>
          <div className="actions compact-actions">
            <Button
              onClick={handleExportExcel}
              disabled={filteredItems.length === 0}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              تصدير بيانات الحملات (Excel) 📥
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '0.8em', color: '#64748b' }}>إجمالي العملاء المشترين</div>
            <div style={{ fontSize: '1.35em', fontWeight: 'bold', color: '#0f172a' }}>{summary?.totalCustomers || 0}</div>
            <div style={{ fontSize: '0.75em', color: '#16a34a', marginTop: '2px' }}>
              معدل التكرار: {summary?.repeatRate || 0}%
            </div>
          </div>

          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '0.8em', color: '#92400e' }}>أبطال و VIP 🌟</div>
            <div style={{ fontSize: '1.35em', fontWeight: 'bold', color: '#78350f' }}>{summary?.championsCount || 0}</div>
            <div style={{ fontSize: '0.75em', color: '#92400e', marginTop: '2px' }}>أعلى قيمة وتكرار</div>
          </div>

          <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '0.8em', color: '#0369a1' }}>عملاء مخلصون 💎</div>
            <div style={{ fontSize: '1.35em', fontWeight: 'bold', color: '#075985' }}>{summary?.loyalCount || 0}</div>
            <div style={{ fontSize: '0.75em', color: '#0369a1', marginTop: '2px' }}>شراء دوري ثابت</div>
          </div>

          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '0.8em', color: '#991b1b' }}>في خطر الفقدان ⚠️</div>
            <div style={{ fontSize: '1.35em', fontWeight: 'bold', color: '#7f1d1d' }}>{summary?.atRiskCount || 0}</div>
            <div style={{ fontSize: '0.75em', color: '#991b1b', marginTop: '2px' }}>انقطعوا لأكثر من شهرين</div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '0.8em', color: '#64748b' }}>متوسط الفاتورة (AOV)</div>
            <div style={{ fontSize: '1.35em', fontWeight: 'bold', color: '#170e5e' }}>{formatCurrency(summary?.averageAov || 0)}</div>
            <div style={{ fontSize: '0.75em', color: '#64748b', marginTop: '2px' }}>
              إجمالي المبيعات: {formatCurrency(summary?.totalRevenue || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Segment Navigation Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant={segmentFilter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setSegmentFilter('all')}
          style={segmentFilter === 'all' ? { background: '#170e5e', color: '#fff' } : undefined}
        >
          الكل ({items.length})
        </Button>
        <Button
          variant={segmentFilter === 'champions' ? 'primary' : 'secondary'}
          onClick={() => setSegmentFilter('champions')}
          style={segmentFilter === 'champions' ? { background: '#170e5e', color: '#fff' } : undefined}
        >
          أبطال / VIP ({summary?.championsCount || 0})
        </Button>
        <Button
          variant={segmentFilter === 'loyal' ? 'primary' : 'secondary'}
          onClick={() => setSegmentFilter('loyal')}
          style={segmentFilter === 'loyal' ? { background: '#170e5e', color: '#fff' } : undefined}
        >
          مخلصون ({summary?.loyalCount || 0})
        </Button>
        <Button
          variant={segmentFilter === 'promising' ? 'primary' : 'secondary'}
          onClick={() => setSegmentFilter('promising')}
          style={segmentFilter === 'promising' ? { background: '#170e5e', color: '#fff' } : undefined}
        >
          جدد / واعدون ({summary?.promisingCount || 0})
        </Button>
        <Button
          variant={segmentFilter === 'at_risk' ? 'primary' : 'secondary'}
          onClick={() => setSegmentFilter('at_risk')}
          style={segmentFilter === 'at_risk' ? { background: '#170e5e', color: '#fff' } : undefined}
        >
          في خطر الفقدان ({summary?.atRiskCount || 0})
        </Button>
        <Button
          variant={segmentFilter === 'lost' ? 'primary' : 'secondary'}
          onClick={() => setSegmentFilter('lost')}
          style={segmentFilter === 'lost' ? { background: '#170e5e', color: '#fff' } : undefined}
        >
          منقطعون ({summary?.lostCount || 0})
        </Button>
      </div>

      {/* Search Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
        <Field label="بحث عن عميل">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث بالاسم أو رقم الهاتف..."
          />
        </Field>
      </div>

      {/* Customers Data Table */}
      <DataTable
        ariaLabel="جدول تحليل سلوك العملاء"
        columns={[
          {
            key: 'name',
            header: 'العميل',
            cell: (r) => (
              <div>
                <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{r.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{r.phone || 'بدون هاتف'}</div>
              </div>
            ),
          },
          {
            key: 'segment',
            header: 'الشريحة',
            cell: (r) => {
              const badge = segmentBadges[r.segment] || { label: r.segment, bg: '#f1f5f9', color: '#334155' };
              return (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: badge.bg,
                    color: badge.color,
                  }}
                  title={badge.desc}
                >
                  {badge.label}
                </span>
              );
            },
          },
          {
            key: 'recency',
            header: 'آخر زيارة',
            cell: (r) => (
              <div>
                <div style={{ fontWeight: 600, color: r.recencyDays > 90 ? '#b91c1c' : '#0f172a' }}>
                  {r.recencyDays === 0 ? 'اليوم' : `منذ ${r.recencyDays} يوم`}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {r.lastSaleDate ? new Date(r.lastSaleDate).toLocaleDateString('ar-EG') : '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'frequency',
            header: 'عدد الفواتير',
            cell: (r) => <strong>{r.frequency}</strong>,
          },
          {
            key: 'monetary',
            header: 'إجمالي المشتريات',
            cell: (r) => <span style={{ fontWeight: 'bold', color: '#170e5e' }}>{formatCurrency(r.monetary)}</span>,
          },
          {
            key: 'aov',
            header: 'متوسط الفاتورة',
            cell: (r) => formatCurrency(r.aov),
          },
          {
            key: 'loyalty',
            header: 'نقاط الولاء',
            cell: (r) => <span className="nav-pill">{r.loyaltyPoints} نقطة</span>,
          },
          {
            key: 'actions',
            header: 'إجراءات',
            cell: (r) => (
              <Button
                variant="secondary"
                onClick={() => handleSendWhatsApp(r)}
                style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                disabled={!r.phone}
              >
                واتساب 💬
              </Button>
            ),
          },
        ]}
        rows={filteredItems}
        empty={<div className="muted small" style={{ padding: '24px', textAlign: 'center' }}>لا يوجد عملاء يطابقون الفرز والبحث.</div>}
      />
    </div>
  );
}
