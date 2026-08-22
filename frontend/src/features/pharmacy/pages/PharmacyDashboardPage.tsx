import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { pharmacyApi } from '../api/pharmacy.api';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { GenericSubstitutesModal } from '../components/GenericSubstitutesModal';
import { DoseStickerPrintModal } from '../components/DoseStickerPrintModal';
import type { PharmacyShortage } from '../types/pharmacy.types';

export default function PharmacyDashboardPage() {
  const settingsQuery = useSettingsQuery();
  const storeName = settingsQuery.data?.storeName || 'صيدليتي';

  const statsQuery = useQuery({
    queryKey: ['pharmacy', 'stats'],
    queryFn: pharmacyApi.getStats,
  });

  const shortagesQuery = useQuery({
    queryKey: ['pharmacy', 'shortages', 'urgent'],
    queryFn: () => pharmacyApi.listShortages({ status: 'needed', pageSize: 5 }),
  });

  const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
  const [searchIngredient, setSearchIngredient] = useState('');
  const [stickerModalOpen, setStickerModalOpen] = useState(false);

  const stats = statsQuery.data || {
    totalDrugs: 0,
    neededShortages: 0,
    dispensedPrescriptions: 0,
    totalBatches: 0,
  };

  const handleQuickSubSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchIngredient.trim()) {
      setSubstituteModalOpen(true);
    }
  };

  return (
    <div className="page-stack" dir="rtl" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px', gap: '20px' }}>
      {/* Header & Quick Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏥</span> لوحة تحكم وإدارة الصيدلية
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
            الرعاية الصيدلانية الشاملة، دليل المواد الفعالة والبدائل، الصلاحيات، وكشكول النواقص
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStickerModalOpen(true)}
            className="btn btn-secondary"
            style={{ fontWeight: 800, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🏷️</span> طباعة استيكر جرعة
          </button>
          <Link
            to="/pharmacy/prescriptions"
            className="btn btn-primary"
            style={{ fontWeight: 800, fontSize: '0.85rem', background: '#16a34a', borderColor: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📝</span> صرف روشتة طبية
          </Link>
        </div>
      </div>

      {/* Quick Search for Generic Substitutes */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)',
        }}
      >
        <div style={{ maxWidth: '700px' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
            ⚡ محرك البحث الفوري عن بدائل ومثائل الأدوية (Generics Finder)
          </h2>
          <p style={{ margin: '6px 0 14px 0', fontSize: '0.85rem', opacity: 0.9 }}>
            ابحث بالمادة الفعالة (مثل Paracetamol أو Amoxicillin) لعرض كافة البدائل المتاحة وأسعارها فوراً عند نقص الصنف
          </p>

          <form onSubmit={handleQuickSubSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchIngredient}
              onChange={(e) => setSearchIngredient(e.target.value)}
              placeholder="اكتب المادة الفعالة أو اسم الدواء (e.g. Paracetamol, Augmentin, أوميبرازول)..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.9rem',
                color: '#0f172a',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              بحث البدائل
            </button>
          </form>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <Link
          to="/pharmacy/drugs"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            💊
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>دليل الأدوية المسجلة</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>{stats.totalDrugs}</div>
          </div>
        </Link>

        <Link
          to="/pharmacy/shortages"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            📋
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>كشكول النواقص المطلوبة</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626' }}>{stats.neededShortages}</div>
          </div>
        </Link>

        <Link
          to="/pharmacy/prescriptions"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            🧾
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>الروشتات المصروفة</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a' }}>{stats.dispensedPrescriptions}</div>
          </div>
        </Link>

        <Link
          to="/pharmacy/batches"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            ⏳
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>التشغيلات وتواريخ الصلاحية</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>{stats.totalBatches}</div>
          </div>
        </Link>
      </div>

      {/* Two Column Grid: Urgent Shortages & Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* Urgent Shortages List */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>⚠️ أحدث النواقص العاجلة بكشكول الصيدلية</strong>
            <Link to="/pharmacy/shortages" style={{ fontSize: '0.8rem', color: '#0284c7', textDecoration: 'none', fontWeight: 700 }}>
              عرض الكل 🠄
            </Link>
          </div>

          {shortagesQuery.isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</div>
          ) : shortagesQuery.data?.shortages.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              🎉 لا توجد نواقص مسجلة حالياً
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {shortagesQuery.data?.shortages.map((s: PharmacyShortage) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{s.product_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {s.suggested_distributor || 'موزع عام'} • الكمية: {s.requested_quantity}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: s.priority === 'urgent' ? '#fee2e2' : '#f1f5f9',
                      color: s.priority === 'urgent' ? '#dc2626' : '#475569',
                    }}
                  >
                    {s.priority === 'urgent' ? 'عاجل جداً' : s.priority === 'customer_request' ? 'طلب عميل' : 'عادي'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Navigation Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link
            to="/pharmacy/drugs"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.4rem' }}>📚</div>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>دليل الأدوية والشرائح (Units & Strips)</strong>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>تسجيل المواد الفعالة، تسعير العلبة والشريط، وجداول الأدوية</div>
              </div>
            </div>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>🠄</span>
          </Link>

          <Link
            to="/pharmacy/clinical-services"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.4rem' }}>🩺</div>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>سجل الفحوصات والخدمات الصيدلانية</strong>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>قياس الضغط، السكر، الوزن، وحقن المرضى مع حفظ السجل</div>
              </div>
            </div>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>🠄</span>
          </Link>

          <Link
            to="/pharmacy/batches"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.4rem' }}>🗓️</div>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>رادار الصلاحيات ومرتجعات الشركات</strong>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>حصر الأدوية الوشيكة الانتهاء وتجهيز المرتجعات للموزعين</div>
              </div>
            </div>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>🠄</span>
          </Link>
        </div>
      </div>

      {/* Modals */}
      <GenericSubstitutesModal
        open={substituteModalOpen}
        onClose={() => setSubstituteModalOpen(false)}
        activeIngredient={searchIngredient}
      />

      <DoseStickerPrintModal
        open={stickerModalOpen}
        onClose={() => setStickerModalOpen(false)}
        storeName={storeName}
      />
    </div>
  );
}
