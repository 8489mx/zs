import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';

export default function ProfitPool() {
  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader 
          title="أرباح الشركاء (نهاية المدة)" 
          description="تصفية الحسابات وحساب الأرباح الختامية بناءً على المبيعات والتكلفة الفعلية."
        />

        <FormSection title="مجمع الأرباح المحاسبي">
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            جاري برمجة واجهة مجمع أرباح الشركاء...
          </div>
        </FormSection>
      </main>
    </div>
  );
}
