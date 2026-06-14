import { useEffect, useState } from 'react';

export function Step4Loading() {
  const [activePhase, setActivePhase] = useState(0);

  useEffect(() => {
    // Animate through 4 phases over 2.5 seconds
    const intervals = [500, 1000, 1500, 2000];
    const timers = intervals.map((time, idx) => 
      setTimeout(() => setActivePhase(idx + 1), time)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    { label: 'إنشاء سجل المستأجر' },
    { label: 'إعداد قاعدة البيانات' },
    { label: 'تثبيت التطبيقات' },
    { label: 'تفعيل مساحة العمل' },
  ];

  return (
    <div className="wizard-step-content" style={{ animation: 'none' }}>
      <div className="wizard-loading-screen">
        <div className="wizard-spinner"></div>
        <h3 style={{ marginBottom: 24 }}>تجهيز مساحة العمل الخاصة بك...</h3>
        
        <div className="wizard-loading-steps">
          {steps.map((step, idx) => {
            const isDone = activePhase > idx;
            const isActive = activePhase === idx;
            
            return (
              <div 
                key={idx} 
                className={`wizard-loading-step ${isDone ? 'done' : isActive ? 'active' : ''}`}
              >
                <div className="step-icon-box">
                  {isDone ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : isActive ? (
                    <div style={{ width: 12, height: 12, background: 'currentColor', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                  ) : (
                    <div style={{ width: 8, height: 8, background: '#cbd5e1', borderRadius: '50%' }} />
                  )}
                </div>
                {step.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
