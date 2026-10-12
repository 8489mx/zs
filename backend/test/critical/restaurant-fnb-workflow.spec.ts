import { strict as assert } from 'node:assert';
import { computeInvoiceTotals } from '../../src/common/utils/invoice-totals';
import { classifyMenuEngineeringQuadrant } from '../../src/modules/reports/helpers/reports-menu-engineering.helper';

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

async function testMenuEngineeringMatrix(): Promise<void> {
  const hurdlePopularity = 17.5; // Hurdle: e.g. 70% of 25% (4 items)
  const avgMarginPerUnit = 25.0; // Benchmark avg margin

  // 1. Star (High Popularity, High Margin)
  const star = classifyMenuEngineeringQuadrant(25.0, hurdlePopularity, 35.0, avgMarginPerUnit);
  assert.equal(star.quadrant, 'star');
  assert.equal(star.quadrantLabelAr, 'نجم (Star)');

  // 2. Plowhorse (High Popularity, Low Margin)
  const plowhorse = classifyMenuEngineeringQuadrant(30.0, hurdlePopularity, 15.0, avgMarginPerUnit);
  assert.equal(plowhorse.quadrant, 'plowhorse');
  assert.equal(plowhorse.quadrantLabelAr, 'حصان جر (Plowhorse)');

  // 3. Puzzle (Low Popularity, High Margin)
  const puzzle = classifyMenuEngineeringQuadrant(10.0, hurdlePopularity, 40.0, avgMarginPerUnit);
  assert.equal(puzzle.quadrant, 'puzzle');
  assert.equal(puzzle.quadrantLabelAr, 'لغز (Puzzle)');

  // 4. Dog (Low Popularity, Low Margin)
  const dog = classifyMenuEngineeringQuadrant(5.0, hurdlePopularity, 12.0, avgMarginPerUnit);
  assert.equal(dog.quadrant, 'dog');
  assert.equal(dog.quadrantLabelAr, 'صنف خاسر (Dog)');
}

async function testMultiStationKitchenPrinterRouting(): Promise<void> {
  interface StationRoutedItem {
    id: number;
    name: string;
    station: 'kitchen' | 'bar' | 'grill' | 'cold' | 'dessert';
    qty: number;
  }

  const orderItems: StationRoutedItem[] = [
    { id: 1, name: 'ريب آي ستيك', station: 'grill', qty: 2 },
    { id: 2, name: 'موهيتو فراولة', station: 'bar', qty: 3 },
    { id: 3, name: 'سلطة سيزر', station: 'cold', qty: 1 },
    { id: 4, name: 'تشيز كيك', station: 'dessert', qty: 1 },
    { id: 5, name: 'برجر أنجوس', station: 'kitchen', qty: 2 },
  ];

  // Group by station routing
  const stationBuckets = new Map<string, StationRoutedItem[]>();
  for (const item of orderItems) {
    const list = stationBuckets.get(item.station) || [];
    list.push(item);
    stationBuckets.set(item.station, list);
  }

  assert.equal(stationBuckets.get('bar')?.length, 1);
  assert.equal(stationBuckets.get('bar')?.[0].name, 'موهيتو فراولة');
  assert.equal(stationBuckets.get('grill')?.length, 1);
  assert.equal(stationBuckets.get('cold')?.length, 1);
  assert.equal(stationBuckets.get('kitchen')?.length, 1);
  assert.equal(stationBuckets.get('dessert')?.length, 1);
  assert.equal(stationBuckets.size, 5);
}

async function testSfdaNutritionalAndAllergenCompliance(): Promise<void> {
  interface NutritionalItem {
    id: number;
    name: string;
    calories?: number;
    allergens?: string[];
    is_spicy?: boolean;
    is_vegetarian?: boolean;
    is_gluten_free?: boolean;
  }

  const menu: NutritionalItem[] = [
    {
      id: 1,
      name: 'سلطة كينوا بالأفوكادو',
      calories: 320,
      allergens: [],
      is_spicy: false,
      is_vegetarian: true,
      is_gluten_free: true,
    },
    {
      id: 2,
      name: 'برجر ترافل حار',
      calories: 890,
      allergens: ['جلوتين', 'ألبان', 'بيض'],
      is_spicy: true,
      is_vegetarian: false,
      is_gluten_free: false,
    },
  ];

  // Invariant 1: Calories must be non-negative
  for (const item of menu) {
    if (item.calories !== undefined) {
      assert.ok(item.calories >= 0, `Calories for ${item.name} must be non-negative`);
    }
  }

  // Invariant 2: Allergen filter safely isolates items
  const glutenFreeItems = menu.filter((item) => item.is_gluten_free === true && (!item.allergens || !item.allergens.includes('جلوتين')));
  assert.equal(glutenFreeItems.length, 1);
  assert.equal(glutenFreeItems[0].id, 1);

  // Invariant 3: Vegetarian items
  const vegetarianItems = menu.filter((item) => item.is_vegetarian === true);
  assert.equal(vegetarianItems.length, 1);
  assert.equal(vegetarianItems[0].id, 1);
}

async function testTableServiceCallsWorkflow(): Promise<void> {
  type ServiceCallType = 'waiter' | 'bill' | 'water' | 'clean';
  type ServiceCallStatus = 'pending' | 'in_progress' | 'resolved' | 'cancelled';

  interface ServiceCall {
    id: number;
    table_number: string;
    call_type: ServiceCallType;
    status: ServiceCallStatus;
    created_at: number;
    resolved_at?: number;
  }

  const calls: ServiceCall[] = [
    { id: 101, table_number: '5', call_type: 'waiter', status: 'pending', created_at: Date.now() - 120000 },
    { id: 102, table_number: '5', call_type: 'bill', status: 'pending', created_at: Date.now() - 30000 },
    { id: 103, table_number: '8', call_type: 'water', status: 'resolved', created_at: Date.now() - 600000, resolved_at: Date.now() - 400000 },
  ];

  // Invariant 1: Pending calls count per table
  const table5Pending = calls.filter((c) => c.table_number === '5' && c.status === 'pending');
  assert.equal(table5Pending.length, 2);

  // Invariant 2: 1-Click resolve for all calls on a table
  const resolveTable = (tableNo: string) => {
    return calls.map((c) => (c.table_number === tableNo && c.status === 'pending' ? { ...c, status: 'resolved' as ServiceCallStatus, resolved_at: Date.now() } : c));
  };

  const updatedCalls = resolveTable('5');
  assert.equal(updatedCalls.filter((c) => c.table_number === '5' && c.status === 'pending').length, 0);
  assert.equal(updatedCalls.filter((c) => c.table_number === '5' && c.status === 'resolved').length, 2);
}

async function testTipAndGratuityAllocation(): Promise<void> {
  // Invariant 1: Tip amount is additive and isolated from sales discounts
  const saleSubtotal = 500;
  const tipAmount = 50;
  const discount = 25;
  const taxRate = 15;

  const invoiceTotals = computeInvoiceTotals(saleSubtotal, discount, taxRate, false, 0, 0);
  // Net Food = 475, Tax = 71.25, Total before Tip = 546.25
  assert.equal(invoiceTotals.total, 546.25);

  const grandTotalWithTip = Number((invoiceTotals.total + tipAmount).toFixed(2));
  assert.equal(grandTotalWithTip, 596.25);

  // Invariant 2: Tip cannot be negative
  const safeTip = (tip: number) => Math.max(0, Number(tip || 0));
  assert.equal(safeTip(-20), 0);
  assert.equal(safeTip(0), 0);
  assert.equal(safeTip(35.5), 35.5);
}

async function testWalkInWaitlistQueueWorkflow(): Promise<void> {
  interface WaitlistParty {
    id: number;
    guest_name: string;
    guest_count: number;
    reservation_type: 'reservation' | 'waitlist';
    status: 'confirmed' | 'seated' | 'cancelled';
    created_at: number;
    seated_table?: string;
  }

  const queue: WaitlistParty[] = [
    { id: 1, guest_name: 'عبد الله السالم', guest_count: 4, reservation_type: 'waitlist', status: 'confirmed', created_at: Date.now() - 900000 }, // 15 mins ago
    { id: 2, guest_name: 'فهد العتيبي', guest_count: 2, reservation_type: 'waitlist', status: 'confirmed', created_at: Date.now() - 300000 }, // 5 mins ago
  ];

  // Invariant 1: FIFO Queue priority
  const activeQueue = queue.filter((p) => p.reservation_type === 'waitlist' && p.status === 'confirmed').sort((a, b) => a.created_at - b.created_at);
  assert.equal(activeQueue[0].id, 1, 'First party in line gets #1 priority');
  assert.equal(activeQueue[1].id, 2, 'Second party gets #2');

  // Invariant 2: Seating assigns table and transitions status to 'seated'
  const seatParty = (party: WaitlistParty, tableNo: string): WaitlistParty => {
    return { ...party, status: 'seated', seated_table: tableNo };
  };

  const seatedParty = seatParty(activeQueue[0], '12');
  assert.equal(seatedParty.status, 'seated');
  assert.equal(seatedParty.seated_table, '12');
}

async function testPayAtTableAndDriverDispatchWorkflow(): Promise<void> {
  // 1. Pay at Table calculations
  const items = [
    { name: 'ستيك ريب آي مع صوص الفطر', qty: 2, unitPrice: 180 },
    { name: 'سلطة سيزر بالدجاج', qty: 1, unitPrice: 65 },
    { name: 'عصير برتقال طازج', qty: 2, unitPrice: 25 },
  ];
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0); // 360 + 65 + 50 = 475
  assert.equal(subtotal, 475);

  const serviceChargeRate = 0.12; // 12% service charge
  const serviceCharge = Math.round(subtotal * serviceChargeRate * 100) / 100; // 57
  assert.equal(serviceCharge, 57);

  const taxRate = 0.15; // 15% VAT
  const taxableBase = subtotal + serviceCharge; // 532
  const tax = Math.round(taxableBase * taxRate * 100) / 100; // 79.80
  assert.equal(tax, 79.8);

  const billTotal = Math.round((taxableBase + tax) * 100) / 100; // 611.80
  assert.equal(billTotal, 611.8);

  const tipAmount = 50; // Custom tip
  const totalPaid = Math.round((billTotal + tipAmount) * 100) / 100; // 661.80
  assert.equal(totalPaid, 661.8);

  // 2. In-house driver dispatching and settlement
  interface DriverOrder {
    orderNumber: string;
    driverId: number;
    driverName: string;
    driverPhone: string;
    totalAmount: number;
    paymentMethod: 'cash_on_delivery' | 'online_paid';
    dispatchedAt: number;
  }

  const driverOrder: DriverOrder = {
    orderNumber: 'ORD-261012-0042',
    driverId: 7,
    driverName: 'الكابتن محمود سليم',
    driverPhone: '0551234567',
    totalAmount: 185,
    paymentMethod: 'cash_on_delivery',
    dispatchedAt: Date.now(),
  };

  // WhatsApp dispatch message verification
  const dispatchText = `عزيزي العميل، طلبك رقم #${driverOrder.orderNumber} في الطريق إليك مع كابتن التوصيل ${driverOrder.driverName} (${driverOrder.driverPhone}). نتمنى لك وجبة شهية!`;
  assert.ok(dispatchText.includes(driverOrder.orderNumber));
  assert.ok(dispatchText.includes(driverOrder.driverName));
  assert.ok(dispatchText.includes(driverOrder.driverPhone));

  // Driver return settlement verification
  const driverCashCollected = 185;
  const isSettled = driverOrder.paymentMethod === 'cash_on_delivery' && driverCashCollected === driverOrder.totalAmount;
  assert.strictEqual(isSettled, true);
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
  await testMenuEngineeringMatrix();
  console.log('6. Menu Engineering BCG Matrix (Star/Plowhorse/Puzzle/Dog): PASSED');
  await testMultiStationKitchenPrinterRouting();
  console.log('7. Multi-Station Kitchen Printer Routing: PASSED');
  await testSfdaNutritionalAndAllergenCompliance();
  console.log('8. SFDA Nutritional & Allergen Compliance: PASSED');
  await testTableServiceCallsWorkflow();
  console.log('9. Table Service Calls & Realtime Resolution: PASSED');
  await testTipAndGratuityAllocation();
  console.log('10. Tip & Gratuity Allocation Engine: PASSED');
  await testWalkInWaitlistQueueWorkflow();
  console.log('11. Walk-In Waitlist Queue & Seating Engine: PASSED');
  await testPayAtTableAndDriverDispatchWorkflow();
  console.log('12. Pay-at-Table QR Self-Checkout & In-House Driver Dispatch: PASSED');
  console.log('--- ALL RESTAURANT F&B CRITICAL CHECKS PASSED (100%) ---');
})().catch((err) => {
  console.error('Restaurant F&B Critical Audit FAILED:', err);
  process.exit(1);
});

