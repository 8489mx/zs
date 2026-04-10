export function quantityTone(value: number) {
  if (value > 0) return 'delta-positive';
  if (value < 0) return 'delta-negative';
  return '';
}
