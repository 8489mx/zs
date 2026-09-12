import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { ContractingBoqItem, ContractingBoqTakeoff } from '../contracting.types';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface BoqTakeoffSheetModalProps {
  open: boolean;
  boqItem: ContractingBoqItem;
  projectName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BoqTakeoffSheetModal({
  open,
  boqItem,
  projectName = '',
  onClose,
  onSuccess,
}: BoqTakeoffSheetModalProps) {
  const { formatCurrency } = useSystemCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncToBoq, setSyncToBoq] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [takeoffs, setTakeoffs] = useState<ContractingBoqTakeoff[]>([
    {
      drawingRef: '',
      axisRef: '',
      description: 'حصر أولي للعنصر',
      length: 1,
      width: 1,
      height: 1,
      countMultiplier: 1,
      voidDeduction: 0,
      netQty: 1,
      wastePercent: 0,
      totalWithWaste: 1,
    },
  ]);

  useEffect(() => {
    if (!open || !boqItem?.id) return;
    setLoading(true);
    setErrorMsg(null);

    contractingApi
      .getBoqTakeoffs(String(boqItem.id))
      .then((data) => {
        if (data && data.length > 0) {
          setTakeoffs(data);
        } else {
          // Initialize with 1 default row
          setTakeoffs([
            {
              drawingRef: 'DWG-01',
              axisRef: 'A-D / 1-4',
              description: `حصر كمية [${boqItem.description.slice(0, 30)}]`,
              length: 1,
              width: 1,
              height: 1,
              countMultiplier: 1,
              voidDeduction: 0,
              netQty: 1,
              wastePercent: 0,
              totalWithWaste: 1,
            },
          ]);
        }
      })
      .catch((err) => {
        console.error('Failed to load takeoffs:', err);
        setErrorMsg('تعذر تحميل بيانات شيت الحصر');
      })
      .finally(() => setLoading(false));
  }, [open, boqItem?.id]);

  const handleRowChange = (index: number, field: keyof ContractingBoqTakeoff, val: any) => {
    setTakeoffs((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: val };

      const len = Number(field === 'length' ? val : row.length || 0);
      const wid = Number(field === 'width' ? val : row.width || 1);
      const hgt = Number(field === 'height' ? val : row.height || 1);
      const count = Number(field === 'countMultiplier' ? val : row.countMultiplier || 1);
      const voidDed = Number(field === 'voidDeduction' ? val : row.voidDeduction || 0);
      const waste = Number(field === 'wastePercent' ? val : row.wastePercent || 0);

      const baseVolume = len * wid * hgt * count;
      const net = Math.max(0, baseVolume - voidDed);
      const total = net * (1 + waste / 100);

      row.netQty = Math.round((net + Number.EPSILON) * 1000) / 1000;
      row.totalWithWaste = Math.round((total + Number.EPSILON) * 1000) / 1000;

      updated[index] = row;
      return updated;
    });
  };

  const handleAddRow = () => {
    setTakeoffs((prev) => [
      ...prev,
      {
        drawingRef: prev[prev.length - 1]?.drawingRef || 'DWG-01',
        axisRef: '',
        description: 'جزء إضافي',
        length: 1,
        width: 1,
        height: 1,
        countMultiplier: 1,
        voidDeduction: 0,
        netQty: 1,
        wastePercent: 0,
        totalWithWaste: 1,
      },
    ]);
  };

  const handleDuplicateRow = (index: number) => {
    setTakeoffs((prev) => {
      const target = prev[index];
      const cloned = { ...target, id: undefined, description: `${target.description} (نسخة)` };
      const next = [...prev];
      next.splice(index + 1, 0, cloned);
      return next;
    });
  };

  const handleRemoveRow = (index: number) => {
    if (takeoffs.length <= 1) return;
    setTakeoffs((prev) => prev.filter((_, i) => i !== index));
  };

  const totalCalculated = takeoffs.reduce((sum, t) => sum + (Number(t.totalWithWaste) || 0), 0);
  const roundedTotalCalculated = Math.round((totalCalculated + Number.EPSILON) * 1000) / 1000;

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await contractingApi.saveBoqTakeoffs(String(boqItem.id), {
        takeoffs,
        syncToBoqQuantity: syncToBoq,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save takeoff sheet:', err);
      setErrorMsg(err?.message || 'تعذر حفظ شيت الحصر');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StandardDialog
      isOpen={open}
      onClose={onClose}
      title={`شيت حصر الكميات الهندسي من لوحات الكاد (CAD Quantity Takeoff)`}
      subtitle={`بند: [${boqItem.itemCode}] ${boqItem.description.slice(0, 60)} | الوحدة: ${boqItem.unit} | المشروع: ${projectName}`}
      width="min(1100px, 95vw)"
      minHeight="min(600px, 85vh)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-subtitle)', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={syncToBoq}
                onChange={(e) => setSyncToBoq(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#170e5e', cursor: 'pointer' }}
              />
              <span>تحديث وتثبيت الكمية التعاقدية في المقايسة تلقائياً ({roundedTotalCalculated} {boqItem.unit})</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
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
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontSize: 'var(--font-body)',
                fontWeight: 700,
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ واعتماد شيت الحصر'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }} dir="rtl">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 'var(--font-body)', color: '#64748b' }}>
              جارٍ تحميل شيت الحصر الهندسي للبند من لوحات الكاد...
            </span>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--font-body)', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            {/* Header Summary KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>الكمية الحالية في المقايسة</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
              {Number(boqItem.contractQty || 0).toLocaleString()} {boqItem.unit}
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#4338ca', fontWeight: 600 }}>إجمالي حصر الكاد المحسوب</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {roundedTotalCalculated.toLocaleString()} {boqItem.unit}
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>عدد سطور/أجزاء الحصر</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {takeoffs.length} سطر حصر
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#065f46', fontWeight: 600 }}>سعر الفئة التعاقدي</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
              {formatCurrency(boqItem.unitPrice)}
            </div>
          </div>
        </div>

        {/* Takeoff Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff', minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowX: 'auto', minHeight: '280px', maxHeight: '420px', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-subtitle)' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#475569', fontWeight: 600, width: '35px' }}>م</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', color: '#475569', fontWeight: 600, width: '110px' }}>رقم اللوحة</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', color: '#475569', fontWeight: 600, width: '100px' }}>المحاور</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>بيان الجزء المحصور</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#475569', fontWeight: 600, width: '70px' }}>الطول (م)</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#475569', fontWeight: 600, width: '70px' }}>العرض (م)</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#475569', fontWeight: 600, width: '70px' }}>الارتفاع (م)</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#475569', fontWeight: 600, width: '60px' }}>العدد</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#475569', fontWeight: 600, width: '70px' }}>فراغات (-)</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#475569', fontWeight: 600, width: '65px' }}>الهالك %</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center', color: '#170e5e', fontWeight: 700, width: '90px' }}>الإجمالي</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#475569', fontWeight: 600, width: '70px' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {takeoffs.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#64748b', fontSize: 'var(--font-micro)' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 6px' }}>
                      <input
                        type="text"
                        value={row.drawingRef}
                        placeholder="DWG-01"
                        onChange={(e) => handleRowChange(idx, 'drawingRef', e.target.value)}
                        style={{ width: '100%', padding: '4px 6px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input
                        type="text"
                        value={row.axisRef}
                        placeholder="A-B / 1-3"
                        onChange={(e) => handleRowChange(idx, 'axisRef', e.target.value)}
                        style={{ width: '100%', padding: '4px 6px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input
                        type="text"
                        value={row.description}
                        placeholder="وصف وتحديد الجزء"
                        onChange={(e) => handleRowChange(idx, 'description', e.target.value)}
                        style={{ width: '100%', padding: '4px 6px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="any"
                        value={row.length}
                        onChange={(e) => handleRowChange(idx, 'length', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '4px 4px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)', textAlign: 'center', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="any"
                        value={row.width}
                        onChange={(e) => handleRowChange(idx, 'width', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '4px 4px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)', textAlign: 'center', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="any"
                        value={row.height}
                        onChange={(e) => handleRowChange(idx, 'height', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '4px 4px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)', textAlign: 'center', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={row.countMultiplier}
                        onChange={(e) => handleRowChange(idx, 'countMultiplier', parseFloat(e.target.value) || 1)}
                        style={{ width: '100%', padding: '4px 4px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)', textAlign: 'center', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.voidDeduction}
                        onChange={(e) => handleRowChange(idx, 'voidDeduction', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '4px 4px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)', textAlign: 'center', fontWeight: 600, color: row.voidDeduction > 0 ? '#b91c1c' : '#334155' }}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.wastePercent}
                        onChange={(e) => handleRowChange(idx, 'wastePercent', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '4px 4px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)', textAlign: 'center', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 800, color: '#170e5e', fontSize: 'var(--font-micro)', whiteSpace: 'nowrap' }}>
                      {row.totalWithWaste} {boqItem.unit}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          title="تكرار السطر"
                          onClick={() => handleDuplicateRow(idx)}
                          style={{ border: 'none', background: '#f1f5f9', color: '#170e5e', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer' }}
                        >
                          <AppIcons.Copy size={11} />
                        </button>
                        <button
                          type="button"
                          title="حذف السطر"
                          disabled={takeoffs.length <= 1}
                          onClick={() => handleRemoveRow(idx)}
                          style={{ border: 'none', background: '#fef2f2', color: '#b91c1c', borderRadius: '4px', padding: '3px 6px', cursor: takeoffs.length <= 1 ? 'not-allowed' : 'pointer' }}
                        >
                          <AppIcons.Trash size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Action Bar */}
          <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleAddRow}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #170e5e',
                color: '#170e5e',
                fontSize: 'var(--font-micro)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <AppIcons.Plus size={13} />
              <span>إضافة سطر حصر جديد</span>
            </button>

            <div style={{ fontSize: 'var(--font-body)', fontWeight: 800, color: '#170e5e' }}>
              إجمالي الحصر الهندسي للبند: {roundedTotalCalculated.toLocaleString()} {boqItem.unit}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </StandardDialog>
  );
}
