import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './field';

// O30 (ARCHITECTURE_INVARIANTS.md §8): the caption must be a real label tied to the control, so
// tapping it focuses the field and a screen reader announces the field by name.

describe('Field', () => {
  it('labels a plain input', () => {
    render(
      <Field label="اسم العميل">
        <input type="text" />
      </Field>,
    );
    const input = screen.getByLabelText('اسم العميل');
    expect(input.tagName).toBe('INPUT');
  });

  it('keeps an id the caller already set', () => {
    render(
      <Field label="الفرع">
        <select id="branch-picker">
          <option>A</option>
        </select>
      </Field>,
    );
    expect(screen.getByLabelText('الفرع').id).toBe('branch-picker');
  });

  it('still renders a label when the control is a custom component', () => {
    const Custom = () => <div>custom</div>;
    render(
      <Field label="حقل خاص" hint="تلميح">
        <Custom />
      </Field>,
    );
    const label = screen.getByText('حقل خاص');
    expect(label.tagName).toBe('LABEL');
    expect(label.getAttribute('for')).toBeNull();
    expect(screen.getByText('تلميح')).toBeTruthy();
  });

  it('shows the error instead of the hint', () => {
    render(
      <Field label="المبلغ" hint="اختياري" error="قيمة غير صالحة">
        <input />
      </Field>,
    );
    expect(screen.getByText('قيمة غير صالحة')).toBeTruthy();
    expect(screen.queryByText('اختياري')).toBeNull();
  });
});
