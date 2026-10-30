import { AppError } from '../../../common/errors/app-error';

/**
 * Tax F1: the invoice tax rate is a tenant decision, not a client
 * assertion. The tenant configures one rate in settings (`taxRate`,
 * with the legacy `tax_rate` spelling as fallback); a sale may use
 * exactly that rate, or 0 for an exempt / zero-rated sale. Any other
 * supplied rate is rejected before totals, stock, or journals are
 * touched. Purchases are deliberately untouched: a purchase tax rate
 * is the supplier invoice's own rate, not the tenant's.
 *
 * An absent or unparseable configured rate behaves as 0 (the
 * activation default and the frontend's `|| 0` fallback): only an
 * exempt sale passes until the tenant configures a rate. An omitted
 * payload rate normalizes to 0 upstream and is therefore exempt.
 */
const TAX_RATE_TOLERANCE = 0.001;

export function resolveSaleTaxRate(payloadRate: unknown, configuredRate: unknown): number {
  const payload = Number(payloadRate ?? 0);
  const configuredRaw = Number(configuredRate);
  const configured = Number.isFinite(configuredRaw) ? Math.max(0, configuredRaw) : 0;

  if (!Number.isFinite(payload)) {
    throw new AppError('نسبة الضريبة المرسلة غير صالحة', 'SALE_TAX_RATE_INVALID', 400);
  }
  if (Math.abs(payload) <= TAX_RATE_TOLERANCE) return 0;
  if (Math.abs(payload - configured) <= TAX_RATE_TOLERANCE) return configured;
  throw new AppError(
    `نسبة الضريبة المرسلة (${payload}) لا تطابق نسبة الضريبة المُعدة للمستأجر (${configured}) ولا صفر (معفي)`,
    'SALE_TAX_RATE_MISMATCH',
    400,
  );
}
