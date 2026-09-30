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
import { useIsMobile } from '@/shared/hooks/use-is-mobile';

export interface RequisitionLineItem {
  id: string;
  productId: number | '';
  productName: string;
  barcode: string;
  unitPrice: number;
  unit: string;
  packagingUnit?: { name: string; multiplier: number };
  isWeight?: boolean;
  cartons?: number;
  pieces?: number;
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
const getProductOptionMeta = (opt: ProductOptionItem) => {
  const p = opt.product;
  let packMeta = '';
  if (p.packagingUnit && p.packagingUnit.multiplier > 1) {
    const c = Math.floor(opt.totalStock / p.packagingUnit.multiplier);
    const pcs = opt.totalStock % p.packagingUnit.multiplier;
    packMeta = ` | كرتونة=${p.packagingUnit.multiplier}ق (${c}ك + ${pcs}ق)`;
  }
  return `متاح: ${opt.totalStock} ${opt.unit}${packMeta} ${opt.barcode ? `| باركود: ${opt.barcode}` : ''}`;
};
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

interface CompactStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unitLabel: string;
  isDecimal?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (val: number) => void;
  disabledIncrement?: boolean;
  disabledDecrement?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onEnter?: () => void;
  inputWidth?: string;
  height?: string;
}

/**
 * Universal Compact Stepper with strict RTL order: [+] (value) [-] (label)
 */
const CompactStepper = memo(function CompactStepper({
  value,
  min = 0,
  max = 999999,
  step = 1,
  unitLabel,
  isDecimal = false,
  onIncrement,
  onDecrement,
  onChange,
  disabledIncrement = false,
  disabledDecrement = false,
  inputRef,
  onEnter,
  inputWidth = '42px',
  height = '32px',
}: CompactStepperProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid #cbd5e1',
          borderRadius: '7px',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          height,
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* RTL Stepper: + first (renders physically on the RIGHT) */}
        <button
          type="button"
          onClick={onIncrement}
          disabled={disabledIncrement}
          style={{
            width: '28px',
            height: '100%',
            border: 'none',
            backgroundColor: '#f8fafc',
            color: '#334155',
            cursor: disabledIncrement ? 'not-allowed' : 'pointer',
            opacity: disabledIncrement ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderInlineEnd: '1px solid #e2e8f0',
          }}
          title={`زيادة ${unitLabel}`}
        >
          <PlusIcon size={12} />
        </button>
        <input
          ref={inputRef as any}
          type="number"
          step={step}
          className="no-spin-arrows"
          min={min}
          max={max}
          value={isNaN(value) ? '' : value}
          onChange={(e) => {
            const parsed = isDecimal ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
            if (!isNaN(parsed)) onChange(parsed);
            else if (e.target.value === '') onChange(0);
          }}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnter?.();
            }
          }}
          style={{
            width: inputWidth,
            height: '100%',
            border: 'none',
            textAlign: 'center',
            fontSize: '12.5px',
            fontWeight: 800,
            color: '#0f172a',
            outline: 'none',
            MozAppearance: 'textfield',
            appearance: 'textfield',
            padding: '0 2px',
          }}
        />
        {/* RTL Stepper: - last (renders physically on the LEFT) */}
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabledDecrement}
          style={{
            width: '28px',
            height: '100%',
            border: 'none',
            backgroundColor: '#f8fafc',
            color: '#334155',
            cursor: disabledDecrement ? 'not-allowed' : 'pointer',
            opacity: disabledDecrement ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderInlineStart: '1px solid #e2e8f0',
          }}
          title={`إنقاص ${unitLabel}`}
        >
          <MinusIcon size={12} />
        </button>
      </div>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#475569',
          backgroundColor: '#f8fafc',
          padding: '3px 6px',
          borderRadius: '5px',
          whiteSpace: 'nowrap',
          border: '1px solid #e2e8f0',
        }}
      >
        {unitLabel}
      </span>
    </div>
  );
});

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
  onUpdateLineCartonsPieces?: (lineId: string, cartons: number, pieces: number) => void;
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
  onUpdateLineCartonsPieces,
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

  const handleRemove = useCallback(() => {
    onRemoveLine(line.id);
  }, [line.id, onRemoveLine]);

  const isCartonItem = Boolean(line.packagingUnit && line.packagingUnit.multiplier > 1);
  const isWeightItem = Boolean(line.isWeight);
  const mult = line.packagingUnit?.multiplier || 1;
  const cartons = line.cartons !== undefined ? line.cartons : (isCartonItem ? Math.floor(line.qty / mult) : 0);
  const pieces = line.pieces !== undefined ? line.pieces : (isCartonItem ? line.qty % mult : 0);

  const handleCartonsIncrement = useCallback(() => {
    const newC = cartons + 1;
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, newC, pieces);
    } else {
      onUpdateLineQty(line.id, (newC * mult) + pieces);
    }
  }, [cartons, pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handleCartonsDecrement = useCallback(() => {
    const newC = Math.max(0, cartons - 1);
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, newC, pieces);
    } else {
      onUpdateLineQty(line.id, (newC * mult) + pieces);
    }
  }, [cartons, pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handleCartonsChange = useCallback((val: number) => {
    const newC = Math.max(0, val);
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, newC, pieces);
    } else {
      onUpdateLineQty(line.id, (newC * mult) + pieces);
    }
  }, [pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handlePiecesIncrement = useCallback(() => {
    const newP = pieces + 1;
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, cartons, newP);
    } else {
      onUpdateLineQty(line.id, (cartons * mult) + newP);
    }
  }, [cartons, pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handlePiecesDecrement = useCallback(() => {
    const newP = Math.max(0, pieces - 1);
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, cartons, newP);
    } else {
      onUpdateLineQty(line.id, (cartons * mult) + newP);
    }
  }, [cartons, pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handlePiecesChange = useCallback((val: number) => {
    const newP = Math.max(0, val);
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, cartons, newP);
    } else {
      onUpdateLineQty(line.id, (cartons * mult) + newP);
    }
  }, [cartons, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handleSingleQtyPlus = useCallback(() => {
    const step = isWeightItem ? 0.5 : 1;
    const newQ = Number((line.qty + step).toFixed(2));
    onUpdateLineQty(line.id, newQ);
  }, [line.qty, isWeightItem, line.id, onUpdateLineQty]);

  const handleSingleQtyMinus = useCallback(() => {
    const step = isWeightItem ? 0.5 : 1;
    const minQ = isWeightItem ? 0.05 : 1;
    const newQ = Math.max(minQ, Number((line.qty - step).toFixed(2)));
    onUpdateLineQty(line.id, newQ);
  }, [line.qty, isWeightItem, line.id, onUpdateLineQty]);

  const handleSingleQtyChange = useCallback((val: number) => {
    const minQ = isWeightItem ? 0.05 : 1;
    const safeQ = Math.max(minQ, val);
    onUpdateLineQty(line.id, safeQ);
  }, [isWeightItem, line.id, onUpdateLineQty]);

  const isExceedingStock = line.availableInWarehouse > 0 && line.qty > line.availableInWarehouse;

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
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: line.availableInWarehouse > 0 ? '#15803d' : '#dc2626',
                backgroundColor: line.availableInWarehouse > 0 ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${line.availableInWarehouse > 0 ? '#bbf7d0' : '#fecaca'}`,
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
            >
              {isCartonItem ? (
                <>
                  {Math.floor(line.availableInWarehouse / mult)} {line.packagingUnit?.name}
                  {line.availableInWarehouse % mult > 0 ? ` + ${line.availableInWarehouse % mult} ق` : ''}
                </>
              ) : (
                `${line.availableInWarehouse} ${line.unit}`
              )}
            </span>
            {isCartonItem && (
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                ({line.availableInWarehouse} قطعة)
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: '#94a3b8' }}>-</span>
        )}
      </td>

      {/* Requested Qty Cell */}
      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
        {line.productId ? (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {isCartonItem ? (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <CompactStepper
                    value={cartons}
                    unitLabel={line.packagingUnit?.name || 'كرتونة'}
                    onIncrement={handleCartonsIncrement}
                    onDecrement={handleCartonsDecrement}
                    onChange={handleCartonsChange}
                    disabledDecrement={cartons <= 0}
                    onEnter={onEnterQty}
                    inputWidth="38px"
                  />
                  <span style={{ fontWeight: 800, color: '#94a3b8', fontSize: '12px' }}>+</span>
                  <CompactStepper
                    value={pieces}
                    unitLabel="قطع"
                    onIncrement={handlePiecesIncrement}
                    onDecrement={handlePiecesDecrement}
                    onChange={handlePiecesChange}
                    disabledDecrement={pieces <= 0}
                    onEnter={onEnterQty}
                    inputWidth="38px"
                  />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isExceedingStock ? '#dc2626' : '#170e5e',
                  }}
                >
                  الإجمالي: {line.qty} قطعة
                </span>
              </>
            ) : (
              <CompactStepper
                value={line.qty}
                unitLabel={line.unit || 'قطعة'}
                isDecimal={isWeightItem}
                step={isWeightItem ? 0.5 : 1}
                min={isWeightItem ? 0.05 : 1}
                onIncrement={handleSingleQtyPlus}
                onDecrement={handleSingleQtyMinus}
                onChange={handleSingleQtyChange}
                disabledDecrement={line.qty <= (isWeightItem ? 0.05 : 1)}
                disabledIncrement={line.availableInWarehouse > 0 && line.qty >= line.availableInWarehouse}
                onEnter={onEnterQty}
                inputWidth={isWeightItem ? '54px' : '44px'}
              />
            )}
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

const RequisitionLineCard = memo(function RequisitionLineCard({
  line,
  index = 0,
  productOptions,
  selectedWarehouseFilter,
  onSelectProduct,
  onLineProductChange,
  onChangeLineWarehouse,
  onLineWarehouseChange,
  onUpdateLineQty,
  onUpdateLineCartonsPieces,
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

  const handleRemove = useCallback(() => {
    onRemoveLine(line.id);
  }, [line.id, onRemoveLine]);

  const isCartonItem = Boolean(line.packagingUnit && line.packagingUnit.multiplier > 1);
  const isWeightItem = Boolean(line.isWeight);
  const mult = line.packagingUnit?.multiplier || 1;
  const cartons = line.cartons !== undefined ? line.cartons : (isCartonItem ? Math.floor(line.qty / mult) : 0);
  const pieces = line.pieces !== undefined ? line.pieces : (isCartonItem ? line.qty % mult : 0);

  const handleCartonsIncrement = useCallback(() => {
    const newC = cartons + 1;
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, newC, pieces);
    } else {
      onUpdateLineQty(line.id, (newC * mult) + pieces);
    }
  }, [cartons, pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handleCartonsDecrement = useCallback(() => {
    const newC = Math.max(0, cartons - 1);
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, newC, pieces);
    } else {
      onUpdateLineQty(line.id, (newC * mult) + pieces);
    }
  }, [cartons, pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handleCartonsChange = useCallback((val: number) => {
    const newC = Math.max(0, val);
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, newC, pieces);
    } else {
      onUpdateLineQty(line.id, (newC * mult) + pieces);
    }
  }, [pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handlePiecesIncrement = useCallback(() => {
    const newP = pieces + 1;
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, cartons, newP);
    } else {
      onUpdateLineQty(line.id, (cartons * mult) + newP);
    }
  }, [cartons, pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handlePiecesDecrement = useCallback(() => {
    const newP = Math.max(0, pieces - 1);
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, cartons, newP);
    } else {
      onUpdateLineQty(line.id, (cartons * mult) + newP);
    }
  }, [cartons, pieces, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handlePiecesChange = useCallback((val: number) => {
    const newP = Math.max(0, val);
    if (onUpdateLineCartonsPieces) {
      onUpdateLineCartonsPieces(line.id, cartons, newP);
    } else {
      onUpdateLineQty(line.id, (cartons * mult) + newP);
    }
  }, [cartons, mult, line.id, onUpdateLineCartonsPieces, onUpdateLineQty]);

  const handleSingleQtyPlus = useCallback(() => {
    const step = isWeightItem ? 0.5 : 1;
    const newQ = Number((line.qty + step).toFixed(2));
    onUpdateLineQty(line.id, newQ);
  }, [line.qty, isWeightItem, line.id, onUpdateLineQty]);

  const handleSingleQtyMinus = useCallback(() => {
    const step = isWeightItem ? 0.5 : 1;
    const minQ = isWeightItem ? 0.05 : 1;
    const newQ = Math.max(minQ, Number((line.qty - step).toFixed(2)));
    onUpdateLineQty(line.id, newQ);
  }, [line.qty, isWeightItem, line.id, onUpdateLineQty]);

  const handleSingleQtyChange = useCallback((val: number) => {
    const minQ = isWeightItem ? 0.05 : 1;
    const safeQ = Math.max(minQ, val);
    onUpdateLineQty(line.id, safeQ);
  }, [isWeightItem, line.id, onUpdateLineQty]);

  const isExceedingStock = line.availableInWarehouse > 0 && line.qty > line.availableInWarehouse;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Card Header: Item index & Unit Price badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
          بند رقم #{index + 1}
        </span>
        {line.productId && line.unitPrice > 0 ? (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#170e5e',
              backgroundColor: '#ede9fe',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            سعر الوحدة: {line.unitPrice.toFixed(2)} <CurrencySymbol />
          </span>
        ) : null}
      </div>

      {/* Product Search & Selection via Portal Combobox */}
      <div>
        <SearchableCombobox
          inputId={`product-card-input-${line.id}`}
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
          inputStyle={{ height: '40px', borderRadius: '8px', fontSize: '13px' }}
        />
      </div>

      {/* Source Warehouse (when "all" is active) */}
      {selectedWarehouseFilter === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
            مخزن الصرف:
          </label>
          {line.productId ? (
            productWarehouseOptions.length > 0 ? (
              <SearchableCombobox
                inputId={`warehouse-card-input-${line.id}`}
                options={productWarehouseOptions}
                value={line.sourceWarehouseName || ''}
                onChange={handleWarehouseChange}
                onSelect={handleWarehouseSelect}
                getLabel={getWarehouseOptionLabel}
                search={searchWarehouseOption}
                placeholder="اختر المخزن..."
                inline={true}
                inputClassName="purchase-prototype-field-input"
                inputStyle={{ height: '38px', borderRadius: '8px', fontSize: '12.5px' }}
              />
            ) : (
              <span style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 700 }}>
                لا يتوفر رصيد بأي مخزن
              </span>
            )
          ) : (
            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>- اختر صنفاً أولاً -</span>
          )}
        </div>
      )}

      {/* Bottom Action Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        {/* Row 1: Stock info & Total summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>المتاح:</span>
            {line.productId ? (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: line.availableInWarehouse > 0 ? '#15803d' : '#dc2626',
                  backgroundColor: line.availableInWarehouse > 0 ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${line.availableInWarehouse > 0 ? '#bbf7d0' : '#fecaca'}`,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isCartonItem ? (
                  <>
                    {Math.floor(line.availableInWarehouse / mult)} {line.packagingUnit?.name}
                    {line.availableInWarehouse % mult > 0 ? ` + ${line.availableInWarehouse % mult} ق` : ''}
                  </>
                ) : (
                  `${line.availableInWarehouse} ${line.unit}`
                )}
              </span>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
            )}
          </div>

          {line.productId && isCartonItem && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: isExceedingStock ? '#dc2626' : '#170e5e',
                backgroundColor: isExceedingStock ? '#fee2e2' : '#ede9fe',
                padding: '2px 8px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              المطلوب: {line.qty} قطعة
            </span>
          )}
        </div>

        {/* Row 2: Controls row */}
        {line.productId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            {isCartonItem ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                <CompactStepper
                  value={cartons}
                  unitLabel={line.packagingUnit?.name || 'كرتونة'}
                  onIncrement={handleCartonsIncrement}
                  onDecrement={handleCartonsDecrement}
                  onChange={handleCartonsChange}
                  disabledDecrement={cartons <= 0}
                  inputWidth="38px"
                  height="32px"
                  onEnter={onEnterQty}
                />
                <CompactStepper
                  value={pieces}
                  unitLabel="قطع"
                  onIncrement={handlePiecesIncrement}
                  onDecrement={handlePiecesDecrement}
                  onChange={handlePiecesChange}
                  disabledDecrement={pieces <= 0}
                  inputWidth="38px"
                  height="32px"
                  onEnter={onEnterQty}
                />
              </div>
            ) : (
              <CompactStepper
                value={line.qty}
                unitLabel={line.unit || 'قطعة'}
                isDecimal={isWeightItem}
                step={isWeightItem ? 0.5 : 1}
                min={isWeightItem ? 0.05 : 1}
                onIncrement={handleSingleQtyPlus}
                onDecrement={handleSingleQtyMinus}
                onChange={handleSingleQtyChange}
                disabledDecrement={line.qty <= (isWeightItem ? 0.05 : 1)}
                disabledIncrement={line.availableInWarehouse > 0 && line.qty >= line.availableInWarehouse}
                inputWidth={isWeightItem ? '54px' : '44px'}
                height="32px"
                onEnter={onEnterQty}
              />
            )}

            {/* Delete button */}
            <button
              type="button"
              onClick={handleRemove}
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '32px',
                width: '32px',
                flexShrink: 0,
              }}
              title="حذف هذا السطر"
            >
              <Trash2Icon size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
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
  const isMobile = useIsMobile(768);

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
  const rawVehiclePlate = isAdmin
    ? (selectedRep?.vehicle_plate || '')
    : (driverHook.vehiclePlate || '');

  const displayVehiclePlate = useMemo(() => {
    if (!rawVehiclePlate) return '—';
    return rawVehiclePlate
      .replace(/^سيارة\s*(رقم)?\s*\[?/g, '')
      .replace(/\]$/g, '')
      .replace(/سيارة التوزيع الميدانية/g, '')
      .trim() || '—';
  }, [rawVehiclePlate]);

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

    const packUnit = product.packagingUnit;
    const isWeight = Boolean(product.isWeight);
    const mult = packUnit?.multiplier || 1;
    const isCarton = Boolean(packUnit && mult > 1);
    const initialCartons = isCarton ? 1 : undefined;
    const initialPieces = isCarton ? 0 : undefined;
    const initialQty = isCarton ? mult : 1;

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
          packagingUnit: packUnit,
          isWeight,
          cartons: initialCartons,
          pieces: initialPieces,
          sourceWarehouseId: sourceWhId,
          sourceWarehouseName: sourceWhName,
          availableInWarehouse: availStock,
          warehouseStocks: product.warehouseStocks || [],
          qty: initialQty,
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
        const minQ = line.isWeight ? 0.05 : 1;
        const clamped = Math.max(minQ, newQty);
        const mult = line.packagingUnit?.multiplier || 1;
        let cartons = line.cartons;
        let pieces = line.pieces;
        if (line.packagingUnit && mult > 1) {
          cartons = Math.floor(clamped / mult);
          pieces = Math.round(clamped % mult);
        }
        return { ...line, qty: clamped, cartons, pieces };
      }),
    );
  }, []);

  const handleUpdateLineCartonsPieces = useCallback((lineId: string, cartons: number, pieces: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const mult = line.packagingUnit?.multiplier || 1;
        const safeC = Math.max(0, cartons);
        const safeP = Math.max(0, pieces);
        const total = (safeC * mult) + safeP;
        return {
          ...line,
          cartons: safeC,
          pieces: safeP,
          qty: total,
        };
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
      items: validLines.map((item) => {
        const mult = item.packagingUnit?.multiplier || 1;
        const isCarton = Boolean(item.packagingUnit && mult > 1);
        const cartons = item.cartons !== undefined ? item.cartons : (isCarton ? Math.floor(item.qty / mult) : undefined);
        const pieces = item.pieces !== undefined ? item.pieces : (isCarton ? item.qty % mult : undefined);
        let packingText = '';
        if (isCarton && (cartons !== undefined || pieces !== undefined)) {
          const c = cartons || 0;
          const p = pieces || 0;
          if (c > 0 && p > 0) packingText = `${c} ${item.packagingUnit?.name} + ${p} ${item.unit}`;
          else if (c > 0) packingText = `${c} ${item.packagingUnit?.name}`;
          else packingText = `${p} ${item.unit}`;
        } else {
          packingText = `${item.qty} ${item.unit}`;
        }
        return {
          productId: Number(item.productId),
          qty: item.qty,
          cartons,
          pieces,
          cartonMultiplier: mult > 1 ? mult : undefined,
          packagingUnitName: item.packagingUnit?.name,
          unitName: item.unit,
          isWeight: item.isWeight,
          packingText,
          sourceWarehouseId: item.sourceWarehouseId ? Number(item.sourceWarehouseId) : undefined,
          sourceWarehouseName: item.sourceWarehouseName,
        };
      }),
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
      items: validLines.map((item) => {
        const mult = item.packagingUnit?.multiplier || 1;
        const isCarton = Boolean(item.packagingUnit && mult > 1);
        const cartons = item.cartons !== undefined ? item.cartons : (isCarton ? Math.floor(item.qty / mult) : undefined);
        const pieces = item.pieces !== undefined ? item.pieces : (isCarton ? item.qty % mult : undefined);
        let packingText = '';
        if (isCarton && (cartons !== undefined || pieces !== undefined)) {
          const c = cartons || 0;
          const p = pieces || 0;
          if (c > 0 && p > 0) packingText = `${c} ${item.packagingUnit?.name} + ${p} ${item.unit}`;
          else if (c > 0) packingText = `${c} ${item.packagingUnit?.name}`;
          else packingText = `${p} ${item.unit}`;
        } else {
          packingText = `${item.qty} ${item.unit}`;
        }
        return {
          productId: Number(item.productId),
          qty: item.qty,
          productName: item.productName,
          barcode: item.barcode,
          cartons,
          pieces,
          cartonMultiplier: mult > 1 ? mult : undefined,
          packagingUnitName: item.packagingUnit?.name,
          unitName: item.unit,
          isWeight: item.isWeight,
          packingText,
          sourceWarehouseId: item.sourceWarehouseId ? Number(item.sourceWarehouseId) : undefined,
          sourceWarehouseName: item.sourceWarehouseName,
        };
      }),
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
            تم إرسال طلب شحن البضاعة بنجاح!
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
    <div dir="rtl" className="driver-requisition-view" style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
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
        @media (max-width: 768px) {
          .driver-requisition-card {
            padding: 12px 14px !important;
          }
          .driver-req-top-actions {
            width: 100% !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 8px !important;
            margin-top: 8px !important;
          }
          .driver-req-top-actions > * {
            min-height: 36px !important;
            justify-content: center !important;
          }
          .driver-req-top-actions > .driver-req-primary-btn {
            flex: 1 1 auto !important;
          }
          .driver-req-top-actions > button:not(.driver-req-primary-btn) {
            flex: 0 0 auto !important;
          }
          .driver-req-bottom-actions {
            width: 100% !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 8px !important;
            margin-top: 10px !important;
          }
          .driver-req-bottom-actions > * {
            min-height: 38px !important;
            justify-content: center !important;
          }
          .driver-req-bottom-actions > .driver-req-primary-btn {
            flex: 1 1 auto !important;
          }
          .driver-req-bottom-actions > button:not(.driver-req-primary-btn) {
            flex: 0 0 auto !important;
          }
        }
      `}</style>
      <div
        style={{
          maxWidth: '1280px',
          width: 'min(100%, 1280px)',
          margin: '0 auto',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          paddingRight: 'max(14px, env(safe-area-inset-right, 0px))',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(14px, env(safe-area-inset-left, 0px))',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Header Bar matching NewIssueOrderPage */}
        <header
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '10px 14px',
            marginBottom: '10px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {isAdmin
                    ? 'إسناد وصرف إذن تحميل السيارة'
                    : 'طلب شحن وتحميل سيارة التوزيع'}
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
                  {isAdmin ? 'إسناد إداري' : 'مسودة جديدة'}
                </span>
              </div>

            </div>
          </div>

          <div className="driver-req-top-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
            {isAdmin ? (
              <>
                <Button
                  type="button"
                  variant="primary"
                  className="driver-req-primary-btn"
                  onClick={() => handleAdminSubmit(true)}
                  disabled={isSubmitting || validLines.length === 0}
                  style={{
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    padding: '8px 14px',
                    whiteSpace: 'nowrap',
                    flex: '1 1 auto',
                  }}
                >
                  {adminSubmitMutation.isPending
                    ? 'جاري الصرف والتحميل...'
                    : `صرف وتحميل (${distinctItemsCount})`}
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => handleAdminSubmit(false)}
                  disabled={isSubmitting || validLines.length === 0}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#170e5e',
                    borderColor: '#170e5e',
                    padding: '8px 12px',
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                  }}
                >
                  {adminSubmitMutation.isPending ? 'جاري الحفظ...' : 'إذن معلق'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="primary"
                className="driver-req-primary-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || validLines.length === 0}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  padding: '8px 14px',
                  whiteSpace: 'nowrap',
                  flex: '1 1 auto',
                }}
              >
                {isSubmitting
                  ? 'جارٍ الإرسال...'
                  : `إرسال للمشرف (${distinctItemsCount})`}
              </Button>
            )}

            {(hasDraftContent || hasSavedDraft) && (
              <Button
                variant="secondary"
                type="button"
                onClick={handleClearDraft}
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  backgroundColor: '#fef2f2',
                  padding: '8px 12px',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                }}
              >
                حذف المسودة
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
          className="driver-requisition-card"
          style={{
            position: 'relative',
            zIndex: 10,
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '12px 14px',
            marginBottom: '10px',
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
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Field 1: Source Warehouse Filter */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '4px',
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

            {/* Field 2 & 3: Representative & Vehicle Side by Side on 1 Row (Flex row to strictly prevent mobile collapse) */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ flex: '1 1 50%', minWidth: 0 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '3px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isAdmin ? 'المندوب (السائق)' : 'المندوب (المستلم)'}
                  {isAdmin && <span style={{ color: '#dc2626' }}> *</span>}
                </label>
                {isAdmin ? (
                  <CustomSelect
                    value={selectedRepId}
                    onChange={(val) => setSelectedRepId(val)}
                    options={repSelectOptions}
                    placeholder="اختر المندوب..."
                    disabled={adminRepsQuery.isLoading}
                  />
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={driverName}
                    style={{
                      width: '100%',
                      height: '36px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0 10px',
                      fontSize: '12px',
                      color: '#0f172a',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              <div style={{ flex: '1 1 50%', minWidth: 0 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '3px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  السيارة
                </label>
                <input
                  type="text"
                  readOnly
                  value={displayVehiclePlate}
                  style={{
                    width: '100%',
                    height: '36px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0 10px',
                    fontSize: '12px',
                    color: '#0f172a',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: "الأصناف المطلوبة للتحميل" matching IssueOrderItemsTable */}
        <section
          className="driver-requisition-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '12px 14px',
            marginBottom: '10px',
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
            {/* Top add button removed to avoid duplicate */}
          </div>

          {/* Items Container: Responsive Cards on Mobile, Table on Desktop */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lines.map((line, index) => (
                <RequisitionLineCard
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
                  onUpdateLineCartonsPieces={handleUpdateLineCartonsPieces}
                  onRemoveLine={handleRemoveLine}
                  onEnterQty={handleAddLine}
                />
              ))}
            </div>
          ) : (
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
                    <th style={{ padding: '10px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700, width: '34%' }}>
                      الصنف (بحث بالاسم أو الباركود)
                    </th>
                    {selectedWarehouseFilter === 'all' && (
                      <th style={{ padding: '10px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700, width: '22%' }}>
                        مخزن الصرف
                      </th>
                    )}
                    <th style={{ padding: '10px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700, width: '16%', textAlign: 'center' }}>
                      المتاح بالمخزن
                    </th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700, width: '23%', textAlign: 'center' }}>
                      الكمية المطلوبة (كرتونة / قطع)
                    </th>
                    <th style={{ padding: '10px 14px', width: '5%', textAlign: 'center' }}></th>
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
                      onUpdateLineCartonsPieces={handleUpdateLineCartonsPieces}
                      onRemoveLine={handleRemoveLine}
                      onEnterQty={handleAddLine}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Line Bottom Bar */}
          <div style={{ marginTop: '12px', textAlign: isMobile ? 'center' : 'right' }}>
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
                width: isMobile ? '100%' : 'auto',
                justifyContent: 'center',
              }}
            >
              + إضافة صنف جديد
            </Button>
          </div>
        </section>

        {/* Section 3: "الملاحظات" matching NewIssueOrderPage */}
        <section
          className="driver-requisition-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '10px 14px',
            marginBottom: '10px',
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
            rows={2}
            placeholder="أي ملاحظات إضافية على طلب الشحن..."
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '12px',
              color: '#0f172a',
              boxSizing: 'border-box',
              resize: 'vertical',
              minHeight: '44px',
            }}
          />
        </section>

        {/* Section 4: Summary Card & Action Bar */}
        <section
          className="driver-requisition-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr auto 1.2fr',
              alignItems: 'center',
              width: '100%',
              gap: '6px',
              backgroundColor: '#f8fafc',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', whiteSpace: 'nowrap' }}>الأصناف</span>
              <strong style={{ fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap' }}>{distinctItemsCount} صنف</strong>
            </div>
            <div style={{ height: '22px', width: '1px', backgroundColor: '#cbd5e1' }} />
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', whiteSpace: 'nowrap' }}>القطع</span>
              <strong style={{ fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap' }}>{totalUnitsCount} قطعة</strong>
            </div>
            <div style={{ height: '22px', width: '1px', backgroundColor: '#cbd5e1' }} />
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', whiteSpace: 'nowrap' }}>إجمالي القيمة</span>
              <strong style={{ fontSize: '14px', color: '#170e5e', fontWeight: 900, whiteSpace: 'nowrap' }}>
                {totalEstimatedValue.toFixed(2)} <CurrencySymbol />
              </strong>
            </div>
          </div>

          <div className="driver-req-bottom-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', alignItems: 'center' }}>
            {isAdmin ? (
              <>
                <Button
                  variant="primary"
                  type="button"
                  className="driver-req-primary-btn"
                  onClick={() => handleAdminSubmit(true)}
                  disabled={isSubmitting || validLines.length === 0}
                  style={{
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '13px',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    flex: '1 1 auto',
                  }}
                >
                  {adminSubmitMutation.isPending
                    ? 'جارٍ الصرف والتحميل...'
                    : `صرف وتحميل (${distinctItemsCount})`}
                </Button>
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
                    padding: '9px 12px',
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                  }}
                >
                  {adminSubmitMutation.isPending ? 'جاري الحفظ...' : 'حفظ كإذن معلق'}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                type="button"
                className="driver-req-primary-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || validLines.length === 0}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                  flex: '1 1 auto',
                }}
              >
                {isSubmitting
                  ? 'جارٍ الإرسال...'
                  : `إرسال للمشرف (${distinctItemsCount})`}
              </Button>
            )}

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
                  padding: '9px 14px',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                }}
              >
                حذف المسودة
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export const UnifiedLoadRequisitionView = DriverNewLoadRequisitionView;
export default DriverNewLoadRequisitionView;
