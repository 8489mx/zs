import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';

export default function MerchantDebts() {
  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader 
          title="ديون التجار والدفعات" 
          description="إدارة حسابات تجار الجملة، ومتابعة المسحوبات والدفعات النقدية المقدمة."
        />

        <FormSection title="سجل التجار">
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            جاري برمجة واجهة ديون التجار والدفعات...
          </div>
        </FormSection>
      </main>
    </div>
  );
}
