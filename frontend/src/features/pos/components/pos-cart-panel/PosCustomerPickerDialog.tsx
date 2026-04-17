import { useEffect, useMemo, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import type { Customer } from '@/types/domain';

interface PosCustomerPickerDialogProps {
  open: boolean;
  customers: Customer[];
  customerId: string;
  onClose: () => void;
  onSelect: (customerId: string) => void;
}

function matchesCustomer(customer: Customer, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return customer.name.toLowerCase().includes(normalized) || String(customer.phone || '').toLowerCase().includes(normalized);
}

export function PosCustomerPickerDialog({ open, customers, customerId, onClose, onSelect }: PosCustomerPickerDialogProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const filteredCustomers = useMemo(() => customers.filter((customer) => matchesCustomer(customer, query)), [customers, query]);

  return (
    <DialogShell open={open} onClose={onClose} width="min(720px, 100%)" ariaLabel="اختيار العميل">
      <div className="pos-customer-dialog">
        <div className="pos-customer-dialog-header">
          <div>
            <strong>اختيار العميل</strong>
            <p className="muted small">ابحث بالاسم أو رقم التليفون ثم اختر العميل المناسب.</p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>إغلاق</Button>
        </div>

        <Field label="بحث العميل">
          <input
            data-autofocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اكتب اسم العميل أو رقم التليفون"
          />
        </Field>

        <div className="pos-customer-dialog-actions">
          <Button
            type="button"
            variant={!customerId ? 'primary' : 'secondary'}
            onClick={() => {
              onSelect('');
              onClose();
            }}
          >
            عميل نقدي
          </Button>
          <span className="muted small">{filteredCustomers.length} عميل مطابق</span>
        </div>

        <div className="list-stack pos-customer-dialog-list">
          {filteredCustomers.length ? filteredCustomers.map((customer) => {
            const isSelected = String(customer.id) === String(customerId);
            return (
              <button
                key={customer.id}
                type="button"
                className={`list-row pos-customer-dialog-row ${isSelected ? 'is-selected' : ''}`.trim()}
                onClick={() => {
                  onSelect(String(customer.id));
                  onClose();
                }}
              >
                <div className="pos-customer-dialog-copy">
                  <strong>{customer.name}</strong>
                  <div className="muted small">{customer.phone || 'بدون رقم هاتف'}</div>
                </div>
                {isSelected ? <span className="status-badge pos-customer-dialog-badge">الحالي</span> : null}
              </button>
            );
          }) : <div className="surface-note pos-customer-dialog-empty">لا توجد نتائج مطابقة الآن.</div>}
        </div>
      </div>
    </DialogShell>
  );
}
