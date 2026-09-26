import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { systemAlert } from '@/shared/components/system-alert';
import { deliveryRepsApi, type DeliveryRep, type UpsertDeliveryRepPayload } from '@/shared/api/delivery-reps.api';
import { XIcon, TruckIcon, LayersIcon, PackageIcon } from '@/shared/components/icons/AppIcons';

export interface UpsertDeliveryRepModalProps {
  open: boolean;
  onClose: () => void;
  rep?: DeliveryRep | null;
  onSuccess?: (rep?: DeliveryRep) => void;
}

export function UpsertDeliveryRepModal({ open, onClose, rep, onSuccess }: UpsertDeliveryRepModalProps) {
  const queryClient = useQueryClient();

  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [pinCodeInput, setPinCodeInput] = useState('');
  const [repTypeInput, setRepTypeInput] = useState<'delivery' | 'van' | 'both'>('delivery');
  const [fullNameInput, setFullNameInput] = useState('');
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [vehiclePlateInput, setVehiclePlateInput] = useState('');

  useEffect(() => {
    if (open) {
      if (rep) {
        setNameInput(rep.name || '');
        setPhoneInput(rep.phone || '');
        setPinCodeInput(rep.pin_code || '');
        setFullNameInput(rep.full_name || '');
        setNationalIdInput(rep.national_id || '');
        setAddressInput(rep.address || '');
        setVehiclePlateInput(rep.vehicle_plate || '');
        const currentType = (rep.rep_type as 'delivery' | 'van' | 'both') || (rep.is_van_rep ? 'van' : 'delivery');
        setRepTypeInput(currentType);
      } else {
        setNameInput('');
        setPhoneInput('');
        setPinCodeInput('');
        setRepTypeInput('delivery');
        setFullNameInput('');
        setNationalIdInput('');
        setAddressInput('');
        setVehiclePlateInput('');
      }
    }
  }, [open, rep]);

  const createMutation = useMutation({
    mutationFn: (data: UpsertDeliveryRepPayload) => deliveryRepsApi.create(data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
      systemAlert('تمت إضافة المندوب بنجاح');
      onSuccess?.(data);
      onClose();
    },
    onError: (error: any) => {
      if (error?.status === 403 || error?.details?.statusCode === 403) {
        systemAlert('ليس لديك صلاحية. تواصل مع مدير النظام لتفعيل هذه الخاصية.');
      } else {
        systemAlert(error.message || 'حدث خطأ أثناء إضافة المندوب');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; payload: UpsertDeliveryRepPayload }) =>
      deliveryRepsApi.update(data.id, data.payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
      systemAlert('تم تحديث بيانات المندوب بنجاح');
      onSuccess?.(data);
      onClose();
    },
    onError: (error: any) => {
      if (error?.status === 403 || error?.details?.statusCode === 403) {
        systemAlert('ليس لديك صلاحية. تواصل مع مدير النظام لتفعيل هذه الخاصية.');
      } else {
        systemAlert(error.message || 'حدث خطأ أثناء تعديل بيانات المندوب');
      }
    },
  });

  const handleSave = () => {
    if (!nameInput.trim()) {
      systemAlert('يرجى كتابة اسم المندوب');
      return;
    }

    const payload: UpsertDeliveryRepPayload = {
      name: nameInput.trim(),
      phone: phoneInput.trim() || undefined,
      pinCode: pinCodeInput.trim() || undefined,
      repType: repTypeInput,
      isVanRep: repTypeInput === 'van' || repTypeInput === 'both',
      fullName: fullNameInput.trim() || undefined,
      nationalId: nationalIdInput.trim() || undefined,
      address: addressInput.trim() || undefined,
      vehiclePlate: vehiclePlateInput.trim() || undefined,
    };

    if (rep) {
      updateMutation.mutate({ id: rep.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(640px, 95vw)"
      ariaLabel={rep ? 'تعديل بيانات المندوب' : 'إضافة مندوب جديد'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px 24px' }} dir="rtl">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              {rep ? 'تعديل بيانات المندوب' : 'إضافة مندوب جديد'}
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              تحديد طبيعة عمل المندوب (دليفري أو فان)، بيانات الدخول للموبايل، وتفاصيل المركبة
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#64748b',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto' }}>
          
          {/* Section 0: Representative Type Selection */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              طبيعة العمل ونوع المندوب *
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                {
                  key: 'delivery' as const,
                  label: 'طيار دليفري',
                  subtitle: 'توصيل أوردرات (/driver)',
                  icon: <PackageIcon size={18} color={repTypeInput === 'delivery' ? '#ea580c' : '#64748b'} />,
                  activeBorder: '#ea580c',
                  activeBg: '#fff7ed',
                  activeColor: '#9a3412',
                },
                {
                  key: 'van' as const,
                  label: 'توزيع فان',
                  subtitle: 'بيع من السيارة (/van-sales)',
                  icon: <TruckIcon size={18} color={repTypeInput === 'van' ? '#0284c7' : '#64748b'} />,
                  activeBorder: '#0284c7',
                  activeBg: '#f0f9ff',
                  activeColor: '#075985',
                },
                {
                  key: 'both' as const,
                  label: 'مندوب شامل',
                  subtitle: 'دليفري + توزيع فان',
                  icon: <LayersIcon size={18} color={repTypeInput === 'both' ? '#7c3aed' : '#64748b'} />,
                  activeBorder: '#7c3aed',
                  activeBg: '#f5f3ff',
                  activeColor: '#5b21b6',
                },
              ].map((item) => {
                const isActive = repTypeInput === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setRepTypeInput(item.key)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '4px',
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isActive ? item.activeBorder : '#cbd5e1'}`,
                      background: isActive ? item.activeBg : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {item.icon}
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: isActive ? item.activeColor : '#1e293b' }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748b', lineHeight: 1.2 }}>
                      {item.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Basic Info & Mobile Portal */}
          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>البيانات الأساسية وتطبيق الموبايل</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  اسم المندوب / الشهرة *
                </label>
                <input
                  type="text"
                  placeholder="مثال: كابتن أحمد / طاهر"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    minHeight: '36px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    fontSize: '13px',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  رقم الهاتف / الموبايل
                </label>
                <input
                  type="text"
                  placeholder="01012345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    minHeight: '36px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    fontSize: '13px',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                    textAlign: 'right',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  رمز الدخول (PIN)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="1234"
                  value={pinCodeInput}
                  onChange={(e) => setPinCodeInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    minHeight: '36px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    fontSize: '13px',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                    textAlign: 'center',
                  }}
                  title="رمز مكون من 4 إلى 6 أرقام يتيح للمندوب تسجيل الدخول لتطبيق الهاتف"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Identity & Guarantee */}
          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>بيانات الهوية والضمان (اختياري)</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  الاسم بالكامل (من واقع البطاقة)
                </label>
                <input
                  type="text"
                  placeholder="الاسم الرباعي كاملاً"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    minHeight: '36px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    fontSize: '13px',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  الرقم القومي (١٤ رقم)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  placeholder="الرقم القومي كاملاً"
                  value={nationalIdInput}
                  onChange={(e) => setNationalIdInput(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    minHeight: '36px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    fontSize: '13px',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                    textAlign: 'right',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                العنوان بالتفصيل
              </label>
              <input
                type="text"
                placeholder="المنطقة، الشارع، رقم العقار"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  minHeight: '36px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '7px',
                  fontSize: '13px',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Section 3: Vehicle Data */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              {repTypeInput === 'van' ? 'بيانات سيارة التوزيع (الفان)' : repTypeInput === 'both' ? 'بيانات المركبة / السيارة' : 'بيانات دراجة التوصيل / المركبة'}
            </span>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                رقم لوحة المركبة / السيارة
              </label>
              <input
                type="text"
                placeholder={repTypeInput === 'van' ? 'مثال: 5678 ن و ر (سيارة فان)' : 'مثال: 1234 ص ع'}
                value={vehiclePlateInput}
                onChange={(e) => setVehiclePlateInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  minHeight: '36px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '7px',
                  fontSize: '13px',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
          <Button variant="secondary" onClick={onClose} style={{ minHeight: '38px', padding: '0 18px' }}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!nameInput.trim() || isSaving}
            style={{ minHeight: '38px', padding: '0 24px', fontWeight: 700, background: '#170e5e' }}
          >
            {isSaving ? 'جاري الحفظ...' : rep ? 'تحديث البيانات' : 'حفظ المندوب'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
