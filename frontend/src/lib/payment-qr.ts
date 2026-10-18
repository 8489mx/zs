/**
 * Z-Pay Multi-Channel Smart Payment Hub QR Engine
 * Generates dynamic, standardized QR payloads and crisp SVGs for:
 * 1. InstaPay Dynamic QR (IPA, Amount, Reference)
 * 2. Meeza Digital & Mobile Wallets (Vodafone Cash, Orange, Etisalat, WE)
 * 3. Hosted Payment Links / Scan-to-Pay (Card & Apple Pay)
 */

import { buildQrSvg } from '@/lib/qrcode';

export interface InstaPayQrParams {
  address: string;
  amount: number;
  currency?: string;
  invoiceRef?: string;
  size?: number;
  color?: string;
  bgColor?: string;
}

export interface InstaPayQrResult {
  payload: string;
  qrSvg: string;
  address: string;
  amount: number;
  currency: string;
  invoiceRef: string;
}

export interface WalletQrParams {
  walletNumber: string;
  providerName?: string;
  amount: number;
  currency?: string;
  invoiceRef?: string;
  size?: number;
  color?: string;
  bgColor?: string;
}

export interface WalletQrResult {
  payload: string;
  qrSvg: string;
  walletNumber: string;
  providerName: string;
  amount: number;
  currency: string;
  invoiceRef: string;
}

export interface PaymentLinkQrParams {
  baseUrl: string;
  amount: number;
  currency?: string;
  invoiceRef?: string;
  size?: number;
  color?: string;
  bgColor?: string;
}

export interface PaymentLinkQrResult {
  url: string;
  qrSvg: string;
  amount: number;
  currency: string;
  invoiceRef: string;
}

/**
 * Builds dynamic QR code for Egyptian InstaPay instant bank transfers.
 */
export function buildInstaPayQrPayload(params: InstaPayQrParams): InstaPayQrResult {
  const address = String(params.address || '').trim() || '01018017523';
  const amount = Number(params.amount || 0);
  const currency = params.currency || 'EGP';
  const invoiceRef = params.invoiceRef || `INV-${Date.now().toString().slice(-6)}`;
  const size = params.size || 140;

  // Formatted InstaPay deep-link URI
  const formattedAmount = amount > 0 ? amount.toFixed(2) : '0.00';
  const payload = `instapay://pay?account=${encodeURIComponent(address)}&amount=${formattedAmount}&currency=${currency}&ref=${encodeURIComponent(invoiceRef)}`;

  const qrSvg = buildQrSvg(payload, {
    size,
    quietZone: 2,
    color: params.color || '#170e5e', // Royal Navy brand or #000 for print
    bgColor: params.bgColor || '#ffffff',
  });

  return {
    payload,
    qrSvg,
    address,
    amount,
    currency,
    invoiceRef,
  };
}

/**
 * Builds dynamic QR code for Egyptian Mobile Wallets (Vodafone Cash, Orange, Etisalat, WE, Meeza Digital).
 */
export function buildWalletQrPayload(params: WalletQrParams): WalletQrResult {
  const walletNumber = String(params.walletNumber || '').trim() || '01018017523';
  const providerName = params.providerName || 'فودافون كاش';
  const amount = Number(params.amount || 0);
  const currency = params.currency || 'EGP';
  const invoiceRef = params.invoiceRef || `INV-${Date.now().toString().slice(-6)}`;
  const size = params.size || 140;

  const formattedAmount = amount > 0 ? amount.toFixed(2) : '0.00';
  const payload = `TEL:${walletNumber}|AMT:${formattedAmount}|CUR:${currency}|REF:${encodeURIComponent(invoiceRef)}|PROVIDER:${encodeURIComponent(providerName)}`;

  const qrSvg = buildQrSvg(payload, {
    size,
    quietZone: 2,
    color: params.color || '#b91c1c', // High-contrast wallet red or #000 for print
    bgColor: params.bgColor || '#ffffff',
  });

  return {
    payload,
    qrSvg,
    walletNumber,
    providerName,
    amount,
    currency,
    invoiceRef,
  };
}

/**
 * Builds dynamic QR code for Card Payment Links & Apple Pay (Paymob / Geidea / Hosted Gateway).
 */
export function buildPaymentLinkQrPayload(params: PaymentLinkQrParams): PaymentLinkQrResult {
  const baseUrl = String(params.baseUrl || '').trim();
  const amount = Number(params.amount || 0);
  const currency = params.currency || 'EGP';
  const invoiceRef = params.invoiceRef || `INV-${Date.now().toString().slice(-6)}`;
  const size = params.size || 140;

  const separator = baseUrl.includes('?') ? '&' : '?';
  const url = baseUrl
    ? `${baseUrl}${separator}amount=${amount.toFixed(2)}&currency=${currency}&ref=${encodeURIComponent(invoiceRef)}`
    : `https://pay.zsystemai.com/checkout?ref=${encodeURIComponent(invoiceRef)}&amount=${amount.toFixed(2)}`;

  const qrSvg = buildQrSvg(url, {
    size,
    quietZone: 2,
    color: params.color || '#0f172a',
    bgColor: params.bgColor || '#ffffff',
  });

  return {
    url,
    qrSvg,
    amount,
    currency,
    invoiceRef,
  };
}
