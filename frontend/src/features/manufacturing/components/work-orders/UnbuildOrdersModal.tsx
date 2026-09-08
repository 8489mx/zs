import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { workOrdersApi } from '@/features/manufacturing/api/work-orders.api';
import { systemAlert } from '@/shared/components/system-alert';

interface UnbuildOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  boms: any[];
  unbuildOrders: any[];
  onReloadUnbuild: () => void;
}

export function UnbuildOrdersModal({
  isOpen,
  onClose,
  boms,
  unbuildOrders,
  onReloadUnbuild,
}: UnbuildOrdersModalProps) {
  const [selectedBomId, setSelectedBomId] = React.useState<number>(0);
  const [unbuildQty, setUnbuildQty] = React.useState<number>(1);
  const [unbuildNotes, setUnbuildNotes] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen) return null;

  const handleCreateUnbuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBomId || unbuildQty <= 0) {
      systemAlert('يرجى اختيار شجرة المنتج وتحديد كمية صالحة للتفكيك');
      return;
    }
    setIsSubmitting(true);
    const selectedBom = boms.find((b) => b.id === selectedBomId);
    try {
      await workOrdersApi.createUnbuild({
        productId: selectedBom?.product_id || selectedBom?.productId || 0,
        bomId: selectedBomId,
        quantity: unbuildQty,
        notes: unbuildNotes,
      });
      setSelectedBomId(0);
      setUnbuildQty(1);
      setUnbuildNotes('');
      onReloadUnbuild();
      systemAlert('تم إنشاء وتأكيد أمر التفكيك واسترجاع المواد الخام للمخزن بنجاح!');
    } catch (err: any) {
      systemAlert(err?.message || 'فشل تنفيذ أمر التفكيك');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogShell open={true} onClose={onClose} width="min(800px, 96vw)" ariaLabel="أوامر التفكيك">
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">أوامر التفكيك وإرجاع المواد الخام (Unbuild Orders)</h3>
            <p className="standard-dialog-subtitle">تفكيك المنتجات التامة واسترجاع مكوناتها الأصلية إلى أرصدة المخزون</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Create Unbuild Form */}
          <form onSubmit={handleCreateUnbuild} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '10px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                شجرة المنتج التام المراد تفكيكه (BOM) *
              </label>
              <select
                required
                value={selectedBomId}
                onChange={(e) => setSelectedBomId(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value={0}>-- اختر شجرة المنتج --</option>
                {boms.map((b) => (
                  <option key={b.id} value={b.id}>{b.product_name} ({b.name || b.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                الكمية للتفكيك *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={unbuildQty}
                onChange={(e) => setUnbuildQty(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                ملاحظات أو سبب التفكيك
              </label>
              <input
                type="text"
                placeholder="تالف، إعادة استخدام..."
                value={unbuildNotes}
                onChange={(e) => setUnbuildNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>

            <div>
              <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '12px', padding: '8px 16px' }}>
                {isSubmitting ? 'جاري...' : 'تنفيذ التفكيك'}
              </Button>
            </div>
          </form>

          {/* List of past unbuild orders */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 12px' }}>رقم الأمر</th>
                  <th style={{ padding: '8px 12px' }}>المنتج المفكك</th>
                  <th style={{ padding: '8px 12px' }}>الكمية</th>
                  <th style={{ padding: '8px 12px' }}>التاريخ</th>
                  <th style={{ padding: '8px 12px' }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {unbuildOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد أوامر تفكيك مسجلة.
                    </td>
                  </tr>
                ) : (
                  unbuildOrders.map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700 }}>{u.doc_no || `#${u.id}`}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{u.product_name}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{u.quantity}</td>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '-'}</td>
                      <td style={{ padding: '8px 12px', color: '#059669', fontWeight: 700 }}>مكتمل ومفكك</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
