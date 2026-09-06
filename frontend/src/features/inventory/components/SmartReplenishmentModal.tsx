import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import {
  inventoryReplenishmentApi,
  ReplenishmentSuggestionItem,
} from '@/features/inventory/api/inventory-replenishment.api';
import { ReplenishmentPickListPrintModal, PickListItem } from './ReplenishmentPickListPrintModal';

interface SmartReplenishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultToLocationId?: string;
}

export const SmartReplenishmentModal: React.FC<SmartReplenishmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultToLocationId,
}) => {
  const { locationsQuery } = useInventoryActionCatalog();
  const locations = locationsQuery.data || [];

  const [fromLocationId, setFromLocationId] = useState<number | ''>('');
  const [toLocationId, setToLocationId] = useState<number | ''>('');
  const [coverDays, setCoverDays] = useState<number>(2);
  const [note, setNote] = useState<string>('');
  const [editableItems, setEditableItems] = useState<ReplenishmentSuggestionItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Print Modal state
  const [printedTransfer, setPrintedTransfer] = useState<{
    docNo: string;
    items: PickListItem[];
    fromName: string;
    toName: string;
  } | null>(null);

  // Initialize source and destination locations when locations load
  useEffect(() => {
    if (locations.length > 0) {
      if (!fromLocationId) {
        // Look for main warehouse or first location
        const warehouse = locations.find((l: any) => l.name?.includes('مستودع') || l.name?.includes('رئيسي') || l.code?.includes('MAIN')) || locations[0];
        setFromLocationId(Number(warehouse.id));
      }
      if (!toLocationId) {
        if (defaultToLocationId) {
          setToLocationId(Number(defaultToLocationId));
        } else {
          // Look for shop/floor location
          const shop = locations.find((l: any) => l.name?.includes('محل') || l.name?.includes('عرض') || l.name?.includes('فرع') || l.id !== locations[0].id) || locations[locations.length - 1];
          setToLocationId(Number(shop.id));
        }
      }
    }
  }, [locations, defaultToLocationId, fromLocationId, toLocationId]);

  // Query suggestions from backend
  const suggestionsQuery = useQuery({
    queryKey: ['smart-replenishment-suggestions', fromLocationId, toLocationId, coverDays],
    queryFn: () => inventoryReplenishmentApi.getSuggestions(Number(fromLocationId), Number(toLocationId), coverDays),
    enabled: isOpen && Boolean(fromLocationId) && Boolean(toLocationId) && fromLocationId !== toLocationId,
  });

  // Sync query data to local editable state
  useEffect(() => {
    if (suggestionsQuery.data?.items) {
      setEditableItems(suggestionsQuery.data.items);
    }
  }, [suggestionsQuery.data]);

  if (!isOpen) return null;

  const handleQtyChange = (productId: number, delta: number) => {
    setEditableItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const newQty = Math.max(0, it.suggestedQty + delta);
          const cartonsCount = it.cartonMultiplier && it.cartonMultiplier > 1 ? Math.ceil(newQty / it.cartonMultiplier) : undefined;
          return { ...it, suggestedQty: newQty, cartonsCount };
        }
        return it;
      }),
    );
  };

  const handleQtyInput = (productId: number, val: string) => {
    const parsed = parseInt(val, 10);
    const newQty = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setEditableItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const cartonsCount = it.cartonMultiplier && it.cartonMultiplier > 1 ? Math.ceil(newQty / it.cartonMultiplier) : undefined;
          return { ...it, suggestedQty: newQty, cartonsCount };
        }
        return it;
      }),
    );
  };

  const handleRemoveItem = (productId: number) => {
    setEditableItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const handleApproveAndPrint = async () => {
    if (!fromLocationId || !toLocationId) {
      setStatusMessage({ type: 'error', text: 'يرجى اختيار المخزن المصدر وموقع المحل' });
      return;
    }

    const validItems = editableItems.filter((it) => it.suggestedQty > 0);
    if (!validItems.length) {
      setStatusMessage({ type: 'error', text: 'يجب أن تحتوي القائمة على أصناف بكميات أكبر من صفر' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await inventoryReplenishmentApi.execute({
        fromLocationId: Number(fromLocationId),
        toLocationId: Number(toLocationId),
        items: validItems.map((it) => ({ productId: it.productId, qty: it.suggestedQty })),
        note: note || `إذن إمداد أرفف ذكي (تغطية ${coverDays * 24} ساعة)`,
      });

      const fromLoc = locations.find((l: any) => Number(l.id) === Number(fromLocationId));
      const toLoc = locations.find((l: any) => Number(l.id) === Number(toLocationId));

      setPrintedTransfer({
        docNo: res.docNo,
        items: validItems.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          barcode: it.barcode,
          qty: it.suggestedQty,
          cartonMultiplier: it.cartonMultiplier,
          cartonName: it.cartonName,
          cartonsCount: it.cartonsCount,
          warehouseStock: it.warehouseStock,
        })),
        fromName: fromLoc?.name || 'المستودع الرئيسي',
        toName: toLoc?.name || 'صالة المحل',
      });

      setStatusMessage({ type: 'success', text: `تم اعتماد إذن الصرف رقم #${res.docNo} بنجاح!` });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'تعذر اعتماد إذن الصرف' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeValidItems = editableItems.filter((it) => it.suggestedQty > 0);
  const totalPieces = activeValidItems.reduce((acc, it) => acc + it.suggestedQty, 0);
  const outOfStockCount = editableItems.filter((it) => it.urgency === 'out_of_stock').length;
  const lowStockCount = editableItems.filter((it) => it.urgency === 'low_stock').length;
  const salesReplenishCount = editableItems.filter((it) => it.urgency === 'sales_replenish').length;
  const unavailableInSourceCount = editableItems.filter((it) => it.urgency === 'unavailable_in_source').length;

  return (
    <>
      <div
        dir="rtl"
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      >
        <div className="bg-[#f8fafc] rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shadow-xs">
                ⚡
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <span>محرك إمداد الأرفف الذكي وتتبع المخازن الـ 7</span>
                  <span className="bg-indigo-100 text-[#170e5e] text-xs px-2.5 py-0.5 rounded-full font-semibold">
                    تغطية 48 ساعة
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  فحص آلي لأرصدة كافة المخازن وتوجيه الصرف للحاجات المتوفرة فعلياً مع تنبيهات بمواعيد الشراء المطلوبة
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-xl p-1.5 leading-none rounded-lg hover:bg-slate-100 transition"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>

          {/* Location & Coverage Controls Bar */}
          <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">المستودع المصدر للصرف:</label>
              <select
                value={fromLocationId}
                onChange={(e) => setFromLocationId(Number(e.target.value))}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
              >
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.code ? `(${loc.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">موقع الوجهة (صالة عرض المحل):</label>
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(Number(e.target.value))}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
              >
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.code ? `(${loc.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">فترة تغطية المبيعات:</label>
              <div className="flex gap-1.5">
                {[
                  { label: '24 ساعة (يوم)', days: 1 },
                  { label: '48 ساعة (يومان) 🌟', days: 2 },
                  { label: '72 ساعة (3 أيام)', days: 3 },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setCoverDays(opt.days)}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${
                      coverDays === opt.days
                        ? 'bg-[#170e5e] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Metric Strip */}
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-700">تحليل المنظومة:</span>
              <span className="bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded border border-red-200">
                🔴 {outOfStockCount} خلص بالمحل
              </span>
              <span className="bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded border border-amber-200">
                🟡 {lowStockCount} قرب يخلص
              </span>
              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200">
                🔵 {salesReplenishCount} تعويض مبيعات
              </span>
              {unavailableInSourceCount > 0 && (
                <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded border border-slate-300">
                  ⚪ {unavailableInSourceCount} غير متوفر بهذا المستودع (متاح ببدائل)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">المطلوب سحبه:</span>
              <span className="bg-white text-slate-900 font-extrabold px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                {activeValidItems.length} أصناف | {totalPieces} قطعة
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="p-6 overflow-y-auto flex-1">
            {suggestionsQuery.isLoading ? (
              <div className="py-16 text-center text-slate-500">
                <div className="inline-block animate-spin text-3xl mb-3">⏳</div>
                <p className="font-bold text-sm">جاري احتساب مبيعات الـ 48 ساعة وفحص أرصدة كافة المخازن...</p>
              </div>
            ) : suggestionsQuery.isError ? (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold text-center">
                تعذر جلب مقترحات الإمداد، تأكد من اختلاف المستودع المصدر عن صالة المحل.
              </div>
            ) : editableItems.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="font-bold text-slate-800 text-base">الأرفف ممتلئة تماماً!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  لا توجد أصناف ناقصة أو مباعة تتطلب تعويضاً من المستودع حالياً في صالة العرض المحددة.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full border-collapse text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                      <th className="p-3">حالة الصنف</th>
                      <th className="p-3">اسم الصنف، الباركود، وبدائل المخازن</th>
                      <th className="p-3 text-center">رصيد المحل</th>
                      <th className="p-3 text-center">مبيعات {coverDays * 24}س</th>
                      <th className="p-3 text-center">رصيد المستودع المختار</th>
                      <th className="p-3 text-center w-48">الكمية المقترحة للصرف</th>
                      <th className="p-3 text-center w-12">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editableItems.map((item) => (
                      <tr
                        key={item.productId}
                        className={`transition-colors ${
                          item.urgency === 'unavailable_in_source'
                            ? 'bg-slate-50/60 opacity-80'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="p-3">
                          {item.urgency === 'unavailable_in_source' && (
                            <span className="bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-300">
                              غير متاح بهذا المخزن
                            </span>
                          )}
                          {item.urgency === 'out_of_stock' && (
                            <span className="bg-red-50 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                              خلص بالمحل
                            </span>
                          )}
                          {item.urgency === 'low_stock' && (
                            <span className="bg-amber-50 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                              قرب يخلص
                            </span>
                          )}
                          {item.urgency === 'sales_replenish' && (
                            <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                              تعويض مبيعات
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          {item.barcode && (
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.barcode}</div>
                          )}

                          {/* Multi-Warehouse Alternative Indicator */}
                          {item.warehouseStock <= 0 && item.alternativeLocations && item.alternativeLocations.length > 0 && (
                            <div className="text-[10px] text-emerald-800 bg-emerald-50 rounded-md px-2 py-0.5 mt-1 border border-emerald-200 inline-block font-semibold">
                              💡 متوفر في مخازن أخرى: {item.alternativeLocations.map((a) => `${a.locationName} (${a.qty} ق)`).join(' | ')}
                            </div>
                          )}

                          {item.warehouseStock <= 0 && (!item.alternativeLocations || item.alternativeLocations.length === 0) && (
                            <div className="text-[10px] text-red-600 bg-red-50 rounded-md px-2 py-0.5 mt-1 border border-red-200 inline-block font-bold">
                              🚨 نفد من كافة مخازن المؤسسة بالكامل!
                            </div>
                          )}

                          {/* Predictive Purchase Deadline */}
                          {item.recommendedPurchaseDeadline && (
                            <div className="text-[10px] text-amber-800 bg-amber-50 rounded-md px-2 py-0.5 mt-1 border border-amber-200 block font-semibold">
                              📅 تنبيه شراء: الرصيد يغطي {item.daysOfSupplyRemaining} أيام ➔ يُفضل الشراء قبل <b>{item.recommendedPurchaseDeadline}</b>
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-center font-bold text-slate-800">
                          {item.currentShopStock <= 0 ? (
                            <span className="text-red-600">0</span>
                          ) : (
                            item.currentShopStock
                          )}
                        </td>

                        <td className="p-3 text-center font-bold text-indigo-700">
                          {item.sold48h > 0 ? `${item.sold48h} ق` : '-'}
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`font-extrabold text-sm ${
                              item.warehouseStock > 0 ? 'text-emerald-700' : 'text-red-500'
                            }`}
                          >
                            {item.warehouseStock}
                          </span>
                          {item.totalEnterpriseStock > item.warehouseStock && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              (باقي المخازن: {item.totalEnterpriseStock - item.warehouseStock})
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          {item.warehouseStock <= 0 ? (
                            <span className="text-[11px] text-slate-400 font-semibold">
                              اختر مخزناً آخر للصرف
                            </span>
                          ) : (
                            <>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.productId, -1)}
                                  className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center border border-slate-300"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.warehouseStock}
                                  value={item.suggestedQty}
                                  onChange={(e) => handleQtyInput(item.productId, e.target.value)}
                                  className="w-16 h-7 text-center rounded-md border border-slate-300 font-extrabold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#170e5e]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.productId, 1)}
                                  className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center border border-slate-300"
                                >
                                  +
                                </button>
                              </div>
                              {item.cartonsCount && item.cartonName && (
                                <div className="text-[10px] text-blue-600 font-bold mt-1">
                                  ≈ {item.cartonsCount} {item.cartonName}
                                </div>
                              )}
                            </>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="إزالة من الإذن"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-white border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-1/2 flex items-center gap-2">
              <input
                type="text"
                placeholder="ملاحظات اختيارية (مثال: إمداد وردية الصباح)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#170e5e]"
              />
            </div>

            <div className="w-full md:w-auto flex items-center justify-end gap-2.5">
              {statusMessage && (
                <span
                  className={`text-xs font-bold ${
                    statusMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {statusMessage.text}
                </span>
              )}

              <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="px-4">
                إلغاء
              </Button>

              <Button
                variant="primary"
                onClick={handleApproveAndPrint}
                disabled={isSubmitting || activeValidItems.length === 0}
                className="bg-[#170e5e] hover:bg-[#120b4c] text-white font-bold flex items-center gap-2 px-6 h-10 shadow-sm"
              >
                {isSubmitting ? (
                  <span>جاري الاعتماد والترحيل...</span>
                ) : (
                  <>
                    <span>اعتماد إذن الصرف وطباعة أمر التحميل</span>
                    <span>🚀</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Dialog */}
      {printedTransfer && (
        <ReplenishmentPickListPrintModal
          isOpen={Boolean(printedTransfer)}
          onClose={() => {
            setPrintedTransfer(null);
            onClose();
          }}
          docNo={printedTransfer.docNo}
          items={printedTransfer.items}
          fromLocationName={printedTransfer.fromName}
          toLocationName={printedTransfer.toName}
        />
      )}
    </>
  );
};
