import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { crmApi, type CreateDealPayload, type DealStage, type DealPriority } from '../api/crm.api';
import { STAGES, PRIORITIES } from './CrmConstants';

export interface CrmDealCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

const initialDealForm: CreateDealPayload = {
  title: '',
  expectedAmount: 0,
  currency: 'EGP',
  probability: 20,
  stage: 'new',
  expectedCloseDate: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  companyName: '',
  source: 'direct',
  priority: 'medium',
  notes: '',
};

export function CrmDealCreateModal({ open, onClose, onSuccess }: CrmDealCreateModalProps) {
  const queryClient = useQueryClient();
  const [dealForm, setDealForm] = useState<CreateDealPayload>(initialDealForm);

  const createDealMutation = useMutation({
    mutationFn: crmApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
      setDealForm(initialDealForm);
      onClose();
      onSuccess?.('تمت إضافة الفرصة البيعية بنجاح.');
    },
    onError: (err: any) => {
      alert(err?.message || 'فشل إنشاء الفرصة البيعية.');
    },
  });

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(760px, 95%)"
      ariaLabel="إضافة فرصة بيعية جديدة"
    >
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#170e5e', margin: 0 }}>
            إضافة فرصة بيعية جديدة (New Opportunity)
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <XIcon size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <Field label="عنوان الفرصة البيعية *">
              <input
                type="text"
                placeholder="مثال: توريد شحنة معدات لمستشفى الشفاء"
                value={dealForm.title}
                onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>

          <div>
            <Field label="القيمة المتوقعة">
              <input
                type="number"
                placeholder="0.00"
                value={dealForm.expectedAmount || ''}
                onChange={(e) => setDealForm({ ...dealForm, expectedAmount: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>

          <div>
            <Field label="المرحلة الابتدائية">
              <select
                value={dealForm.stage}
                onChange={(e) => {
                  const st = e.target.value as DealStage;
                  const prob = STAGES.find((s) => s.key === st)?.defaultProbability || 20;
                  setDealForm({ ...dealForm, stage: st, probability: prob });
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({s.defaultProbability}%)
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <Field label="اسم العميل / جهة الاتصال">
              <input
                type="text"
                placeholder="مثال: د. طارق سالم"
                value={dealForm.contactName}
                onChange={(e) => setDealForm({ ...dealForm, contactName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>

          <div>
            <Field label="اسم الشركة أو المؤسسة">
              <input
                type="text"
                placeholder="مثال: مجمع عيادات النور"
                value={dealForm.companyName}
                onChange={(e) => setDealForm({ ...dealForm, companyName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>

          <div>
            <Field label="رقم الهاتف">
              <input
                type="text"
                placeholder="01xxxxxxxxx"
                value={dealForm.contactPhone}
                onChange={(e) => setDealForm({ ...dealForm, contactPhone: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>

          <div>
            <Field label="الأولوية">
              <select
                value={dealForm.priority}
                onChange={(e) => setDealForm({ ...dealForm, priority: e.target.value as DealPriority })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {Object.entries(PRIORITIES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <Field label="تاريخ الإغلاق المتوقع">
              <input
                type="date"
                value={dealForm.expectedCloseDate ?? ''}
                onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>

          <div>
            <Field label="مصدر الفرصة (Lead Source)">
              <select
                value={dealForm.source}
                onChange={(e) => setDealForm({ ...dealForm, source: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="direct">مباشر / زيارة</option>
                <option value="referral">ترشيح من عميل</option>
                <option value="phone">اتصال هاتفي وارد</option>
                <option value="social_media">وسائل التواصل الاجتماعي</option>
                <option value="website">الموقع الإلكتروني</option>
              </select>
            </Field>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <Field label="ملاحظات وتفاصيل إضافية">
              <textarea
                rows={3}
                placeholder="أي اشتراطات خاصة أو تفاصيل للمتابعة..."
                value={dealForm.notes}
                onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={() => {
              if (!dealForm.title.trim()) {
                alert('يرجى إدخال عنوان الفرصة البيعية.');
                return;
              }
              createDealMutation.mutate(dealForm);
            }}
            disabled={createDealMutation.isPending}
          >
            {createDealMutation.isPending ? 'جاري الحفظ...' : 'حفظ الفرصة البيعية'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
