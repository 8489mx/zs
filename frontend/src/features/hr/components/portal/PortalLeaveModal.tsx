import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { employeePortalApi } from '../../api/employee-portal.api';
import { CalendarIcon, XIcon } from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
import { toast } from '@/shared/components/system-alert';

export interface PortalLeaveModalProps {
  open: boolean;
  onClose: () => void;
  leaveTypes?: Array<{ id: number; name: string; isPaid: boolean }>;
  onSuccess: (message: string) => void;
}

export function PortalLeaveModal({
  open,
  onClose,
  leaveTypes,
  onSuccess,
}: PortalLeaveModalProps) {
  const { t: __t } = useTranslation();
  const [leaveTypeId, setLeaveTypeId] = useState<number>(() => leaveTypes?.[0]?.id || 1);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      alert('يرجى تحديد تاريخ بداية ونهاية الإجازة');
      return;
    }

    try {
      setLeaveSubmitting(true);
      const res = await employeePortalApi.requestLeave({
        leaveTypeId,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason,
      });
      setLeaveReason('');
      setLeaveStart('');
      setLeaveEnd('');
      onClose();
      onSuccess(res.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'تعذر تقديم طلب الإجازة');
    } finally {
      setLeaveSubmitting(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(480px, 95vw)"
      ariaLabel={__t('hr.portal.portal_leave_modal.s0', "تقديم طلب إجازة")}
    >
      <div
        dir="rtl"
        style={{
          backgroundColor: '#ffffff',
          padding: '24px',
        }}
      >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={20} color="#170e5e" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  {__t('hr.portal.portal_leave_modal.s1', "تقديم طلب إجازة جديد")}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {__t('hr.portal.portal_leave_modal.s2', "نوع الإجازة:")}
                </label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  {leaveTypes?.map((t: { id: number; name: string; isPaid: boolean }) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.isPaid ? __t('hr.portal.portal_leave_modal.s3', "مدفوعة الأجر") : __t('hr.portal.portal_leave_modal.s4', "غير مدفوعة")})
                    </option>
                  )) || <option value={1}>{__t('hr.portal.portal_leave_modal.s5', "إجازة سنوية")}</option>}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {__t('hr.portal.portal_leave_modal.s6', "تاريخ البداية:")}
                  </label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {__t('hr.portal.portal_leave_modal.s7', "تاريخ النهاية:")}
                  </label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {__t('hr.portal.portal_leave_modal.s8', "سبب الإجازة والملاحظات:")}
                </label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder={__t('hr.portal.portal_leave_modal.s9', "اكتب سبب طلب الإجازة باختصار...")}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: leaveSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {leaveSubmitting ? __t('hr.portal.portal_leave_modal.s10', "جاري الإرسال...") : __t('hr.portal.portal_leave_modal.s11', "إرسال طلب الإجازة")}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {__t('hr.portal.portal_leave_modal.s12', "إلغاء")}
                </button>
              </div>
            </form>
          </div>
    </DialogShell>
  );
}
