import React from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';

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
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة أصل ثابت جديد"
      maxWidth="640px"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        <Field label="كود الأصل *">
          <input
            type="text"
            placeholder="مثال: AST-001"
            value={asset.code}
            onChange={(e) => setAsset({ ...asset, code: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <Field label="اسم الأصل *">
          <input
            type="text"
            placeholder="مثال: سيارة نقل تويوتا"
            value={asset.name}
            onChange={(e) => setAsset({ ...asset, name: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <Field label="التصنيف">
          <select
            value={asset.category}
            onChange={(e) => setAsset({ ...asset, category: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="equipment">معدات وأجهزة</option>
            <option value="vehicle">سيارات ونقل</option>
            <option value="building">مباني وعقارات</option>
            <option value="furniture">أثاث وتجهيزات</option>
            <option value="it">أجهزة حاسوب وتقنية</option>
            <option value="general">عام</option>
          </select>
        </Field>

        <Field label="تاريخ الشراء">
          <input
            type="date"
            value={asset.purchaseDate}
            onChange={(e) => setAsset({ ...asset, purchaseDate: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <Field label="تكلفة الشراء الأصلية *">
          <input
            type="number"
            placeholder="0.00"
            value={asset.purchaseCost}
            onChange={(e) => setAsset({ ...asset, purchaseCost: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <Field label="القيمة التخريدية (الخردة)">
          <input
            type="number"
            placeholder="0.00"
            value={asset.salvageValue}
            onChange={(e) => setAsset({ ...asset, salvageValue: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <Field label="العمر الإنتاجي (بالأشهر)">
          <input
            type="number"
            placeholder="60 (5 سنوات)"
            value={asset.usefulLifeMonths}
            onChange={(e) => setAsset({ ...asset, usefulLifeMonths: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <Field label="طريقة الإهلاك المحاسبي">
          <select
            value={asset.depreciationMethod}
            onChange={(e) => setAsset({ ...asset, depreciationMethod: e.target.value as any })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="straight_line">القسط الثابت (Straight-Line)</option>
            <option value="declining_balance">القسط المتناقص المضاعف (Declining Balance)</option>
          </select>
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <Button type="button" variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={!asset.code || !asset.name || !Number(asset.purchaseCost) || isPending}
          style={{ background: '#170e5e', color: '#fff' }}
        >
          {isPending ? 'جاري الحفظ...' : 'حفظ الأصل'}
        </Button>
      </div>
    </StandardDialog>
  );
};
