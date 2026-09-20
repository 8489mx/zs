import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PortalsHubPage } from './PortalsHubPage';
import { PORTALS_LIST } from '../components/portals-data';

function renderHub() {
  return render(
    <MemoryRouter initialEntries={['/hub']}>
      <PortalsHubPage />
    </MemoryRouter>
  );
}

function searchInput() {
  return screen.getByPlaceholderText(/ابحث عن بوابة/i);
}

describe('PortalsHubPage Component & Layout', () => {
  it('renders the header and every portal in the catalogue by default', () => {
    renderHub();

    expect(screen.getByText('مركز البوابات الرقمية وشاشات الخدمة الذاتية')).toBeInTheDocument();
    expect(screen.getByText(`${PORTALS_LIST.length} بوابات نشطة`)).toBeInTheDocument();

    // Driven off the data file so adding a portal cannot silently skip this assertion.
    for (const portal of PORTALS_LIST) {
      expect(screen.getByText(portal.title)).toBeInTheDocument();
    }
  });

  it('keeps the "all" pill count in step with the catalogue', () => {
    renderHub();
    expect(screen.getByRole('button', { name: `الكل (${PORTALS_LIST.length})` })).toBeInTheDocument();
  });

  it('filters portals when clicking a category pill', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByRole('button', { name: 'خدمة ذاتية' }));

    for (const portal of PORTALS_LIST) {
      if (portal.category === 'staff') {
        expect(screen.getByText(portal.title)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(portal.title)).not.toBeInTheDocument();
      }
    }
  });

  it('performs live search across keywords and restores the list when cleared', async () => {
    const user = userEvent.setup();
    renderHub();

    // 'طيار' only appears in the delivery portal's keywords.
    await user.type(searchInput(), 'طيار');
    expect(screen.getByText('بوابة مندوبي التوصيل')).toBeInTheDocument();
    expect(screen.queryByText('بوابة الموظف الذاتية')).not.toBeInTheDocument();

    await user.clear(searchInput());
    expect(screen.getByText('بوابة الموظف الذاتية')).toBeInTheDocument();
    expect(screen.getByText('شاشة المطبخ (KDS)')).toBeInTheDocument();
  });
});
