import { useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { systemConfirm, toast } from '@/shared/components/system-alert';
import { vanSalesApi, type VanFieldReturnRecord } from '../api/van-sales.api';
import { RefreshCwIcon, FileTextIcon } from '@/shared/components/icons/AppIcons';

const REASON_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  damaged: { label: 'بضاعة تالفة / كسر', color: '#b91c1c', bg: '#fef2f2' },
  expired: { label: 'منتهية الصلاحية', color: '#c2410c', bg: '#fff7ed' },
  manufacturing_defect: { label: 'عيب صناعة / تعبئة', color: '#b45309', bg: '#fefce8' },
  stagnant: { label: 'بضاعة راكدة', color: '#4338ca', bg: '#eef2ff' },
  order_mismatch: { label: 'خطأ في التوريد', color: '#0369a1', bg: '#f0f9ff' },
  customer_request: { label: 'رغبة العميل / رفض', color: '#475569', bg: '#f1f5f9' },
};

export function VanFieldReturnsAdminTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedReturn, setSelectedReturn] = useState<VanFieldReturnRecord | null>(null);
  const [rejectModalReturn, setRejectModalReturn] = useState<VanFieldReturnRecord | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const {
    data: returns = [],
    isLoading,
    refetch,
  } = useQuery<VanFieldReturnRecord[]>({
    queryKey: ['van-admin-field-returns', statusFilter],
    queryFn: () => vanSalesApi.listAdminReturns({ status: statusFilter || undefined }),
    refetchInterval: 15000,
  });

  const pendingReturns = returns.filter((r) => r.status === 'pending_approval');
  const pendingTotal = pendingReturns.reduce((sum, r) => sum + r.totalAmount, 0);
  const approvedReturns = returns.filter((r) => r.status === 'approved');
  const approvedTotal = approvedReturns.reduce((sum, r) => sum + r.totalAmount, 0);

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => vanSalesApi.approveReturn(id),
    onSuccess: () => {
      toast.success('تم قبول واعتماد إذن المرتجع، وقيد التسوية المخزنية والمالية بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['van-admin-field-returns'] });
      queryClient.invalidateQueries({ queryKey: ['van-sales-admin-trips'] });
      setSelectedReturn(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل اعتماد المرتجع');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => vanSalesApi.rejectReturn(id, reason),
    onSuccess: () => {
      toast.info('تم رفض إذن المرتجع');
      queryClient.invalidateQueries({ queryKey: ['van-admin-field-returns'] });
      setSelectedReturn(null);
      setRejectModalReturn(null);
      setRejectReasonInput('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل رفض المرتجع');
    },
  });

  const handleApprove = async (ret: VanFieldReturnRecord) => {
    const ok = await systemConfirm({
      title: 'اعتماد وقبول إذن المرتجع الميداني',
      message: `هل تود بالتأكيد اعتماد المرتجع #${ret.docNo} للعميل "${ret.customerName}" بقيمة ${ret.totalAmount.toFixed(2)} ${getGlobalCurrencySymbol()}؟ سيتم خصم القيمة من حساب العميل وإعادة البضاعة للمخزن.`,
      confirmText: 'اعتماد وقبول المرتجع',
      cancelText: 'إلغاء',
      variant: 'primary',
    });
    if (ok) {
      approveMutation.mutate(ret.id);
    }
  };

  const openRejectDialog = (ret: VanFieldReturnRecord) => {
    setRejectModalReturn(ret);
    setRejectReasonInput('');
  };

  const confirmReject = () => {
    if (!rejectModalReturn) return;
    rejectMutation.mutate({
      id: rejectModalReturn.id,
      reason: rejectReasonInput.trim() || 'تم الرفض بواسطة الإدارة',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', display: 'block' }}>مرتجعات قيد المراجعة والاعتماد</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', display: 'block', marginTop: '4px' }}>
            {pendingReturns.length} <span style={{ fontSize: '13px', color: '#f59e0b' }}>إذن</span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', display: 'block' }}>قيمة المرتجعات المعلقة</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#991b1b', display: 'block', marginTop: '4px' }}>
            {pendingTotal.toFixed(2)} <span style={{ fontSize: '13px', color: '#fca5a5' }}><CurrencySymbol /></span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'block' }}>إجمالي المرتجعات المعتمدة</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', display: 'block', marginTop: '4px' }}>
            {approvedReturns.length} <span style={{ fontSize: '13px', color: '#86efac' }}>إذن</span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#170e5e', display: 'block' }}>قيمة المرتجعات المعتمدة</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#170e5e', display: 'block', marginTop: '4px' }}>
            {approvedTotal.toFixed(2)} <span style={{ fontSize: '13px', color: '#a5b4fc' }}><CurrencySymbol /></span>
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>تصفية حسب الحالة:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'كافة المرتجعات', value: '' },
              { label: 'قيد الاعتماد', value: 'pending_approval' },
              { label: 'تم الاعتماد', value: 'approved' },
              { label: 'مرفوض', value: 'rejected' },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === f.value ? '#170e5e' : '#f1f5f9',
                  color: statusFilter === f.value ? '#ffffff' : '#475569',
                  transition: 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#334155',
          }}
        >
          <RefreshCwIcon size={14} />
          تحديث
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>جاري تحميل أذونات المرتجعات...</div>
        ) : returns.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <FileTextIcon size={40} color="#cbd5e1" />
            <h4 style={{ margin: '12px 0 4px', color: '#475569', fontSize: '15px', fontWeight: 800 }}>لا توجد أذونات مرتجعات مطابقة</h4>
            <p style={{ margin: 0, fontSize: '12px' }}>أذونات المرتجع الميدانية التي يسجلها المناديب ستظهر هنا فور إرسالها.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>رقم الإذن</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>مندوب الفان</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>العميل / المحل</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>الفاتورة الأصلية</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>سبب المرتجع</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>إجمالي القيمة</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => {
                const reasonInfo = REASON_LABELS[r.returnReason] || { label: r.returnReason, color: '#475569', bg: '#f1f5f9' };
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                      #{r.docNo}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {r.repName}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155' }}>
                      {r.customerName}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontFamily: 'monospace' }}>
                      {r.saleDocNo ? `#${r.saleDocNo}` : 'مرتجع عام'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          color: reasonInfo.color,
                          backgroundColor: reasonInfo.bg,
                          border: `1px solid ${reasonInfo.color}33`,
                        }}
                      >
                        {reasonInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                      {r.totalAmount.toFixed(2)} <CurrencySymbol />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor:
                            r.status === 'approved'
                              ? '#dcfce7'
                              : r.status === 'rejected'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            r.status === 'approved'
                              ? '#15803d'
                              : r.status === 'rejected'
                              ? '#b91c1c'
                              : '#b45309',
                          border: `1px solid ${
                            r.status === 'approved'
                              ? '#bbf7d0'
                              : r.status === 'rejected'
                              ? '#fecaca'
                              : '#fde68a'
                          }`,
                        }}
                      >
                        {r.status === 'approved'
                          ? 'معتمد ومقيد'
                          : r.status === 'rejected'
                          ? 'مرفوض'
                          : 'بانتظار الاعتماد'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedReturn(r)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          معاينة
                        </button>
                        {r.status === 'pending_approval' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(r)}
                              disabled={approveMutation.isPending}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#15803d',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              قبول
                            </button>
                            <button
                              type="button"
                              onClick={() => openRejectDialog(r)}
                              disabled={rejectMutation.isPending}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #fca5a5',
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              رفض
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Return Details Modal */}
      {selectedReturn && (
        <StandardDialog
          open={Boolean(selectedReturn)}
          onClose={() => setSelectedReturn(null)}
          title={`تفاصيل إذن المرتجع الميداني #${selectedReturn.docNo}`}
          subtitle={`المندوب: ${selectedReturn.repName} • العميل: ${selectedReturn.customerName}`}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>الفاتورة الأصلية:</span>
                <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{selectedReturn.saleDocNo ? `#${selectedReturn.saleDocNo}` : 'مرتجع عام'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>سبب المرتجع:</span>
                <strong style={{ fontSize: '12.5px', color: '#b91c1c' }}>{REASON_LABELS[selectedReturn.returnReason]?.label || selectedReturn.returnReason}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>إجمالي القيمة:</span>
                <strong style={{ fontSize: '14px', color: '#059669' }}>{selectedReturn.totalAmount.toFixed(2)} <CurrencySymbol /></strong>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>الصنف</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>الكمية</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>سعر الوحدة</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReturn.items.map((it: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{it.productName || `صنف #${it.productId}`}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>{it.qty}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{it.unitPrice.toFixed(2)} <CurrencySymbol /></td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{(it.qty * it.unitPrice).toFixed(2)} <CurrencySymbol /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedReturn.notes && (
              <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong>ملاحظات المندوب:</strong> {selectedReturn.notes}
              </div>
            )}

            {selectedReturn.rejectionReason && (
              <div style={{ fontSize: '12px', color: '#991b1b', backgroundColor: '#fef2f2', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <strong>سبب الرفض:</strong> {selectedReturn.rejectionReason}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setSelectedReturn(null)}>
                إغلاق
              </Button>
              {selectedReturn.status === 'pending_approval' && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(selectedReturn)}
                    style={{ backgroundColor: '#15803d', color: '#ffffff' }}
                  >
                    قبول واعتماد المرتجع
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => openRejectDialog(selectedReturn)}
                    style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                  >
                    رفض المرتجع
                  </Button>
                </>
              )}
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Reject Reason Dialog */}
      {rejectModalReturn && (
        <StandardDialog
          open={Boolean(rejectModalReturn)}
          onClose={() => setRejectModalReturn(null)}
          title={`رفض إذن المرتجع #${rejectModalReturn.docNo}`}
          subtitle={`العميل: ${rejectModalReturn.customerName} • المندوب: ${rejectModalReturn.repName}`}
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                سبب رفض إذن المرتجع <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder="وضح سبب الرفض ليظهر للمندوب في سجل المرتجعات الميدانية..."
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setRejectModalReturn(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                disabled={rejectMutation.isPending}
                onClick={confirmReject}
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                {rejectMutation.isPending ? 'جاري الرفض...' : 'تأكيد رفض المرتجع'}
              </Button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
