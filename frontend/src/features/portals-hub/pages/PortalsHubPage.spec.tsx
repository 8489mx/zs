import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PortalsHubPage } from './PortalsHubPage';

function renderHub() {
  return render(
    <MemoryRouter initialEntries={['/hub']}>
      <PortalsHubPage />
    </MemoryRouter>
  );
}

describe('PortalsHubPage Component & Layout', () => {
  it('renders header, title, and all 10 portals by default', () => {
    renderHub();

    expect(screen.getByText('دليل البوابات والخدمات الذاتية')).toBeInTheDocument();
    expect(screen.getByText('منظومة Z-Systems')).toBeInTheDocument();
    expect(screen.getByText('بوابة الموظف الذاتية')).toBeInTheDocument();
    expect(screen.getByText('بصمة الموبايل الذكية (GPS)')).toBeInTheDocument();
    expect(screen.getByText('بوابة مندوبي التوصيل')).toBeInTheDocument();
    expect(screen.getByText('مبيعات سيارات التوزيع والفان')).toBeInTheDocument();
    expect(screen.getByText('شاشة المطبخ (KDS)')).toBeInTheDocument();
    expect(screen.getByText('شاشة العميل بنقطة البيع (CFD)')).toBeInTheDocument();
    expect(screen.getByText('شاشة العروض الرقمية (Signage)')).toBeInTheDocument();
    expect(screen.getByText('الطلب الذاتي من الطاولة (QR)')).toBeInTheDocument();
    expect(screen.getByText('رادار متابعة المالك المتنقل')).toBeInTheDocument();
    expect(screen.getByText('النظام الإداري المركزي (ERP)')).toBeInTheDocument();
  });

  it('filters portals when clicking a category pill', async () => {
    const user = userEvent.setup();
    renderHub();

    // Click 'الموظفين والخدمة الذاتية'
    const staffBtn = screen.getByRole('button', { name: /الموظفين والخدمة الذاتية/i });
    await user.click(staffBtn);

    // Only staff portals should remain
    expect(screen.getByText('بوابة الموظف الذاتية')).toBeInTheDocument();
    expect(screen.getByText('بصمة الموبايل الذكية (GPS)')).toBeInTheDocument();
    expect(screen.queryByText('شاشة المطبخ (KDS)')).not.toBeInTheDocument();
    expect(screen.queryByText('بوابة مندوبي التوصيل')).not.toBeInTheDocument();
  });

  it('performs live search and clears search correctly', async () => {
    const user = userEvent.setup();
    renderHub();

    const searchInput = screen.getByPlaceholderText(/ابحث بالاسم/i);
    await user.type(searchInput, 'طيار');

    // Delivery portal matches keyword 'طيار'
    expect(screen.getByText('بوابة مندوبي التوصيل')).toBeInTheDocument();
    expect(screen.queryByText('بوابة الموظف الذاتية')).not.toBeInTheDocument();

    // Clear search using clear button
    const clearBtn = screen.getByTitle('مسح البحث');
    await user.click(clearBtn);

    expect(screen.getByText('بوابة الموظف الذاتية')).toBeInTheDocument();
    expect(screen.getByText('شاشة المطبخ (KDS)')).toBeInTheDocument();
  });
});
