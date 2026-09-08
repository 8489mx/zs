import { formatCurrency } from '@/lib/format';
import type { CrmDeal, DealStage } from '../api/crm.api';
import { STAGES } from './CrmConstants';
import { CrmDealCard } from './CrmDealCard';

interface CrmStageRowProps {
  stage: { key: DealStage; label: string; color: string; defaultProbability: number };
  deals: CrmDeal[];
  onSelectDeal: (id: number) => void;
  onStageChange: (deal: CrmDeal, nextStage: DealStage) => void;
}

export function CrmStageRow({
  stage,
  deals,
  onSelectDeal,
  onStageChange,
}: CrmStageRowProps) {
  const stageDeals = deals.filter((d) => d.stage === stage.key);
  const stageTotalAmount = stageDeals.reduce((sum, d) => sum + Number(d.expectedAmount || 0), 0);

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e8edf2',
        borderRight: `3px solid ${stage.color}`,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '14px',
      }}
    >
      {/* Stage Header - عمود ثابت على اليمين */}
      <div
        style={{
          minWidth: '155px',
          width: '155px',
          flexShrink: 0,
          alignSelf: 'flex-start',
          paddingLeft: '12px',
          borderLeft: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: stage.color,
              flexShrink: 0,
              opacity: 0.8,
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', lineHeight: 1.3 }}>
            {stage.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              background: '#f1f5f9',
              color: '#64748b',
              padding: '1px 7px',
              borderRadius: '999px',
            }}
          >
            {stageDeals.length} صفقة
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px', fontWeight: 500 }}>
          {formatCurrency(stageTotalAmount)}
        </div>
      </div>

      {/* Deal Cards - أفقي مع wrap */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'flex-start',
          minHeight: '72px',
        }}
      >
        {stageDeals.map((deal) => {
          const stageIndex = STAGES.findIndex((s) => s.key === deal.stage);
          return (
            <CrmDealCard
              key={deal.id}
              deal={deal}
              onClick={() => onSelectDeal(deal.id)}
              onStageChange={onStageChange}
              stageIndex={stageIndex}
            />
          );
        })}

        {stageDeals.length === 0 && (
          <div
            style={{
              padding: '16px 24px',
              color: '#94a3b8',
              fontSize: '12px',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              alignSelf: 'center',
              background: '#ffffff',
            }}
          >
            لا توجد صفقات في هذه المرحلة
          </div>
        )}
      </div>
    </div>
  );
}