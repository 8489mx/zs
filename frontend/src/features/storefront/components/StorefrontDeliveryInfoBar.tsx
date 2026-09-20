import { useMemo } from 'react';
import type { StorefrontInfo } from '../types/storefront.types';

/**
 * شريط إشارات التوصيل أسفل الهيدر مباشرة.
 *
 * **لماذا:** أول سؤال لأي عميل على طلبات/نون هو «التوصيل بكام وهيوصل إمتى؟»،
 * وهذه البيانات كانت موجودة في `info` و`deliveryZones` ولا تُعرض في أي مكان قبل
 * الوصول لشاشة إتمام الطلب — أي أن العميل يضيف للسلة وهو لا يعرف تكلفة التوصيل
 * ولا حد الطلب الأدنى، فيتفاجأ في آخر خطوة وهي أعلى نقطة تسرّب في أي متجر.
 *
 * لا يستدعي أي endpoint جديد: كل القيم مشتقّة مما يرسله `getInfo` أصلاً.
 */

type Props = {
  info: StorefrontInfo;
};

function formatMoney(value: number, currency: string): string {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `${rounded.toLocaleString('ar-EG')} ${currency}`;
}

export function StorefrontDeliveryInfoBar({ info }: Props) {
  const signals = useMemo(() => {
    const currency = info.currency || 'ج.م';
    const zones = (info.deliveryZones || []).filter((z) => z.isActive !== false);

    // رسوم التوصيل: نطاق عبر المناطق إن اختلفت، وإلا القيمة الأساسية
    const zoneFees = zones.map((z) => Number(z.deliveryFee || 0)).filter((n) => Number.isFinite(n));
    const baseFee = Number(info.deliveryFee || 0);
    const fees = zoneFees.length > 0 ? zoneFees : [baseFee];
    const minFee = Math.min(...fees);
    const maxFee = Math.max(...fees);

    let feeLabel: string;
    if (minFee <= 0 && maxFee <= 0) feeLabel = 'توصيل مجاني';
    else if (minFee === maxFee) feeLabel = formatMoney(minFee, currency);
    else feeLabel = `${minFee.toLocaleString('ar-EG')} – ${formatMoney(maxFee, currency)}`;

    // الوقت المتوقع: أول قيمة غير فارغة من المناطق
    const estimatedTime = zones.map((z) => String(z.estimatedTime || '').trim()).find(Boolean) || '';

    const minOrder = Number(info.minOrder || 0);
    const freeShippingAt = info.freeShippingEnabled ? Number(info.freeShippingMinOrder || 0) : 0;

    return { currency, feeLabel, estimatedTime, minOrder, freeShippingAt };
  }, [info]);

  const items: Array<{ key: string; label: string; value: string; tone: 'default' | 'good' }> = [];

  if (signals.estimatedTime) {
    items.push({ key: 'eta', label: 'التوصيل خلال', value: signals.estimatedTime, tone: 'default' });
  }
  items.push({
    key: 'fee',
    label: 'رسوم التوصيل',
    value: signals.feeLabel,
    tone: signals.feeLabel === 'توصيل مجاني' ? 'good' : 'default',
  });
  if (signals.minOrder > 0) {
    items.push({ key: 'min', label: 'أقل طلب', value: formatMoney(signals.minOrder, signals.currency), tone: 'default' });
  }
  if (signals.freeShippingAt > 0) {
    items.push({
      key: 'free',
      label: 'توصيل مجاني من',
      value: formatMoney(signals.freeShippingAt, signals.currency),
      tone: 'good',
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="storefront-delivery-info-bar" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
      <div
        className="storefront-delivery-info-inner"
        style={{
          maxWidth: 'var(--storefront-container, 1440px)',
          margin: '0 auto',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
        }}
      >
        {items.map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>{item.label}</span>
            <strong style={{ color: item.tone === 'good' ? '#047857' : '#0f172a', fontWeight: 800 }}>
              {item.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
