import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { maritimeApi, MaritimeRfq, ShippingLine } from '../api/maritime-freight.api';
import {
  CheckCircleIcon,
  ShipIcon,
  MailIcon,
} from '@/shared/components/icons/AppIcons';
import { CarrierSelectionGrid } from './CarrierSelectionGrid';

interface DispatchRfqModalProps {
  open: boolean;
  rfq: MaritimeRfq | null;
  onClose: () => void;
  onDispatched: () => void;
}

export function DispatchRfqModal({ open, rfq, onClose, onDispatched }: DispatchRfqModalProps) {
  const [carriers, setCarriers] = useState<ShippingLine[]>([]);
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && rfq) {
      setErrorMsg(null);
      setSuccessMsg(null);

      maritimeApi
        .getShippingLines()
        .then((lines) => {
          setCarriers(lines);

          // If RFQ already has target lines, preselect them. Otherwise start with empty selection.
          const existingTargetIds = Array.isArray(rfq.target_line_ids) && rfq.target_line_ids.length > 0
            ? rfq.target_line_ids
            : [];

          setSelectedLineIds(existingTargetIds);
        })
        .catch(() => {});
    }
  }, [open, rfq]);

  if (!rfq) return null;

  const handleDispatch = async () => {
    if (selectedLineIds.length === 0) {
      setErrorMsg('يرجى تحديد خط ملاحي أو وكيل شحن واحد على الأقل لإرسال الإيميل إليه');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await maritimeApi.dispatchRfqEmails(rfq.id, selectedLineIds);
      setSuccessMsg(res.message || `تم إرسال الإيميلات بنجاح إلى ${selectedLineIds.length} جهات`);

      setTimeout(() => {
        onDispatched();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل إرسال الإيميلات للخطوط المحددة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`إرسال طلب تسعير ملاحي: ${rfq.rfq_number}`}
      subtitle="مراجعة بيانات الشحنة وتحديد قائمة الخطوط والوكلاء المستهدفين لإرسال رسائل الاستفسار"
      width="min(880px, 95vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleDispatch}
          isSubmitting={isSubmitting}
          submitText={`تأكيد وإرسال الإيميلات (${selectedLineIds.length} جهة)`}
          cancelText="إلغاء"
        />
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir="rtl">
        {errorMsg && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleIcon size={18} color="#16a34a" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1: بطاقة ملخص الشحنة */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <ShipIcon size={16} />
              <span>1. بيانات الشحنة ومسار الرحلة (Shipment Route & Specs)</span>
            </div>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, background: '#eef2ff', color: '#1e40af', padding: '2px 8px', borderRadius: '6px' }}>
              {rfq.rfq_number}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', fontSize: '0.8125rem' }}>
            <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>ميناء الشحن (POL)</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.pol_name || rfq.pol_code} <span style={{ color: '#0284c7', fontSize: '0.74rem' }}>({rfq.pol_code})</span></div>
            </div>

            <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>ميناء التفريغ (POD)</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.pod_name || rfq.pod_code} <span style={{ color: '#0284c7', fontSize: '0.74rem' }}>({rfq.pod_code})</span></div>
            </div>

            <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>الحاويات والنمط</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.container_count}x {rfq.container_type} <span style={{ color: '#16a34a', fontSize: '0.74rem' }}>({rfq.cargo_mode})</span></div>
            </div>

            <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>توصيف البضاعة</div>
              <div style={{ color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rfq.commodity_description || 'عام'}>
                {rfq.commodity_description || 'بضائع عامة (General Cargo)'}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>مهلة السماح المطلوبة</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.target_free_days || 14} يوم سماح (Free Days)</div>
            </div>

            <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>شروط التعاقد والدفع</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.incoterm || 'FOB'} ({rfq.payment_term || 'prepaid'})</div>
            </div>
          </div>
        </div>

        {/* Section 2: اختيار وتصفية الخطوط والوكلاء عبر المنظومة الذكية */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem', marginBottom: '10px' }}>
            <MailIcon size={16} />
            <span>2. تحديد الخطوط والوكلاء المستهدفين للإرسال</span>
          </div>

          <CarrierSelectionGrid
            carriers={carriers}
            selectedIds={selectedLineIds}
            onChangeSelectedIds={setSelectedLineIds}
            maxHeight="240px"
          />
        </div>

        {/* Section 3: معاينة الرسالة */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={{
              width: '100%',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#334155',
            }}
          >
            <span>معاينة نص وموضوع الرسالة الرسمية (Email Preview)</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{showPreview ? 'إخفاء المعاينة ▲' : 'عرض المعاينة ▼'}</span>
          </button>

          {showPreview && (
            <div style={{ padding: '12px', fontSize: '0.8rem', color: '#334155', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '8px', padding: '6px 10px', background: '#f1f5f9', borderRadius: '6px', fontWeight: 600 }}>
                <strong>الموضوع:</strong> [{rfq.rfq_number}] Ocean Freight Rate Inquiry: {rfq.pol_code} to {rfq.pod_code} ({rfq.container_count}x {rfq.container_type})
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', background: '#fafafa', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px 0' }}>Dear Carrier Pricing Desk,</p>
                <p style={{ margin: '0 0 8px 0' }}>Please provide your most competitive ocean freight spot rate for the following inquiry:</p>
                <ul style={{ margin: '0 0 8px 0', paddingRight: '20px' }}>
                  <li><strong>Reference:</strong> {rfq.rfq_number}</li>
                  <li><strong>Route:</strong> {rfq.pol_name} ({rfq.pol_code}) &rarr; {rfq.pod_name} ({rfq.pod_code})</li>
                  <li><strong>Equipment:</strong> {rfq.container_count}x {rfq.container_type} ({rfq.cargo_mode})</li>
                  <li><strong>Commodity:</strong> {rfq.commodity_description || 'General Cargo'}</li>
                  <li><strong>Free Days:</strong> {rfq.target_free_days || 14} Days</li>
                </ul>
                <p style={{ margin: '0', color: '#64748b', fontSize: '0.74rem' }}>
                  * ستتضمن الرسالة رابطاً سحرياً مخصصاً لكل خط لتسجيل عرضه أونلاين بضغطة واحدة، كما يمكنهم الرد مباشرة على الإيميل ليقوم الذكاء الاصطناعي بقراءة السعر آلياً.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </StandardDialog>
  );
}
