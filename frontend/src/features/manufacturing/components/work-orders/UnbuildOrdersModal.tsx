import { useTranslation } from 'react-i18next';
import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { workOrdersApi } from '@/features/manufacturing/api/work-orders.api';
import { toast } from '@/shared/components/system-alert';

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
  const { t } = useTranslation();
  const [selectedBomId, setSelectedBomId] = React.useState<number>(0);
  const [unbuildQty, setUnbuildQty] = React.useState<number>(1);
  const [unbuildNotes, setUnbuildNotes] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen) return null;

  const handleCreateUnbuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBomId || unbuildQty <= 0) {
      toast.error('يرجى اختيار شجرة المنتج وتحديد كمية صالحة للتفكيك');
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
      toast.success('تم إنشاء وتأكيد أمر التفكيك واسترجاع المواد الخام للمخزن بنجاح!');
    } catch (err: any) {
      toast.error(err?.message || 'فشل تنفيذ أمر التفكيك');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bomOptions = boms.map((b) => ({
    value: String(b.id),
    label: b.product_name,
    hint: b.name || b.code || undefined,
  }));

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('manufacturing.work_orders.unbuild_orders_modal.s0', "أوامر التفكيك واسترجاع الخامات (Unbuild Orders)")}
      subtitle={t('manufacturing.work_orders.unbuild_orders_modal.s1', "تفكيك المنتجات التامة واسترجاع مكوناتها الأصلية إلى أرصدة المخزون")}
      maxWidth="840px"
      footer={
        <StandardDialogFooter
          onClose={onClose}
          closeLabel={t('manufacturing.work_orders.unbuild_orders_modal.s2', "إغلاق")}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Create Unbuild Form Card */}
        <form
          onSubmit={handleCreateUnbuild}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#170e5e', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
            {t('manufacturing.work_orders.unbuild_orders_modal.s3', "إنشاء أمر تفكيك فوري")}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 110px minmax(180px, 2fr) auto', gap: '10px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t('manufacturing.work_orders.unbuild_orders_modal.s4', "شجرة المنتج التام (BOM) *")}
              </label>
              <CustomSelect
                value={selectedBomId ? String(selectedBomId) : ''}
                onChange={(val) => setSelectedBomId(Number(val))}
                options={bomOptions}
                placeholder={t('manufacturing.work_orders.unbuild_orders_modal.s5', "-- اختر شجرة المنتج --")}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t('manufacturing.work_orders.unbuild_orders_modal.s6', "الكمية للتفكيك *")}
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={unbuildQty}
                onChange={(e) => setUnbuildQty(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t('manufacturing.work_orders.unbuild_orders_modal.s7', "ملاحظات أو سبب التفكيك")}
              </label>
              <input
                type="text"
                placeholder={t('manufacturing.work_orders.unbuild_orders_modal.s8', "تالف، مرتجع، إعادة تدوير...")}
                value={unbuildNotes}
                onChange={(e) => setUnbuildNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedBomId}
                style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '12px', padding: '9px 18px' }}
              >
                {isSubmitting ? t('manufacturing.work_orders.unbuild_orders_modal.s9', "جاري...") : t('manufacturing.work_orders.unbuild_orders_modal.s10', "تنفيذ التفكيك")}
              </Button>
            </div>
          </div>
        </form>

        {/* List of past unbuild orders */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '12.5px', color: '#334155' }}>
            {t('manufacturing.work_orders.unbuild_orders_modal.s11', "سجل أوامر التفكيك المنفذة")}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px' }}>{t('manufacturing.work_orders.unbuild_orders_modal.s12', "رقم الأمر")}</th>
                <th style={{ padding: '10px 14px' }}>{t('manufacturing.work_orders.unbuild_orders_modal.s13', "المنتج المفكك")}</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>{t('manufacturing.work_orders.unbuild_orders_modal.s14', "الكمية")}</th>
                <th style={{ padding: '10px 14px' }}>{t('manufacturing.work_orders.unbuild_orders_modal.s15', "التاريخ")}</th>
                <th style={{ padding: '10px 14px' }}>{t('manufacturing.work_orders.unbuild_orders_modal.s16', "الحالة")}</th>
              </tr>
            </thead>
            <tbody>
              {unbuildOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    {t('manufacturing.work_orders.unbuild_orders_modal.s17', "لا توجد أوامر تفكيك مسجلة حتى الآن.")}
                  </td>
                </tr>
              ) : (
                unbuildOrders.map((u, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700 }}>{u.doc_no || `#${u.id}`}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u.product_name}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>{u.quantity}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 700, border: '1px solid #a7f3d0', fontSize: '11px' }}>
                        {t('manufacturing.work_orders.unbuild_orders_modal.s18', "مكتمل ومفكك")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </StandardDialog>
  );
}
