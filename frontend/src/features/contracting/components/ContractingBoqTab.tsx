import { useState } from 'react';
import { ContractingBoqItem } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { downloadExcelFile } from '@/lib/browser';
import { ImportBoqModal } from './ImportBoqModal';

interface ContractingBoqTabProps {
  items: ContractingBoqItem[];
  loading: boolean;
  projectId?: string;
  projectName?: string;
  onNewItem: () => void;
  onRefresh?: () => void;
}

export function ContractingBoqTab({
  items,
  loading,
  projectId,
  projectName,
  onNewItem,
  onRefresh,
}: ContractingBoqTabProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Summary KPIs
  const totalContractValue = items.reduce((sum, item) => sum + (Number(item.revisedQty || item.contractQty) * Number(item.unitPrice)), 0);
  const totalEstimatedCost = items.reduce((sum, item) => sum + (Number(item.revisedQty || item.contractQty) * Number(item.estimatedUnitCost || 0)), 0);
  const plannedMargin = totalContractValue > 0 ? ((totalContractValue - totalEstimatedCost) / totalContractValue) * 100 : 0;
  const executedValue = items.reduce((sum, item) => sum + (Number(item.executedQty || 0) * Number(item.unitPrice)), 0);
  const overallProgress = totalContractValue > 0 ? (executedValue / totalContractValue) * 100 : 0;

  const handleExportExcel = async () => {
    if (items.length === 0) return;
    setIsExporting(true);
    try {
      const headers = [
        'كود البند',
        'بيان الأعمال والمواصفات',
        'التصنيف',
        'الوحدة',
        'الكمية التعاقدية',
        'الكمية المعدلة',
        'سعر الفئة التعاقدي',
        'إجمالي القيمة التعاقدية',
        'التكلفة التقديرية للوحدة',
        'الكمية المنفذة',
        'نسبة الإنجاز %',
        'ملاحظات',
      ];

      const rows = items.map((item) => {
        const currentQty = Number(item.revisedQty || item.contractQty);
        const total = currentQty * Number(item.unitPrice);
        const completion = currentQty > 0 ? Math.min(100, Math.round((Number(item.executedQty || 0) / currentQty) * 100)) : 0;

        return [
          item.itemCode,
          item.description,
          item.category,
          item.unit,
          Number(item.contractQty),
          Number(item.revisedQty || item.contractQty),
          Number(item.unitPrice),
          total,
          Number(item.estimatedUnitCost || 0),
          Number(item.executedQty || 0),
          `${completion}%`,
          item.notes || '',
        ];
      });

      const safeProjectName = projectName ? projectName.replace(/[/\\?%*:|"<>]/g, '_') : 'project';
      await downloadExcelFile(`BOQ_${safeProjectName}.xlsx`, headers, rows);
    } catch (err: any) {
      console.error('Failed to export BOQ Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* هيدر التبويب */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            جدول الكميات وفئات البنود التعاقدية (Bill of Quantities / SOV)
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            {projectName ? `المشروع: ${projectName}` : 'إدارة ومتابعة فئات البنود وتكاليفها والكميات المنفذة'}
          </p>
        </div>

        {/* أزرار الإجراءات الرئيسية */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* تصدير إكسيل */}
          <button
            type="button"
            disabled={isExporting || items.length === 0}
            onClick={handleExportExcel}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: items.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: 'var(--font-body)',
              opacity: items.length > 0 ? 1 : 0.6,
            }}
          >
            <AppIcons.Download size={14} />
            <span>{isExporting ? 'جاري التصدير...' : 'تصدير Excel'}</span>
          </button>

          {/* استيراد إكسيل */}
          {projectId && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                fontWeight: 600,
                background: '#f8fafc',
                color: '#170e5e',
                border: '1px solid #cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: 'var(--font-body)',
              }}
            >
              <AppIcons.FileSpreadsheet size={15} />
              <span>استيراد من Excel</span>
            </button>
          )}

          {/* إضافة بند فردي */}
          <button
            type="button"
            onClick={onNewItem}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 700,
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
            }}
          >
            <AppIcons.Plus size={15} />
            <span>إضافة بند تعاقدي (SOV)</span>
          </button>
        </div>
      </div>

      {/* شريط الإحصائيات المصغر للجدول */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي قيمة جدول الكميات</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {totalContractValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>التكلفة التقديرية المستهدفة</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>هامش الربح المخطط</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: plannedMargin >= 0 ? '#15803d' : '#b91c1c', marginTop: '2px' }}>
            {plannedMargin.toFixed(1)}%
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>نسبة الإنجاز المالي المحقق</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
            {overallProgress.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* جدول البنود */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 'var(--font-body)' }}>
            جاري تحميل جدول الكميات...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <AppIcons.FileText size={48} />
            </div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              لا توجد بنود تعاقدية مسجلة لهذا المشروع
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
              أضف بنود الأعمال والمقايسة للمشروع يدوياً أو قم باستيرادها مباشرة من ملف Excel لتتمكن من إصدار المستخلصات الدورية.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {projectId && (
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    background: '#f8fafc',
                    color: '#170e5e',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontSize: 'var(--font-body)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AppIcons.FileSpreadsheet size={15} />
                  <span>استيراد جدول المقايسة من Excel</span>
                </button>
              )}
              <button
                type="button"
                onClick={onNewItem}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--font-body)',
                }}
              >
                إضافة بند جديد يدوياً
              </button>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>رقم البند</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>بيان الأعمال والمواصفات</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الوحدة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الكمية التعاقدية</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الكمية المعدلة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>سعر الفئة التعاقدي</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>إجمالي القيمة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الكمية المنفذة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>نسبة الإنجاز</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const currentQty = Number(item.revisedQty || item.contractQty);
                  const total = currentQty * Number(item.unitPrice);
                  const completion = currentQty > 0 ? Math.min(100, Math.round((Number(item.executedQty || 0) / currentQty) * 100)) : 0;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                        {item.itemCode}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 500, color: '#0f172a', maxWidth: '300px' }}>
                        <div>{item.description}</div>
                        {item.category && (
                          <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {item.category}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#475569', textAlign: 'center' }}>
                        {item.unit}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
                        {Number(item.contractQty).toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: item.revisedQty ? '#1e40af' : '#64748b' }}>
                        {Number(item.revisedQty || item.contractQty).toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
                        {Number(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                        {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#0f172a' }}>
                        {Number(item.executedQty || 0).toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(completion, 100)}%`, height: '100%', background: completion >= 100 ? '#10b981' : '#170e5e' }} />
                          </div>
                          <span style={{ fontSize: 'var(--font-micro)', fontWeight: 700, color: '#334155', minWidth: '35px' }}>
                            {completion.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال استيراد الإكسيل */}
      {isImportModalOpen && projectId && (
        <ImportBoqModal
          open={isImportModalOpen}
          projectId={projectId}
          projectName={projectName}
          onClose={() => setIsImportModalOpen(false)}
          onImported={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
