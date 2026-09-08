import React from 'react';
import type { TradeInTransaction } from '@/types/domain-models/tradein';
import { TradeInIcons } from './TradeInIcons';
import { conditionLabels } from './types';

interface TradeInTableProps {
  transactions: TradeInTransaction[];
  isLoading: boolean;
  serialLabel: string;
  copiedId: string | null;
  onCopyText: (text: string, e: React.MouseEvent) => void;
  onOpenDisclaimer: (t: TradeInTransaction) => void;
  onSendWhatsApp: (t: TradeInTransaction) => void;
}

export function TradeInTable({
  transactions,
  isLoading,
  serialLabel,
  copiedId,
  onCopyText,
  onOpenDisclaimer,
  onSendWhatsApp,
}: TradeInTableProps) {
  if (isLoading) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
        جاري تحميل سجل المعاملات...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#94a3b8' }}>
          <TradeInIcons.Device />
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: '0 0 4px' }}>لا توجد معاملات مطابقة للبحث</h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>يمكنك إضافة عملية شراء جهاز مستعمل جديدة بالنقر على الزر أعلاه</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '10px 14px', fontWeight: 700 }}>رقم المستند</th>
            <th style={{ padding: '10px 14px', fontWeight: 700 }}>بيانات العميل (البائع)</th>
            <th style={{ padding: '10px 14px', fontWeight: 700 }}>الجهاز والموديل</th>
            <th style={{ padding: '10px 14px', fontWeight: 700 }}>{serialLabel}</th>
            <th style={{ padding: '10px 14px', fontWeight: 700 }}>الحالة والتقييم</th>
            <th style={{ padding: '10px 14px', fontWeight: 700 }}>سعر الشراء</th>
            <th style={{ padding: '10px 14px', fontWeight: 700 }}>النوع والربط</th>
            <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const cond = (conditionLabels as any)[(t as any).deviceConditionState] || conditionLabels.used;
            return (
              <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}>
                  {t.docNo}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.sellerName}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{t.sellerPhone}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>الرقم القومي: {t.sellerNationalId}</div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>
                    {t.deviceBrand ? `${t.deviceBrand} ` : ''}{t.deviceModel}
                  </div>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{t.serialNumber}</span>
                    <button
                      type="button"
                      onClick={(e) => onCopyText(t.serialNumber, e)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copiedId === t.serialNumber ? '#16a34a' : '#94a3b8', padding: '2px' }}
                      title="نسخ السيريال"
                    >
                      <TradeInIcons.Copy />
                    </button>
                  </div>
                  {t.imei2 && (
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>IMEI 2: {t.imei2}</div>
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 600, background: cond.bg, color: cond.color, border: `1px solid ${cond.border}` }}>
                    {cond.label}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {(t.agreedPurchasePrice || 0).toLocaleString('ar-EG')} ج.م
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600, background: t.transactionType === 'exchange_trade_in' ? '#f5f3ff' : '#eff6ff', color: t.transactionType === 'exchange_trade_in' ? '#7c3aed' : '#1d4ed8' }}>
                    {t.transactionType === 'exchange_trade_in' ? 'استبدال Trade-In' : 'شراء نقدي'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => onOpenDisclaimer(t)}
                      style={{ padding: '4px 8px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <TradeInIcons.Printer />
                      <span>إقرار التنازل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSendWhatsApp(t)}
                      style={{ padding: '4px 6px', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', cursor: 'pointer' }}
                      title="إرسال إشعار للعميل عبر واتساب"
                    >
                      <TradeInIcons.WhatsApp />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
