import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { useAuthStore } from '@/stores/auth-store';
import { useHrMutations } from '@/features/hr/hooks/useHr';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { money, text } from '@/features/hr/pages/payroll/hr-payroll.helpers';
import { toast } from '@/shared/components/system-alert';
import { getErrorMessage } from '@/lib/errors';
import { SlidersIcon, BuildingIcon } from '@/shared/components/icons/AppIcons';
import type { HrPayrollRun, HrPayrollRunItem } from '@/types/domain';

export interface PayPayrollTargetItem {
  itemId: number;
  runId: number;
  employeeId: number;
  employeeName: string;
  employeeNo?: string;
  netPay: number;
  periodMonth?: string;
}

export interface PayPayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRun?: HrPayrollRun | null;
  targetItem?: PayPayrollTargetItem | null;
  canApprovePayroll: boolean;
  onSuccess?: () => void;

  // Optional legacy props for compatibility
  payChannel?: 'cash' | 'bank' | 'drawer';
  onPayChannelChange?: (val: 'cash' | 'bank' | 'drawer') => void;
  paymentReference?: string;
  onPaymentReferenceChange?: (val: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  isPending?: boolean;
  formError?: string;
}

export function PayPayrollRunModal({
  isOpen,
  onClose,
  selectedRun,
  targetItem,
  canApprovePayroll,
  onSuccess,
  payChannel: legacyPayChannel,
  onPayChannelChange,
  paymentReference: legacyPaymentRef,
  onPaymentReferenceChange,
  onSubmit: legacyOnSubmit,
  isPending: legacyIsPending,
  formError: legacyFormError,
}: PayPayrollRunModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mutations = useHrMutations();
  const currentUser = useAuthStore((state) => state.user);

  const [paymentChannel, setPaymentChannel] = useState<'drawer' | 'cash' | 'bank'>('drawer');
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [allowOverdraft, setAllowOverdraft] = useState(false);
  const [internalError, setInternalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync legacy props if provided
  useEffect(() => {
    if (legacyPayChannel) {
      setPaymentChannel(legacyPayChannel);
    }
  }, [legacyPayChannel]);

  useEffect(() => {
    if (legacyPaymentRef !== undefined) {
      setPaymentReference(legacyPaymentRef);
    }
  }, [legacyPaymentRef]);

  // Reset internal states on open
  useEffect(() => {
    if (isOpen) {
      setInternalError('');
      setAllowOverdraft(false);
      setPaymentReference('');
    }
  }, [isOpen]);

  // Fetch open cashier shifts
  const { data: shiftData, isLoading: isLoadingShifts } = useQuery({
    queryKey: ['pos.shifts.current'],
    queryFn: () => http<{ cashierShifts?: Array<Record<string, unknown>> }>('/api/cashier-shifts?filter=open&status=open&pageSize=100'),
    enabled: isOpen,
    staleTime: 5000,
  });

  const openShifts = useMemo(() => {
    const raw = (shiftData?.cashierShifts || []).filter(
      (s: any) => String(s.status || '').toLowerCase() === 'open'
    );
    // Sort descending by expected cash (from highest funds to lowest funds, appearing right-to-left in RTL)
    return [...raw].sort((a: any, b: any) => {
      const cashA = Number(a.expectedCash ?? a.expected_cash ?? 0);
      const cashB = Number(b.expectedCash ?? b.expected_cash ?? 0);
      return cashB - cashA;
    });
  }, [shiftData?.cashierShifts]);

  // Match shift: prefer current user's open shift, otherwise the first open shift in the branch
  const userOpenShift = useMemo(() => {
    return openShifts.find(
      (s: any) =>
        String(s.openedById || s.opened_by) === String(currentUser?.id) &&
        String(s.status || 'open') === 'open'
    );
  }, [openShifts, currentUser?.id]);

  // Selected shift: either explicitly chosen by ID, or fallback to user's open shift, or first open shift
  const selectedShift = useMemo(() => {
    if (!openShifts.length) return null;
    if (selectedShiftId) {
      const match = openShifts.find((s: any) => String(s.id) === String(selectedShiftId));
      if (match) return match;
    }
    return userOpenShift || openShifts[0];
  }, [openShifts, selectedShiftId, userOpenShift]);

  useEffect(() => {
    if (selectedShift?.id && String(selectedShift.id) !== selectedShiftId) {
      setSelectedShiftId(String(selectedShift.id));
    } else if (!openShifts.length && selectedShiftId) {
      setSelectedShiftId('');
    }
  }, [selectedShift?.id, openShifts.length]);

  const isSingleItem = Boolean(targetItem);
  const isPending = isSubmitting || (legacyIsPending ?? false) || mutations.payPayrollRun?.isPending || mutations.payPayrollRunItem?.isPending;

  // Calculate amount to pay
  const approvedItems = useMemo(() => {
    if (isSingleItem) return [];
    const items = (selectedRun?.items || []) as HrPayrollRunItem[];
    return items.filter((item) => item.status === 'approved');
  }, [isSingleItem, selectedRun?.items]);

  const approvedNetTotal = useMemo(() => {
    if (isSingleItem && targetItem) {
      return Number(targetItem.netPay || 0);
    }
    if (approvedItems.length > 0) {
      return approvedItems.reduce((sum, item) => sum + Number(item.netPay || 0), 0);
    }
    return Number(selectedRun?.totalNetPay || 0);
  }, [isSingleItem, targetItem, approvedItems, selectedRun?.totalNetPay]);

  // Drawer cash balance of the selected cashier's drawer
  const drawerExpectedCash = selectedShift
    ? Number((selectedShift as any).expectedCash ?? (selectedShift as any).expected_cash ?? 0)
    : 0;

  const isDrawerShort = paymentChannel === 'drawer' && selectedShift && drawerExpectedCash < approvedNetTotal;

  const handleChannelSelect = (channel: 'drawer' | 'cash' | 'bank') => {
    setPaymentChannel(channel);
    setInternalError('');
    if (onPayChannelChange) {
      onPayChannelChange(channel);
    }
  };

  const handleRefChange = (val: string) => {
    setPaymentReference(val);
    if (onPaymentReferenceChange) {
      onPaymentReferenceChange(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalError('');

    if (paymentChannel === 'bank' && !paymentReference.trim()) {
      setInternalError('يرجى إدخال رقم العملية أو مرجع التحويل البنكي للمتابعة.');
      return;
    }

    if (paymentChannel === 'drawer' && !selectedShift) {
      setInternalError('لا توجد أي وردية كاشير مفتوحة حالياً بالفرع للصرف منها. اختر الخزينة أو التحويل البنكي.');
      return;
    }

    if (paymentChannel === 'drawer' && isDrawerShort && !allowOverdraft) {
      setInternalError('النقدية بالدرج المحدد غير كافية. اختر درجا آخر به سيولة، أو فعّل خيار السماح بكشف الدرج بالسالب، أو اختر الصرف من الخزينة.');
      return;
    }

    // If parent passed a legacy onSubmit and no targetItem, delegate
    if (legacyOnSubmit && !targetItem) {
      legacyOnSubmit(e);
      return;
    }

    try {
      setIsSubmitting(true);

      if (isSingleItem && targetItem) {
        // Individual employee payout
        await mutations.payPayrollRunItem.mutateAsync({
          id: String(targetItem.itemId),
          itemId: targetItem.itemId,
          payload: {
            paymentChannel,
            shiftId: paymentChannel === 'drawer' && selectedShiftId ? Number(selectedShiftId) : undefined,
            paymentReference: paymentChannel === 'bank' ? paymentReference.trim() : undefined,
            allowOverdraft,
          },
        });
        toast.success(`تم صرف راتب الموظف (${targetItem.employeeName}) بنجاح وتسجيل السند.`);
      } else if (selectedRun?.id) {
        // Full payroll run payout
        await mutations.payPayrollRun.mutateAsync({
          id: String(selectedRun.id),
          payload: {
            paymentChannel,
            shiftId: paymentChannel === 'drawer' && selectedShiftId ? Number(selectedShiftId) : undefined,
            paymentReference: paymentChannel === 'bank' ? paymentReference.trim() : undefined,
            allowOverdraft,
          },
        });
        toast.success('تم تسجيل صرف كشف المرتبات وتوليد القيود المحاسبية بنجاح.');
      }

      await queryClient.invalidateQueries({ queryKey: ['hr'] });
      await queryClient.invalidateQueries({ queryKey: ['pos.shifts.current'] });
      await queryClient.invalidateQueries({ queryKey: ['pos.shifts'] });
      await queryClient.invalidateQueries({ queryKey: ['cashier-shifts'] });
      await queryClient.invalidateQueries({ queryKey: ['treasury'] });

      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err);
      setInternalError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isSingleItem
    ? `صرف راتب الموظف: ${targetItem?.employeeName}`
    : `صرف كشف المرتبات (${text(selectedRun?.periodMonth)})`;

  const subtitle = isSingleItem
    ? 'تسجيل صرف مستحقات الموظف الفردية وتوليد سند الصرف والقيد المحاسبي.'
    : 'صرف المرتبات لكافة الموظفين المعتمدين في هذا الكشف وتوليد القيود المحاسبية.';

  if (!isOpen) return null;

  return (
    <StandardDialog
      open={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      compact
      width="min(680px, 96vw)"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          submitText={isSingleItem ? 'تأكيد صرف الراتب' : 'تأكيد صرف الكشف'}
          cancelText={t('common.cancel', 'إلغاء')}
        />
      )}
    >
      {!canApprovePayroll ? (
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
          {t('hr.payroll.pay_payroll_run_modal.s9', "لا تملك صلاحية تنفيذ هذا الإجراء.")}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '2px' }}>
          {/* 1. Payment Summary Banner */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '1px' }}>
                {isSingleItem ? 'الموظف المستحق للصرف:' : 'إجمالي المستحقين في الكشف:'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {isSingleItem ? (
                  <span>{targetItem?.employeeName} {targetItem?.employeeNo ? `(#${targetItem.employeeNo})` : ''}</span>
                ) : (
                  <span>
                    {approvedItems.length > 0 ? `${approvedItems.length} موظف معتمد` : `${selectedRun?.items?.length ?? 0} موظف`}
                    {selectedRun?.periodMonth ? ` — لشهر ${selectedRun.periodMonth}` : ''}
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, marginBottom: '1px' }}>
                المبلغ الصافي للصرف
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#166534', whiteSpace: 'nowrap' }}>
                {money(approvedNetTotal)}
              </div>
            </div>
          </div>

          {/* 2. Payment Channel Radio Tiles */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              مصدر ومنفذ الصرف *
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
              {/* Option A: Cashier Shift Drawer */}
              <div
                onClick={() => handleChannelSelect('drawer')}
                style={{
                  border: paymentChannel === 'drawer' ? '2px solid #170e5e' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  background: paymentChannel === 'drawer' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '15px',
                        height: '15px',
                        borderRadius: '50%',
                        border: paymentChannel === 'drawer' ? '5px solid #170e5e' : '2px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box',
                        flexShrink: 0,
                      }}
                    />
                    <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>
                      درج الكاشير (ورديات النقدية النشطة)
                    </strong>
                  </div>

                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontWeight: 600,
                      background: !selectedShift ? '#fef2f2' : (openShifts.length > 1 ? '#eef2ff' : (drawerExpectedCash < 0 ? '#fffbeb' : '#ecfdf5')),
                      color: !selectedShift ? '#991b1b' : (openShifts.length > 1 ? '#3730a3' : (drawerExpectedCash < 0 ? '#b45309' : '#065f46')),
                      border: `1px solid ${!selectedShift ? '#fecaca' : (openShifts.length > 1 ? '#c7d2fe' : (drawerExpectedCash < 0 ? '#fde68a' : '#a7f3d0'))}`,
                    }}
                  >
                    {!selectedShift
                      ? 'لا توجد وردية مفتوحة'
                      : openShifts.length > 1
                        ? `${openShifts.length} أدراج وورديات مفتوحة`
                        : (drawerExpectedCash < 0 ? 'وردية مفتوحة (رصيد مكشوف)' : 'وردية مفتوحة')}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', paddingRight: '23px' }}>
                  خصم مباشر من درج الكاشير في نقطة البيع وتسجيل حركة منصرف نقدية بالوردية المختارة.
                </div>

                {/* Open Shift Details & Drawer Selection */}
                {paymentChannel === 'drawer' && (
                  <div style={{ marginTop: '8px', paddingRight: '23px' }} onClick={(e) => e.stopPropagation()}>
                    {isLoadingShifts ? (
                      <div style={{ fontSize: '11.5px', color: '#64748b', padding: '6px 0' }}>
                        جارٍ التحقق من ورديات وأدراج الكاشير المفتوحة...
                      </div>
                    ) : openShifts.length === 0 ? (
                      <div
                        style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: '#9f1239',
                          fontSize: '11.5px',
                        }}
                      >
                        لا توجد أي وردية كاشير مفتوحة حالياً بالفرع. يرجى فتح وردية من نقطة البيع أو اختيار الصرف من الخزينة الرئيسية.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {openShifts.length > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <SlidersIcon size={14} style={{ color: '#170e5e' }} />
                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b' }}>
                                حدد درج الكاشير المراد الصرف منه ({openShifts.length} أدراج نشطة):
                              </span>
                            </div>
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                              اضغط لاختيار الدرج
                            </span>
                          </div>
                        )}

                        {/* Grid of Drawers (Max 2 rows, sorted descending from highest cash to lowest, RTL) */}
                        <div
                          className="thin-scrollbar"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: openShifts.length === 1 ? '1fr' : openShifts.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
                            gap: '6px',
                            maxHeight: openShifts.length > 6 ? '150px' : 'none',
                            overflowY: openShifts.length > 6 ? 'auto' : 'visible',
                            padding: '2px',
                          }}
                        >
                          {openShifts.map((shift: any) => {
                            const isSelected = String(shift.id) === String(selectedShift?.id);
                            const shiftCash = Number(shift.expectedCash ?? shift.expected_cash ?? 0);
                            const isShort = shiftCash < approvedNetTotal;
                            const cashierName = String(shift.openedByName || shift.opened_by_name || 'الكاشير');
                            const isMyShift = String(shift.openedById || shift.opened_by) === String(currentUser?.id);
                            const docNo = shift.docNo ? String(shift.docNo) : `وردية #${shift.id}`;

                            return (
                              <div
                                key={shift.id}
                                onClick={() => {
                                  setSelectedShiftId(String(shift.id));
                                  setInternalError('');
                                }}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  padding: '7px 10px',
                                  borderRadius: '8px',
                                  border: isSelected ? '2px solid #170e5e' : '1px solid #cbd5e1',
                                  backgroundColor: isSelected ? '#ffffff' : '#f8fafc',
                                  boxShadow: isSelected ? '0 2px 6px rgba(23, 14, 94, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxSizing: 'border-box',
                                  minHeight: '58px',
                                  position: 'relative',
                                }}
                              >
                                {/* Top: Cashier Name + Radio Indicator */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                      <strong
                                        style={{
                                          fontSize: '12px',
                                          fontWeight: 800,
                                          color: isSelected ? '#170e5e' : '#0f172a',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          display: 'block',
                                        }}
                                        title={cashierName}
                                      >
                                        {cashierName}
                                      </strong>
                                      {isMyShift && (
                                        <span
                                          style={{
                                            fontSize: '9px',
                                            padding: '1px 4px',
                                            borderRadius: '3px',
                                            background: '#e0e7ff',
                                            color: '#3730a3',
                                            fontWeight: 700,
                                          }}
                                        >
                                          درجك
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '9.5px', color: '#64748b', display: 'block', marginTop: '1px', direction: 'ltr', textAlign: 'right' }}>
                                      {docNo}
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      width: '14px',
                                      height: '14px',
                                      borderRadius: '50%',
                                      border: isSelected ? '4px solid #170e5e' : '2px solid #cbd5e1',
                                      backgroundColor: '#ffffff',
                                      boxSizing: 'border-box',
                                      flexShrink: 0,
                                      marginTop: '1px',
                                    }}
                                  />
                                </div>

                                {/* Bottom: Expected Cash Amount */}
                                <div style={{ marginTop: '5px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px' }}>
                                  <span style={{ fontSize: '10.5px', color: '#64748b', flexShrink: 0 }}>الرصيد:</span>
                                  <strong
                                    dir="ltr"
                                    style={{
                                      fontSize: '11.5px',
                                      fontWeight: 800,
                                      whiteSpace: 'nowrap',
                                      color: shiftCash < 0 ? '#b45309' : (isShort ? '#dc2626' : '#166534'),
                                    }}
                                  >
                                    {money(shiftCash)}
                                  </strong>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Operational Dispatch Notice */}
                        {selectedShift && (
                          <div
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <BuildingIcon size={14} style={{ color: '#170e5e', flexShrink: 0 }} />
                            <div>
                              <span>سيتم الخصم المباشر من درج الكاشير (</span>
                              <strong style={{ color: '#170e5e' }}>
                                {String(selectedShift.openedByName || selectedShift.opened_by_name || 'الكاشير')}
                              </strong>
                              <span>) بمبلغ </span>
                              <strong dir="ltr" style={{ color: '#0f172a' }}>{money(approvedNetTotal)}</strong>
                              <span>؛ وتخفيض النقدية المتوقعة بعهدته تلقائياً فور التأكيد.</span>
                            </div>
                          </div>
                        )}

                        {/* Insufficient Cash Warning & Overdraft Checkbox */}
                        {isDrawerShort && (
                          <div
                            style={{
                              background: '#fffbeb',
                              border: '1.5px solid #f59e0b',
                              borderRadius: '8px',
                              padding: '8px 12px',
                            }}
                          >
                            <div style={{ color: '#b45309', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>
                              تنبيه: النقدية المحسوبة في درج ({String(selectedShift?.openedByName || selectedShift?.opened_by_name || 'الكاشير')}) ({money(drawerExpectedCash)}) أقل من المبلغ المطلوب صرفه ({money(approvedNetTotal)}).
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11.5px', color: '#92400e', fontWeight: 600 }}>
                              <input
                                type="checkbox"
                                checked={allowOverdraft}
                                onChange={(e) => {
                                  setAllowOverdraft(e.target.checked);
                                  if (e.target.checked) setInternalError('');
                                }}
                                style={{ width: '15px', height: '15px', accentColor: '#170e5e', cursor: 'pointer' }}
                              />
                              <span>السماح بكشف الدرج بالسالب (استثناء إداري مصرح به)</span>
                            </label>
                            <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #fcd34d', fontSize: '10.5px', color: '#78350f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                              <span>أو اختر درجا آخر به سيولة كافية، أو الصرف من الصندوق الرئيسي:</span>
                              <button
                                type="button"
                                onClick={() => handleChannelSelect('cash')}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #d97706',
                                  borderRadius: '4px',
                                  color: '#92400e',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '2px 8px',
                                  fontSize: '10.5px',
                                }}
                              >
                                التحويل للخزينة العامة ←
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Option B: Main Treasury */}
              <div
                onClick={() => handleChannelSelect('cash')}
                style={{
                  border: paymentChannel === 'cash' ? '2px solid #170e5e' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  background: paymentChannel === 'cash' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      border: paymentChannel === 'cash' ? '5px solid #170e5e' : '2px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                  />
                  <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>
                    الخزينة العامة (الصندوق الرئيسي)
                  </strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', paddingRight: '23px' }}>
                  صرف مباشر نقداً من الخزينة الرئيسية للمنشأة وتوليد قيد يومية دائن لحساب الخزينة.
                </div>
              </div>

              {/* Option C: Bank Transfer */}
              <div
                onClick={() => handleChannelSelect('bank')}
                style={{
                  border: paymentChannel === 'bank' ? '2px solid #170e5e' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  background: paymentChannel === 'bank' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      border: paymentChannel === 'bank' ? '5px solid #170e5e' : '2px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                  />
                  <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>
                    تحويل بنكي / محفظة إلكترونية
                  </strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', paddingRight: '23px' }}>
                  سداد الرواتب عبر الحساب البنكي أو المحافظ الإلكترونية المعتمدة.
                </div>

                {/* Bank Reference Input */}
                {paymentChannel === 'bank' && (
                  <div style={{ marginTop: '10px', paddingRight: '24px' }} onClick={(e) => e.stopPropagation()}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      رقم مرجع التحويل البنكي / إشعار السداد *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={paymentReference}
                      onChange={(e) => handleRefChange(e.target.value)}
                      placeholder="مثال: TXN-261026-9482 / مرجع البنك"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <small style={{ color: '#64748b', fontSize: '11px', display: 'block', marginTop: '3px' }}>
                      سجل رقم العملية الصادرة من البنك أو كشف الحساب لتوثيق السند.
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error display */}
          {(internalError || legacyFormError) && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            >
              {internalError || legacyFormError}
            </div>
          )}
        </form>
      )}
    </StandardDialog>
  );
}
