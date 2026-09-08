import React, { useState } from 'react';
import { employeePortalApi } from '../../api/employee-portal.api';
import { CalendarIcon, XIcon } from '@/shared/components/icons/AppIcons';

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
      alert(err?.response?.data?.message || err?.message || 'تعذر تقديم طلب الإجازة');
    } finally {
      setLeaveSubmitting(false);
    }
  }

  return (
    <div
      dir="rtl"
      style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="portal-modal-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={20} color="#170e5e" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  تقديم طلب إجازة جديد
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  نوع الإجازة:
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
                  {leavesData?.leaveTypes?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.isPaid ? 'مدفوعة الأجر' : 'غير مدفوعة'})
                    </option>
                  )) || <option value={1}>إجازة سنوية</option>}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    تاريخ البداية:
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
                    تاريخ النهاية:
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
                  سبب الإجازة والملاحظات:
                </label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="اكتب سبب طلب الإجازة باختصار..."
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
                  {leaveSubmitting ? 'جاري الإرسال...' : 'إرسال طلب الإجازة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
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
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
