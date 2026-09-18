import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { contractingApi } from '../api/contracting.api';
import type { ContractingSubcontractor } from '../contracting.types';
import { toast } from '@/shared/components/system-alert';

interface CreateSubcontractorModalProps {
  open: boolean;
  subcontractor?: ContractingSubcontractor | null;
  onClose: () => void;
  onSuccess?: (createdSubcontractor?: ContractingSubcontractor) => void;
}

const TRADE_SPECIALTIES = [
  'مقاولات عامة',
  'أعمال خرسانات وهياكل مسلحة',
  'حدادة ونجارة مسلحة',
  'أعمال مباني وبلوك',
  'بياض ومحارة ولياسة',
  'أعمال كهربائية وكهروميكانيك',
  'أعمال صحية وتغذية وصرف',
  'عزل مائي وحراري',
  'دهانات وتشطيبات داخلية وخارجية',
  'سيراميك ورخام وأرضيات',
  'نجارة وأبواب وشبابيك',
  'ألوميتال وواجهات زجاجية (Curtain Walls)',
  'أعمال تكييف وتهوية (HVAC)',
  'مصاعد وأنظمة حركة',
  'أعمال حفر وإحلال ومصبعات',
  'توريد وعمالة مساعدة',
];

export function CreateSubcontractorModal({
  open,
  subcontractor,
  onClose,
  onSuccess,
}: CreateSubcontractorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    tradeSpecialty: 'مقاولات عامة',
    phone: '',
    mobile: '',
    contactPerson: '',
    address: '',
    taxNumber: '',
    commercialReg: '',
    nationalId: '',
    bankName: '',
    bankIban: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      if (subcontractor) {
        setFormData({
          name: subcontractor.name || '',
          tradeSpecialty: subcontractor.tradeSpecialty || 'مقاولات عامة',
          phone: subcontractor.phone || '',
          mobile: subcontractor.mobile || '',
          contactPerson: subcontractor.contactPerson || '',
          address: subcontractor.address || '',
          taxNumber: subcontractor.taxNumber || '',
          commercialReg: subcontractor.commercialReg || '',
          nationalId: subcontractor.nationalId || '',
          bankName: subcontractor.bankName || '',
          bankIban: subcontractor.bankIban || '',
          notes: subcontractor.notes || '',
        });
      } else {
        setFormData({
          name: '',
          tradeSpecialty: 'مقاولات عامة',
          phone: '',
          mobile: '',
          contactPerson: '',
          address: '',
          taxNumber: '',
          commercialReg: '',
          nationalId: '',
          bankName: '',
          bankIban: '',
          notes: '',
        });
      }
      setErrorMsg(null);
    }
  }, [open, subcontractor]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('يرجى إدخال اسم مقاول الباطن أو ورشة التنفيذ');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (subcontractor) {
        const updated = await contractingApi.updateSubcontractor(subcontractor.id, {
          name: formData.name.trim(),
          tradeSpecialty: formData.tradeSpecialty,
          phone: formData.phone.trim() || undefined,
          mobile: formData.mobile.trim() || undefined,
          contactPerson: formData.contactPerson.trim() || undefined,
          address: formData.address.trim() || undefined,
          taxNumber: formData.taxNumber.trim() || undefined,
          commercialReg: formData.commercialReg.trim() || undefined,
          nationalId: formData.nationalId.trim() || undefined,
          bankName: formData.bankName.trim() || undefined,
          bankIban: formData.bankIban.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
        toast.success('تم تحديث بيانات مقاول الباطن بنجاح');
        onSuccess?.(updated);
      } else {
        const created = await contractingApi.createSubcontractor({
          name: formData.name.trim(),
          tradeSpecialty: formData.tradeSpecialty,
          phone: formData.phone.trim() || undefined,
          mobile: formData.mobile.trim() || undefined,
          contactPerson: formData.contactPerson.trim() || undefined,
          address: formData.address.trim() || undefined,
          taxNumber: formData.taxNumber.trim() || undefined,
          commercialReg: formData.commercialReg.trim() || undefined,
          nationalId: formData.nationalId.trim() || undefined,
          bankName: formData.bankName.trim() || undefined,
          bankIban: formData.bankIban.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
        toast.success('تم تسجيل مقاول الباطن الجديد بنجاح');
        onSuccess?.(created as any);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ بيانات المقاول');
    } finally {
      setIsSubmitting(false);
    }
  };

  const specialtyOptions = TRADE_SPECIALTIES.map((sp) => ({
    value: sp,
    label: sp,
  }));

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={subcontractor ? 'تعديل بيانات مقاول باطن' : 'تسجيل مقاول باطن جديد (Subcontractor Registry)'}
      subtitle="إضافة مقاول باطن إلى السجل المعتمد لتكليفه بحزم الأعمال ومتابعة كشف حسابه ومستحقاته"
      maxWidth="820px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: 'var(--font-body)',
              border: '1px solid #fecaca',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* 1. البيانات الأساسية والتخصص */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#170e5e', marginBottom: '12px' }}>
            1. البيانات الأساسية والتخصص المهني
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="اسم مقاول الباطن / ورشة التنفيذ *">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: مؤسسة الأهرام للخرسانات المسلحة"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                }}
                required
              />
            </Field>

            <Field label="التخصص المهني / الحرفة *">
              <CustomSelect
                value={formData.tradeSpecialty}
                onChange={(val) => setFormData({ ...formData, tradeSpecialty: val })}
                options={specialtyOptions}
                placeholder="اختر التخصص المهني..."
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <Field label="المسؤول / المهندس المشرف">
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="اسم الشخص المسؤول"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                }}
              />
            </Field>

            <Field label="رقم الهاتف">
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="مثال: 01012345678"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
            </Field>

            <Field label="رقم الجوال الإضافي">
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="جوال بديل"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
            </Field>
          </div>

          <div style={{ marginTop: '12px' }}>
            <Field label="العنوان أو المقر الرئيسي">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="المدينة، المنطقة، اسم الشارع"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                }}
              />
            </Field>
          </div>
        </div>

        {/* 2. البيانات الرسمية والبنكية */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#170e5e', marginBottom: '12px' }}>
            2. البيانات النظامية والبنكية لسندات الصرف
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Field label="الرقم الضريبي">
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                placeholder="الرقم الضريبي للمقاول"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                }}
              />
            </Field>

            <Field label="السجل التجاري">
              <input
                type="text"
                value={formData.commercialReg}
                onChange={(e) => setFormData({ ...formData, commercialReg: e.target.value })}
                placeholder="رقم السجل التجاري"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                }}
              />
            </Field>

            <Field label="الرقم القومي (لمقاولي الأنفار/المصنعيات)">
              <input
                type="text"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="14 رقم قومي"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <Field label="اسم البنك المعتمد">
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="مثال: البنك الأهلي المصري"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                }}
              />
            </Field>

            <Field label="رقم الحساب / الآيبان (IBAN)">
              <input
                type="text"
                value={formData.bankIban}
                onChange={(e) => setFormData({ ...formData, bankIban: e.target.value })}
                placeholder="EG..."
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: 'var(--font-body)',
                  boxSizing: 'border-box',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
            </Field>
          </div>
        </div>

        {/* 3. ملاحظات وشروط */}
        <div>
          <Field label="ملاحظات وشروط التعامل الفنية">
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="شروط خاصة، أسلوب محاسبة المتر/المصنعية، سابقات أعمال مميزة..."
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '8px 12px',
                fontSize: 'var(--font-body)',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </Field>
        </div>

        <StandardDialogFooter
          onClose={onClose}
          submitText={isSubmitting ? 'جاري الحفظ...' : subcontractor ? 'حفظ التعديلات' : 'تسجيل مقاول الباطن'}
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
