import { DemoActivityDataset } from './types';
import { supermarketDataset } from './supermarket.dataset';
import { fashionDataset } from './fashion.dataset';
import { cafeDataset } from './cafe.dataset';
import { electronicsDataset } from './electronics.dataset';
import { pharmacyDataset } from './pharmacy.dataset';

export * from './types';

export const DEMO_DATASETS: Record<string, DemoActivityDataset> = {
  supermarket: supermarketDataset,
  fashion: fashionDataset,
  cafe_restaurant: cafeDataset,
  electronics_mobile: electronicsDataset,
  pharmacy: pharmacyDataset,
};

export function getDemoDataset(activityKey?: string): DemoActivityDataset {
  const key = String(activityKey || 'supermarket').trim().toLowerCase();
  return DEMO_DATASETS[key] || supermarketDataset;
}

export function listSupportedDemoActivities() {
  return Object.values(DEMO_DATASETS).map((d) => ({
    key: d.key,
    name: d.name,
    icon: d.icon,
    tagline: d.tagline,
    description: d.description,
    categoriesCount: d.categories.length,
    categoryCount: d.categories.length,
    productsCount: d.products.length,
    productCount: d.products.length,
    sampleItems: d.products.slice(0, 4).map((p) => p.name),
    sampleProducts: d.products.slice(0, 4).map((p) => p.name),
    sampleCategories: d.categories.slice(0, 4),
  }));
}
