/**
 * Import Feasibility Engine (محرك دراسة الجدوى الاستيرادية المتقدم)
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
}

export interface FeasibilityScenarioOutput {
  scenarioName: 'base' | 'best' | 'worst';
  totalInvestmentEgp: number;
  expectedRevenueEgp: number;
  expectedNetProfitEgp: number;
  roiPercentage: number;
  breakEvenUnits: number;
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
  clearanceAndPortFeesEgp: number;
  internalTransportEgp: number;
  capitalizedOverheadEgp: number;
  operatingExpensesEgp: number;
  totalProjectInvestmentEgp: number;
  totalUnitsCount: number;
  items: FeasibilityItemOutput[];
  targetRevenueEgp: number;
  expectedNetProfitEgp: number;
  roiPercentage: number;
  breakEvenRevenueEgp: number;
  scenarios: {
    base: FeasibilityScenarioOutput;
    best: FeasibilityScenarioOutput;
    worst: FeasibilityScenarioOutput;
  };
}

export function calculateImportFeasibility(input: FeasibilityCalculationInput): FeasibilityCalculationResult {
  const commRate = Math.max(0.0001, Number(input.exchangeRateCommercial) || 50);
  const custRate = Math.max(0.0001, Number(input.exchangeRateCustoms) || commRate);

  const shippingUsd = Math.max(0, Number(input.internationalShippingUsd) || 0);
  const insuranceUsd = Math.max(0, Number(input.insuranceUsd) || 0);
  const dutyRate = Math.max(0, Number(input.customsDutyRatePercent) || 5) / 100;
  const vatRate = Math.max(0, Number(input.vatRatePercent) || 14) / 100;
  const clearanceEgp = Math.max(0, Number(input.clearanceAndPortFeesEgp) || 0);
  const transportEgp = Math.max(0, Number(input.internalTransportEgp) || 0);
  const travelEgp = Math.max(0, Number(input.travelAndSourcingCostEgp) || 0);
  const bankCommEgp = Math.max(0, Number(input.bankCommissionAndFinancingEgp) || 0);
  const markupPercent = Math.max(0, Number(input.targetMarkupPercent) || 25);
  const vatRefundable = Boolean(input.vatIsRefundable);

  // 1. Factory Cost
  let totalFactoryCostUsd = 0;
  let totalUnitsCount = 0;
  for (const item of input.items) {
    const qty = Math.max(0, Number(item.qty) || 0);
    const price = Math.max(0, Number(item.factoryPriceUsd) || 0);
    totalFactoryCostUsd += qty * price;
    totalUnitsCount += qty;
  }

  const totalFactoryCostEgp = totalFactoryCostUsd * commRate;
  const internationalShippingEgp = shippingUsd * commRate;
  const insuranceEgp = insuranceUsd * commRate;

  // 2. Customs & CIF
  const cifValueUsd = totalFactoryCostUsd + shippingUsd + insuranceUsd;
  const cifValueEgp = cifValueUsd * custRate;
  const customsDutyEgp = cifValueEgp * dutyRate;
  const customsVatEgp = (cifValueEgp + customsDutyEgp) * vatRate;

  // 3. Capitalized Overhead (Freight + Insurance + Duty + Clearance + Inland Transport + Non-refundable VAT)
  const capitalizedOverheadEgp = internationalShippingEgp + insuranceEgp + customsDutyEgp + clearanceEgp + transportEgp + (vatRefundable ? 0 : customsVatEgp);

  // 4. Operating Expenses (Travel, Bank Finance, etc.)
  const operatingExpensesEgp = travelEgp + bankCommEgp;

  // 5. Total Project Outflow
  const totalProjectInvestmentEgp = totalFactoryCostEgp + capitalizedOverheadEgp + operatingExpensesEgp + (vatRefundable ? customsVatEgp : 0);

  // 6. Item Landed Cost Allocations
  const itemsOutput: FeasibilityItemOutput[] = input.items.map((item) => {
    const qty = Math.max(1, Number(item.qty) || 1);
    const unitPriceUsd = Math.max(0, Number(item.factoryPriceUsd) || 0);
    const totalItemUsd = qty * unitPriceUsd;
    const valueRatio = totalFactoryCostUsd > 0 ? totalItemUsd / totalFactoryCostUsd : 1 / input.items.length;

    const itemCapitalizedOverhead = capitalizedOverheadEgp * valueRatio;
    const itemFactoryCostEgp = totalItemUsd * commRate;
    const totalItemLanded = itemFactoryCostEgp + itemCapitalizedOverhead;
    const unitLanded = totalItemLanded / qty;

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
    };
  });

  // 7. Base Scenario
  const baseRevenue = totalProjectInvestmentEgp * (1 + markupPercent / 100);
  const baseProfit = baseRevenue - totalProjectInvestmentEgp;
  const baseRoi = totalProjectInvestmentEgp > 0 ? (baseProfit / totalProjectInvestmentEgp) * 100 : 0;

  // 8. Best Scenario (+10% Revenue, -5% Shipping)
  const bestInvestment = totalProjectInvestmentEgp - (internationalShippingEgp * 0.05);
  const bestRevenue = baseRevenue * 1.10;
  const bestProfit = bestRevenue - bestInvestment;
  const bestRoi = bestInvestment > 0 ? (bestProfit / bestInvestment) * 100 : 0;

  // 9. Worst Scenario (-10% Revenue, +15% Shipping/Overhead + demurrage 15k)
  const worstInvestment = totalProjectInvestmentEgp + (capitalizedOverheadEgp * 0.15) + 15000;
  const worstRevenue = baseRevenue * 0.90;
  const worstProfit = worstRevenue - worstInvestment;
  const worstRoi = worstInvestment > 0 ? (worstProfit / worstInvestment) * 100 : 0;

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
    clearanceAndPortFeesEgp: Number(clearanceEgp.toFixed(2)),
    internalTransportEgp: Number(transportEgp.toFixed(2)),
    capitalizedOverheadEgp: Number(capitalizedOverheadEgp.toFixed(2)),
    operatingExpensesEgp: Number(operatingExpensesEgp.toFixed(2)),
    totalProjectInvestmentEgp: Number(totalProjectInvestmentEgp.toFixed(2)),
    totalUnitsCount,
    items: itemsOutput,
    targetRevenueEgp: Number(baseRevenue.toFixed(2)),
    expectedNetProfitEgp: Number(baseProfit.toFixed(2)),
    roiPercentage: Number(baseRoi.toFixed(2)),
    breakEvenRevenueEgp: Number(totalProjectInvestmentEgp.toFixed(2)),
    scenarios: {
      base: {
        scenarioName: 'base',
        totalInvestmentEgp: Number(totalProjectInvestmentEgp.toFixed(2)),
        expectedRevenueEgp: Number(baseRevenue.toFixed(2)),
        expectedNetProfitEgp: Number(baseProfit.toFixed(2)),
        roiPercentage: Number(baseRoi.toFixed(2)),
        breakEvenUnits: totalUnitsCount,
      },
      best: {
        scenarioName: 'best',
        totalInvestmentEgp: Number(bestInvestment.toFixed(2)),
        expectedRevenueEgp: Number(bestRevenue.toFixed(2)),
        expectedNetProfitEgp: Number(bestProfit.toFixed(2)),
        roiPercentage: Number(bestRoi.toFixed(2)),
        breakEvenUnits: Math.ceil(totalUnitsCount * 0.85),
      },
      worst: {
        scenarioName: 'worst',
        totalInvestmentEgp: Number(worstInvestment.toFixed(2)),
        expectedRevenueEgp: Number(worstRevenue.toFixed(2)),
        expectedNetProfitEgp: Number(worstProfit.toFixed(2)),
        roiPercentage: Number(worstRoi.toFixed(2)),
        breakEvenUnits: Math.ceil(totalUnitsCount * 1.15),
      },
    },
  };
}
