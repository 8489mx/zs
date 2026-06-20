import { sharedProductsApi } from '@/shared/api/products';
import type { Product } from '@/types/domain';

export interface ManufacturingComponent {
  id: string;
  name: string;
  code?: string;
  baseUnit: string;
  costPerBaseUnit: number;
  stock: number;
}

// Map a Product from the inventory API to a ManufacturingComponent
function mapProductToComponent(product: Product): ManufacturingComponent {
  const baseUnitObj = product.units?.find(u => u.isBaseUnit) || product.units?.[0];
  return {
    id: product.id,
    name: product.name,
    code: product.barcode || '',
    baseUnit: baseUnitObj?.name || 'kg',
    costPerBaseUnit: product.costPrice || 0,
    stock: product.stock || 0,
  };
}

export const componentsApi = {
  list: async (): Promise<ManufacturingComponent[]> => {
    try {
      const allProducts = await sharedProductsApi.list();
      // Only return products that are classified as raw materials
      const rawMaterials = allProducts.filter(p => p.itemType === 'raw_material');
      return rawMaterials.map(mapProductToComponent);
    } catch (e) {
      console.error('Error fetching raw materials from products API', e);
      return [];
    }
  },
  
  create: async (data: Omit<ManufacturingComponent, 'id'>): Promise<ManufacturingComponent> => {
    try {
      // Map ManufacturingComponent data to Product creation payload
      const productPayload = {
        name: data.name,
        barcode: data.code || '',
        costPrice: data.costPerBaseUnit,
        retailPrice: 0,
        wholesalePrice: 0,
        stock: 0,
        minStock: 0,
        notes: '',
        units: [{
          name: data.baseUnit,
          multiplier: 1,
          barcode: data.code || '',
          isBaseUnit: true,
          isSaleUnit: false,
          isPurchaseUnit: true
        }],
        itemType: 'raw_material',
      };
      
      const newProduct = await sharedProductsApi.create(productPayload) as Product;
      return mapProductToComponent(newProduct);
    } catch (e) {
      console.error('Error creating raw material via products API', e);
      throw e;
    }
  },
  
  update: async (_id: string, _data: Partial<ManufacturingComponent>): Promise<ManufacturingComponent> => {
    // In a real application, you would call `productsApi.update`.
    // Since sharedProductsApi doesn't expose update yet, we'll throw an error for now
    // or you could import `productsApi` from features if necessary.
    throw new Error('Update component requires products API integration update');
  },
  
  delete: async (_id: string): Promise<void> => {
    // Similarly, requires products API delete method
    throw new Error('Delete component requires products API integration update');
  }
};
