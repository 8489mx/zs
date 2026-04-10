import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportWorkbench } from '@/features/settings/components/ImportWorkbench';

async function uploadCsv(container: HTMLElement, contents: string, fileName = 'import.csv') {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('File input not found');
  }

  const user = userEvent.setup();
  await user.upload(input, new File([contents], fileName, { type: 'text/csv' }));
  return user;
}

describe('ImportWorkbench', () => {
  it('shows missing required columns and blocks the import action', async () => {
    const onImportRows = vi.fn();
    const { container } = render(
      <ImportWorkbench
        title="استيراد المنتجات"
        requiredColumns={['name', 'price']}
        onDownloadTemplate={vi.fn()}
        onImportRows={onImportRows}
      />,
    );

    await uploadCsv(container, 'name\nتفاح');

    expect(await screen.findByText('الأعمدة الناقصة: price')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'استيراد الآن' })).toBeDisabled();
    expect(onImportRows).not.toHaveBeenCalled();
  });

  it('renders backend warnings after a successful import', async () => {
    const onImportRows = vi.fn().mockResolvedValue({
      inserted: 1,
      updated: 1,
      warnings: ['تم تجاهل stockQty للمنتج الموجود.'],
    });

    const { container } = render(
      <ImportWorkbench
        title="استيراد المنتجات"
        requiredColumns={['name', 'price']}
        onDownloadTemplate={vi.fn()}
        onImportRows={onImportRows}
      />,
    );

    const user = await uploadCsv(container, 'name,price\nتفاح,10\nبرتقال,20');

    expect(await screen.findByText('تفاح')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'استيراد الآن' }));

    await waitFor(() => {
      expect(onImportRows).toHaveBeenCalledWith([
        { name: 'تفاح', price: '10' },
        { name: 'برتقال', price: '20' },
      ]);
    });

    expect(await screen.findByText(/تحذيرات:/)).toBeInTheDocument();
    expect(screen.getByText(/تم تجاهل stockQty للمنتج الموجود/)).toBeInTheDocument();
  });
});
