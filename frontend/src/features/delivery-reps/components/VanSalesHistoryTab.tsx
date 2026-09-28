import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import {
  PrinterIcon,
  ReceiptIcon,
  SearchIcon,
  RefreshCwIcon,
  PlusIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { vanSalesApi, DriverSaleHistoryItem } from '../api/van-sales.api';
import {
  printVanSaleThermalReceipt,
  formatVanSaleShareMessage,
  VanSaleReceiptData,
} from '../utils/van-sales-receipt.utils';

interface CustomerOption {
  id: number;
  name: string;
  phone?: string;
  customerCode?: string;
}

interface VanSalesHistoryTabProps {
  tripId?: number;
  customers?: CustomerOption[];
  onViewReceipt: (receiptData: VanSaleReceiptData) => void;
  onGoToNewSale?: () => void;
  storeName?: string;
}

export const VanSalesHistoryTab: React.FC<VanSalesHistoryTabProps> = ({
  tripId,
  customers = [],
  onViewReceipt,
  onGoToNewSale,
  storeName,
}) => {
  const [dateScope, setDateScope] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'credit'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tripOnly, setTripOnly] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useQuery<{ ok: boolean; sales: DriverSaleHistoryItem[] }>({
    queryKey: ['driver-sales-history', dateScope, selectedCustomerId, paymentFilter, searchQuery, tripOnly ? tripId : undefined],
    queryFn: () =>
      vanSalesApi.getDriverSales({
        dateScope,
        customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
        paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
        search: searchQuery.trim() || undefined,
        tripId: tripOnly && tripId ? tripId : undefined,
      }),
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const sales = useMemo(() => data?.sales || [], [data?.sales]);

  // Aggregate metrics for visible sales
  const metrics = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let creditSales = 0;
    let totalPieces = 0;
    let totalCartons = 0;

    sales.forEach((s) => {
      const amt = Number(s.total || 0);
      totalSales += amt;
      if (s.paymentMethod === 'cash') {
        cashSales += amt;
      } else {
        creditSales += amt;
      }
      if (s.packagingBreakdown) {
        totalPieces += Number(s.packagingBreakdown.piecesCount || 0);
        totalCartons += Number(s.packagingBreakdown.cartonsCount || 0);
      } else if (s.items) {
        totalPieces += s.items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
      }
    });

    return {
      count: sales.length,
      totalSales,
      cashSales,
      creditSales,
      totalPieces,
      totalCartons,
    };
  }, [sales]);

  const handleReprintReceipt = (sale: DriverSaleHistoryItem) => {
    try {
      const receiptData: VanSaleReceiptData = {
        docNo: sale.docNo,
        saleId: sale.id,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        paidAmount: sale.paidAmount,
        remainingCredit: sale.remainingCredit,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone || undefined,
        customerCode: sale.customerCode || undefined,
        customerAddress: sale.customerAddress || undefined,
        itemsCount: sale.itemsCount,
        packagingBreakdown: sale.packagingBreakdown || undefined,
        deliveryProofPhoto: sale.deliveryProofPhoto || undefined,
        items: sale.items,
        repName: sale.repName,
        vehiclePlate: sale.vehiclePlate || undefined,
        date: sale.createdAt,
      };

      printVanSaleThermalReceipt(receiptData, { storeName, widthMm: 80 });
      toast.success(`تم إرسال إيصال الفاتورة #${sale.docNo} لطابعة الـ 80 مم`);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر فتح أمر الطباعة الحرارية');
    }
  };

  const handleOpenReceiptModal = (sale: DriverSaleHistoryItem) => {
    const receiptData: VanSaleReceiptData = {
      docNo: sale.docNo,
      saleId: sale.id,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      paidAmount: sale.paidAmount,
      remainingCredit: sale.remainingCredit,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone || undefined,
      customerCode: sale.customerCode || undefined,
      customerAddress: sale.customerAddress || undefined,
      itemsCount: sale.itemsCount,
      packagingBreakdown: sale.packagingBreakdown || undefined,
      deliveryProofPhoto: sale.deliveryProofPhoto || undefined,
      items: sale.items,
      repName: sale.repName,
      vehiclePlate: sale.vehiclePlate || undefined,
      date: sale.createdAt,
    };
    onViewReceipt(receiptData);
  };

  const handleShareWhatsApp = (sale: DriverSaleHistoryItem) => {
    if (!sale.customerPhone) {
      toast.warning('رقم هاتف العميل غير متوفر في هذه الفاتورة');
      return;
    }
    const receiptData: VanSaleReceiptData = {
      docNo: sale.docNo,
      saleId: sale.id,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      paidAmount: sale.paidAmount,
      remainingCredit: sale.remainingCredit,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone || undefined,
      customerCode: sale.customerCode || undefined,
      items: sale.items,
      packagingBreakdown: sale.packagingBreakdown || undefined,
      repName: sale.repName,
      vehiclePlate: sale.vehiclePlate || undefined,
    };
    const message = formatVanSaleShareMessage(receiptData);
    const cleanPhone = sale.customerPhone.replace(/[^0-9]/g, '');
    const target = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`, '_blank');
    toast.info('تم فتح تطبيق الواتساب لإرسال الإيصال');
  };

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* 1. HEADER & KPI CARDS */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ReceiptIcon size={20} color="#170e5e" />
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                سجل الفواتير وإعادة الطباعة
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#eef2ff',
                  color: '#170e5e',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {metrics.count} فاتورة
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
              مرجع كامل لفواتير مبيعاتك الميدانية لإعادة طباعتها أو مراجعتها أو مشاركتها عبر الواتساب
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="تحديث قائمة الفواتير"
            >
              <RefreshCwIcon size={14} className={isRefetching ? 'spin-icon' : ''} />
              <span>تحديث</span>
            </button>

            {onGoToNewSale && (
              <button
                type="button"
                onClick={onGoToNewSale}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <PlusIcon size={14} color="#ffffff" />
                <span>فاتورة جديدة</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS SUMMARY CHIPS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '8px',
            marginTop: '4px',
          }}
        >
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>إجمالي المبيعات</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {metrics.totalSales.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <CurrencySymbol />
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>المحصل نقداً</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
              {metrics.cashSales.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <CurrencySymbol />
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600 }}>المبيعات الآجلة</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e40af', marginTop: '2px' }}>
              {metrics.creditSales.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <CurrencySymbol />
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#fdf4ff',
              border: '1px solid #f0abfc',
              borderRadius: '10px',
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#86198f', fontWeight: 600 }}>الطرود والقطع</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#86198f', marginTop: '2px' }}>
              {metrics.totalCartons ? `${metrics.totalCartons} كرتونة | ` : ''}
              {metrics.totalPieces} قطعة
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTERS CONTROL BAR */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          {/* DATE PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', marginLeft: '6px' }}>الفترة:</span>
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'أمس' },
              { id: 'week', label: 'آخر 7 أيام' },
              { id: 'all', label: 'الكل' },
            ].map((p) => {
              const active = dateScope === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDateScope(p.id as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: active ? '#170e5e' : '#cbd5e1',
                    backgroundColor: active ? '#170e5e' : '#f8fafc',
                    color: active ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              );
            })}

            {tripId && (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#170e5e',
                  marginRight: '8px',
                  cursor: 'pointer',
                  backgroundColor: tripOnly ? '#eef2ff' : 'transparent',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                <input
                  type="checkbox"
                  checked={tripOnly}
                  onChange={(e) => setTripOnly(e.target.checked)}
                  style={{ accentColor: '#170e5e' }}
                />
                <span>رحلة اليوم الحالية فقط (#{tripId})</span>
              </label>
            )}
          </div>

          {/* PAYMENT METHOD PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', marginLeft: '6px' }}>الدفع:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'cash', label: 'نقدي' },
              { id: 'credit', label: 'آجل' },
              { id: 'split', label: 'دفع مركب' },
              { id: 'card', label: 'شبكة/فيزا' },
            ].map((pm) => {
              const active = paymentFilter === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentFilter(pm.id as any)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: active ? '#170e5e' : '#cbd5e1',
                    backgroundColor: active ? '#170e5e' : '#f8fafc',
                    color: active ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SEARCH & CUSTOMER ROW */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* SEARCH BOX */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الفاتورة، اسم العميل، الهاتف، أو الكود..."
              style={{
                width: '100%',
                height: '36px',
                padding: '0 32px 0 28px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                boxSizing: 'border-box',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SearchIcon size={14} />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <XIcon size={14} />
              </button>
            )}
          </div>

          {/* CUSTOMER SELECT (OPTIONAL) */}
          {customers.length > 0 && (
            <div style={{ flex: '1 1 200px' }}>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: selectedCustomerId ? '#0f172a' : '#64748b',
                }}
              >
                <option value="">-- تصفية حسب عميل محدد --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.customerCode ? `(${c.customerCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. INVOICES LIST */}
      {isLoading ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '48px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '3px solid #e2e8f0',
              borderTopColor: '#170e5e',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
            جاري جلب سجل الفواتير والمبيعات...
          </div>
        </div>
      ) : sales.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '48px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: '#64748b',
            }}
          >
            <ReceiptIcon size={26} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            لا توجد فواتير بيع مسجلة
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 auto 16px', maxWidth: '340px' }}>
            لم يتم العثور على أي فواتير مطابقة لخيارات التصفية المحددة. يمكنك تعديل خيارات البحث أو إصدار فاتورة جديدة.
          </p>
          {onGoToNewSale && (
            <button
              type="button"
              onClick={onGoToNewSale}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <PlusIcon size={14} color="#ffffff" />
              <span>إصدار فاتورة بيع جديدة</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sales.map((sale) => {
            const dateObj = new Date(sale.createdAt);
            const dateStr = dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const timeStr = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

            return (
              <div
                key={sale.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxSizing: 'border-box',
                }}
              >
                {/* CARD HEADER */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '6px',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color: '#170e5e',
                        fontSize: '13.5px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      #{sale.docNo}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor:
                          sale.paymentMethod === 'cash'
                            ? '#dcfce7'
                            : sale.paymentMethod === 'card'
                            ? '#e0f2fe'
                            : sale.paymentMethod === 'split'
                            ? '#f5f3ff'
                            : '#dbeafe',
                        color:
                          sale.paymentMethod === 'cash'
                            ? '#166534'
                            : sale.paymentMethod === 'card'
                            ? '#0369a1'
                            : sale.paymentMethod === 'split'
                            ? '#5b21b6'
                            : '#1e40af',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {sale.paymentMethod === 'cash'
                        ? 'نقدي (مسلم)'
                        : sale.paymentMethod === 'card'
                        ? 'شبكة / فيزا'
                        : sale.paymentMethod === 'split'
                        ? 'دفع مركب'
                        : 'آجل (على الحساب)'}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    {dateStr} - {timeStr}
                  </div>
                </div>

                {/* CARD BODY: CUSTOMER & DETAILS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                      {sale.customerName}
                      {sale.customerCode && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginRight: '6px' }}>
                          ({sale.customerCode})
                        </span>
                      )}
                    </div>
                    {sale.customerPhone && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        هاتف: {sale.customerPhone}
                      </div>
                    )}
                  </div>

                  {/* TOTAL AMOUNT */}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>إجمالي الفاتورة</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#166534', marginTop: '1px' }}>
                      {sale.total.toFixed(2)} <CurrencySymbol />
                    </div>
                  </div>
                </div>

                {/* PACKAGING PILL & ITEMS SUMMARY */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569', fontWeight: 700 }}>
                      محتوى الشحنة: {sale.packagingBreakdown?.cartonsCount ? `${sale.packagingBreakdown.cartonsCount} كرتونة | ` : ''}
                      {sale.packagingBreakdown?.piecesCount || sale.items?.reduce((s, it) => s + it.qty, 0) || 0} قطعة ({sale.itemsCount} صنف)
                    </span>
                    {sale.repName && (
                      <span style={{ color: '#64748b', fontSize: '10.5px' }}>
                        المندوب: {sale.repName} {sale.vehiclePlate ? `(${sale.vehiclePlate})` : ''}
                      </span>
                    )}
                  </div>

                  {sale.items && sale.items.length > 0 && (
                    <div style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.4, marginTop: '2px' }}>
                      {sale.items.map((it) => `${it.name} × ${it.qty}`).join(' ، ')}
                    </div>
                  )}
                </div>

                {/* CARD FOOTER ACTIONS */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid #f1f5f9',
                    flexWrap: 'wrap',
                  }}
                >
                  {sale.customerPhone && (
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(sale)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #86efac',
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="مشاركة تفاصيل الفاتورة عبر واتساب"
                    >
                      <span>واتساب</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenReceiptModal(sale)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="معاينة إيصال الفاتورة التفصيلي"
                  >
                    <ReceiptIcon size={14} />
                    <span>معاينة الإيصال</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReprintReceipt(sale)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#170e5e',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                    title="إعادة طباعة الإيصال الحراري 80 مم فورياً"
                  >
                    <PrinterIcon size={14} color="#ffffff" />
                    <span>إعادة طباعة (80mm)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
