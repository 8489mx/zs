import './FrontendStyles.css';

export default function SupplierCredit() {
  return (
    <div className="module-container">
      <h2 className="section-title">🏦 محفظة سداد المصنع الصيني</h2>
      
      <div className="credit-summary">
        <div className="summary-item">
          <span>المديونية المتبقية</span>
          <h3 style={{color: '#f43f5e'}}>$125,000</h3>
        </div>
        <div className="summary-item" style={{border: '1px solid rgba(251, 191, 36, 0.3)'}}>
          <span>الرصيد المتاح للتحويل بالدرج</span>
          <h3 style={{color: '#fbbf24'}}>450,000 ج.م</h3>
        </div>
        <div className="summary-item">
          <span>يعادل تقريباً (بسعر الصرف الحالي)</span>
          <h3 style={{color: '#38bdf8'}}>$9,180</h3>
        </div>
      </div>
      
      <div className="payment-form-card">
        <h3 style={{marginTop: 0, marginBottom: '1.5rem'}}>تسجيل حوالة بنكية جديدة</h3>
        <p style={{color: '#94a3b8', marginBottom: '2rem'}}>هذه العملية ستقوم بخصم الرصيد من الدرج وتقليل مديونية الصين بناءً على سعر الصرف الفعلي للبنك.</p>
        
        <div className="cards-grid">
          <div className="form-group">
            <label>المبلغ المحول (بـ الدولار $)</label>
            <input type="number" placeholder="مثال: 5000" />
          </div>
          <div className="form-group">
            <label>سعر الصرف البنكي الفعلي</label>
            <input type="number" placeholder="مثال: 49.20" />
          </div>
        </div>
        
        <button className="action-btn success">تأكيد تحويل الأموال وتخفيض المديونية</button>
      </div>
    </div>
  );
}
