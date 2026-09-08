import React from 'react';
import { ShoppingCartIcon, AwardIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import type { CustomerDisplayPayload } from '@/features/pos/types/pos-customer-display.types';

interface CfdScanningViewProps {
  payload: CustomerDisplayPayload;
  latestItemKey: string | number | null | undefined;
  qrSvg: string;
}

export const CfdScanningView: React.FC<CfdScanningViewProps> = ({
  payload,
  latestItemKey,
  qrSvg,
}) => {
  return (
    <div className="cfd-scanning-layout">
      {/* Right Column: Cart Items List */}
      <div className="cfd-cart-card">
        <div className="cfd-cart-header">
          <div className="cfd-cart-header-title">
            <ShoppingCartIcon size={20} color="#170e5e" />
            <span>سلة المشتريات الحالية</span>
            <span className="cfd-item-count-badge">
              {payload.itemCount} {payload.itemCount === 1 ? 'صنف' : 'أصناف'}
            </span>
          </div>

          {payload.customer && (
            <div className="cfd-customer-pill">
              <AwardIcon size={16} color="#047857" />
              <span>عميلنا العزيز: {payload.customer.name}</span>
              {typeof payload.customer.loyaltyPoints === 'number' && (
                <span style={{ fontWeight: 800, color: '#047857' }}>
                  ({payload.customer.loyaltyPoints} نقطة)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="cfd-cart-items-scroll">
          {payload.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              في انتظار مسح الأصناف بواسطة الكاشير...
            </div>
          ) : (
            payload.items.map((item) => {
              const isLatest = item.id === latestItemKey;
              return (
                <div
                  key={item.id}
                  className={`cfd-item-row ${isLatest ? 'is-latest' : ''}`}
                >
                  <div className="cfd-item-info">
                    <span className="cfd-item-name">{item.name}</span>
                    {item.barcode && (
                      <span className="cfd-item-barcode">باركود: {item.barcode}</span>
                    )}
                  </div>

                  <div className="cfd-item-unit-price">
                    {formatCurrency(item.price)}
                  </div>

                  <div className="cfd-item-qty-badge" title="الكمية">
                    ×{item.qty}
                  </div>

                  <div className="cfd-item-total">
                    {formatCurrency(item.lineTotal)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Left Column: Totals & Payment Summary */}
      <div className="cfd-summary-card">
        <div className="cfd-summary-section">
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
            ملخص الحساب
          </div>

          <div className="cfd-summary-row">
            <span>المجموع الفرعي</span>
            <span>{formatCurrency(payload.subtotal)}</span>
          </div>

          {payload.discount > 0 && (
            <div className="cfd-summary-row discount">
              <span>الخصم المطبق</span>
              <span>- {formatCurrency(payload.discount)}</span>
            </div>
          )}

          {payload.tax > 0 && (
            <div className="cfd-summary-row">
              <span>ضريبة القيمة المضافة</span>
              <span>+ {formatCurrency(payload.tax)}</span>
            </div>
          )}

          <div className="cfd-total-banner">
            <div className="cfd-total-label">المبلغ الإجمالي المطلوب سداده</div>
            <div className="cfd-total-amount">
              {payload.total.toFixed(2)}
              <span className="cfd-total-currency">ج.م</span>
            </div>
          </div>

          {/* Instant QR Payment Box */}
          {payload.status === 'payment' && (
            <div className="cfd-payment-box">
              <span className="cfd-payment-channel-badge">
                {payload.payment?.channel === 'instapay'
                  ? 'الدفع عبر InstaPay'
                  : payload.payment?.channel === 'wallet'
                  ? 'الدفع بالمحفظة الإلكترونية'
                  : payload.payment?.channel === 'card'
                  ? 'الدفع بالبطاقة البنكية'
                  : 'الدفع نقداً'}
              </span>

              {qrSvg ? (
                <div className="cfd-qr-container">
                  <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                </div>
              ) : null}

              {payload.payment?.qrLabel && (
                <div className="cfd-payment-instruction">{payload.payment.qrLabel}</div>
              )}

              {payload.payment?.paidAmount && payload.payment.paidAmount > 0 ? (
                <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div className="cfd-summary-row" style={{ fontSize: '14px' }}>
                    <span>المدفوع:</span>
                    <span>{formatCurrency(payload.payment.paidAmount)}</span>
                  </div>
                  {payload.payment.change !== undefined && payload.payment.change > 0 && (
                    <div className="cfd-summary-row" style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
                      <span>المتبقي للعميل:</span>
                      <span>{formatCurrency(payload.payment.change)}</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="cfd-footer-note">
          يرجى مراجعة الأصناف والأسعار قبل الدفع • شكراً لزيارتكم
        </div>
      </div>
    </div>
  );
};
