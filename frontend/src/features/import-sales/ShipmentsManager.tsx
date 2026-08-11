import { useState } from 'react';
import './FrontendStyles.css';

export default function ShipmentsManager() {
  const [shipments] = useState([
    { id: 1, container: 'MSKU-1234567', arrival: '2026-09-01', status: 'في البحر' },
    { id: 2, container: 'CMAU-9876543', arrival: '2026-08-10', status: 'في الجمارك' },
    { id: 3, container: 'HLXU-1122334', arrival: '2026-07-20', status: 'تم حساب التكلفة' }
  ]);

  return (
    <div className="module-container">
      <h2 className="section-title">🚢 إدارة الحاويات والشحنات</h2>
      <div className="cards-grid">
        {shipments.map(s => (
          <div key={s.id} className="shipment-card">
            <div className="shipment-header">
              <h3>{s.container}</h3>
              <span className={`status-badge ${s.status === 'في البحر' ? 'blue' : s.status === 'في الجمارك' ? 'yellow' : 'green'}`}>
                {s.status}
              </span>
            </div>
            <p style={{color: '#94a3b8', fontSize: '0.95rem'}}>تاريخ الوصول المتوقع: {s.arrival}</p>
            
            {s.status === 'في الجمارك' && (
               <button className="action-btn primary">إدخال فواتير التخليص وحساب التكلفة</button>
            )}
            
            {s.status === 'تم حساب التكلفة' && (
               <button className="action-btn secondary">عرض تقرير تكلفة الأصناف</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
