import type { ProductOffer } from '@/types/domain';

export function todayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIsoDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOfferStatus(offer: ProductOffer) {
  const today = todayIsoDate();
  const from = offer.from || today;
  const to = offer.to || null;
  if (from > today) return { label: 'يبدأ قريباً', color: '#b45309', bg: '#fef3c7', border: '#fde68a' };
  if (to && to < today) return { label: 'منتهي الصلاحية', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' };
  return { label: 'نشط وساري', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
}
