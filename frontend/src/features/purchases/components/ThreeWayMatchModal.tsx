import React, { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { goodsReceiptsApi, type ThreeWayMatchResult } from '../api/goods-receipts.api';
import { toast } from '@/shared/components/system-alert';
import { formatCurrency } from '@/lib/format';

interface ThreeWayMatchModalProps {
  open: boolean;
  onClose: () => void;
  purchaseId: number;
  docNo?: string | null;
  onSuccess?: () => void;
}

export const ThreeWayMatchModal: React.FC<ThreeWayMatchModalProps> = ({
  open,
  onClose,
  purchaseId,
  docNo,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [matchData, setMatchData] = useState<ThreeWayMatchResult | null>(null);
  const [managerOverride, setManagerOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && purchaseId) {
      setIsLoading(true);
      setManagerOverride(false);
      setOverrideReason('');
      goodsReceiptsApi
        .verifyThreeWayMatch(purchaseId)
        .then((data) => {
          setMatchData(data);
        })
        .catch((err) => {
          toast.error(err?.message || 'فشل تحميل بيانات المطابقة الثلاثية');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, purchaseId]);

  if (!open) return null;

  const handleConfirmMatch = async () => {
    try {
      setIsSubmitting(true);
      if (matchData?.matchResult?.requiresApproval && !managerOverride) {
        toast.warning('يتطلب هذا الفحص اعتماد المدير المالي لتجاوز التسامح السعري.');
        setIsSubmitting(false);
        return;
      }
      if (managerOverride && !overrideReason.trim()) {
        toast.warning('يرجى كتابة سبب ومبرر اعتماد التجاوز.');
        setIsSubmitting(false);
        return;
      }

      await goodsReceiptsApi.verifyThreeWayMatch(purchaseId, {
        managerOverride,
        overrideReason: overrideReason.trim() || undefined,
      });

      toast.success('تم فحص واعتماد المطابقة الثلاثية بنجاح.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'فشل اعتماد المطابقة الثلاثية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const result = matchData?.matchResult;
  const isMatched = result?.matched;
  const isToleranceExceeded = result?.overallStatus === 'tolerance_exceeded';

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`فحص واعتماد المطابقة الثلاثية — الفاتورة #${docNo || purchaseId}`}
      subtitle="مطابقة أمر الشراء (PO) مع أذون الاستلام (GRN) وفاتورة المورد وتسوية وسيط التوريد (GRNI)"
      maxWidth="min(1080px, 96vw)"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          cancelLabel="إغلاق"
          onSubmit={handleConfirmMatch}
          submitLabel={
            isSubmitting
              ? 'جاري التحقق...'
              : isMatched || (managerOverride && overrideReason.trim())
              ? 'تأكيد واعتماد المطابقة الثلاثية'
              : 'إغلاق ومراجعة الفروقات'
          }
          isSubmitting={isSubmitting}
        />
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        {isLoading ? (
          <div
            style={{
              minHeight: '280px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '13px',
            }}
          >
            جاري فحص ومطابقة بيانات الفاتورة مع أذون الاستلام المخزني وأمر الشراء...
          </div>
        ) : !result ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#dc2626' }}>
            تعذر تحميل بيانات المطابقة الثلاثية لهذه الفاتورة.
          </div>
        ) : (
          <>
            {/* Status Alert Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isMatched ? '#f0fdf4' : isToleranceExceeded ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${isMatched ? '#86efac' : isToleranceExceeded ? '#fcd34d' : '#fca5a5'}`,
              }}
            >
              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: isMatched ? '#166534' : isToleranceExceeded ? '#92400e' : '#991b1b',
                  }}
                >
                  {isMatched
                    ? 'المطابقة الثلاثية مكتملة وناجحة 100%'
                    : isToleranceExceeded
                    ? 'تنبيه: تجاوز نسبة التسامح السعري المسموح بها'
                    : 'خطأ رقابي: عدم تطابق في كميات الاستلام أو الفوترة'}
                </strong>
                <span
                  style={{
                    fontSize: '11.5px',
                    color: isMatched ? '#15803d' : isToleranceExceeded ? '#b45309' : '#b91c1c',
                  }}
                >
                  {isMatched
                    ? 'كافة الكميات المفوترة مطابقة للمقبول في إذن الاستلام، والأسعار ضمن سقف التسامح المقبول.'
                    : isToleranceExceeded
                    ? 'أسعار الفاتورة تختلف عن سعر أمر الشراء بما يتجاوز حد التسامح (2%)، يلزم موافقة المدير المالي.'
                    : 'الكمية المفوترة تتجاوز الكميات المقبولة في إذن الاستلام المخزني (GRN)، لا يمكن ترحيل الفاتورة.'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backgroundColor: isMatched ? '#dcfce7' : isToleranceExceeded ? '#fef3c7' : '#fee2e2',
                  color: isMatched ? '#166534' : isToleranceExceeded ? '#92400e' : '#991b1b',
                }}
              >
                {result.overallStatus}
              </span>
            </div>

            {/* Comparison Table */}
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                overflow: 'hidden',
                maxHeight: '260px',
                overflowY: 'auto',
              }}
              className="thin-scrollbar"
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  textAlign: 'right',
                }}
              >
                <thead
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #cbd5e1',
                    color: '#475569',
                    fontWeight: 700,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th style={{ padding: '8px 10px' }}>الصنف</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>مطلوب PO</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>مقبول GRN</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>مفوتر Invoice</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>سعر PO</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>سعر الفاتورة</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>فرق السعر (PPV)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((line, idx) => (
                    <tr
                      key={line.productId || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                        {line.productName || `الصنف #${line.productId}`}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>
                        {line.orderedQty}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#166534' }}>
                        {line.grnAcceptedQty}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: line.invoicedQty > line.grnAcceptedQty ? '#dc2626' : '#0f172a',
                        }}
                      >
                        {line.invoicedQty}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>
                        {formatCurrency(line.poUnitPrice)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>
                        {formatCurrency(line.invoicedUnitPrice)}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color:
                            line.priceVarianceAmount === 0
                              ? '#64748b'
                              : line.priceVarianceAmount > 0
                              ? '#dc2626'
                              : '#166534',
                        }}
                      >
                        {line.priceVariancePercent !== 0 ? `${line.priceVariancePercent > 0 ? '+' : ''}${line.priceVariancePercent}% (${formatCurrency(line.priceVarianceAmount)})` : '0.00%'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor:
                              line.status === 'matched'
                                ? '#dcfce7'
                                : line.status === 'tolerance_exceeded'
                                ? '#fef3c7'
                                : '#fee2e2',
                            color:
                              line.status === 'matched'
                                ? '#166534'
                                : line.status === 'tolerance_exceeded'
                                ? '#92400e'
                                : '#991b1b',
                          }}
                        >
                          {line.status === 'matched'
                            ? 'مطابق'
                            : line.status === 'tolerance_exceeded'
                            ? 'تجاوز تسامح'
                            : 'اختلاف كمية'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Ledger Settlement Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <h5 style={{ margin: '0 0 10px 0', fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
                أثر تسوية القيد المحاسبي والمطابقة (Double-Entry Ledger Balancing)
              </h5>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '10px',
                  fontSize: '12px',
                }}
              >
                <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>تسوية وسيط التوريد (GRNI)</span>
                  <strong style={{ color: '#0369a1' }}>Dr. {formatCurrency(result.financialSummary.totalGrniAmount)}</strong>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>فروق أسعار الشراء (PPV)</span>
                  <strong style={{ color: result.financialSummary.totalPpvVariance >= 0 ? '#b91c1c' : '#166534' }}>
                    {result.financialSummary.totalPpvVariance >= 0 ? 'Dr. ' : 'Cr. '}
                    {formatCurrency(Math.abs(result.financialSummary.totalPpvVariance))}
                  </strong>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>ضريبة القيمة المضافة (VAT)</span>
                  <strong style={{ color: '#475569' }}>Dr. {formatCurrency(result.financialSummary.totalVatAmount)}</strong>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>استحقاق الموردين (AP)</span>
                  <strong style={{ color: '#166534' }}>Cr. {formatCurrency(result.financialSummary.totalApAmount)}</strong>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>الفارق المحاسبي (Discrepancy)</span>
                  <strong style={{ color: result.financialSummary.discrepancy === 0 ? '#166534' : '#dc2626' }}>
                    {formatCurrency(result.financialSummary.discrepancy)} ج.م
                  </strong>
                </div>
              </div>
            </div>

            {/* Manager Override Section if needed */}
            {(isToleranceExceeded || result.requiresApproval) && (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#92400e',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={managerOverride}
                    onChange={(e) => setManagerOverride(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>اعتماد استثنائي بصلاحية المدير المالي لتجاوز نسبة التسامح السعري</span>
                </label>
                {managerOverride && (
                  <input
                    type="text"
                    placeholder="اكتب سبب ومبرر اعتماد التجاوز السعري (إلزامي)..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </StandardDialog>
  );
};
