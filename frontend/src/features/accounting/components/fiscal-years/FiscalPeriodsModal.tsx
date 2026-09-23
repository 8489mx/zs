import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import {
  CalendarIcon,
  CheckCircleIcon,
  LockIcon,
  RefreshCwIcon,
  AlertCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { fiscalYearsApi } from '../../api/fiscal-years.api';
import type { FiscalYearRecord, FiscalPeriodRecord } from '../../types/fiscal-years.types';

interface FiscalPeriodsModalProps {
  fiscalYear: FiscalYearRecord;
  onClose: () => void;
  onNotice: (msg: string) => void;
}

export function FiscalPeriodsModal({ fiscalYear, onClose, onNotice }: FiscalPeriodsModalProps) {
  const queryClient = useQueryClient();
  const [selectedPeriodForClose, setSelectedPeriodForClose] = useState<FiscalPeriodRecord | null>(null);
  const [selectedPeriodForReopen, setSelectedPeriodForReopen] = useState<FiscalPeriodRecord | null>(null);
  const [closeNotes, setCloseNotes] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: periods = [], isLoading, isFetched, refetch } = useQuery({
    queryKey: ['accounting', 'fiscal-periods', fiscalYear.id],
    queryFn: () => fiscalYearsApi.listPeriods(fiscalYear.id),
  });

  /**
   * السنوات التي أُنشئت قبل وجود الفترات الشهرية لا فترات لها. التوليد نداء `POST` صريح هنا،
   * لأن قراءة الفترات صارت قراءة بحتة على السيرفر (نمط O33: مسار `GET` لا يكتب).
   * يُجرَّب مرة واحدة لكل فتح للنافذة، فلا يدخل في حلقة إن رفض السيرفر.
   */
  const generateAttempted = useRef(false);
  const generateMutation = useMutation({
    mutationFn: () => fiscalYearsApi.generatePeriods(fiscalYear.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'fiscal-periods', fiscalYear.id] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'تعذر توليد الفترات الشهرية لهذه السنة المالية.');
    },
  });

  useEffect(() => {
    if (!isFetched || generateAttempted.current) return;
    if (periods.length > 0) return;
    generateAttempted.current = true;
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetched, periods.length]);

  const closeMutation = useMutation({
    mutationFn: ({ periodId, notes }: { periodId: number; notes: string }) =>
      fiscalYearsApi.closePeriod(periodId, { notes }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'fiscal-periods', fiscalYear.id] });
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
      setSelectedPeriodForClose(null);
      setCloseNotes('');
      setErrorMessage(null);
      onNotice(res.message || 'تم إقفال الفترة بنجاح.');
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'حدث خطأ أثناء إقفال الفترة.');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: ({ periodId, reason }: { periodId: number; reason: string }) =>
      fiscalYearsApi.reopenPeriod(periodId, { reason }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'fiscal-periods', fiscalYear.id] });
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
      setSelectedPeriodForReopen(null);
      setReopenReason('');
      setErrorMessage(null);
      onNotice(res.message || 'تم إعادة فتح الفترة بنجاح.');
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'حدث خطأ أثناء إعادة فتح الفترة.');
    },
  });

  return (
    <StandardDialog
      isOpen={true}
      onClose={onClose}
      title={`الفترات المحاسبية الشهرية — ${fiscalYear.name}`}
      subtitle={`إدارة وإقفال الفترات الشهرية الـ 12 وتجميد القيود المحاسبية لمنع التعديل بأثر رجعي (${fiscalYear.start_date} إلى ${fiscalYear.end_date})`}
      width="min(1100px, 96vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '440px', boxSizing: 'border-box' }} dir="rtl">
        {/* Alerts / Error notification */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircleIcon size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Top Info Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#475569' }}>
            <span><strong>إجمالي الفترات:</strong> {periods.length}</span>
            <span>•</span>
            <span style={{ color: '#16a34a' }}>
              <strong>المفتوحة:</strong> {periods.filter((p) => p.status === 'open').length}
            </span>
            <span>•</span>
            <span style={{ color: '#1e40af' }}>
              <strong>المقفلة:</strong> {periods.filter((p) => p.status === 'closed').length}
            </span>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => refetch()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 10px' }}
          >
            <RefreshCwIcon size={14} />
            <span>تحديث</span>
          </Button>
        </div>

        {/* Periods Table */}
        <div
          style={{
            flex: 1,
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            overflowY: 'auto',
            maxHeight: '360px',
            backgroundColor: '#ffffff',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>#</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>اسم الفترة</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>الكود</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>تاريخ البداية</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>تاريخ النهاية</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>الحالة</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>تاريخ الإقفال</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    جاري تحميل الفترات الشهرية...
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    لا توجد فترات مسجلة لهذه السنة المالية.
                  </td>
                </tr>
              ) : (
                periods.map((period) => {
                  const isClosed = period.status === 'closed';

                  return (
                    <tr
                      key={period.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isClosed ? '#f8fafc' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#64748b' }}>
                        {period.period_number}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarIcon size={14} color="#64748b" />
                          <span>{period.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#64748b' }}>
                        {period.code || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#334155' }}>
                        {period.start_date}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#334155' }}>
                        {period.end_date}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {isClosed ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            <LockIcon size={11} />
                            <span>مقفلة ومجمدة</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            <CheckCircleIcon size={11} />
                            <span>مفتوحة نشطة</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '11.5px' }}>
                        {period.closed_at ? new Date(period.closed_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {fiscalYear.status === 'closed' ? (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>السنة مقفلة</span>
                        ) : !isClosed ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setErrorMessage(null);
                              setSelectedPeriodForClose(period);
                            }}
                            style={{
                              fontSize: '11.5px',
                              padding: '4px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#f8fafc',
                              borderColor: '#cbd5e1',
                              color: '#1e293b',
                            }}
                          >
                            <LockIcon size={12} />
                            <span>إقفال الشهر</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setErrorMessage(null);
                              setSelectedPeriodForReopen(period);
                            }}
                            style={{
                              fontSize: '11.5px',
                              padding: '4px 10px',
                              color: '#b45309',
                              backgroundColor: '#fffbeb',
                              borderColor: '#fde68a',
                            }}
                          >
                            <span>إعادة فتح</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Sub-dialog: Close Period Confirmation */}
        {selectedPeriodForClose && (
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
              تأكيد إقفال الفترة المحاسبية [{selectedPeriodForClose.name}]
            </div>
            <div style={{ fontSize: '12px', color: '#78350f' }}>
              سيتم تجميد الفترة المحاسبية حتى تاريخ {selectedPeriodForClose.end_date}. لن يتمكن أي مستخدم من ترحيل فواتير أو سندات أو قيود جديدة تقع في هذا الشهر.
            </div>
            <input
              type="text"
              placeholder="ملاحظات الإقفال (اختياري)..."
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedPeriodForClose(null)}
                style={{ fontSize: '12px', padding: '4px 12px' }}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() =>
                  closeMutation.mutate({
                    periodId: selectedPeriodForClose.id,
                    notes: closeNotes,
                  })
                }
                disabled={closeMutation.isPending}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '4px 14px',
                }}
              >
                {closeMutation.isPending ? 'جاري الإقفال...' : 'تأكيد الإقفال وتجميد الشهر'}
              </Button>
            </div>
          </div>
        )}

        {/* Modal Sub-dialog: Reopen Period Confirmation */}
        {selectedPeriodForReopen && (
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
              إعادة فتح الفترة المحاسبية [{selectedPeriodForReopen.name}]
            </div>
            <div style={{ fontSize: '12px', color: '#1e3a8a' }}>
              يتطلب فتح الفترة المحاسبية توثيق سبب استثنائي للرقابة المالية والتدقيق. يجب أن تكون كافة الفترات اللاحقة مفتوحة.
            </div>
            <input
              type="text"
              placeholder="سبب إعادة فتح الفترة (إلزامي للرقابة)..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedPeriodForReopen(null)}
                style={{ fontSize: '12px', padding: '4px 12px' }}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() =>
                  reopenMutation.mutate({
                    periodId: selectedPeriodForReopen.id,
                    reason: reopenReason,
                  })
                }
                disabled={reopenMutation.isPending || !reopenReason.trim()}
                style={{
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '4px 14px',
                }}
              >
                {reopenMutation.isPending ? 'جاري الفتح...' : 'تأكيد إعادة فتح الفترة'}
              </Button>
            </div>
          </div>
        )}

        <StandardDialogFooter
          onClose={onClose}
          cancelText="إغلاق النافذة"
        />
      </div>
    </StandardDialog>
  );
}
