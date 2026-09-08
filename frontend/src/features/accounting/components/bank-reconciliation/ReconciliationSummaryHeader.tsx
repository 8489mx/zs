import React from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { RefreshCwIcon, CheckIcon } from '@/shared/components/icons/AppIcons';

interface ReconciliationSummaryHeaderProps {
  statement?: any;
  summary?: any;
  suggestions?: any[];
  onRefetch: () => void;
  onAcceptSuggestions: () => void;
  isAccepting: boolean;
}

export const ReconciliationSummaryHeader: React.FC<ReconciliationSummaryHeaderProps> = ({
  statement,
  summary,
  suggestions = [],
  onRefetch,
  onAcceptSuggestions,
  isAccepting,
}) => {
  return (
    <Card className="workspace-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
              كشف حساب: {statement?.statementNo} ({statement?.accountNameAr})
            </h3>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                background: summary?.isBalanced ? '#f0fdf4' : '#fff7ed',
                color: summary?.isBalanced ? '#166534' : '#c2410c',
                border: `1px solid ${summary?.isBalanced ? '#bbf7d0' : '#fed7aa'}`,
              }}
            >
              {summary?.isBalanced ? 'الحساب متطابق 100%' : `فارق غير مطابق: ${formatCurrency(summary?.difference || 0)}`}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            تاريخ الكشف: {statement?.statementDate} • كود الحساب: {statement?.accountCode}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onRefetch}
            style={{ fontSize: '12px', fontWeight: 700 }}
          >
            <RefreshCwIcon size={14} style={{ marginInlineEnd: '4px' }} />
            تحديث
          </Button>
        </div>
      </div>

      {/* 4 Enterprise KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>رصيد بداية الكشف:</span>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
            {formatCurrency(summary?.startingBalance || 0)}
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>رصيد نهاية الكشف المستهدف:</span>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#170e5e', marginTop: '2px' }}>
            {formatCurrency(summary?.endingBalance || 0)}
          </div>
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px' }}>
          <span style={{ fontSize: '11.5px', color: '#166534', fontWeight: 700 }}>إجمالي الحركات المطابقة:</span>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#166534', marginTop: '2px' }}>
            {formatCurrency(summary?.reconciledAmount || 0)}
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#4ade80', marginInlineStart: '6px' }}>
              ({summary?.reconciledLinesCount || 0} من {summary?.totalLines || 0} بنود)
            </span>
          </div>
        </div>

        <div
          style={{
            background: summary?.isBalanced ? '#f0fdf4' : '#fef2f2',
            border: `1.5px solid ${summary?.isBalanced ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '10px',
            padding: '12px 16px',
          }}
        >
          <span style={{ fontSize: '11.5px', color: summary?.isBalanced ? '#166534' : '#991b1b', fontWeight: 700 }}>
            {summary?.isBalanced ? 'حالة التطابق:' : 'الفارق المتبقي (Difference):'}
          </span>
          <div style={{ fontSize: '18px', fontWeight: 900, color: summary?.isBalanced ? '#166534' : '#dc2626', marginTop: '2px' }}>
            {summary?.isBalanced ? '0.00 ج.م (متطابق بالكامل)' : formatCurrency(summary?.difference || 0)}
          </div>
        </div>
      </div>

      {/* Smart Auto-Match Banner */}
      {suggestions.length > 0 && (
        <div
          style={{
            marginTop: '14px',
            background: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckIcon size={18} color="#1d4ed8" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
              اكتشف النظام الذكي {suggestions.length} مطابقة آلية محتملة ذات ثقة عالية بين كشف الحساب ودفتر الأستاذ.
            </span>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={onAcceptSuggestions}
            disabled={isAccepting}
            style={{ background: '#1d4ed8', borderColor: '#1d4ed8', fontSize: '12px', fontWeight: 800, padding: '4px 14px' }}
          >
            {isAccepting ? 'جارٍ الاعتماد...' : 'اعتماد جميع المطابقات المقترحة بضغطة زر'}
          </Button>
        </div>
      )}
    </Card>
  );
};
