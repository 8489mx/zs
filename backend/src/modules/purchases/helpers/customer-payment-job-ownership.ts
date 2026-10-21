import { AppError } from '../../../common/errors/app-error';

/** A receipt may only be allocated to an existing maritime job owned by that customer. */
export function assertCustomerPaymentJobOwnership(customerId: number, jobCustomerId: number | string | null): void {
  const expected = Number(customerId);
  const actual = jobCustomerId == null ? NaN : Number(jobCustomerId);
  if (!Number.isSafeInteger(expected) || expected <= 0 || !Number.isSafeInteger(actual) || actual !== expected) {
    throw new AppError('Payment customer does not match maritime job customer', 'MARITIME_JOB_CUSTOMER_MISMATCH', 400);
  }
}
