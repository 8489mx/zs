import { useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { useProfitReportQuery } from './api/shipments.api';
import { formatCurrency } from '@/lib/format';
import { ManagePartnersDialog } from './ManagePartnersDialog';

export default function ProfitPool() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isManagePartnersOpen, setIsManagePartnersOpen] = useState(false);

  const { data, isLoading, refetch } = useProfitReportQuery(startDate, endDate);

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader 
          title="مجمع أرباح الشركاء (تصفية الحسابات)" 
          description="حساب صافي الأرباح عن فترة معينة وتوزيعها بناءً على المبيعات والتكلفة الفعلية والمصاريف."
          actions={
            <Button variant="secondary" onClick={() => setIsManagePartnersOpen(true)}>
              إدارة الشركاء والنسب
            </Button>
          }
        />

        <FormSection title="تحديد الفترة الزمنية">
          <div style={{ display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group">
              <label>من تاريخ</label>
              <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>إلى تاريخ</label>
              <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="form-group">
              <Button variant="primary" onClick={() => refetch()}>تحديث التقرير</Button>
            </div>
          </div>
        </FormSection>

        {isLoading ? (
          <div style={{ padding: '2rem' }}>جاري حساب الأرباح...</div>
        ) : data ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="stat-card" style={{ padding: '1.5rem', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--gray-200)', textAlign: 'center' }}>
                <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>إجمالي الإيرادات (المبيعات)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(data.totalRevenue)}</div>
              </div>
              <div className="stat-card" style={{ padding: '1.5rem', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--gray-200)', textAlign: 'center' }}>
                <div style={{ color: 'var(--red-600)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>إجمالي التكلفة (بضاعة + مصاريف تشغيل)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--red-600)' }}>
                  {formatCurrency(data.totalCost + data.totalExpenses)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                  (بضاعة: {formatCurrency(data.totalCost)} | مصاريف: {formatCurrency(data.totalExpenses)})
                </div>
              </div>
              <div className="stat-card" style={{ padding: '1.5rem', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--gray-200)', textAlign: 'center' }}>
                <div style={{ color: 'var(--green-700)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>صافي الربح المتاح للتوزيع</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--green-700)' }}>
                  {formatCurrency(data.netProfitPool)}
                </div>
              </div>
            </div>

            <FormSection title="جدول توزيع الأرباح على الشركاء">
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', background: 'var(--white)' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>اسم الشريك</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>نسبة الشراكة (%)</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>قيمة الربح المستحقة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.partnerShares.map(partner => (
                    <tr key={partner.partnerId} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                      <td style={{ padding: '1rem' }}><strong>{partner.name}</strong></td>
                      <td style={{ padding: '1rem' }}>{partner.percentage}%</td>
                      <td style={{ padding: '1rem', color: 'var(--green-700)', fontWeight: 'bold' }}>
                        {formatCurrency(partner.shareAmount)}
                      </td>
                    </tr>
                  ))}
                  {data.partnerShares.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                        لا يوجد شركاء مسجلين في النظام.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </FormSection>
          </>
        ) : null}
      </main>

      {isManagePartnersOpen && (
        <ManagePartnersDialog 
          open={isManagePartnersOpen} 
          onClose={() => setIsManagePartnersOpen(false)} 
        />
      )}
    </div>
  );
}
