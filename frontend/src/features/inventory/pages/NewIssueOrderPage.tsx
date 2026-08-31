import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { AsyncSearchableCombobox } from '@/shared/ui/async-searchable-combobox';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import { useAuthStore } from '@/stores/auth-store';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { withIdempotency } from '@/lib/idempotency';
import { referenceDataApi } from '@/services/reference-data.api';
import { queryKeys } from '@/app/query-keys';
import { useAppToolbar } from '@/stores/toolbar-store';

type LineItem = {
  id: number;
  productId: string;
  productName?: string;
  qty: number;
  fromLocationId?: string;
  fromLocationName?: string;
};

export function NewIssueOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { productsQuery, locationsQuery, branchesQuery, locationStocksQuery } = useInventoryActionCatalog();

  useAppToolbar([
    { label: 'المخزون', to: '/inventory' },
    { label: 'إذن صرف جديد' }
  ]);

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

  const idempotencyKeyRef = useRef<string | null>(null);
  const currentPayloadRef = useRef<string | null>(null);

  const [issueMode, setIssueMode] = useState<'final_issue' | 'transfer_to_branch_stock'>('final_issue');

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
        searchTerms: [p.name, p.barcode || ''].filter(Boolean).join(' ').toLowerCase()
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
          searchTerms: [p.name, p.barcode].filter(Boolean).join(' ').toLowerCase()
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
      searchTerms: l.name.toLowerCase()
    }))
  ];

  const branchOptions = branches.map((b) => ({
    id: String(b.id),
    name: b.name,
    searchTerms: b.name.toLowerCase()
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
          maxQty = 0; // Require exact location for checking max qty accurately
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
          } else {
             maxQty = 0;
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

  const [createdTransfers, setCreatedTransfers] = useState<any[]>([]);

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
        lines: validLines.map(l => ({ productId: l.productId, qty: l.qty, locId: l.fromLocationId }))
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
                qty: Number(l.qty)
              }))
            }, headers),
            'createStockTransfer',
            idemKey,
            setIsPolling
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
        idempotencyKeyRef.current = null;
        currentPayloadRef.current = null;
        setCreatedTransfers(successfulTransfers);
      } else {
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

  const handleCloseDialog = () => {
    setCreatedTransfers([]);
    navigate('/inventory');
  };

  const handleNewTransfer = () => {
    setCreatedTransfers([]);
    setLines([{ id: Date.now(), productId: '', qty: 1, fromLocationId: '' }]);
    setToLocationId('');
    setRecipientName('');
    setNote('');
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      {createdTransfers.length > 0 && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h2 className="text-xl font-bold text-emerald-600 mb-4">تم إنشاء إذن الصرف بنجاح</h2>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600" style={{ margin: '0 auto' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              تم إنشاء {createdTransfers.length > 1 ? 'الأذونات بنجاح' : `الإذن رقم ${createdTransfers[0].docNo || createdTransfers[0].id}`}
            </p>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={handlePrintReceipt} className="w-full justify-center">
                طباعة ريسيت (Thermal)
              </Button>
              <Button type="button" variant="secondary" onClick={handlePrintA4} className="w-full justify-center">
                طباعة وثيقة (A4)
              </Button>
              <Button type="button" variant="secondary" onClick={handleNewTransfer} className="w-full justify-center">
                إذن صرف جديد
              </Button>
              <button type="button" onClick={handleCloseDialog} className="btn w-full justify-center mt-2 bg-transparent text-gray-600 hover:bg-gray-100 border-none shadow-none" style={{ marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                العودة للمخزون
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader
          title="إذن صرف جديد"
          onBack={() => navigate('/inventory')}
          badge={<span className="document-prototype-status-badge is-draft">مسودة</span>}
          actions={
            <div className="document-prototype-topbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="secondary"
                type="button"
                className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary"
                onClick={() => navigate('/inventory')}
                style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <span aria-hidden="true" className="purchase-prototype-save-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </span>
                <span>إلغاء المسودة</span>
              </Button>

              <Button
                type="button"
                className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary"
                onClick={handleSubmit}
                disabled={isSubmitting || !!createdTransfers.length}
              >
                <span>{isPolling ? 'جارٍ تأكيد العملية...' : isSubmitting ? 'جارٍ الحفظ...' : 'اعتماد إذن الصرف'}</span>
              </Button>
            </div>
          }
        />
        {errorMsg && (
          <div style={{ padding: '0 24px', marginTop: '16px', marginBottom: '-8px' }}>
            <div role="alert" aria-live="polite" style={{
              background: 'rgba(248, 113, 113, 0.08)',
              border: '1px solid rgba(248, 113, 113, 0.18)',
              color: '#b91c1c',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.5rem 0.75rem',
              width: '100%'
            }}>
              {errorMsg}
            </div>
          </div>
        )}
        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">المعلومات الأساسية</h3>
          <div className="document-prototype-grid compact-grid-3">
            <SearchableCombobox
              label="من مخزن (مخزن الصرف)"
              placeholder="اختر المخزن..."
              value={fromLocationQuery}
              onChange={(q) => {
                setFromLocationQuery(q);
                if (!q) setFromLocationId('');
              }}
              onSelect={(l) => setFromLocationId(l.id)}
              options={locationOptions}
              search={(l, q) => l.searchTerms.includes(q.toLowerCase())}
              getLabel={(l) => l.name}
              createLabel={(q) => `إضافة "${q}"`}
              inputClassName="purchase-prototype-field-input"
            />

            <SearchableCombobox
              label="إلى فرع / محل (المستلم)"
              placeholder="اختر الفرع..."
              value={toLocationQuery}
              onChange={(q) => {
                setToLocationQuery(q);
                if (!q) setToLocationId('');
              }}
              onSelect={(l) => setToLocationId(l.id)}
              options={branchOptions}
              search={(l, q) => l.searchTerms.includes(q.toLowerCase())}
              getLabel={(l) => l.name}
              createLabel={(q) => `إضافة "${q}"`}
              inputClassName="purchase-prototype-field-input"
            />

            <div className="field">
              <label>وضع الصرف</label>
              <select className="purchase-prototype-field-input" value={issueMode} onChange={(e) => setIssueMode(e.target.value as any)}>
                <option value="final_issue">صرف نهائي (يتم خصم الرصيد فوراً)</option>
                <option value="transfer_to_branch_stock">تحويل إلى رصيد فرع (يبقى في الطريق حتى يتم استلامه)</option>
              </select>
            </div>

            <Field label="مسئول الصرف">
              <input
                type="text"
                className="purchase-prototype-field-input purchase-prototype-readonly-input"
                value={user?.displayName || user?.username || ''}
                readOnly
                disabled
              />
            </Field>

            <Field label="اسم المستلم / السائق">
              <input
                type="text"
                className="purchase-prototype-field-input"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="اكتب اسم المستلم هنا..."
              />
            </Field>
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">الأصناف</h3>
          <div className="document-prototype-grid">
            {/* Desktop Table View */}
            <div className="purchase-prototype-desktop-table">
              <div className="purchase-prototype-items-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table className="purchase-prototype-items-table" style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead style={{ backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600, width: '280px' }}>الصنف (بحث بالاسم أو الباركود)</th>
                      {fromLocationId === 'all' && (
                        <th style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600, width: '180px' }}>مخزن الصرف</th>
                      )}
                      <th style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600, width: '130px' }}>الكمية المتاحة (بالمخزن)</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600, width: '120px' }}>الكمية المصروفة</th>
                      <th style={{ padding: '10px 14px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const product = products.find(p => String(p.id) === line.productId);
                      let availableStock = '-';

                      if (product) {
                        const stocks = Array.isArray(locationStocksQuery.data) ? locationStocksQuery.data : [];
                        const locId = fromLocationId === 'all' ? line.fromLocationId : fromLocationId;

                        if (locId && locId !== 'all') {
                          const locStock = stocks.find(s => String(s.productId) === String(line.productId) && String(s.locationId) === String(locId));
                          if (locStock) {
                            const remaining = Math.max(0, locStock.qty - (line.qty || 0));
                            availableStock = String(remaining);
                          } else {
                            availableStock = '0';
                          }
                        } else {
                          const totalStock = stocks.filter(s => String(s.productId) === String(line.productId)).reduce((acc, s) => acc + s.qty, 0);
                          availableStock = String(Math.max(0, totalStock - (line.qty || 0)));
                        }
                      }

                      return (
                        <tr key={line.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 16px' }}>
                            <AsyncSearchableCombobox
                              inputId={`product-input-${line.id}`}
                              defaultOptions={productOptions}
                              value={line.productName || ''}
                              onChange={(v) => updateLine(line.id, 'productName', v)}
                              onSelect={(p) => handleSelectProduct(line.id, p)}
                              getLabel={(p) => p.name}
                              fetchOptions={fetchProductOptions}
                              createLabel={(q) => `إضافة "${q}"`}
                              placeholder="بحث عن صنف..."
                              inline={true}
                              inputClassName="purchase-prototype-field-input"
                            />
                          </td>
                          {fromLocationId === 'all' && (
                            <td style={{ padding: '8px 16px' }}>
                              <SearchableCombobox
                                options={locationOptions.filter(l => l.id !== 'all')}
                                value={line.fromLocationName || ''}
                                onChange={(v) => updateLine(line.id, 'fromLocationName', v)}
                                onSelect={(l) => updateLine(line.id, 'fromLocationId', l.id)}
                                getLabel={(l) => l.name}
                                search={(l, q) => l.searchTerms.includes(q.toLowerCase())}
                                createLabel={(q) => `إضافة "${q}"`}
                                placeholder="اختر المخزن..."
                                inline={true}
                                inputClassName="purchase-prototype-field-input"
                              />
                            </td>
                          )}
                          <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                            {availableStock}
                          </td>
                          <td style={{ padding: '8px 16px' }}>
                            <input
                              id={`quantity-input-${line.id}`}
                              type="number"
                              className="purchase-prototype-field-input"
                              min="0.001"
                              step="any"
                              value={line.qty}
                              onChange={(e) => updateLine(line.id, 'qty', e.target.value ? Number(e.target.value) : '')}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => handleQtyKeyDown(e, line.id)}
                              style={{ height: '36px' }}
                            />
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              disabled={lines.length === 1 && !line.productId}
                              style={{
                                color: 'var(--danger-color)',
                                background: 'none',
                                border: 'none',
                                cursor: (lines.length === 1 && !line.productId) ? 'not-allowed' : 'pointer',
                                padding: '8px',
                                opacity: (lines.length === 1 && !line.productId) ? 0.5 : 1
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Smart Item Cards */}
            <div className="purchase-prototype-mobile-cards">
              {lines.map((line, index) => {
                const product = products.find(p => String(p.id) === line.productId);
                let availableStock = '-';

                if (product) {
                  const stocks = Array.isArray(locationStocksQuery.data) ? locationStocksQuery.data : [];
                  const locId = fromLocationId === 'all' ? line.fromLocationId : fromLocationId;

                  if (locId && locId !== 'all') {
                    const locStock = stocks.find(s => String(s.productId) === String(line.productId) && String(s.locationId) === String(locId));
                    if (locStock) {
                      const remaining = Math.max(0, locStock.qty - (line.qty || 0));
                      availableStock = String(remaining);
                    } else {
                      availableStock = '0';
                    }
                  } else {
                    const totalStock = stocks.filter(s => String(s.productId) === String(line.productId)).reduce((acc, s) => acc + s.qty, 0);
                    availableStock = String(Math.max(0, totalStock - (line.qty || 0)));
                  }
                }

                return (
                  <div key={line.id} className="purchase-prototype-item-card">
                    <div className="item-card-header">
                      <div className="item-card-badge">
                        <span className="item-card-num">بند #{index + 1}</span>
                        {line.productId && (
                          <span className={`item-card-stock-pill ${availableStock === '0' ? 'stock-zero' : 'stock-ok'}`}>
                            الرصيد المتاح: {availableStock}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="item-card-delete-btn"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1 && !line.productId}
                        title="حذف البند"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>

                    <div className="item-card-field">
                      <Field label="الصنف (بحث بالاسم أو الباركود)">
                        <AsyncSearchableCombobox
                          inputId={`product-input-mobile-${line.id}`}
                          defaultOptions={productOptions}
                          value={line.productName || ''}
                          onChange={(v) => updateLine(line.id, 'productName', v)}
                          onSelect={(p) => handleSelectProduct(line.id, p)}
                          getLabel={(p) => p.name}
                          fetchOptions={fetchProductOptions}
                          createLabel={(q) => `إضافة "${q}"`}
                          placeholder="ابحث عن صنف أو امسح باركود..."
                          inline={true}
                          inputClassName="purchase-prototype-field-input"
                        />
                      </Field>
                    </div>

                    <div className="item-card-row">
                      {fromLocationId === 'all' && (
                        <div className="item-card-field">
                          <Field label="مخزن الصرف">
                            <SearchableCombobox
                              options={locationOptions.filter(l => l.id !== 'all')}
                              value={line.fromLocationName || ''}
                              onChange={(v) => updateLine(line.id, 'fromLocationName', v)}
                              onSelect={(l) => updateLine(line.id, 'fromLocationId', l.id)}
                              getLabel={(l) => l.name}
                              search={(l, q) => l.searchTerms.includes(q.toLowerCase())}
                              createLabel={(q) => `إضافة "${q}"`}
                              placeholder="اختر المخزن..."
                              inline={true}
                              inputClassName="purchase-prototype-field-input"
                            />
                          </Field>
                        </div>
                      )}

                      <div className="item-card-field">
                        <Field label="الكمية المصروفة">
                          <input
                            id={`quantity-input-mobile-${line.id}`}
                            type="number"
                            className="purchase-prototype-field-input"
                            min="0.001"
                            step="any"
                            value={line.qty}
                            onChange={(e) => updateLine(line.id, 'qty', e.target.value ? Number(e.target.value) : '')}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => handleQtyKeyDown(e, line.id)}
                            style={{ height: '38px', minHeight: '38px', fontSize: '15px', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="purchase-prototype-add-line-btn"
                onClick={addLine}
                style={{
                  color: 'var(--primary-color)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>+</span> إضافة صنف جديد
              </button>
            </div>
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">ملاحظات</h3>
          <div className="document-prototype-grid">
            <textarea
              className="purchase-prototype-field-input"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="أي ملاحظات إضافية على إذن الصرف..."
              style={{ minHeight: '100px', resize: 'vertical', width: '100%' }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
