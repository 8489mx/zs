import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';

export default function ShipmentsManager() {
  const stats = [
    { key: 'sea', label: 'حاويات في البحر', value: 1 },
    { key: 'customs', label: 'حاويات في الجمارك', value: 1 },
    { key: 'arrived', label: 'تم حساب تكلفتها', value: 1 },
  ] as const;

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader 
          title="إدارة الحاويات والشحنات" 
          description="متابعة حركة الحاويات من الصين حتى الوصول للمخازن وحساب التكلفة."
          actions={
            <div className="actions compact-actions">
              <Button variant="primary">إضافة حاوية جديدة</Button>
            </div>
          } 
        />
        <StatsGrid items={stats} />

        <FormSection 
          title="الحاويات النشطة" 
          description="قائمة بالحاويات التي لم تصل للمخازن بعد."
          actions={<span className="nav-pill">3 حاويات</span>}
        >
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            جاري برمجة جدول الحاويات...
          </div>
        </FormSection>
      </main>
    </div>
  );
}
