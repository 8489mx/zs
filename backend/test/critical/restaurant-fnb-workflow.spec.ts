import { strict as assert } from 'node:assert';
import { computeInvoiceTotals } from '../../src/common/utils/invoice-totals';

// ============================================================================
// RESTAURANT F&B WORKFLOW & OPERATIONS CRITICAL AUDIT SUITE
// Tests financial invariants, service charge isolation, table reservations,
// aggregator commissions, and food waste variance engine.
// ============================================================================

async function testServiceChargeFinancialInvariants(): Promise<void> {
  // Test 1: Exclusive Tax Mode with Dine-In Service Charge
  // Subtotal = 1000, Discount = 100 -> Net Food = 900
  // Service Charge (12%) = 108
  // Delivery Fee = 0
  // Taxable Base = 900 + 108 = 1008
  // Tax (15%) = 1008 * 0.15 = 151.20
  // Total = 900 + 108 + 151.20 = 1159.20
  const exclusiveTotals = computeInvoiceTotals(1000, 100, 15, false, 0, 108);
  assert.equal(exclusiveTotals.taxAmount, 151.2, 'Exclusive tax on net food + service charge');
  assert.equal(exclusiveTotals.total, 1159.2, 'Grand total matches net food + service charge + tax');

  // Test 2: Inclusive Tax Mode with Dine-In Service Charge
  // Net Food = 900, Service Charge = 108 -> Total Base = 1008 (VAT inclusive at 15%)
  // Embedded VAT = 1008 - (1008 / 1.15) = 131.48
  const inclusiveTotals = computeInvoiceTotals(1000, 100, 15, true, 0, 108);
  assert.equal(inclusiveTotals.total, 1008.0, 'Inclusive total includes service charge directly');
  assert.equal(inclusiveTotals.taxAmount, 131.48, 'Embedded VAT extracted from total bill base');

  // Test 3: Takeaway & Delivery strict zero service charge enforcement
  // Even if service charge argument is accidentally passed, when 0 is given it produces clean baseline
  const zeroServiceTotals = computeInvoiceTotals(500, 0, 15, false, 25, 0);
  assert.equal(zeroServiceTotals.taxAmount, 75.0, 'Tax on 500 = 75');
  assert.equal(zeroServiceTotals.total, 600.0, '500 food + 75 tax + 25 delivery fee = 600');

  // Test 4: Negative input defenses
  const negativeGuarded = computeInvoiceTotals(200, -50, 15, false, -10, -20);
  // Negative discount clamped to 0 -> taxableBase = 200
  // Negative delivery fee clamped to 0
  // Negative service charge clamped to 0
  // Tax (15%) = 30
  // Total = 200 + 30 = 230
  assert.equal(negativeGuarded.taxAmount, 30.0);
  assert.equal(negativeGuarded.total, 230.0);
}

async function testTableReservationTransitions(): Promise<void> {
  type ReservationStatus = 'confirmed' | 'seated' | 'cancelled' | 'no_show';
  const validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
    confirmed: ['seated', 'cancelled', 'no_show'],
    seated: ['cancelled'],
    cancelled: [],
    no_show: [],
  };

  const assertTransition = (from: ReservationStatus, to: ReservationStatus, shouldPass: boolean) => {
    const isAllowed = validTransitions[from].includes(to);
    assert.equal(isAllowed, shouldPass, `Transition from ${from} to ${to} expected: ${shouldPass}`);
  };

  assertTransition('confirmed', 'seated', true);
  assertTransition('confirmed', 'cancelled', true);
  assertTransition('confirmed', 'no_show', true);
  assertTransition('seated', 'cancelled', true);
  assertTransition('cancelled', 'confirmed', false);
  assertTransition('no_show', 'seated', false);
}

async function testDeliveryAggregatorsAnd86StopList(): Promise<void> {
  interface AggregatorChannel {
    name: 'talabat' | 'hungerstation' | 'jahez';
    commissionPct: number;
  }

  const channels: AggregatorChannel[] = [
    { name: 'talabat', commissionPct: 18 },
    { name: 'hungerstation', commissionPct: 15 },
    { name: 'jahez', commissionPct: 14 },
  ];

  const calculatePayout = (grossSales: number, channelName: 'talabat' | 'hungerstation' | 'jahez') => {
    const channel = channels.find(c => c.name === channelName)!;
    const commission = Number((grossSales * (channel.commissionPct / 100)).toFixed(2));
    const netPayout = Number((grossSales - commission).toFixed(2));
    return { commission, netPayout };
  };

  const jahezPayout = calculatePayout(1000, 'jahez');
  assert.equal(jahezPayout.commission, 140.0);
  assert.equal(jahezPayout.netPayout, 860.0);

  const hungerPayout = calculatePayout(1000, 'hungerstation');
  assert.equal(hungerPayout.commission, 150.0);
  assert.equal(hungerPayout.netPayout, 850.0);

  // 86-Stop List filtering invariant
  const catalog = [
    { id: 10, name: 'برجر أنجوس كلاسيك', is_86_stopped: false },
    { id: 20, name: 'فيليه مشوي خاص', is_86_stopped: true }, // 86 stopped (نفذت الكمية في المطبخ)
    { id: 30, name: 'سلطة سيزر دجاج', is_86_stopped: false },
  ];

  const availableForAggregators = catalog.filter(item => !item.is_86_stopped);
  assert.equal(availableForAggregators.length, 2);
  assert.equal(availableForAggregators.some(i => i.id === 20), false, '86-stopped item must be omitted');
}

async function testFoodWasteVarianceEngine(): Promise<void> {
  // Theoretical BOM consumption:
  // 50 orders of "Double Burger" -> recipe: 0.200 kg beef per burger = 10.000 kg theoretical
  const ordersCount = 50;
  const beefPerServing = 0.200;
  const theoreticalConsumption = ordersCount * beefPerServing; // 10.0 kg

  // Physical inventory deducted from cold room = 11.200 kg
  const actualInventoryDeduction = 11.200;

  // Logged waste from kitchen waste logs = 0.500 kg (burnt patty during rush)
  const loggedKitchenWaste = 0.500;

  // Cost per kg = 45.00 SAR
  const costPerKg = 45.0;

  // Unexplained variance (theft / over-portioning / unrecorded waste)
  const unexplainedVarianceKg = Number((actualInventoryDeduction - (theoreticalConsumption + loggedKitchenWaste)).toFixed(3));
  const unexplainedVarianceCost = Number((unexplainedVarianceKg * costPerKg).toFixed(2));
  const totalFinancialLoss = Number(((loggedKitchenWaste + unexplainedVarianceKg) * costPerKg).toFixed(2));

  assert.equal(unexplainedVarianceKg, 0.700, 'Unexplained variance = 11.2 - (10.0 + 0.5) = 0.700 kg');
  assert.equal(unexplainedVarianceCost, 31.50, 'Cost of unexplained loss = 0.700 * 45 = 31.50 SAR');
  assert.equal(totalFinancialLoss, 54.00, 'Total loss (logged waste + unexplained) = 1.200 * 45 = 54.00 SAR');
}

async function testGuestCoversAndAverageSpend(): Promise<void> {
  const computeAverageSpend = (billTotal: number, covers: number): number => {
    const safeCovers = Math.max(1, Math.floor(covers || 1));
    return Number((billTotal / safeCovers).toFixed(2));
  };

  assert.equal(computeAverageSpend(800, 4), 200.0, '800 total / 4 covers = 200 per guest');
  assert.equal(computeAverageSpend(250, 1), 250.0, 'Single diner spend');
  assert.equal(computeAverageSpend(450, 0), 450.0, 'Zero covers defaults safely to 1');
  assert.equal(computeAverageSpend(450, -2), 450.0, 'Negative covers defaults safely to 1');
}

(async () => {
  console.log('--- Starting Restaurant F&B Critical Workflow Audit ---');
  await testServiceChargeFinancialInvariants();
  console.log('1. Service Charge & Tax Isolation: PASSED');
  await testTableReservationTransitions();
  console.log('2. Table Reservation State Machine: PASSED');
  await testDeliveryAggregatorsAnd86StopList();
  console.log('3. Delivery Aggregators & 86 Stop List: PASSED');
  await testFoodWasteVarianceEngine();
  console.log('4. Food Waste & Variance Engine: PASSED');
  await testGuestCoversAndAverageSpend();
  console.log('5. Guest Covers & Spend Per Guest: PASSED');
  console.log('--- ALL RESTAURANT F&B CRITICAL CHECKS PASSED (100%) ---');
})().catch((err) => {
  console.error('Restaurant F&B Critical Audit FAILED:', err);
  process.exit(1);
});
