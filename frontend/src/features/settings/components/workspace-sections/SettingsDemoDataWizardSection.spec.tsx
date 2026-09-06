import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SettingsDemoDataWizardSection } from './SettingsDemoDataWizardSection';

vi.mock('@/features/settings/api/demo-data.api', () => ({
  demoDataApi: {
    getStatus: vi.fn().mockResolvedValue({
      isEmpty: true,
      productCount: 0,
      saleCount: 0,
      isSuperAdmin: true,
    }),
    getActivities: vi.fn().mockResolvedValue([
      {
        key: 'supermarket',
        name: 'سوبرماركت ومواد غذائية',
        icon: '🛒',
        tagline: 'هايبر ماركت، بقالة، ميني ماركت',
        description: 'يملأ النظام بتشكيلة واقعية من السلع الاستهلاكية',
        categoriesCount: 6,
        productsCount: 50,
        sampleItems: ['أرز الضحى', 'مكرونة روجينا', 'زيت عافية', 'شاي ليبتون'],
      },
      {
        key: 'fashion',
        name: 'أزياء وملابس وأحذية',
        icon: '👗',
        tagline: 'محلات ملابس، أحذية، حقائب، واكسسوارات',
        description: 'يملأ النظام بأصناف الموضة والمقاسات والألوان',
        categoryCount: 5,
        productCount: 45,
        sampleProducts: ['قميص كلاسيك', 'بنطلون جينز', 'حذاء جلدي', 'فستان سهرة'],
      },
    ]),
    seedDemoData: vi.fn(),
    clearDemoData: vi.fn(),
    wipeAllData: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SettingsDemoDataWizardSection Component', () => {
  it('renders demo wizard header and activity cards without crashing', async () => {
    const Wrapper = createWrapper();
    render(<SettingsDemoDataWizardSection />, { wrapper: Wrapper });

    expect(screen.getByText(/معالج استيراد البيانات التجريبية حسب النشاط/i)).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(screen.getAllByText('سوبرماركت ومواد غذائية').length).toBeGreaterThan(0);
      expect(screen.getByText('أزياء وملابس وأحذية')).toBeInTheDocument();
      expect(screen.getByText('أرز الضحى')).toBeInTheDocument();
      expect(screen.getByText('قميص كلاسيك')).toBeInTheDocument();
    });
  });
});
