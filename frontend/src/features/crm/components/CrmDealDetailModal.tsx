import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import {
  CalendarIcon,
  CheckIcon,
  Trash2Icon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import { crmApi, type CrmDeal, type DealStage, type CrmActivity } from '../api/crm.api';
import { STAGES, PRIORITIES, ACTIVITY_LABELS } from './CrmConstants';

export interface CrmDealDetailModalProps {
  dealId: number | null;
  onClose: () => void;
  onStageChange?: (deal: CrmDeal, stage: DealStage) => void;
  onFeedback?: (type: 'success' | 'error', text: string) => void;
}

export function CrmDealDetailModal({
  dealId,
  onClose,
  onStageChange,
  onFeedback,
}: CrmDealDetailModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [newActivitySummary, setNewActivitySummary] = useState('');
  const [newActivityType, setNewActivityType] = useState('call');
  const [newActivityDueDate, setNewActivityDueDate] = useState('');

  const { data: activeDealDetail } = useQuery({
    queryKey: ['crm-deal-detail', dealId],
    queryFn: () => crmApi.get(dealId!),
    enabled: Boolean(dealId),
  });

  const deleteDealMutation = useMutation({
    mutationFn: crmApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
      onClose();
      onFeedback?.('success', 'تم حذف الفرصة البيعية بنجاح.');
    },
    onError: (err: any) => {
      onFeedback?.('error', err?.message || 'فشل حذف الفرصة.');
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: ({ dealId, data }: { dealId: number; data: any }) => crmApi.addActivity(dealId, data),
    onSuccess: () => {
      if (dealId) {
        queryClient.invalidateQueries({ queryKey: ['crm-deal-detail', dealId] });
      }
      setNewActivitySummary('');
      setNewActivityDueDate('');
      onFeedback?.('success', 'تم تسجيل النشاط بنجاح.');
    },
    onError: (err: any) => {
      onFeedback?.('error', err?.message || 'فشل إضافة النشاط.');
    },
  });

  const toggleActivityMutation = useMutation({
    mutationFn: crmApi.toggleActivity,
    onSuccess: () => {
      if (dealId) {
        queryClient.invalidateQueries({ queryKey: ['crm-deal-detail', dealId] });
      }
    },
  });

  const convertCustomerMutation = useMutation({
    mutationFn: crmApi.convertToCustomer,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
      if (dealId) {
        queryClient.invalidateQueries({ queryKey: ['crm-deal-detail', dealId] });
      }
      onFeedback?.('success', `تم تحويل الفرصة إلى عميل مسجل برقم #${res.customerId} بنجاح.`);
    },
    onError: (err: any) => {
      onFeedback?.('error', err?.message || 'فشل تحويل الفرصة إلى عميل.');
    },
  });

  if (!dealId || !activeDealDetail?.deal) return null;

  return (
    <DialogShell
      open={Boolean(dealId)}
      onClose={onClose}
      width="min(880px, 95%)"
      ariaLabel="تفاصيل الفرصة البيعية والأنشطة"
    >
          <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#170e5e', margin: 0 }}>
                    {activeDealDetail.deal.title}
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: STAGES.find((s) => s.key === activeDealDetail.deal.stage)?.bg || '#f1f5f9',
                      color: STAGES.find((s) => s.key === activeDealDetail.deal.stage)?.color || '#475569',
                    }}
                  >
                    {STAGES.find((s) => s.key === activeDealDetail.deal.stage)?.label || activeDealDetail.deal.stage}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                  {activeDealDetail.deal.companyName ? `${activeDealDetail.deal.companyName} • ` : ''}
                  {activeDealDetail.deal.contactName || 'بدون جهة اتصال'}
                  {activeDealDetail.deal.contactPhone ? ` (${activeDealDetail.deal.contactPhone})` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  style={{ color: '#dc2626' }}
                  onClick={() => {
                    if (confirm('هل أنت متأكد من رغبتك في حذف هذه الفرصة البيعية؟')) {
                      deleteDealMutation.mutate(activeDealDetail.deal.id);
                    }
                  }}
                >
                  <Trash2Icon size={16} />
                </Button>
                <button
                  onClick={() => onClose()}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            {/* Quick Actions Ribbon */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {activeDealDetail.deal.customerId ? (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#16a34a',
                      background: '#ecfdf5',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckIcon size={14} color="#16a34a" />
                    عميل مسجل بالنظام (رقم #{activeDealDetail.deal.customerId})
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    style={{ background: '#16a34a', color: '#ffffff', fontSize: '12px' }}
                    onClick={() => convertCustomerMutation.mutate(activeDealDetail.deal.id)}
                    disabled={convertCustomerMutation.isPending}
                  >
                    {convertCustomerMutation.isPending ? 'جاري التحويل...' : 'تحويل إلى عميل مسجل'}
                  </Button>
                )}

                {activeDealDetail.deal.contactPhone && (
                  <Button
                    variant="secondary"
                    style={{ fontSize: '12px', color: '#059669', borderColor: '#a7f3d0' }}
                    onClick={() => {
                      const cleanPhone = activeDealDetail.deal.contactPhone?.replace(/\D/g, '') || '';
                      window.open(
                        `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `مرحباً ${activeDealDetail.deal.contactName || ''}، بخصوص فرصة: ${activeDealDetail.deal.title}`
                        )}`,
                        '_blank'
                      );
                    }}
                  >
                    مراسلة واتساب
                  </Button>
                )}

                <Button
                  variant="secondary"
                  style={{ fontSize: '12px' }}
                  onClick={() => {
                    navigate('/pos');
                  }}
                >
                  فتح نقطة البيع (POS)
                </Button>
              </div>

              {/* Stage advancement dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>نقل المرحلة:</span>
                <select
                  value={activeDealDetail.deal.stage}
                  onChange={(e) => onStageChange?.(activeDealDetail.deal, e.target.value as DealStage)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    background: '#ffffff',
                  }}
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                  <option value="lost">صفقة خاسرة</option>
                </select>
              </div>
            </div>

            {/* Deal Snapshot Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>القيمة المتوقعة</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#170e5e', marginTop: '2px' }}>
                  {formatCurrency(activeDealDetail.deal.expectedAmount)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>الاحتمالية</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0284c7', marginTop: '2px' }}>
                  {activeDealDetail.deal.probability}%
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>الأولوية</span>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {PRIORITIES[activeDealDetail.deal.priority]?.label || activeDealDetail.deal.priority}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>تاريخ الإغلاق</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                  {activeDealDetail.deal.expectedCloseDate ? formatDateOnly(activeDealDetail.deal.expectedCloseDate) : '-'}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {activeDealDetail.deal.notes && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  color: '#92400e',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>ملاحظات الصفقة:</div>
                <div>{activeDealDetail.deal.notes}</div>
              </div>
            )}

            {/* Activity Timeline Section */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#170e5e', marginBottom: '12px' }}>
                سجل المتابعات والأنشطة (Activity Timeline)
              </h3>

              {/* Add Activity Form */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '14px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 180px auto', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={newActivityType}
                    onChange={(e) => setNewActivityType(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="call">مكالمة هاتفية</option>
                    <option value="meeting">اجتماع عمل</option>
                    <option value="task">مهمة متابعة</option>
                    <option value="note">ملاحظة</option>
                  </select>

                  <input
                    type="text"
                    placeholder="ملخص المتابعة أو المهمة المطلوبة..."
                    value={newActivitySummary}
                    onChange={(e) => setNewActivitySummary(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />

                  <input
                    type="date"
                    value={newActivityDueDate}
                    onChange={(e) => setNewActivityDueDate(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />

                  <Button
                    variant="primary"
                    style={{ background: '#170e5e', color: '#ffffff', fontSize: '12px' }}
                    onClick={() => {
                      if (!newActivitySummary.trim()) {
                        alert('يرجى كتابة ملخص النشاط.');
                        return;
                      }
                      addActivityMutation.mutate({
                        dealId: activeDealDetail.deal.id,
                        data: {
                          activityType: newActivityType,
                          summary: newActivitySummary,
                          dueDate: newActivityDueDate || null,
                        },
                      });
                    }}
                    disabled={addActivityMutation.isPending}
                  >
                    إضافة نشاط
                  </Button>
                </div>
              </div>

              {/* Timeline List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {activeDealDetail.activities?.map((act: CrmActivity) => (
                  <div
                    key={act.id}
                    style={{
                      background: act.isCompleted ? '#f8fafc' : '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={act.isCompleted}
                        onChange={() => toggleActivityMutation.mutate(act.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            marginLeft: '8px',
                          }}
                        >
                          {ACTIVITY_LABELS[act.activityType] || act.activityType}
                        </span>
                        <span
                          style={{
                            fontSize: '13px',
                            color: act.isCompleted ? '#94a3b8' : '#1e293b',
                            textDecoration: act.isCompleted ? 'line-through' : 'none',
                          }}
                        >
                          {act.summary}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#94a3b8' }}>
                      {act.dueDate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarIcon size={12} />
                          {formatDateOnly(act.dueDate)}
                        </span>
                      )}
                      <span>{formatDateOnly(act.createdAt)}</span>
                    </div>
                  </div>
                ))}

                {(!activeDealDetail.activities || activeDealDetail.activities.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
                    لا توجد أنشطة مسجلة حتى الآن
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogShell>
  );
}
