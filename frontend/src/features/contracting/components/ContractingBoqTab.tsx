import { useState } from 'react';
import { ContractingBoqItem } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { downloadExcelFile } from '@/lib/browser';
import { getTextDirection } from '@/lib/arabic-normalization';
import { contractingApi } from '../api/contracting.api';
import { ImportBoqModal } from './ImportBoqModal';
import { ImportMasterBoqModal } from './ImportMasterBoqModal';
import { AutoPricingModal } from './AutoPricingModal';
import { ClientQuotationModal } from './ClientQuotationModal';
import { ProjectMaterialsMrpModal } from './ProjectMaterialsMrpModal';
import { BoqProfitabilityModal } from './BoqProfitabilityModal';
import { CostSnapshotModal } from './CostSnapshotModal';
import { CreateBoqItemModal } from './CreateBoqItemModal';

interface ContractingBoqTabProps {
  items: ContractingBoqItem[];
  loading: boolean;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  onNewItem: () => void;
  onRefresh?: () => void;
}

const TRADE_LABELS: Record<string, string> = {
  civil_concrete: 'الأعمال المدنية والخرسانات',
  masonry_insulation: 'أعمال المباني والعزل',
  finishes: 'أعمال التشطيبات والديكور',
  doors_windows_facades: 'النجارة والألوميتال والواجهات',
  steel_structures: 'الإنشاءات المعدنية',
  electrical: 'أعمال الكهرباء والإنارة',
  smart_systems_elv: 'التيار الخفيف والسمارت',
  plumbing: 'الأعمال الصحية والسباكة',
  hvac_firefighting: 'التكييف ومكافحة الحريق',
  landscape_infrastructure: 'الموقع العام واللاندسكيب',
  earthworks: 'أعمال الحفر والردم',
  concrete: 'الخرسانات المسلحة',
  masonry: 'أعمال المباني',
  mep: 'الكهروميكانيك',
  architecture_finishes: 'أعمال التشطيبات والمعماري',
  plumbing_sanitary: 'الأعمال الصحية والتغذية',
  electrical_power: 'أعمال الكهرباء والإنارة',
  general: 'أعمال عامة',
  other: 'أعمال عامة',
};

// Safe number parser to prevent any NaN from breaking the UI
const getNum = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

export function ContractingBoqTab({
  items,
  loading,
  projectId,
  projectName,
  clientName,
  onNewItem,
  onRefresh,
}: ContractingBoqTabProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportMasterOpen, setIsImportMasterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAutoPricingOpen, setIsAutoPricingOpen] = useState(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [isMrpOpen, setIsMrpOpen] = useState(false);
  const [isProfitabilityOpen, setIsProfitabilityOpen] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  // Edit & Delete states
  const [editingItem, setEditingItem] = useState<ContractingBoqItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Summary KPIs (Guarded against any NaN)
  const totalContractValue = items.reduce((sum, item) => {
    const qty = getNum(item.revisedQty ?? (item as any).revised_qty ?? item.contractQty ?? (item as any).contract_qty);
    const price = getNum(item.unitPrice ?? (item as any).unit_price);
    return sum + (qty * price);
  }, 0);

  const totalEstimatedCost = items.reduce((sum, item) => {
    const qty = getNum(item.revisedQty ?? (item as any).revised_qty ?? item.contractQty ?? (item as any).contract_qty);
    const cost = getNum(item.estimatedUnitCost ?? (item as any).estimated_unit_cost);
    return sum + (qty * cost);
  }, 0);

  const plannedMargin = totalContractValue > 0 ? ((totalContractValue - totalEstimatedCost) / totalContractValue) * 100 : 0;
  
  const executedValue = items.reduce((sum, item) => {
    const execQty = getNum(item.executedQty ?? (item as any).executed_qty);
    const price = getNum(item.unitPrice ?? (item as any).unit_price);
    return sum + (execQty * price);
  }, 0);

  const overallProgress = totalContractValue > 0 ? (executedValue / totalContractValue) * 100 : 0;

  const handleDeleteItem = async (id: string, code: string, desc: string) => {
    if (!confirm(`هل أنت متأكد من حذف البند [${code}] "${desc.slice(0, 35)}..." نهائياً من المقايسة؟`)) {
      return;
    }
    setDeletingId(id);
    try {
      await contractingApi.deleteBoqItem(id);
      setNotification({ type: 'success', text: `تم حذف البند [${code}] بنجاح من المقايسة` });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'تعذر حذف البند من المقايسة' });
    } finally {
      setDeletingId(null);
    }
  };

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
        const contractQty = getNum(item.contractQty ?? (item as any).contract_qty);
        const revisedQty = getNum(item.revisedQty ?? (item as any).revised_qty ?? contractQty);
        const unitPrice = getNum(item.unitPrice ?? (item as any).unit_price);
        const total = revisedQty * unitPrice;
        const executedQty = getNum(item.executedQty ?? (item as any).executed_qty);
        const completion = revisedQty > 0 ? Math.min(100, Math.round((executedQty / revisedQty) * 100)) : 0;

        return [
          item.itemCode || (item as any).item_code || '',
          item.description,
          TRADE_LABELS[item.category] || item.category,
          item.unit,
          contractQty,
          revisedQty,
          unitPrice,
          total,
          getNum(item.estimatedUnitCost ?? (item as any).estimated_unit_cost),
          executedQty,
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
      {/* إشعار النجاح أو الخطأ */}
      {notification && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: 'var(--font-body)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: notification.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          <span>{notification.text}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <AppIcons.X size={16} />
          </button>
        </div>
      )}

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

          {/* سحب من بنك البنود المرجعي */}
          {projectId && (
            <button
              type="button"
              onClick={() => setIsImportMasterOpen(true)}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                fontWeight: 600,
                background: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #bfdbfe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: 'var(--font-body)',
              }}
            >
              <AppIcons.Layers size={15} />
              <span>بنك البنود المرجعي</span>
            </button>
          )}

          {/* إضافة بند تعاقدي جديد */}
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
              boxShadow: '0 1px 2px rgba(23, 14, 94, 0.2)',
            }}
          >
            <AppIcons.Plus size={15} />
            <span>إضافة بند تعاقدي (SOV)</span>
          </button>
        </div>
      </div>

      {/* شريط الأدوات والعمليات الهندسية المتقدمة */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <span style={{ fontSize: 'var(--font-micro)', fontWeight: 700, color: '#475569', marginInlineEnd: '4px' }}>
          الأدوات الهندسية والتحليل المالي:
        </span>

        {/* محرك التسعير الهندسي */}
        <button
          type="button"
          onClick={() => setIsAutoPricingOpen(true)}
          style={{
            height: '32px',
            padding: '0 12px',
            borderRadius: '6px',
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
          <AppIcons.Calculator size={14} />
          <span>محرك التسعير الهندسي</span>
        </button>

        {/* عرض سعر رسمي للعميل */}
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => setIsQuotationOpen(true)}
          style={{
            height: '32px',
            padding: '0 12px',
            borderRadius: '6px',
            fontWeight: 600,
            background: '#f8fafc',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: items.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: 'var(--font-body)',
            opacity: items.length > 0 ? 1 : 0.6,
          }}
        >
          <AppIcons.Printer size={14} />
          <span>عرض سعر رسمي للعميل</span>
        </button>

        {/* حصر خامات المشروع MRP */}
        {projectId && (
          <button
            type="button"
            onClick={() => setIsMrpOpen(true)}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              fontWeight: 600,
              background: '#f8fafc',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
            }}
          >
            <AppIcons.Box size={14} />
            <span>حصر خامات المشروع (MRP)</span>
          </button>
        )}

        {/* تحليل ربحية البنود */}
        {projectId && (
          <button
            type="button"
            onClick={() => setIsProfitabilityOpen(true)}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              fontWeight: 600,
              background: '#f8fafc',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
            }}
          >
            <AppIcons.TrendingUp size={14} />
            <span>تحليل أرباح وخسائر البنود</span>
          </button>
        )}

        {/* تجميد الميزانية */}
        {projectId && (
          <button
            type="button"
            onClick={() => setIsSnapshotOpen(true)}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              fontWeight: 600,
              background: '#f8fafc',
              color: '#7c3aed',
              border: '1px solid #ddd6fe',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
            }}
          >
            <AppIcons.Lock size={14} />
            <span>تجميد خط الأساس (Baseline Lock)</span>
          </button>
        )}
      </div>

      {/* شريط الإحصائيات المصغر للجدول */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي قيمة جدول الكميات</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {totalContractValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي قيمة جدول الكميات</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span>{totalContractValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>التكلفة التقديرية المستهدفة</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span>{totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
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

      {/* تنبيه توجيهي أنيق عند استيراد بنود جديدة بدون كميات */}
      {items.length > 0 && totalContractValue === 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: 'var(--font-body)',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 1px 2px rgba(245, 158, 11, 0.05)',
          }}
        >
          <div style={{ color: '#d97706', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <AppIcons.AlertCircle size={18} />
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <strong>تنويه:</strong> تم سحب البنود بنجاح من بنك البنود المرجعي. يرجى الضغط على زر <strong style={{ textDecoration: 'underline' }}>"0 (حدد الكمية)"</strong> أو زر التعديل أمام كل بند لتحديد كميات هذا المشروع وحساب إجمالي القيمة تلقائياً.
          </div>
        </div>
      )}

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
              أضف بنود الأعمال والمقايسة للمشروع يدوياً أو قم باستيرادها مباشرة من ملف Excel أو سحبها من بنك البنود المرجعي.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
              {projectId && (
                <button
                  type="button"
                  onClick={() => setIsImportMasterOpen(true)}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    background: '#eff6ff',
                    color: '#1e40af',
                    border: '1px solid #bfdbfe',
                    cursor: 'pointer',
                    fontSize: 'var(--font-body)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AppIcons.Layers size={15} />
                  <span>سحب تخصصات جاهزة من بنك البنود</span>
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
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table
              style={{
                width: '100%',
                minWidth: '1240px',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                textAlign: 'right',
              }}
            >
              <colgroup>
                <col style={{ width: '95px' }} />
                <col style={{ width: '330px' }} />
                <col style={{ width: '75px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '135px' }} />
                <col style={{ width: '85px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '95px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 10px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>كود البند</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'right' }}>بيان الأعمال والمواصفات</th>
                  <th style={{ padding: '12px 8px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الوحدة</th>
                  <th style={{ padding: '12px 10px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الكمية التعاقدية</th>
                  <th style={{ padding: '12px 10px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الكمية المعدلة</th>
                  <th style={{ padding: '12px 10px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>سعر الفئة</th>
                  <th style={{ padding: '12px 10px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>إجمالي القيمة</th>
                  <th style={{ padding: '12px 8px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>المنفذ</th>
                  <th style={{ padding: '12px 10px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>نسبة الإنجاز</th>
                  <th style={{ padding: '12px 10px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const contractQty = getNum(item.contractQty ?? (item as any).contract_qty);
                  const revisedQty = getNum(item.revisedQty ?? (item as any).revised_qty ?? contractQty);
                  const unitPrice = getNum(item.unitPrice ?? (item as any).unit_price);
                  const total = revisedQty * unitPrice;
                  const executedQty = getNum(item.executedQty ?? (item as any).executed_qty);
                  const completion = revisedQty > 0 ? Math.min(100, Math.round((executedQty / revisedQty) * 100)) : 0;
                  const itemCode = item.itemCode || (item as any).item_code || '---';
                  const categoryAr = TRADE_LABELS[item.category] || item.category;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* 1. كود البند */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#170e5e',
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            display: 'inline-block',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {itemCode}
                        </span>
                      </td>

                      {/* 2. بيان الأعمال والمواصفات */}
                      {(() => {
                        const dir = getTextDirection(item.description);
                        const isRtl = dir === 'rtl';
                        return (
                          <td
                            dir={dir}
                            style={{
                              padding: '12px 14px',
                              textAlign: isRtl ? 'right' : 'left',
                              verticalAlign: 'middle',
                            }}
                          >
                            <div
                              dir={dir}
                              className="text-justify spec-description"
                              style={{
                                fontSize: 'var(--font-body)',
                                fontWeight: 600,
                                color: '#0f172a',
                                marginBottom: '6px',
                                lineHeight: 1.6,
                                textAlign: 'justify',
                                textJustify: 'inter-word',
                                textAlignLast: isRtl ? 'right' : 'left',
                                wordBreak: 'break-word',
                                whiteSpace: 'normal',
                                direction: dir,
                              }}
                            >
                              {item.description}
                            </div>
                            {categoryAr && (
                              <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                                <span
                                  style={{
                                    fontSize: 'var(--font-micro)',
                                    color: '#475569',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    display: 'inline-block',
                                  }}
                                >
                                  {categoryAr}
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })()}

                      {/* 3. الوحدة */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: 'var(--font-micro)',
                            color: '#475569',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            display: 'inline-block',
                          }}
                        >
                          {item.unit || '---'}
                        </span>
                      </td>

                      {/* 4. الكمية التعاقدية */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        {contractQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            title="انقر لتحديد كمية المشروع وحساب إجمالي القيمة"
                            style={{
                              background: '#fffbeb',
                              border: '1px dashed #f59e0b',
                              color: '#b45309',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              margin: '0 auto',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#fef3c7';
                              e.currentTarget.style.borderColor = '#d97706';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#fffbeb';
                              e.currentTarget.style.borderColor = '#f59e0b';
                            }}
                          >
                            <AppIcons.Edit size={12} />
                            <span>0 (حدد الكمية)</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                            {contractQty.toLocaleString('en-US')}
                          </span>
                        )}
                      </td>

                      {/* 5. الكمية المعدلة */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: 'var(--font-body)',
                            fontWeight: 600,
                            color: revisedQty !== contractQty ? '#1e40af' : '#475569',
                          }}
                        >
                          {revisedQty.toLocaleString('en-US')}
                        </span>
                      </td>

                      {/* 6. سعر الفئة */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px' }}>
                          <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                            {unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>ج.م</span>
                        </div>
                      </td>

                      {/* 7. إجمالي القيمة */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px' }}>
                          <span
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: 800,
                              color: total > 0 ? '#170e5e' : '#94a3b8',
                            }}
                          >
                            {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>ج.م</span>
                        </div>
                      </td>

                      {/* 8. المنفذ */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: 'var(--font-body)',
                            fontWeight: 600,
                            color: executedQty > 0 ? '#15803d' : '#94a3b8',
                          }}
                        >
                          {executedQty.toLocaleString('en-US')}
                        </span>
                      </td>

                      {/* 9. نسبة الإنجاز */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%', maxWidth: '100px', margin: '0 auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.72rem', fontWeight: 700, color: completion >= 100 ? '#15803d' : '#334155' }}>
                            <span>الإنجاز</span>
                            <span>{completion}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(completion, 100)}%`,
                                height: '100%',
                                background: completion >= 100 ? '#10b981' : '#170e5e',
                                borderRadius: '3px',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 10. الإجراءات */}
                      <td style={{ padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            title="تعديل بيانات البند والكميات"
                            onClick={() => setEditingItem(item)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: '#f1f5f9',
                              color: '#1e293b',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#e2e8f0';
                              e.currentTarget.style.color = '#170e5e';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.color = '#1e293b';
                            }}
                          >
                            <AppIcons.Edit size={13} />
                          </button>
                          <button
                            type="button"
                            title="حذف البند من المقايسة"
                            disabled={deletingId === item.id}
                            onClick={() => handleDeleteItem(item.id, itemCode, item.description)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: deletingId === item.id ? 0.6 : 1,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (deletingId !== item.id) {
                                e.currentTarget.style.background = '#fee2e2';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#fef2f2';
                            }}
                          >
                            <AppIcons.Trash size={13} />
                          </button>
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

      {/* مودال تعديل البند */}
      {editingItem && projectId && (
        <CreateBoqItemModal
          open={Boolean(editingItem)}
          projectId={projectId}
          projectName={projectName}
          initialItem={editingItem}
          onClose={() => setEditingItem(null)}
          onCreated={() => {
            setEditingItem(null);
            setNotification({ type: 'success', text: 'تم تحديث بيانات البند بنجاح' });
            if (onRefresh) onRefresh();
          }}
        />
      )}

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

      {/* مودال استيراد بنود من بنك المقاولات المرجعي الشامل */}
      {isImportMasterOpen && projectId && (
        <ImportMasterBoqModal
          open={isImportMasterOpen}
          projectId={projectId}
          projectName={projectName || ''}
          onClose={() => setIsImportMasterOpen(false)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* مودال محرك التسعير الهندسي */}
      {isAutoPricingOpen && (
        <AutoPricingModal
          isOpen={isAutoPricingOpen}
          onClose={() => setIsAutoPricingOpen(false)}
        />
      )}

      {/* مودال عرض السعر الرسمي للعميل */}
      {isQuotationOpen && (
        <ClientQuotationModal
          isOpen={isQuotationOpen}
          onClose={() => setIsQuotationOpen(false)}
          projectName={projectName}
          clientName={clientName}
          items={items}
        />
      )}

      {/* مودال حصر خامات المشروع MRP */}
      {isMrpOpen && projectId && (
        <ProjectMaterialsMrpModal
          isOpen={isMrpOpen}
          onClose={() => setIsMrpOpen(false)}
          projectId={projectId}
          projectName={projectName}
        />
      )}

      {/* مودال تحليل ربحية وخسائر البنود */}
      {isProfitabilityOpen && projectId && (
        <BoqProfitabilityModal
          isOpen={isProfitabilityOpen}
          onClose={() => setIsProfitabilityOpen(false)}
          projectId={projectId}
          projectName={projectName}
        />
      )}

      {/* مودال تجميد الميزانية */}
      {isSnapshotOpen && projectId && (
        <CostSnapshotModal
          isOpen={isSnapshotOpen}
          onClose={() => setIsSnapshotOpen(false)}
          projectId={projectId}
          projectName={projectName}
        />
      )}
    </div>
  );
}
