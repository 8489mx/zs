import { useState, useEffect, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { ImportMasterBoqModal } from '../components/ImportMasterBoqModal';
import { AutoPricingModal } from '../components/AutoPricingModal';
import { ClientQuotationModal } from '../components/ClientQuotationModal';
import { BRICK_SIZE_PRESETS } from '../components/TenderEstimatorModal';
import { useContracting } from '../context/ContractingContext';

interface TenderItemComponent {
  componentCode: string;
  componentName: string;
  unit: string;
  qtyPerUnit: number;
  unitRate: number;
  componentType: 'material' | 'labor' | 'equipment' | 'subcontractor';
}

interface TenderItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  estimatedQty: number;
  trade: string;
  components: TenderItemComponent[];
  wastePercent: number;
  overheadPercent: number;
  profitMarkupPercent: number;
  notes?: string;
  drawingLength?: number;
  drawingWidth?: number;
  drawingHeight?: number;
  drawingCount?: number;
}

export function ContractingTenderPage() {
  const navigate = useNavigate();
  const { formatCurrency } = useSystemCurrency();
  const { reloadProjects, setSelectedProjectId } = useContracting();

  // Basic Tender Information
  const [projectName, setProjectName] = useState('عطاء: مشروع إنشاء وتشطيب متكامل');
  const [clientName, setClientName] = useState('شركة الأفق للتطوير والاستثمار العقاري');
  const [durationMonths] = useState(8);
  const [globalProfitMargin, setGlobalProfitMargin] = useState(15);
  const [globalOverhead, setGlobalOverhead] = useState(7);
  const [globalWaste, setGlobalWaste] = useState(5);

  // Constants & Loading State
  const [, setLoadingConstants] = useState(true);
  const [engineeringConstants, setEngineeringConstants] = useState<any[]>([]);
  const [items, setItems] = useState<TenderItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Sub-modals & CAD Form State
  const [isImportMasterOpen, setIsImportMasterOpen] = useState(false);
  const [isAutoPricingOpen, setIsAutoPricingOpen] = useState(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [isCadTakeoffFormOpen, setIsCadTakeoffFormOpen] = useState(false);
  const [cadItemCode, setCadItemCode] = useState('BRK-RED-12');
  const [cadLength, setCadLength] = useState(25);
  const [cadWidth] = useState(1);
  const [cadHeight, setCadHeight] = useState(3.2);
  const [cadCount, setCadCount] = useState(4);
  const [cadDeductions, setCadDeductions] = useState(12);

  // Brick Dimensions & Dynamic Rate States
  const [cadBrickPreset, setCadBrickPreset] = useState('BRK_25_12_6');
  const [customBrickLength] = useState(25);
  const [customBrickWidth] = useState(12);
  const [customBrickHeight] = useState(6);
  const [mortarJoint] = useState(1.0);

  // Saving / Awarding State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Calculated Brick Rate
  const calculatedBrickRate = useMemo(() => {
    const preset = BRICK_SIZE_PRESETS.find((p) => p.id === cadBrickPreset);
    if (preset && preset.id !== 'CUSTOM') {
      return {
        ratePerM2: preset.ratePerM2OrM3,
        sandPerM2: preset.sandPerUnit,
        cementPerM2: preset.cementPerUnit,
        unit: preset.unit,
        name: preset.name,
        dimensions: `${preset.lengthCm}×${preset.widthCm}×${preset.heightCm} سم`,
        isCustom: false,
      };
    }
    const L = Math.max(0.05, (customBrickLength + mortarJoint) / 100);
    const H = Math.max(0.03, (customBrickHeight + mortarJoint) / 100);
    const ratePerM2 = Math.round((1 / (L * H)) * 10) / 10;
    const wallVol = 1.0 * (customBrickWidth / 100);
    const actualBrkVol = ratePerM2 * (customBrickLength / 100) * (customBrickWidth / 100) * (customBrickHeight / 100);
    const mortarVol = Math.max(0.008, wallVol - actualBrkVol);
    const sandPerM2 = Math.round(mortarVol * 1.1 * 1000) / 1000;
    const cementPerM2 = Math.round(mortarVol * 0.35 * 1000) / 1000;

    return {
      ratePerM2,
      sandPerM2,
      cementPerM2,
      unit: 'm2',
      name: `مقاس مخصص (${customBrickLength}×${customBrickWidth}×${customBrickHeight} سم)`,
      dimensions: `${customBrickLength}×${customBrickWidth}×${customBrickHeight} سم`,
      isCustom: true,
    };
  }, [cadBrickPreset, customBrickLength, customBrickWidth, customBrickHeight, mortarJoint]);

  // Load Engineering Constants
  useEffect(() => {
    setLoadingConstants(true);
    contractingApi
      .getEngineeringConstants()
      .then((data) => {
        setEngineeringConstants(data || []);
        if (items.length === 0 && data && data.length > 0) {
          const defaultCodes = ['BRK-RED-12', 'CONC-FTG-C30', 'CONC-COL-C35', 'CONC-SLB-C30', 'PLAS-INT-01', 'TILE-FLR-CER', 'PAINT-INT-03'];
          const initialTenderItems: TenderItem[] = [];

          defaultCodes.forEach((code) => {
            const found = data.find((c: any) => c.itemCode === code);
            if (found) {
              let defQty = 500;
              if (code === 'BRK-RED-12') defQty = 1200;
              if (code === 'CONC-FTG-C30') defQty = 180;
              if (code === 'CONC-COL-C35') defQty = 95;
              if (code === 'CONC-SLB-C30') defQty = 320;
              if (code === 'PLAS-INT-01') defQty = 2400;
              if (code === 'TILE-FLR-CER') defQty = 850;
              if (code === 'PAINT-INT-03') defQty = 2400;

              initialTenderItems.push({
                id: `TND-${Math.random().toString(36).slice(2, 9)}`,
                itemCode: found.itemCode,
                description: found.itemName,
                unit: found.unit,
                estimatedQty: defQty,
                trade: found.itemCode.startsWith('BRK') ? 'masonry' : found.itemCode.startsWith('CONC') ? 'concrete' : found.itemCode.startsWith('PLAS') ? 'plastering' : found.itemCode.startsWith('TILE') ? 'flooring' : 'finishes',
                components: found.components || [],
                wastePercent: found.wastePercent || 5,
                overheadPercent: found.overheadPercent || 7,
                profitMarkupPercent: found.profitMarkupPercent || 15,
                notes: found.notes,
              });
            }
          });

          if (initialTenderItems.length > 0) {
            setItems(initialTenderItems);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load engineering constants:', err);
      })
      .finally(() => setLoadingConstants(false));
  }, []);

  // Apply Global Margins to All Items
  const handleApplyGlobalMargins = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        profitMarkupPercent: globalProfitMargin,
        overheadPercent: globalOverhead,
        wastePercent: globalWaste,
      }))
    );
    toast.success('تم تعميم نسب الأرباح والمصاريف والهالك على كافة البنود بنجاح');
  };

  // Add Item From Quick CAD Takeoff
  const handleAddFromCadTakeoff = () => {
    const constant = engineeringConstants.find((c) => c.itemCode === cadItemCode);
    if (!constant) {
      toast.warning('يرجى اختيار نوع البند أولاً');
      return;
    }

    const baseProduct = cadLength * cadWidth * cadHeight * cadCount;
    const netQty = Math.max(1, Math.round((baseProduct - cadDeductions) * 100) / 100);

    let itemComponents = constant.components ? [...constant.components] : [];
    let customDesc = `${constant.itemName} (حصر لوحات: ${cadLength}×${cadHeight}م)`;

    if (constant.itemCode.startsWith('BRK') || constant.itemCode.startsWith('BLK') || constant.itemCode.startsWith('AAC')) {
      const brkPrice = itemComponents.find((c: any) => c.componentType === 'material' && (c.componentCode.includes('BRK') || c.componentCode.includes('BLK') || c.componentCode.includes('AAC')))?.unitRate || (cadBrickPreset.startsWith('AAC') ? 22 : cadBrickPreset.startsWith('BLK') ? 14 : 2.2);
      const sandPrice = itemComponents.find((c: any) => c.componentType === 'material' && c.componentCode.includes('SND'))?.unitRate || 180;
      const cmtPrice = itemComponents.find((c: any) => c.componentType === 'material' && c.componentCode.includes('CMT'))?.unitRate || 2800;
      const labPrice = itemComponents.find((c: any) => c.componentType === 'labor')?.unitRate || 70;

      itemComponents = [
        {
          componentCode: `MAT-${cadBrickPreset}`,
          componentName: `طوب/بلوك بناء (${calculatedBrickRate.dimensions})`,
          unit: 'pcs',
          qtyPerUnit: calculatedBrickRate.ratePerM2,
          unitRate: brkPrice,
          componentType: 'material',
        },
        {
          componentCode: `MAT-SND-01`,
          componentName: `رمل بناء حرش نظيف للمونة`,
          unit: 'm3',
          qtyPerUnit: calculatedBrickRate.sandPerM2,
          unitRate: sandPrice,
          componentType: 'material',
        },
        {
          componentCode: `MAT-CMT-42`,
          componentName: `أسمنت بورتلاندي 42.5 للمونة`,
          unit: 'ton',
          qtyPerUnit: calculatedBrickRate.cementPerM2,
          unitRate: cmtPrice,
          componentType: 'material',
        },
        {
          componentCode: `LAB-MAS-01`,
          componentName: `مصنعية بنا ومساعد ونقل داخلي`,
          unit: constant.unit || 'm2',
          qtyPerUnit: 1,
          unitRate: labPrice,
          componentType: 'labor',
        },
      ];

      customDesc = `${constant.itemName} [مقاس ${calculatedBrickRate.dimensions} - معدل ${calculatedBrickRate.ratePerM2} طوبة/م²] (حصر: ${cadLength}×${cadHeight}م)`;
    }

    const newItem: TenderItem = {
      id: `TND-${Math.random().toString(36).slice(2, 9)}`,
      itemCode: constant.itemCode,
      description: customDesc,
      unit: constant.unit,
      estimatedQty: netQty,
      trade: constant.itemCode.startsWith('BRK') ? 'masonry' : 'concrete',
      components: itemComponents,
      wastePercent: globalWaste,
      overheadPercent: globalOverhead,
      profitMarkupPercent: globalProfitMargin,
      drawingLength: cadLength,
      drawingWidth: cadWidth,
      drawingHeight: cadHeight,
      drawingCount: cadCount,
    };

    setItems((prev) => [newItem, ...prev]);
    setIsCadTakeoffFormOpen(false);
    toast.success(`تم استنتاج الكمية وحصر ${netQty} ${constant.unit} وتفكيك الكود بالمقاس المحدد`);
  };

  // Calculations per item
  const calculateItemRates = (item: TenderItem) => {
    let directCost = 0;
    if (item.components && item.components.length > 0) {
      directCost = item.components.reduce((sum, c) => sum + (c.qtyPerUnit * c.unitRate), 0);
    } else {
      directCost = 100;
    }

    const withWaste = directCost * (1 + (item.wastePercent || 0) / 100);
    const withOverhead = withWaste * (1 + (item.overheadPercent || 0) / 100);
    const sellingUnitPrice = withOverhead * (1 + (item.profitMarkupPercent || 0) / 100);
    const totalItemValue = sellingUnitPrice * item.estimatedQty;
    const totalItemDirectCost = directCost * item.estimatedQty;
    const totalItemProfit = (sellingUnitPrice - directCost) * item.estimatedQty;

    return {
      directCost,
      sellingUnitPrice,
      totalItemValue,
      totalItemDirectCost,
      totalItemProfit,
    };
  };

  // Grand totals across all items
  const grandTotals = useMemo(() => {
    let totalSellingPrice = 0;
    let totalDirectCost = 0;
    let totalProfit = 0;

    items.forEach((item) => {
      const { totalItemValue, totalItemDirectCost, totalItemProfit } = calculateItemRates(item);
      totalSellingPrice += totalItemValue;
      totalDirectCost += totalItemDirectCost;
      totalProfit += totalItemProfit;
    });

    const profitMargin = totalSellingPrice > 0 ? (totalProfit / totalSellingPrice) * 100 : 0;

    return {
      totalSellingPrice,
      totalDirectCost,
      totalProfit,
      profitMargin,
    };
  }, [items]);

  // Pre-Procurement Consolidated Materials Summary (Consolidated MRP)
  const consolidatedMaterials = useMemo(() => {
    const materialsMap: Record<string, { code: string; name: string; unit: string; totalQty: number; totalCost: number }> = {};

    items.forEach((item) => {
      if (item.components && item.components.length > 0) {
        item.components.forEach((c) => {
          const key = c.componentCode || c.componentName;
          const componentTotalQty = c.qtyPerUnit * item.estimatedQty;
          const componentTotalCost = componentTotalQty * c.unitRate;

          if (!materialsMap[key]) {
            materialsMap[key] = {
              code: c.componentCode,
              name: c.componentName,
              unit: c.unit,
              totalQty: componentTotalQty,
              totalCost: componentTotalCost,
            };
          } else {
            materialsMap[key].totalQty += componentTotalQty;
            materialsMap[key].totalCost += componentTotalCost;
          }
        });
      }
    });

    return Object.values(materialsMap);
  }, [items]);

  // Final Award & Project Creation
  const handleAwardAndCreateProject = async () => {
    if (!projectName.trim()) {
      toast.warning('يرجى كتابة اسم العطاء أو المشروع المقترح');
      return;
    }
    if (items.length === 0) {
      toast.warning('يرجى إضافة بند واحد على الأقل للعطاء');
      return;
    }

    const confirmed = await systemConfirm({
      title: 'اعتماد وترسية العطاء وتأسيس المشروع التعاقدي',
      message: `هل أنت متأكد من اعتماد العطاء بقيمة تعاقدية إجمالية (${formatCurrency(grandTotals.totalSellingPrice)}) وترسيته كمشروع رسمي؟ سيتم توليد المقايسة SOV وشيتات الحصر وخطة الاحتياجات آلياً.`,
      confirmText: 'نعم، اعتمد ورسِّ العطاء',
      variant: 'primary',
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const createRes = await contractingApi.createProject({
        name: projectName.trim(),
        clientName: clientName.trim() || 'العميل',
        contractValue: grandTotals.totalSellingPrice,
        status: 'active',
        retentionPercent: 5,
        notes: `تم توليد وترسية هذا المشروع آلياً من منصة دراسة العطاءات وتفكيك الكود (BOM). مدة التنفيذ: ${durationMonths} شهور. التكلفة المباشرة المقدرة: ${grandTotals.totalDirectCost} ج.م.`,
      });

      const newProjectId = createRes.id;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rates = calculateItemRates(item);

        const boqRes = await contractingApi.createBoqItem(newProjectId, {
          itemCode: item.itemCode,
          description: item.description,
          category: item.trade || 'general',
          unit: item.unit,
          contractQty: item.estimatedQty,
          unitPrice: rates.sellingUnitPrice,
          estimatedUnitCost: rates.directCost,
          notes: item.notes,
        });

        if (item.drawingLength || item.drawingWidth || item.drawingHeight) {
          await contractingApi.saveBoqTakeoffs(boqRes.id, {
            takeoffs: [
              {
                drawingRef: 'DWG-TND-01',
                axisRef: 'AX-ALL',
                description: 'حصر أولي من دراسة العطاء والمخططات',
                length: item.drawingLength || 0,
                width: item.drawingWidth || 1,
                height: item.drawingHeight || 1,
                countMultiplier: item.drawingCount || 1,
                voidDeduction: 0,
                netQty: item.estimatedQty,
                wastePercent: item.wastePercent || 0,
                totalWithWaste: item.estimatedQty * (1 + (item.wastePercent || 0) / 100),
              },
            ],
            syncToBoqQuantity: true,
          });
        }
      }

      toast.success('تمت ترسية العطاء وتأسيس المشروع وتوليد مقايسة الكميات بنجاح!');
      await reloadProjects();
      setSelectedProjectId(newProjectId);
      navigate(`/contracting/boq?projectId=${newProjectId}`);
    } catch (err: any) {
      console.error('Failed to award tender project:', err);
      toast.error(err?.message || 'تعذر ترسية العطاء');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* 1. Header & Bid Setup Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-page-title)', fontWeight: 800, color: '#170e5e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AppIcons.Sliders size={20} />
              المرحلة 1: دراسة وتسعير العطاءات والمشروعات المحتملة (Tender & Bid Estimator)
            </h2>
            <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
              حصر الكميات من المخططات وتفكيك الكود الهندسي (BOM) لضبط نسب الخامات والمصنعيات وحساب الأرباح قبل توقيع العقد.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsAutoPricingOpen(true)}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                fontWeight: 600,
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: 'var(--font-body)',
                transition: 'all 0.15s ease',
              }}
            >
              <AppIcons.Calculator size={15} />
              <span>محرك التسعير الآلي</span>
            </button>

            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => setIsQuotationOpen(true)}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                fontWeight: 600,
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: items.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: 'var(--font-body)',
                opacity: items.length > 0 ? 1 : 0.6,
                transition: 'all 0.15s ease',
              }}
            >
              <AppIcons.Printer size={15} />
              <span>عرض سعر رسمي للعميل</span>
            </button>
          </div>
        </div>

        {/* Form Inputs Grid - سطر واحد هندسي متناسق بدون التفاف */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', width: '100%', flexWrap: 'nowrap' }}>
          <div style={{ flex: '2 1 220px', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              اسم المشروع / العطاء المقترح
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="مثال: عطاء إنشاء مجمع سكني وتجاري"
              style={{ width: '100%', height: '34px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: 'var(--font-body)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: '1.5 1 170px', minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              العميل / جهة الإسناد
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="اسم المالك أو جهة الطرح"
              style={{ width: '100%', height: '34px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: 'var(--font-body)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ width: '95px', flexShrink: 0 }}>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              هامش الربح %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={globalProfitMargin}
              onChange={(e) => setGlobalProfitMargin(Number(e.target.value))}
              style={{ width: '100%', height: '34px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: 'var(--font-body)', textAlign: 'center', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ width: '95px', flexShrink: 0 }}>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              المصاريف %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={globalOverhead}
              onChange={(e) => setGlobalOverhead(Number(e.target.value))}
              style={{ width: '100%', height: '34px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: 'var(--font-body)', textAlign: 'center', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ width: '85px', flexShrink: 0 }}>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              الهالك %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={globalWaste}
              onChange={(e) => setGlobalWaste(Number(e.target.value))}
              style={{ width: '100%', height: '34px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: 'var(--font-body)', textAlign: 'center', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleApplyGlobalMargins}
              style={{
                height: '34px',
                padding: '0 12px',
                borderRadius: '8px',
                fontWeight: 700,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#170e5e',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
              }}
            >
              <AppIcons.CheckCircle size={14} />
              <span>تعميم النسب على كافة البنود</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Toolbar & CAD Takeoff Trigger */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsImportMasterOpen(true)}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.Layers size={15} />
            <span>سحب من المقايسة المرجعية (124 بند)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCadTakeoffFormOpen((prev) => !prev)}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 600,
              background: isCadTakeoffFormOpen ? '#f1f5f9' : '#ffffff',
              color: isCadTakeoffFormOpen ? '#170e5e' : '#334155',
              border: isCadTakeoffFormOpen ? '1px solid #94a3b8' : '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.Sliders size={15} />
            <span>حصر سريع من أبعاد الرسومات (CAD Takeoff)</span>
          </button>
        </div>

        <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#64748b' }}>
          إجمالي بنود العطاء الحالية: <strong style={{ color: '#0f172a' }}>{items.length} بند</strong>
        </div>
      </div>

      {/* 3. Expandable CAD Takeoff Calculator */}
      {isCadTakeoffFormOpen && (
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px 20px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170e5e' }}>
            حاسبة الحصر السريع للأبعاد وتفكيك الكود الهندسي
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>نوع البند</label>
              <select
                value={cadItemCode}
                onChange={(e) => setCadItemCode(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                {engineeringConstants.map((c) => (
                  <option key={c.itemCode} value={c.itemCode}>
                    [{c.itemCode}] {c.itemName} ({c.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الطول (م)</label>
              <input
                type="number"
                step="0.01"
                value={cadLength}
                onChange={(e) => setCadLength(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الارتفاع / السمك (م)</label>
              <input
                type="number"
                step="0.01"
                value={cadHeight}
                onChange={(e) => setCadHeight(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>عدد الحوائط / التكرار</label>
              <input
                type="number"
                step="1"
                min="1"
                value={cadCount}
                onChange={(e) => setCadCount(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>خصومات الأبواب والشبابيك (م²)</label>
              <input
                type="number"
                step="0.01"
                value={cadDeductions}
                onChange={(e) => setCadDeductions(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              />
            </div>
          </div>

          {/* Brick Dimension Selector if Masonry */}
          {cadItemCode.startsWith('BRK') && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                مقاس الطوب والبلوك ومعادلة حساب الاستهلاك:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {BRICK_SIZE_PRESETS.slice(0, 4).map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: cadBrickPreset === p.id ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                      background: cadBrickPreset === p.id ? '#f0f4ff' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    <input
                      type="radio"
                      name="brickPreset"
                      checked={cadBrickPreset === p.id}
                      onChange={() => setCadBrickPreset(p.id)}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name.split('-')[0]}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>معدل: {p.ratePerM2OrM3} طوبة/{p.unit}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsCadTakeoffFormOpen(false)}
              style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12.5px', cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleAddFromCadTakeoff}
              style={{ padding: '7px 18px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
            >
              حصر وإضافة البند فورياً
            </button>
          </div>
        </div>
      )}

      {/* 4. Table of Tender Items */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {items.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>لم يتم إضافة أي بنود لدراسة هذا العطاء بعد.</div>
            <div style={{ fontSize: '12.5px', marginTop: '6px' }}>اضغط على «سحب من المقايسة المرجعية» أو «حصر سريع من الرسومات» لبدء التسعير فوراً.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-body)', textAlign: 'right' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>كود البند</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>بيان الأعمال والمواصفات</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>الوحدة</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>الكمية</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>التكلفة المباشرة</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>هامش الربح %</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>سعر الفئة المقترح</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>إجمالي القيمة</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>تفكيك الكود</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>حذف</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const rates = calculateItemRates(item);
                  const isExpanded = expandedItemId === item.id;

                  return (
                    <Fragment key={item.id}>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#170e5e' }}>{item.itemCode}</td>
                        <td style={{ padding: '10px 14px', maxWidth: '320px', color: '#1e293b' }}>{item.description}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{item.unit}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                          <input
                            type="number"
                            min="0"
                            value={item.estimatedQty}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, estimatedQty: val } : it)));
                            }}
                            style={{ width: '85px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{formatCurrency(rates.directCost)}</td>
                        <td style={{ padding: '10px 14px', color: '#15803d', fontWeight: 600 }}>{item.profitMarkupPercent}%</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e' }}>{formatCurrency(rates.sellingUnitPrice)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(rates.totalItemValue)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: isExpanded ? '#170e5e' : '#ffffff',
                              color: isExpanded ? '#ffffff' : '#334155',
                              border: isExpanded ? 'none' : '1px solid #cbd5e1',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isExpanded ? 'إغلاق BOM' : 'تفكيك BOM'}
                          </button>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((it) => it.id !== item.id))}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                          >
                            <AppIcons.Trash2 size={16} />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable BOM Exploder */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#170e5e', marginBottom: '8px' }}>
                              تفكيك الكود الهندسي والموارد المباشرة لبند: [{item.itemCode}] {item.description}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                              {item.components.map((comp, cIdx) => (
                                <div key={cIdx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#0f172a' }}>{comp.componentName}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11.5px', color: '#64748b' }}>
                                    <span>المعدل: {comp.qtyPerUnit} {comp.unit}</span>
                                    <span>سعر الوحدة: {comp.unitRate} ج.م</span>
                                    <span style={{ fontWeight: 700, color: '#170e5e' }}>{(comp.qtyPerUnit * comp.unitRate).toFixed(2)} ج.م</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Consolidated Pre-Procurement MRP Materials Takeoff */}
      {consolidatedMaterials.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' }}>
          <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcons.Box size={18} />
            إجمالي الموارد والخامات التقديرية لتنفيذ العطاء بالكامل (Pre-Procurement Materials Takeoff)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {consolidatedMaterials.slice(0, 8).map((mat, mIdx) => (
              <div key={mIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{mat.name}</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '3px 0' }}>
                  {mat.totalQty.toLocaleString(undefined, { maximumFractionDigits: 1 })} {mat.unit}
                </div>
                <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600 }}>
                  التكلفة: {formatCurrency(mat.totalCost)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Bottom Sticky Award Bar */}
      <div
        style={{
          position: 'sticky',
          bottom: '20px',
          zIndex: 10,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '14px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>إجمالي التكلفة المباشرة</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(grandTotals.totalDirectCost)}</div>
          </div>

          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>صافي الربح المتوقع ({grandTotals.profitMargin.toFixed(1)}%)</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>{formatCurrency(grandTotals.totalProfit)}</div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#170e5e', fontWeight: 700 }}>إجمالي قيمة العطاء للعميل</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: '#170e5e' }}>{formatCurrency(grandTotals.totalSellingPrice)}</div>
          </div>
        </div>

        <div>
          <button
            type="button"
            disabled={isSubmitting || items.length === 0}
            onClick={handleAwardAndCreateProject}
            style={{
              height: '42px',
              padding: '0 24px',
              borderRadius: '8px',
              fontWeight: 800,
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: items.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 6px rgba(23, 14, 94, 0.25)',
              fontSize: '13.5px',
              opacity: items.length > 0 && !isSubmitting ? 1 : 0.6,
            }}
          >
            <AppIcons.CheckShield size={18} />
            <span>{isSubmitting ? 'جاري الترسية وتأسيس المشروع...' : 'اعتماد وترسية العطاء كمشروع رسمي'}</span>
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      {isImportMasterOpen && (
        <ImportMasterBoqModal
          open={isImportMasterOpen}
          onClose={() => setIsImportMasterOpen(false)}
          onImportSelected={async (selectedIds) => {
            try {
              const allMaster = await contractingApi.getMasterBoqLibrary({});
              const selectedMaster = allMaster.filter((it: any) => selectedIds.includes(it.id));
              const newTenderItems: TenderItem[] = selectedMaster.map((masterItem: any) => ({
                id: `TND-${Math.random().toString(36).slice(2, 9)}`,
                itemCode: masterItem.itemCode,
                description: masterItem.description || masterItem.name,
                unit: masterItem.unit,
                estimatedQty: 100,
                trade: masterItem.tradeCategory || 'general',
                components: [
                  {
                    componentCode: `MAT-${masterItem.itemCode}`,
                    componentName: masterItem.name,
                    unit: masterItem.unit,
                    qtyPerUnit: 1,
                    unitRate: masterItem.standardCost || 50,
                    componentType: 'material',
                  },
                ],
                wastePercent: globalWaste,
                overheadPercent: globalOverhead,
                profitMarkupPercent: globalProfitMargin,
              }));
              setItems((prev) => [...prev, ...newTenderItems]);
              setIsImportMasterOpen(false);
              toast.success(`تم استيراد ${newTenderItems.length} بند من بنك المقايسات المرجعي`);
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}

      {isAutoPricingOpen && (
        <AutoPricingModal
          isOpen={isAutoPricingOpen}
          onClose={() => setIsAutoPricingOpen(false)}
          onApplyPrice={(_unitPrice, estimatedCost) => {
            setItems((prev) =>
              prev.map((item) => ({
                ...item,
                components: item.components.map((c) => ({ ...c, unitRate: estimatedCost })),
              }))
            );
            setIsAutoPricingOpen(false);
            toast.success('تم تطبيق أسعار ونسب التسعير الآلي بنجاح');
          }}
        />
      )}

      {isQuotationOpen && (
        <ClientQuotationModal
          isOpen={isQuotationOpen}
          onClose={() => setIsQuotationOpen(false)}
          projectName={projectName}
          clientName={clientName}
          items={items.map((item) => {
            const rates = calculateItemRates(item);
            return {
              id: item.id,
              projectId: '',
              itemCode: item.itemCode,
              description: item.description,
              category: item.trade,
              unit: item.unit,
              contractQty: item.estimatedQty,
              revisedQty: item.estimatedQty,
              unitPrice: rates.sellingUnitPrice,
              estimatedUnitCost: rates.directCost,
              totalPrice: rates.totalItemValue,
              executedQty: 0,
              createdAt: new Date().toISOString(),
            };
          })}
        />
      )}
    </div>
  );
}
