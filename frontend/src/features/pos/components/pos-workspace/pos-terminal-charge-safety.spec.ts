import { describe, expect, it } from 'vitest';
import { canChangePaymentAfterTerminalApproval, shouldTryAlternateTerminalCharge, terminalAuthorizationLabel } from './pos-terminal-charge-safety';

describe('POS ECR terminal charge integrity', () => {
  it('allows alternate route only if no charge request was sent', () => {
    expect(shouldTryAlternateTerminalCharge(false)).toBe(true);
    expect(shouldTryAlternateTerminalCharge(true)).toBe(false);
  });
  it('does not let the cashier discard a committed terminal authorization by switching payment preset', () => {
    expect(canChangePaymentAfterTerminalApproval('AUTH-123')).toBe(false);
    expect(canChangePaymentAfterTerminalApproval(null)).toBe(true);
    expect(canChangePaymentAfterTerminalApproval('')).toBe(true);
    expect(canChangePaymentAfterTerminalApproval('', 'RRN-192')).toBe(false);
  });
});


describe('missing bank authorization code', () => {
  it('never fabricates an approval number when provider returned none', () => {
    expect(terminalAuthorizationLabel('', 'REAL-RRN')).toContain('رقم التفويض غير متاح');
    expect(terminalAuthorizationLabel('', 'REAL-RRN')).toContain('REAL-RRN');
    expect(terminalAuthorizationLabel('34857', 'REAL-RRN')).toContain('34857');
  });
});
