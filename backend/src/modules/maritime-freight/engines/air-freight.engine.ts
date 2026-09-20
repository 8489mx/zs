/**
 * Pure Calculation Engine: Air Freight & Multimodal Logistics
 *
 * Implements Rule #13 (Financial & Operational Audit Protocol):
 * - Pure functions with zero external side effects or database calls.
 * - Single Source of Truth for IATA Volumetric & Chargeable Weight calculations.
 * - IATA Modulo-7 Air Waybill (AWB) validation and formatting.
 * - Air Freight surcharge and weight-break cost calculations.
 */

export interface CargoDimension {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  quantity: number;
}

export interface AirWeightCalculationInput {
  grossWeightKg: number;
  cbm?: number;
  dimensions?: CargoDimension[];
}

export interface AirWeightCalculationResult {
  grossWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  totalCbm: number;
  dominantFactor: 'weight' | 'volume';
  volumeRatio: number; // volumetric / gross
}

/**
 * Calculates Volumetric Weight and Chargeable Weight according to IATA Air Cargo Standard:
 * 1 CBM = 166.67 kg (Ratio 1:6000 cm3/kg).
 * Chargeable Weight = Max(Gross Weight, Volumetric Weight).
 */
export function calculateAirChargeableWeight(input: AirWeightCalculationInput): AirWeightCalculationResult {
  const grossWeightKg = Math.max(0, Number(input.grossWeightKg || 0));
  let totalCbm = 0;
  let volumetricWeightKg = 0;

  if (input.dimensions && input.dimensions.length > 0) {
    let totalCubicCm = 0;
    for (const d of input.dimensions) {
      const l = Math.max(0, Number(d.lengthCm || 0));
      const w = Math.max(0, Number(d.widthCm || 0));
      const h = Math.max(0, Number(d.heightCm || 0));
      const q = Math.max(1, Number(d.quantity || 1));
      totalCubicCm += l * w * h * q;
    }
    // IATA Standard divisor: 6000 cm3 = 1 kg
    volumetricWeightKg = Math.round((totalCubicCm / 6000) * 1000) / 1000;
    totalCbm = Math.round((totalCubicCm / 1000000) * 1000) / 1000;
  } else if (input.cbm && Number(input.cbm) > 0) {
    totalCbm = Math.round(Number(input.cbm) * 1000) / 1000;
    // 1 CBM = 166.67 kg in air freight
    volumetricWeightKg = Math.round((totalCbm * 166.667) * 1000) / 1000;
  }

  const chargeableWeightKg = Math.round(Math.max(grossWeightKg, volumetricWeightKg) * 1000) / 1000;
  const dominantFactor = volumetricWeightKg > grossWeightKg ? 'volume' : 'weight';
  const volumeRatio = grossWeightKg > 0 ? Math.round((volumetricWeightKg / grossWeightKg) * 100) / 100 : 0;

  return {
    grossWeightKg,
    volumetricWeightKg,
    chargeableWeightKg,
    totalCbm,
    dominantFactor,
    volumeRatio,
  };
}

export interface AirFreightCostInput {
  chargeableWeightKg: number;
  ratePerKg: number;
  minCharge?: number;
  fuelSurchargePerKg?: number;
  securitySurchargePerKg?: number;
  awbDocumentationFee?: number;
  otherCharges?: number;
}

export interface AirFreightCostResult {
  chargeableWeightKg: number;
  baseWeightCharge: number;
  isMinimumChargeApplied: boolean;
  fuelSurcharge: number;
  securitySurcharge: number;
  awbFee: number;
  otherCharges: number;
  totalCost: number;
}

/**
 * Calculates Air Freight Cost with standard surcharges (FSC, SSC) and Minimum Charge rules.
 */
export function calculateAirFreightCost(input: AirFreightCostInput): AirFreightCostResult {
  const cw = Math.max(0, Number(input.chargeableWeightKg || 0));
  const rate = Math.max(0, Number(input.ratePerKg || 0));
  const minCharge = Math.max(0, Number(input.minCharge || 0));

  const rawWeightCharge = Math.round(cw * rate * 100) / 100;
  const isMinimumChargeApplied = minCharge > 0 && rawWeightCharge < minCharge;
  const baseWeightCharge = isMinimumChargeApplied ? minCharge : rawWeightCharge;

  const fuelSurcharge = Math.round(cw * Math.max(0, Number(input.fuelSurchargePerKg || 0)) * 100) / 100;
  const securitySurcharge = Math.round(cw * Math.max(0, Number(input.securitySurchargePerKg || 0)) * 100) / 100;
  const awbFee = Math.round(Math.max(0, Number(input.awbDocumentationFee || 0)) * 100) / 100;
  const otherCharges = Math.round(Math.max(0, Number(input.otherCharges || 0)) * 100) / 100;

  const totalCost = Math.round((baseWeightCharge + fuelSurcharge + securitySurcharge + awbFee + otherCharges) * 100) / 100;

  return {
    chargeableWeightKg: cw,
    baseWeightCharge,
    isMinimumChargeApplied,
    fuelSurcharge,
    securitySurcharge,
    awbFee,
    otherCharges,
    totalCost,
  };
}

export interface AwbValidationResult {
  valid: boolean;
  airlinePrefix?: string;
  serialNumber?: string;
  checkDigit?: number;
  formattedAwb?: string;
  error?: string;
}

/**
 * Validates an Air Waybill (AWB) number according to the IATA Modulo-7 check digit standard.
 * Standard format: PPP-SSSSSSSC (3-digit airline prefix + 7-digit serial + 1-digit check digit).
 * The check digit is equal to: (7-digit serial) mod 7.
 */
export function validateIataAwbNumber(awb: string): AwbValidationResult {
  if (!awb || typeof awb !== 'string') {
    return { valid: false, error: 'رقم بوليصة الشحن الجوي AWB مطلوب' };
  }

  // Remove spaces, hyphens, slashes
  const clean = awb.replace(/[\s\-\/]/g, '');

  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(clean)) {
    return {
      valid: false,
      error: 'رقم بوليصة الشحن الجوي يجب أن يتكون من 11 رقماً (3 أرقام كود شركة الطيران + 8 أرقام متسلسلة)',
    };
  }

  const airlinePrefix = clean.slice(0, 3);
  const serial7 = clean.slice(3, 10);
  const checkDigit = Number(clean.slice(10, 11));

  const expectedCheckDigit = Number(serial7) % 7;
  const isCheckDigitValid = expectedCheckDigit === checkDigit;

  const formattedAwb = `${airlinePrefix}-${serial7.slice(0, 4)} ${serial7.slice(4)}${checkDigit}`;

  if (!isCheckDigitValid) {
    return {
      valid: false,
      airlinePrefix,
      serialNumber: serial7,
      checkDigit,
      formattedAwb,
      error: `رقم التحقق (Check Digit) غير صحيح: المتوقع ${expectedCheckDigit} لكن المسجل ${checkDigit} (IATA Modulo-7 Rule)`,
    };
  }

  return {
    valid: true,
    airlinePrefix,
    serialNumber: serial7,
    checkDigit,
    formattedAwb,
  };
}

export const IATA_CARGO_IQ_MILESTONES = [
  { key: 'RCS', title_ar: 'استلام الشحنة بمستودع المطار (GTI)', title_en: 'Cargo Received from Shipper', category: 'origin' },
  { key: 'MAN', title_ar: 'إدراج الشحنة على مانيفست الرحلة', title_en: 'Manifested on Flight', category: 'origin' },
  { key: 'DEP', title_ar: 'إقلاع رحلة الشحن الجوي (ATD)', title_en: 'Flight Departed', category: 'flight' },
  { key: 'ARR', title_ar: 'هبوط ووصول الرحلة بمطار المقصد (ATA)', title_en: 'Flight Arrived', category: 'flight' },
  { key: 'RCF', title_ar: 'تفريغ ودخول الشحنة مستودع المطار', title_en: 'Cargo Received from Flight', category: 'destination' },
  { key: 'CUST', title_ar: 'إنهاء الإفراج والتخليص الجمركي بالمطار', title_en: 'Customs Cleared', category: 'destination' },
  { key: 'NFD', title_ar: 'إشعار العميل المستلم بالوصول', title_en: 'Consignee Notified', category: 'destination' },
  { key: 'AWD', title_ar: 'تسليم إذن التسليم والمستندات', title_en: 'Documents Delivered', category: 'delivery' },
  { key: 'DLV', title_ar: 'تسليم الشحنة للعميل نهائياً (POD)', title_en: 'Cargo Delivered (Proof of Delivery)', category: 'delivery' },
] as const;
