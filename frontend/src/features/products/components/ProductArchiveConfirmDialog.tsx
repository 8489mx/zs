import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { AlertTriangleIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';

export interface ProductArchiveConfirmDialogProps {
  open: boolean;
  product: {
    id: string | number;
    name: string;
    barcode?: string | null;
    stock?: number;
    isActive?: boolean;
  } | null;
  isBusy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Universal Product Archive & Activation Confirmation Dialog
 * Single Source of Truth for product archiving across both Products Table & Edit Product Form.
 */
export function ProductArchiveConfirmDialog({
  open,
  product,
  isBusy = false,
  onConfirm,
  onCancel,
}: ProductArchiveConfirmDialogProps) {
  if (!open || !product) return null;

  const isActivating = product.isActive === false;
  const currentStock = Number(product.stock || 0);
  const hasRemainingStock = currentStock > 0;

  return (
    <DialogShell
      open={open}
      onClose={isBusy ? () => {} : onCancel}
      width="min(540px, 94vw)"
      zIndex={10000}
    >
      <div
        dir="rtl"
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '24px 22px 20px',
          boxSizing: 'border-box',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Executive Icon Container with Dual Ring & Soft Shadow */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            margin: '0 auto 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isActivating ? '#ecfdf5' : '#fffbeb',
            border: `1px solid ${isActivating ? '#a7f3d0' : '#fde68a'}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          }}
        >
          {isActivating ? (
            <CheckCircleIcon size={28} color="#059669" />
          ) : (
            <AlertTriangleIcon size={28} color="#d97706" strokeWidth={2.2} />
          )}
        </div>

        {/* Title */}
        <h3
          style={{
            margin: '0 0 16px',
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#0f172a',
            textAlign: 'center',
            letterSpacing: '-0.2px',
          }}
        >
          {isActivating ? 'تأكيد تنشيط الصنف' : 'تأكيد أرشفة وتعطيل الصنف'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
          {/* 1. Product Summary Card */}
          <div
            style={{
              background: isActivating ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${isActivating ? '#bbf7d0' : '#e2e8f0'}`,
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                color: isActivating ? '#166534' : '#64748b',
                fontWeight: 700,
              }}
            >
              {isActivating ? 'الصنف المراد تنشيطه:' : 'الصنف المراد أرشفته وتجميده:'}
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.45 }}>
              {product.name}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '0.78rem',
                color: '#475569',
                marginTop: '2px',
                flexWrap: 'wrap',
              }}
            >
              {product.barcode ? (
                <span>
                  الباركود: <strong>{product.barcode}</strong>
                </span>
              ) : null}
              <span>
                الرصيد الحالي بالمخزن:{' '}
                <strong style={{ color: hasRemainingStock ? '#b45309' : '#059669' }}>
                  {currentStock} قطعة
                </strong>
              </span>
            </div>
          </div>

          {/* 2. Stock Warning Box (if archiving and stock > 0) */}
          {!isActivating && hasRemainingStock ? (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#92400e',
                lineHeight: 1.55,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.86rem', marginBottom: '4px' }}>
                تنبيه رصيد مخزني متبقٍ ({currentStock} قطعة)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
                هذا الصنف يحتوي على كمية مسجلة بالمخزن. أرشفة الصنف ستمنع بيعه أو سحبه في الكاشير ونقاط البيع والفواتير الجديدة، مع بقاء رصيده وقيمته مسجلين دفترياً في تقارير المخزون والميزانية لحين تسويته أو صرفه.
              </div>
            </div>
          ) : null}

          {/* 3. Operational Bullet Points */}
          <div style={{ color: '#475569', fontSize: '0.8125rem', lineHeight: 1.65 }}>
            {isActivating ? (
              <div>
                سيتم إعادة الصنف فوراً إلى دليل الأصناف النشطة وإتاحته في شاشات البيع والشراء ونقاط البيع لاستئناف العمل عليه.
              </div>
            ) : (
              <ul style={{ margin: 0, paddingInlineStart: '18px' }}>
                <li>يتم إخفاء الصنف فوراً من نقاط البيع (POS) وقوائم البيع والشراء لمنع التعامل عليه بالخطأ.</li>
                <li>تظل كافة الفواتير والتقارير وحركات كارت الصنف التاريخية محفوظة بنسبة 100%.</li>
                <li>يمكنك في أي وقت استعراض الصنف وإلغاء أرشفته من تبويب <strong>«المؤرشفة»</strong>.</li>
              </ul>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <Button
            variant="secondary"
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            style={{ minWidth: '90px' }}
          >
            تراجع
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            style={{
              minWidth: '130px',
              fontWeight: 700,
              background: isActivating ? '#059669' : '#170e5e',
              borderColor: isActivating ? '#059669' : '#170e5e',
            }}
          >
            {isBusy
              ? 'جارٍ التنفيذ...'
              : isActivating
              ? 'تأكيد التنشيط'
              : 'تأكيد الأرشفة والتعطيل'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
