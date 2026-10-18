import { useTranslation } from 'react-i18next';
import React from 'react';
import {
  ShoppingCartIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  QrCodeIcon,
} from '@/shared/components/icons/AppIcons';

export interface PromotionItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
}

interface CfdIdleViewProps {
  storeName: string;
  promotions: PromotionItem[];
  promoIndex: number;
  setPromoIndex: (idx: number) => void;
  loyaltyQrSvg: string;
}

export const CfdIdleView: React.FC<CfdIdleViewProps> = ({
  storeName,
  promotions,
  promoIndex,
  setPromoIndex,
  loyaltyQrSvg,
}) => {
  const { t } = useTranslation();
  const activePromo = promotions[promoIndex] || promotions[0];

  return (
    <div className="cfd-idle-view">
      <div className="cfd-idle-grid">
        {/* Right Column: Brand Welcome & Value Propositions */}
        <div className="cfd-idle-hero-card">
          <div className="cfd-idle-welcome-top">
            <div className="cfd-idle-avatar">
              <ShoppingCartIcon size={32} color="#ffffff" />
            </div>
            <div>
              <h2 className="cfd-idle-headline">
                {t('pos.customer_display.cfd_idle_view.s0', "أهلاً وسهلاً بكم في")} {storeName}
              </h2>
              <p className="cfd-idle-subheadline">
                {t('pos.customer_display.cfd_idle_view.s1', "نسعد بخدمتكم وتوفير أفضل تجربة تسوق. تفضل بتقديم مشترياتك للكاشير وسيقوم بمسحها على الفور.")}
              </p>
            </div>
          </div>

          <div className="cfd-idle-feature-deck">
            <div className="cfd-feature-deck-header">
              <span className="cfd-feature-badge">{activePromo.badge}</span>
              <div className="cfd-feature-dots">
                {promotions.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setPromoIndex(idx)}
                    className={`cfd-feature-dot ${idx === promoIndex ? 'is-active' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className="cfd-feature-deck-body">
              <div className="cfd-feature-icon-box">{activePromo.icon}</div>
              <div>
                <h3 className="cfd-feature-title">{activePromo.title}</h3>
                <p className="cfd-feature-desc">{activePromo.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="cfd-trust-strip">
            <div className="cfd-trust-item">
              <ReceiptIcon size={18} color="#170e5e" />
              <div>
                <div className="cfd-trust-title">{t('pos.customer_display.cfd_idle_view.s2', "فاتورة إلكترونية معتمدة")}</div>
                <div className="cfd-trust-sub">{t('pos.customer_display.cfd_idle_view.s3', "متوافقة ضريبياً وموثقة")}</div>
              </div>
            </div>

            <div className="cfd-trust-item">
              <ShieldCheckIcon size={18} color="#170e5e" />
              <div>
                <div className="cfd-trust-title">{t('pos.customer_display.cfd_idle_view.s4', "ضمان واستبدال فوري")}</div>
                <div className="cfd-trust-sub">{t('pos.customer_display.cfd_idle_view.s5', "جودة وأصالة معتمدة 100%")}</div>
              </div>
            </div>

            <div className="cfd-trust-item">
              <CreditCardIcon size={18} color="#170e5e" />
              <div>
                <div className="cfd-trust-title">{t('pos.customer_display.cfd_idle_view.s6', "سداد إلكتروني آمن")}</div>
                <div className="cfd-trust-sub">{t('pos.customer_display.cfd_idle_view.s7', "InstaPay وفيزا ومحافظ")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Column: Smart Interactive Customer Kiosk */}
        <div className="cfd-idle-kiosk-card">
          <div className="cfd-kiosk-qr-box">
            <div className="cfd-kiosk-header">
              <div className="cfd-kiosk-badge">
                <QrCodeIcon size={16} color="#170e5e" />
                <span>{t('pos.customer_display.cfd_idle_view.s8', "تفاعل رقمي ذكي")}</span>
              </div>
              <h3 className="cfd-kiosk-title">{t('pos.customer_display.cfd_idle_view.s9', "برنامج الولاء والخصومات")}</h3>
              <p className="cfd-kiosk-desc">
                {t('pos.customer_display.cfd_idle_view.s10', "امسح الرمز بهاتفك للانضمام لبرنامج نقاط العملاء وتلقي نسخة إلكترونية من فاتورتك عبر الواتساب فوراً.")}
              </p>
            </div>

            <div className="cfd-kiosk-qr-container">
              <div dangerouslySetInnerHTML={{ __html: loyaltyQrSvg }} />
            </div>

            <div className="cfd-kiosk-steps">
              <div className="cfd-kiosk-step">
                <span className="cfd-step-num">1</span>
                <span>{t('pos.customer_display.cfd_idle_view.s11', "افتح الكاميرا")}</span>
              </div>
              <div className="cfd-kiosk-step">
                <span className="cfd-step-num">2</span>
                <span>{t('pos.customer_display.cfd_idle_view.s12', "امسح الـ QR")}</span>
              </div>
              <div className="cfd-kiosk-step">
                <span className="cfd-step-num">3</span>
                <span>{t('pos.customer_display.cfd_idle_view.s13', "اجمع نقاطك")}</span>
              </div>
            </div>
          </div>

          <div className="cfd-kiosk-payments-box">
            <div className="cfd-payments-header">
              <CreditCardIcon size={16} color="#170e5e" />
              <span>{t('pos.customer_display.cfd_idle_view.s14', "وسائل الدفع المقبولة بصالة البيع")}</span>
            </div>

            <div className="cfd-payments-badges-grid">
              <div className="cfd-payment-chip instapay">{t('pos.customer_display.cfd_idle_view.s15', "InstaPay فوري")}</div>
              <div className="cfd-payment-chip cards">{t('pos.customer_display.cfd_idle_view.s16', "فيزا وماستركارد")}</div>
              <div className="cfd-payment-chip meeza">{t('pos.customer_display.cfd_idle_view.s17', "كروت ميزة")}</div>
              <div className="cfd-payment-chip wallets">{t('pos.customer_display.cfd_idle_view.s18', "المحافظ والموبايل كاش")}</div>
              <div className="cfd-payment-chip cash">{t('pos.customer_display.cfd_idle_view.s19', "نقداً بالجنيه المصري")}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="cfd-footer-note">
        {t('pos.customer_display.cfd_idle_view.s20', "نظام المحاسبة ونقاط البيع السحابي Z-Systems • خدمة العملاء الرقمية المتطورة")}
      </div>
    </div>
  );
};
