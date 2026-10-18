import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { ContractingPaymentHold } from '../contracting.types';

interface PaymentHoldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

export function PaymentHoldsModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: PaymentHoldsModalProps) {
  const { t } = useTranslation();
  const [holds, setHolds] = useState<ContractingPaymentHold[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string>('');

  // New Hold Form
  const [targetType, setTargetType] = useState<'subcontractor' | 'supplier' | 'boq_item'>('subcontractor');
  const [targetName, setTargetName] = useState('');
  const [holdAmount, setHoldAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadHolds = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await contractingApi.getPaymentHolds(projectId ? { projectId } : undefined);
      setHolds(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تحميل سجل حجوزات الدفعات');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      loadHolds();
      setIsAdding(false);
      setReleasingId(null);
    }
  }, [isOpen, loadHolds]);

  const handleCreateHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdAmount || holdAmount <= 0) {
      setErrorMsg('يرجى تحديد مبلغ الحجز');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('يرجى توضيح سبب حجز الدفعة أو العيب الفني المرصود');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      await contractingApi.createPaymentHold(projectId || '', {
        targetType,
        targetName: targetName.trim() || 'طرف غير محدد',
        holdAmount: Number(holdAmount),
        reason: reason.trim(),
      });
      setIsAdding(false);
      setTargetName('');
      setHoldAmount(0);
      setReason('');
      await loadHolds();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر تسجيل حجز الدفعة');
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseHold = async (holdId: string) => {
    if (!releaseNotes.trim()) {
      setErrorMsg('يرجى كتابة بيان فك الحجز (مثال: تم تلافي الملاحظات واستلام الأعمال بنجاح)');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      await contractingApi.releasePaymentHold(holdId, { releaseNotes: releaseNotes.trim() });
      setReleasingId(null);
      setReleaseNotes('');
      await loadHolds();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر الإفراج عن الدفعة المحجوزة');
    } finally {
      setSaving(false);
    }
  };

  const totalActiveHolds = holds.filter((h) => h.status === 'active' || !h.isReleased).reduce((sum, h) => sum + Number(h.holdAmount || 0), 0);
  const totalReleasedHolds = holds.filter((h) => h.status === 'released' || h.isReleased).reduce((sum, h) => sum + Number(h.holdAmount || 0), 0);

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('contracting.payment_holds_modal.s0', "حجز الدفعات والملاحظات الفنية (Payment Holds & Defect Clearance)")}
      maxWidth="900px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>
              {t('contracting.payment_holds_modal.s1', "سجل استقطاعات وحجز مستحقات المقاولين والموردين")}
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
              {projectName ? `المشروع: ${projectName}` : t('contracting.payment_holds_modal.s2', "وقف صرف الدفعات لوجود ملاحظات هندسية حتى اعتماد الاستلام")}
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
                background: '#b91c1c',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-body)',
              }}
            >
              <AppIcons.AlertTriangle size={14} />
              <span>{t('contracting.payment_holds_modal.s3', "تسجيل حجز دفعة لملاحظة فنية")}</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#991b1b', fontWeight: 600 }}>{t('contracting.payment_holds_modal.s4', "إجمالي الدفعات المحجوزة حالياً (قيد المعالجة الفنية)")}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', marginTop: '2px' }}>
              {totalActiveHolds.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#15803d', fontWeight: 600 }}>{t('contracting.payment_holds_modal.s5', "إجمالي الدفعات المفرج عنها بعد تلافي الملاحظات")}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {totalReleasedHolds.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* نموذج تسجيل حجز */}
        {isAdding && (
          <form
            onSubmit={handleCreateHold}
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#9f1239' }}>
              {t('contracting.payment_holds_modal.s6', "تسجيل أمر حجز دفعة / استقطاع تأديبي لملاحظات هندسية")}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {t('contracting.payment_holds_modal.s7', "نوع الطرف المحجوز عليه")}
                </label>
                <CustomSelect
                  value={targetType}
                  onChange={(val) => setTargetType(val as any)}
                  options={[
                    { value: 'subcontractor', label: t('contracting.payment_holds_modal.s8', "مقاول باطن") },
                    { value: 'supplier', label: t('contracting.payment_holds_modal.s9', "مورد مواد") },
                    { value: 'boq_item', label: t('contracting.payment_holds_modal.s10', "بند أعمال (BOQ)") },
                  ]}
                  placeholder={t('contracting.payment_holds_modal.s11', "اختر نوع الطرف...")}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {t('contracting.payment_holds_modal.s12', "اسم الطرف / المقاول")}
                </label>
                <input
                  type="text"
                  required
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder={t('contracting.payment_holds_modal.s13', "مثال: مقاول المحارة والتشطيبات")}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {t('contracting.payment_holds_modal.s14', "المبلغ المحجوز من المستخلص")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={holdAmount || ''}
                  onChange={(e) => setHoldAmount(Number(e.target.value))}
                  placeholder="0.00"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                {t('contracting.payment_holds_modal.s15', "سبب الحجز الفني وتوصيات المهندس المشرف")}
              </label>
              <textarea
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('contracting.payment_holds_modal.s16', "مثال: وجود شروخ وترييح في لياسة الطابق الثاني، تم حجز الدفعة لحين التكسير وإعادة الصنفرة والتسليم للاستشاري")}
                style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px', fontSize: 'var(--font-body)', background: '#fff', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 'var(--font-body)' }}
              >
                {t('contracting.payment_holds_modal.s17', "إلغاء")}
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ height: '32px', padding: '0 14px', borderRadius: '6px', border: 'none', background: '#b91c1c', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--font-body)' }}
              >
                {saving ? t('contracting.payment_holds_modal.s18', "جاري التسجيل...") : t('contracting.payment_holds_modal.s19', "تأكيد أمر الحجز")}
              </button>
            </div>
          </form>
        )}

        {/* جدول الحجوزات */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>{t('contracting.payment_holds_modal.s20', "جاري تحميل سجل الحجوزات...")}</div>
          ) : holds.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>{t('contracting.payment_holds_modal.s21', "لا توجد حجوزات دفعات مسجلة (كافة الأعمال مقبولة ومستوفية للمواصفات)")}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>{t('contracting.payment_holds_modal.s22', "المقاول / الطرف")}</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>{t('contracting.payment_holds_modal.s23', "المبلغ المحجوز")}</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>{t('contracting.payment_holds_modal.s24', "سبب الحجز والملاحظة الفنية")}</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>{t('contracting.payment_holds_modal.s25', "تاريخ الحجز")}</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>{t('contracting.payment_holds_modal.s26', "الحالة")}</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'center' }}>{t('contracting.payment_holds_modal.s27', "الإجراء")}</th>
                </tr>
              </thead>
              <tbody>
                {holds.map((h) => {
                  const isReleasingThis = releasingId === h.id;

                  return (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#1e293b' }}>
                        <div>{h.targetName}</div>
                        <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                          {h.targetType === 'subcontractor' ? t('contracting.payment_holds_modal.s28', "مقاول باطن") : h.targetType === 'supplier' ? t('contracting.payment_holds_modal.s29', "مورد") : t('contracting.payment_holds_modal.s30', "بند تعاقدي")}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#b91c1c' }}>
                        {Number(h.holdAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', maxWidth: '300px' }}>
                        <div style={{ color: '#334155' }}>{h.reason}</div>
                        {h.releaseNotes && (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#15803d', marginTop: '4px', background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px' }}>
                            {t('contracting.payment_holds_modal.s31', "تم الفك:")} {h.releaseNotes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                        {h.holdDate ? new Date(h.holdDate).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: 'var(--font-badge)',
                            fontWeight: 600,
                            background: h.status === 'active' ? '#fee2e2' : '#dcfce7',
                            color: h.status === 'active' ? '#991b1b' : '#15803d',
                          }}
                        >
                          {h.status === 'active' ? t('contracting.payment_holds_modal.s32', "محجوز حالياً") : t('contracting.payment_holds_modal.s33', "مفكوك ومفرج عنه")}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {h.status === 'active' ? (
                          isReleasingThis ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                              <input
                                type="text"
                                value={releaseNotes}
                                onChange={(e) => setReleaseNotes(e.target.value)}
                                placeholder={t('contracting.payment_holds_modal.s34', "بيان الاستلام وتلافي الملاحظة")}
                                style={{ height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: 'var(--font-micro)' }}
                              />
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleReleaseHold(h.id)}
                                  disabled={saving}
                                  style={{ height: '26px', padding: '0 8px', borderRadius: '4px', background: '#15803d', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 'var(--font-micro)', fontWeight: 600 }}
                                >
                                  {t('contracting.payment_holds_modal.s35', "تأكيد الفك")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReleasingId(null)}
                                  style={{ height: '26px', padding: '0 8px', borderRadius: '4px', background: '#e2e8f0', color: '#334155', border: 'none', cursor: 'pointer', fontSize: 'var(--font-micro)' }}
                                >
                                  {t('contracting.payment_holds_modal.s36', "إلغاء")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReleasingId(h.id)}
                              style={{
                                height: '28px',
                                padding: '0 10px',
                                borderRadius: '4px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#15803d',
                                cursor: 'pointer',
                                fontSize: 'var(--font-micro)',
                                fontWeight: 600,
                              }}
                            >
                              {t('contracting.payment_holds_modal.s37', "إفراج وتلافي")}
                            </button>
                          )
                        ) : (
                          <span style={{ fontSize: 'var(--font-micro)', color: '#15803d' }}>
                            {h.releasedAt || (h as any).releaseDate ? new Date(h.releasedAt || (h as any).releaseDate).toLocaleDateString('ar-EG') : t('contracting.payment_holds_modal.s38', "تم الفك")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </StandardDialog>
  );
}