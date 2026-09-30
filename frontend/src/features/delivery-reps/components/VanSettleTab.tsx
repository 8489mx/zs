import React, { useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { Button } from '@/shared/ui/button';
import {
  CheckIcon,
  AlertTriangleIcon,
  ReceiptIcon,
  FileTextIcon,
  PackageIcon,
  DollarSignIcon,
  ClockIcon,
} from '@/shared/components/icons/AppIcons';
import { VanActiveTripResponse, VanStockItem } from '../api/van-sales.api';

interface VanSettleTabProps {
  tripData: VanActiveTripResponse['trip'];
  sales?: {
    id: number;
    docNo: string;
    total: number;
    subtotal?: number;
    discount?: number;
    paymentMethod: string;
    createdAt: string;
    customerName?: string;
    customerPhone?: string;
  }[];
  collections?: {
    id: number;
    amount: number;
    createdAt: string;
    customerName: string;
    note?: string;
    gpsLat?: number;
    gpsLng?: number;
  }[];
  returns?: {
    id: number;
    docNo: string;
    totalAmount: number;
    returnReason: string;
    refundMethod?: 'credit' | 'cash';
    status: string;
    createdAt: string;
    customerName?: string;
  }[];
  inventory?: VanStockItem[];
  countedCash: string;
  onCountedCashChange: (val: string) => void;
  unloadRemaining: boolean;
  onUnloadRemainingChange: (val: boolean) => void;
  onSubmitSettle: () => void;
  isSubmitting: boolean;
}

export const VanSettleTab: React.FC<VanSettleTabProps> = ({
  tripData,
  sales = [],
  collections = [],
  returns = [],
  inventory = [],
  countedCash,
  onCountedCashChange,
  unloadRemaining,
  onUnloadRemainingChange,
  onSubmitSettle,
  isSubmitting,
}) => {
  const [activeSection, setActiveSection] = useState<'settle' | 'activity'>('settle');
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'collections' | 'returns' | 'inventory'>('sales');

  const salesAmount = Number(tripData?.salesAmount || 0);
  const creditSales = Number(tripData?.creditSales || 0);
  const cashSales = Math.max(0, salesAmount - creditSales);
  const collectionsTotal = collections.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const returnsAmount = Number(tripData?.returnsAmount || 0);
  const cashRefunds = Number(tripData?.cashRefunds || 0);
  const creditReturns = Math.max(0, returnsAmount - cashRefunds);
  const cashCollected = Number(tripData?.cashCollected || 0);
  const countedNum = Number(countedCash);
  const totalActivities = sales.length + collections.length + returns.length;
  const totalDiscounts = sales.reduce((sum, s) => sum + Number(s.discount || 0), 0);

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return { label: 'نقدي (كاش)', bg: '#dcfce7', color: '#15803d' };
      case 'credit':
        return { label: 'آجل (ذمم)', bg: '#fef3c7', color: '#b45309' };
      case 'split':
        return { label: 'مجزأ (كاش + آجل)', bg: '#e0e7ff', color: '#3730a3' };
      case 'card':
        return { label: 'بطاقة / بنكي', bg: '#f1f5f9', color: '#334155' };
      default:
        return { label: method, bg: '#f1f5f9', color: '#475569' };
    }
  };

  const getReturnStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'معتمد ومضاف للسيارة', bg: '#dcfce7', color: '#15803d' };
      case 'pending':
        return { label: 'قيد مراجعة الإدارة', bg: '#fef3c7', color: '#b45309' };
      case 'rejected':
        return { label: 'مرفوض', bg: '#fee2e2', color: '#b91c1c' };
      default:
        return { label: status, bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
      }}
      dir="rtl"
    >
      {/* Top Segmented Sub-Tabs: Settle vs Activity */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f1f5f9',
          padding: '4px',
          borderRadius: '10px',
          gap: '6px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSection('settle')}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            padding: '8px 6px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSection === 'settle' ? '#ffffff' : 'transparent',
            color: activeSection === 'settle' ? '#170e5e' : '#64748b',
            fontWeight: 800,
            fontSize: '12.5px',
            boxShadow: activeSection === 'settle' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          تصفية ومطابقة العهدة
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('activity')}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            padding: '8px 6px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSection === 'activity' ? '#ffffff' : 'transparent',
            color: activeSection === 'activity' ? '#170e5e' : '#64748b',
            fontWeight: 800,
            fontSize: '12.5px',
            boxShadow: activeSection === 'activity' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          حركة وسجل اليوم ({totalActivities})
        </button>
      </div>

      {activeSection === 'settle' ? (
        /* SECTION 1: FINANCIAL SETTLEMENT LEDGER & COUNTING */
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            <div style={{ width: '34px', height: '34px', backgroundColor: '#eef2ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ReceiptIcon size={18} color="#170e5e" strokeWidth={2} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                تصفية اليومية ومطابقة العهدة النقدية
              </h3>
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b' }}>
                بيان تسليم النقدية ومطابقة مبيعات وتحصيلات ومرتجعات السيارة
              </p>
            </div>
          </div>

        {/* Detailed Financial Ledger */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            fontSize: '11.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {/* Gross Sales */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748b' }} />
              إجمالي مبيعات اليوم المحققة:
            </span>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              {salesAmount.toFixed(2)} <CurrencySymbol />
            </span>
          </div>

          {/* Cash Sales */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600, paddingRight: '12px' }}>
            <span>• مبيعات نقدية (كاش مباشر بالسيارة):</span>
            <span style={{ fontWeight: 800 }}>
              +{cashSales.toFixed(2)} <CurrencySymbol />
            </span>
          </div>

          {/* Credit Sales */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 600, paddingRight: '12px' }}>
            <span>• مبيعات آجلة (ذمم مدينة على المحلات):</span>
            <span style={{ fontWeight: 800 }}>
              {creditSales.toFixed(2)} <CurrencySymbol />
            </span>
          </div>

          {/* Collections */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontWeight: 600, borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
              تحصيلات نقدية (سندات قبض مديونيات):
            </span>
            <span style={{ fontWeight: 800, color: '#0284c7' }}>
              +{collectionsTotal.toFixed(2)} <CurrencySymbol />
            </span>
          </div>

          {/* Field Returns */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 600, borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
              إجمالي المرتجعات الميدانية ({returns.length} إذن):
            </span>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              {returnsAmount.toFixed(2)} <CurrencySymbol />
            </span>
          </div>

          {/* Cash Refunds vs Credit Returns */}
          {cashRefunds > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700, paddingRight: '12px' }}>
              <span>• مرتجعات نقدية سُددت كاش للعميل من السيارة:</span>
              <span style={{ fontWeight: 800 }}>
                -{cashRefunds.toFixed(2)} <CurrencySymbol />
              </span>
            </div>
          )}

          {creditReturns > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 600, paddingRight: '12px', fontSize: '10.5px' }}>
              <span>• مرتجعات آجلة (خُصمت من حساب العميل + البضاعة بالسيارة):</span>
              <span style={{ fontWeight: 700 }}>
                {creditReturns.toFixed(2)} <CurrencySymbol />
              </span>
            </div>
          )}

          {/* Promotional Discounts Granted Strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: totalDiscounts > 0 ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${totalDiscounts > 0 ? '#fecaca' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              color: totalDiscounts > 0 ? '#b91c1c' : '#475569',
              fontWeight: 700,
              marginTop: '2px',
            }}
          >
            <span>إجمالي الخصومات والعروض الترويجية الممنوحة:</span>
            <span style={{ fontWeight: 800 }}>
              {totalDiscounts.toFixed(2)} <CurrencySymbol />
            </span>
          </div>

          {/* Net Cash Required (Single Source of Truth) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ecfdf5',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #a7f3d0',
              marginTop: '2px',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#065f46', display: 'block' }}>
                صافي النقدية المتوقع تسليمها (كاش الدرج الإلزامي):
              </span>
              <span style={{ fontSize: '10px', color: '#047857' }}>
                = كاش المبيعات ({cashSales.toFixed(0)}) + التحصيلات ({collectionsTotal.toFixed(0)}) - مرتجعات الكاش ({cashRefunds.toFixed(0)})
              </span>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#065f46' }}>
              {cashCollected.toFixed(2)} <CurrencySymbol />
            </span>
          </div>
        </div>

        {/* Cash Counting Input */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
            الكاش الفعلي الموجود معك للتوريد ({getGlobalCurrencySymbol()}):
          </label>
          <input
            type="number"
            step="0.01"
            value={countedCash}
            onChange={(e) => onCountedCashChange(e.target.value)}
            placeholder="أدخل المبلغ بعد العد الفعلي للأوراق النقدية..."
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0 10px',
              fontSize: '14px',
              fontWeight: 800,
              color: '#0f172a',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          {/* Reconciliation Match Indicator */}
          {countedCash !== '' && !isNaN(countedNum) && (
            <div
              style={{
                marginTop: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor:
                  countedNum === cashCollected
                    ? '#dcfce7'
                    : countedNum < cashCollected
                    ? '#fee2e2'
                    : '#e0f2fe',
                color:
                  countedNum === cashCollected
                    ? '#15803d'
                    : countedNum < cashCollected
                    ? '#b91c1c'
                    : '#0369a1',
                border: `1px solid ${
                  countedNum === cashCollected
                    ? '#86efac'
                    : countedNum < cashCollected
                    ? '#fca5a5'
                    : '#7dd3fc'
                }`,
              }}
            >
              {countedNum === cashCollected ? (
                <>
                  <CheckIcon size={14} color="#15803d" strokeWidth={2.5} />
                  <span>الكاش مطابق تماماً للعهدة النقدية بنسبة 100% (لا يوجد عجز).</span>
                </>
              ) : countedNum < cashCollected ? (
                <>
                  <AlertTriangleIcon size={14} color="#b91c1c" strokeWidth={2} />
                  <span>
                    يوجد عجز نقدي بقيمة {(cashCollected - countedNum).toFixed(2)} <CurrencySymbol /> (سيتم تقييده على عهدة المندوب).
                  </span>
                </>
              ) : (
                <>
                  <CheckIcon size={14} color="#0369a1" strokeWidth={2} />
                  <span>
                    يوجد فائض نقدي بقيمة {(countedNum - cashCollected).toFixed(2)} <CurrencySymbol /> (سيتم توريده لحساب المنشأة).
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Unload Remaining Inventory Checkbox */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
          }}
        >
          <input
            type="checkbox"
            id="unloadCheck"
            checked={unloadRemaining}
            onChange={(e) => onUnloadRemainingChange(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#170e5e' }}
          />
          <label htmlFor="unloadCheck" style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer' }}>
            تفريغ البضاعة المتبقية في السيارة ({inventory.length} صنف) وإعادتها للمستودع تلقائياً
          </label>
        </div>

        {/* Submit Settle Action */}
        <Button
          variant="primary"
          onClick={onSubmitSettle}
          disabled={isSubmitting}
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            height: '42px',
            fontSize: '13px',
            fontWeight: 800,
            borderRadius: '8px',
          }}
        >
          {isSubmitting ? 'جاري التصفية والتوريد...' : 'تأكيد التصفية وإغلاق اليومية وتوريد الكاش'}
        </Button>
      </div>
      ) : (
      /* SECTION 2: TRIP ACTIVITY & MOVEMENT EXPLORER */
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <div style={{ width: '34px', height: '34px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileTextIcon size={18} color="#170e5e" strokeWidth={2} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              حركة رحلة اليوم وسجل العمليات
            </h3>
            <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b' }}>
              مراجعة الفواتير والتحصيلات والمرتجعات ومخزون السيارة
            </p>
          </div>
        </div>

        {/* Subtab Navigation Bar (Single Row, 4 tabs fit 100% without cut-off) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            gap: '4px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('sales')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '6px 2px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeSubTab === 'sales' ? '#170e5e' : 'transparent',
              color: activeSubTab === 'sales' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '11px',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            فواتير ({sales.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('collections')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '6px 2px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeSubTab === 'collections' ? '#170e5e' : 'transparent',
              color: activeSubTab === 'collections' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '11px',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            تحصيلات ({collections.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('returns')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '6px 2px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeSubTab === 'returns' ? '#170e5e' : 'transparent',
              color: activeSubTab === 'returns' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '11px',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            مرتجعات ({returns.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('inventory')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '6px 2px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeSubTab === 'inventory' ? '#170e5e' : 'transparent',
              color: activeSubTab === 'inventory' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '11px',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            المخزون ({inventory.length})
          </button>
        </div>

        {/* Subtab Contents Container (Bounded with Slim Scroll) */}
        <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {/* 1. SALES INVOICES */}
          {activeSubTab === 'sales' && (
            sales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                <ReceiptIcon size={28} color="#cbd5e1" style={{ margin: '0 auto 6px', display: 'block' }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>لم تصدر أي فواتير بيع في هذه الرحلة حتى الآن</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sales.map((sale) => {
                  const badge = getPaymentMethodBadge(sale.paymentMethod);
                  return (
                    <div
                      key={sale.id}
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
                          فاتورة #{sale.docNo}
                        </span>
                        <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>
                          {Number(sale.total || 0).toFixed(2)} <CurrencySymbol />
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11.5px' }}>
                        <span style={{ color: '#334155', fontWeight: 700 }}>
                          العميل: {sale.customerName || 'عميل نقدي سريع'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '10.5px',
                            }}
                          >
                            {badge.label}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <ClockIcon size={12} color="#94a3b8" />
                            {formatTime(sale.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* 2. CASH COLLECTIONS */}
          {activeSubTab === 'collections' && (
            collections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                <DollarSignIcon size={28} color="#cbd5e1" style={{ margin: '0 auto 6px', display: 'block' }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>لا توجد سندات قبض أو تحصيلات نقدية مسجلة</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {collections.map((col) => (
                  <div
                    key={col.id}
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                        {col.customerName}
                      </span>
                      <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#0284c7' }}>
                        +{Number(col.amount).toFixed(2)} <CurrencySymbol />
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                      <span>سند قبض نقدي من مديونية عميل</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <ClockIcon size={12} color="#94a3b8" />
                        {formatTime(col.createdAt)}
                      </span>
                    </div>
                    {col.note && (
                      <div style={{ fontSize: '10.5px', color: '#475569', backgroundColor: '#ffffff', padding: '4px 8px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                        ملاحظة: {col.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* 3. FIELD RETURNS */}
          {activeSubTab === 'returns' && (
            returns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                <PackageIcon size={28} color="#cbd5e1" style={{ margin: '0 auto 6px', display: 'block' }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>لا توجد أذونات مرتجعات بضاعة مسجلة اليوم</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {returns.map((ret) => {
                  const statusBadge = getReturnStatusBadge(ret.status);
                  const isCashRefund = ret.refundMethod === 'cash';
                  return (
                    <div
                      key={ret.id}
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
                          إذن مرتجع #{ret.docNo}
                        </span>
                        <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#dc2626' }}>
                          {Number(ret.totalAmount).toFixed(2)} <CurrencySymbol />
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11.5px' }}>
                        <span style={{ color: '#334155', fontWeight: 700 }}>
                          العميل: {ret.customerName || 'عميل مباشر'}
                        </span>
                        <span
                          style={{
                            backgroundColor: isCashRefund ? '#fee2e2' : '#fef3c7',
                            color: isCashRefund ? '#b91c1c' : '#b45309',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '10.5px',
                          }}
                        >
                          {isCashRefund ? 'دفع نقدي كاش من السيارة' : 'خصم من رصيد العميل (آجل)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                        <span>السبب: {ret.returnReason || 'بضاعة راكدة / استبدال'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              backgroundColor: statusBadge.bg,
                              color: statusBadge.color,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '10px',
                            }}
                          >
                            {statusBadge.label}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                            {formatTime(ret.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* 4. REMAINING VAN INVENTORY */}
          {activeSubTab === 'inventory' && (
            inventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                <PackageIcon size={28} color="#cbd5e1" style={{ margin: '0 auto 6px', display: 'block' }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>السيارة فارغة حالياً (تم بيع أو تفريغ كافة البضاعة)</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {inventory.map((item) => {
                  const lineTotal = Number(item.qty || 0) * Number(item.retailPrice || 0);
                  return (
                    <div
                      key={item.productId}
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                          {item.productName}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          كود: {item.barcode || '—'} {item.unitName && `• ${item.unitName}`}
                        </span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 900,
                            color: '#170e5e',
                            backgroundColor: '#eef2ff',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            display: 'inline-block',
                          }}
                        >
                          {item.qty} {item.unitName || 'قطعة'}
                        </span>
                        <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                          بقيمة {lineTotal.toFixed(2)} <CurrencySymbol />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
      )}
    </div>
  );
};
