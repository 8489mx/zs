import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { LayersIcon, DollarSignIcon } from '@/shared/components/icons/AppIcons';

interface NewAssetFormState {
  code: string;
  name: string;
  category: string;
  purchaseCost: string;
  salvageValue: string;
  usefulLifeMonths: string;
  depreciationMethod: 'straight_line' | 'declining_balance';
  purchaseDate: string;
}

interface AddFixedAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: NewAssetFormState;
  setAsset: React.Dispatch<React.SetStateAction<NewAssetFormState>>;
  isPending: boolean;
  onSubmit: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'equipment', label: 'معدات وأجهزة' },
  { value: 'vehicle', label: 'سيارات ونقل' },
  { value: 'building', label: 'مباني وعقارات' },
  { value: 'furniture', label: 'أثاث وتجهيزات' },
  { value: 'it', label: 'أجهزة حاسوب وتقنية' },
  { value: 'general', label: 'عام' },
];

const DEPRECIATION_METHOD_OPTIONS = [
  { value: 'straight_line', label: 'القسط الثابت (Straight-Line)' },
  { value: 'declining_balance', label: 'القسط المتناقص المضاعف (Declining Balance)' },
];

export const AddFixedAssetModal: React.FC<AddFixedAssetModalProps> = ({
  isOpen,
  onClose,
  asset,
  setAsset,
  isPending,
  onSubmit,
}) => {
  return (
    <StandardDialog
      open={isOpen}
      onClose={onClose}
      title="إضافة أصل ثابت جديد"
      subtitle="تسجيل الأصل وتحديد القيمة الدفترية وطريقة الإهلاك المحاسبي"
      size="lg"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Card 1: Asset Identity */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <LayersIcon size={16} style={{ color: '#170e5e' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0 }}>بيانات الأصل والتعريف</h4>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              كود الأصل <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: AST-001"
              value={asset.code}
              onChange={(e) => setAsset({ ...asset, code: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              اسم الأصل <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: سيارة نقل تويوتا"
              value={asset.name}
              onChange={(e) => setAsset({ ...asset, name: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              التصنيف
            </label>
            <CustomSelect
              value={asset.category}
              onChange={(val) => setAsset({ ...asset, category: val })}
              options={CATEGORY_OPTIONS}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              تاريخ الشراء
            </label>
            <input
              type="date"
              value={asset.purchaseDate}
              onChange={(e) => setAsset({ ...asset, purchaseDate: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Card 2: Financials & Depreciation */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <DollarSignIcon size={16} style={{ color: '#170e5e' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0 }}>التقييم المالي والإهلاك</h4>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              تكلفة الشراء الأصلية <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={asset.purchaseCost}
              onChange={(e) => setAsset({ ...asset, purchaseCost: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 700, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              القيمة التخريدية (الخردة)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={asset.salvageValue}
              onChange={(e) => setAsset({ ...asset, salvageValue: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              العمر الإنتاجي (بالأشهر)
            </label>
            <input
              type="number"
              placeholder="60 (5 سنوات)"
              value={asset.usefulLifeMonths}
              onChange={(e) => setAsset({ ...asset, usefulLifeMonths: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              طريقة الإهلاك المحاسبي
            </label>
            <CustomSelect
              value={asset.depreciationMethod}
              onChange={(val) => setAsset({ ...asset, depreciationMethod: val as any })}
              options={DEPRECIATION_METHOD_OPTIONS}
            />
          </div>
        </div>
      </div>

      <StandardDialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}>
          إلغاء
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!asset.code || !asset.name || !Number(asset.purchaseCost) || isPending}
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: !asset.code || !asset.name || !Number(asset.purchaseCost) || isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'جاري الحفظ...' : 'حفظ الأصل'}
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
};
