import React from 'react';
import type { PivotResult } from '../../api/dynamic-pivot.api';

interface PivotGridTableProps {
  data: PivotResult | null;
  loading: boolean;
  rowDimensionLabel: string;
  colDimensionLabel?: string;
  metricLabel: string;
}

export const PivotGridTable: React.FC<PivotGridTableProps> = ({
  data,
  loading,
  rowDimensionLabel,
  colDimensionLabel,
  metricLabel,
}) => {
  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
        جاري تحليل وتجميع البيانات عبر الأبعاد المحددة...
      </div>
    );
  }

  if (!data || data.rowKeys.length === 0) {
    return (
      <div style={{ padding: '60px 16px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
          لا توجد بيانات مطابقة لمعايير التحليل الحالية
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          يرجى تعديل نطاق التاريخ أو تغيير مصدر البيانات للبدء في إنشاء التقرير المحوري.
        </div>
      </div>
    );
  }

  const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotal } = data;

  // Find max value in matrix for subtle heatmap scale
  let maxCellValue = 0;
  for (const r of rowKeys) {
    for (const c of colKeys) {
      const val = matrix[r.key]?.[c.key]?.value || 0;
      if (val > maxCellValue) maxCellValue = val;
    }
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12.5px',
          textAlign: 'right',
          backgroundColor: '#ffffff',
        }}
      >
        <thead>
          {/* Header Row */}
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
            <th
              style={{
                padding: '10px 14px',
                fontWeight: 700,
                color: '#170e5e',
                borderInlineEnd: '1px solid #e2e8f0',
                minWidth: '180px',
                position: 'sticky',
                right: 0,
                backgroundColor: '#f8fafc',
                zIndex: 2,
              }}
            >
              {rowDimensionLabel}
              {colDimensionLabel && (
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginInlineStart: '6px' }}>
                  \ {colDimensionLabel}
                </span>
              )}
            </th>

            {colKeys.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '10px 14px',
                  fontWeight: 600,
                  color: '#334155',
                  borderInlineEnd: '1px solid #e2e8f0',
                  minWidth: '130px',
                  textAlign: 'center',
                }}
              >
                {col.label}
              </th>
            ))}

            <th
              style={{
                padding: '10px 14px',
                fontWeight: 700,
                color: '#170e5e',
                backgroundColor: '#f1f5f9',
                minWidth: '140px',
                textAlign: 'center',
              }}
            >
              إجمالي الصف ({metricLabel})
            </th>
          </tr>
        </thead>

        <tbody>
          {rowKeys.map((r, rIdx) => {
            const rTotal = rowTotals[r.key];
            return (
              <tr
                key={r.key}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                }}
              >
                {/* Row Header */}
                <td
                  style={{
                    padding: '9px 14px',
                    fontWeight: 600,
                    color: '#0f172a',
                    borderInlineEnd: '1px solid #e2e8f0',
                    position: 'sticky',
                    right: 0,
                    backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                    zIndex: 1,
                  }}
                >
                  {r.label}
                </td>

                {/* Matrix Cells */}
                {colKeys.map((c) => {
                  const cell = matrix[r.key]?.[c.key];
                  const val = cell?.value || 0;
                  const ratio = maxCellValue > 0 ? val / maxCellValue : 0;
                  // Subtle green/blue heatmap tint for high values
                  let cellBg = 'transparent';
                  if (ratio > 0.6) {
                    cellBg = 'rgba(23, 14, 94, 0.06)';
                  } else if (ratio > 0.25) {
                    cellBg = 'rgba(23, 14, 94, 0.02)';
                  }

                  return (
                    <td
                      key={c.key}
                      style={{
                        padding: '9px 14px',
                        borderInlineEnd: '1px solid #f1f5f9',
                        textAlign: 'center',
                        backgroundColor: cellBg,
                        color: val === 0 ? '#cbd5e1' : '#1e293b',
                        fontWeight: ratio > 0.5 ? 700 : 500,
                      }}
                    >
                      {cell ? cell.formattedValue : '—'}
                    </td>
                  );
                })}

                {/* Row Subtotal */}
                <td
                  style={{
                    padding: '9px 14px',
                    fontWeight: 700,
                    color: '#170e5e',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  {rTotal ? rTotal.formattedValue : '—'}
                </td>
              </tr>
            );
          })}

          {/* Column Totals Footer Row */}
          <tr
            style={{
              backgroundColor: '#f1f5f9',
              borderTop: '2px solid #cbd5e1',
              fontWeight: 700,
            }}
          >
            <td
              style={{
                padding: '10px 14px',
                color: '#170e5e',
                borderInlineEnd: '1px solid #cbd5e1',
                position: 'sticky',
                right: 0,
                backgroundColor: '#f1f5f9',
                zIndex: 1,
              }}
            >
              إجمالي الأعمدة
            </td>

            {colKeys.map((c) => {
              const cTotal = colTotals[c.key];
              return (
                <td
                  key={c.key}
                  style={{
                    padding: '10px 14px',
                    color: '#170e5e',
                    borderInlineEnd: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  {cTotal ? cTotal.formattedValue : '—'}
                </td>
              );
            })}

            {/* Grand Total */}
            <td
              style={{
                padding: '10px 14px',
                color: '#047857',
                backgroundColor: '#ecfdf5',
                borderTop: '2px solid #10b981',
                fontSize: '13.5px',
                fontWeight: 800,
                textAlign: 'center',
              }}
            >
              {grandTotal.formattedValue}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
