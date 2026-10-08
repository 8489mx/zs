import { strict as assert } from 'node:assert';
import {
  calculateTrucksRequired,
  calculateRoadFreightCost,
  validateCmrWaybillNumber,
  STANDARD_TRUCK_SPECIFICATIONS,
  ROAD_FREIGHT_MILESTONES,
} from './road-freight.engine';

console.log('[RoadFreightEngine] Starting unit tests...');

// 1. Zero state test
{
  const res = calculateTrucksRequired({
    grossWeightKg: 0,
    totalCbm: 0,
    palletCount: 0,
    preferredTruckType: 'flatbed',
  });
  assert.equal(res.requiredTrucks, 0);
  assert.equal(res.limitingFactor, 'none');
  assert.equal(res.weightUtilizationPercent, 0);
}

// 2. Weight-limiting cargo: 60,000 kg on Flatbed (28T max)
// requires ceil(60000 / 28000) = 3 trucks
{
  const res = calculateTrucksRequired({
    grossWeightKg: 60000,
    totalCbm: 40,
    palletCount: 20,
    preferredTruckType: 'flatbed',
  });
  assert.equal(res.requiredTrucks, 3);
  assert.equal(res.trucksByWeight, 3);
  assert.equal(res.limitingFactor, 'weight');
  assert.equal(res.weightUtilizationPercent, 71.43);
}

// 3. Volume-limiting cargo: 180 CBM on Curtainsider (86 CBM max, 26T payload)
// requires ceil(180 / 86) = 3 trucks
{
  const res = calculateTrucksRequired({
    grossWeightKg: 10000,
    totalCbm: 180,
    palletCount: 30,
    preferredTruckType: 'curtainsider',
  });
  assert.equal(res.requiredTrucks, 3);
  assert.equal(res.trucksByVolume, 3);
  assert.equal(res.limitingFactor, 'volume');
  assert.equal(res.volumeUtilizationPercent, 69.77);
}

// 4. Pallet-limiting cargo: 70 non-stackable pallets on Flatbed (33 pallets max)
// requires ceil(70 / 33) = 3 trucks
{
  const res = calculateTrucksRequired({
    grossWeightKg: 15000,
    totalCbm: 45,
    palletCount: 70,
    preferredTruckType: 'flatbed',
  });
  assert.equal(res.requiredTrucks, 3);
  assert.equal(res.trucksByPallets, 3);
  assert.equal(res.limitingFactor, 'pallets');
  assert.equal(res.palletUtilizationPercent, 70.71);
}

// 5. Pickup light truck: 1,200 kg (1.8T max)
{
  const res = calculateTrucksRequired({
    grossWeightKg: 1200,
    totalCbm: 5,
    palletCount: 2,
    preferredTruckType: 'pickup',
  });
  assert.equal(res.requiredTrucks, 1);
  assert.equal(res.truckType, 'pickup');
  assert.equal(res.weightUtilizationPercent, 66.67);
}

// 6. Cost calculation - per_trip mode with tolls, fuel, detention
{
  const cost = calculateRoadFreightCost({
    pricingMode: 'per_trip',
    rate: 5500, // 5500 EGP per trip
    truckCount: 2,
    roadTollsFee: 600, // كارتات
    fuelSurcharge: 400,
    detentionDays: 1, // مبيت يوم
    detentionDailyRate: 1000, // 1000 per truck
    emptyReturnFee: 1500,
  });

  assert.equal(cost.baseFreightCost, 11000);
  assert.equal(cost.detentionCost, 2000);
  assert.equal(cost.totalCost, 15500);
}

// 7. Cost calculation - per_ton mode
{
  const cost = calculateRoadFreightCost({
    pricingMode: 'per_ton',
    rate: 250, // 250 EGP per ton
    grossWeightTons: 28,
    roadTollsFee: 300,
  });

  assert.equal(cost.baseFreightCost, 7000);
  assert.equal(cost.totalCost, 7300);
}

// 8. Cost calculation - per_km mode with cross-border charges
{
  const cost = calculateRoadFreightCost({
    pricingMode: 'per_km',
    rate: 15,
    distanceKm: 800,
    truckCount: 1,
    customsBorderFee: 2500,
    escortOverweightFee: 1200,
  });

  assert.equal(cost.baseFreightCost, 12000);
  assert.equal(cost.customsBorderFee, 2500);
  assert.equal(cost.escortOverweightFee, 1200);
  assert.equal(cost.totalCost, 15700);
}

// 9. CMR / Waybill validation
{
  assert.equal(validateCmrWaybillNumber('').valid, false);
  assert.equal(validateCmrWaybillNumber('AB').valid, false);
  assert.equal(validateCmrWaybillNumber('CMR#123*').valid, false);

  const cmr = validateCmrWaybillNumber('CMR-EG-260914-001');
  assert.equal(cmr.valid, true);
  assert.equal(cmr.isInternationalCmr, true);
  assert.equal(cmr.cleanNumber, 'CMR-EG-260914-001');

  const domestic = validateCmrWaybillNumber('WB-8829103');
  assert.equal(domestic.valid, true);
  assert.equal(domestic.isInternationalCmr, false);
}

// 10. Milestones check
{
  const keys = ROAD_FREIGHT_MILESTONES.map((m) => m.key);
  assert.ok(keys.includes('TRK_ASSIGN'));
  assert.ok(keys.includes('TRK_GATE_IN'));
  assert.ok(keys.includes('TRK_LOADED'));
  assert.ok(keys.includes('TRK_DISPATCH'));
  assert.ok(keys.includes('TRK_BORDER'));
  assert.ok(keys.includes('TRK_ARRIVED'));
  assert.ok(keys.includes('TRK_UNLOADED'));
  assert.ok(keys.includes('TRK_POD'));
}

console.log('[RoadFreightEngine] All unit tests passed cleanly (Exit 0)!');
