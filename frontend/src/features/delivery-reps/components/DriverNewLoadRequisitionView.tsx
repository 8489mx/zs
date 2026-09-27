import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { CustomSelect } from '@/shared/ui/custom-select';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { matchesArabic } from '@/lib/arabic-normalization';
import {
  useDriverLoadRequisition,
  type DriverProductStock,
  type DriverAvailableProduct,
} from '../hooks/useDriverLoadRequisition';
import {
  CheckCircleIcon,
  Trash2Icon,
  PlusIcon,
  MinusIcon,
  ArrowRightIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

export interface RequisitionLineItem {
  id: string;
  productId: number | '';
  productName: string;
  barcode: string;
  unitPrice: number;
  unit: string;
  sourceWarehouseId: number | '';
  sourceWarehouseName: string;
  availableInWarehouse: number;
  warehouseStocks: DriverProductStock[];
  qty: number;
  searchQuery?: string;
  isSearchOpen?: boolean;
}

export interface DriverNewLoadRequisitionViewProps {
  onBack: () => void;
  onRequisitionSubmitted?: (docNo: string) => void;
}

export function DriverNewLoadRequisitionView({
  onBack,
  onRequisitionSubmitted,
}: DriverNewLoadRequisitionViewProps) {
  // 'all' means automatic source warehouse selection; otherwise a specific warehouseId string
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');
  const [notes, setNotes] = useState('');
  const [submittedDocNo, setSubmittedDocNo] = useState<string | null>(null);

  const {
    driverName,
    vehiclePlate,
    warehouses,
    isLoadingWarehouses,
    availableProducts,
    submitRequisition,
    isSubmitting,
  } = useDriverLoadRequisition(selectedWarehouseFilter);

  // Initialize with one empty line ready for user input (mirroring NewIssueOrderPage)
  const [lines, setLines] = useState<RequisitionLineItem[]>([
    {
      id: `line-${Date.now()}-1`,
      productId: '',
      productName: '',
      barcode: '',
      unitPrice: 0,
      unit: 'قطعة',
      sourceWarehouseId: '',
      sourceWarehouseName: '',
      availableInWarehouse: 0,
      warehouseStocks: [],
      qty: 1,
      searchQuery: '',
      isSearchOpen: false,
    },
  ]);

  // Options for SearchableCombobox (portal-based dropdown)
  const productOptions = useMemo(() => {
    return (availableProducts || []).map((p) => ({
      id: String(p.id),
      name: p.name,
      barcode: p.barcode || p.sku || '',
      sku: p.sku || '',
      totalStock: p.totalStock,
      unit: p.unit || 'قطعة',
      retailPrice: p.retailPrice,
      product: p,
      searchTerms: `${p.name} ${p.barcode || ''} ${p.sku || ''}`.toLowerCase(),
    }));
  }, [availableProducts]);

  // Update line's warehouse when top warehouse filter changes
  useEffect(() => {
    if (selectedWarehouseFilter === 'all') return;
    const whId = Number(selectedWarehouseFilter);
    const wh = warehouses.find((w) => w.id === whId);
    if (!wh) return;

    setLines((prev) =>
      prev.map((line) => {
        if (!line.productId) return line;
        const matchingStock = line.warehouseStocks.find((s) => s.warehouseId === whId);
        const avail = matchingStock ? matchingStock.qty : 0;
        return {
          ...line,
          sourceWarehouseId: whId,
          sourceWarehouseName: wh.name,
          availableInWarehouse: avail,
          qty: Math.min(line.qty, Math.max(1, avail)),
        };
      }),
    );
  }, [selectedWarehouseFilter, warehouses]);

  // Add a new empty row to the table
  const handleAddLine = () => {
    const newLineId = `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setLines((prev) => [
      ...prev,
      {
        id: newLineId,
        productId: '',
        productName: '',
        barcode: '',
        unitPrice: 0,
        unit: 'قطعة',
        sourceWarehouseId: '',
        sourceWarehouseName: '',
        availableInWarehouse: 0,
        warehouseStocks: [],
        qty: 1,
        searchQuery: '',
        isSearchOpen: true, // open dropdown immediately so cashier/driver can pick
      },
    ]);
  };

  // Remove a row
  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => {
      const filtered = prev.filter((l) => l.id !== lineId);
      // If all deleted, keep at least one empty row
      if (filtered.length === 0) {
        return [
          {
            id: `line-${Date.now()}-1`,
            productId: '',
            productName: '',
            barcode: '',
            unitPrice: 0,
            unit: 'قطعة',
            sourceWarehouseId: '',
            sourceWarehouseName: '',
            availableInWarehouse: 0,
            warehouseStocks: [],
            qty: 1,
            searchQuery: '',
            isSearchOpen: false,
          },
        ];
      }
      return filtered;
    });
  };

  // Select a product into a specific line
  const handleSelectProduct = (lineId: string, product: DriverAvailableProduct) => {
    // Determine the source warehouse for this line
    let sourceWhId: number;
    let sourceWhName: string;
    let availStock: number;

    if (selectedWarehouseFilter !== 'all') {
      const filterId = Number(selectedWarehouseFilter);
      const stockInFilter = (product.warehouseStocks || []).find((w) => w.warehouseId === filterId);
      sourceWhId = filterId;
      sourceWhName = stockInFilter?.warehouseName || warehouses.find((w) => w.id === filterId)?.name || 'المستودع المختار';
      availStock = stockInFilter?.qty || 0;
    } else {
      // Pick warehouse with highest available stock
      const sortedStocks = [...(product.warehouseStocks || [])].sort((a, b) => b.qty - a.qty);
      if (sortedStocks.length > 0 && sortedStocks[0].qty > 0) {
        sourceWhId = sortedStocks[0].warehouseId;
        sourceWhName = sortedStocks[0].warehouseName;
        availStock = sortedStocks[0].qty;
      } else if (warehouses.length > 0) {
        sourceWhId = warehouses[0].id;
        sourceWhName = warehouses[0].name;
        availStock = 0;
      } else {
        sourceWhId = 1;
        sourceWhName = 'المستودع الرئيسي';
        availStock = 0;
      }
    }

    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          productId: product.id,
          productName: product.name,
          barcode: product.barcode || '',
          unitPrice: product.retailPrice || 0,
          unit: product.unit || 'قطعة',
          sourceWarehouseId: sourceWhId,
          sourceWarehouseName: sourceWhName,
          availableInWarehouse: availStock,
          warehouseStocks: product.warehouseStocks || [],
          qty: 1,
          searchQuery: product.name,
          isSearchOpen: false,
        };
      }),
    );
  };

  // Change warehouse for a specific line (when "all warehouses" is active)
  const handleChangeLineWarehouse = (lineId: string, warehouseIdStr: string) => {
    const whId = Number(warehouseIdStr);
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const matchingStock = line.warehouseStocks.find((s) => s.warehouseId === whId);
        const whObj = warehouses.find((w) => w.id === whId);
        const newAvail = matchingStock ? matchingStock.qty : 0;
        return {
          ...line,
          sourceWarehouseId: whId,
          sourceWarehouseName: matchingStock?.warehouseName || whObj?.name || 'مستودع الصرف',
          availableInWarehouse: newAvail,
          qty: Math.min(line.qty, Math.max(1, newAvail)),
        };
      }),
    );
  };

  // Update line quantity
  const handleUpdateLineQty = (lineId: string, newQty: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const max = line.availableInWarehouse > 0 ? line.availableInWarehouse : 999999;
        const clamped = Math.max(1, Math.min(max, newQty));
        return { ...line, qty: clamped };
      }),
    );
  };

  // Summary statistics
  const validLines = useMemo(() => lines.filter((l) => l.productId !== ''), [lines]);
  const distinctItemsCount = validLines.length;
  const totalUnitsCount = useMemo(() => validLines.reduce((acc, l) => acc + l.qty, 0), [validLines]);
  const totalEstimatedValue = useMemo(() => validLines.reduce((acc, l) => acc + l.qty * l.unitPrice, 0), [validLines]);

  // Handle submit using hook
  const handleSubmit = async () => {
    if (validLines.length === 0) {
      toast.error('يرجى اختيار صنف واحد على الأقل لطلب التحميل');
      return;
    }

    // Check if any line has 0 available or exceeding
    for (const line of validLines) {
      if (line.availableInWarehouse <= 0) {
        toast.error(`الصنف "${line.productName}" رصيده نافد في مستودع "${line.sourceWarehouseName}"`);
        return;
      }
      if (line.qty > line.availableInWarehouse) {
        toast.error(`الكمية المطلوبة من "${line.productName}" (${line.qty}) تتجاوز المتاح (${line.availableInWarehouse})`);
        return;
      }
    }

    const payload = {
      sourceWarehouseId: selectedWarehouseFilter !== 'all' ? Number(selectedWarehouseFilter) : undefined,
      items: validLines.map((item) => ({
        productId: Number(item.productId),
        qty: item.qty,
        sourceWarehouseId: Number(item.sourceWarehouseId),
        sourceWarehouseName: item.sourceWarehouseName,
      })),
      notes: notes.trim() || undefined,
    };

    try {
      const res = await submitRequisition(payload);
      setSubmittedDocNo(res.docNo);
      if (onRequisitionSubmitted) {
        onRequisitionSubmitted(res.docNo);
      }
    } catch {
      // Toast is already handled in the hook's mutation onError
    }
  };

  // Success view if submitted
  if (submittedDocNo) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '85vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '36px 28px',
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CheckCircleIcon size={36} color="#10b981" />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
            تم إرسال طلب الشحن الصباحي بنجاح!
          </h2>

          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '10px 14px',
              margin: '14px 0 20px',
              display: 'inline-block',
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>رقم إذن التحميل المقترح:</span>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#170e5e', fontFamily: 'monospace' }}>
              #{submittedDocNo}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px' }}>
            تم رفع الطلب إلى المشرف المختص لمراجعة الأرصدة وإصدار أمر الصرف الفعلي لسيارتك. يمكنك متابعة حالة الطلب من شاشة المبيعات.
          </p>

          <Button
            variant="primary"
            onClick={onBack}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: 800,
              padding: '10px 24px',
              width: '100%',
              borderRadius: '10px',
            }}
          >
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  const warehouseSelectOptions = [
    { value: 'all', label: 'كل المخازن (تحديد تلقائي للمستودع الأوفر رصيداً)' },
    ...warehouses.map((w) => ({
      value: String(w.id),
      label: `${w.name} ${w.code ? `(${w.code})` : ''}`,
    })),
  ];

  return (
    <div dir="rtl" style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '100px' }}>
      <div style={{ maxWidth: '1280px', width: 'min(100%, 1280px)', margin: '0 auto', padding: '16px' }}>
        {/* Top Header Bar matching NewIssueOrderPage */}
        <header
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
              }}
              title="العودة للرئيسية"
            >
              <ArrowRightIcon size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  طلب شحن بضاعة صباحي (إذن تحميل سيارة)
                </h1>
                <span
                  style={{
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  مسودة جديدة
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                تحديد أصناف وكميات البضاعة المطلوبة من المستودعات لسيارة التوزيع الميدانية
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              type="button"
              onClick={onBack}
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#b91c1c',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                padding: '8px 14px',
              }}
            >
              إلغاء المسودة
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || validLines.length === 0}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 800,
                padding: '8px 18px',
              }}
            >
              {isSubmitting
                ? 'جارٍ الإرسال...'
                : `إرسال طلب التحميل للمشرف (${distinctItemsCount} أصناف)`}
            </Button>
          </div>
        </header>

        {/* Section 1: "المعلومات الأساسية" matching IssueOrderHeaderSection */}
        <section
          style={{
            position: 'relative',
            zIndex: 10,
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ width: '4px', height: '16px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              المعلومات الأساسية لطلب التحميل
            </h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Field 1: Source Warehouse Filter */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                من مخزن (مستودع الصرف)
              </label>
              <CustomSelect
                value={selectedWarehouseFilter}
                onChange={(val) => setSelectedWarehouseFilter(val)}
                options={warehouseSelectOptions}
                placeholder="اختر المستودع..."
                disabled={isLoadingWarehouses}
              />
            </div>

            {/* Field 2: Representative (Readonly) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                مندوب التوزيع (المستلم)
              </label>
              <input
                type="text"
                readOnly
                value={driverName}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0 12px',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Field 3: Vehicle (Readonly) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                سيارة التوزيع الميدانية
              </label>
              <input
                type="text"
                readOnly
                value={vehiclePlate}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0 12px',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Field 4: Order Status */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                وضع الطلب
              </label>
              <input
                type="text"
                readOnly
                value="طلب شحن صباحي (بانتظار موافقة مشرف المستودع)"
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0 12px',
                  fontSize: '12px',
                  color: '#475569',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </section>

        {/* Section 2: "الأصناف المطلوبة للتحميل" matching IssueOrderItemsTable */}
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '16px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                الأصناف المطلوبة للتحميل
              </h3>
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                [{distinctItemsCount} صنف مُحدد]
              </span>
            </div>

            <Button
              variant="secondary"
              type="button"
              onClick={handleAddLine}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#170e5e',
                borderColor: '#cbd5e1',
                padding: '6px 12px',
              }}
            >
              + إضافة صنف جديد
            </Button>
          </div>

          {/* Table Container */}
          <div
            className="purchase-prototype-items-table-wrapper"
            style={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
            }}
          >
            <table className="purchase-prototype-items-table" style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <tr>
                  <th style={{ padding: '10px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700, width: '38%' }}>
                    الصنف (بحث بالاسم أو الباركود)
                  </th>
                  {selectedWarehouseFilter === 'all' && (
                    <th style={{ padding: '10px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700, width: '24%' }}>
                      مخزن الصرف
                    </th>
                  )}
                  <th style={{ padding: '10px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700, width: '16%', textAlign: 'center' }}>
                    الكمية المتاحة (بالمخزن)
                  </th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700, width: '16%', textAlign: 'center' }}>
                    الكمية المطلوبة
                  </th>
                  <th style={{ padding: '10px 14px', width: '6%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  // Warehouses with positive stock for this line's product
                  const productWarehouseOptions = (line.warehouseStocks || [])
                    .filter((w) => w.qty > 0)
                    .map((w) => ({
                      id: String(w.warehouseId),
                      name: `${w.warehouseName} (متاح: ${w.qty})`,
                    }));

                  return (
                    <tr
                      key={line.id}
                      style={{
                        borderBottom: index < lines.length - 1 ? '1px solid #e2e8f0' : 'none',
                        backgroundColor: line.productId ? '#ffffff' : '#fcfcfd',
                      }}
                    >
                      {/* Product Search & Selection Cell via Portal Combobox */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <SearchableCombobox
                          inputId={`product-input-${line.id}`}
                          options={productOptions}
                          value={line.productName || line.searchQuery || ''}
                          onChange={(val) => {
                            setLines((prev) =>
                              prev.map((l) =>
                                l.id === line.id
                                  ? {
                                      ...l,
                                      productName: val,
                                      searchQuery: val,
                                      ...(val === ''
                                        ? {
                                            productId: '',
                                            barcode: '',
                                            availableInWarehouse: 0,
                                            warehouseStocks: [],
                                            unitPrice: 0,
                                          }
                                        : {}),
                                    }
                                  : l,
                              ),
                            );
                          }}
                          onSelect={(opt) => {
                            handleSelectProduct(line.id, opt.product);
                          }}
                          getLabel={(opt) => opt.name}
                          getMeta={(opt) =>
                            `متاح: ${opt.totalStock} ${opt.unit} ${opt.barcode ? `| باركود: ${opt.barcode}` : ''}`
                          }
                          search={(opt, query) => {
                            if (!query || !query.trim()) return true;
                            const q = query.toLowerCase().trim();
                            return (
                              opt.searchTerms.includes(q) ||
                              matchesArabic(opt.name, q) ||
                              matchesArabic(opt.barcode, q)
                            );
                          }}
                          placeholder="ابحث عن الصنف بالاسم أو الباركود..."
                          inline={true}
                          inputClassName="purchase-prototype-field-input"
                          inputStyle={{ height: '38px', borderRadius: '6px' }}
                        />
                      </td>

                      {/* Source Warehouse Cell (when "all warehouses" is active) */}
                      {selectedWarehouseFilter === 'all' && (
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          {line.productId ? (
                            productWarehouseOptions.length > 0 ? (
                              <SearchableCombobox
                                inputId={`warehouse-input-${line.id}`}
                                options={productWarehouseOptions}
                                value={line.sourceWarehouseName || ''}
                                onChange={(val) => {
                                  setLines((prev) =>
                                    prev.map((l) => (l.id === line.id ? { ...l, sourceWarehouseName: val } : l)),
                                  );
                                }}
                                onSelect={(opt) => handleChangeLineWarehouse(line.id, opt.id)}
                                getLabel={(opt) => opt.name}
                                search={(opt, query) => {
                                  if (!query || !query.trim()) return true;
                                  return matchesArabic(opt.name, query);
                                }}
                                placeholder="اختر المخزن..."
                                inline={true}
                                inputClassName="purchase-prototype-field-input"
                                inputStyle={{ height: '38px', borderRadius: '6px' }}
                              />
                            ) : (
                              <span style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 700 }}>
                                لا يتوفر رصيد بأي مخزن
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>- اختر صنفاً أولاً -</span>
                          )}
                        </td>
                      )}

                      {/* Available Stock in Warehouse Cell */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {line.productId ? (
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 900,
                              color: line.availableInWarehouse > 0 ? '#15803d' : '#dc2626',
                              backgroundColor: line.availableInWarehouse > 0 ? '#ecfdf5' : '#fef2f2',
                              border: `1px solid ${line.availableInWarehouse > 0 ? '#bbf7d0' : '#fecaca'}`,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              display: 'inline-block',
                            }}
                          >
                            {line.availableInWarehouse}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Requested Qty Stepper Cell */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {line.productId ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              backgroundColor: '#ffffff',
                              overflow: 'hidden',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateLineQty(line.id, line.qty - 1)}
                              disabled={line.qty <= 1}
                              style={{
                                width: '32px',
                                height: '34px',
                                border: 'none',
                                backgroundColor: '#f8fafc',
                                color: '#475569',
                                cursor: line.qty <= 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <MinusIcon size={14} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={line.availableInWarehouse || 999999}
                              value={line.qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) handleUpdateLineQty(line.id, val);
                              }}
                              style={{
                                width: '50px',
                                height: '34px',
                                border: 'none',
                                textAlign: 'center',
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#0f172a',
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateLineQty(line.id, line.qty + 1)}
                              disabled={line.availableInWarehouse > 0 && line.qty >= line.availableInWarehouse}
                              style={{
                                width: '32px',
                                height: '34px',
                                border: 'none',
                                backgroundColor: '#f8fafc',
                                color: '#475569',
                                cursor:
                                  line.availableInWarehouse > 0 && line.qty >= line.availableInWarehouse
                                    ? 'not-allowed'
                                    : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <PlusIcon size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Delete Line Action Cell */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                          }}
                          title="حذف هذا السطر"
                        >
                          <Trash2Icon size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Line Bottom Bar */}
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <Button
              variant="secondary"
              type="button"
              onClick={handleAddLine}
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#170e5e',
                borderColor: '#cbd5e1',
                padding: '8px 16px',
                backgroundColor: '#f8fafc',
              }}
            >
              + إضافة صنف جديد
            </Button>
          </div>
        </section>

        {/* Section 3: "الملاحظات" matching NewIssueOrderPage */}
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ width: '4px', height: '16px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              ملاحظات إضافية لمشرف المستودع
            </h3>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="أي ملاحظات إضافية على طلب الشحن (مثال: يرجى تجهيز البضاعة سريعاً لتغطية خط سير اليوم)..."
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12.5px',
              color: '#0f172a',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </section>

        {/* Section 4: Summary Card & Action Bar */}
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>عدد الأصناف المطلوبة</span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{distinctItemsCount} صنف</strong>
            </div>
            <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0' }} />
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>إجمالي القطع</span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{totalUnitsCount} قطعة</strong>
            </div>
            <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0' }} />
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>إجمالي القيمة التقديرية</span>
              <strong style={{ fontSize: '15px', color: '#170e5e', fontWeight: 900 }}>
                {totalEstimatedValue.toFixed(2)} <CurrencySymbol />
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="secondary"
              type="button"
              onClick={onBack}
              style={{ fontSize: '13px', fontWeight: 700 }}
            >
              إلغاء المسودة
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || validLines.length === 0}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                padding: '10px 24px',
                borderRadius: '8px',
              }}
            >
              {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال طلب التحميل للمشرف'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DriverNewLoadRequisitionView;
