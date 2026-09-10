import React, { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import {
  ApprovalRequest,
  ApprovalRequestLog,
  getApprovalRequestDetails,
  approveApprovalRequest,
  rejectApprovalRequest,
} from '../api/approvals.api';
import { CheckIcon, XIcon, ClockIcon, ShieldAlertIcon } from '@/shared/components/icons/AppIcons';

interface ApprovalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ApprovalRequest | null;
  onSuccess: () => void;
}

export const ApprovalActionModal: React.FC<ApprovalActionModalProps> = ({
  isOpen,
  onClose,
  request,
  onSuccess,
}) => {
  const [logs, setLogs] = useState<ApprovalRequestLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && request?.id) {
      setLoading(true);
      setShowRejectBox(false);
      setApproveNotes('');
      setRejectReason('');
      setErrorMessage('');
      getApprovalRequestDetails(request.id)
        .then((res) => {
          setLogs(res.logs || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, request?.id]);

  if (!isOpen || !request) return null;

  const handleApprove = async () => {
    setActionLoading(true);
    setErrorMessage('');
    try {
      await approveApprovalRequest(request.id, approveNotes);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'فشلت عملية الاعتماد.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setErrorMessage('يرجى كتابة سبب الرفض إجبارياً.');
      return;
    }
    setActionLoading(true);
    setErrorMessage('');
    try {
      await rejectApprovalRequest(request.id, rejectReason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'فشلت عملية الرفض.');
    } finally {
      setActionLoading(false);
    }
  };

  const moduleLabels: Record<string, string> = {
    purchase_orders: 'أمر شراء',
    purchases: 'فاتورة مشتريات',
    expenses: 'سند مصروفات',
    treasury_transactions: 'حركة خزينة',
  };

  const isPending = request.status === 'pending';

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`مراجعة طلب الاعتماد: ${request.record_ref}`}
      subtitle={`الموديول: ${moduleLabels[request.module] || request.module} | المبلغ: ${Number(request.amount).toLocaleString('ar-EG')} ${request.currency}`}
      width="680px"
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: 'var(--font-body)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldAlertIcon size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'details' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'details' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            بيانات الطلب
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'logs' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'logs' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: 'var(--font-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ClockIcon size={14} />
            سجل الاعتمادات ({logs.length})
          </button>
        </div>

        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Summary Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                backgroundColor: '#f8fafc',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>المعاملة المرجعية</span>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: '#0f172a' }}>
                  {request.record_ref}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>إجمالي القيمة المالية</span>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: '#170e5e' }}>
                  {Number(request.amount).toLocaleString('ar-EG')} {request.currency}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>مقدم الطلب</span>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-body)', color: '#334155' }}>
                  {request.requested_by_name || 'مستخدم النظام'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>مرحلة الاعتماد</span>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-body)', color: '#2563eb' }}>
                  المستوى {request.current_tier} من إجمالي {request.max_tier}
                </div>
              </div>
            </div>

            {request.notes && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>ملاحظات الطلب:</span>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--font-body)', color: '#334155' }}>
                  {request.notes}
                </p>
              </div>
            )}

            {isPending && !showRejectBox && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#334155' }}>
                  ملاحظات الاعتماد (اختياري):
                </label>
                <input
                  type="text"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="أدخل أي توجيهات أو ملاحظات إضافية..."
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {isPending && showRejectBox && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '12px',
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                }}
              >
                <label style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#9f1239' }}>
                  سبب رفض الطلب (إلزامي):
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="يرجى كتابة سبب رفض المعاملة لتسجيله في سجل المراجعة..."
                  rows={3}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #f43f5e',
                    fontSize: 'var(--font-body)',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>جاري تحميل السجل...</div>
            ) : logs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>لا توجد حركات مسجلة بعد.</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: log.action === 'approved' ? '#f0fdf4' : log.action === 'rejected' ? '#fef2f2' : '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: '#0f172a' }}>
                      {log.action_by_name || 'مسؤول'} ({log.action_role || 'إدارة'})
                    </span>
                    <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--font-body)', color: '#475569' }}>
                    {log.notes || (log.action === 'approved' ? 'تمت الموافقة' : 'تم الرفض')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={actionLoading}>
            إغلاق
          </Button>

          {isPending && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {!showRejectBox ? (
                <>
                  <Button
                    variant="danger"
                    onClick={() => setShowRejectBox(true)}
                    disabled={actionLoading}
                  >
                    رفض الطلب
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    <CheckIcon size={16} />
                    {request.current_tier < request.max_tier
                      ? `اعتماد المستوى ${request.current_tier} والتصعيد`
                      : 'اعتماد نهائي وتمرير المعاملة'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setShowRejectBox(false)}
                    disabled={actionLoading}
                  >
                    تراجع
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    <XIcon size={16} />
                    تأكيد الرفض الرسمي
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </StandardDialog>
  );
};
