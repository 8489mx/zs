import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { contractingApi } from '../api/contracting.api';
import { BoqProfitabilitySummary } from '../contracting.types';
import { getTextDirection } from '@/lib/arabic-normalization';

interface BoqProfitabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

export function BoqProfitabilityModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: BoqProfitabilityModalProps) {
  const [summary, setSummary] = useState<BoqProfitabilitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'profitable' | 'at_risk' | 'loss'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    contractingApi
      .getBoqProfitabilityAnalysis(projectId)
      .then((data) => setSummary(data))
      .catch((err) => console.error('Failed to load BOQ profitability:', err))
      .finally(() => setLoading(false));
  }, [isOpen, projectId]);

  const filteredItems = (summary?.items || []).filter((item) => {
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch =
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="كشف أرباح وخسائر البنود وانحراف التكاليف (Item-Level Profit & Loss / Cost Variance)"
      subtitle={`تحليل ربحية كل بند على حدة وتحديد البنود الرابحة والخاسرة لمشروع: ${projectName || ''}`}
      maxWidth="900px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 'var(--font-body)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {/* ملخص المؤشرات المالية للبنود */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>إجمالي قيمة التعاقد</span>
            <strong style={{ display: 'block', fontSize: '1.15rem', color: '#1e293b', marginTop: '4px' }}>
              {(summary?.totalProjectRevenue || 0).toLocaleString()} ر.س
            </strong>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>التكلفة المقدرة للمقايسة</span>
            <strong style={{ display: 'block', fontSize: '1.15rem', color: '#475569', marginTop: '4px' }}>
              {(summary?.totalProjectEstimatedCost || 0).toLocaleString()} ر.س
            </strong>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#065f46' }}>صافي الربح المتوقع الإجمالي</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: '#047857', marginTop: '4px' }}>
              {(summary?.totalProjectProfit || 0).toLocaleString()} ر.س ({summary?.overallMarginPercent || 0}%)
            </strong>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: (summary?.lossMakingItemsCount || 0) > 0 ? '#fef2f2' : '#f8fafc', border: (summary?.lossMakingItemsCount || 0) > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: (summary?.lossMakingItemsCount || 0) > 0 ? '#b91c1c' : '#64748b' }}>
              البنود الخاسرة أو المتعثرة
            </span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: (summary?.lossMakingItemsCount || 0) > 0 ? '#dc2626' : '#1e293b', marginTop: '4px' }}>
              {summary?.lossMakingItemsCount || 0} بند
            </strong>
          </div>
        </div>

        {/* فلاتر البنود والبحث */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="ابحث عن كود أو وصف بند..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: 'var(--font-body)',
            }}
          />

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: filterStatus === 'all' ? '1px solid #170e5e' : '1px solid #cbd5e1',
                backgroundColor: filterStatus === 'all' ? '#170e5e' : '#ffffff',
                color: filterStatus === 'all' ? '#ffffff' : '#475569',
                fontSize: 'var(--font-micro)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              الكل ({summary?.itemsCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('profitable')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: filterStatus === 'profitable' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                backgroundColor: filterStatus === 'profitable' ? '#16a34a' : '#ffffff',
                color: filterStatus === 'profitable' ? '#ffffff' : '#16a34a',
                fontSize: 'var(--font-micro)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              رابحة
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('at_risk')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: filterStatus === 'at_risk' ? '1px solid #d97706' : '1px solid #cbd5e1',
                backgroundColor: filterStatus === 'at_risk' ? '#d97706' : '#ffffff',
                color: filterStatus === 'at_risk' ? '#ffffff' : '#d97706',
                fontSize: 'var(--font-micro)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              تحت الملاحظة
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('loss')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: filterStatus === 'loss' ? '1px solid #dc2626' : '1px solid #cbd5e1',
                backgroundColor: filterStatus === 'loss' ? '#dc2626' : '#ffffff',
                color: filterStatus === 'loss' ? '#ffffff' : '#dc2626',
                fontSize: 'var(--font-micro)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              خاسرة ({summary?.lossMakingItemsCount || 0})
            </button>
          </div>
        </div>

        {/* جدول ربحية البنود */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
            جارٍ تحليل ربحية بنود المقايسة ومقارنة التكاليف...
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>كود البند</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>بيان الأعمال</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الكمية</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>سعر البيع</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التكلفة التقديرية</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الربح المتوقع</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>هامش الربح %</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>حالة البند</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد بنود مطابقة
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#64748b' }}>
                        {item.itemCode}
                      </td>
                      {(() => {
                        const dir = getTextDirection(item.description);
                        const isRtl = dir === 'rtl';
                        return (
                          <td
                            dir={dir}
                            className="text-justify spec-description"
                            style={{
                              padding: '8px 10px',
                              fontSize: 'var(--font-body)',
                              fontWeight: 600,
                              color: '#1e293b',
                              textAlign: 'justify',
                              textJustify: 'inter-word',
                              textAlignLast: isRtl ? 'right' : 'left',
                              lineHeight: 1.55,
                              wordBreak: 'break-word',
                              direction: dir,
                            }}
                          >
                            {item.description}
                          </td>
                        );
                      })()}
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)' }}>
                        {item.contractQty} {item.unit}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
                        {item.unitPrice.toLocaleString()} ر.س
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', color: '#64748b' }}>
                        {item.estimatedUnitCost.toLocaleString()} ر.س
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          fontSize: 'var(--font-body)',
                          fontWeight: 700,
                          color: item.projectedProfit >= 0 ? '#047857' : '#dc2626',
                        }}
                      >
                        {item.projectedProfit.toLocaleString()} ر.س
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          fontSize: 'var(--font-body)',
                          fontWeight: 700,
                          color: item.profitMarginPercent >= 15 ? '#047857' : item.profitMarginPercent >= 0 ? '#d97706' : '#dc2626',
                        }}
                      >
                        {item.profitMarginPercent}%
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: 'var(--font-badge)',
                            fontWeight: 600,
                            backgroundColor:
                              item.status === 'profitable' ? '#dcfce7' : item.status === 'at_risk' ? '#fef3c7' : '#fee2e2',
                            color:
                              item.status === 'profitable' ? '#15803d' : item.status === 'at_risk' ? '#b45309' : '#b91c1c',
                          }}
                        >
                          {item.status === 'profitable' ? 'رابح' : item.status === 'at_risk' ? 'هامش منخفض' : 'خاسر'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
