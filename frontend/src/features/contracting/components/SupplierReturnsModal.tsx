import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { ContractingSupplierReturn } from '../contracting.types';

interface SupplierReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

export function SupplierReturnsModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: SupplierReturnsModalProps) {
  const [returns, setReturns] = useState<ContractingSupplierReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [supplierName, setSupplierName] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('طن');
  const [unitCost, setUnitCost] = useState<number>(0);
  const [reason, setReason] = useState('غير مطابق للمواصفات الفنية');
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReturns = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await contractingApi.getSupplierReturns(projectId);
      setReturns(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تحميل سجل مرتجعات الموردين');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      loadReturns();
      setIsAdding(false);
    }
  }, [isOpen, loadReturns]);

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) {
      setErrorMsg('يرجى كتابة اسم المادة المرتجعة');
      return;
    }
    if (!quantity || quantity <= 0) {
      setErrorMsg('يرجى تحديد كمية المرتجع بشكل صحيح');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      await contractingApi.createSupplierReturn(projectId || '', {
        supplierName: supplierName.trim() || 'مورد محلي',
        materialName: materialName.trim(),
        quantity: Number(quantity),
        unit: unit.trim() || 'وحدة',
        unitCost: Number(unitCost || 0),
        reason: reason.trim(),
        creditNoteNumber: creditNoteNumber.trim() || undefined,
      });
      setIsAdding(false);
      setSupplierName('');
      setMaterialName('');
      setQuantity(0);
      setUnitCost(0);
      setCreditNoteNumber('');
      await loadReturns();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر تسجيل إذن مرتجع المورد');
    } finally {
      setSaving(false);
    }
  };

  const totalReturnValue = returns.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="أذون مرتجع المواد للموردين وإشعارات الدائن (Supplier Returns & Credit Notes)"
      maxWidth="900px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>
              سجل الخامات المرتجعة من الموقع للموردين
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
              {projectName ? `المشروع: ${projectName}` : 'توثيق المواد المرفوضة والمسترجعة مع إصدار إشعارات الخصم المالي'}
            </div>
          </div>
          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              style={{
                height: '34px',
                padding: '0 14px',
                borderRadius: '6px',
                fontWeight: 700,
                background: '#ea580c',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-body)',
              }}
            >
              <AppIcons.Plus size={14} />
              <span>إصدار إذن مرتجع جديد</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        {/* بطاقة الإجمالي */}
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-micro)', color: '#9a3412', fontWeight: 600 }}>إجمالي قيمة المرتجعات وإشعارات الدائن</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c2410c', marginTop: '2px' }}>
              {totalReturnValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#9a3412' }}>
            عدد أذون الإرجاع: {returns.length}
          </div>
        </div>

        {/* نموذج إضافة مرتجع */}
        {isAdding && (
          <form
            onSubmit={handleCreateReturn}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
              إصدار إذن رد خامات للمورد (إشعار خصم دائن)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  اسم المورد
                </label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="مثال: شركة السويس للأسمنت"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  المادة أو الخامة المرتجعة
                </label>
                <input
                  type="text"
                  required
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="مثال: أسمنت بورتلاندي عادي"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  الوحدة
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="طن / م3 / شيكارة"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  الكمية المرتجعة
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="0.00"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  سعر الوحدة (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitCost || ''}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  placeholder="0.00"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  رقم إشعار الدائن (Credit Note)
                </label>
                <input
                  type="text"
                  value={creditNoteNumber}
                  onChange={(e) => setCreditNoteNumber(e.target.value)}
                  placeholder="مثال: CRN-2026-08"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                سبب الإرجاع وملاحظات الفحص المخبري
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: تلف وشك الأسمنت بسبب الرطوبة أو رسوب اختبار الشد للحديد"
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 'var(--font-body)' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ height: '32px', padding: '0 14px', borderRadius: '6px', border: 'none', background: '#ea580c', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--font-body)' }}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ إذن المرتجع'}
              </button>
            </div>
          </form>
        )}

        {/* جدول المرتجعات */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جاري تحميل أذون المرتجع...</div>
          ) : returns.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>لا توجد أذون مرتجع مواد مسجلة لهذا المشروع</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>رقم الإذن</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المورد</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الخامة / المادة</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الكمية والوحدة</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>إجمالي المبلغ</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>سبب الإرجاع</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>إشعار الدائن</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                      {r.returnNumber}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
                      {r.supplierName}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#170e5e', fontWeight: 600 }}>
                      {r.materialName}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#334155' }}>
                      {Number(r.quantity).toLocaleString('en-US')} {r.unit}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#c2410c' }}>
                      {Number(r.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#475569', maxWidth: '200px' }}>
                      {r.reason}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#0369a1', fontWeight: 600 }}>
                      {r.creditNoteNumber || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                      {r.returnDate ? new Date(r.returnDate).toLocaleDateString('ar-EG') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </StandardDialog>
  );
}