import { http } from '@/lib/http';

export interface ManufacturingComponent {
  id: string;
  name: string;
  code?: string;
  baseUnit: string;
  costPerBaseUnit: number;
  stock: number;
}

// Temporary in-memory store for components if backend is not ready
const MOCK_STORAGE_KEY = 'manufacturing_mock_components';
const defaultMockComponents: ManufacturingComponent[] = [
  { id: 'comp_1', name: 'دقيق', code: 'FLR-01', baseUnit: 'kg', costPerBaseUnit: 30, stock: 500 },
  { id: 'comp_2', name: 'سكر', code: 'SGR-01', baseUnit: 'kg', costPerBaseUnit: 45, stock: 250 },
  { id: 'comp_3', name: 'زيت نباتي', code: 'OIL-01', baseUnit: 'liter', costPerBaseUnit: 60, stock: 100 },
  { id: 'comp_4', name: 'خميرة', code: 'YST-01', baseUnit: 'g', costPerBaseUnit: 0.1, stock: 5000 },
  { id: 'comp_5', name: 'مادة حافظة', code: 'PRV-01', baseUnit: 'g', costPerBaseUnit: 0.5, stock: 2000 },
  { id: 'comp_6', name: 'كرتونة تغليف', code: 'BOX-01', baseUnit: 'piece', costPerBaseUnit: 2.5, stock: 1000 },
];

function getMockComponents(): ManufacturingComponent[] {
  try {
    const saved = localStorage.getItem(MOCK_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultMockComponents;
}

function saveMockComponents(comps: ManufacturingComponent[]) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(comps));
}

let mockComponents = getMockComponents();

export const componentsApi = {
  list: async (): Promise<ManufacturingComponent[]> => {
    try {
      // Try fetching from real API first
      const res = await http<{ components: ManufacturingComponent[] }>('/api/manufacturing/components');
      return res.components || mockComponents;
    } catch (e) {
      // Fallback to mock data if API fails (404)
      return mockComponents;
    }
  },
  
  create: async (data: Omit<ManufacturingComponent, 'id'>): Promise<ManufacturingComponent> => {
    try {
      const res = await http<ManufacturingComponent>('/api/manufacturing/components', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res;
    } catch (e) {
      // Fallback
      const newComp = { ...data, id: `comp_${Date.now()}` };
      mockComponents.push(newComp);
      saveMockComponents(mockComponents);
      return newComp;
    }
  },
  
  update: async (id: string, data: Partial<ManufacturingComponent>): Promise<ManufacturingComponent> => {
    try {
      const res = await http<ManufacturingComponent>(`/api/manufacturing/components/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      return res;
    } catch (e) {
      // Fallback
      const index = mockComponents.findIndex(c => c.id === id);
      if (index > -1) {
        mockComponents[index] = { ...mockComponents[index], ...data };
        saveMockComponents(mockComponents);
        return mockComponents[index];
      }
      throw new Error('Component not found');
    }
  },
  
  delete: async (id: string): Promise<void> => {
    try {
      await http(`/api/manufacturing/components/${id}`, { method: 'DELETE' });
    } catch (e) {
      mockComponents = mockComponents.filter(c => c.id !== id);
      saveMockComponents(mockComponents);
    }
  }
};
