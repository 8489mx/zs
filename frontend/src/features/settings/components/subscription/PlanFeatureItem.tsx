import React from 'react';
import { CheckIcon } from '@/shared/components/icons/AppIcons';

/**
 * سطر ميزة واحد في بطاقة الباقة.
 *
 * كان هذا المكوّن يقيم في `pricing-data.tsx` بجوار `REGIONAL_PRICING` — جدول أسعار
 * مكتوب في الواجهة بثماني عملات وأربع باقات. حُذف ذلك الملف (البند C7)، والأسعار
 * مصدرها الوحيد الآن نقطة النهاية `GET /api/tenant-subscription/pricing`
 * المبنية على `pricing/pricing-catalog.json`.
 */
export function PlanFeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#ecfdf5',
          color: '#059669',
          flexShrink: 0,
        }}
      >
        <CheckIcon size={10} strokeWidth={3} />
      </span>
      <span>{children}</span>
    </div>
  );
}
