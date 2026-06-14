export function Step5Success() {
  return (
    <div className="wizard-step-content" style={{ animation: 'none' }}>
      <div className="wizard-success-screen">
        <div className="wizard-success-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2>مساحة العمل جاهزة!</h2>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>جاري تحويلك الآن...</p>
      </div>
    </div>
  );
}
