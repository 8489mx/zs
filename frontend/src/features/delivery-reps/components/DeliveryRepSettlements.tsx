import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deliveryRepsApi } from '../api/delivery-reps.api';
import { salesApi } from '@/features/sales/api/sales.api';
import { formatCurrency, formatDate, formatDateTimeArabic } from '@/lib/format';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { printPostedSaleReceipt } from '@/lib/pos-printing';

function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDelayStatus(orderDateStr: string, settleDateStr: string) {
  if (!orderDateStr || !settleDateStr) return { text: '-', color: '#64748b' };
  const diffMs = new Date(settleDateStr).getTime() - new Date(orderDateStr).getTime();
  if (diffMs <= 0) return { text: 'بدون تأخير', color: '#16a34a' };
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return { text: `${diffMins} دقيقة`, color: '#16a34a' };
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return { text: `${diffHours} ساعة و ${diffMins % 60} دقيقة`, color: '#ea580c' };
  
  const diffDays = Math.floor(diffHours / 24);
  return { text: `${diffDays} يوم و ${diffHours % 24} ساعة`, color: '#dc2626' };
}

export function DeliveryRepSettlements({ repId }: { repId: number | null }) {
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [viewingSaleId, setViewingSaleId] = useState<number | null>(null);

  const settlementsQuery = useQuery({
    queryKey: ['delivery-rep-settlements', repId, filterDateFrom, filterDateTo],
    queryFn: () => deliveryRepsApi.listSettlements(repId!, {
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
    }),
    enabled: !!repId,
  });

  const viewingSaleQuery = useQuery({
    queryKey: ['sale-detail', viewingSaleId],
    queryFn: () => salesApi.getById(String(viewingSaleId)),
    enabled: !!viewingSaleId,
  });

  if (!repId) return null;

  const totalSettledCount = settlementsQuery.data?.length || 0;
  const totalSettledAmount = settlementsQuery.data?.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>عدد التوريدات المسددة</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
            {settlementsQuery.isLoading ? '...' : totalSettledCount}
          </div>
        </div>

        <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <div style={{ color: '#166534', fontSize: '12px', fontWeight: 'bold' }}>إجمالي المبالغ الموردة</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#15803d', marginTop: '4px' }}>
            {settlementsQuery.isLoading ? '...' : formatCurrency(totalSettledAmount)}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginLeft: '6px' }}>فلترة التوريدات:</span>
          <Button 
            variant={filterDateFrom === getLocalDateStr() && filterDateTo === getLocalDateStr() ? 'primary' : 'secondary'} 
            onClick={() => {
              const today = getLocalDateStr();
              setFilterDateFrom(today);
              setFilterDateTo(today);
            }}
            style={{ fontSize: '12px', padding: '4px 10px', minHeight: '30px' }}
          >
            توريدات اليوم
          </Button>
          <Button 
            variant={!filterDateFrom && !filterDateTo ? 'primary' : 'secondary'} 
            onClick={() => {
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
            style={{ fontSize: '12px', padding: '4px 10px', minHeight: '30px' }}
          >
            عرض الكل (مسح الفلاتر)
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input 
            type="date" 
            value={filterDateFrom} 
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
          <span style={{ fontSize: '11px', color: '#64748b' }}>إلى</span>
          <input 
            type="date" 
            value={filterDateTo} 
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      {/* Settlements Table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', margin: 0, fontSize: '13px' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>الطلب</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>تاريخ الطلب</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>وقت التسوية</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>مدة التأخير</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>المبلغ</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>الكاشير</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>مستلم المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {settlementsQuery.isLoading && <tr><td colSpan={7} style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td></tr>}
            {settlementsQuery.data?.length === 0 && <tr><td colSpan={7} style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>لا يوجد طلبات تمت تسويتها</td></tr>}
            {settlementsQuery.data?.map((settlement: any) => {
              const delay = getDelayStatus(settlement.orderDate, settlement.createdAt);
              return (
                <tr key={settlement.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 800, color: '#0f172a' }}>
                    <button
                      type="button"
                      onClick={() => setViewingSaleId(settlement.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#2563eb',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '13px'
                      }}
                      title="انقر لعرض تفاصيل وأصناف الفاتورة"
                    >
                      {settlement.docNo}
                    </button>
                  </td>
                  <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', color: '#64748b', fontSize: '12px' }}>
                    {formatDateTimeArabic(settlement.orderDate)}
                  </td>
                  <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', fontWeight: 600, color: '#334155', fontSize: '12px' }}>
                    {settlement.createdAt ? formatDateTimeArabic(settlement.createdAt) : '-'}
                  </td>
                  <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                    <span 
                      style={{ 
                        color: delay.color, 
                        background: delay.color === '#16a34a' ? '#f0fdf4' : delay.color === '#ea580c' ? '#fff7ed' : '#fef2f2',
                        border: `1px solid ${delay.color === '#16a34a' ? '#bbf7d0' : delay.color === '#ea580c' ? '#fed7aa' : '#fecaca'}`,
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        fontSize: '11px',
                        fontWeight: 700 
                      }}
                    >
                      {delay.text}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>
                    <div>{formatCurrency(settlement.amount)}</div>
                    {Number(settlement.deliveryFee || 0) > 0 ? (
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                        أجرة: {formatCurrency(Number(settlement.deliveryFee))}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', color: '#334155', fontWeight: 600, fontSize: '12px' }}>
                    {settlement.createdByName || 'غير معروف'}
                  </td>
                  <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', color: '#64748b', fontSize: '12px' }}>
                    {settlement.settledByName || settlement.createdByName || 'غير معروف'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sale Quick View Modal */}
      {viewingSaleId && (
        <DialogShell
          open={true}
          onClose={() => setViewingSaleId(null)}
          width="700px"
          ariaLabel="تفاصيل الفاتورة"
        >
          <Card
            title={viewingSaleQuery.data ? `تفاصيل الفاتورة #${viewingSaleQuery.data.docNo || viewingSaleQuery.data.id}` : 'جاري التحميل...'}
            actions={
              <div style={{ display: 'flex', gap: '8px' }}>
                {viewingSaleQuery.data && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      void printPostedSaleReceipt(viewingSaleQuery.data);
                    }}
                    style={{ fontSize: '12px', padding: '4px 12px' }}
                  >
                    🖨️ طباعة الفاتورة
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setViewingSaleId(null)} style={{ fontSize: '12px', padding: '4px 12px' }}>
                  إغلاق
                </Button>
              </div>
            }
          >
            {viewingSaleQuery.isLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جاري تحميل تفاصيل الفاتورة...</div>
            ) : viewingSaleQuery.data ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                {/* Meta Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>العميل</span>
                    <strong>{viewingSaleQuery.data.customerName || 'عميل نقدي'}</strong>
                    {viewingSaleQuery.data.customerPhone && <div style={{ fontSize: '11px', color: '#475569' }}>📞 {viewingSaleQuery.data.customerPhone}</div>}
                    {viewingSaleQuery.data.customerAddress && <div style={{ fontSize: '11px', color: '#475569' }}>📍 {viewingSaleQuery.data.customerAddress}</div>}
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>الكاشير</span>
                    <strong>{viewingSaleQuery.data.cashierName || viewingSaleQuery.data.createdByName || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>المندوب</span>
                    <strong>{viewingSaleQuery.data.deliveryRepName || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>التاريخ والوقت</span>
                    <strong style={{ direction: 'ltr', display: 'inline-block' }}>{formatDate(viewingSaleQuery.data.createdAt || viewingSaleQuery.data.date)}</strong>
                  </div>
                </div>

                {/* Items Table */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <table className="table" style={{ width: '100%', margin: 0, fontSize: '12px' }}>
                    <thead style={{ background: '#f1f5f9' }}>
                      <tr>
                        <th style={{ padding: '6px 8px' }}>الصنف</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>الكمية</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>السعر</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingSaleQuery.data.items?.map((item: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{item.name || item.productName}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{item.qty} {item.unit || ''}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{formatCurrency(Number(item.price || 0))}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 'bold' }}>{formatCurrency(Number(item.total || (item.qty * item.price) || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  {Number(viewingSaleQuery.data.deliveryFee || 0) > 0 && (
                    <div style={{ color: '#059669', fontWeight: 600 }}>
                      <span>أجرة التوصيل: </span>
                      <strong>{formatCurrency(Number(viewingSaleQuery.data.deliveryFee))}</strong>
                    </div>
                  )}
                  {Number(viewingSaleQuery.data.discount || 0) > 0 && (
                    <div style={{ color: '#dc2626', fontWeight: 600 }}>
                      <span>الخصم: </span>
                      <strong>{formatCurrency(Number(viewingSaleQuery.data.discount))}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>الإجمالي النهائي: </span>
                    <strong style={{ fontSize: '15px', color: '#170c5c', fontWeight: 900 }}>{formatCurrency(Number(viewingSaleQuery.data.total || 0))}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>تعذر تحميل بيانات الفاتورة</div>
            )}
          </Card>
        </DialogShell>
      )}

    </div>
  );
}
