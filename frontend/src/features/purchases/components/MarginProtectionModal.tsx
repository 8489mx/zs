import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { TrendingUpIcon, XIcon, CheckIcon, TagIcon, SparklesIcon, MessageSquareIcon } from '@/shared/components/icons/AppIcons';
import {
  marginProtectionApi,
  type MarginProtectionAnalysisResponse,
} from '../api/margin-protection.api';

interface MarginProtectionModalProps {
  open: boolean;
  purchaseId: number;
  initialTargetMargin?: number;
  onClose: () => void;
  onRepricingApplied?: (count: number) => void;
}

export function MarginProtectionModal({
  open,
  purchaseId,
  initialTargetMargin = 25,
  onClose,
  onRepricingApplied,
}: MarginProtectionModalProps) {
  const [targetMargin, setTargetMargin] = useState(initialTargetMargin);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [analysis, setAnalysis] = useState<MarginProtectionAnalysisResponse | null>(null);
  const [editedPrices, setEditedPrices] = useState<Record<number, number>>({});
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !purchaseId) {
      setAnalysis(null);
      setEditedPrices({});
      setSelectedProductIds(new Set());
      setSuccessMessage(null);
      setErrorMessage(null);
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMessage(null);

    marginProtectionApi
      .analyze(purchaseId, targetMargin)
      .then((res) => {
        if (!active) return;
        setAnalysis(res);
        // Pre-select items where margin is compressed or loss-making
        const autoSelected = new Set<number>();
        const initialPrices: Record<number, number> = {};
        for (const it of res.items) {
          initialPrices[it.productId] = it.recommendedRetailPrice;
          if (it.isLossMaking || it.isMarginCompressed || it.costChangePercent > 0) {
            autoSelected.add(it.productId);
          }
        }
        setEditedPrices(initialPrices);
        setSelectedProductIds(autoSelected);
      })
      .catch((err: any) => {
        if (!active) return;
        setErrorMessage(err?.message || 'تعذر تحميل تقرير حماية هامش الربح');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, purchaseId, targetMargin]);

  // Recalculate recommended price dynamically if user changes target margin
  const displayItems = useMemo(() => {
    if (!analysis) return [];
    return analysis.items.map((item) => {
      const recPrice = Number((item.newCost / (1 - (targetMargin / 100))).toFixed(2));
      const currentEdit = editedPrices[item.productId] ?? recPrice;
      const profitAfter = Number((currentEdit - item.newCost).toFixed(2));
      const marginAfter = currentEdit > 0 ? Number(((profitAfter / currentEdit) * 100).toFixed(1)) : 0;
      return {
        ...item,
        dynamicRecommended: recPrice,
        effectivePrice: currentEdit,
        profitAfter,
        marginAfter,
      };
    });
  }, [analysis, targetMargin, editedPrices]);

  const handlePriceChange = (productId: number, val: number) => {
    setEditedPrices((prev) => ({ ...prev, [productId]: Math.max(0, val) }));
  };

  const toggleSelect = (productId: number) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === displayItems.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(displayItems.map((it) => it.productId)));
    }
  };

  const handleApply = async () => {
    if (!selectedProductIds.size) {
      setErrorMessage('يرجى تحديد صنف واحد على الأقل لتحديث سعره');
      return;
    }

    setApplying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const itemsToUpdate = displayItems
        .filter((it) => selectedProductIds.has(it.productId))
        .map((it) => ({
          productId: it.productId,
          newRetailPrice: it.effectivePrice,
        }));

      const res = await marginProtectionApi.applyRepricing(purchaseId, {
        items: itemsToUpdate,
        notifyOwner,
      });

      setSuccessMessage(res.message);
      if (onRepricingApplied) {
        onRepricingApplied(res.updatedCount);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر تطبيق الأسعار الجديدة');
    } finally {
      setApplying(false);
    }
  };

  const handlePrintShelfLabels = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <TrendingUpIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-lg">
                  محرك حماية هامش الربح وتحديث الأسعار التلقائي
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  ذكي وآلي
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                فاتورة رقم #{analysis?.docNo || purchaseId} | المورد: {analysis?.supplierName || '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition flex items-center justify-center"
            aria-label="إغلاق"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Target Margin Controls & Overview Banner */}
        <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-center text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">أصناف الفاتورة:</span>
            <span className="text-base font-bold text-slate-800">
              {analysis?.totalAffectedItems || 0} أصناف
            </span>
          </div>

          <div className="bg-red-50 p-3 rounded-xl border border-red-200">
            <span className="text-red-600 block font-semibold">أصناف تحقق خسارة:</span>
            <span className="text-base font-bold text-red-700">
              {analysis?.lossMakingCount || 0} صنف (سعر البيع دون التكلفة!)
            </span>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
            <span className="text-amber-700 block font-semibold">أصناف انخفض هامشها:</span>
            <span className="text-base font-bold text-amber-800">
              {analysis?.marginCompressedCount || 0} صنف (دون 15%)
            </span>
          </div>

          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 flex flex-col justify-center">
            <label className="text-blue-900 block font-bold mb-1">
              هامش الربح المستهدف: <span className="text-blue-700 font-extrabold text-sm">{targetMargin}%</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number(e.target.value))}
                className="w-full accent-[#170e5e] cursor-pointer"
              />
              <span className="text-[11px] font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-300">
                {targetMargin}%
              </span>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm font-semibold">
              جاري فحص تغيرات التكلفة واحتساب هوامش الربح المقترحة...
            </div>
          ) : errorMessage ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold mb-3">
              {errorMessage}
            </div>
          ) : displayItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              لم يتم العثور على أصناف تتطلب إعادة تسعير في هذه الفاتورة.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.size === displayItems.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 accent-[#170e5e]"
                      />
                    </th>
                    <th className="p-3">اسم الصنف والباركود</th>
                    <th className="p-3 text-center">التكلفة (السابقة ← الجديدة)</th>
                    <th className="p-3 text-center">سعر البيع الحالي</th>
                    <th className="p-3 text-center">الهامش الحالي</th>
                    <th className="p-3 text-center bg-blue-50/50">السعر المقترح للكاشير</th>
                    <th className="p-3 text-center">الهامش بعد التعديل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayItems.map((item) => {
                    const isSelected = selectedProductIds.has(item.productId);
                    const isCostIncreased = item.costChangePercent > 0;

                    return (
                      <tr
                        key={item.productId}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.productId)}
                            className="rounded border-slate-300 accent-[#170e5e]"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{item.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.barcode}</div>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="text-slate-400 line-through text-[11px]">
                            {formatCurrency(item.previousCost)}
                          </span>
                          <span className="mx-1.5 text-slate-400">←</span>
                          <span className="font-bold text-slate-800">
                            {formatCurrency(item.newCost)}
                          </span>
                          {isCostIncreased && (
                            <span className="block text-[10px] font-bold text-red-600">
                              +{item.costChangePercent}%
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-slate-700">
                          {formatCurrency(item.currentRetailPrice)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.isLossMaking
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : item.isMarginCompressed
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.isLossMaking ? 'خسارة! ' : ''}
                            {item.currentMarginPercent}%
                          </span>
                        </td>
                        <td className="p-3 text-center bg-blue-50/30">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              value={item.effectivePrice}
                              onChange={(e) => handlePriceChange(item.productId, Number(e.target.value))}
                              className="w-24 h-8 px-2 text-center font-bold text-slate-800 bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
                            />
                            <span className="text-[10px] text-slate-500 font-bold">ج.م</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            {item.marginAfter}% (+{formatCurrency(item.profitAfter)})
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
              <span>{successMessage}</span>
              <CheckIcon size={16} color="#16a34a" />
            </div>
          )}
        </div>

        {/* Printable Shelf Labels Container for @media print */}
        <div className="hidden print:block p-4 bg-white">
          <div className="text-center font-bold text-base mb-3 border-b pb-2">
            بطاقات الأسعار وملصقات الأرفف المحدثة
          </div>
          <div className="grid grid-cols-3 gap-3">
            {displayItems
              .filter((it) => selectedProductIds.has(it.productId))
              .map((it) => (
                <div key={it.productId} className="border border-slate-400 p-3 rounded text-center">
                  <div className="font-bold text-sm">{it.productName}</div>
                  <div className="text-xs font-mono my-1">{it.barcode}</div>
                  <div className="text-lg font-black text-black">
                    {formatCurrency(it.effectivePrice)}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={notifyOwner}
              onChange={(e) => setNotifyOwner(e.target.checked)}
              className="rounded border-slate-300 accent-[#170e5e]"
            />
            <MessageSquareIcon size={14} color="#16a34a" />
            <span>إرسال تقرير بالأسعار المحدثة على واتساب المالك</span>
          </label>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handlePrintShelfLabels}
              disabled={!selectedProductIds.size}
              className="font-bold text-xs flex items-center gap-1.5 px-4 h-9"
            >
              <TagIcon size={14} />
              <span>طباعة ملصقات الأسعار للأرفف</span>
            </Button>

            <Button
              variant="secondary"
              onClick={onClose}
              disabled={applying}
              className="px-4 h-9 text-xs font-semibold"
            >
              إغلاق
            </Button>

            <Button
              variant="primary"
              onClick={handleApply}
              disabled={applying || !selectedProductIds.size}
              className="bg-[#170e5e] hover:bg-[#120b4c] text-white font-bold text-xs px-6 h-9 flex items-center gap-1.5 shadow-sm"
            >
              <SparklesIcon size={14} />
              <span>{applying ? 'جاري التحديث...' : `تحديث أسعار ${selectedProductIds.size} صنفاً في الكاشير`}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
