import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gccShippingApi, GccShippingSettings } from '../api/gcc-shipping.api';
import { Button } from '@/shared/ui/button';

export function GccShippingSettingsCard() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<GccShippingSettings>({
    enabled: false,
    activeCarrier: 'aramex',
    environment: 'sandbox',

    aramexAccountNumber: '',
    aramexAccountPin: '',
    aramexAccountEntity: 'RUH',
    aramexCountryCode: 'SA',
    aramexUserName: '',
    aramexPassword: '',

    smsaPassKey: '',
    smsaCustomsCurrency: 'SAR',

    pickupBusinessName: '',
    pickupContactPerson: '',
    pickupPhone: '',
    pickupCountry: 'المملكة العربية السعودية',
    pickupCity: 'الرياض',
    pickupAddress: '',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['gcc-shipping-settings'],
    queryFn: gccShippingApi.getSettings,
  });

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<GccShippingSettings>) => gccShippingApi.saveSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gcc-shipping-settings'] });
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
        جاري تحميل إعدادات الشحن الخليجي (أرامكس و سمسا)...
      </div>
    );
  }

  const isAramex = formData.activeCarrier === 'aramex';

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
        gap: '24px',
      }}
      dir="rtl"
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#eff6ff',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              boxShadow: '0 2px 6px rgba(30,64,175,0.12)',
            }}
          >
            🚚
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              بوابات الشحن الخليجي الداخلي (Aramex & SMSA Express Gateway)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              ربط مباشر مع كبرى شركات الشحن والتوصيل السريع بالمملكة والخليج مع بوالص AWB حرارية وتتبع حي.
            </p>
          </div>
        </div>

        {/* Global Enable Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f8fafc', padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: formData.enabled ? '#059669' : '#64748b' }}>
            {formData.enabled ? 'الخدمة مفعلة' : 'الخدمة معطلة'}
          </span>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
          />
        </label>
      </div>

      {/* Carrier Selection Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, activeCarrier: 'aramex' })}
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            border: isAramex ? '2px solid #dc2626' : '1px solid #e2e8f0',
            background: isAramex ? '#fef2f2' : '#ffffff',
            cursor: 'pointer',
            textAlign: 'right',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>🔴</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isAramex ? '#991b1b' : '#0f172a' }}>
                أرامكس (Aramex Express)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                شحن سريع شامل لكافة دول الخليج (السعودية، الإمارات، الكويت، قطر، البحرين، عُمان)
              </div>
            </div>
          </div>
          {isAramex && (
            <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
              الناقل الافتراضي
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFormData({ ...formData, activeCarrier: 'smsa' })}
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            border: !isAramex ? '2px solid #d97706' : '1px solid #e2e8f0',
            background: !isAramex ? '#fffbeb' : '#ffffff',
            cursor: 'pointer',
            textAlign: 'right',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>🟡</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: !isAramex ? '#92400e' : '#0f172a' }}>
                سمسا إكسبريس (SMSA Express)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                الناقل الداخلي الأوسع انتشاراً بالمملكة العربية السعودية (أكثر من 300 مدينة ومحافظة)
              </div>
            </div>
          </div>
          {!isAramex && (
            <span style={{ background: '#d97706', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
              الناقل الافتراضي
            </span>
          )}
        </button>
      </div>

      {/* Environment Mode Switch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>بيئة التشغيل:</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.84rem' }}>
          <input
            type="radio"
            name="gcc_env"
            value="sandbox"
            checked={formData.environment === 'sandbox'}
            onChange={() => setFormData({ ...formData, environment: 'sandbox' })}
            style={{ accentColor: '#170e5e' }}
          />
          <span style={{ color: formData.environment === 'sandbox' ? '#170e5e' : '#64748b', fontWeight: 600 }}>
            وضع المحاكاة التجريبي (Sandbox / Mock) - تجربة حية بدون اشتراك رسمي
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.84rem' }}>
          <input
            type="radio"
            name="gcc_env"
            value="production"
            checked={formData.environment === 'production'}
            onChange={() => setFormData({ ...formData, environment: 'production' })}
            style={{ accentColor: '#170e5e' }}
          />
          <span style={{ color: formData.environment === 'production' ? '#059669' : '#64748b', fontWeight: 700 }}>
            الإنتاج الفعلي (Live Production API)
          </span>
        </label>
      </div>

      {/* Carrier Specific Credentials Card */}
      {isAramex ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid #fecaca', background: '#fffafa', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#991b1b' }}>
              🔴 بيانات اعتماد حساب أرامكس (Aramex Credentials)
            </h4>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem' }}
            >
              {showPassword ? 'إخفاء كلمات السر' : 'إظهار كلمات السر'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                اسم المستخدم (Username)
              </label>
              <input
                type="text"
                value={formData.aramexUserName || ''}
                onChange={(e) => setFormData({ ...formData, aramexUserName: e.target.value })}
                placeholder="e.g. testingapi@aramex.com"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                كلمة المرور (Password)
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.aramexPassword || ''}
                onChange={(e) => setFormData({ ...formData, aramexPassword: e.target.value })}
                placeholder="••••••••"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                رقم الحساب (Account Number)
              </label>
              <input
                type="text"
                value={formData.aramexAccountNumber || ''}
                onChange={(e) => setFormData({ ...formData, aramexAccountNumber: e.target.value })}
                placeholder="e.g. 20014"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                الرمز التعريفي (Account PIN)
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.aramexAccountPin || ''}
                onChange={(e) => setFormData({ ...formData, aramexAccountPin: e.target.value })}
                placeholder="••••••••"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                رمز الفرع والكيان (Account Entity)
              </label>
              <input
                type="text"
                value={formData.aramexAccountEntity || 'RUH'}
                onChange={(e) => setFormData({ ...formData, aramexAccountEntity: e.target.value.toUpperCase() })}
                placeholder="RUH (الرياض) / DXB (دبي) / KWI (الكويت)"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                رمز الدولة (Country Code)
              </label>
              <select
                value={formData.aramexCountryCode || 'SA'}
                onChange={(e) => setFormData({ ...formData, aramexCountryCode: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
              >
                <option value="SA">🇸🇦 المملكة العربية السعودية (SA)</option>
                <option value="AE">🇦🇪 الإمارات العربية المتحدة (AE)</option>
                <option value="KW">🇰🇼 الكويت (KW)</option>
                <option value="QA">🇶🇦 قطر (QA)</option>
                <option value="BH">🇧🇭 البحرين (BH)</option>
                <option value="OM">🇴🇲 عُمان (OM)</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid #fed7aa', background: '#fffdfa', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#92400e' }}>
              🟡 بيانات اعتماد سمسا إكسبريس (SMSA Express Credentials)
            </h4>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem' }}
            >
              {showPassword ? 'إخفاء مفتاح الربط' : 'إظهار مفتاح الربط'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                مفتاح المرور السري (SMSA PassKey)
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.smsaPassKey || ''}
                onChange={(e) => setFormData({ ...formData, smsaPassKey: e.target.value })}
                placeholder="SMSA Secret PassKey provided by SMSA sales"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                عملة التحصيل (Currency)
              </label>
              <select
                value={formData.smsaCustomsCurrency || 'SAR'}
                onChange={(e) => setFormData({ ...formData, smsaCustomsCurrency: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="AED">درهم إماراتي (AED)</option>
                <option value="KWD">دينار كويتي (KWD)</option>
                <option value="QAR">ريال قطري (QAR)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Pickup Address in GCC */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '14px', padding: '18px' }}>
        <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
          📍 بيانات المستودع الخليجي لاستلام الطرود (Pickup Location)
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              اسم المنشأة / المستودع
            </label>
            <input
              type="text"
              value={formData.pickupBusinessName || ''}
              onChange={(e) => setFormData({ ...formData, pickupBusinessName: e.target.value })}
              placeholder="مثال: مستودع الرياض الرئيسي"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              الشخص المسؤول عن التسليم
            </label>
            <input
              type="text"
              value={formData.pickupContactPerson || ''}
              onChange={(e) => setFormData({ ...formData, pickupContactPerson: e.target.value })}
              placeholder="مثال: مسؤول المخزن"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              رقم هاتف المستودع
            </label>
            <input
              type="text"
              value={formData.pickupPhone || ''}
              onChange={(e) => setFormData({ ...formData, pickupPhone: e.target.value })}
              placeholder="مثال: 0501234567"
              dir="ltr"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              المدينة
            </label>
            <input
              type="text"
              value={formData.pickupCity || 'الرياض'}
              onChange={(e) => setFormData({ ...formData, pickupCity: e.target.value })}
              placeholder="مثال: الرياض، دبي، جدة، الدمام"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              العنوان التفصيلي للمستودع
            </label>
            <input
              type="text"
              value={formData.pickupAddress || ''}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
              placeholder="مثال: حي السلي، مخرج 16، مستودع رقم 12"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
            />
          </div>
        </div>
      </div>

      {/* Save Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
        {savedSuccess ? (
          <div style={{ color: '#059669', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>✓</span>
            <span>تم حفظ إعدادات الشحن الخليجي بنجاح!</span>
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
            تدعم البوابة إصدار بوالص الشحن 4x6 فورياً لكل طلب أونلاين.
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          style={{
            background: '#170e5e',
            color: '#ffffff',
            padding: '10px 28px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(23,14,94,0.2)',
          }}
        >
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الشحن الخليجي'}
        </Button>
      </div>
    </div>
  );
}
