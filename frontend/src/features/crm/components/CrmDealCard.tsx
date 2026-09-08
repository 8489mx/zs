import { formatCurrency } from '@/lib/format';
import type { CrmDeal, DealStage } from '../api/crm.api';
import { STAGES, PRIORITIES } from './CrmConstants';

export interface CrmDealCardProps {
  deal: CrmDeal;
  onClick: () => void;
  onStageChange: (deal: CrmDeal, nextStage: DealStage) => void;
  stageIndex: number;
}

export function CrmDealCard({ deal, onClick, onStageChange, stageIndex }: CrmDealCardProps) {
  const priorityConfig = PRIORITIES[deal.priority] || PRIORITIES.medium;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#ffffff',
        borderRadius: '10px',
        padding: '10px 12px',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        width: '220px',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
      }}
    >
      {/* Title & Priority Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
          {deal.title}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            background: priorityConfig.bg,
            color: priorityConfig.color,
            padding: '1px 5px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {priorityConfig.label}
        </span>
      </div>

      {/* Customer / Company */}
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
        {deal.companyName || deal.contactName || 'بدون جهة اتصال'}
      </div>

      {/* Amount & Probability */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
          paddingTop: '6px',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#170e5e' }}>
          {formatCurrency(deal.expectedAmount)}
        </span>
        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
          {deal.probability}%
        </span>
      </div>

      {/* Fast Stage Shift Arrows */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          disabled={stageIndex === 0}
          onClick={() => onStageChange(deal, STAGES[stageIndex - 1].key)}
          style={{
            padding: '1px 7px',
            fontSize: '11px',
            background: stageIndex === 0 ? '#f1f5f9' : '#e2e8f0',
            border: 'none',
            borderRadius: '4px',
            cursor: stageIndex === 0 ? 'not-allowed' : 'pointer',
            color: '#475569',
          }}
          title="المرحلة السابقة"
        >
          →
        </button>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
          {deal.contactPhone ? deal.contactPhone : ''}
        </span>
        <button
          disabled={stageIndex === STAGES.length - 1}
          onClick={() => onStageChange(deal, STAGES[stageIndex + 1].key)}
          style={{
            padding: '1px 7px',
            fontSize: '11px',
            background: stageIndex === STAGES.length - 1 ? '#f1f5f9' : '#170e5e',
            color: stageIndex === STAGES.length - 1 ? '#94a3b8' : '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: stageIndex === STAGES.length - 1 ? 'not-allowed' : 'pointer',
          }}
          title="المرحلة التالية"
        >
          ←
        </button>
      </div>
    </div>
  );
}
