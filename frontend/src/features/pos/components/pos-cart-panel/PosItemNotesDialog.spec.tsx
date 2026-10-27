import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PosItemNotesDialog } from './PosItemNotesDialog';

vi.mock('@/shared/hooks/use-catalog-queries', () => ({
  useSettingsQuery: () => ({ data: { restaurantModuleEnabled: false } }),
}));

describe('PosItemNotesDialog - Module Isolation', () => {
  it('renders generic note dialog for non-restaurant businesses (e.g. Perfumes/Retail)', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <PosItemNotesDialog
        open={true}
        onClose={handleClose}
        itemName="عطر دي ليلة 100 مل"
        initialNotes=""
        isRestaurant={false}
        onSave={handleSave}
      />
    );

    // Title should be generic item notes, NOT kitchen prep
    expect(screen.getByText(/ملاحظات الصنف: عطر دي ليلة 100 مل/)).toBeInTheDocument();
    expect(screen.queryByText(/ملاحظات وتجهيز الصنف للمطبخ/)).not.toBeInTheDocument();

    // Kitchen quick tags (e.g. without onion, without tomato) must NOT exist
    expect(screen.queryByText('تعديلات وتوجيهات المطبخ السريعة (Quick Kitchen Tags)')).not.toBeInTheDocument();
    expect(screen.queryByText('بدون بصل')).not.toBeInTheDocument();
    expect(screen.queryByText('بدون طماطم')).not.toBeInTheDocument();
    expect(screen.queryByText('المكونات والاستبعاد')).not.toBeInTheDocument();

    // Generic label and placeholder
    expect(screen.getByText('ملاحظات وتوجيهات خاصة على الصنف:')).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/اكتب أي ملاحظات أو تعليمات خاصة بالصنف هنا/);
    expect(textarea).toBeInTheDocument();

    // Entering a note and saving
    fireEvent.change(textarea, { target: { value: 'تغليف هدية شريطة ذهبية' } });
    fireEvent.click(screen.getByText('حفظ الملاحظة'));

    expect(handleSave).toHaveBeenCalledWith('تغليف هدية شريطة ذهبية');
  });

  it('renders kitchen tags and kitchen prep title for restaurant module', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <PosItemNotesDialog
        open={true}
        onClose={handleClose}
        itemName="برجر لحم كلاسيك"
        initialNotes=""
        isRestaurant={true}
        onSave={handleSave}
      />
    );

    // Kitchen title must be present
    expect(screen.getByText(/ملاحظات وتجهيز الصنف للمطبخ: برجر لحم كلاسيك/)).toBeInTheDocument();

    // Kitchen quick tags must be visible
    expect(screen.getByText('تعديلات وتوجيهات المطبخ السريعة (Quick Kitchen Tags)')).toBeInTheDocument();
    expect(screen.getByText('بدون بصل')).toBeInTheDocument();
    expect(screen.getByText('بدون طماطم')).toBeInTheDocument();

    // Clicking tag adds bilingual note
    fireEvent.click(screen.getByText('بدون بصل'));
    const textarea = screen.getByDisplayValue(/بدون بصل \(NO ONION\)/);
    expect(textarea).toBeInTheDocument();

    fireEvent.click(screen.getByText('حفظ الملاحظة'));
    expect(handleSave).toHaveBeenCalledWith('بدون بصل (NO ONION)');
  });
});
