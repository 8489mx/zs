import { BadRequestException } from '@nestjs/common';
import { Kysely } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { tenantBaseCurrency } from './accounting-currency';
import { currencyMoneyDigits, toMinorUnits, roundMoney } from './engines/money-minor-units.engine';

export async function pdcCurrencySnapshot(db: Kysely<Database>, tenantId: string, currency: string, amount: number, suppliedRate?: number) {
  const rates = await db.selectFrom('currency_exchange_rates').select(['currency_code', 'exchange_rate', 'is_base'])
    .where('tenant_id', '=', tenantId).execute();
  const base = await tenantBaseCurrency(db, tenantId);
  const rawRate = currency === base ? 1 : suppliedRate ?? Number(rates.find(row => row.currency_code === currency)?.exchange_rate);
  const rate = Number(Number(rawRate).toFixed(8));
  let baseAmount: number;
  try {
    if (toMinorUnits(amount, currencyMoneyDigits(currency)) <= 0) throw new Error('Invalid amount');
    baseAmount = roundMoney(amount * rate, currencyMoneyDigits(base));
  } catch {
    throw new BadRequestException('قيمة الشيك لا تطابق دقة عملته أو حدودها.');
  }
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(baseAmount) || baseAmount <= 0) {
    throw new BadRequestException('يلزم سعر صرف موجب وصحيح للشيك بعملة أجنبية.');
  }
  return { base_currency: base, exchange_rate: rate, base_amount: baseAmount };
}
