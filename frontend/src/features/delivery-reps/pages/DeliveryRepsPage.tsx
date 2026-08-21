import { useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { DeliveryRepsList } from '../components/DeliveryRepsList';
import { DeliveryRepOrders } from '../components/DeliveryRepOrders';
import { DeliveryRepSettlements } from '../components/DeliveryRepSettlements';
import { DeliveryRepPerformance } from '../components/DeliveryRepPerformance';

export default function DeliveryRepsPage() {
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'settlements' | 'performance'>('performance');

  return (
    <main className="document-prototype-column" style={{ maxWidth: '1280px' }}>
      <PageHeader 
        title="إدارة المناديب" 
        description="إدارة مناديب التوصيل، متابعة طلباتهم وتسوية الحسابات وتقييم الأداء." 
      />

      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
        <FormSection title="قائمة المناديب">
          <div style={{ overflow: 'hidden', margin: '-16px' }}>
            <DeliveryRepsList 
              selectedRepId={selectedRepId} 
              onSelectRep={(id) => { setSelectedRepId(id); setActiveTab('performance'); }} 
            />
          </div>
        </FormSection>

        <FormSection title={selectedRepId ? "تفاصيل المندوب" : "طلبات المندوب وتسوية الحساب"}>
          <div style={{ minHeight: '500px' }}>
            {!selectedRepId ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b', padding: '40px', textAlign: 'center', gap: '10px' }}>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>اختر مندوباً من القائمة</strong>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '360px', lineHeight: 1.5 }}>
                  اختر مندوباً لعرض لوحة مؤشرات الأداء، متابعة الطلبات المسندة، وتسوية العهد المالية وسجل التوريدات.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'inline-flex', gap: '6px', padding: '4px', background: '#f1f5f9', borderRadius: '10px', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('performance')}
                    style={{
                      padding: '6px 16px',
                      background: activeTab === 'performance' ? '#0f172a' : 'transparent',
                      border: 'none',
                      borderRadius: '7px',
                      color: activeTab === 'performance' ? '#ffffff' : '#475569',
                      fontWeight: activeTab === 'performance' ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.15s ease',
                      boxShadow: activeTab === 'performance' ? '0 2px 6px rgba(15, 23, 42, 0.15)' : 'none',
                    }}
                  >
                    لوحة الأداء
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    style={{
                      padding: '6px 16px',
                      background: activeTab === 'orders' ? '#0f172a' : 'transparent',
                      border: 'none',
                      borderRadius: '7px',
                      color: activeTab === 'orders' ? '#ffffff' : '#475569',
                      fontWeight: activeTab === 'orders' ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.15s ease',
                      boxShadow: activeTab === 'orders' ? '0 2px 6px rgba(15, 23, 42, 0.15)' : 'none',
                    }}
                  >
                    الطلبات وتسوية الحساب
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settlements')}
                    style={{
                      padding: '6px 16px',
                      background: activeTab === 'settlements' ? '#0f172a' : 'transparent',
                      border: 'none',
                      borderRadius: '7px',
                      color: activeTab === 'settlements' ? '#ffffff' : '#475569',
                      fontWeight: activeTab === 'settlements' ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.15s ease',
                      boxShadow: activeTab === 'settlements' ? '0 2px 6px rgba(15, 23, 42, 0.15)' : 'none',
                    }}
                  >
                    سجل التوريدات
                  </button>
                </div>
                {activeTab === 'performance' && <DeliveryRepPerformance repId={selectedRepId} />}
                {activeTab === 'orders' && <DeliveryRepOrders repId={selectedRepId} />}
                {activeTab === 'settlements' && <DeliveryRepSettlements repId={selectedRepId} />}
              </div>
            )}
          </div>
        </FormSection>
      </div>
    </main>
  );
}
