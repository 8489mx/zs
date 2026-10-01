import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueueOfflineSale, getOfflineSalesQueue } from './pos-offline-sync';
import type { CreatePosSaleInput } from '@/features/pos/contracts';

const sale = { note: 'offline test' } as CreatePosSaleInput;

describe('offline POS queue durability', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reports success only after the sale is stored', () => {
    const queued = enqueueOfflineSale(sale, 'offline-sale-1');
    expect(getOfflineSalesQueue()).toHaveLength(1);
    expect(getOfflineSalesQueue()[0].id).toBe(queued.id);
  });

  it('rejects the sale if browser storage cannot persist it', () => {
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'zsystems_pos_offline_sales_queue') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return setItem.call(this, key, value);
    });
    const updated = vi.fn();
    window.addEventListener('pos-offline-queue-updated', updated);
    try {
      expect(() => enqueueOfflineSale(sale, 'offline-sale-2')).toThrow('تعذر حفظ الفاتورة');
      expect(getOfflineSalesQueue()).toHaveLength(0);
      expect(updated).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('pos-offline-queue-updated', updated);
    }
  });

  it('does not overwrite an unreadable queue with a new sale', () => {
    const stored = '{broken';
    localStorage.setItem('zsystems_pos_offline_sales_queue', stored);

    expect(() => enqueueOfflineSale(sale, 'offline-sale-3')).toThrow('تعذر قراءة الفواتير');
    expect(localStorage.getItem('zsystems_pos_offline_sales_queue')).toBe(stored);
  });
});
