import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { XIcon } from '@/shared/components/icons/AppIcons';
import {
  purchasesApi,
} from '@/features/purchases/api/purchases.api';

interface PurchaseLandedCostsModalProps {
  open: boolean;
  purchaseId: number | string;
  onClose: () => void;
  onApplied?: () => void;
}

export function PurchaseLandedCostsModal({
  open,
  purchaseId,
  onClose,
  onApplied,
}: PurchaseLandedCostsModalProps) {
  const { currencySymbol } = useSystemCurrency();
  const queryClient = useQueryClient();
  const [allocationMethod, setAllocationMethod] = useState<'value' | 'qty' | 'equal'>('value');
  const [notes, setNotes] = useState('');
  const [costItems, setCostItems] = useState<Array<{
    costType: 'freight' | 'customs' | 'handling' | 'insurance' | 'other';
    description: string;
    amount: number;
  }>>([
    { costType: 'freight', description: 'مصاريف شحن ونقل داخلي', amount: 0 },
  ]);
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch current landed costs
  const query = useQuery({
    queryKey: ['purchase-landed-costs', purchaseId],
    queryFn: () => purchasesApi.getLandedCosts(purchaseId),
    enabled: open && Boolean(purchaseId),
  });

  useEffect(() => {
    if (query.data) {
      if (query.data.purchase.landedCostAllocationMethod) {
        setAllocationMethod(query.data.purchase.landedCostAllocationMethod);
      }
      if (query.data.purchase.landedCostNotes) {
        setNotes(query.data.purchase.landedCostNotes);
      }
      if (query.data.costs && query.data.costs.length > 0) {
        setCostItems(query.data.costs.map((c) => ({
          costType: c.costType,
          description: c.description,
          amount: c.amount,
        })));
      }
    }
  }, [query.data]);

  const applyMutation = useMutation({
    mutationFn: (data: any) => purchasesApi.applyLandedCosts(purchaseId, data),
    onSuccess: () => {
      setStatusMessage('تم تحميل وتوزيع تكلفة الوصول على الأصناف وتحديث تكلفة المخزون بنجاح.');
      void queryClient.invalidateQueries({ queryKey: ['purchase-landed-costs', purchaseId] });
      void queryClient.invalidateQueries({ queryKey: ['purchases'] });
      if (onApplied) onApplied();
      setTimeout(() => onClose(), 1200);
    },
    onError: (err: any) => {
      setStatusMessage(err?.message || 'تعذر توزيع وتحميل التكاليف');
    },
  });

  const totalLandedCost = useMemo(() => {
    return costItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [costItems]);

  const purchaseItems = query.data?.items || [];
  const totalBaseValue = useMemo(() => {
    return purchaseItems.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
  }, [purchaseItems]);

  const totalBaseQty = useMemo(() => {
    return purchaseItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  }, [purchaseItems]);

  // Preview allocation per line
  const allocatedPreview = useMemo(() => {
    return purchaseItems.map((item) => {
      const qty = Number(item.qty || 1);
      const val = Number(item.lineTotal || 0);

      let ratio = 0;
      if (allocationMethod === 'value') {
        ratio = totalBaseValue > 0 ? val / totalBaseValue : 1 / purchaseItems.length;
      } else if (allocationMethod === 'qty') {
        ratio = totalBaseQty > 0 ? qty / totalBaseQty : 1 / purchaseItems.length;
      } else {
        ratio = 1 / (purchaseItems.length || 1);
      }

      const allocatedAmount = totalLandedCost * ratio;
      const baseUnitCost = Number(item.unitCost || 0);
      const newLandedUnitCost = baseUnitCost + (qty > 0 ? allocatedAmount / qty : 0);
      const increasePct = baseUnitCost > 0 ? ((newLandedUnitCost - baseUnitCost) / baseUnitCost) * 100 : 0;

      return {
        ...item,
        allocatedAmount,
        newLandedUnitCost,
        increasePct,
      };
    });
  }, [purchaseItems, totalLandedCost, allocationMethod, totalBaseValue, totalBaseQty]);

  const handleAddCostRow = () => {
    setCostItems((prev) => [
      ...prev,
      { costType: 'handling', description: 'مصاريف تفريغ ومشال', amount: 0 },
    ]);
  };

  const handleRemoveCostRow = (index: number) => {
    setCostItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validCosts = costItems.filter((c) => Number(c.amount) > 0 && c.description.trim());
    applyMutation.mutate({
      allocationMethod,
      notes: notes.trim(),
      costs: validCosts,
    });
  };

  if (!open) return null;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(980px, calc(100vw - 32px))"
      zIndex={95}
      ariaLabel="تحميل وتوزيع تكلفة الوصول (Landed Costs)"
    >
      <Card
        title="تحميل وتوزيع تكلفة الوصول على فاتورة المشتريات (Landed Costs Engine)"
        className="dialog-card"
        style={{
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: '16px 20px',
        }}
      >
        <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                فاتورة شراء: {query.data?.purchase?.docNo || `#${purchaseId}`} ({query.data?.purchase?.supplierName})
              </h3>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                قيمة البضاعة الأساسية: <strong style={{ color: '#0f172a' }}>{formatCurrency(query.data?.purchase?.subtotal || 0)}</strong> • {purchaseItems.length} بنود
              </span>
            </div>

            {query.data?.purchase?.landedCostAppliedAt && (
              <span style={{
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
              }}>
                تم تطبيق تكلفة وصول سابقة: {formatCurrency(query.data.purchase.landedCostTotal)}
              </span>
            )}
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              fontSize: '13px',
              fontWeight: 700,
            }}>
              {statusMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Additional Expenses Rows */}
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                  بنود المصاريف الإضافية (شحن، تفريغ، جمارك، تأمين):
                </strong>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddCostRow}
                  style={{ fontSize: '12px', padding: '3px 10px' }}
                >
                  + إضافة بند مصروف
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {costItems.map((cost, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 130px 30px', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={cost.costType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setCostItems((prev) => prev.map((c, i) => i === idx ? { ...c, costType: val } : c));
                      }}
                      style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="freight">شحن ونقل</option>
                      <option value="handling">تفريغ ومشال</option>
                      <option value="customs">جمارك ورسوم</option>
                      <option value="insurance">تأمين نقل</option>
                      <option value="other">مصاريف أخرى</option>
                    </select>

                    <input
                      type="text"
                      placeholder="البيان (مثال: نولون سيارة نقل رقم 5)"
                      value={cost.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCostItems((prev) => prev.map((c, i) => i === idx ? { ...c, description: val } : c));
                      }}
                      style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      required
                    />

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`المبلغ (${currencySymbol})`}
                      value={cost.amount || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCostItems((prev) => prev.map((c, i) => i === idx ? { ...c, amount: val } : c));
                      }}
                      style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                      required
                    />

                    <button
                      type="button"
                      disabled={costItems.length <= 1}
                      onClick={() => handleRemoveCostRow(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: costItems.length <= 1 ? '#cbd5e1' : '#dc2626',
                        cursor: costItems.length <= 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <XIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total Landed Cost Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 700 }}>
                  إجمالي المصاريف المراد تحميلها:
                </span>
                <strong style={{ fontSize: '16px', fontWeight: 900, color: '#170e5e' }}>
                  {formatCurrency(totalLandedCost)}
                </strong>
              </div>
            </div>

            {/* 2. Allocation Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>طريقة التوزيع:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'value', label: 'حسب قيمة الأصناف (الأعلى دقة)' },
                    { id: 'qty', label: 'حسب كمية الأصناف' },
                    { id: 'equal', label: 'بالتساوي على البنود' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAllocationMethod(m.id as any)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: allocationMethod === m.id ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                        background: allocationMethod === m.id ? '#170e5e' : '#ffffff',
                        color: allocationMethod === m.id ? '#ffffff' : '#475569',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="ملاحظات اختيارية على التوزيع..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* 3. Real-time Impact Preview Table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>
                  معاينة الأثر على تكلفة الوحدة لكل صنف في المخزون:
                </strong>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  سيتم تحديث تكلفة الشراء للمنتج في بطاقة الصنف آلياً
                </span>
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                      <th style={{ padding: '8px 10px', color: '#64748b' }}>الصنف</th>
                      <th style={{ padding: '8px 10px', color: '#64748b' }}>الكمية</th>
                      <th style={{ padding: '8px 10px', color: '#64748b' }}>التكلفة الأصلية للقطعة</th>
                      <th style={{ padding: '8px 10px', color: '#64748b' }}>المصروف المحمل</th>
                      <th style={{ padding: '8px 10px', color: '#64748b' }}>تكلفة القطعة الواصلة</th>
                      <th style={{ padding: '8px 10px', color: '#64748b' }}>نسبة الزيادة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocatedPreview.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{item.productName}</td>
                        <td style={{ padding: '8px 10px' }}>{item.qty} {item.unitName}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{formatCurrency(item.unitCost)}</td>
                        <td style={{ padding: '8px 10px', color: '#170e5e', fontWeight: 700 }}>+{formatCurrency(item.allocatedAmount)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#16a34a' }}>{formatCurrency(item.newLandedUnitCost)}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: item.increasePct > 0 ? '#eff6ff' : '#f8fafc',
                            color: item.increasePct > 0 ? '#1e40af' : '#64748b',
                          }}>
                            +{item.increasePct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <Button type="button" variant="secondary" onClick={onClose} disabled={applyMutation.isPending}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={applyMutation.isPending || totalLandedCost <= 0}
                style={{ background: '#170e5e', borderColor: '#170e5e', fontWeight: 800 }}
              >
                {applyMutation.isPending ? 'جارٍ التحميل والتوزيع...' : 'تطبيق وتحديث تكلفة المخزون'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </DialogShell>
  );
}
