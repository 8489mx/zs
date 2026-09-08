import React from 'react';
import { CheckIcon, FlameIcon, UtensilsIcon } from '@/shared/components/icons/AppIcons';

export const KdsStandbyState: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: '850px',
        margin: '20px auto 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Standby Command Center Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '36px',
          textAlign: 'center',
          boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <CheckIcon size={28} color="#16a34a" strokeWidth={2.5} />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            fontSize: '12px',
            fontWeight: 800,
            padding: '4px 12px',
            borderRadius: '20px',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#16a34a',
              display: 'inline-block',
            }}
          />
          <span>جميع المحطات متصلة وبوضع الجاهزية التامة</span>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
          لا توجد طلبات معلقة بالمطبخ في الوقت الراهن
        </h2>
        <p
          style={{
            margin: '0 auto',
            fontSize: '13px',
            color: '#64748b',
            maxWidth: '520px',
            lineHeight: 1.6,
          }}
        >
          بمجرد تأكيد فواتير البيع من الكاشير أو إرسال الزبائن لطلبات الطاولات عبر رمز الـ QR، ستظهر تذاكر الوجبات هنا فورياً بالصوت والصورة لتوزيعها على المحطات.
        </p>
      </div>

      {/* Live Stations Monitor Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          { name: 'المطبخ الساخن', status: 'جاهز ونشط', icon: <FlameIcon size={16} color="#16a34a" /> },
          { name: 'المشويات والشواية', status: 'جاهز ونشط', icon: <UtensilsIcon size={16} color="#16a34a" /> },
          { name: 'المشروبات والبار', status: 'جاهز ونشط', icon: <UtensilsIcon size={16} color="#16a34a" /> },
          { name: 'المخبوزات والحلويات', status: 'جاهز ونشط', icon: <CheckIcon size={16} color="#16a34a" strokeWidth={2.5} /> },
        ].map((st, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{st.name}</div>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                {st.status}
              </div>
            </div>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {st.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
