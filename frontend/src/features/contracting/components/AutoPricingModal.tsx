import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { contractingApi } from '../api/contracting.api';
import { ContractingEngineeringConstant, AutoPriceBoqResult, ContractingBoqItem } from '../contracting.types';

interface AutoPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrice?: (unitPrice: number, estimatedCost: number, targetItemId?: string) => Promise<void> | void;
  initialQuantity?: number;
  initialCode?: string;
  currencySymbol?: string;
  boqItems?: ContractingBoqItem[];
  selectedBoqItemId?: string;
}

export function AutoPricingModal({
  isOpen,
  onClose,
  onApplyPrice,
  initialQuantity = 100,
  initialCode = '',
  currencySymbol = 'ج.م',
  boqItems = [],
  selectedBoqItemId = '',
}: AutoPricingModalProps) {
  const [constants, setConstants] = useState<ContractingEngineeringConstant[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [applying, setApplying] = useState(false);

  const [targetItemId, setTargetItemId] = useState<string>(selectedBoqItemId);
  const [selectedConstantCode, setSelectedConstantCode] = useState(initialCode);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [wastePercent, setWastePercent] = useState<number>(5);
  const [overheadPercent, setOverheadPercent] = useState<number>(7);
  const [markupPercent, setMarkupPercent] = useState<number>(15);

  const [result, setResult] = useState<AutoPriceBoqResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial item selection
  useEffect(() => {
    if (selectedBoqItemId) {
      setTargetItemId(selectedBoqItemId);
    } else if (boqItems.length > 0) {
      const firstValid = boqItems.find((i) => !i.isSectionHeader);
      if (firstValid) setTargetItemId(String(firstValid.id));
    }
  }, [selectedBoqItemId, boqItems]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setErrorMsg(null);
    contractingApi
      .getEngineeringConstants()
      .then((data) => {
        setConstants(data);
        if (data.length > 0) {
          const match = data.find((c) => c.itemCode === initialCode) || data[0];
          setSelectedConstantCode(match.itemCode);
          setWastePercent(Number(match.wastePercent || 5));
          setOverheadPercent(Number(match.overheadPercent || 7));
          setMarkupPercent(Number(match.profitMarkupPercent || 15));
        }
      })
      .catch((err) => {
        console.error('Failed to load engineering constants:', err);
        setErrorMsg('تعذر تحميل الثوابت الهندسية');
      })
      .finally(() => setLoading(false));
  }, [isOpen, initialCode]);

  const handleCalculate = async () => {
    if (!selectedConstantCode) return;
    setCalculating(true);
    setErrorMsg(null);
    try {
      const res = await contractingApi.autoPriceBoqItem({
        constantCode: selectedConstantCode,
        quantity: Number(quantity) || 1,
        customWastePercent: Number(wastePercent),
        customOverheadPercent: Number(overheadPercent),
        customProfitMarkupPercent: Number(markupPercent),
      });
      setResult(res);
    } catch (err: any) {
      console.error('Failed to calculate auto pricing:', err);
      setErrorMsg(err?.message || 'تعذر حساب التسعير التلقائي');
    } finally {
      setCalculating(false);
    }
  };

  const handleApply = async () => {
    if (result && onApplyPrice) {
      setApplying(true);
      try {
        await onApplyPrice(result.suggestedUnitPrice, result.unitDirectCost, targetItemId);
        onClose();
      } catch (err: any) {
        setErrorMsg(err?.message || 'تعذر اعتماد السعر على البند');
      } finally {
        setApplying(false);
      }
    }
  };

  const currSymbol = currencySymbol || 'ج.م';

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="محرك التسعير التلقائي الذكي للبند (Engineering Pricing Engine)"
      subtitle="تسعير دقيق بضغطة زر بناءً على مكونات البند وثوابت الاستهلاك الهندسية وأسعار السوق"
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 'var(--font-body)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCalculate}
              disabled={calculating || loading}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #170e5e',
                backgroundColor: '#ffffff',
                color: '#170e5e',
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {calculating ? 'جارٍ الحساب...' : 'إعادة الحساب الآن'}
            </button>
            {onApplyPrice && (
              <button
                type="button"
                onClick={handleApply}
                disabled={!result || applying}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: result && !applying ? '#170e5e' : '#94a3b8',
                  color: '#ffffff',
                  fontSize: 'var(--font-body)',
                  fontWeight: 600,
                  cursor: result && !applying ? 'pointer' : 'not-allowed',
                }}
              >
                {applying ? 'جارٍ الاعتماد والتحديث...' : 'اعتماد وتطبيق السعر على البند'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        {/* اختيار البند المستهدف في المقايسة إذا وُجدت بنود */}
        {boqItems.length > 0 && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>
              البند المستهدف في المقايسة للتسعير والاعتماد:
            </label>
            <select
              value={targetItemId}
              onChange={(e) => {
                const newId = e.target.value;
                setTargetItemId(newId);
                const found = boqItems.find((i) => String(i.id) === newId);
                if (found) {
                  setQuantity(found.contractQty || 1);
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #0284c7',
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                color: '#0c4a6e',
              }}
            >
              {boqItems
                .filter((i) => !i.isSectionHeader)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.itemCode || `بند ${item.id}`}] {item.description.slice(0, 60)} ({item.contractQty} {item.unit}) - السعر الحالي: {item.unitPrice || 0} {currSymbol}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* اختيارات المعادلة والكمية */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              المعادلة الهندسية المرجعية
            </label>
            <select
              value={selectedConstantCode}
              onChange={(e) => {
                setSelectedConstantCode(e.target.value);
                const match = constants.find((c) => c.itemCode === e.target.value);
                if (match) {
                  setWastePercent(Number(match.wastePercent || 5));
                  setOverheadPercent(Number(match.overheadPercent || 7));
                  setMarkupPercent(Number(match.profitMarkupPercent || 15));
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: 'var(--font-body)',
                backgroundColor: '#ffffff',
              }}
            >
              {constants.map((c) => (
                <option key={c.id} value={c.itemCode}>
                  [{c.itemCode}] {c.itemName} ({c.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              الكمية الإجمالية للبند
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={0.1}
              step={0.1}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: 'var(--font-body)',
              }}
            />
          </div>
        </div>

        {/* نسب الأمان والتكاليف الإضافية */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              نسبة الهالك المعياري %
            </label>
            <input
              type="number"
              value={wastePercent}
              onChange={(e) => setWastePercent(Number(e.target.value))}
              min={0}
              max={50}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: 'var(--font-body)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              المصاريف غير المباشرة %
            </label>
            <input
              type="number"
              value={overheadPercent}
              onChange={(e) => setOverheadPercent(Number(e.target.value))}
              min={0}
              max={50}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: 'var(--font-body)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              هامش الربح المستهدف %
            </label>
            <input
              type="number"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(Number(e.target.value))}
              min={0}
              max={100}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: 'var(--font-body)',
              }}
            />
          </div>
        </div>

        {/* نتيجة التسعير الآلي */}
        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* بطاقات النتائج الإجمالية */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#64748b' }}>التكلفة المباشرة للوحدة</span>
                <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{result.unitDirectCost.toLocaleString()} {currSymbol}</strong>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe' }}>
                <span style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#4338ca' }}>سعر البيع المقترح للوحدة</span>
                <strong style={{ fontSize: '1.1rem', color: '#170e5e' }}>{result.suggestedUnitPrice.toLocaleString()} {currSymbol}</strong>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#64748b' }}>إجمالي القيمة التعاقدية</span>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{result.totalPrice.toLocaleString()} {currSymbol}</strong>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <span style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#065f46' }}>صافي الربح المتوقع</span>
                <strong style={{ fontSize: '1rem', color: '#047857' }}>{result.projectedProfit.toLocaleString()} {currSymbol}</strong>
              </div>
            </div>

            {/* تفكيك مكونات التكلفة */}
            <div>
              <h4 style={{ fontSize: 'var(--font-subtitle)', fontWeight: 600, color: '#334155', margin: '8px 0 6px' }}>
                تفكيك عناصر التكلفة القياسية للبند:
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المكون / الخامة</th>
                      <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الكمية لكل وحدة</th>
                      <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>سعر السوق للوحدة</th>
                      <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التكلفة في الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.map((b, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < result.breakdown.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '8px 12px', fontSize: 'var(--font-body)', fontWeight: 500, color: '#1e293b' }}>{b.name}</td>
                        <td style={{ padding: '8px 12px', fontSize: 'var(--font-body)', color: '#475569' }}>{b.qtyPerUnit} {b.unit}</td>
                        <td style={{ padding: '8px 12px', fontSize: 'var(--font-body)', color: '#475569' }}>{b.unitRate.toLocaleString()} {currSymbol}</td>
                        <td style={{ padding: '8px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>{b.componentCost.toLocaleString()} {currSymbol}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: 0, fontSize: 'var(--font-body)', color: '#64748b' }}>
              اضغط على زر <strong>إعادة الحساب الآن</strong> لتوليد تفكيك التكلفة وسعر البيع المقترح فوراً.
            </p>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}

