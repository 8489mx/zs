import React from 'react';
import { CheckShieldIcon, UtensilsIcon, CheckIcon } from '@/shared/components/icons/AppIcons';

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
            background: '#eef2ff',
            border: '1px solid #c7d2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <CheckShieldIcon size={28} color="#170e5e" />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f8fafc',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            fontWeight: 800,
            padding: '4px 14px',
            borderRadius: '20px',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block',
            }}
          />
          <span>جميع محطات المطبخ متصلة وبوضع الجاهزية التامة</span>
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
          { name: 'المطبخ الساخن', status: 'جاهز ونشط', icon: <UtensilsIcon size={16} color="#170e5e" /> },
          { name: 'المشويات والشواية', status: 'جاهز ونشط', icon: <UtensilsIcon size={16} color="#170e5e" /> },
          { name: 'المشروبات والبار', status: 'جاهز ونشط', icon: <UtensilsIcon size={16} color="#170e5e" /> },
          { name: 'المخبوزات والحلويات', status: 'جاهز ونشط', icon: <CheckIcon size={16} color="#170e5e" strokeWidth={2.5} /> },
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
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, marginTop: '2px' }}>
                {st.status}
              </div>
            </div>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0',
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

