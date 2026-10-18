import { useTranslation } from 'react-i18next';
import React from 'react';
import { PdcCheque, ChequeStatus } from '@/features/accounting/api/accounting.api';
import { formatCurrency } from '@/lib/format';
import { FileTextIcon, PrinterIcon, Trash2Icon } from '@/shared/components/icons/AppIcons';

export const STATUS_LABELS: Record<ChequeStatus, { text: string; bg: string; color: string; border: string }> = {
  in_safe: { text: 'في الخزينة', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  under_collection: { text: 'برسم التحصيل', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  collected: { text: 'محصل بالبنك', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  bounced: { text: 'مرتد / مرفوض', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  endorsed: { text: 'مظهر لمورد', bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  returned: { text: 'مردود للعميل', bg: '#f8fafc', color: '#334155', border: '#cbd5e1' },
  cancelled: { text: 'ملغى', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  issued: { text: 'محرر للمورد', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  cleared: { text: 'تم الصرف بنكياً', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
};

interface PdcChequesTableProps {
  isLoading: boolean;
  cheques: PdcCheque[];
  todayStr: string;
  in7DaysStr: string;
  onOpenActionModal: (cheque: PdcCheque, action: 'deposit' | 'collect' | 'clear' | 'bounce' | 'endorse' | 'return' | 'voucher') => void;
  onDirectAction: (cheque: PdcCheque, action: 'restore_to_safe' | 'cancel') => void;
  onDeleteCheque: (cheque: PdcCheque) => void;
}

export const PdcChequesTable: React.FC<PdcChequesTableProps> = ({
  isLoading,
  cheques,
  todayStr,
  in7DaysStr,
  onOpenActionModal,
  onDirectAction,
  onDeleteCheque,
}) => {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        {t('accounting.pdc_cheques_table.s0', "جاري تحميل حافظة الشيكات...")}
      </div>
    );
  }

  if (cheques.length === 0) {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: '#94a3b8',
          }}
        >
          <FileTextIcon size={24} />
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: 0 }}>{t('accounting.pdc_cheques_table.s1', "لا توجد شيكات مطابقة للبحث")}</h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
          {t('accounting.pdc_cheques_table.s2', "يمكنك تسجيل ورقة قبض أو دفع جديدة عبر الأزرار بالأعلى")}
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>{t('accounting.pdc_cheques_table.s3', "رقم الشيك")}</th>
            <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>{t('accounting.pdc_cheques_table.s4', "الطرف (العميل / المورد)")}</th>
            <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>{t('accounting.pdc_cheques_table.s5', "البنك المسحوب عليه")}</th>
            <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>{t('accounting.pdc_cheques_table.s6', "المبلغ")}</th>
            <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>{t('accounting.pdc_cheques_table.s7', "تاريخ التحرير")}</th>
            <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>{t('accounting.pdc_cheques_table.s8', "تاريخ الاستحقاق")}</th>
            <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>{t('accounting.pdc_cheques_table.s9', "الحالة")}</th>
            <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>{t('accounting.pdc_cheques_table.s10', "بنك الإيداع / تفاصيل")}</th>
            <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>{t('accounting.pdc_cheques_table.s11', "الإجراءات")}</th>
          </tr>
        </thead>
        <tbody>
          {cheques.map((c) => {
            const statusInfo = STATUS_LABELS[c.status] || {
              text: c.status,
              bg: '#f1f5f9',
              color: '#64748b',
              border: '#e2e8f0',
            };

            const isSettled = ['collected', 'cleared', 'cancelled', 'returned'].includes(c.status);
            const isOverdue = !isSettled && c.due_date < todayStr;
            const isDueSoon = !isSettled && c.due_date >= todayStr && c.due_date <= in7DaysStr;

            return (
              <tr
                key={c.id}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: isOverdue ? 'rgba(254, 242, 242, 0.4)' : '#ffffff',
                }}
              >
                {/* Cheque Number */}
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}>#</span>
                    <span>{c.cheque_number}</span>
                  </div>
                  {c.drawer_name && (
                    <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', fontFamily: 'sans-serif' }}>
                      {t('accounting.pdc_cheques_table.s12', "الساحب:")} {c.drawer_name}
                    </span>
                  )}
                </td>

                {/* Partner Name */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{c.partner_name}</div>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {c.partner_type === 'customer' ? t('accounting.pdc_cheques_table.s13', "عميل") : t('accounting.pdc_cheques_table.s14', "مورد")}
                  </span>
                </td>

                {/* Bank Name */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ color: '#334155', fontWeight: 600 }}>{c.bank_name}</div>
                  {c.branch_name && (
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{t('accounting.pdc_cheques_table.s15', "فرع")} {c.branch_name}</span>
                  )}
                </td>

                {/* Amount */}
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {formatCurrency(c.amount)} {c.currency}
                </td>

                {/* Issue Date */}
                <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                  {c.issue_date}
                </td>

                {/* Due Date & Alerts */}
                <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontWeight: isOverdue || isDueSoon ? 800 : 600,
                        color: isOverdue ? '#dc2626' : isDueSoon ? '#d97706' : '#334155',
                      }}
                    >
                      {c.due_date}
                    </span>
                    {isOverdue && (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                        {t('accounting.pdc_cheques_table.s16', "متأخر")}
                      </span>
                    )}
                    {isDueSoon && (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                        {t('accounting.pdc_cheques_table.s17', "خلال أسبوع")}
                      </span>
                    )}
                  </div>
                </td>

                {/* Status Badge */}
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: statusInfo.bg,
                      color: statusInfo.color,
                      border: `1px solid ${statusInfo.border}`,
                    }}
                  >
                    {statusInfo.text}
                  </span>
                </td>

                {/* Deposit / Clearing info */}
                <td style={{ padding: '12px 16px', fontSize: '11px', color: '#475569' }}>
                  {c.status === 'under_collection' && (
                    <div>
                      <span>{t('accounting.pdc_cheques_table.s18', "مودع بتاريخ")} {c.deposit_date}</span>
                    </div>
                  )}
                  {c.status === 'collected' && (
                    <span style={{ color: '#047857', fontWeight: 700 }}>
                      {t('accounting.pdc_cheques_table.s19', "حصل في")} {c.cleared_date}
                    </span>
                  )}
                  {c.status === 'cleared' && (
                    <span style={{ color: '#047857', fontWeight: 700 }}>
                      {t('accounting.pdc_cheques_table.s20', "صرف في")} {c.cleared_date}
                    </span>
                  )}
                  {c.status === 'bounced' && (
                    <div style={{ color: '#b91c1c' }}>
                      <span style={{ fontWeight: 700, display: 'block' }}>{c.bounced_reason}</span>
                      <span style={{ fontSize: '10px', color: '#ef4444' }}>
                        {t('accounting.pdc_cheques_table.s21', "في")} {c.bounced_date}
                        {c.bounced_fee > 0 && ` | مصاريف: ${c.bounced_fee}`}
                      </span>
                    </div>
                  )}
                  {c.status === 'endorsed' && (
                    <span style={{ color: '#7e22ce', fontWeight: 700 }}>
                      {t('accounting.pdc_cheques_table.s22', "ظهر للمورد:")} {c.endorsed_to_supplier_name}
                    </span>
                  )}
                  {c.status === 'in_safe' && (
                    <span style={{ color: '#94a3b8' }}>{t('accounting.pdc_cheques_table.s23', "متاح في الخزينة")}</span>
                  )}
                  {c.status === 'issued' && (
                    <span style={{ color: '#94a3b8' }}>{t('accounting.pdc_cheques_table.s24', "محرر للمورد")}</span>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {/* Actions for Receivables */}
                    {c.type === 'receivable' && c.status === 'in_safe' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenActionModal(c, 'deposit')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title={t('accounting.pdc_cheques_table.s25', "إيداع الشيك برسم التحصيل في البنك")}
                        >
                          {t('accounting.pdc_cheques_table.s26', "إيداع بالبنك")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenActionModal(c, 'collect')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title={t('accounting.pdc_cheques_table.s27', "تحصيل مباشر")}
                        >
                          {t('accounting.pdc_cheques_table.s28', "تحصيل")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenActionModal(c, 'endorse')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#faf5ff',
                            color: '#7e22ce',
                            border: '1px solid #e9d5ff',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title={t('accounting.pdc_cheques_table.s29', "تظهير الشيك لمورد")}
                        >
                          {t('accounting.pdc_cheques_table.s30', "تظهير")}
                        </button>
                      </>
                    )}

                    {c.type === 'receivable' && c.status === 'under_collection' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenActionModal(c, 'collect')}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(5, 150, 105, 0.25)',
                          }}
                          title={t('accounting.pdc_cheques_table.s31', "تأكيد تحصيل الشيك وإضافته للرصيد")}
                        >
                          {t('accounting.pdc_cheques_table.s32', "تأكيد التحصيل")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenActionModal(c, 'bounce')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title={t('accounting.pdc_cheques_table.s33', "تسجيل ارتداد ورفض الشيك")}
                        >
                          {t('accounting.pdc_cheques_table.s34', "ارتداد")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDirectAction(c, 'restore_to_safe')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title={t('accounting.pdc_cheques_table.s35', "استرجاع الشيك للخزينة")}
                        >
                          {t('accounting.pdc_cheques_table.s36', "للخزينة")}
                        </button>
                      </>
                    )}

                    {/* Actions for Payables */}
                    {c.type === 'payable' && c.status === 'issued' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenActionModal(c, 'clear')}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(5, 150, 105, 0.25)',
                          }}
                          title={t('accounting.pdc_cheques_table.s37', "تأكيد صرف الشيك وخصمه من البنك")}
                        >
                          {t('accounting.pdc_cheques_table.s38', "تأكيد الصرف")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenActionModal(c, 'bounce')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title={t('accounting.pdc_cheques_table.s39', "ارتداد الشيك")}
                        >
                          {t('accounting.pdc_cheques_table.s40', "ارتداد")}
                        </button>
                      </>
                    )}

                    {/* Bounced Recovery Action */}
                    {c.status === 'bounced' && (
                      <button
                        type="button"
                        onClick={() => onDirectAction(c, 'restore_to_safe')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {t('accounting.pdc_cheques_table.s41', "إعادة للحافظة")}
                      </button>
                    )}

                    {/* Voucher Print Button */}
                    <button
                      type="button"
                      onClick={() => onOpenActionModal(c, 'voucher')}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={t('accounting.pdc_cheques_table.s42', "معاينة وطباعة سند الشيك")}
                    >
                      <PrinterIcon size={14} />
                    </button>

                    {/* Delete Button (Allowed for safe, issued, or cancelled) */}
                    {['in_safe', 'issued', 'cancelled', 'bounced'].includes(c.status) && (
                      <button
                        type="button"
                        onClick={() => onDeleteCheque(c)}
                        style={{
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid #fee2e2',
                          backgroundColor: '#ffffff',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={t('accounting.pdc_cheques_table.s43', "حذف الشيك")}
                      >
                        <Trash2Icon size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
