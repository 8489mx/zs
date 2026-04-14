import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installGlobalAppFetchMock, renderAppAt } from '@/test/helpers/mock-app-api';

beforeEach(() => {
  installGlobalAppFetchMock();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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

  it('switches settings tabs across core, reference, users, and backup', async () => {
    const user = userEvent.setup();
    await renderAppAt('/settings/core');
    expect((await screen.findAllByText(/بيانات المتجر/)).length).toBeGreaterThan(0);

    await user.click(await screen.findByRole('link', { name: 'المخزن والمواقع' }));
    expect((await screen.findAllByText(/المخزن والمواقع/)).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('link', { name: 'المستخدمون والصلاحيات' }));
    expect((await screen.findAllByText(/المستخدمون والصلاحيات/)).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('link', { name: 'النسخ والاستيراد' }));
    expect((await screen.findAllByText(/النسخ والاستيراد/)).length).toBeGreaterThan(0);
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
    await renderAppAt('/products');
    const editButtons = await screen.findAllByRole('button', { name: /^(تعديل|تعديل الأساسي|عرض\/تعديل)$/ });
    await user.click(editButtons[0]);
    expect(await screen.findByText(/تعديل:/)).toBeInTheDocument();
    expect(await screen.findByText('التعديل النشط')).toBeInTheDocument();
  });

  it('opens purchase details from the purchases register', async () => {
    const user = userEvent.setup();
    await renderAppAt('/purchases');
    await user.click(await screen.findByRole('button', { name: 'تفاصيل' }));
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
    const tabs = within(document.querySelector('.reports-section-tabs') as HTMLElement);

    await user.click(tabs.getByRole('link', { name: 'المخزون' }));
    expect(await screen.findByText('أصناف تحتاج متابعة')).toBeInTheDocument();

    await user.click(tabs.getByRole('link', { name: 'الذمم' }));
    expect(await screen.findByText('العملاء الأعلى رصيدًا')).toBeInTheDocument();

    await user.click(tabs.getByRole('link', { name: 'الخزينة والربحية' }));
    expect((await screen.findAllByText('الخزينة والربحية')).length).toBeGreaterThan(0);
  });

  it('keeps treasury and services operational areas visible', async () => {
    await renderAppAt('/treasury');
    expect((await screen.findAllByText(/الخزينة/)).length).toBeGreaterThan(0);
    expect(await screen.findByRole('heading', { name: 'حركات الخزينة' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'تسجيل مصروف' })).toBeInTheDocument();

    cleanup();
    installGlobalAppFetchMock();
    await renderAppAt('/services');
    expect(await screen.findByText('سجل الخدمات')).toBeInTheDocument();
    expect(await screen.findByText('إضافة خدمة')).toBeInTheDocument();
  });
});
