import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import type { ContractingGuarantee, GuaranteeType, GuaranteeStatus } from '../contracting.types';
import { toast } from '@/shared/components/system-alert';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { CreateGuaranteeModal } from './CreateGuaranteeModal';

interface GuaranteesDirectoryModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  subcontractId?: string;
  onClose: () => void;
  onChanged?: () => void;
}

export function GuaranteesDirectoryModal({
  open,
  projectId,
  projectName,
  subcontractId,
  onClose,
  onChanged,
}: GuaranteesDirectoryModalProps) {
  const { currencySymbol } = useSystemCurrency();

  const [guarantees, setGuarantees] = useState<ContractingGuarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'advance_payment' | 'performance' | 'retention' | 'alerts'>('all');

  // Sub-modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGuaranteeForAction, setSelectedGuaranteeForAction] = useState<ContractingGuarantee | null>(null);
  const [actionType, setActionType] = useState<'extend' | 'release' | 'invoke' | null>(null);

  // Action form inputs
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionReason, setActionReason] = useState('');
  const [actionAmount, setActionAmount] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchGuarantees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contractingApi.getGuarantees({
        projectId,
        subcontractId: subcontractId || undefined,
      });
      setGuarantees(data || []);
    } catch {
      setGuarantees([]);
      toast.error('تعذر تحميل سجل خطابات الضمان البنكية');
    } finally {
      setLoading(false);
    }
  }, [projectId, subcontractId]);

  useEffect(() => {
    if (open) {
      fetchGuarantees();
      setActionType(null);
      setSelectedGuaranteeForAction(null);
    }
  }, [open, fetchGuarantees]);

  // Alert calculations
  const expiredCount = guarantees.filter((g) => g.alertTier === 'expired').length;
  const t7Count = guarantees.filter((g) => g.alertTier === 'critical_t7').length;
  const t30Count = guarantees.filter((g) => g.alertTier === 'warning_t30').length;
  const t60Count = guarantees.filter((g) => g.alertTier === 'info_t60').length;
  const totalActiveValue = guarantees
    .filter((g) => g.status === 'active')
    .reduce((sum, g) => sum + Number(g.amount || 0), 0);

  const filteredGuarantees = guarantees.filter((g) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'alerts') return g.alertTier && g.alertTier !== 'healthy';
    return g.guaranteeType === activeTab;
  });

  const getGuaranteeTypeLabel = (type: GuaranteeType) => {
    switch (type) {
      case 'advance_payment': return 'ضمان دفعة مقدمة';
      case 'performance': return 'ضمان حسن تنفيذ';
      case 'retention': return 'ضمان محتجز الضمان';
      case 'maintenance': return 'ضمان صيانة';
      case 'bid_bond': return 'ضمان عطاء/ابتدائي';
      default: return type;
    }
  };

  const getStatusBadge = (status: GuaranteeStatus) => {
    switch (status) {
      case 'active':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
            سارٍ ونافذ
          </span>
        );
      case 'expired':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
            منتهي الصلاحية
          </span>
        );
      case 'released':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>
            مفرج عنه ومسترد
          </span>
        );
      case 'confiscated_invoked':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            مسيّل / مصادر
          </span>
        );
      default:
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
            ملغى
          </span>
        );
    }
  };

  const getAlertBadge = (tier?: string, daysRemaining?: number) => {
    if (tier === 'expired') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: 'var(--font-micro)', fontWeight: 700, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
          منتهي منذ {Math.abs(daysRemaining || 0)} يوم
        </span>
      );
    }
    if (tier === 'critical_t7') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: 'var(--font-micro)', fontWeight: 700, background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171' }}>
          تحذير حرج T-7 ({daysRemaining} أيام)
        </span>
      );
    }
    if (tier === 'warning_t30') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: 'var(--font-micro)', fontWeight: 700, background: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' }}>
          إنذار T-30 ({daysRemaining} يوماً)
        </span>
      );
    }
    if (tier === 'info_t60') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: 'var(--font-micro)', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
          إشعار T-60 ({daysRemaining} يوماً)
        </span>
      );
    }
    return (
      <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: 'var(--font-micro)', fontWeight: 600, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
        آمن ({daysRemaining} يوم)
      </span>
    );
  };

  const handleExecuteAction = async () => {
    if (!selectedGuaranteeForAction) return;
    setIsSubmittingAction(true);
    try {
      if (actionType === 'extend') {
        if (!newExpiryDate) {
          toast.error('يرجى تحديد تاريخ التمديد الجديد');
          setIsSubmittingAction(false);
          return;
        }
        await contractingApi.extendGuarantee(selectedGuaranteeForAction.id, {
          newExpiryDate,
          notes: actionNotes.trim() || undefined,
        });
        toast.success(`تم تمديد خطاب الضمان بنكياً بنجاح حتى ${newExpiryDate}`);
      } else if (actionType === 'release') {
        await contractingApi.releaseGuarantee(selectedGuaranteeForAction.id, {
          releaseDate: actionDate,
          notes: actionNotes.trim() || undefined,
        });
        toast.success('تم الإفراج عن خطاب الضمان ورد أصله بنجاح');
      } else if (actionType === 'invoke') {
        if (!actionReason.trim()) {
          toast.error('يرجى ذكر سبب التسييل أو المصادرة');
          setIsSubmittingAction(false);
          return;
        }
        await contractingApi.invokeGuarantee(selectedGuaranteeForAction.id, {
          invocationDate: actionDate,
          invokedAmount: actionAmount ? Number(actionAmount) : undefined,
          reason: actionReason.trim(),
        });
        toast.success('تم تسجيل تسييل/مصادرة خطاب الضمان بنجاح');
      }

      setActionType(null);
      setSelectedGuaranteeForAction(null);
      fetchGuarantees();
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || 'فشلت معالجة الإجراء على خطاب الضمان');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="سجل خطابات الضمان البنكية والبوابة الرقابية G1"
      subtitle={`المشروع: ${projectName || projectId} | إدارة خطابات الدفعة المقدمة وحسن التنفيذ والمحتجزات والتنبيهات المبكرة`}
      maxWidth="1180px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '520px' }} dir="rtl">
        {/* شريط الإحصائيات وبطاقات التنبيه المبكر */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي الغطاء الساري</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {loading ? '—' : `${totalActiveValue.toLocaleString()} ${currencySymbol}`}
            </div>
            <div style={{ fontSize: 'var(--font-micro)', color: '#94a3b8', marginTop: '2px' }}>
              {guarantees.filter((g) => g.status === 'active').length} خطابات سارية
            </div>
          </div>

          <div style={{ background: expiredCount > 0 ? '#fef2f2' : '#f8fafc', border: `1px solid ${expiredCount > 0 ? '#fecaca' : '#e2e8f0'}`, borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: expiredCount > 0 ? '#991b1b' : '#64748b', fontWeight: 600 }}>منتهية الصلاحية (موجب حجب)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: expiredCount > 0 ? '#dc2626' : '#64748b', marginTop: '2px' }}>
              {loading ? '—' : expiredCount}
            </div>
            <div style={{ fontSize: 'var(--font-micro)', color: expiredCount > 0 ? '#b91c1c' : '#94a3b8', marginTop: '2px' }}>
              {expiredCount > 0 ? 'يتطلب تمديداً فورياً' : 'لا يوجد متأخرات'}
            </div>
          </div>

          <div style={{ background: t7Count > 0 ? '#fef2f2' : '#f8fafc', border: `1px solid ${t7Count > 0 ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: t7Count > 0 ? '#b91c1c' : '#64748b', fontWeight: 600 }}>إنذار حرج T-7 (خلال أسبوع)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: t7Count > 0 ? '#b91c1c' : '#64748b', marginTop: '2px' }}>
              {loading ? '—' : t7Count}
            </div>
            <div style={{ fontSize: 'var(--font-micro)', color: t7Count > 0 ? '#ef4444' : '#94a3b8', marginTop: '2px' }}>
              خطر التسييل أو الإلغاء
            </div>
          </div>

          <div style={{ background: t30Count > 0 ? '#fffbeb' : '#f8fafc', border: `1px solid ${t30Count > 0 ? '#fde68a' : '#e2e8f0'}`, borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: t30Count > 0 ? '#b45309' : '#64748b', fontWeight: 600 }}>تحذير T-30 (خلال شهر)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: t30Count > 0 ? '#d97706' : '#64748b', marginTop: '2px' }}>
              {loading ? '—' : t30Count}
            </div>
            <div style={{ fontSize: 'var(--font-micro)', color: t30Count > 0 ? '#b45309' : '#94a3b8', marginTop: '2px' }}>
              بدء إجراءات التمديد
            </div>
          </div>

          <div style={{ background: t60Count > 0 ? '#eff6ff' : '#f8fafc', border: `1px solid ${t60Count > 0 ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: t60Count > 0 ? '#1d4ed8' : '#64748b', fontWeight: 600 }}>إشعار T-60 (خلال شهرين)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: t60Count > 0 ? '#2563eb' : '#64748b', marginTop: '2px' }}>
              {loading ? '—' : t60Count}
            </div>
            <div style={{ fontSize: 'var(--font-micro)', color: t60Count > 0 ? '#1d4ed8' : '#94a3b8', marginTop: '2px' }}>
              متابعة استباقية
            </div>
          </div>
        </div>

        {/* شريط التحكم، التابات، وزر التسجيل */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'all', label: 'كافة الخطابات', count: guarantees.length },
              { key: 'advance_payment', label: 'دفعات مقدمة (G1)', count: guarantees.filter((g) => g.guaranteeType === 'advance_payment').length },
              { key: 'performance', label: 'حسن تنفيذ', count: guarantees.filter((g) => g.guaranteeType === 'performance').length },
              { key: 'retention', label: 'محتجز الضمان', count: guarantees.filter((g) => g.guaranteeType === 'retention').length },
              { key: 'alerts', label: 'تنبيهات الانتهاء', count: expiredCount + t7Count + t30Count + t60Count },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeTab === tab.key ? '#170e5e' : '#e2e8f0',
                  background: activeTab === tab.key ? '#170e5e' : '#ffffff',
                  color: activeTab === tab.key ? '#ffffff' : '#475569',
                  fontSize: 'var(--font-badge)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxSizing: 'border-box',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: activeTab === tab.key ? '#ffffff' : '#64748b',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            style={{
              height: '34px',
              padding: '0 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: 'var(--font-body)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <AppIcons.Plus size={15} />
            <span>تسجيل خطاب ضمان جديد</span>
          </button>
        </div>

        {/* جدول خطابات الضمان */}
        <div style={{ height: '335px', minHeight: '335px', maxHeight: '335px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '335px', color: '#64748b', fontSize: 'var(--font-body)' }}>
              جاري تحميل سجل الضمانات البنكية...
            </div>
          ) : filteredGuarantees.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '335px', gap: '8px', color: '#64748b' }}>
              <AppIcons.ShieldCheck size={36} />
              <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>لا توجد خطابات ضمان مسجلة</div>
              <div style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8' }}>
                اضغط على "تسجيل خطاب ضمان جديد" لإدراج وتفعيل الغطاء البنكي
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>رقم الخطاب / البنك</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>النوع والغطاء</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>قيمة الضمان</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>سريان الضمان والتنبيه</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>العقد / المقاول</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuarantees.map((g) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 'var(--font-body)' }}>{g.guaranteeNumber}</div>
                      <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px' }}>{g.issuingBank}</div>
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 'var(--font-body)' }}>
                        {getGuaranteeTypeLabel(g.guaranteeType)}
                      </span>
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 800, color: '#170e5e', fontSize: 'var(--font-body)' }}>
                        {Number(g.amount).toLocaleString()} {g.currency}
                      </div>
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 'var(--font-body)', color: '#334155', fontWeight: 600 }}>{g.expiryDate}</div>
                      <div style={{ marginTop: '3px' }}>
                        {getAlertBadge(g.alertTier, g.daysRemaining)}
                      </div>
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 'var(--font-body)', color: '#1e293b' }}>
                        {g.subcontractorName || 'مشروع عام'}
                      </div>
                      {g.subcontractNumber && (
                        <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                          عقد: {g.subcontractNumber}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      {getStatusBadge(g.status)}
                    </td>

                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {g.status === 'active' || g.status === 'expired' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGuaranteeForAction(g);
                                setActionType('extend');
                                setNewExpiryDate(g.expiryDate);
                                setActionNotes('');
                              }}
                              title="تمديد بنكي"
                              style={{
                                height: '28px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1px solid #c7d2fe',
                                background: '#eef2ff',
                                color: '#3730a3',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              تمديد
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGuaranteeForAction(g);
                                setActionType('release');
                                setActionDate(new Date().toISOString().split('T')[0]);
                                setActionNotes('');
                              }}
                              title="إفراج ورد أصل الخطاب"
                              style={{
                                height: '28px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1px solid #bbf7d0',
                                background: '#f0fdf4',
                                color: '#166534',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              إفراج
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGuaranteeForAction(g);
                                setActionType('invoke');
                                setActionDate(new Date().toISOString().split('T')[0]);
                                setActionAmount(String(g.amount));
                                setActionReason('');
                                setActionNotes('');
                              }}
                              title="تسييل أو مصادرة الخطاب"
                              style={{
                                height: '28px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#991b1b',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              تسييل
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: 'var(--font-micro)', color: '#94a3b8' }}>لا إجراء</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* قسم تنفيذ الإجراء (تمديد / إفراج / تسييل) داخل نفس النافذة دون تشتت */}
        {actionType && selectedGuaranteeForAction && (
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: actionType === 'invoke' ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${actionType === 'invoke' ? '#fca5a5' : '#c7d2fe'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: actionType === 'invoke' ? '#991b1b' : '#170e5e', fontSize: 'var(--font-body)' }}>
                {actionType === 'extend' && `تمديد بنكي لخطاب الضمان رقم: ${selectedGuaranteeForAction.guaranteeNumber}`}
                {actionType === 'release' && `إفراج ورد أصل خطاب الضمان رقم: ${selectedGuaranteeForAction.guaranteeNumber}`}
                {actionType === 'invoke' && `تسييل / مصادرة خطاب الضمان رقم: ${selectedGuaranteeForAction.guaranteeNumber}`}
              </div>
              <button
                type="button"
                onClick={() => { setActionType(null); setSelectedGuaranteeForAction(null); }}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
              >
                إلغاء الإجراء
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {actionType === 'extend' && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    تاريخ انتهاء السريان الجديد
                  </label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {(actionType === 'release' || actionType === 'invoke') && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    تاريخ المعاملة البنكية
                  </label>
                  <input
                    type="date"
                    value={actionDate}
                    onChange={(e) => setActionDate(e.target.value)}
                    style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {actionType === 'invoke' && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    المبلغ المصادر/المسيّل
                  </label>
                  <input
                    type="number"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    placeholder="كامل المبلغ أو جزء منه"
                    style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ gridColumn: actionType === 'invoke' ? 'span 1' : 'span 2' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {actionType === 'invoke' ? 'سبب التسييل / المصادرة الإلزامي' : 'ملاحظات وتفاصيل المعاملة'}
                </label>
                <input
                  type="text"
                  value={actionType === 'invoke' ? actionReason : actionNotes}
                  onChange={(e) => actionType === 'invoke' ? setActionReason(e.target.value) : setActionNotes(e.target.value)}
                  placeholder={actionType === 'invoke' ? 'مثال: إخلال جسيم بالجدول الزمني وسحب الأعمال' : 'رقم الخطاب الوارد من البنك أو ملاحظات'}
                  style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => { setActionType(null); setSelectedGuaranteeForAction(null); }}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: 'var(--font-badge)', cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleExecuteAction}
                style={{
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: actionType === 'invoke' ? '#dc2626' : '#170e5e',
                  color: '#ffffff',
                  fontSize: 'var(--font-badge)',
                  fontWeight: 700,
                  cursor: isSubmittingAction ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmittingAction ? 'جاري المعالجة...' : 'تأكيد وحفظ الإجراء'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* نافذة تسجيل خطاب ضمان جديد */}
      {isCreateOpen && (
        <CreateGuaranteeModal
          open={isCreateOpen}
          projectId={projectId}
          projectName={projectName}
          subcontractId={subcontractId}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            fetchGuarantees();
            onChanged?.();
          }}
        />
      )}
    </StandardDialog>
  );
}
