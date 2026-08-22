import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { GenericSubstitutesModal } from '../components/GenericSubstitutesModal';
import { DoseStickerPrintModal } from '../components/DoseStickerPrintModal';
import {
  IconPill,
  IconPrescription,
  IconShortage,
  IconExpiry,
  IconStethoscope,
  IconTag,
  IconArrowLeft,
  IconRefresh,
  IconSearch,
} from '../components/PharmacyIcons';
import type { PharmacyShortage } from '../types/pharmacy.types';

const POPULAR_SEARCH_PRESETS = [
  'Paracetamol',
  'Amoxicillin',
  'Pantoprazole',
  'Ibuprofen',
  'Bisoprolol',
  'Nifuroxazide',
];

export default function PharmacyDashboardPage() {
  useAppToolbar([
    { label: 'الرئيسية', to: '/' },
    { label: 'الصيدلية والرعاية الدوائية' },
  ]);
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

  const handlePresetClick = (term: string) => {
    setSearchIngredient(term);
    setSubstituteModalOpen(true);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="لوحة تحكم الصيدلية والرعاية الدوائية"
          description="إدارة دليل المواد الفعالة والبدائل، الروشتات والتأمين، كشكول النواقص اليومي، ورادار الصلاحيات"
          badge={<span className="cashier-chip" style={{ fontWeight: 700, color: 'var(--primary, #1e1b4b)', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>الرعاية الصيدلانية</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={() => setStickerModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconTag size={15} />
                <span>طباعة استيكر جرعة</span>
              </Button>
              <Link to="/pharmacy/prescriptions" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconPrescription size={15} />
                  <span>صرف روشتة</span>
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => void statsQuery.refetch()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh size={15} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* 4 Premium KPI Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <Link to="/pharmacy/drugs" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)', transition: 'all 0.15s ease' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>دليل الأدوية المسجلة</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{stats.totalDrugs}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                <IconPill size={18} />
              </div>
            </div>
          </Link>

          <Link to="/pharmacy/shortages" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)', transition: 'all 0.15s ease' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>كشكول النواقص</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: Number(stats.neededShortages) > 0 ? '#b91c1c' : '#0f172a', marginTop: '2px' }}>{stats.neededShortages}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                <IconShortage size={18} />
              </div>
            </div>
          </Link>

          <Link to="/pharmacy/prescriptions" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)', transition: 'all 0.15s ease' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>الروشتات المصروفة</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{stats.dispensedPrescriptions}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                <IconPrescription size={18} />
              </div>
            </div>
          </Link>

          <Link to="/pharmacy/batches" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)', transition: 'all 0.15s ease' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>التشغيلات والصلاحيات</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{stats.totalBatches}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                <IconExpiry size={18} />
              </div>
            </div>
          </Link>
        </div>

        {/* Generics Quick Search Hero Bar - Luxury Elegant Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                محرك البحث الفوري عن بدائل ومثائل الأدوية (Generics Finder)
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                ابحث بالمادة الفعالة أو الاسم التجاري لعرض كافة البدائل والأسعار والمثائل المتوفرة بالمخزون فوراً
              </p>
            </div>

            <form onSubmit={handleQuickSubSearch} style={{ display: 'flex', gap: '8px', flex: '1 1 340px', maxWidth: '480px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="purchase-prototype-field-input"
                  value={searchIngredient}
                  onChange={(e) => setSearchIngredient(e.target.value)}
                  placeholder="اكتب المادة الفعالة أو اسم الدواء (e.g. Paracetamol)..."
                  style={{
                    width: '100%',
                    paddingInlineStart: '34px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex' }}>
                  <IconSearch size={15} />
                </div>
              </div>
              <Button
                type="submit"
                variant="primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  padding: '8px 16px',
                  fontSize: '0.82rem'
                }}
              >
                <span>بحث البدائل</span>
              </Button>
            </form>
          </div>

          {/* Quick Presets Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>مواد شائعة:</span>
            {POPULAR_SEARCH_PRESETS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handlePresetClick(item)}
                style={{
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary, #1e1b4b)';
                  e.currentTarget.style.color = 'var(--primary, #1e1b4b)';
                  e.currentTarget.style.background = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#334155';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Two-Column Section: Urgent Shortages & Quick Navigation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
          {/* Urgent Shortages List */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                  <IconShortage size={15} />
                </div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>أحدث النواقص بكشكول الصيدلية</strong>
              </div>
              <Link to="/pharmacy/shortages" style={{ fontSize: '0.78rem', color: 'var(--primary, #1e1b4b)', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>عرض الكشكول</span>
                <IconArrowLeft size={13} />
              </Link>
            </div>

            {shortagesQuery.isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>جاري التحميل...</div>
            ) : shortagesQuery.data?.shortages.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                لا توجد نواقص مطلوبة مسجلة حالياً
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
                      padding: '10px 12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{s.product_name}</strong>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                        {s.suggested_distributor || 'موزع عام'} • الكمية المطلوبة: <strong>{s.requested_quantity}</strong>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: s.priority === 'urgent' ? '#fee2e2' : '#f1f5f9',
                        color: s.priority === 'urgent' ? '#b91c1c' : '#475569',
                        border: s.priority === 'urgent' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {s.priority === 'urgent' ? 'عاجل' : s.priority === 'customer_request' ? 'طلب عميل' : 'عادي'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Access Modules Navigation Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/pharmacy/drugs"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPill size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>دليل الأدوية وتجزئة الشرائط (Fractions)</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>تسجيل المواد الفعالة، تسعير العلبة والشريط، وتصنيف الجداول</div>
                </div>
              </div>
              <IconArrowLeft size={15} color="#94a3b8" />
            </Link>

            <Link
              to="/pharmacy/prescriptions"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPrescription size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>الروشتات الطبية والتأمين الصحي (Co-Pay)</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>صرف الروشتات، حساب نسب التحمل، وأكواد الموافقات الطبية</div>
                </div>
              </div>
              <IconArrowLeft size={15} color="#94a3b8" />
            </Link>

            <Link
              to="/pharmacy/clinical-services"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconStethoscope size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>سجل الفحوصات والخدمات الإكلينيكية</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>قياس الضغط، السكر، الوزن، وحقن المرضى مع حفظ التاريخ الطبي</div>
                </div>
              </div>
              <IconArrowLeft size={15} color="#94a3b8" />
            </Link>

            <Link
              to="/pharmacy/batches"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconExpiry size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>رادار الصلاحيات ومرتجعات الشركات</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>حصر الأدوية الوشيكة الانتهاء وتجهيز أذون الإرجاع للموزعين</div>
                </div>
              </div>
              <IconArrowLeft size={15} color="#94a3b8" />
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
      </main>
    </div>
  );
}
