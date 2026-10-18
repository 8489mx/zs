import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { toast } from '@/shared/components/system-alert';
import { maritimeApi, MaritimeJob } from '../../api/maritime-freight.api';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';

interface Props {
  job: MaritimeJob;
  onUpdated: () => void;
}

export function JobRoeForexCard({ job, onUpdated }: Props) {
  const { t } = useTranslation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [actualRoeInput, setActualRoeInput] = useState(job.actual_roe ? String(job.actual_roe) : '');
  const [isSaving, setIsSaving] = useState(false);

  const quoteRoe = Number(job.quote_roe || 0);
  const actualRoe = Number(job.actual_roe || 0);
  const forexGainLoss = Number(job.forex_gain_loss || 0);

  const handleCalculateForex = async () => {
    const rate = Number(actualRoeInput);
    if (!rate || rate <= 0) {
      toast.warning('يرجى إدخال سعر صرف فعلي صالح');
      return;
    }

    try {
      setIsSaving(true);
      await maritimeApi.calculateJobForex(job.id, rate);
      toast.success('تم احتساب أرباح/خسائر فروق العملة المحققة للعملية بنجاح');
      setShowEditModal(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'فشل احتساب فروق العملة');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1.5px solid #bfdbfe',
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af' }}>
            {t('maritime_freight.job_details.job_roe_forex_card.s0', "تسعير النولون متعدد العملات وفروق التحويل (Multi-Currency ROE & Forex)")}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setActualRoeInput(job.actual_roe ? String(job.actual_roe) : '');
            setShowEditModal(true);
          }}
          style={{
            padding: '3px 10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            color: '#1d4ed8',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {actualRoe > 0 ? t('maritime_freight.job_details.job_roe_forex_card.s1', "تحديث سعر السداد الفعلي") : t('maritime_freight.job_details.job_roe_forex_card.s2', "+ إدخال سعر الصرف للتسوية")}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '6px' }}>
        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t('maritime_freight.job_details.job_roe_forex_card.s3', "سعر الصرف المعتمد بالعرض (Quote ROE):")}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#170e5e', marginTop: '2px', fontFamily: 'monospace' }}>
            {quoteRoe > 0 ? `${quoteRoe.toFixed(2)} EGP/USD` : t('maritime_freight.job_details.job_roe_forex_card.s4', "غير مسجل")}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>{t('maritime_freight.job_details.job_roe_forex_card.s5', "سعر الأساس التعاقدي مع العميل")}</div>
        </div>

        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t('maritime_freight.job_details.job_roe_forex_card.s6', "سعر السداد الفعلي للخط (Actual ROE):")}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: actualRoe > 0 ? '#0f172a' : '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
            {actualRoe > 0 ? `${actualRoe.toFixed(2)} EGP/USD` : t('maritime_freight.job_details.job_roe_forex_card.s7', "قيد السداد البنكي")}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>{t('maritime_freight.job_details.job_roe_forex_card.s8', "سعر البنك المركزي بتاريخ التحويل")}</div>
        </div>

        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t('maritime_freight.job_details.job_roe_forex_card.s9', "أرباح / خسائر فروق العملة المحققة:")}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: forexGainLoss > 0 ? '#166534' : forexGainLoss < 0 ? '#b91c1c' : '#475569', marginTop: '2px', fontFamily: 'monospace' }}>
            {forexGainLoss > 0 ? `+${forexGainLoss.toLocaleString()} ج.م (ربح عملة)` : forexGainLoss < 0 ? `${forexGainLoss.toLocaleString()} ج.م (فارق تكلفة)` : t('maritime_freight.job_details.job_roe_forex_card.s10', "0.00 ج.م")}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>Realized Forex Variance</div>
        </div>
      </div>

      <StandardDialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('maritime_freight.job_details.job_roe_forex_card.s11', "تسوية فروق أسعار الصرف (Forex Gain/Loss Settlement)")}
        subtitle={t('maritime_freight.job_details.job_roe_forex_card.s12', "حساب الفارق بين سعر الصرف المقدر في العرض وسعر السداد الفعلي للخط الملاحي")}
        width="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', color: '#475569' }}>
            <div>{t('maritime_freight.job_details.job_roe_forex_card.s13', "سعر الصرف المقدر وقت تقديم العرض:")} <strong>{quoteRoe > 0 ? `${quoteRoe} EGP/USD` : t('maritime_freight.job_details.job_roe_forex_card.s14', "غير محدد")}</strong></div>
            <div style={{ marginTop: '2px' }}>{t('maritime_freight.job_details.job_roe_forex_card.s15', "إجمالي التكلفة الأجنبية المباشرة:")} <strong>${Number(job.carrier_cost_total || 0).toLocaleString()}</strong></div>
          </div>

          <Field label={t('maritime_freight.job_details.job_roe_forex_card.s16', "سعر الصرف الفعلي عند سداد الخط / استلام إذن التسليم (EGP/USD)")}>
            <input
              type="number"
              step="0.01"
              placeholder={t('maritime_freight.job_details.job_roe_forex_card.s17', "مثال: 49.25")}
              value={actualRoeInput}
              onChange={(e) => setActualRoeInput(e.target.value)}
              style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
            />
          </Field>
        </div>

        <StandardDialogFooter>
          <button
            type="button"
            onClick={() => setShowEditModal(false)}
            style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('maritime_freight.job_details.job_roe_forex_card.s18', "إلغاء")}
          </button>
          <button
            type="button"
            onClick={handleCalculateForex}
            disabled={isSaving}
            style={{ padding: '8px 20px', background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 700 }}
          >
            {isSaving ? t('maritime_freight.job_details.job_roe_forex_card.s19', "جاري الاحتساب...") : t('maritime_freight.job_details.job_roe_forex_card.s20', "احتساب وترحيل الفروق")}
          </button>
        </StandardDialogFooter>
      </StandardDialog>
    </div>
  );
}
