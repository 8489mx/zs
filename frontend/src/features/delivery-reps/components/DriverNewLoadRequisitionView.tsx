import { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { CustomSelect } from '@/shared/ui/custom-select';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { matchesArabic } from '@/lib/arabic-normalization';
import {
  useDriverLoadRequisition,
  type DriverProductStock,
  type DriverAvailableProduct,
  type DriverWarehouse,
} from '../hooks/useDriverLoadRequisition';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { vanSalesApi } from '../api/van-sales.api';
import {
  CheckCircleIcon,
  Trash2Icon,
  PlusIcon,
  MinusIcon,
  ArrowRightIcon,
} from '@/shared/components/icons/AppIcons';
import { systemConfirm, toast } from '@/shared/components/system-alert';
import { useFormDraft } from '@/shared/hooks/use-form-draft';

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

export interface ProductOptionItem {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  totalStock: number;
  unit: string;
  retailPrice: number;
  product: DriverAvailableProduct;
  searchTerms: string;
}

// Stable combobox helper functions (preventing inline allocations and unneeded re-filtering)
const getProductOptionLabel = (opt: ProductOptionItem) => opt.name;
const getProductOptionMeta = (opt: ProductOptionItem) =>
  `متاح: ${opt.totalStock} ${opt.unit} ${opt.barcode ? `| باركود: ${opt.barcode}` : ''}`;
const searchProductOption = (opt: ProductOptionItem, query: string) => {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();
  return (
    opt.searchTerms.includes(q) ||
    matchesArabic(opt.name, q) ||
    matchesArabic(opt.barcode, q)
  );
};

const getWarehouseOptionLabel = (opt: { id: string; name: string }) => opt.name;
const searchWarehouseOption = (opt: { id: string; name: string }, query: string) => {
  if (!query || !query.trim()) return true;
  return matchesArabic(opt.name, query);
};

interface RequisitionLineRowProps {
  line: RequisitionLineItem;
  index?: number;
  isLast: boolean;
  productOptions: ProductOptionItem[];
  selectedWarehouseFilter: string;
  onSelectProduct: (lineId: string, product: DriverAvailableProduct) => void;
  onLineProductChange: (lineId: string, val: string) => void;
  onChangeLineWarehouse: (lineId: string, warehouseIdStr: string) => void;
  onLineWarehouseChange: (lineId: string, val: string) => void;
  onUpdateLineQty: (lineId: string, newQty: number) => void;
  onRemoveLine: (lineId: string) => void;
  onEnterQty?: () => void;
}

const RequisitionLineRow = memo(function RequisitionLineRow({
  line,
  isLast,
  productOptions,
  selectedWarehouseFilter,
  onSelectProduct,
  onLineProductChange,
  onChangeLineWarehouse,
  onLineWarehouseChange,
  onUpdateLineQty,
  onRemoveLine,
  onEnterQty,
}: RequisitionLineRowProps) {
  const qtyInputRef = useRef<HTMLInputElement | null>(null);
  const shouldFocusQtyRef = useRef<boolean>(false);

  // Warehouses with positive stock for this line's product
  const productWarehouseOptions = useMemo(() => {
    return (line.warehouseStocks || [])
      .filter((w) => w.qty > 0)
      .map((w) => ({
        id: String(w.warehouseId),
        name: `${w.warehouseName} (متاح: ${w.qty})`,
      }));
  }, [line.warehouseStocks]);

  const handleProductChange = useCallback(
    (val: string) => {
      onLineProductChange(line.id, val);
    },
    [line.id, onLineProductChange],
  );

  const handleProductSelect = useCallback(
    (opt: ProductOptionItem) => {
      shouldFocusQtyRef.current = true;
      onSelectProduct(line.id, opt.product);
      setTimeout(() => {
        if (qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
          shouldFocusQtyRef.current = false;
        }
      }, 60);
    },
    [line.id, onSelectProduct],
  );

  useEffect(() => {
    if (shouldFocusQtyRef.current && qtyInputRef.current) {
      shouldFocusQtyRef.current = false;
      const timer = setTimeout(() => {
        if (qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [line.productId]);

  const handleWarehouseChange = useCallback(
    (val: string) => {
      onLineWarehouseChange(line.id, val);
    },
    [line.id, onLineWarehouseChange],
  );

  const handleWarehouseSelect = useCallback(
    (opt: { id: string; name: string }) => {
      onChangeLineWarehouse(line.id, opt.id);
    },
    [line.id, onChangeLineWarehouse],
  );

  const handleQtyMinus = useCallback(() => {
    onUpdateLineQty(line.id, line.qty - 1);
  }, [line.id, line.qty, onUpdateLineQty]);

  const handleQtyPlus = useCallback(() => {
    onUpdateLineQty(line.id, line.qty + 1);
  }, [line.id, line.qty, onUpdateLineQty]);

  const handleQtyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) onUpdateLineQty(line.id, val);
    },
    [line.id, onUpdateLineQty],
  );

  const handleRemove = useCallback(() => {
    onRemoveLine(line.id);
  }, [line.id, onRemoveLine]);

  return (
    <tr
      style={{
        borderBottom: !isLast ? '1px solid #e2e8f0' : 'none',
        backgroundColor: line.productId ? '#ffffff' : '#fcfcfd',
      }}
    >
      {/* Product Search & Selection Cell via Portal Combobox */}
      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
        <SearchableCombobox
          inputId={`product-input-${line.id}`}
          options={productOptions}
          value={line.productName || line.searchQuery || ''}
          onChange={handleProductChange}
          onSelect={handleProductSelect}
          getLabel={getProductOptionLabel}
          getMeta={getProductOptionMeta}
          search={searchProductOption}
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
                onChange={handleWarehouseChange}
                onSelect={handleWarehouseSelect}
                getLabel={getWarehouseOptionLabel}
                search={searchWarehouseOption}
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
              onClick={handleQtyPlus}
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
            <input
              ref={qtyInputRef}
              type="number"
              className="no-spin-arrows"
              min={1}
              max={line.availableInWarehouse || 999999}
              value={line.qty}
              onChange={handleQtyChange}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onEnterQty?.();
                }
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
                MozAppearance: 'textfield',
                appearance: 'textfield',
              }}
            />
            <button
              type="button"
              onClick={handleQtyMinus}
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
          </div>
        ) : (
          <span style={{ color: '#94a3b8' }}>-</span>
        )}
      </td>

      {/* Delete Line Action Cell */}
      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
        <button
          type="button"
          onClick={handleRemove}
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
});

export interface DriverNewLoadRequisitionViewProps {
  mode?: 'driver' | 'admin';
  onBack: () => void;
  onRequisitionSubmitted?: (docNo: string) => void;
}

export function DriverNewLoadRequisitionView({
  mode = 'driver',
  onBack,
  onRequisitionSubmitted,
}: DriverNewLoadRequisitionViewProps) {
  const queryClient = useQueryClient();
  const isAdmin = mode === 'admin';

  // 'all' means automatic source warehouse selection; otherwise a specific warehouseId string
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');
  const [notes, setNotes] = useState('');
  const [submittedDocNo, setSubmittedDocNo] = useState<string | null>(null);

  // Admin Mode State:
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [adminSubmitResult, setAdminSubmitResult] = useState<{
    docNo: string;
    dispatched: boolean;
    tripId?: number;
    repName: string;
  } | null>(null);

  // Driver Hook (only enabled when in driver mode to avoid 401 redirects in ERP session)
  const driverHook = useDriverLoadRequisition(selectedWarehouseFilter, { enabled: !isAdmin });

  // Admin Queries (only enabled when in admin mode)
  const adminWarehousesQuery = useQuery<DriverWarehouse[]>({
    queryKey: ['admin-warehouses'],
    queryFn: () => vanSalesApi.getAdminWarehouses(),
    enabled: isAdmin,
    staleTime: 10_000,
  });

  const adminRepsQuery = useQuery<DeliveryRep[]>({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
    enabled: isAdmin,
    staleTime: 10_000,
  });

  const adminProductsQuery = useQuery<DriverAvailableProduct[]>({
    queryKey: ['admin-available-products', selectedWarehouseFilter],
    queryFn: () => vanSalesApi.getAdminAvailableProducts(selectedWarehouseFilter),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const adminReps = useMemo(() => {
    return (adminRepsQuery.data || []).filter((r) => r.is_active !== false);
  }, [adminRepsQuery.data]);

  const repSelectOptions = useMemo(() => {
    return adminReps.map((r) => {
      const plate = r.vehicle_plate ? ` [لوحة: ${r.vehicle_plate}]` : '';
      const phone = r.phone ? ` (${r.phone})` : '';
      const labelName = r.name || r.full_name || 'مندوب';
      return {
        value: String(r.id),
        label: `${labelName}${phone}${plate}`,
      };
    });
  }, [adminReps]);

  useEffect(() => {
    if (isAdmin && !selectedRepId && repSelectOptions.length > 0) {
      setSelectedRepId(repSelectOptions[0].value);
    }
  }, [isAdmin, selectedRepId, repSelectOptions]);

  const selectedRep = useMemo(() => {
    return adminReps.find((r) => String(r.id) === selectedRepId);
  }, [adminReps, selectedRepId]);

  // Unified data sources
  const warehouses = isAdmin ? (adminWarehousesQuery.data || []) : driverHook.warehouses;
  const isLoadingWarehouses = isAdmin ? adminWarehousesQuery.isLoading : driverHook.isLoadingWarehouses;
  const availableProducts = isAdmin ? (adminProductsQuery.data || []) : driverHook.availableProducts;
  const driverName = isAdmin ? (selectedRep?.name || selectedRep?.full_name || 'اختر مندوب التوزيع') : driverHook.driverName;
  const vehiclePlate = isAdmin
    ? (selectedRep?.vehicle_plate ? `سيارة رقم [${selectedRep.vehicle_plate}]` : 'لا توجد سيارة مسجلة')
    : driverHook.vehiclePlate;

  interface VanRequisitionDraftData {
    lines: RequisitionLineItem[];
    selectedWarehouseFilter: string;
    notes: string;
    selectedRepId?: string;
  }

  // Admin submit mutation
  const adminSubmitMutation = useMutation({
    mutationFn: vanSalesApi.createAdminLoadRequisition,
    onSuccess: (res, vars) => {
      clearDraft();
      const rep = adminReps.find((r) => r.id === vars.repId);
      const repName = rep?.name || 'المندوب';
      queryClient.invalidateQueries({ queryKey: ['van-admin-load-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['van-sales-admin-trips'] });
      setAdminSubmitResult({
        docNo: res.docNo,
        dispatched: res.dispatched,
        tripId: res.tripId,
        repName,
      });
      if (res.dispatched) {
        toast.success(`تم اعتماد وصرف البضاعة وتحميل السيارة وبدء الرحلة #${res.tripId} بنجاح!`);
      } else {
        toast.success(`تم حفظ إذن التحميل #${res.docNo} كمسودة معلقة للمراجعة.`);
      }
      if (onRequisitionSubmitted) {
        onRequisitionSubmitted(res.docNo);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تسجيل إذن التحميل الإداري');
    },
  });

  const isSubmitting = isAdmin ? adminSubmitMutation.isPending : driverHook.isSubmitting;

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

  // Draft auto-save and restore engine
  const draftKey = `zs_van_load_requisition_draft_${mode}`;

  const {
    clearDraft,
    isDraftRestored,
    dismissRestoredNotice,
    hasSavedDraft,
    flushDraft,
  } = useFormDraft<VanRequisitionDraftData>({
    key: draftKey,
    data: {
      lines,
      selectedWarehouseFilter,
      notes,
      selectedRepId: isAdmin ? selectedRepId : undefined,
    },
    isEmpty: (draft) =>
      (!draft.lines || !draft.lines.some((l) => Boolean(l.productId))) &&
      (!draft.notes || !draft.notes.trim()),
    onRestore: (restored) => {
      if (restored.lines && restored.lines.length > 0) {
        setLines(restored.lines);
      }
      if (restored.selectedWarehouseFilter) {
        setSelectedWarehouseFilter(restored.selectedWarehouseFilter);
      }
      if (typeof restored.notes === 'string') {
        setNotes(restored.notes);
      }
      if (isAdmin && restored.selectedRepId) {
        setSelectedRepId(restored.selectedRepId);
      }
    },
    debounceMs: 300,
  });

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

  const warehouseSelectOptions = useMemo(() => [
    { value: 'all', label: 'كل المخازن (تحديد تلقائي للمستودع الأوفر رصيداً)' },
    ...warehouses.map((w) => ({
      value: String(w.id),
      label: `${w.name} ${w.code ? `(${w.code})` : ''}`,
    })),
  ], [warehouses]);

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

  // Synchronize live warehouse stock & retail prices for restored draft items
  useEffect(() => {
    if (!availableProducts || availableProducts.length === 0) return;

    setLines((prevLines) => {
      let hasChanges = false;
      const updated = prevLines.map((line) => {
        if (!line.productId) return line;
        const prod = availableProducts.find((p) => p.id === Number(line.productId));
        if (!prod) return line;

        const whId = line.sourceWarehouseId !== '' ? Number(line.sourceWarehouseId) : undefined;
        let freshAvail = prod.totalStock;
        if (whId !== undefined) {
          const matchWh = (prod.warehouseStocks || []).find((s) => s.warehouseId === whId);
          freshAvail = matchWh ? matchWh.qty : 0;
        }

        const freshPrice = prod.retailPrice ?? line.unitPrice;
        const freshStocks = prod.warehouseStocks || [];

        if (
          line.availableInWarehouse !== freshAvail ||
          line.unitPrice !== freshPrice ||
          line.unit !== (prod.unit || line.unit) ||
          line.warehouseStocks !== freshStocks
        ) {
          hasChanges = true;
          return {
            ...line,
            availableInWarehouse: freshAvail,
            unitPrice: freshPrice,
            unit: prod.unit || line.unit,
            warehouseStocks: freshStocks,
            qty: freshAvail > 0 ? Math.min(line.qty, freshAvail) : line.qty,
          };
        }
        return line;
      });

      return hasChanges ? updated : prevLines;
    });
  }, [availableProducts]);

  // Add a new empty row to the table
  const handleAddLine = useCallback(() => {
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
    setTimeout(() => {
      const input = document.getElementById(`product-input-${newLineId}`) as HTMLInputElement | null;
      if (input) {
        input.focus();
      }
    }, 80);
  }, []);

  // Remove a row
  const handleRemoveLine = useCallback((lineId: string) => {
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
  }, []);

  // Select a product into a specific line
  const handleSelectProduct = useCallback((lineId: string, product: DriverAvailableProduct) => {
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
  }, [selectedWarehouseFilter, warehouses]);

  // Change warehouse for a specific line (when "all warehouses" is active)
  const handleChangeLineWarehouse = useCallback((lineId: string, warehouseIdStr: string) => {
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
  }, [warehouses]);

  // Update line quantity
  const handleUpdateLineQty = useCallback((lineId: string, newQty: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const max = line.availableInWarehouse > 0 ? line.availableInWarehouse : 999999;
        const clamped = Math.max(1, Math.min(max, newQty));
        return { ...line, qty: clamped };
      }),
    );
  }, []);

  const handleLineProductChange = useCallback((lineId: string, val: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
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
  }, []);

  const handleLineWarehouseChange = useCallback((lineId: string, val: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, sourceWarehouseName: val } : l)),
    );
  }, []);

  // Summary statistics
  const validLines = useMemo(() => lines.filter((l) => l.productId !== ''), [lines]);
  const distinctItemsCount = validLines.length;
  const totalUnitsCount = useMemo(() => validLines.reduce((acc, l) => acc + l.qty, 0), [validLines]);
  const totalEstimatedValue = useMemo(() => validLines.reduce((acc, l) => acc + l.qty * l.unitPrice, 0), [validLines]);

  const hasDraftContent = useMemo(() => {
    return lines.some((l) => Boolean(l.productId)) || notes.trim() !== '';
  }, [lines, notes]);

  const handleGoBack = useCallback(() => {
    flushDraft();
    onBack();
  }, [flushDraft, onBack]);

  const handleClearDraft = useCallback(async () => {
    if (!hasDraftContent && !hasSavedDraft) {
      clearDraft();
      toast.info('لا توجد مسودة حالية لحذفها');
      return;
    }

    const confirmed = await systemConfirm({
      title: 'حذف مسودة طلب التحميل',
      message: 'هل أنت متأكد من حذف مسودة طلب التحميل الحالية؟ سيتم مسح جميع الأصناف والبيانات المدخلة والبدء من جديد.',
      confirmText: 'نعم، احذف المسودة',
      cancelText: 'إلغاء',
      variant: 'danger',
    });

    if (confirmed) {
      clearDraft();
      setLines([
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
      setNotes('');
      dismissRestoredNotice();
      toast.success('تم حذف المسودة بنجاح وتفريغ البيانات');
    }
  }, [hasDraftContent, hasSavedDraft, clearDraft, dismissRestoredNotice]);

  // Handle submit in driver mode
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
        sourceWarehouseId: item.sourceWarehouseId ? Number(item.sourceWarehouseId) : undefined,
        sourceWarehouseName: item.sourceWarehouseName,
      })),
      notes: notes.trim() || undefined,
    };

    try {
      const res = await driverHook.submitRequisition(payload);
      clearDraft();
      setSubmittedDocNo(res.docNo);
      if (onRequisitionSubmitted) {
        onRequisitionSubmitted(res.docNo);
      }
    } catch {
      // Toast is already handled in the hook's mutation onError
    }
  };

  // Handle submit in admin mode (direct dispatch or pending)
  const handleAdminSubmit = async (dispatchImmediately: boolean) => {
    if (!selectedRepId) {
      toast.error('يرجى اختيار مندوب التوزيع أولاً');
      return;
    }
    if (validLines.length === 0) {
      toast.error('يرجى اختيار صنف واحد على الأقل لطلب التحميل');
      return;
    }

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

    if (dispatchImmediately) {
      const ok = await systemConfirm({
        title: 'اعتماد وصرف وتحميل السيارة فوراً',
        message: `هل تود صرف هذه الأصناف (${distinctItemsCount} صنف بإجمالي ${totalUnitsCount} قطعة) من المستودع وتحميل سيارة المندوب "${driverName}" وبدء رحلة التوزيع فوراً؟ سيتم خصم الكميات من المستودع وفتح الرحلة تلقائياً.`,
        confirmText: 'صرف وتحميل السيارة وبدء الرحلة',
        cancelText: 'إلغاء',
        variant: 'primary',
      });
      if (!ok) return;
    }

    const payload = {
      repId: Number(selectedRepId),
      sourceWarehouseId: selectedWarehouseFilter !== 'all' ? Number(selectedWarehouseFilter) : undefined,
      items: validLines.map((item) => ({
        productId: Number(item.productId),
        qty: item.qty,
        productName: item.productName,
        barcode: item.barcode,
        sourceWarehouseId: item.sourceWarehouseId ? Number(item.sourceWarehouseId) : undefined,
        sourceWarehouseName: item.sourceWarehouseName,
      })),
      notes: notes.trim() || undefined,
      dispatchImmediately,
    };

    try {
      await adminSubmitMutation.mutateAsync(payload);
    } catch {
      // Error handled in mutation onError
    }
  };

  // Success view if submitted by Admin
  if (adminSubmitResult) {
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
            maxWidth: '560px',
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
            {adminSubmitResult.dispatched
              ? 'تم صرف البضاعة وتحميل السيارة وبدء رحلة التوزيع!'
              : 'تم حفظ إذن التحميل كمسودة معلقة بنجاح!'}
          </h2>

          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '12px 18px',
              margin: '14px 0 20px',
              display: 'inline-flex',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>رقم إذن التحميل:</span>
              <span style={{ fontSize: '17px', fontWeight: 900, color: '#170e5e', fontFamily: 'monospace' }}>
                #{adminSubmitResult.docNo}
              </span>
            </div>
            {adminSubmitResult.tripId && (
              <>
                <div style={{ height: '28px', width: '1px', backgroundColor: '#cbd5e1' }} />
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>رقم رحلة التوزيع:</span>
                  <span style={{ fontSize: '17px', fontWeight: 900, color: '#15803d', fontFamily: 'monospace' }}>
                    #{adminSubmitResult.tripId}
                  </span>
                </div>
              </>
            )}
          </div>

          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px' }}>
            {adminSubmitResult.dispatched
              ? `تم خصم كميات البضاعة من المستودع وتحويلها رسمياً لعهدة سيارة المندوب "${adminSubmitResult.repName}". السيارة محملة الآن والرحلة الميدانية نشطة وجاهزة لتسجيل الفواتير والتحصيلات.`
              : `تم تسجيل طلب التحميل وإسناده للمندوب "${adminSubmitResult.repName}". يمكنك مراجعته أو تعديل كمياته وصرفه في أي وقت من جدول أذونات التحميل.`}
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
            العودة لقائمة أذونات التحميل
          </Button>
        </div>
      </div>
    );
  }

  // Success view if submitted in driver mode
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

  return (
    <div dir="rtl" style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '100px' }}>
      <style>{`
        input.no-spin-arrows::-webkit-outer-spin-button,
        input.no-spin-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        input.no-spin-arrows {
          -moz-appearance: textfield !important;
          appearance: textfield !important;
        }
      `}</style>
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
              onClick={handleGoBack}
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
              title="العودة للقائمة"
            >
              <ArrowRightIcon size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  {isAdmin
                    ? 'إسناد وصرف إذن تحميل سيارة التوزيع (FMCG)'
                    : 'طلب شحن بضاعة صباحي (إذن تحميل سيارة)'}
                </h1>
                <span
                  style={{
                    backgroundColor: isAdmin ? '#fef3c7' : '#e0e7ff',
                    color: isAdmin ? '#92400e' : '#3730a3',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {isAdmin ? 'إسناد إداري مباشر' : 'مسودة جديدة'}
                </span>
                <span
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                  }}
                  onClick={() => window.location.reload()}
                  title="رقم إصدار البيلد - انقر للتحديث الفوري"
                >
                  بيلد: {typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev'}
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                {isAdmin
                  ? 'إعداد إذن التحميل وصرف البضاعة وتحميل السيارة مباشرة للمندوب لبدء رحلة التوزيع'
                  : 'تحديد أصناف وكميات البضاعة المطلوبة من المستودعات لسيارة التوزيع الميدانية'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(hasDraftContent || hasSavedDraft) && (
              <Button
                variant="secondary"
                type="button"
                onClick={handleClearDraft}
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  backgroundColor: '#fef2f2',
                  padding: '8px 14px',
                }}
              >
                حذف المسودة
              </Button>
            )}

            <Button
              variant="secondary"
              type="button"
              onClick={handleGoBack}
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#475569',
                borderColor: '#cbd5e1',
                padding: '8px 14px',
              }}
            >
              العودة للقائمة
            </Button>
            {isAdmin ? (
              <>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => handleAdminSubmit(false)}
                  disabled={isSubmitting || validLines.length === 0}
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#170e5e',
                    borderColor: '#170e5e',
                    padding: '8px 14px',
                  }}
                >
                  {adminSubmitMutation.isPending ? 'جاري الحفظ...' : 'حفظ كإذن معلق'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleAdminSubmit(true)}
                  disabled={isSubmitting || validLines.length === 0}
                  style={{
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    padding: '8px 18px',
                  }}
                >
                  {adminSubmitMutation.isPending
                    ? 'جاري الصرف والتحميل...'
                    : `صرف وتحميل السيارة فوراً (${distinctItemsCount} أصناف)`}
                </Button>
              </>
            ) : (
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
            )}
          </div>
        </header>

        {/* Draft Restored Banner */}
        {isDraftRestored && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1e40af' }}>
              <CheckCircleIcon size={16} />
              <span>
                <strong>تم استرجاع المسودة غير المحفوظة تلقائياً:</strong> تم تحميل الأصناف والبيانات السابقة لمتابعة إذن التحميل دون فقدان.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleClearDraft}
                style={{
                  fontSize: '11.5px',
                  color: '#b91c1c',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  padding: '2px 6px',
                }}
              >
                حذف المسودة
              </button>
              <button
                type="button"
                onClick={dismissRestoredNotice}
                style={{
                  fontSize: '11.5px',
                  color: '#1e40af',
                  backgroundColor: '#dbeafe',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '3px 10px',
                }}
              >
                إغلاق التنبيه
              </button>
            </div>
          </div>
        )}

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

            {/* Field 2: Representative */}
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
                {isAdmin ? 'مندوب التوزيع (السائق)' : 'مندوب التوزيع (المستلم)'}
                {isAdmin && <span style={{ color: '#dc2626' }}> *</span>}
              </label>
              {isAdmin ? (
                <CustomSelect
                  value={selectedRepId}
                  onChange={(val) => setSelectedRepId(val)}
                  options={repSelectOptions}
                  placeholder="اختر مندوب التوزيع..."
                  disabled={adminRepsQuery.isLoading}
                />
              ) : (
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
              )}
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
                مسار العملية
              </label>
              <input
                type="text"
                readOnly
                value={
                  isAdmin
                    ? 'إسناد وصرف مباشر من المشرف'
                    : 'طلب شحن صباحي (بانتظار موافقة مشرف المستودع)'
                }
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
                {lines.map((line, index) => (
                  <RequisitionLineRow
                    key={line.id}
                    line={line}
                    index={index}
                    isLast={index === lines.length - 1}
                    productOptions={productOptions}
                    selectedWarehouseFilter={selectedWarehouseFilter}
                    onSelectProduct={handleSelectProduct}
                    onLineProductChange={handleLineProductChange}
                    onChangeLineWarehouse={handleChangeLineWarehouse}
                    onLineWarehouseChange={handleLineWarehouseChange}
                    onUpdateLineQty={handleUpdateLineQty}
                    onRemoveLine={handleRemoveLine}
                    onEnterQty={handleAddLine}
                  />
                ))}
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
            {(hasDraftContent || hasSavedDraft) && (
              <Button
                variant="secondary"
                type="button"
                onClick={handleClearDraft}
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  backgroundColor: '#fef2f2',
                  padding: '10px 18px',
                }}
              >
                حذف المسودة
              </Button>
            )}
            <Button
              variant="secondary"
              type="button"
              onClick={handleGoBack}
              style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}
            >
              العودة للقائمة
            </Button>
            {isAdmin ? (
              <>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => handleAdminSubmit(false)}
                  disabled={isSubmitting || validLines.length === 0}
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#170e5e',
                    borderColor: '#170e5e',
                    padding: '10px 18px',
                  }}
                >
                  {adminSubmitMutation.isPending ? 'جاري الحفظ...' : 'حفظ كإذن معلق'}
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => handleAdminSubmit(true)}
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
                  {adminSubmitMutation.isPending
                    ? 'جارٍ الصرف والتحميل...'
                    : 'صرف وتحميل السيارة فوراً وبدء الرحلة'}
                </Button>
              </>
            ) : (
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
            )}
          </div>
        </section>

        {/* Footer Build Indicator */}
        <footer style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '20px' }}>
          <span
            style={{
              fontSize: '11px',
              color: '#94a3b8',
              fontFamily: 'monospace',
              cursor: 'pointer',
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '6px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
            }}
            onClick={() => window.location.reload()}
            title="انقر للتحديث الفوري"
          >
            بيلد: {typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev'}
          </span>
        </footer>
      </div>
    </div>
  );
}

export const UnifiedLoadRequisitionView = DriverNewLoadRequisitionView;
export default DriverNewLoadRequisitionView;
