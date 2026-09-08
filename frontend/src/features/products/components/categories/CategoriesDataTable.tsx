import React from 'react';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';

interface CategoryItem {
  id: string | number;
  name: string;
  productCount?: number;
}

interface CategoriesDataTableProps {
  categories: CategoryItem[];
  isLoading: boolean;
  onEdit: (cat: CategoryItem) => void;
  onTransferProducts: (cat: CategoryItem) => void;
  onTransferWarehouse: (cat: CategoryItem) => void;
  onDelete: (cat: CategoryItem) => void;
}

export const CategoriesDataTable: React.FC<CategoriesDataTableProps> = ({
  categories,
  isLoading,
  onEdit,
  onTransferProducts,
  onTransferWarehouse,
  onDelete,
}) => {
  if (isLoading) {
    return <div className="muted small" style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="muted" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
        لا توجد أقسام متطابقة مع البحث.
      </div>
    );
  }

  return (
    <DataTable
      rows={categories}
      rowKey={(r) => String(r.id)}
      density="regular"
      columns={[
        {
          key: 'name',
          header: 'اسم القسم',
          cell: (row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary, #170c5c)',
                flexShrink: 0,
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
              </div>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{row.name}</strong>
            </div>
          )
        },
        {
          key: 'productCount',
          header: 'عدد الأصناف',
          cell: (row) => {
            const count = row.productCount || 0;
            const isZero = count === 0;
            return (
              <span style={{
                fontWeight: 700,
                fontSize: '12.5px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: isZero ? '#f1f5f9' : '#ecfdf5',
                color: isZero ? '#64748b' : '#047857',
                border: `1px solid ${isZero ? '#e2e8f0' : '#a7f3d0'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <span>{count} صنف</span>
              </span>
            );
          }
        },
        {
          key: 'actions',
          header: 'الإجراءات',
          cell: (row) => {
            const hasProducts = (row.productCount || 0) > 0;
            return (
              <div style={{ textAlign: 'left', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button 
                  variant="secondary" 
                  onClick={() => onEdit(row)}
                  title="تعديل الاسم"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  تعديل
                </Button>
                
                {hasProducts ? (
                  <>
                    <Button 
                      variant="secondary" 
                      onClick={() => onTransferProducts(row)}
                      title="نقل الأصناف لقسم آخر"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      نقل الأصناف
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => onTransferWarehouse(row)}
                      title="نقل أرصدة القسم لمخزن آخر"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      نقل المخزن
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="secondary" 
                    onClick={() => onDelete(row)}
                    title="حذف القسم"
                    style={{ padding: '6px 12px', fontSize: '12px', color: '#dc2626', borderColor: '#fecaca', background: '#fff1f2' }}
                  >
                    حذف
                  </Button>
                )}
              </div>
            );
          }
        }
      ]}
    />
  );
};
