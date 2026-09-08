import React from 'react';
import { ScanAuditResponse } from '../../api/warehouse-bins.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface BinBarcodeAuditPanelProps {
  scanQuery: string;
  onScanQueryChange: (q: string) => void;
  onScanSubmit: (e?: React.FormEvent) => void;
  scanning: boolean;
  auditFeedback: { text: string; error?: boolean } | null;
  auditResult: ScanAuditResponse | null;
  auditInputs: Record<number, number>;
  onAuditInputChange: (productId: number, val: number) => void;
  onSaveAuditItem: (productId: number) => void;
}

export const BinBarcodeAuditPanel: React.FC<BinBarcodeAuditPanelProps> = ({
  scanQuery,
  onScanQueryChange,
  onScanSubmit,
  scanning,
  auditFeedback,
  auditResult,
  auditInputs,
  onAuditInputChange,
  onSaveAuditItem,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Scanner Input Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <form onSubmit={onScanSubmit}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
            امسح باركود الرف أو باركود الصنف (Scan Barcode)
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={scanQuery}
                onChange={(e) => onScanQueryChange(e.target.value)}
                placeholder="امسح باركود الرف (مثل BIN-1-A01) أو باركود الصنف..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid #170e5e',
                  fontSize: '15px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={scanning || !scanQuery.trim()}
              style={{
                padding: '12px 28px',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AppIcons.Barcode size={18} />
              {scanning ? 'جاري الفحص...' : 'فحص وجرد (Scan)'}
            </button>
          </div>
        </form>

        {auditFeedback && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: auditFeedback.error ? '#fef2f2' : '#f0fdf4',
              color: auditFeedback.error ? '#991b1b' : '#166534',
              border: `1px solid ${auditFeedback.error ? '#fecaca' : '#bbf7d0'}`,
            }}
          >
            {auditFeedback.text}
          </div>
        )}
      </div>

      {/* Scan Result Display */}
      {auditResult && auditResult.type === 'bin' && auditResult.bin && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>مكان التخزين المفحوص</span>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#170e5e', margin: '4px 0 0 0' }}>
                {auditResult.bin.code}
              </h2>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                المستودع: <strong>{auditResult.bin.locationName}</strong> | الممر: <strong>{auditResult.bin.aisle || '-'}</strong> | الحامل: <strong>{auditResult.bin.rack || '-'}</strong> | المستوى: <strong>{auditResult.bin.shelf || '-'}</strong>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontWeight: 800,
                  fontSize: '12px',
                }}
              >
                باركود الرف: {auditResult.bin.barcode}
              </span>
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            الأصناف المتواجدة بهذا الرف حالياً ({auditResult.items?.length || 0} صنف)
          </h4>

          {(!auditResult.items || auditResult.items.length === 0) ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              هذا الرف فارغ ولا توجد به أصناف مسجلة حالياً.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'right' }}>
                    <th style={{ padding: '10px' }}>اسم الصنف</th>
                    <th style={{ padding: '10px' }}>الباركود</th>
                    <th style={{ padding: '10px' }}>الكمية المسجلة</th>
                    <th style={{ padding: '10px', width: '140px' }}>الكمية الفعلية (الجرد)</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>فارق الجرد</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>تحديث</th>
                  </tr>
                </thead>
                <tbody>
                  {auditResult.items.map((item) => {
                    const countedVal = auditInputs[item.productId] ?? item.quantity;
                    const variance = countedVal - item.quantity;
                    return (
                      <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#1e293b' }}>
                          {item.productName}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                          {item.productBarcode || '-'}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#334155' }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <input
                            type="number"
                            step="1"
                            value={countedVal}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onAuditInputChange(item.productId, val);
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontWeight: 700,
                              fontSize: '13px',
                              textAlign: 'center',
                              outline: 'none',
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {variance === 0 ? (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 700, fontSize: '11px' }}>
                              مطابق (0)
                            </span>
                          ) : variance > 0 ? (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '11px' }}>
                              زيادة (+{variance})
                            </span>
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '11px' }}>
                              عجز ({variance})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => onSaveAuditItem(item.productId)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#170e5e',
                              color: '#ffffff',
                              border: 'none',
                              fontWeight: 700,
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            حفظ الرصيد
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* If product was scanned */}
      {auditResult && auditResult.type === 'product' && auditResult.product && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>نتيجة فحص الصنف</span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#170e5e', margin: '4px 0 0 0' }}>
              {auditResult.product.name}
            </h2>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
              الباركود: <strong>{auditResult.product.barcode}</strong> | إجمالي المخزون الكلي: <strong>{auditResult.product.stockQty}</strong>
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            الأرفف وأماكن التخزين المسجل بها هذا الصنف:
          </h4>

          {(!auditResult.allocatedBins || auditResult.allocatedBins.length === 0) ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              هذا الصنف غير مربوط بأي رف محدد في المستودعات حتى الآن.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {auditResult.allocatedBins.map((b) => (
                <div
                  key={b.binId}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: '#170e5e' }}>{b.binCode}</strong>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{b.locationName}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
                    الممر: {b.aisle || '-'} | الحامل: {b.rack || '-'} | المستوى: {b.shelf || '-'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', marginTop: '6px' }}>
                    الكمية في هذا الرف: {b.quantity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
