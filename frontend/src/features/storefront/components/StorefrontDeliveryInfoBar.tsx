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

/**
 * شريط الحوافز الترويجية للتوصيل (Smart Incentive Banner):
 * - يظهر فقط كأداة تسويقية محفزة إذا كان هناك حد أدنى للشحن المجاني (Upselling).
 * - لا يظهر إطلاقاً إذا كانت رسوم التوصيل عادية بمقابل، حتى لا يُنفر العميل قبل الشراء.
 * - رسوم التوصيل العادية تُعرض بشفافية تامة داخل السلة وشاشة إتمام الطلب حسب منطقة العميل.
 */
export function StorefrontDeliveryInfoBar({ info }: Props) {
  const signals = useMemo(() => {
    const currency = info.currency === 'EGP' ? 'ج.م' : (info.currency || 'ج.م');
    const freeShippingAt = info.freeShippingEnabled ? Number(info.freeShippingMinOrder || 0) : 0;

    const zones = (info.deliveryZones || []).filter((z) => z.isActive !== false);
    const zoneFees = zones.map((z) => Number(z.deliveryFee || 0)).filter((n) => Number.isFinite(n));
    const baseFee = Number(info.deliveryFee || 0);
    const fees = zoneFees.length > 0 ? zoneFees : [baseFee];
    const isAllFree = fees.length > 0 && fees.every((f) => f <= 0);

    // إذا لم يكن التوصيل مجانياً بالكامل ولا يوجد شحن مجاني مشروط بمبلغ أكبر من صفر -> يختفي البانر
    if (!isAllFree && freeShippingAt <= 0) {
      return null;
    }

    const estimatedTime = zones.map((z) => String(z.estimatedTime || '').trim()).find(Boolean) || '';
    const minOrder = Number(info.minOrder || 0);

    let promoText = '';
    if (freeShippingAt > 0) {
      promoText = `توصيل مجاني لجميع الطلبات بقيمة ${formatMoney(freeShippingAt, currency)} فأكثر`;
    } else if (isAllFree) {
      promoText = 'توصيل مجاني لجميع الطلبات';
    } else {
      return null;
    }

    return { currency, estimatedTime, minOrder, promoText };
  }, [info]);

  if (!signals) return null;

  return (
    <div className="storefront-delivery-info-bar" style={{ borderBottom: '1px solid #bbf7d0', background: '#f0fdf4' }}>
      <div
        className="storefront-delivery-info-inner"
        style={{
          maxWidth: 'var(--storefront-container, 1440px)',
          margin: '0 auto',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700 }}>
          <span>{signals.promoText}</span>
        </div>
        {signals.estimatedTime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#15803d', fontSize: '0.78rem' }}>
            <span style={{ opacity: 0.85 }}>• التوصيل المتوقع:</span>
            <strong>{signals.estimatedTime}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
