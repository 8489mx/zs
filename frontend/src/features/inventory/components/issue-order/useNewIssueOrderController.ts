import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import { useAuthStore } from '@/stores/auth-store';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { withIdempotency } from '@/lib/idempotency';
import { referenceDataApi } from '@/services/reference-data.api';
import { queryKeys } from '@/app/query-keys';
import { useFormDraft } from '@/shared/hooks/use-form-draft';
import { LineItem } from './types';

export function useNewIssueOrderController() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { productsQuery, locationsQuery, branchesQuery, locationStocksQuery } = useInventoryActionCatalog();

  const [fromLocationId, setFromLocationId] = useState('all');
  const [fromLocationQuery, setFromLocationQuery] = useState('كل المخازن');
  const [toLocationId, setToLocationId] = useState('');
  const [toLocationQuery, setToLocationQuery] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ id: Date.now(), productId: '', qty: 1, fromLocationId: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingFocusQtyLineId, setPendingFocusQtyLineId] = useState<number | null>(null);
  const [pendingFocusProductLineId, setPendingFocusProductLineId] = useState<number | null>(null);
  const [cameraScanLineId, setCameraScanLineId] = useState<number | null>(null);
  const [createdTransfers, setCreatedTransfers] = useState<any[]>([]);

  const idempotencyKeyRef = useRef<string | null>(null);
  const currentPayloadRef = useRef<string | null>(null);

  const [issueMode, setIssueMode] = useState<'final_issue' | 'transfer_to_branch_stock'>('final_issue');

  const draftData = useMemo(() => ({
    fromLocationId,
    fromLocationQuery,
    toLocationId,
    toLocationQuery,
    recipientName,
    note,
    issueMode,
    lines,
  }), [fromLocationId, fromLocationQuery, toLocationId, toLocationQuery, recipientName, note, issueMode, lines]);

  const { clearDraft, isDraftRestored, dismissRestoredNotice } = useFormDraft({
    key: 'z_draft_inventory_issue_order',
    data: draftData,
    isEmpty: (d) => {
      const hasHeader = Boolean(d.recipientName?.trim() || d.note?.trim() || (d.toLocationId && d.toLocationId !== ''));
      const hasLines = Array.isArray(d.lines) && d.lines.some(l => Boolean(l.productId || l.productName?.trim()));
      return !hasHeader && !hasLines;
    },
    onRestore: (saved) => {
      if (saved.fromLocationId) setFromLocationId(saved.fromLocationId);
      if (saved.fromLocationQuery) setFromLocationQuery(saved.fromLocationQuery);
      if (saved.toLocationId) setToLocationId(saved.toLocationId);
      if (saved.toLocationQuery) setToLocationQuery(saved.toLocationQuery);
      if (saved.recipientName) setRecipientName(saved.recipientName);
      if (saved.note) setNote(saved.note);
      if (saved.issueMode) setIssueMode(saved.issueMode);
      if (Array.isArray(saved.lines) && saved.lines.length > 0) {
        setLines(saved.lines);
      }
    },
  });

  const handleClearDraft = () => {
    clearDraft();
    setLines([{ id: Date.now(), productId: '', qty: 1, fromLocationId: '' }]);
    setToLocationId('');
    setToLocationQuery('');
    setRecipientName('');
    setNote('');
  };

  const products = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const locations = Array.isArray(locationsQuery.data) ? locationsQuery.data : [];
  const branches = Array.isArray(branchesQuery.data) ? branchesQuery.data : [];
  const stocks = Array.isArray(locationStocksQuery.data) ? locationStocksQuery.data : [];
  const settingsQuery = useQuery({ queryKey: queryKeys.settings, queryFn: referenceDataApi.settings });

  useEffect(() => {
    if (settingsQuery.data?.defaultBranchIssueMode) {
      setIssueMode(settingsQuery.data.defaultBranchIssueMode as any);
    }
  }, [settingsQuery.data?.defaultBranchIssueMode]);

  useEffect(() => {
    if (pendingFocusQtyLineId === null) return;
    const timer = window.setTimeout(() => {
      const input = document.getElementById(`quantity-input-${pendingFocusQtyLineId}`) as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
      setPendingFocusQtyLineId(null);
    }, 40);
    return () => window.clearTimeout(timer);
  }, [pendingFocusQtyLineId, lines]);

  useEffect(() => {
    if (pendingFocusProductLineId === null) return;
    const timer = window.setTimeout(() => {
      const input = document.getElementById(`product-input-${pendingFocusProductLineId}`) as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
      setPendingFocusProductLineId(null);
    }, 40);
    return () => window.clearTimeout(timer);
  }, [pendingFocusProductLineId, lines]);

  useEffect(() => {
    if (lines.length > 0 && lines[0]?.id) {
      setPendingFocusProductLineId(lines[0].id);
    }
  }, []);

  const availableProductIds = useMemo(() => {
    const ids = new Set<string>();
    if (fromLocationId === 'all') {
      for (const s of stocks) {
        if (s.qty > 0) ids.add(String(s.productId));
      }
    } else {
      for (const s of stocks) {
        if (String(s.locationId) === String(fromLocationId) && s.qty > 0) {
          ids.add(String(s.productId));
        }
      }
    }
    return ids;
  }, [stocks, fromLocationId]);

  const productOptions = useMemo(() => {
    return products
      .filter(p => availableProductIds.has(String(p.id)))
      .map(p => ({
        id: String(p.id),
        name: p.name,
        code: p.barcode || '',
        searchTerms: [p.name, p.barcode || ''].filter(Boolean).join(' ').toLowerCase(),
      }));
  }, [products, availableProductIds]);

  const fetchProductOptions = async (query: string) => {
    try {
      const results = await inventoryApi.searchProducts(query);
      return results
        .filter(p => availableProductIds.has(String(p.id)))
        .map(p => ({
          id: String(p.id),
          name: p.name,
          code: p.barcode || '',
          searchTerms: [p.name, p.barcode].filter(Boolean).join(' ').toLowerCase(),
        }));
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const locationOptions = [
    { id: 'all', name: 'كل المخازن', searchTerms: 'كل المخازن all' },
    ...locations.filter((l: any) => l.locationType === 'internal_warehouse' || l.locationType === 'external_warehouse' || !l.locationType).map((l) => ({
      id: String(l.id),
      name: l.name,
      searchTerms: l.name.toLowerCase(),
    })),
  ];

  const branchOptions = branches.map((b) => ({
    id: String(b.id),
    name: b.name,
    searchTerms: b.name.toLowerCase(),
  }));

  const addLine = () => {
    const newLineId = Date.now();
    setLines(prev => [...prev, { id: newLineId, productId: '', qty: 1, fromLocationId: '' }]);
    setPendingFocusProductLineId(newLineId);
  };

  const removeLine = (id: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter(l => l.id !== id));
  };

  const handleSelectProduct = (lineId: number, productOption: { id: string; name: string }) => {
    setLines(prevLines => {
      const lineToUpdate = prevLines.find(l => l.id === lineId);
      let newLines = prevLines.map(l => l.id === lineId ? { ...l, productId: productOption.id, productName: productOption.name } : l);

      const stocksList = Array.isArray(locationStocksQuery.data) ? locationStocksQuery.data : [];
      const productStocks = stocksList.filter(s => String(s.productId) === String(productOption.id) && s.qty > 0);

      let newLocationId = '';
      let newLocationName = '';

      if (fromLocationId === 'all') {
        const bestStock = productStocks.sort((a, b) => b.qty - a.qty)[0];
        if (bestStock) {
          newLocationId = String(bestStock.locationId);
          const loc = locationOptions.find(l => String(l.id) === newLocationId);
          if (loc) newLocationName = loc.name;
        }
      }

      if (newLocationId) {
        const bestStock = productStocks.sort((a, b) => b.qty - a.qty)[0];
        const maxAvailable = bestStock ? bestStock.qty : 1;
        const currentQty = lineToUpdate ? Number(lineToUpdate.qty || 1) : 1;
        const newQty = Math.min(currentQty, maxAvailable);
        newLines = newLines.map(l => l.id === lineId ? { ...l, fromLocationId: newLocationId, fromLocationName: newLocationName, qty: newQty } : l);
      }

      const isLast = newLines[newLines.length - 1].id === lineId;
      if (isLast) {
        newLines.push({ id: Date.now(), productId: '', qty: 1, fromLocationId: '' });
      }

      return newLines;
    });

    setPendingFocusQtyLineId(lineId);
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, lineId: number) => {
    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = lines.findIndex(l => l.id === lineId);
      if (currentIndex !== -1) {
        if (currentIndex + 1 < lines.length) {
          const nextLine = lines[currentIndex + 1];
          setPendingFocusProductLineId(nextLine.id);
        } else {
          const newLineId = Date.now();
          setLines(prev => [...prev, { id: newLineId, productId: '', qty: 1, fromLocationId: '' }]);
          setPendingFocusProductLineId(newLineId);
        }
      }
    }
  };

  const updateLine = (id: number, field: keyof LineItem, value: any) => {
    setLines(prevLines => {
      const lineToUpdate = prevLines.find(l => l.id === id);
      let actualValue = value;

      if (field === 'qty' && lineToUpdate && lineToUpdate.productId) {
        const val = Number(value);
        let maxQty = 0;
        const locId = lineToUpdate.fromLocationId && lineToUpdate.fromLocationId !== 'all'
          ? lineToUpdate.fromLocationId
          : (fromLocationId !== 'all' ? fromLocationId : null);

        if (locId && locId !== 'all') {
          const locStock = stocks.find(s => String(s.productId) === String(lineToUpdate.productId) && String(s.locationId) === String(locId));
          if (locStock) maxQty = locStock.qty;
        } else {
          maxQty = 0;
        }

        if (val > maxQty && locId && locId !== 'all') {
          setErrorMsg(`مخزون غير كافي. أقصى كمية متاحة للصرف هي ${maxQty}`);
          actualValue = maxQty;
        } else {
          setErrorMsg('');
        }
      }

      let newLines = prevLines.map(l => l.id === id ? { ...l, [field]: actualValue } : l);

      if (field === 'productId' && value) {
        const product = products.find(p => String(p.id) === String(value));
        if (product) {
          newLines = newLines.map(l => l.id === id ? { ...l, productName: product.name } : l);
        }

        const stocksList = Array.isArray(locationStocksQuery.data) ? locationStocksQuery.data : [];
        const productStocks = stocksList.filter(s => String(s.productId) === String(value) && s.qty > 0);

        let newLocationId = '';
        let newLocationName = '';

        if (fromLocationId === 'all') {
          const bestStock = productStocks.sort((a, b) => b.qty - a.qty)[0];
          if (bestStock) {
            newLocationId = String(bestStock.locationId);
            const loc = locationOptions.find(l => String(l.id) === newLocationId);
            if (loc) newLocationName = loc.name;
          }
        }

        if (newLocationId) {
          const bestStock = productStocks.sort((a, b) => b.qty - a.qty)[0];
          const maxAvailable = bestStock ? bestStock.qty : 1;
          const currentQty = lineToUpdate ? Number(lineToUpdate.qty || 1) : 1;
          const newQty = Math.min(currentQty, maxAvailable);
          newLines = newLines.map(l => l.id === id ? { ...l, fromLocationId: newLocationId, fromLocationName: newLocationName, qty: newQty } : l);
        }

        const isLast = newLines[newLines.length - 1].id === id;
        if (isLast) {
          newLines.push({ id: Date.now(), productId: '', qty: 1, fromLocationId: '' });
        }

        setPendingFocusQtyLineId(id);
      }

      if (field === 'fromLocationId' && value) {
        const loc = locationOptions.find(l => String(l.id) === String(value));
        if (loc) {
          const newLocationId = String(value);
          let maxQty = 0;
          if (newLocationId !== 'all') {
            const locStock = stocks.find(s => String(s.productId) === String(lineToUpdate?.productId) && String(s.locationId) === newLocationId);
            if (locStock) maxQty = locStock.qty;
          }

          const currentQty = Number(lineToUpdate?.qty || 1);
          let newQty = currentQty;

          if (lineToUpdate?.productId && currentQty > maxQty) {
            setErrorMsg(`مخزون غير كافي في هذا المخزن. أقصى كمية متاحة هي ${maxQty}`);
            newQty = maxQty;
          } else {
            setErrorMsg('');
          }

          newLines = newLines.map(l => l.id === id ? { ...l, fromLocationName: loc.name, qty: newQty } : l);
        }
      }

      return newLines;
    });
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!fromLocationId || !toLocationId) {
      setErrorMsg('يرجى تحديد مخزن الصرف والفرع المستلم');
      return;
    }
    const validLines = lines.filter(l => l.productId && l.qty > 0);
    if (validLines.length === 0) {
      setErrorMsg('يرجى إضافة صنف واحد على الأقل');
      return;
    }

    if (issueMode === 'transfer_to_branch_stock') {
      const branchLocs = locations.filter((l: any) => String(l.branchId) === String(toLocationId) && l.locationType === 'branch_stock');
      if (branchLocs.length === 0) {
        setErrorMsg('لا يوجد رصيد مخزون مرتبط بهذا الفرع. أنشئ رصيد فرع أولًا من أماكن المخزون.');
        return;
      }
    }

    const seenProducts = new Map<string, string>();
    for (const line of validLines) {
      if (seenProducts.has(line.productId!)) {
        setErrorMsg(`الصنف "${line.productName}" مكرر. يرجى دمجه في سطر واحد أو حذف المكرر.`);
        return;
      }
      seenProducts.set(line.productId!, String(line.id));
    }

    if (fromLocationId === 'all') {
      const missingLocations = validLines.some(l => !l.fromLocationId);
      if (missingLocations) {
        setErrorMsg('يرجى تحديد مخزن الصرف لكل الأصناف المضافة');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloadString = JSON.stringify({
        fromLocationId,
        toLocationId,
        recipientName,
        note,
        issueMode,
        lines: validLines.map(l => ({ productId: l.productId, qty: l.qty, locId: l.fromLocationId })),
      });
      if (!idempotencyKeyRef.current || currentPayloadRef.current !== payloadString) {
        idempotencyKeyRef.current = crypto.randomUUID();
        currentPayloadRef.current = payloadString;
      }

      const groupedLines = validLines.reduce((acc, line) => {
        const locId = fromLocationId === 'all' ? line.fromLocationId! : fromLocationId;
        if (!acc[locId]) acc[locId] = [];
        acc[locId].push(line);
        return acc;
      }, {} as Record<string, LineItem[]>);

      const successfulTransfers: any[] = [];
      const errors: string[] = [];

      const results = await Promise.allSettled(
        Object.entries(groupedLines).map(async ([locId, items], _idx) => {
          const idemKey = _idx === 0 ? idempotencyKeyRef.current! : `${idempotencyKeyRef.current!}-${_idx}`;

          return withIdempotency(
            (headers) => inventoryApi.createStockTransfer({
              fromLocationId: Number(locId),
              toBranchId: Number(toLocationId),
              recipientName,
              note,
              issueMode,
              items: items.map(l => ({
                productId: Number(l.productId),
                qty: Number(l.qty),
              })),
            }, headers),
            'createStockTransfer',
            idemKey,
            setIsPolling,
          );
        })
      );

      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          const res = r.value as any;
          if (res && res.ok && res.transferId) {
            const transfers = res.stockTransfers || [];
            const transfer = transfers.find((t: any) => String(t.id) === String(res.transferId));
            if (transfer) {
              successfulTransfers.push(transfer);
            } else {
              successfulTransfers.push({ id: res.transferId, docNo: `TR-${res.transferId}` });
            }
          }
        } else {
          errors.push(r.reason?.message || 'حدث خطأ أثناء اعتماد إذن الصرف');
        }
      });

      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-actions'] });

      if (errors.length > 0) {
        setErrorMsg(errors.join('\n'));
        if (successfulTransfers.length === 0) {
          setIsSubmitting(false);
          return;
        }
      }

      if (successfulTransfers.length > 0) {
        clearDraft();
        idempotencyKeyRef.current = null;
        currentPayloadRef.current = null;
        setCreatedTransfers(successfulTransfers);
      } else {
        clearDraft();
        idempotencyKeyRef.current = null;
        currentPayloadRef.current = null;
        navigate('/inventory');
      }
    } catch (error: any) {
      console.error(error);
      const isNetworkOrTimeout = error.message?.includes('network') || error.message?.includes('timeout') || error.message?.includes('Network') || error.name === 'TypeError';
      const is5xx = error.response?.status >= 500 && error.response?.status < 600;
      const isRecovery = error.message?.includes('Recovery polling');

      const msg = error?.message || 'تعذر تأكيد نتيجة العملية، يرجى مراجعة سجل العمليات.';
      setErrorMsg(msg);

      if (!isNetworkOrTimeout && !is5xx && !isRecovery) {
        idempotencyKeyRef.current = null;
        currentPayloadRef.current = null;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintA4 = () => {
    if (createdTransfers.length) {
      import('@/lib/inventory-printing').then(({ printMultipleTransfers }) => {
        printMultipleTransfers(createdTransfers, { pageSize: 'a4' });
      });
    }
  };

  const handlePrintReceipt = () => {
    if (createdTransfers.length) {
      import('@/lib/inventory-printing').then(({ printMultipleTransfers }) => {
        printMultipleTransfers(createdTransfers, { pageSize: 'receipt' });
      });
    }
  };

  const handleCameraScanForLine = async (scannedCode: string) => {
    if (cameraScanLineId !== null) {
      const opts = await fetchProductOptions(scannedCode);
      if (opts.length > 0) {
        handleSelectProduct(cameraScanLineId, opts[0]);
      } else {
        updateLine(cameraScanLineId, 'productName', scannedCode);
      }
    }
    setCameraScanLineId(null);
  };

  const resetForm = () => {
    clearDraft();
    setCreatedTransfers([]);
    setLines([{ id: Date.now(), productId: '', qty: 1, fromLocationId: '' }]);
    setToLocationId('');
    setToLocationQuery('');
    setRecipientName('');
    setNote('');
  };

  return {
    navigate,
    user,
    fromLocationId,
    setFromLocationId,
    fromLocationQuery,
    setFromLocationQuery,
    toLocationId,
    setToLocationId,
    toLocationQuery,
    setToLocationQuery,
    recipientName,
    setRecipientName,
    note,
    setNote,
    lines,
    isSubmitting,
    isPolling,
    errorMsg,
    cameraScanLineId,
    setCameraScanLineId,
    createdTransfers,
    setCreatedTransfers,
    issueMode,
    setIssueMode,
    isDraftRestored,
    clearDraft,
    handleClearDraft,
    dismissRestoredNotice,
    products,
    locationOptions,
    branchOptions,
    stocks,
    productOptions,
    fetchProductOptions,
    addLine,
    removeLine,
    handleSelectProduct,
    handleQtyKeyDown,
    updateLine,
    handleSubmit,
    handlePrintA4,
    handlePrintReceipt,
    handleCameraScanForLine,
    resetForm,
  };
}
