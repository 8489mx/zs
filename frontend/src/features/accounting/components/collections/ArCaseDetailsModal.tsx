import { useState, useEffect, type FC } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import { arCollectionsApi, type ArCollectionCaseDetails } from '../../api/ar-collections.api';
import {
  ClockIcon,
  PhoneIcon,
  MessageSquareIcon,
  FileTextIcon,
  CalendarIcon,
} from '@/shared/components/icons/AppIcons';

interface ArCaseDetailsModalProps {
  open: boolean;
  onClose: () => void;
  caseId: string | null;
  onRefreshList: () => void;
  onOpenPromiseModal: () => void;
  onOpenLogModal: () => void;
}

export const ArCaseDetailsModal: FC<ArCaseDetailsModalProps> = ({
  open,
  onClose,
  caseId,
  onRefreshList,
  onOpenPromiseModal,
  onOpenLogModal,
}) => {
  const [data, setData] = useState<ArCollectionCaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingBlock, setTogglingBlock] = useState(false);

  useEffect(() => {
    if (open && caseId) {
      loadDetails(caseId);
    } else {
      setData(null);
    }
  }, [open, caseId]);

  const loadDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await arCollectionsApi.getCaseDetails(id);
      setData(res);
    } catch (err: any) {
      toast.error('تعذر جلب تفاصيل ملف التحصيل');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCreditBlock = async () => {
    if (!data?.case) return;
    const currentBlocked = Boolean(data.case.is_credit_blocked);
    const nextBlock = !currentBlocked;

    setTogglingBlock(true);
    try {
      await arCollectionsApi.toggleCreditBlock(data.case.id, {
        block: nextBlock,
        reason: nextBlock ? 'تم الإيقاف يدوياً من مسؤول التحصيل' : 'تم رفع الحظر يدوياً من مسؤول التحصيل',
      });
      toast.success(nextBlock ? 'تم إيقاف البيع الآجل للعميل.' : 'تم رفع حظر البيع الآجل عن العميل.');
      loadDetails(data.case.id);
      onRefreshList();
    } catch (err: any) {
      toast.error('تعذر تعديل حالة حظر البيع الآجل');
    } finally {
      setTogglingBlock(false);
    }
  };

  if (!open) return null;

  const c = data?.case;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`ملف تحصيل متكامل: ${c?.customer_name || 'جاري التحميل...'}`}
      subtitle={`رقم الملف: ${caseId} | الحالة: ${c?.status === 'promised_to_pay' ? 'تعهد بالسداد' : c?.status === 'escalated' ? 'تصعيد / إنذار' : c?.status === 'settled' ? 'مسدد بالكامل' : 'قيد المتابعة'}`}
      size="lg"
    >
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          جاري تحميل بيانات وتاريخ الملف...
        </div>
      ) : c ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Customer Summary Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>اسم العميل ورقم الهاتف</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{c.customer_name}</div>
              <div style={{ fontSize: '12px', color: '#475569' }}>{c.customer_phone || 'لا يوجد هاتف'}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>إجمالي المتأخرات / الرصيد</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
                {Number(c.total_overdue).toLocaleString('ar-EG')} ج.م
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                من إجمالي رصيد {Number(c.customer_balance).toLocaleString('ar-EG')} ج.م
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>مستوى التصعيد الحالي</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#170e5e', marginTop: '2px' }}>
                {c.level_name || 'غير محدد'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                أقدم تأخير: {c.oldest_overdue_days} يوماً
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>موقف البيع الآجل</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: c.is_credit_blocked ? '#fef2f2' : '#ecfdf5',
                    color: c.is_credit_blocked ? '#991b1b' : '#065f46',
                    border: `1px solid ${c.is_credit_blocked ? '#fecaca' : '#a7f3d0'}`,
                  }}
                >
                  {c.is_credit_blocked ? 'محظور من الآجل' : 'مسموح بالآجل'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={togglingBlock}
                  onClick={handleToggleCreditBlock}
                  style={{ fontSize: '11px', padding: '3px 8px', height: 'auto' }}
                >
                  {c.is_credit_blocked ? 'إلغاء الحظر' : 'حظر الآجل'}
                </Button>
              </div>
              {c.credit_block_reason && (
                <div style={{ fontSize: '10.5px', color: '#991b1b', marginTop: '2px' }}>
                  {c.credit_block_reason}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Ribbon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {c.whatsAppUrl && (
              <a
                href={c.whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#25d366',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <MessageSquareIcon size={16} color="#ffffff" />
                <span>إرسال مطالبة عبر الواتساب</span>
              </a>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={onOpenPromiseModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
            >
              <CalendarIcon size={15} color="#170e5e" />
              <span>تسجيل تعهد سداد</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={onOpenLogModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
            >
              <PhoneIcon size={15} color="#170e5e" />
              <span>توثيق إجراء تواصل</span>
            </Button>
          </div>

          {/* Unpaid Invoices Breakdown */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileTextIcon size={16} color="#170e5e" />
              <span>الفواتير المفتوحة ذات المديونيات المستحقة</span>
            </div>
            {data?.invoices?.length ? (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
                  <thead style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>رقم الفاتورة</th>
                      <th style={{ padding: '8px 12px' }}>تاريخ الإصدار</th>
                      <th style={{ padding: '8px 12px' }}>إجمالي الفاتورة</th>
                      <th style={{ padding: '8px 12px' }}>المسدد</th>
                      <th style={{ padding: '8px 12px' }}>المتبقي المستحق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv, idx) => (
                      <tr key={inv.id} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none', backgroundColor: '#ffffff' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#170e5e' }}>
                          {inv.invoice_number || inv.doc_no || `#${inv.id}`}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>
                          {new Date(inv.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {Number(inv.total).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td style={{ padding: '8px 12px', color: '#047857' }}>
                          {Number(inv.paid_amount).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#b91c1c' }}>
                          {Number(inv.unpaid_amount).toLocaleString('ar-EG')} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                لا توجد فواتير مفتوحة مسجلة.
              </div>
            )}
          </div>

          {/* Interaction Logs Timeline */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClockIcon size={16} color="#170e5e" />
              <span>سجل المتابعات والإجراءات المتخذة</span>
            </div>
            {data?.logs?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {data.logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#e2e8f0',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#334155',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.interaction_type === 'call'
                        ? 'اتصال'
                        : log.interaction_type === 'whatsapp'
                        ? 'واتساب'
                        : log.interaction_type === 'promise_to_pay'
                        ? 'تعهد سداد'
                        : log.interaction_type === 'block_credit'
                        ? 'حظر آجل'
                        : log.interaction_type === 'unblock_credit'
                        ? 'إلغاء حظر'
                        : log.interaction_type === 'level_escalation'
                        ? 'تصعيد آلي'
                        : log.interaction_type}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12.5px', color: '#1e293b' }}>
                        {log.details || log.result_status}
                      </div>
                      {log.promised_date && (
                        <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600, marginTop: '2px' }}>
                          موعد السداد المتعهد به: {log.promised_date} {log.promised_amount ? `(مبلغ: ${Number(log.promised_amount).toLocaleString('ar-EG')} ج.م)` : ''}
                        </div>
                      )}
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px' }}>
                        {new Date(log.created_at).toLocaleString('ar-EG')} {log.created_by_name ? `بواسطة ${log.created_by_name}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                لا توجد إجراءات مسجلة بعد في هذا الملف.
              </div>
            )}
          </div>
        </div>
      ) : null}

      <StandardDialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          إغلاق النافذة
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
};
