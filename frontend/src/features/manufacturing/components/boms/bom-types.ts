export type BomLine = {
  id: number;
  componentId: string | null;
  componentName: string;
  quantity: number;
  unitName: string; // The selected unit
  baseUnit: string; // The component's base unit
  baseCost: number; // The component's base cost
  expectedCost: number; // Calculated cost per 1 selected unit
  wastePercentage: number;
  query: string;
};
