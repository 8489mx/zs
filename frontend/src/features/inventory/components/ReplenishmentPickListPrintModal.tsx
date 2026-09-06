import React, { useRef } from 'react';
import { Button } from '@/shared/ui/button';

export interface PickListItem {
  productId: number;
  productName: string;
  barcode: string;
  qty: number;
  cartonMultiplier?: number;
  cartonName?: string;
  cartonsCount?: number;
  warehouseStock?: number;
}

interface ReplenishmentPickListPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  docNo: string;
  fromLocationName: string;
  toLocationName: string;
  items: PickListItem[];
  createdByName?: string;
}

export const ReplenishmentPickListPrintModal: React.FC<ReplenishmentPickListPrintModalProps> = ({
  isOpen,
  onClose,
  docNo,
  fromLocationName,
  toLocationName,
  items,
  createdByName = 'كاشير المحل',
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>أمر صرف وتجهيز بضاعة - ${docNo}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              direction: rtl;
              margin: 20px;
              color: #1e293b;
              font-size: 13px;
              line-height: 1.5;
            }
            .header-box {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .title {
              font-size: 20px;
              font-weight: 800;
              color: #170e5e;
              margin: 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              text-align: right;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #334155;
            }
            .check-col {
              width: 40px;
              text-align: center;
            }
            .check-box-square {
              display: inline-block;
              width: 16px;
              height: 16px;
              border: 1.5px solid #64748b;
              border-radius: 3px;
            }
            .qty-pill {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
            }
            .unit-badge {
              display: inline-block;
              font-size: 11px;
              color: #2563eb;
              font-weight: 600;
              margin-inline-start: 4px;
            }
            .summary-bar {
              display: flex;
              justify-content: space-between;
              background: #f8fafc;
              border: 1px dashed #94a3b8;
              border-radius: 8px;
              padding: 12px 16px;
              font-weight: 700;
              margin-bottom: 30px;
            }
            .signatures-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-top: 30px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            .sig-box {
              text-align: center;
            }
            .sig-line {
              margin-top: 40px;
              border-bottom: 1px dashed #64748b;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalPieces = items.reduce((sum, it) => sum + it.qty, 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🖨️</span>
            <div>
              <h3 className="font-bold text-slate-800 text-base">أمر تحميل وصرف بضاعة للمستودع</h3>
              <p className="text-xs text-slate-500">إذن معتمد رسمي رقم #{docNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handlePrint}
              className="bg-[#170e5e] hover:bg-[#120b4c] text-white font-semibold flex items-center gap-1.5 px-4"
            >
              <span>طباعة فورية للعامل</span>
              <span>🖨️</span>
            </Button>
            <Button variant="secondary" onClick={onClose} className="px-3">
              إغلاق
            </Button>
          </div>
        </div>

        {/* Printable Paper Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50">
          <div
            ref={printAreaRef}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-slate-800"
          >
            <div className="header-box flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-4">
              <div>
                <h1 className="text-xl font-extrabold text-[#170e5e] m-0">أمر صرف وتجهيز بضاعة للمحل</h1>
                <p className="text-xs text-slate-500 mt-1">كشف نقل معتمد - منظومة Z-Systems</p>
              </div>
              <div className="text-left font-mono">
                <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-md text-sm font-bold border border-slate-300">
                  {docNo}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs">
              <div>
                <span className="text-slate-500">من المستودع المصدر: </span>
                <span className="font-bold text-slate-800">{fromLocationName}</span>
              </div>
              <div>
                <span className="text-slate-500">إلى صالة المحل: </span>
                <span className="font-bold text-slate-800">{toLocationName}</span>
              </div>
              <div>
                <span className="text-slate-500">التاريخ والوقت: </span>
                <span className="font-semibold text-slate-700">{dateStr} - {timeStr}</span>
              </div>
              <div>
                <span className="text-slate-500">المشرف المعتمد: </span>
                <span className="font-semibold text-slate-700">{createdByName}</span>
              </div>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-slate-300 text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-slate-300 p-2 w-10 text-center">تم</th>
                    <th className="border border-slate-300 p-2 w-10 text-center">#</th>
                    <th className="border border-slate-300 p-2">اسم الصنف والباركود</th>
                    <th className="border border-slate-300 p-2 text-center">الكمية المطلوبة بدقة</th>
                    <th className="border border-slate-300 p-2 text-center">التعبئة المقترحة</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.productId} className="hover:bg-slate-50/50">
                      <td className="border border-slate-300 p-2 text-center">
                        <div className="inline-block w-4 h-4 border border-slate-400 rounded-sm" />
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 p-2">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        {item.barcode && (
                          <div className="text-[11px] text-slate-500 font-mono">{item.barcode}</div>
                        )}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        <span className="font-extrabold text-sm text-slate-900">
                          {item.qty}
                        </span>{' '}
                        <span className="text-[11px] text-slate-500">قطعة</span>
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {item.cartonsCount && item.cartonName ? (
                          <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded text-[11px] border border-blue-200">
                            {item.cartonsCount} {item.cartonName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3 font-bold text-xs mb-6">
              <span>إجمالي الأصناف: {items.length} صنف</span>
              <span className="text-[#170e5e] text-sm">إجمالي القطع المنصرفة: {totalPieces} قطعة</span>
            </div>

            <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-4 text-xs">
              <div className="text-center">
                <span className="text-slate-600 font-semibold">توقيع مسؤول المستودع (المُسلِّم)</span>
                <div className="mt-8 border-b border-dashed border-slate-400 mx-8" />
              </div>
              <div className="text-center">
                <span className="text-slate-600 font-semibold">توقيع المستلم (العامل / الكاشير)</span>
                <div className="mt-8 border-b border-dashed border-slate-400 mx-8" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
