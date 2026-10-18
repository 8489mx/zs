import { describe, it, expect } from 'vitest';
import {
  buildInstaPayQrPayload,
  buildWalletQrPayload,
  buildPaymentLinkQrPayload,
} from './payment-qr';

describe('Payment QR Engine', () => {
  it('builds dynamic InstaPay QR payload and SVG', () => {
    const res = buildInstaPayQrPayload({
      address: '01018017523',
      amount: 250.75,
      currency: 'EGP',
      invoiceRef: 'INV-001',
    });

    expect(res.address).toBe('01018017523');
    expect(res.amount).toBe(250.75);
    expect(res.payload).toBe('instapay://pay?account=01018017523&amount=250.75&currency=EGP&ref=INV-001');
    expect(res.qrSvg).toContain('<svg');
    expect(res.qrSvg).toContain('</svg>');
  });

  it('builds dynamic Mobile Wallet QR payload and SVG', () => {
    const res = buildWalletQrPayload({
      walletNumber: '01018017523',
      providerName: 'فودافون كاش',
      amount: 500,
      currency: 'EGP',
      invoiceRef: 'INV-002',
    });

    expect(res.walletNumber).toBe('01018017523');
    expect(res.providerName).toBe('فودافون كاش');
    expect(res.payload).toContain('TEL:01018017523');
    expect(res.payload).toContain('AMT:500.00');
    expect(res.payload).toContain('PROVIDER:%D9%81%D9%88%D8%AF%D8%A7%D9%81%D9%88%D9%86%20%D9%83%D8%A7%D8%B4');
    expect(res.qrSvg).toContain('<svg');
  });

  it('builds dynamic Payment Link QR payload with custom base URL', () => {
    const res = buildPaymentLinkQrPayload({
      baseUrl: 'https://pay.example.com/checkout',
      amount: 100,
      currency: 'EGP',
      invoiceRef: 'INV-003',
    });

    expect(res.amount).toBe(100);
    expect(res.url).toBe('https://pay.example.com/checkout?amount=100.00&currency=EGP&ref=INV-003');
    expect(res.qrSvg).toContain('<svg');
  });

  it('uses default fallback values if address or walletNumber is omitted', () => {
    const resInsta = buildInstaPayQrPayload({
      address: '',
      amount: 50,
    });
    expect(resInsta.address).toBe('01018017523');

    const resWallet = buildWalletQrPayload({
      walletNumber: '',
      amount: 50,
    });
    expect(resWallet.walletNumber).toBe('01018017523');
  });
});
