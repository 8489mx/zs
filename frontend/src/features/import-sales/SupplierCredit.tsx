import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';

export default function SupplierCredit() {
  const stats = [
    { key: 'debt_usd', label: 'المديونية المتبقية', value: '$125,000' },
    { key: 'available', label: 'الرصيد المتاح للتحويل بالدرج', value: formatCurrency(450000) },
    { key: 'debt_local', label: 'يعادل تقريباً (بسعر الصرف الحالي)', value: formatCurrency(125000 * 49.20) },
  ] as const;

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader 
          title="محفظة سداد المصنع الصيني" 
          description="متابعة ديون الصين وتحويلات الدفعات وتقليل المديونية."
          actions={
            <div className="actions compact-actions">
              <Button variant="primary">كشف حساب المصنع</Button>
            </div>
          } 
        />
        <StatsGrid items={stats} />

        <FormSection 
          title="تسجيل حوالة بنكية جديدة" 
          description="هذه العملية ستقوم بخصم الرصيد من الدرج وتقليل مديونية الصين بناءً على سعر الصرف الفعلي للبنك."
        >
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            جاري برمجة نموذج إدخال الحوالة البنكية...
          </div>
        </FormSection>
      </main>
    </div>
  );
}
