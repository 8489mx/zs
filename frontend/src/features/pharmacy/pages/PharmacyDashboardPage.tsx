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
  IconSparkles,
  IconTag,
  IconArrowLeft,
  IconRefresh,
} from '../components/PharmacyIcons';
import type { PharmacyShortage } from '../types/pharmacy.types';

export default function PharmacyDashboardPage() {
  useAppToolbar([{ label: 'قسم الصيدلية والأدوية' }]);
  const settingsQuery = useSettingsQuery();
  const storeName = settingsQuery.data?.storeName || 'صيدليتي';

  const statsQuery = useQuery({
    queryKey: ['pharmacy', 'stats'],
    queryFn: pharmacyApi.getStats,
  });

  const shortagesQuery = useQuery({
    queryKey: ['pharmacy', 'shortages', 'urgent'],
    queryFn: () => pharmacyApi.listShortages({ status: 'needed', pageSize: 6 }),
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
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="لوحة تحكم الصيدلية والرعاية الدوائية"
          description="إدارة دليل المواد الفعالة والبدائل، الروشتات والتأمين، كشكول النواقص اليومي، ورادار الصلاحيات"
          badge={<span className="nav-pill">الرعاية الصيدلانية المتكاملة</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={() => setStickerModalOpen(true)}
                style={{ background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconTag size={16} />
                <span>طباعة استيكر جرعة</span>
              </Button>
              <Link to="/pharmacy/prescriptions" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconPrescription size={16} />
                  <span>صرف روشتة</span>
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => void statsQuery.refetch()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh size={16} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* Top 4 KPI Metrics Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <Link to="/pharmacy/drugs" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s ease' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>دليل الأدوية المسجلة</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{stats.totalDrugs}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                <IconPill size={20} />
              </div>
            </div>
          </Link>

          <Link to="/pharmacy/shortages" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s ease' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>كشكول النواقص المطلوبة</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>{stats.neededShortages}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <IconShortage size={20} />
              </div>
            </div>
          </Link>

          <Link to="/pharmacy/prescriptions" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s ease' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>الروشتات المصروفة</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{stats.dispensedPrescriptions}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <IconPrescription size={20} />
              </div>
            </div>
          </Link>

          <Link to="/pharmacy/batches" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s ease' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>التشغيلات والصلاحيات</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>{stats.totalBatches}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <IconExpiry size={20} />
              </div>
            </div>
          </Link>
        </div>

        {/* Generics Quick Search Hero Bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ maxWidth: '620px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconSparkles size={20} color="#ffffff" />
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                محرك البحث الفوري عن بدائل ومثائل الأدوية (Generics Finder)
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', opacity: 0.92, lineHeight: 1.4 }}>
              ابحث بالمادة الفعالة (مثل Paracetamol أو Amoxicillin) لعرض كافة البدائل التجارية والأسعار والمثائل المتوفرة فوراً
            </p>
          </div>

          <form onSubmit={handleQuickSubSearch} style={{ display: 'flex', gap: '8px', flex: '1 1 340px', maxWidth: '500px' }}>
            <input
              type="text"
              className="purchase-prototype-field-input"
              value={searchIngredient}
              onChange={(e) => setSearchIngredient(e.target.value)}
              placeholder="اكتب المادة الفعالة أو اسم الدواء (e.g. Paracetamol, Augmentin)..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#ffffff',
                fontSize: '0.86rem',
                color: '#0f172a',
              }}
            />
            <Button
              type="submit"
              variant="primary"
              style={{
                background: '#0f172a',
                borderColor: '#0f172a',
                whiteSpace: 'nowrap',
              }}
            >
              بحث البدائل
            </Button>
          </form>
        </div>

        {/* Two-Column Section: Urgent Shortages & Quick Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
          {/* Urgent Shortages List */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconShortage size={18} color="#0f172a" />
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>أحدث النواقص بكشكول الصيدلية</strong>
              </div>
              <Link to="/pharmacy/shortages" style={{ fontSize: '0.78rem', color: '#0284c7', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>عرض الكشكول بالكامل</span>
                <IconArrowLeft size={14} />
              </Link>
            </div>

            {shortagesQuery.isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</div>
            ) : shortagesQuery.data?.shortages.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                لا توجد نواقص مسجلة حالياً
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
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{s.product_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {s.suggested_distributor || 'موزع عام'} • الكمية: <strong>{s.requested_quantity}</strong> علبة
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: s.priority === 'urgent' ? '#fee2e2' : s.priority === 'customer_request' ? '#e0f2fe' : '#f1f5f9',
                        color: s.priority === 'urgent' ? '#dc2626' : s.priority === 'customer_request' ? '#0369a1' : '#475569',
                      }}
                    >
                      {s.priority === 'urgent' ? 'عاجل جداً' : s.priority === 'customer_request' ? 'طلب عميل' : 'عادي'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Access Modules Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/pharmacy/drugs"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconPill size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>دليل الأدوية وتجزئة الشرائط (Fractions)</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>تسجيل المواد الفعالة، تسعير العلبة والشريط، وتصنيف الجداول</div>
                </div>
              </div>
              <IconArrowLeft size={16} color="#94a3b8" />
            </Link>

            <Link
              to="/pharmacy/prescriptions"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconPrescription size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>الروشتات الطبية والتأمين الصحي (Co-Pay)</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>صرف الروشتات، حساب نسب التحمل، وأكواد الموافقات الطبية</div>
                </div>
              </div>
              <IconArrowLeft size={16} color="#94a3b8" />
            </Link>

            <Link
              to="/pharmacy/clinical-services"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconStethoscope size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>سجل الفحوصات والخدمات الإكلينيكية</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>قياس الضغط، السكر، الوزن، وحقن المرضى مع حفظ التاريخ الطبي</div>
                </div>
              </div>
              <IconArrowLeft size={16} color="#94a3b8" />
            </Link>

            <Link
              to="/pharmacy/batches"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconExpiry size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>رادار الصلاحيات ومرتجعات الشركات</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>حصر الأدوية الوشيكة الانتهاء وتجهيز أذون الإرجاع للموزعين</div>
                </div>
              </div>
              <IconArrowLeft size={16} color="#94a3b8" />
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
