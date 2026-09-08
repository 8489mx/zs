import React from 'react';
import { Button } from '@/shared/ui/button';
import { IconBox, IconPlus } from './PharmacyIcons';

export const FAST_DRUG_PRESETS = [
  { tradeName: 'Panadol Extra 500mg', tradeNameAr: 'بنادول اكسترا أزرق/أحمر', activeIngredient: 'Paracetamol + Caffeine', dosageForm: 'أقراص (Tablets)', strength: '500mg/65mg', unitsPerBox: 2, boxPrice: 45, stripPrice: 22.5, manufacturer: 'GSK Egypt', barcode: '6221001000018' },
  { tradeName: 'Augmentin 1g', tradeNameAr: 'اوجمنتين 1 جم مضاد حيوي', activeIngredient: 'Amoxicillin + Clavulanic Acid', dosageForm: 'أقراص (Tablets)', strength: '1000mg', unitsPerBox: 2, boxPrice: 130, stripPrice: 65, manufacturer: 'GSK Egypt', barcode: '6221008000011' },
  { tradeName: 'Concor 5mg', tradeNameAr: 'كونكور 5 مجم للضغط', activeIngredient: 'Bisoprolol Fumarate', dosageForm: 'أقراص (Tablets)', strength: '5mg', unitsPerBox: 3, boxPrice: 85, stripPrice: 28.33, manufacturer: 'Merck', barcode: '6221024000014' },
  { tradeName: 'Controloc 40mg', tradeNameAr: 'كنترولوك 40 مجم للمعدة', activeIngredient: 'Pantoprazole', dosageForm: 'أقراص (Tablets)', strength: '40mg', unitsPerBox: 2, boxPrice: 120, stripPrice: 60, manufacturer: 'Takeda / EVA', barcode: '6221017000012' },
  { tradeName: 'Antinal 200mg', tradeNameAr: 'انتينال مطهر معوي', activeIngredient: 'Nifuroxazide', dosageForm: 'كبسولات (Capsules)', strength: '200mg', unitsPerBox: 2, boxPrice: 36, stripPrice: 18, manufacturer: 'Amoun Pharma', barcode: '6221016000013' },
  { tradeName: 'Brufen 600mg', tradeNameAr: 'بروفين 600 مسكن ومضاد التهاب', activeIngredient: 'Ibuprofen', dosageForm: 'أقراص (Tablets)', strength: '600mg', unitsPerBox: 3, boxPrice: 60, stripPrice: 20, manufacturer: 'Abbott', barcode: '6221003000016' },
];

interface PharmacyPresetsBarProps {
  onSelectPreset: (preset: typeof FAST_DRUG_PRESETS[0]) => void;
}

export function PharmacyPresetsBar({ onSelectPreset }: PharmacyPresetsBarProps) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconBox />
        <span>إضافة سريعة لأشهر الأصناف المصرية:</span>
      </span>
      {FAST_DRUG_PRESETS.map((p, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelectPreset(p)}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#1e293b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <IconPlus />
          <span>{p.tradeNameAr.split(' ')[0]} {p.tradeName.split(' ')[0]}</span>
        </button>
      ))}
    </div>
  );
}
