// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callerIdService } from './pos-caller-id-service';

describe('pos-caller-id-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('notifies listeners when a call is simulated', () => {
    const listener = vi.fn();
    const unsubscribe = callerIdService.subscribe(listener);

    callerIdService.simulateCall('01012345678', 'محمد أحمد');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '01012345678',
        callerName: 'محمد أحمد',
      })
    );

    unsubscribe();

    callerIdService.simulateCall('01199887766');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('handles window custom events for incoming calls', () => {
    const listener = vi.fn();
    const unsubscribe = callerIdService.subscribe(listener);

    const event = new CustomEvent('zs:caller-id-incoming', {
      detail: {
        phone: '01234567890',
        name: 'عميل اتصال سريع',
      },
    });
    window.dispatchEvent(event);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '01234567890',
        callerName: 'عميل اتصال سريع',
      })
    );

    unsubscribe();
  });
});
