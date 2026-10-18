import { useTranslation } from 'react-i18next';
import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import {
  CheckCircleIcon,
  SlidersIcon,
  PackageIcon,
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
} from '@/shared/components/icons/AppIcons';

export interface VanInvoiceReviewItem {
  productId: number;
  productName: string;
  unitName?: string;
  cartons?: number;
  pieces?: number;
  totalPieces: number;
  cartonUnitPrice?: number;
  pieceUnitPrice?: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
  warehouseAvailable?: number;
}

export interface VanInvoiceReviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  customer?: {
    id: number;
    name: string;
    phone?: string;
    balance?: number;
    creditLimit?: number;
    customerCode?: string;
  } | null;
  paymentTerms?: 'cash' | 'credit';
  deliveryDate?: string;
  bookingNotes?: string;
  items: VanInvoiceReviewItem[];
  totalAmount: number;
  subtotal?: number;
  totalDiscount?: number;
  title?: string;
  subtitle?: string;
  confirmButtonText?: string;
  editButtonText?: string;
}

/**
 * VanInvoiceReviewModal:
 * Dedicated pre-confirmation review modal for van reps before final submission.
 * Shows customer details, payment conditions, full item breakdown (quantities, prices, totals),
 * and two clear action buttons:
 * 1. "تعديل الأصناف / الفاتورة" (returns to edit screen to adjust quantities or add items).
 * 2. "تأكيد نهائي للفاتورة / الطلبية" (executes final commit).
 */
export const VanInvoiceReviewModal: React.FC<VanInvoiceReviewModalProps> = ({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
  customer,
  paymentTerms = 'cash',
  deliveryDate,
  bookingNotes,
  items,
  totalAmount,
  subtotal,
  totalDiscount = 0,
  title = 'معاينة تفاصيل الطلبية قبل الاعتماد النهائي',
  subtitle = 'راجع الأصناف والكميات والأسعار بعناية، يمكنك التعديل أو التأكيد النهائي',
  confirmButtonText = 'تأكيد نهائي لحجز الطلبية',
  editButtonText = 'تعديل الأصناف والكميات',
}) => {
  const { t } = useTranslation();
  const totalCartons = items.reduce((s, it) => s + (it.cartons || 0), 0);
  const totalPieces = items.reduce((s, it) => s + (it.totalPieces || it.pieces || 0), 0);

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      badge={t('delivery_reps.van_invoice_review_modal.s0', "معاينة ما قبل التأكيد")}
      width="min(580px, 96vw)"
      minHeight="480px"
      footer={
        <div
          dir="rtl"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {/* EDIT BUTTON (Returns rep to the cart to adjust quantities or add items) */}
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              minHeight: '40px',
              fontSize: '13px',
              fontWeight: 700,
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
            }}
          >
            <SlidersIcon size={15} color="#475569" />
            <span>{editButtonText}</span>
          </Button>

          {/* FINAL CONFIRM BUTTON */}
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              minHeight: '40px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: 800,
              padding: '0 24px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(23, 14, 94, 0.25)',
            }}
          >
            <CheckCircleIcon size={16} color="#ffffff" />
            <span>{isSubmitting ? t('delivery_reps.van_invoice_review_modal.s1', "جاري الاعتماد والحجز...") : confirmButtonText}</span>
          </Button>
        </div>
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* CUSTOMER & ORDER INFO STRIP */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BuildingIcon size={15} color="#170e5e" />
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{t('delivery_reps.van_invoice_review_modal.s2', "العميل:")}</span>
              <strong style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 800 }}>
                {customer?.name || t('delivery_reps.van_invoice_review_modal.s3', "غير محدد")}
              </strong>
              {customer?.customerCode && (
                <span
                  style={{
                    fontSize: '10.5px',
                    backgroundColor: '#e2e8f0',
                    color: '#334155',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  [{customer.customerCode.replace(/^#/, '')}]
                </span>
              )}
            </div>

            {/* Payment Term Badge */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: paymentTerms === 'cash' ? '#dcfce7' : '#fee2e2',
                color: paymentTerms === 'cash' ? '#15803d' : '#b91c1c',
                border: `1px solid ${paymentTerms === 'cash' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {t('delivery_reps.van_invoice_review_modal.s4', "طريقة الحساب:")} {paymentTerms === 'cash' ? t('delivery_reps.van_invoice_review_modal.s5', "كاش نقدي") : t('delivery_reps.van_invoice_review_modal.s6', "آجل على الحساب")}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#475569', flexWrap: 'wrap' }}>
            {customer?.phone && (
              <span>{t('delivery_reps.van_invoice_review_modal.s7', "الهاتف:")} <strong style={{ color: '#0f172a' }}>{customer.phone}</strong></span>
            )}
            {customer?.balance != null && (
              <span>
                {t('delivery_reps.van_invoice_review_modal.s8', "المديونية الحالية:")}{' '}
                <strong style={{ color: customer.balance > 0 ? '#b91c1c' : '#059669' }}>
                  {customer.balance.toFixed(2)} <CurrencySymbol />
                </strong>
              </span>
            )}
            {customer?.creditLimit != null && customer.creditLimit > 0 && (
              <span>{t('delivery_reps.van_invoice_review_modal.s9', "سقف الائتمان:")} <strong>{customer.creditLimit.toFixed(2)} <CurrencySymbol /></strong></span>
            )}
          </div>

          {(deliveryDate || bookingNotes) && (
            <div
              style={{
                borderTop: '1px dashed #cbd5e1',
                paddingTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '11px',
                color: '#64748b',
                flexWrap: 'wrap',
              }}
            >
              {deliveryDate && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CalendarIcon size={13} color="#475569" />
                  <span>{t('delivery_reps.van_invoice_review_modal.s10', "تاريخ التسليم:")} <strong style={{ color: '#0f172a' }}>{deliveryDate}</strong></span>
                </span>
              )}
              {bookingNotes && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ClockIcon size={13} color="#475569" />
                  <span>{t('delivery_reps.van_invoice_review_modal.s11', "ملاحظات:")} <strong style={{ color: '#0f172a' }}>{bookingNotes}</strong></span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ITEMIZED TABLE / BREAKDOWN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <PackageIcon size={14} color="#170e5e" />
              <span>{t('delivery_reps.van_invoice_review_modal.s12', "تفاصيل الأصناف المحجوزة (")}{items.length} {t('delivery_reps.van_invoice_review_modal.s13', "صنف):")}</span>
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {totalCartons > 0 ? `${totalCartons} كرتونة • ` : ''}{totalPieces} {t('delivery_reps.van_invoice_review_modal.s14', "قطعة إجمالاً")}
            </span>
          </div>

          <div
            style={{
              maxHeight: '230px',
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>{t('delivery_reps.van_invoice_review_modal.s15', "الصنف")}</th>
                  <th style={{ padding: '8px 8px', fontWeight: 700, textAlign: 'center' }}>{t('delivery_reps.van_invoice_review_modal.s16', "الكمية")}</th>
                  <th style={{ padding: '8px 8px', fontWeight: 700, textAlign: 'center' }}>{t('delivery_reps.van_invoice_review_modal.s17', "السعر")}</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'left' }}>{t('delivery_reps.van_invoice_review_modal.s18', "الإجمالي")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const hasCartons = (it.cartons || 0) > 0;
                  const hasPieces = (it.pieces || 0) > 0;
                  const qtyBreakdown = [];
                  if (hasCartons) qtyBreakdown.push(`${it.cartons} كرتونة`);
                  if (hasPieces) qtyBreakdown.push(`${it.pieces} قطعة`);
                  const qtyText = qtyBreakdown.length > 0 ? qtyBreakdown.join(' + ') : `${it.totalPieces} قطعة`;

                  return (
                    <tr
                      key={`${it.productId}-${idx}`}
                      style={{
                        borderBottom: idx === items.length - 1 ? 'none' : '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                          {it.productName}
                        </div>
                        {it.warehouseAvailable != null && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            {t('delivery_reps.van_invoice_review_modal.s19', "المتاح بالمخزن:")} {it.warehouseAvailable} {t('delivery_reps.van_invoice_review_modal.s20', "قطعة")}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '8px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 800, color: '#170e5e', display: 'block' }}>
                          {qtyText}
                        </span>
                        {hasCartons && (
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            ({it.totalPieces} {t('delivery_reps.van_invoice_review_modal.s21', "قطعة)")}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '8px 8px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>
                          {it.unitPrice.toFixed(2)}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', marginRight: '2px' }}>
                          <CurrencySymbol />
                        </span>
                      </td>

                      <td style={{ padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <strong style={{ fontWeight: 900, color: '#0f172a' }}>
                          {it.subtotal.toFixed(2)}
                        </strong>
                        <span style={{ fontSize: '10px', color: '#64748b', marginRight: '2px' }}>
                          <CurrencySymbol />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3-CHIPS FINANCIAL SUMMARY */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '7px 8px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
            }}
          >
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{t('delivery_reps.van_invoice_review_modal.s22', "المجموع الأولي")}</span>
            <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
              {(subtotal || totalAmount).toFixed(2)}
            </strong>
          </div>

          <div
            style={{
              backgroundColor: totalDiscount > 0 ? '#fef3c7' : '#f8fafc',
              borderRadius: '8px',
              padding: '7px 8px',
              textAlign: 'center',
              border: `1px solid ${totalDiscount > 0 ? '#fde68a' : '#e2e8f0'}`,
            }}
          >
            <span style={{ fontSize: '11px', color: totalDiscount > 0 ? '#92400e' : '#64748b', display: 'block' }}>
              {t('delivery_reps.van_invoice_review_modal.s23', "إجمالي الوفر / الخصم")}
            </span>
            <strong style={{ fontSize: '13.5px', color: totalDiscount > 0 ? '#b45309' : '#64748b' }}>
              {totalDiscount.toFixed(2)}
            </strong>
          </div>

          <div
            style={{
              backgroundColor: '#ecfdf5',
              borderRadius: '8px',
              padding: '7px 8px',
              textAlign: 'center',
              border: '1px solid #bbf7d0',
            }}
          >
            <span style={{ fontSize: '11px', color: '#166534', display: 'block', fontWeight: 700 }}>
              {t('delivery_reps.van_invoice_review_modal.s24', "صافي الفاتورة")}
            </span>
            <strong style={{ fontSize: '14.5px', color: '#15803d', fontWeight: 900 }}>
              {totalAmount.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
};
