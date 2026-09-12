import { useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { vanSalesApi, VanTripSummary } from '../api/van-sales.api';

export default function VanSalesAdminManagementPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: trips = [], isLoading, refetch } = useQuery<VanTripSummary[]>({
    queryKey: ['van-sales-admin-trips', statusFilter],
    queryFn: () => vanSalesApi.listAdminTrips({ status: statusFilter || undefined }),
    refetchInterval: 20000,
  });

  const totalLoaded = trips.reduce((sum, t) => sum + t.loadedAmount, 0);
  const totalSales = trips.reduce((sum, t) => sum + t.salesAmount, 0);
  const totalCash = trips.reduce((sum, t) => sum + t.cashCollected, 0);
  const activeTripsCount = trips.filter((t) => t.status === 'open').length;

  return (
    <div dir="rtl" className="page-shell space-y-4">
      <PageHeader
        title="إدارة ورقابة سيارات التوزيع المتنقلة (Van Sales)"
        description="متابعة رحلات التوزيع الميدانية، أرصدة سيارات الفان، مبيعات الشارع، وتصفيات النقدية اللحظية"
        badge={
          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
            {activeTripsCount} سيارات نشطة حالياً
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => refetch()}>
              تحديث البيانات
            </Button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block">إجمالي مبيعات سيارات الفان</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {totalSales.toFixed(2)} <span className="text-xs font-semibold text-slate-400"><CurrencySymbol /></span>
          </span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-emerald-600 block">إجمالي النقدية المحصلة (كاش)</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {totalCash.toFixed(2)} <span className="text-xs font-semibold text-emerald-500"><CurrencySymbol /></span>
          </span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-indigo-600 block">إجمالي البضاعة المشحونة بالفان</span>
          <span className="text-2xl font-black text-indigo-900 mt-1 block">
            {totalLoaded.toFixed(2)} <span className="text-xs font-semibold text-indigo-400"><CurrencySymbol /></span>
          </span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-amber-600 block">السيارات في خط السير الآن</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">
            {activeTripsCount} <span className="text-xs font-semibold text-amber-500">رحلات مفتوحة</span>
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">تصفية حسب الحالة:</span>
          <div className="flex gap-1.5">
            {[
              { label: 'كافة الرحلات', value: '' },
              { label: 'مفتوحة بالشارع', value: 'open' },
              { label: 'تمت التصفية والإغلاق', value: 'settled' },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === f.value
                    ? 'bg-[#170e5e] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-slate-400 font-semibold">إجمالي السجلات: {trips.length}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 font-bold">جاري تحميل رحلات التوزيع...</div>
        ) : trips.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold">لا توجد رحلات توزيع مسجلة</div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}># الرحلة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>المندوب وسيارة الفان</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>المستودع المصدر</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>قيمة البضاعة المحمّلة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>المبيعات المحققة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>الكاش المحصل</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>المبيعات الآجلة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>عجز / زيادة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>تاريخ الفتح / الإغلاق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">#{t.id}</td>
                    <td className="p-3">
                      <span className="font-extrabold text-slate-900 block">{t.repName}</span>
                      <span className="text-[11px] text-slate-500 font-mono block">{t.vanLocationName}</span>
                    </td>
                    <td className="p-3 text-slate-600 font-semibold">{t.sourceWarehouseName}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          t.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.status === 'open' ? 'نشطة بالشارع' : 'تمت التصفية'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">{t.loadedAmount.toFixed(2)} <CurrencySymbol /></td>
                    <td className="p-3 text-center font-bold text-slate-900">{t.salesAmount.toFixed(2)} <CurrencySymbol /></td>
                    <td className="p-3 text-center font-black text-emerald-700">{t.cashCollected.toFixed(2)} <CurrencySymbol /></td>
                    <td className="p-3 text-center font-bold text-amber-700">{t.creditSales.toFixed(2)} <CurrencySymbol /></td>
                    <td className="p-3 text-center font-mono font-bold">
                      {t.variance === 0 ? (
                        <span className="text-slate-400">0.00</span>
                      ) : t.variance < 0 ? (
                        <span className="text-rose-600">{t.variance.toFixed(2)}</span>
                      ) : (
                        <span className="text-blue-600">+{t.variance.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      <div>بدء: {new Date(t.openedAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                      {t.closedAt && (
                        <div className="text-slate-400">
                          إغلاق: {new Date(t.closedAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
