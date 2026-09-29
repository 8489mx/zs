import React from 'react';
import type { DuplicateBillCheckResult, DuplicateBillMatch } from '../api/purchases.api';
import { AlertTriangleIcon, CheckShieldIcon } from '@/shared/components/icons/AppIcons';

interface VendorDuplicateBillAlertProps {
  checkResult: DuplicateBillCheckResult | null;
  confirmedWarning: boolean;
  onToggleConfirmWarning: (confirmed: boolean) => void;
  allowOverride: boolean;
  onToggleAllowOverride: (allow: boolean) => void;
  overrideReason: string;
  onChangeOverrideReason: (reason: string) => void;
  isAdmin: boolean;
}

export function VendorDuplicateBillAlert({
  checkResult,
  confirmedWarning,
  onToggleConfirmWarning,
  allowOverride,
  onToggleAllowOverride,
  overrideReason,
  onChangeOverrideReason,
  isAdmin,
}: VendorDuplicateBillAlertProps) {
  if (!checkResult || !checkResult.hasDuplicates || checkResult.matches.length === 0) {
    return null;
  }

  const isBlocking = checkResult.hasBlockingDuplicates;
  const borderCol = isBlocking ? '#ef4444' : '#f59e0b';
  const bgCol = isBlocking ? '#fef2f2' : '#fffbeb';
  const textCol = isBlocking ? '#991b1b' : '#92400e';
  const badgeBg = isBlocking ? '#fee2e2' : '#fef3c7';

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        border: `1px solid ${borderCol}`,
        backgroundColor: bgCol,
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontSize: '13px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: textCol, fontWeight: 700 }}>
        <AlertTriangleIcon size={18} />
        <span>
          {isBlocking
            ? 'تنبيه رقابي حاسم: تم رصد فاتورة مشتريات مكررة لنفس المورد'
            : 'تنبيه رقابي استباقي: اشتباه في تكرار فاتورة مشتريات سابقة لنفس المورد'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {checkResult.matches.map((m: DuplicateBillMatch) => (
          <div
            key={`${m.purchaseId}-${m.reason}`}
            style={{
              padding: '8px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              color: '#1e293b',
              fontSize: '12.5px',
              lineHeight: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <span
                style={{
                  fontWeight: 600,
                  color: m.severity === 'blocking' ? '#b91c1c' : '#b45309',
                  backgroundColor: badgeBg,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                  fontSize: '11.5px',
                }}
              >
                {m.severity === 'blocking' ? 'تطابق تام' : 'اشتباه قيمة أو تشابه'}
              </span>
              <span>{m.message}</span>
            </div>
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px' }}>
              المبلغ: {m.total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} | التاريخ: {m.date}
            </div>
          </div>
        ))}
      </div>

      {isBlocking ? (
        <div
          style={{
            borderTop: '1px dashed #fca5a5',
            paddingTop: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {isAdmin ? (
            <>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#991b1b',
                }}
              >
                <input
                  type="checkbox"
                  checked={allowOverride}
                  onChange={(e) => onToggleAllowOverride(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#170e5e', cursor: 'pointer' }}
                />
                <CheckShieldIcon size={16} />
                <span>طلب تجاوز حظر الفاتورة المكررة (صلاحية إدارية خاصة للمسؤولين)</span>
              </label>

              {allowOverride && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    سبب التجاوز والاعتماد الإداري (إلزامي - 10 أحرف على الأقل):
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => onChangeOverrideReason(e.target.value)}
                    placeholder="مثال: فاتورة ملحقة معتمدة لتعديل أسعار توريد شحنة سابقة..."
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                  {overrideReason.trim().length > 0 && overrideReason.trim().length < 10 && (
                    <small style={{ color: '#ef4444' }}>
                      السبب قصير جداً ({overrideReason.trim().length}/10 أحرف مطلوبة).
                    </small>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: 600 }}>
              تم حظر حفظ هذه الفاتورة نظراً لتطابق رقم فاتورة المورد مع فاتورة سابقة. لتجاوز الحظر، يرجى مراجعة مسؤول النظام (Admin).
            </div>
          )}
        </div>
      ) : (
        <div style={{ borderTop: '1px dashed #fcd34d', paddingTop: '8px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              color: '#92400e',
            }}
          >
            <input
              type="checkbox"
              checked={confirmedWarning}
              onChange={(e) => onToggleConfirmWarning(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#170e5e', cursor: 'pointer' }}
            />
            <span>أؤكد أن هذه فاتورة توريد مختلفة وليست مكررة، وأرغب في متابعة الحفظ</span>
          </label>
        </div>
      )}
    </div>
  );
}
