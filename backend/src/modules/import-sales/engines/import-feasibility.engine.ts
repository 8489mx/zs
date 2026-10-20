/**
 * Import Feasibility Engine (محرك دراسة الجدوى الاستيرادية المتقدم والتدقيق المحاسبي)
 * Pure functional calculation engine imported identically by production and test suites.
 */

export interface FeasibilityItemInput {
  name: string;
  hsCode?: string;
  qty: number;
  factoryPriceUsd: number;
  unitWeightKg?: number;
  unitCbm?: number;
}

export interface FeasibilityCalculationInput {
  items: FeasibilityItemInput[];
  exchangeRateCommercial: number;
  exchangeRateCustoms?: number;
  travelAndSourcingCostEgp?: number;
  internationalShippingUsd?: number;
  insuranceUsd?: number;
  customsDutyRatePercent?: number;
  vatRatePercent?: number;
  clearanceAndPortFeesEgp?: number;
  internalTransportEgp?: number;
  bankCommissionAndFinancingEgp?: number;
  targetMarkupPercent?: number;
  vatIsRefundable?: boolean;
}

export interface FeasibilityItemOutput {
  name: string;
  hsCode?: string;
  qty: number;
  factoryPriceUsd: number;
  totalFactoryUsd: number;
  factoryCostEgp: number;
  allocatedOverheadEgp: number;
  unitLandedCostEgp: number;
  suggestedWholesalePriceEgp: number;
  suggestedRetailPriceEgp: number;
  totalItemLandedEgp: number;
  unitWeightKg?: number;
  unitCbm?: number;
}

export interface FeasibilityScenarioOutput {
  scenarioName: 'base' | 'best' | 'worst';
  totalInvestmentEgp: number;
  expectedRevenueEgp: number;
  expectedNetProfitEgp: number;
  roiPercentage: number;
  grossMarginPercentage: number;
  breakEvenUnits: number;
  breakEvenRevenueEgp: number;
}

export interface FeasibilityCalculationResult {
  totalFactoryCostUsd: number;
  totalFactoryCostEgp: number;
  internationalShippingUsd: number;
  internationalShippingEgp: number;
  insuranceUsd: number;
  insuranceEgp: number;
  cifValueUsd: number;
  cifValueEgp: number;
  customsDutyEgp: number;
  customsVatEgp: number;
  vatRefundableEgp: number;
  clearanceAndPortFeesEgp: number;
  internalTransportEgp: number;
  capitalizedOverheadEgp: number;
  operatingExpensesEgp: number;
  totalProjectInvestmentEgp: number;
  totalAccountingCostEgp: number;
  totalUnitsCount: number;
  items: FeasibilityItemOutput[];
  targetRevenueEgp: number;
  expectedNetProfitEgp: number;
  roiPercentage: number;
  markupPercentage: number;
  grossMarginPercentage: number;
  breakEvenRevenueEgp: number;
  breakEvenUnits: number;
  scenarios: {
    base: FeasibilityScenarioOutput;
    best: FeasibilityScenarioOutput;
    worst: FeasibilityScenarioOutput;
  };
}

export function resolveNumber(val: unknown, fallback: number): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

export function calculateImportFeasibility(input: FeasibilityCalculationInput): FeasibilityCalculationResult {
  const commRate = Math.max(0.0001, resolveNumber(input.exchangeRateCommercial, 50));
  const custRate = Math.max(0.0001, resolveNumber(input.exchangeRateCustoms, commRate));

  const shippingUsd = Math.max(0, resolveNumber(input.internationalShippingUsd, 0));
  const insuranceUsd = Math.max(0, resolveNumber(input.insuranceUsd, 0));

  // Explicit zero handling: 0 is 0% duty, not 5%! 0 is 0% VAT, not 14%!
  const dutyRate = Math.max(0, resolveNumber(input.customsDutyRatePercent, 5)) / 100;
  const vatRate = Math.max(0, resolveNumber(input.vatRatePercent, 14)) / 100;
  const clearanceEgp = Math.max(0, resolveNumber(input.clearanceAndPortFeesEgp, 0));
  const transportEgp = Math.max(0, resolveNumber(input.internalTransportEgp, 0));
  const travelEgp = Math.max(0, resolveNumber(input.travelAndSourcingCostEgp, 0));
  const bankCommEgp = Math.max(0, resolveNumber(input.bankCommissionAndFinancingEgp, 0));
  const markupPercent = Math.max(0, resolveNumber(input.targetMarkupPercent, 25));
  const vatRefundable = Boolean(input.vatIsRefundable);

  // 1. Factory Cost
  let totalFactoryCostUsd = 0;
  let totalUnitsCount = 0;
  for (const item of input.items || []) {
    const qty = Math.max(0, resolveNumber(item.qty, 0));
    const price = Math.max(0, resolveNumber(item.factoryPriceUsd, 0));
    totalFactoryCostUsd += qty * price;
    totalUnitsCount += qty;
  }

  const totalFactoryCostEgp = totalFactoryCostUsd * commRate;
  const internationalShippingEgp = shippingUsd * commRate;
  const insuranceEgp = insuranceUsd * commRate;

  // 2. Customs & CIF Valuation
  const cifValueUsd = totalFactoryCostUsd + shippingUsd + insuranceUsd;
  const cifValueEgp = cifValueUsd * custRate;
  const customsDutyEgp = cifValueEgp * dutyRate;
  const customsVatEgp = (cifValueEgp + customsDutyEgp) * vatRate;

  // 3. Capitalized Overhead (Freight + Insurance + Duty + Clearance + Inland Transport + Non-refundable VAT)
  // Refundable VAT is a Tax Asset (claimable back from ETA), NOT capitalized into inventory.
  const capitalizedOverheadEgp =
    internationalShippingEgp +
    insuranceEgp +
    customsDutyEgp +
    clearanceEgp +
    transportEgp +
    (vatRefundable ? 0 : customsVatEgp);

  // 4. Operating Expenses (Travel/Sourcing Trips, Bank Commissions, Financing costs)
  const operatingExpensesEgp = travelEgp + bankCommEgp;

  // 5. Total Accounting Cost vs Total Cash Outflow (Investment)
  // Accounting Cost = Inventory Cost (Factory + Capitalized Overhead) + Operating Expenses.
  const totalAccountingCostEgp = totalFactoryCostEgp + capitalizedOverheadEgp + operatingExpensesEgp;
  // Cash Outflow required from investor/treasury includes refundable VAT until reclaimed.
  const totalProjectInvestmentEgp = totalAccountingCostEgp + (vatRefundable ? customsVatEgp : 0);

  // 6. Landed Cost Allocations per Item
  const itemsOutput: FeasibilityItemOutput[] = (input.items || []).map((item) => {
    const qty = Math.max(1, resolveNumber(item.qty, 1));
    const unitPriceUsd = Math.max(0, resolveNumber(item.factoryPriceUsd, 0));
    const totalItemUsd = qty * unitPriceUsd;
    const valueRatio = totalFactoryCostUsd > 0 ? totalItemUsd / totalFactoryCostUsd : 1 / (input.items.length || 1);

    const itemCapitalizedOverhead = capitalizedOverheadEgp * valueRatio;
    const itemFactoryCostEgp = totalItemUsd * commRate;
    const totalItemLanded = itemFactoryCostEgp + itemCapitalizedOverhead;
    const unitLanded = totalItemLanded / qty;

    // Wholesale Price (Markup * 0.7) and Retail Price (Full Markup)
    const wholesaleMarkup = 1 + (markupPercent * 0.7) / 100;
    const retailMarkup = 1 + markupPercent / 100;

    return {
      name: item.name,
      hsCode: item.hsCode,
      qty,
      factoryPriceUsd: unitPriceUsd,
      totalFactoryUsd: Number(totalItemUsd.toFixed(2)),
      factoryCostEgp: Number(itemFactoryCostEgp.toFixed(2)),
      allocatedOverheadEgp: Number(itemCapitalizedOverhead.toFixed(2)),
      unitLandedCostEgp: Number(unitLanded.toFixed(2)),
      suggestedWholesalePriceEgp: Number((unitLanded * wholesaleMarkup).toFixed(2)),
      suggestedRetailPriceEgp: Number((unitLanded * retailMarkup).toFixed(2)),
      totalItemLandedEgp: Number(totalItemLanded.toFixed(2)),
      unitWeightKg: item.unitWeightKg,
      unitCbm: item.unitCbm,
    };
  });

  // 7. Base Scenario
  // Target Revenue based on retail markup over accounting cost
  const baseRevenue = totalAccountingCostEgp * (1 + markupPercent / 100);
  const baseProfit = baseRevenue - totalAccountingCostEgp;
  const baseRoi = totalProjectInvestmentEgp > 0 ? (baseProfit / totalProjectInvestmentEgp) * 100 : 0;
  const baseGrossMargin = baseRevenue > 0 ? (baseProfit / baseRevenue) * 100 : 0;

  // Mathematically correct Break-Even:
  // Units needed to sell at target selling price to recover the total investment:
  // BreakEvenUnits = TotalAccountingCost / AverageSellingPrice = TotalUnits / (1 + Markup)
  const avgSellingPriceBase = totalUnitsCount > 0 ? baseRevenue / totalUnitsCount : 0;
  const baseBreakEvenUnits =
    avgSellingPriceBase > 0 ? Math.min(totalUnitsCount, Math.ceil(totalAccountingCostEgp / avgSellingPriceBase)) : totalUnitsCount;

  // 8. Best Scenario (+10% Revenue, -5% Shipping)
  const bestAccountingCost = totalAccountingCostEgp - internationalShippingEgp * 0.05;
  const bestInvestment = totalProjectInvestmentEgp - internationalShippingEgp * 0.05;
  const bestRevenue = baseRevenue * 1.10;
  const bestProfit = bestRevenue - bestAccountingCost;
  const bestRoi = bestInvestment > 0 ? (bestProfit / bestInvestment) * 100 : 0;
  const bestGrossMargin = bestRevenue > 0 ? (bestProfit / bestRevenue) * 100 : 0;
  const avgSellingPriceBest = totalUnitsCount > 0 ? bestRevenue / totalUnitsCount : 0;
  const bestBreakEvenUnits =
    avgSellingPriceBest > 0 ? Math.min(totalUnitsCount, Math.ceil(bestAccountingCost / avgSellingPriceBest)) : totalUnitsCount;

  // 9. Worst Scenario (-10% Revenue, +15% Shipping/Overhead + 15,000 EGP demurrage)
  const worstAccountingCost = totalAccountingCostEgp + capitalizedOverheadEgp * 0.15 + 15000;
  const worstInvestment = totalProjectInvestmentEgp + capitalizedOverheadEgp * 0.15 + 15000;
  const worstRevenue = baseRevenue * 0.90;
  const worstProfit = worstRevenue - worstAccountingCost;
  const worstRoi = worstInvestment > 0 ? (worstProfit / worstInvestment) * 100 : 0;
  const worstGrossMargin = worstRevenue > 0 ? (worstProfit / worstRevenue) * 100 : 0;
  const avgSellingPriceWorst = totalUnitsCount > 0 ? worstRevenue / totalUnitsCount : 0;
  const worstBreakEvenUnits =
    avgSellingPriceWorst > 0 ? Math.ceil(worstAccountingCost / avgSellingPriceWorst) : totalUnitsCount;

  return {
    totalFactoryCostUsd: Number(totalFactoryCostUsd.toFixed(2)),
    totalFactoryCostEgp: Number(totalFactoryCostEgp.toFixed(2)),
    internationalShippingUsd: Number(shippingUsd.toFixed(2)),
    internationalShippingEgp: Number(internationalShippingEgp.toFixed(2)),
    insuranceUsd: Number(insuranceUsd.toFixed(2)),
    insuranceEgp: Number(insuranceEgp.toFixed(2)),
    cifValueUsd: Number(cifValueUsd.toFixed(2)),
    cifValueEgp: Number(cifValueEgp.toFixed(2)),
    customsDutyEgp: Number(customsDutyEgp.toFixed(2)),
    customsVatEgp: Number(customsVatEgp.toFixed(2)),
    vatRefundableEgp: Number((vatRefundable ? customsVatEgp : 0).toFixed(2)),
    clearanceAndPortFeesEgp: Number(clearanceEgp.toFixed(2)),
    internalTransportEgp: Number(transportEgp.toFixed(2)),
    capitalizedOverheadEgp: Number(capitalizedOverheadEgp.toFixed(2)),
    operatingExpensesEgp: Number(operatingExpensesEgp.toFixed(2)),
    totalAccountingCostEgp: Number(totalAccountingCostEgp.toFixed(2)),
    totalProjectInvestmentEgp: Number(totalProjectInvestmentEgp.toFixed(2)),
    totalUnitsCount,
    items: itemsOutput,
    targetRevenueEgp: Number(baseRevenue.toFixed(2)),
    expectedNetProfitEgp: Number(baseProfit.toFixed(2)),
    roiPercentage: Number(baseRoi.toFixed(2)),
    markupPercentage: Number(markupPercent.toFixed(2)),
    grossMarginPercentage: Number(baseGrossMargin.toFixed(2)),
    breakEvenRevenueEgp: Number(totalAccountingCostEgp.toFixed(2)),
    breakEvenUnits: baseBreakEvenUnits,
    scenarios: {
      base: {
        scenarioName: 'base',
        totalInvestmentEgp: Number(totalProjectInvestmentEgp.toFixed(2)),
        expectedRevenueEgp: Number(baseRevenue.toFixed(2)),
        expectedNetProfitEgp: Number(baseProfit.toFixed(2)),
        roiPercentage: Number(baseRoi.toFixed(2)),
        grossMarginPercentage: Number(baseGrossMargin.toFixed(2)),
        breakEvenUnits: baseBreakEvenUnits,
        breakEvenRevenueEgp: Number(totalAccountingCostEgp.toFixed(2)),
      },
      best: {
        scenarioName: 'best',
        totalInvestmentEgp: Number(bestInvestment.toFixed(2)),
        expectedRevenueEgp: Number(bestRevenue.toFixed(2)),
        expectedNetProfitEgp: Number(bestProfit.toFixed(2)),
        roiPercentage: Number(bestRoi.toFixed(2)),
        grossMarginPercentage: Number(bestGrossMargin.toFixed(2)),
        breakEvenUnits: bestBreakEvenUnits,
        breakEvenRevenueEgp: Number(bestAccountingCost.toFixed(2)),
      },
      worst: {
        scenarioName: 'worst',
        totalInvestmentEgp: Number(worstInvestment.toFixed(2)),
        expectedRevenueEgp: Number(worstRevenue.toFixed(2)),
        expectedNetProfitEgp: Number(worstProfit.toFixed(2)),
        roiPercentage: Number(worstRoi.toFixed(2)),
        grossMarginPercentage: Number(worstGrossMargin.toFixed(2)),
        breakEvenUnits: worstBreakEvenUnits,
        breakEvenRevenueEgp: Number(worstAccountingCost.toFixed(2)),
      },
    },
  };
}
