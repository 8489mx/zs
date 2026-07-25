import { useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { DeliveryRepsList } from '../components/DeliveryRepsList';
import { DeliveryRepOrders } from '../components/DeliveryRepOrders';
import { DeliveryRepSettlements } from '../components/DeliveryRepSettlements';

export default function DeliveryRepsPage() {
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'settlements'>('orders');

  return (
    <main className="document-prototype-column" style={{ maxWidth: '1280px' }}>
      <PageHeader 
        title="إدارة المناديب" 
        description="إدارة مناديب التوصيل، متابعة طلباتهم وتسوية الحسابات." 
      />

      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
        <FormSection title="قائمة المناديب">
          <div style={{ overflow: 'hidden', margin: '-16px' }}>
            <DeliveryRepsList 
              selectedRepId={selectedRepId} 
              onSelectRep={(id) => { setSelectedRepId(id); setActiveTab('orders'); }} 
            />
          </div>
        </FormSection>

        <FormSection title={selectedRepId ? "تفاصيل المندوب" : "طلبات المندوب وتسوية الحساب"}>
          <div style={{ minHeight: '500px' }}>
            {!selectedRepId ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', padding: '40px' }}>
                اختر مندوب من القائمة لعرض طلباته وتسويتها
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
                  <button
                    onClick={() => setActiveTab('orders')}
                    style={{
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'orders' ? '2px solid var(--primary)' : '2px solid transparent',
                      color: activeTab === 'orders' ? 'var(--primary)' : '#64748b',
                      fontWeight: activeTab === 'orders' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    الطلبات وتسوية الحساب
                  </button>
                  <button
                    onClick={() => setActiveTab('settlements')}
                    style={{
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'settlements' ? '2px solid var(--primary)' : '2px solid transparent',
                      color: activeTab === 'settlements' ? 'var(--primary)' : '#64748b',
                      fontWeight: activeTab === 'settlements' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    سجل التوريدات السابقة
                  </button>
                </div>
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
