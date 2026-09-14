import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { FolderIcon, PackageIcon, InfoIcon } from '@/shared/components/icons/AppIcons';

interface CategoryTransferProductsModalProps {
  category: { id: string | number; name: string } | null;
  categories: Array<{ id: string | number; name: string }>;
  categoryProducts: Array<{ id: string | number; name: string; barcode?: string }>;
  selectedProductIds: Set<number>;
  targetCategoryId: string;
  setTargetCategoryId: (id: string) => void;
  toggleProductSelection: (id: number) => void;
  toggleAllProducts: () => void;
  isLoadingProducts: boolean;
  isPending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: () => void;
}

export const CategoryTransferProductsModal: React.FC<CategoryTransferProductsModalProps> = ({
  category,
  categories,
  categoryProducts,
  selectedProductIds,
  targetCategoryId,
  setTargetCategoryId,
  toggleProductSelection,
  toggleAllProducts,
  isLoadingProducts,
  isPending,
  error,
  onClose,
  onSubmit,
}) => {
  if (!category) return null;

  const targetCategoryOptions = categories
    .filter((c) => String(c.id) !== String(category.id))
    .map((c) => ({
      value: String(c.id),
      label: c.name,
    }));

  return (
    <StandardDialog
      open={true}
      onClose={onClose}
      title={`نقل أصناف قسم: ${category.name}`}
      subtitle="نقل الأصناف التابعة لهذا القسم إلى قسم آخر مع الحفاظ على الأرصدة والبيانات"
      maxWidth="560px"
      footerActions={
        <StandardDialogFooter
          onClose={onClose}
          onSubmit={onSubmit}
          submitLabel="نقل الأصناف"
          loadingText="جاري النقل..."
          isPending={isPending}
          disabled={!targetCategoryId || isPending}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
        {/* البطاقة الرمادية 1: وجهة النقل */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <FolderIcon size={16} color="#170e5e" />
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#170e5e' }}>وجهة النقل والتصنيف المستهدف</span>
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid #dbeafe',
              fontSize: '12px',
            }}
          >
            <InfoIcon size={18} color="#1e40af" />
            <span>يمكنك اختيار قسم بديل لنقل كافة أصناف هذا القسم إليه أو تحديد منتجات معينة فقط.</span>
          </div>

          <Field label="القسم الوجهة المستهدف">
            <CustomSelect
              options={targetCategoryOptions}
              value={targetCategoryId}
              onChange={(val) => setTargetCategoryId(val)}
              placeholder="اختر القسم الوجهة..."
              searchable
            />
          </Field>
        </div>

        {/* البطاقة الرمادية 2: تحديد الأصناف المراد نقلها */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PackageIcon size={16} color="#170e5e" />
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#170e5e' }}>تحديد الأصناف المراد نقلها</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {selectedProductIds.size === 0
                  ? 'سيتم نقل كل الأصناف'
                  : `${selectedProductIds.size} من ${categoryProducts.length} محدد`}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleAllProducts}
                disabled={isLoadingProducts || categoryProducts.length === 0}
                style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
              >
                {selectedProductIds.size === categoryProducts.length && categoryProducts.length > 0 ? 'إلغاء التحديد' : 'تحديد الكل'}
              </Button>
            </div>
          </div>

          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
            }}
          >
            {isLoadingProducts ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px' }}>جاري تحميل الأصناف...</div>
            ) : categoryProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px' }}>لا توجد أصناف في هذا القسم.</div>
            ) : (
              categoryProducts.map((p, index) => {
                const isSelected = selectedProductIds.has(Number(p.id));
                return (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '10px',
                      padding: '9px 12px',
                      cursor: 'pointer',
                      borderBottom: index < categoryProducts.length - 1 ? '1px solid #f1f5f9' : 'none',
                      margin: 0,
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProductSelection(Number(p.id))}
                      style={{ margin: 0, width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '12.5px', color: isSelected ? '#1d4ed8' : '#0f172a' }}>{p.name}</span>
                      {p.barcode && <span style={{ fontSize: '11px', color: '#64748b' }}>الباركود: {p.barcode}</span>}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              borderRadius: '8px',
              border: '1px solid #fee2e2',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </StandardDialog>
  );
};
