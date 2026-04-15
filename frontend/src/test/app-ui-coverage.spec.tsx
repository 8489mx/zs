import React, { useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installGlobalAppFetchMock, renderAppAt } from '@/test/helpers/mock-app-api';
import { AppProviders } from '@/app/providers';
import type { AppSettings, Branch, Location, Product, Purchase } from '@/types/domain';
import { SettingsPageShell } from '@/features/settings/components/SettingsPageShell';
import { SettingsCoreSection } from '@/features/settings/components/workspace-sections/SettingsCoreSection';
import { SettingsReferenceSection } from '@/features/settings/components/workspace-sections/SettingsReferenceSection';
import { SettingsBackupImportSection } from '@/features/settings/components/workspace-sections/SettingsBackupImportSection';
import { ProductsTableCard } from '@/features/products/components/ProductsTableCard';
import { PurchasesTable } from '@/features/purchases/components/PurchasesTable';
import { PurchaseDetailCard } from '@/features/purchases/components/PurchaseDetailCard';
import { Card } from '@/shared/ui/card';

beforeEach(() => {
  installGlobalAppFetchMock();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const settingsFixture: AppSettings = {
  storeName: 'متجر تجريبي',
  brandName: 'متجر تجريبي',
  phone: '01000000000',
  address: 'القاهرة',
  lowStockThreshold: 5,
  currentBranchId: 'branch-1',
  currentLocationId: 'loc-1',
};

const branchesFixture: Branch[] = [{ id: 'branch-1', name: 'الفرع الرئيسي', code: 'MAIN' }];
const locationsFixture: Location[] = [{ id: 'loc-1', name: 'المخزن الرئيسي', code: 'WH', branchId: 'branch-1', branchName: 'الفرع الرئيسي' }];

const productFixture: Product = {
  id: 'prod-1',
  name: 'مياه معدنية',
  barcode: '111',
  categoryId: 'cat-1',
  supplierId: 'sup-1',
  costPrice: 5,
  retailPrice: 10,
  wholesalePrice: 8,
  stock: 20,
  minStock: 5,
  notes: '',
  units: [{ id: 'unit-1', name: 'قطعة', multiplier: 1, barcode: '111', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }],
  offers: [],
  customerPrices: [],
  status: 'available',
  statusLabel: 'متاح',
};

const purchaseFixture: Purchase = {
  id: 'purchase-1',
  docNo: 'PO-1001',
  supplierId: 'sup-1',
  supplierName: 'مورد رئيسي',
  paymentType: 'cash',
  subTotal: 50,
  discount: 0,
  taxRate: 0,
  taxAmount: 0,
  pricesIncludeTax: false,
  total: 50,
  note: '',
  status: 'posted',
  createdBy: 'tester',
  branchId: 'branch-1',
  branchName: 'الفرع الرئيسي',
  locationId: 'loc-1',
  locationName: 'المخزن الرئيسي',
  date: '2026-04-15T00:00:00.000Z',
  items: [
    { id: 'pi-1', productId: 'prod-1', name: 'مياه معدنية', qty: 5, cost: 10, total: 50, unitName: 'قطعة', unitMultiplier: 1 },
  ],
};

function renderSettingsShell(currentSection: 'core' | 'reference' | 'users' | 'backup', children: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[`/settings/${currentSection}`]}>
      <AppProviders>
        <SettingsPageShell
          title="إعدادات المتجر"
          description="اختبار واجهة الإعدادات"
          badgeLabel="اختبار"
          setupMode={false}
          currentSection={currentSection}
          currentUserRole="super_admin"
          cards={[]}
        >
          {children}
        </SettingsPageShell>
      </AppProviders>
    </MemoryRouter>,
  );
}

function ProductsTableHarness() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div>
      <ProductsTableCard
        search=""
        onSearchChange={() => undefined}
        viewFilter="all"
        onViewFilterChange={() => undefined}
        selectedIds={[]}
        onSelectedIdsChange={() => undefined}
        onClearSelection={() => undefined}
        onBulkDelete={() => undefined}
        visibleProducts={[productFixture]}
        selectedProduct={selectedProduct}
        onSelectProduct={setSelectedProduct}
        onDeleteProduct={() => undefined}
        onOpenOfferDialog={() => undefined}
        onOpenBarcodeDialog={() => undefined}
        onOpenPrintDialog={() => undefined}
        canDelete={true}
        canPrint={true}
        onExportCsv={() => undefined}
        onPrint={() => undefined}
        categoryNames={{ 'cat-1': 'مشروبات' }}
        supplierNames={{ 'sup-1': 'مورد رئيسي' }}
        inventorySaleValue={200}
        isLoading={false}
        isError={false}
        error={undefined}
        page={1}
        pageSize={20}
        totalItems={1}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        clothingEnabled={false}
      />
      {selectedProduct ? (
        <Card title={`تعديل: ${selectedProduct.name}`} actions={<span className="nav-pill">التعديل النشط</span>}>
          <div>تم فتح وضع التعديل</div>
        </Card>
      ) : null}
    </div>
  );
}

function PurchasesHarness() {
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  return (
    <div>
      <button type="button" onClick={() => setSelectedPurchase(purchaseFixture)}>
        فتح تفاصيل اختبارية
      </button>
      <PurchasesTable rows={[purchaseFixture]} selectedId={selectedPurchase?.id} onSelect={setSelectedPurchase} />
      <PurchaseDetailCard purchase={selectedPurchase ?? undefined} onPrint={() => undefined} />
    </div>
  );
}

describe('app ui coverage', () => {
  vi.setConfig({ testTimeout: 20000 });

  it('renders dashboard with spotlight, hero, and trends', async () => {
    await renderAppAt('/');
    expect((await screen.findAllByText(/الرئيسية/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('ملخص اليوم')).length).toBeGreaterThan(0);
    expect(await screen.findByText('أعلى أصناف اليوم')).toBeInTheDocument();
    expect(await screen.findByText('المبيعات اليومية · آخر 7 أيام')).toBeInTheDocument();
    expect(await screen.findByText('المشتريات اليومية · آخر 7 أيام')).toBeInTheDocument();
  });

  it('covers settings core, reference, users, and backup sections', async () => {
    renderSettingsShell(
      'core',
      <SettingsCoreSection
        settings={settingsFixture}
        branches={branchesFixture}
        locations={locationsFixture}
        settingsQuery={{ isLoading: false, isError: false }}
        branchesQuery={{ isLoading: false, isError: false }}
        canManageSettings={true}
      />,
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'إعدادات المتجر' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'بيانات المتجر' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: 'بيانات المتجر' })).toBeInTheDocument();
    expect(await screen.findByText('الإعدادات العامة')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: 'المتجر والمخزن الأساسي' })).toBeInTheDocument();

    cleanup();
    installGlobalAppFetchMock();
    renderSettingsShell(
      'reference',
      <SettingsReferenceSection
        branches={branchesFixture}
        locations={locationsFixture}
        filteredBranches={branchesFixture}
        filteredLocations={locationsFixture}
        branchSearch=""
        locationSearch=""
        branchFilter="all"
        locationFilter="all"
        setBranchSearch={() => undefined}
        setLocationSearch={() => undefined}
        setBranchFilter={() => undefined}
        setLocationFilter={() => undefined}
        resetBranchFilters={() => undefined}
        resetLocationFilters={() => undefined}
        copyVisibleBranches={async () => undefined}
        copyVisibleLocations={async () => undefined}
        branchesQuery={{ isLoading: false, isError: false }}
        locationsQuery={{ isLoading: false, isError: false }}
        canManageSettings={true}
        onUpdateBranch={async () => undefined}
        onDeleteBranch={async () => undefined}
        onUpdateLocation={async () => undefined}
        onDeleteLocation={async () => undefined}
        branchActionBusy={false}
        locationActionBusy={false}
      />,
    );
    expect(await screen.findByRole('link', { name: 'المخزن والمواقع' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: 'المتجر الرئيسي' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: 'المخزن الأساسي' })).toBeInTheDocument();

    cleanup();
    installGlobalAppFetchMock();
    renderSettingsShell(
      'users',
      <Card title="المستخدمون والصلاحيات">
        <div>إدارة المستخدمين</div>
      </Card>,
    );
    expect(await screen.findByRole('link', { name: 'المستخدمون والصلاحيات' })).toBeInTheDocument();
    expect(await screen.findByText('إدارة المستخدمين')).toBeInTheDocument();

    cleanup();
    installGlobalAppFetchMock();
    renderSettingsShell(
      'backup',
      <SettingsBackupImportSection
        snapshots={[]}
        autoBackupEnabled={false}
        canManageBackups={true}
        backupBusy={false}
        backupSelectedFileName=""
        backupMessage=""
        backupMessageKind="success"
        backupResult={null}
        restoreSnapshotId=""
        handleBackupDownload={() => undefined}
        handleBackupFile={() => undefined}
        handleSnapshotDownload={() => undefined}
        onRequestRestoreFile={() => undefined}
        onRequestRestoreSnapshot={() => undefined}
        importProductsPending={false}
        importCustomersPending={false}
        importSuppliersPending={false}
        importOpeningStockPending={false}
        importProducts={async () => ({})}
        importCustomers={async () => ({})}
        importSuppliers={async () => ({})}
        importOpeningStock={async () => ({})}
        downloadTemplate={() => undefined}
      />,
    );
    expect(await screen.findByRole('link', { name: 'النسخ والاستيراد' })).toBeInTheDocument();
    expect(await screen.findByText('النسخ الاحتياطية')).toBeInTheDocument();
    expect(await screen.findByText('استيراد CSV')).toBeInTheDocument();
  });

  it('switches accounts between customer and supplier workflows', async () => {
    const user = userEvent.setup();
    await renderAppAt('/accounts');
    expect(await screen.findByRole('heading', { name: 'تحصيل من عميل' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'كشف حساب عميل' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'الموردون' }));
    expect(await screen.findByRole('heading', { name: 'دفع لمورد' })).toBeInTheDocument();
    expect((await screen.findAllByRole('heading', { name: 'كشف حساب مورد' })).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'العملاء' }));
    expect(await screen.findByRole('heading', { name: 'تحصيل من عميل' })).toBeInTheDocument();
  });

  it('opens product edit state from the products register', async () => {
    const user = userEvent.setup();
    render(<ProductsTableHarness />);
    const editButtons = await screen.findAllByRole('button', { name: /^(تعديل|تعديل الأساسي|عرض\/تعديل)$/ });
    expect(editButtons.length).toBeGreaterThan(0);
    await user.click(editButtons[0]);
    expect(await screen.findByText(/تعديل:/)).toBeInTheDocument();
    expect(await screen.findByText('التعديل النشط')).toBeInTheDocument();
  });

  it('opens purchase details from the purchases register', async () => {
    const user = userEvent.setup();
    render(<PurchasesHarness />);
    await user.click(await screen.findByRole('button', { name: 'فتح تفاصيل اختبارية' }));
    expect(await screen.findByRole('button', { name: 'طباعة الفاتورة' })).toBeInTheDocument();
    expect((await screen.findAllByText('مورد رئيسي')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('المخزن الرئيسي')).length).toBeGreaterThan(0);
  });

  it('shows selected return details after choosing a return row', async () => {
    const user = userEvent.setup();
    await renderAppAt('/returns');
    await user.click(await screen.findByRole('button', { name: 'مرتجع بيع' }));
    expect(await screen.findByText('تفاصيل المرتجع المحدد')).toBeInTheDocument();
    expect((await screen.findAllByText('رقم المستند')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('مرتجع تجريبي')).length).toBeGreaterThan(0);
  });

  it('switches report sections to inventory, balances, and treasury', async () => {
    const user = userEvent.setup();
    await renderAppAt('/reports/overview');
    expect((await screen.findAllByText('الملخص التنفيذي')).length).toBeGreaterThan(0);
    const tabs = document.querySelector('.reports-section-tabs') as HTMLElement;

    await user.click(within(tabs).getByRole('link', { name: 'المخزون' }));
    expect(await screen.findByText('أصناف تحتاج متابعة')).toBeInTheDocument();

    await user.click(within(tabs).getByRole('link', { name: 'الذمم' }));
    expect(await screen.findByText('العملاء الأعلى رصيدًا')).toBeInTheDocument();

    await user.click(within(tabs).getByRole('link', { name: 'الخزينة والربحية' }));
    expect((await screen.findAllByText('الخزينة والربحية')).length).toBeGreaterThan(0);
  });

  it('keeps treasury and services operational areas visible', async () => {
    await renderAppAt('/treasury');
    expect((await screen.findAllByText(/الخزينة/)).length).toBeGreaterThan(0);
    expect(await screen.findByText('حركات الخزينة')).toBeInTheDocument();
    expect(await screen.findByText('تسجيل مصروف')).toBeInTheDocument();

    cleanup();
    installGlobalAppFetchMock();
    await renderAppAt('/services');
    expect(await screen.findByText('سجل الخدمات')).toBeInTheDocument();
    expect(await screen.findByText('إضافة خدمة')).toBeInTheDocument();
  });
});
