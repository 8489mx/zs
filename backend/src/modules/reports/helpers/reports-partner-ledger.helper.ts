import { toMoney } from './reports-math.helper';
import { type MoneyDigits } from '../../accounting/engines/money-minor-units.engine';

export type PartnerLedgerRow = {
  customer_id?: number | string | null;
  supplier_id?: number | string | null;
  balance_total?: number | string | null;
};

export function buildCustomerLedgerTotals(rows: PartnerLedgerRow[], digits: MoneyDigits = 2): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(String(row.customer_id || ''), toMoney(row.balance_total ?? 0, digits));
  }
  return totals;
}

export function buildSupplierLedgerTotals(rows: PartnerLedgerRow[], digits: MoneyDigits = 2): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(String(row.supplier_id || ''), toMoney(row.balance_total ?? 0, digits));
  }
  return totals;
}
