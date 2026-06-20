export type UnitCategory = 'weight' | 'volume' | 'length' | 'quantity';

export interface UnitDefinition {
  id: string;
  name: string;
  aliases?: string[];
  category: UnitCategory;
  multiplier: number; // Multiplier relative to the base unit of the category
  isBase: boolean;
}

// Base units: Weight = kg, Volume = liter, Length = meter, Quantity = piece
export const MANUFACTURING_UNITS: UnitDefinition[] = [
  // Weights
  { id: 'ton', name: 'طن', aliases: ['ton', 'طن'], category: 'weight', multiplier: 1000, isBase: false },
  { id: 'kg', name: 'كجم', aliases: ['kg', 'كجم', 'كيلو', 'كيلوجرام', 'kilo', 'kilogram'], category: 'weight', multiplier: 1, isBase: true },
  { id: 'g', name: 'جرام', aliases: ['g', 'جرام', 'gram'], category: 'weight', multiplier: 0.001, isBase: false },
  { id: 'mg', name: 'ملليجرام', aliases: ['mg', 'ملليجرام', 'مليجرام', 'milligram'], category: 'weight', multiplier: 0.000001, isBase: false },
  
  // Volumes
  { id: 'liter', name: 'لتر', aliases: ['liter', 'لتر', 'لترات'], category: 'volume', multiplier: 1, isBase: true },
  { id: 'ml', name: 'مليلتر', aliases: ['ml', 'مليلتر', 'ملي', 'milliliter'], category: 'volume', multiplier: 0.001, isBase: false },
  
  // Lengths
  { id: 'meter', name: 'متر', aliases: ['meter', 'متر', 'm'], category: 'length', multiplier: 1, isBase: true },
  { id: 'cm', name: 'سم', aliases: ['cm', 'سم', 'سنتيمتر', 'centimeter'], category: 'length', multiplier: 0.01, isBase: false },
  { id: 'mm', name: 'مم', aliases: ['mm', 'مم', 'ملليمتر', 'millimeter'], category: 'length', multiplier: 0.001, isBase: false },
  
  // Quantities
  { id: 'piece', name: 'قطعة', aliases: ['piece', 'قطعة', 'حبه', 'حبة', 'pcs'], category: 'quantity', multiplier: 1, isBase: true },
  { id: 'dozen', name: 'دستة', aliases: ['dozen', 'دستة', 'دسته'], category: 'quantity', multiplier: 12, isBase: false },
];

export function findUnit(identifier: string): UnitDefinition | undefined {
  if (!identifier) return undefined;
  const lowerId = identifier.trim().toLowerCase();
  return MANUFACTURING_UNITS.find(u => 
    u.id === lowerId || 
    u.name === identifier.trim() || 
    (u.aliases && u.aliases.includes(lowerId)) ||
    (u.aliases && u.aliases.includes(identifier.trim()))
  );
}

/**
 * Get all available units
 */
export function getAllUnits(): UnitDefinition[] {
  return MANUFACTURING_UNITS;
}

/**
 * Get units by category
 */
export function getUnitsByCategory(category: UnitCategory): UnitDefinition[] {
  return MANUFACTURING_UNITS.filter(u => u.category === category);
}

/**
 * Calculate expected cost based on unit conversion.
 * 
 * @param baseCost The cost of 1 base unit of the component
 * @param baseUnitName The name of the base unit (e.g. 'كجم')
 * @param targetUnitName The name of the target unit selected in BOM (e.g. 'جرام')
 * @param targetQuantity The quantity entered in the target unit
 * @returns The calculated expected cost
 */
export function calculateConvertedCost(
  baseCost: number, 
  baseUnitName: string, 
  targetUnitName: string, 
  targetQuantity: number
): number {
  if (!baseCost || !targetQuantity) return 0;
  
  const baseUnitDef = findUnit(baseUnitName);
  const targetUnitDef = findUnit(targetUnitName);
  
  // If units are not found, or they are in different categories, fallback to direct multiplication
  if (!baseUnitDef || !targetUnitDef || baseUnitDef.category !== targetUnitDef.category) {
    return baseCost * targetQuantity;
  }
  
  // Formula: (targetQuantity * targetMultiplier) = quantity in base category units
  // Then divide by baseUnitDef.multiplier to get quantity in the specific base unit
  // Then multiply by baseCost
  const ratio = targetUnitDef.multiplier / baseUnitDef.multiplier;
  return baseCost * targetQuantity * ratio;
}
