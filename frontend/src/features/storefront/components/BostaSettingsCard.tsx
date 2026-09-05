import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bostaApi } from '../api/bosta.api';
import { BostaSettings } from '../types/storefront.types';
import { Button } from '@/shared/ui/button';

export function BostaSettingsCard() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<BostaSettings>({
    enabled: false,
    environment: 'sandbox',
    apiKey: '',
    pickupBusinessName: '',
    pickupPhone: '',
    pickupCity: 'القاهرة',
    pickupAddress: '',
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['bosta-settings'],
    queryFn: bostaApi.getSettings,
  });

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<BostaSettings>) => bostaApi.saveSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bosta-settings'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', color: '#94a3b8', textAlign: 'center' }}>
        جاري تحميل إعدادات الربط مع بوسطة...
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#fff1f2',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
            }}
          >
            📦
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              الربط مع شركة الشحن بوسطة (Bosta Couriers API)
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              إنشاء بوالص الشحن بضغطة زر، تتبع الشحنات حياً، وطباعة ملصقات الطرود الحرارية (AWB).
            </p>
          </div>
        </div>

        {/* Enable Switch */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: formData.enabled ? '#059669' : '#64748b' }}>
            {formData.enabled ? 'مفعل' : 'معطل'}
          </span>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </label>
      </div>

      {/* Settings Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Environment */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            بيئة العمل (Environment)
          </label>
          <select
            value={formData.environment}
            onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
              background: '#ffffff',
            }}
          >
            <option value="sandbox">وضع تجريبي (Sandbox Test Mode)</option>
            <option value="production">بيئة الإنتاج الحية (Production Live)</option>
          </select>
        </div>

        {/* API Key */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            مفتاح الربط (Bosta API Key)
          </label>
          <input
            type="password"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            placeholder="أدخل مفتاح الـ API من لوحة بوسطة..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
            }}
          />
        </div>

        {/* Pickup Business Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            اسم المنشأة للاستلام (Pickup Sender Name)
          </label>
          <input
            type="text"
            value={formData.pickupBusinessName || ''}
            onChange={(e) => setFormData({ ...formData, pickupBusinessName: e.target.value })}
            placeholder="اسم المتجر أو الفرع..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
            }}
          />
        </div>

        {/* Pickup Phone */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            هاتف مسؤول تسليم الطرود
          </label>
          <input
            type="text"
            value={formData.pickupPhone || ''}
            onChange={(e) => setFormData({ ...formData, pickupPhone: e.target.value })}
            placeholder="010XXXXXXXX"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
            }}
          />
        </div>

        {/* Pickup City */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            مدينة الاستلام الرئيسية
          </label>
          <input
            type="text"
            value={formData.pickupCity || ''}
            onChange={(e) => setFormData({ ...formData, pickupCity: e.target.value })}
            placeholder="مثال: القاهرة، الجيزة، الإسكندرية..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
            }}
          />
        </div>

        {/* Pickup Address */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            عنوان المخزن أو الفرع بالتفصيل
          </label>
          <input
            type="text"
            value={formData.pickupAddress || ''}
            onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
            placeholder="عنوان الفرع أو المخزن لاستلام مندوب بوسطة للشحنات..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
            }}
          />
        </div>
      </div>

      {savedSuccess && (
        <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
          ✓ تم حفظ وتحديث إعدادات بوسطة بنجاح!
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
        <a
          href="https://business.bosta.co"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: '0.82rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
        >
          ↗ فتح لوحة تحكم بوسطة الرسمية (Bosta Dashboard)
        </a>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          style={{
            background: '#170e5e',
            color: '#ffffff',
            fontWeight: 700,
            padding: '9px 22px',
            borderRadius: '8px',
          }}
        >
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات بوسطة'}
        </Button>
      </div>
    </div>
  );
}
