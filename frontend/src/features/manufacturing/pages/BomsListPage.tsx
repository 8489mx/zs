import { useTranslation } from 'react-i18next';
import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';

import { bomsApi, type BomRecord } from '@/features/manufacturing/api/boms.api';

import { systemAlert } from '@/shared/components/system-alert';

type Column<T> = { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string };

export default function BomsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [boms, setBoms] = useState<BomRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bomsApi.list()
      .then(setBoms)
      .catch(e => console.error('Failed to load boms', e))
      .finally(() => setIsLoading(false));
  }, []);

  const columns: Column<BomRecord>[] = [
    { key: 'id', header: 'رقم التركيبة', cell: (row) => <span style={{ fontWeight: '500', color: '#111827' }}>#{row.id}</span> },
    { key: 'product_name', header: 'المنتج التام', cell: (row) => row.product_name },
    { key: 'quantity', header: 'الكمية المنتجة', cell: (row) => Number(row.quantity).toLocaleString('ar-EG', { maximumFractionDigits: 2 }) },
    { key: 'expected_cost', header: 'التكلفة المتوقعة', cell: (row) => Number(row.expected_cost).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) },
    { key: 'created_at', header: 'تاريخ الإنشاء', cell: (row) => new Date(row.created_at || Date.now()).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) },
    { key: 'is_active', header: 'الحالة', cell: (row) => row.is_active ? <span style={{ color: '#10b981', fontWeight: '500' }}>{t('manufacturing.boms_list_page.s0', "نشط")}</span> : <span style={{ color: '#ef4444', fontWeight: '500' }}>{t('manufacturing.boms_list_page.s1', "غير نشط")}</span> },
    { key: 'actions', header: '', cell: (row) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="secondary" onClick={() => navigate(`/manufacturing/boms/${row.id}/edit`)} style={{ padding: '4px 8px', fontSize: '12px' }}>
          {t('manufacturing.boms_list_page.s2', "تعديل")}
        </Button>
        <Button variant="danger" onClick={() => handleDelete(row.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>
          {t('manufacturing.boms_list_page.s3', "حذف")}
        </Button>
      </div>
    )}
  ];

  const handleDelete = async (id: string | number) => {
    if (!confirm('هل أنت متأكد من حذف هذه التركيبة؟')) return;
    try {
      await bomsApi.delete(id);
      setBoms(boms.filter(b => b.id !== id));
    } catch (e) {
      console.error(e);
      systemAlert('فشل في حذف التركيبة. قد لا تكون هذه الخاصية مدعومة في الخادم حالياً.');
    }
  };

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: t('manufacturing.boms_list_page.s4', "التصنيع"), to: '/manufacturing/boms' },
        { label: t('manufacturing.boms_list_page.s5', "قوائم المكونات") }
      ]}
      title={t('manufacturing.boms_list_page.s6', "قوائم المكونات (BOMs)")}
      actions={
        <div className="actions compact-actions">
          <Button 
            type="button" 
            variant="primary"
            onClick={() => navigate('/manufacturing/boms/new')}
          >
            {t('manufacturing.boms_list_page.s7', "+ تركيبة جديدة")}
          </Button>
        </div>
      }
    >
        <section className="document-prototype-section">
          <div className="section-header-compact-row">
            <h3 className="document-prototype-section-title">{t('manufacturing.boms_list_page.s8', "قائمة معادلات التصنيع")}</h3>
            <div className="section-header-actions-group">
              <span className="nav-pill" style={{ fontSize: '11px', padding: '2px 8px' }}>{t('manufacturing.boms_list_page.s9', "العدد:")} {boms.length}</span>
            </div>
          </div>
          <div className="page-stack">
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>{t('manufacturing.boms_list_page.s10', "جاري التحميل...")}</div>
          ) : boms.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
               {t('manufacturing.boms_list_page.s11', "لا توجد تركيبات مسجلة بعد.")}
               <br />
               <Button variant="secondary" style={{ marginTop: '16px' }} onClick={() => navigate('/manufacturing/boms/new')}>{t('manufacturing.boms_list_page.s12', "إضافة أول تركيبة")}</Button>
            </div>
          ) : (
            <DataTable 
              rows={boms} 
              columns={columns} 
              rowKey={(r) => String(r.id)}
            />
          )}
          </div>
        </section>
    </ManufacturingLayout>
  );
}
