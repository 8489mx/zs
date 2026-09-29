import React from 'react';
import type { ArCollectionsOverview } from '../../api/ar-collections.api';
import { ClockIcon, CheckShieldIcon, AlertCircleIcon, CalendarIcon, FileTextIcon } from '@/shared/components/icons/AppIcons';

interface ArCollectionsKpisProps {
  overview: ArCollectionsOverview | null;
  loading: boolean;
}

export const ArCollectionsKpis: React.FC<ArCollectionsKpisProps> = ({ overview, loading }) => {
  const cards = [
    {
      title: 'إجمالي المديونيات المتأخرة',
      value: loading ? '—' : `${Number(overview?.totalOverdue || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`,
      sub: 'مبالغ مستحقة تجاوزت مواعيد السداد',
      icon: <ClockIcon size={20} color="#b91c1c" />,
      bg: '#fef2f2',
      border: '#fecaca',
      textColor: '#991b1b',
    },
    {
      title: 'ملفات التحصيل النشطة',
      value: loading ? '—' : `${overview?.openCasesCount || 0} عميل`,
      sub: 'عملاء في مسار المتابعة والتذكير',
      icon: <FileTextIcon size={20} color="#1d4ed8" />,
      bg: '#eff6ff',
      border: '#bfdbfe',
      textColor: '#1e40af',
    },
    {
      title: 'مبالغ متعهد بسدادها اليوم',
      value: loading ? '—' : `${Number(overview?.promisedAmountToday || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`,
      sub: `${overview?.promisedPaymentsCount || 0} موعد سداد مستحق`,
      icon: <CalendarIcon size={20} color="#047857" />,
      bg: '#ecfdf5',
      border: '#a7f3d0',
      textColor: '#065f46',
    },
    {
      title: 'ملفات تحت الإنذار والتصعيد',
      value: loading ? '—' : `${overview?.escalatedCasesCount || 0} عميل`,
      sub: 'تأخير +30 يوماً أو إخلال بالوعد',
      icon: <AlertCircleIcon size={20} color="#c2410c" />,
      bg: '#fff7ed',
      border: '#fed7aa',
      textColor: '#9a3412',
    },
    {
      title: 'حظر البيع الآجل الفوري',
      value: loading ? '—' : `${overview?.creditBlockedCount || 0} عميل`,
      sub: 'ممنوعون من الآجل لحين التسوية',
      icon: <CheckShieldIcon size={20} color="#6b21a8" />,
      bg: '#faf5ff',
      border: '#e9d5ff',
      textColor: '#581c87',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '20px',
      }}
    >
      {cards.map((c, i) => (
        <div
          key={i}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: c.bg,
              border: `1px solid ${c.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {c.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '4px' }}>
              {c.title}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: c.textColor, lineHeight: 1.3 }}>
              {c.value}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
