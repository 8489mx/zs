import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { DataTable } from '@/shared/ui/data-table';
import { downloadExcelFile, triggerDownload } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { productsApi } from '@/features/products/api/products.api';
import { getWeightedBarcodeConfig } from '@/features/pos/lib/weighted-barcode';
import type { Product } from '@/types/domain';

export type ScalePreset = 'rongta' | 'cas' | 'dibal' | 'general';
export type ScaleScope = 'weighted_only' | 'all' | 'selected';

interface ScalePluExportModalProps {
  open: boolean;
  onClose: () => void;
  products?: Product[];
  selectedIds?: string[];
  categoryNames?: Record<string | number, string>;
}

function isWeightedProduct(product: Product): boolean {
  if ((product as any).is_weighted || (product as any).isWeighted) return true;
  const name = (product.name || '').toLowerCase();
  const unit = (((product as any).unit || '') + ' ' + (product.units?.map((u) => u.name).join(' ') || '')).toLowerCase();
  if (
    unit.includes('كيلو') ||
    unit.includes('كجم') ||
    unit.includes('كغ') ||
    unit.includes('kg') ||
    unit.includes('جرام') ||
    unit.includes('جم') ||
    unit.includes('وزن')
  ) {
    return true;
  }
  if (name.includes('كيلو') || name.includes('كجم') || name.includes('موزون')) {
    return true;
  }
  const barcode = String(product.barcode || '').trim();
  if (/^\d{3,5}$/.test(barcode)) {
    return true;
  }
  return false;
}

function cleanDigits(value: unknown, fallback = ''): string {
  const text = String(value ?? '').replace(/\D/g, '');
  return text || fallback;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const val = String(cell ?? '');
          return /[",\n\r]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
        })
        .join(',')
    ),
  ].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function ScalePluExportModal({
  open,
  onClose,
  products,
  selectedIds = [],
  categoryNames = {},
}: ScalePluExportModalProps) {
  const settingsQuery = useSettingsQuery();
  const scaleConfig = useMemo(() => getWeightedBarcodeConfig(settingsQuery.data), [settingsQuery.data]);

  const [preset, setPreset] = useState<ScalePreset>('rongta');
  const [scope, setScope] = useState<ScaleScope>('weighted_only');
  const [pluStart, setPluStart] = useState<number>(1);
  const [departmentId, setDepartmentId] = useState<number>(1);
  const [padItemCode, setPadItemCode] = useState<boolean>(true);

  const { data: allProducts } = useQuery({
    queryKey: ['scale-export-all-products'],
    queryFn: productsApi.list,
    enabled: open,
    staleTime: 60_000,
  });

  const availableProducts = useMemo(() => {
    if (allProducts && allProducts.length > 0) return allProducts;
    return products || [];
  }, [allProducts, products]);

  // Filter products based on selected scope
  const targetProducts = useMemo(() => {
    if (scope === 'selected' && selectedIds.length > 0) {
      const idSet = new Set(selectedIds.map(String));
      return availableProducts.filter((p) => idSet.has(String(p.id)));
    }
    if (scope === 'weighted_only') {
      const filtered = availableProducts.filter(isWeightedProduct);
      return filtered.length > 0 ? filtered : availableProducts;
    }
    return availableProducts;
  }, [availableProducts, scope, selectedIds]);

  // Transform products into PLU items
  const pluRows = useMemo(() => {
    return targetProducts.map((p, index) => {
      const plu = pluStart + index;
      const rawDigits = cleanDigits(p.barcode || p.sku || p.id, String(plu));
      const codeLength = scaleConfig.productCodeLength;
      let itemCode = rawDigits;

      if (padItemCode) {
        if (itemCode.length > codeLength) {
          itemCode = itemCode.slice(-codeLength);
        } else {
          itemCode = itemCode.padStart(codeLength, '0');
        }
      }

      const price = Number((p as any).retail_price ?? (p as any).retailPrice ?? (p as any).price ?? 0);
      const catId = (p as any).category_id || p.categoryId;
      const category = (catId && categoryNames[catId]) || 'عام';
      const sampleWeightBarcode = `${scaleConfig.prefix}${itemCode}012500`; // sample 1.250 kg

      return {
        plu,
        itemCode,
        id: p.id,
        name: p.name,
        price,
        category,
        sampleWeightBarcode,
      };
    });
  }, [targetProducts, pluStart, padItemCode, scaleConfig, categoryNames]);

  const handleExportCsv = () => {
    const today = new Date().toISOString().slice(0, 10);

    if (preset === 'rongta') {
      // Rongta RLS1000 / RLink import format
      const headers = ['LFCode', 'Code', 'Name', 'Price', 'Dept', 'BarType'];
      const rows = pluRows.map((r) => [r.plu, r.itemCode, r.name, r.price.toFixed(2), departmentId, 0]);
      downloadCsv(`Rongta_PLU_${today}.csv`, headers, rows);
    } else if (preset === 'cas') {
      // CAS CL5000 / CL-Works format
      const headers = ['PLU_No', 'Item_Code', 'Name', 'Price', 'Dept_No', 'Barcode_Type', 'Unit'];
      const rows = pluRows.map((r) => [r.plu, r.itemCode, r.name, r.price.toFixed(2), departmentId, 7, 'kg']);
      downloadCsv(`CAS_Scale_PLU_${today}.csv`, headers, rows);
    } else if (preset === 'dibal') {
      // Dibal Scale format
      const headers = ['Code', 'Name', 'Price', 'Section', 'DirectKey', 'Barcode'];
      const rows = pluRows.map((r) => [r.plu, r.name, r.price.toFixed(2), departmentId, r.plu <= 99 ? r.plu : '', r.itemCode]);
      downloadCsv(`Dibal_PLU_${today}.csv`, headers, rows);
    } else {
      // General Universal CSV
      const headers = ['PLU', 'كود الصنف بالميزان', 'اسم الصنف', 'السعر للكيلو', 'القسم', 'بادئة الباركود', 'باركود تجريبي للوزن'];
      const rows = pluRows.map((r) => [r.plu, r.itemCode, r.name, r.price.toFixed(2), r.category, scaleConfig.prefix, r.sampleWeightBarcode]);
      downloadCsv(`Scale_PLU_${today}.csv`, headers, rows);
    }
  };

  const handleExportExcel = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      'رقم PLU',
      'كود الصنف بالميزان (Item Code)',
      'اسم الصنف',
      'سعر الكيلو',
      'القسم',
      'بادئة الميزان بالنظام',
      'نموذج باركود وزني (1.25 كجم)',
    ];
    const rows = pluRows.map((r) => [
      r.plu,
      r.itemCode,
      r.name,
      r.price,
      r.category,
      scaleConfig.prefix,
      r.sampleWeightBarcode,
    ]);
    await downloadExcelFile(`موازين_الباركود_PLU_${today}.xlsx`, headers, rows);
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(880px, 96vw)"
      ariaLabel="تصدير ملف موازين الباركود"
    >
      <div className="page-stack" style={{ padding: '8px' }} dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold' }}>
              ⚖️ تصدير ملف موازين الباركود الإلكترونية (PLU Export)
            </h2>
            <p className="muted small" style={{ margin: '4px 0 0 0' }}>
              توليد ملفات الأصناف والأسعار المتوافقة مع برامج موازين الباركود (Rongta, CAS, Dibal) لبرمجتها بضغطة زر.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Integration Note with POS */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', fontSize: '0.85em', color: '#334155' }}>
          <div style={{ fontWeight: 'bold', color: '#170e5e', marginBottom: '4px' }}>
            🔗 الربط مع نقاط البيع (POS):
          </div>
          النظام مهيأ لاستقبال الباركود الموزون الذي يبدأ بـ <strong>{scaleConfig.prefix}</strong>، مع كود صنف بطول <strong>{scaleConfig.productCodeLength}</strong> أرقام، و <strong>{scaleConfig.weightDigits}</strong> خانات للوزن. عند قراءة باركود الملصق المطبوع من الميزان سيتعرف الكاشير فوراً على الصنف ويحسب الوزن والسعر تلقائياً.
        </div>

        {/* Controls Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <Field label="نوع الميزان / البرنامج">
            <select value={preset} onChange={(e) => setPreset(e.target.value as ScalePreset)}>
              <option value="rongta">Rongta (RLS1000 / RLink) - الأكثر شيوعاً</option>
              <option value="cas">CAS (CL5000 / CL-Works)</option>
              <option value="dibal">Dibal (Series 500 / Wind)</option>
              <option value="general">ملف موازين عام (Universal Format)</option>
            </select>
          </Field>

          <Field label="نطاق الأصناف">
            <select value={scope} onChange={(e) => setScope(e.target.value as ScaleScope)}>
              <option value="weighted_only">الأصناف الموزونة فقط ({availableProducts.filter(isWeightedProduct).length} صنف)</option>
              <option value="all">جميع الأصناف النشطة ({availableProducts.length} صنف)</option>
              {selectedIds.length > 0 && (
                <option value="selected">الأصناف المحددة حالياً ({selectedIds.length} صنف)</option>
              )}
            </select>
          </Field>

          <Field label="بداية رقم الـ PLU">
            <input
              type="number"
              min={1}
              value={pluStart}
              onChange={(e) => setPluStart(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>

          <Field label="رقم القسم الافتراضي (Dept)">
            <input
              type="number"
              min={1}
              value={departmentId}
              onChange={(e) => setDepartmentId(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
        </div>

        {/* Padding toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', color: '#475569' }}>
          <input
            type="checkbox"
            id="pad-code-checkbox"
            checked={padItemCode}
            onChange={(e) => setPadItemCode(e.target.checked)}
          />
          <label htmlFor="pad-code-checkbox" style={{ cursor: 'pointer' }}>
            تنسيق كود الصنف ليطابق طول إعدادات الباركود الموزون ({scaleConfig.productCodeLength} أرقام مع أصفار يسار مثل 00101)
          </label>
        </div>

        {/* Live Preview Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '10px 14px', fontWeight: 'bold', fontSize: '0.9em', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>معاينة الأصناف الجاهزة للتصدير ({pluRows.length} صنف)</span>
            <span className="muted small">معروض أول 5 أصناف</span>
          </div>

          <DataTable
            ariaLabel="معاينة أصناف الميزان"
            columns={[
              { key: 'plu', header: 'PLU', cell: (r) => <strong>{r.plu}</strong> },
              { key: 'itemCode', header: 'كود الميزان', cell: (r) => <code style={{ color: '#170e5e' }}>{r.itemCode}</code> },
              { key: 'name', header: 'اسم الصنف', cell: (r) => r.name },
              { key: 'price', header: 'السعر للكيلو', cell: (r) => formatCurrency(r.price) },
              { key: 'category', header: 'القسم', cell: (r) => r.category },
              { key: 'sample', header: 'شكل الباركود الناتج من الميزان', cell: (r) => <span className="nav-pill" style={{ fontFamily: 'monospace' }}>{r.sampleWeightBarcode}</span> },
            ]}
            rows={pluRows.slice(0, 5)}
            empty={<div className="muted small" style={{ padding: '16px', textAlign: 'center' }}>لا توجد أصناف مطابقة للتصدير.</div>}
          />
        </div>

        {/* Operational Instructions */}
        <div style={{ fontSize: '0.8em', color: '#64748b', background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px' }}>
          💡 <strong>طريقة التنزيل للميزان:</strong> قم بتحميل ملف الـ CSV ثم افتح برنامج الميزان (مثل RLS1000 Tool أو CL-Works)، اختر <strong>Import PLU</strong> وحدد الملف المحمل، ثم اضغط <strong>Download to Scale</strong> لإرسال جميع الأصناف والأسعار إلى شاشة الميزان وأزرار الاختصار السريع.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="secondary" onClick={handleExportExcel} disabled={pluRows.length === 0}>
            تصدير ملف Excel (.xlsx)
          </Button>
          <Button
            onClick={handleExportCsv}
            disabled={pluRows.length === 0}
            style={{ background: '#170e5e', color: '#ffffff' }}
          >
            تحميل ملف CSV للميزان 📥
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
