import React from 'react';
import { CheckIcon } from '@/shared/components/icons/AppIcons';

export const REGIONAL_PRICING: Record<string, { label: string; unit: string; basic: number; pro: number; ultimate: number; omnichannel: number }> = {
  EGP: { label: 'مصر (EGP)', unit: 'ج.م', basic: 3500, pro: 7500, ultimate: 15000, omnichannel: 24000 },
  SAR: { label: 'السعودية (SAR)', unit: 'ر.س', basic: 350, pro: 750, ultimate: 1500, omnichannel: 2400 },
  KWD: { label: 'الكويت (KWD)', unit: 'د.ك', basic: 30, pro: 60, ultimate: 120, omnichannel: 195 },
  QAR: { label: 'قطر (QAR)', unit: 'ر.ق', basic: 350, pro: 750, ultimate: 1500, omnichannel: 2400 },
  AED: { label: 'الإمارات (AED)', unit: 'د.إ', basic: 350, pro: 750, ultimate: 1500, omnichannel: 2400 },
  BHD: { label: 'البحرين (BHD)', unit: 'د.ب', basic: 35, pro: 75, ultimate: 150, omnichannel: 240 },
  OMR: { label: 'عُمان (OMR)', unit: 'ر.ع', basic: 35, pro: 75, ultimate: 150, omnichannel: 240 },
  USD: { label: 'عالمي (USD)', unit: '$', basic: 99, pro: 199, ultimate: 399, omnichannel: 599 },
};

export function PlanFeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: '#ecfdf5', color: '#059669', flexShrink: 0 }}>
        <CheckIcon size={10} strokeWidth={3} />
      </span>
      <span>{children}</span>
    </div>
  );
}
