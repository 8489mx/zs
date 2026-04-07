import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import type { AppSettings, Branch, Location, Product } from '@/types/domain';
import { buildPurchaseDraftItem, upsertPurchaseDraftItem, type PurchaseDraftItem } from '@/features/purchases/contracts';
import { useCreatePurchaseMutation } from '@/features/purchases/hooks/useCreatePurchaseMutation';
import { purchaseHeaderSchema, purchaseLineSchema, type PurchaseHeaderInput, type PurchaseHeaderOutput } from '@/features/purchases/schemas/purchase.schema';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

const DEFAULT_HEADER_VALUES: PurchaseHeaderInput = { supplierId: '', paymentType: 'cash', discount: 0, branchId: '', locationId: '', note: '' };

function buildDefaultHeaderValues(branches: Branch[], locations: Location[]): PurchaseHeaderInput {
  return {
    ...DEFAULT_HEADER_VALUES,
    branchId: SINGLE_STORE_MODE ? String(branches[0]?.id || '') : '',
    locationId: SINGLE_STORE_MODE ? String(locations[0]?.id || '') : '',
  };
}

function resetLineDraft(setLineProductId: (value: string) => void, setLineQty: (value: number) => void, setLineCost: (value: number) => void, setLineError: (value: string) => void) {
  setLineProductId('');
  setLineQty(1);
  setLineCost(0);
  setLineError('');
}

export function usePurchaseComposerController({ products, branches, locations, settings }: { products: Product[]; branches: Branch[]; locations: Location[]; settings?: AppSettings }) {
  const headerForm = useForm<PurchaseHeaderInput, undefined, PurchaseHeaderOutput>({
    resolver: zodResolver(purchaseHeaderSchema),
    defaultValues: buildDefaultHeaderValues(branches, locations),
  });
  const [items, setItems] = useState<PurchaseDraftItem[]>([]);
  const [lineProductId, setLineProductId] = useState('');
  const [lineQty, setLineQty] = useState(1);
  const [lineCost, setLineCost] = useState(0);
  const [lineError, setLineError] = useState('');

  const hasDraftChanges = headerForm.formState.isDirty || items.length > 0 || Boolean(lineProductId) || lineQty !== 1 || lineCost !== 0;
  const mutation = useCreatePurchaseMutation(() => {
    headerForm.reset(buildDefaultHeaderValues(branches, locations));
    setItems([]);
    resetLineDraft(setLineProductId, setLineQty, setLineCost, setLineError);
  });
  const canNavigateAway = useUnsavedChangesGuard(hasDraftChanges && !mutation.isPending);

  useEffect(() => {
    if (!SINGLE_STORE_MODE) return;
    if (!headerForm.getValues('branchId') && branches[0]?.id) headerForm.setValue('branchId', String(branches[0].id));
    if (!headerForm.getValues('locationId') && locations[0]?.id) headerForm.setValue('locationId', String(locations[0].id));
  }, [branches, headerForm, locations]);

  const subTotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const discount = Math.max(0, Number(headerForm.watch('discount') || 0));
  const taxRate = Number(settings?.taxRate || 0);
  const pricesIncludeTax = String(settings?.taxMode || 'exclusive') === 'inclusive';
  const taxAmount = useMemo(() => {
    const taxable = Math.max(0, subTotal - discount);
    if (!taxRate) return 0;
    if (pricesIncludeTax) return Number((taxable - taxable / (1 + taxRate / 100)).toFixed(2));
    return Number((taxable * (taxRate / 100)).toFixed(2));
  }, [discount, pricesIncludeTax, subTotal, taxRate]);
  const total = useMemo(() => {
    const taxable = Math.max(0, subTotal - discount);
    return pricesIncludeTax ? Number(taxable.toFixed(2)) : Number((taxable + taxAmount).toFixed(2));
  }, [discount, pricesIncludeTax, subTotal, taxAmount]);

  function handleProductChange(productId: string) {
    setLineProductId(productId);
    const product = products.find((entry) => entry.id === productId);
    if (product) {
      setLineCost(Number(product.costPrice || 0));
      setLineError('');
    }
  }

  function handleAddItem() {
    try {
      const parsed = purchaseLineSchema.parse({ productId: lineProductId, qty: lineQty, cost: lineCost });
      const product = products.find((entry) => entry.id === parsed.productId);
      if (!product) throw new Error('الصنف المختار غير موجود');
      setItems((current) => upsertPurchaseDraftItem(current, buildPurchaseDraftItem(product, parsed.qty, parsed.cost)));
      resetLineDraft(setLineProductId, setLineQty, setLineCost, setLineError);
      mutation.reset();
    } catch (error) {
      setLineError(error instanceof Error ? error.message : 'تعذر إضافة الصنف إلى الفاتورة');
    }
  }

  function handleRemoveItem(productId: string, unitName: string) {
    setItems((current) => current.filter((entry) => !(entry.productId === productId && entry.unitName === unitName)));
  }

  function handleReset(force = false) {
    if (!force && hasDraftChanges && !canNavigateAway()) return;
    headerForm.reset(buildDefaultHeaderValues(branches, locations));
    setItems([]);
    resetLineDraft(setLineProductId, setLineQty, setLineCost, setLineError);
    mutation.reset();
  }

  return {
    headerForm,
    items,
    lineDraft: { lineProductId, lineQty, lineCost, lineError },
    mutation,
    hasDraftChanges,
    totals: { subTotal, discount, taxRate, pricesIncludeTax, taxAmount, total },
    actions: {
      setLineQty,
      setLineCost,
      handleProductChange,
      handleAddItem,
      handleRemoveItem,
      handleReset,
    },
  };
}
