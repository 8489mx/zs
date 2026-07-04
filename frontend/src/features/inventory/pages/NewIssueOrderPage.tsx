import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { AsyncSearchableCombobox } from '@/shared/ui/async-searchable-combobox';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import { useAuthStore } from '@/stores/auth-store';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
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
  const [errorMsg, setErrorMsg] = useState('');

  const products = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const locations = Array.isArray(locationsQuery.data) ? locationsQuery.data : [];
  const branches = Array.isArray(branchesQuery.data) ? branchesQuery.data : [];
  const stocks = Array.isArray(locationStocksQuery.data) ? locationStocksQuery.data : [];
  
  const productOptions = products
    .filter(p => {
      if (fromLocationId === 'all') {
        return stocks.some(s => String(s.productId) === String(p.id) && s.qty > 0);
      }
      const productStock = stocks.find(s => String(s.productId) === String(p.id) && String(s.locationId) === String(fromLocationId));
      return productStock && productStock.qty > 0;
    })
    .map((p) => ({
      id: String(p.id),
      name: p.name,
      code: p.barcode || '',
      searchTerms: [p.name, p.barcode || ''].filter(Boolean).join(' ').toLowerCase()
    }));

  const fetchProductOptions = async (query: string) => {
    try {
      const results = await inventoryApi.searchProducts(query);
      return results
        .filter(p => {
          if (fromLocationId === 'all') {
            return stocks.some(s => String(s.productId) === String(p.id) && s.qty > 0);
          }
          const productStock = stocks.find(s => String(s.productId) === String(p.id) && String(s.locationId) === String(fromLocationId));
          return productStock && productStock.qty > 0;
        })
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
    ...locations.map((l) => ({
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

  const addLine = () => setLines([...lines, { id: Date.now(), productId: '', qty: 1, fromLocationId: '' }]);
  
  const removeLine = (id: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter(l => l.id !== id));
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
          
        if (locId) {
          const locStock = stocks.find(s => String(s.productId) === String(lineToUpdate.productId) && String(s.locationId) === String(locId));
          if (locStock) maxQty = locStock.qty;
        } else {
          maxQty = stocks.filter(s => String(s.productId) === String(lineToUpdate.productId)).reduce((acc, s) => acc + s.qty, 0);
        }

        if (val > maxQty) {
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

        const stocks = Array.isArray(locationStocksQuery.data) ? locationStocksQuery.data : [];
        const productStocks = stocks.filter(s => String(s.productId) === String(value) && s.qty > 0);
        
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
             maxQty = stocks.filter(s => String(s.productId) === String(lineToUpdate?.productId)).reduce((acc, s) => acc + s.qty, 0);
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

    if (fromLocationId === 'all') {
      const missingLocations = validLines.some(l => !l.fromLocationId);
      if (missingLocations) {
        setErrorMsg('يرجى تحديد مخزن الصرف لكل الأصناف المضافة');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const groupedLines = validLines.reduce((acc, line) => {
        const locId = fromLocationId === 'all' ? line.fromLocationId! : fromLocationId;
        if (!acc[locId]) acc[locId] = [];
        acc[locId].push(line);
        return acc;
      }, {} as Record<string, LineItem[]>);

      const successfulTransfers: any[] = [];

      const results = await Promise.allSettled(
        Object.entries(groupedLines).map(async ([locId, items]) => {
          const res = await inventoryApi.createStockTransfer({
            fromLocationId: Number(locId),
            toBranchId: Number(toLocationId),
            recipientName,
            note,
            items: items.map(l => ({
              productId: Number(l.productId),
              qty: Number(l.qty)
            }))
          }) as any;
          
          if (res && res.ok && res.transferId) {
            await inventoryApi.receiveStockTransfer(res.transferId);
            const transfers = res.stockTransfers || [];
            const transfer = transfers.find((t: any) => String(t.id) === String(res.transferId));
            if (transfer) {
              successfulTransfers.push(transfer);
            } else {
              // fallback if not found in list for some reason
              successfulTransfers.push({ id: res.transferId, docNo: `TR-${res.transferId}` });
            }
          }
        })
      );
      
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason?.message || 'حدث خطأ أثناء اعتماد إذن الصرف');

      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-actions'] });
      
      if (errors.length > 0) {
        setErrorMsg(errors.join('\\n'));
        if (successfulTransfers.length === 0) {
          setIsSubmitting(false);
          return;
        }
      }

      if (successfulTransfers.length > 0) {
        setCreatedTransfers(successfulTransfers);
      } else {
        navigate('/inventory'); 
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || 'حدث خطأ أثناء اعتماد إذن الصرف';
      setErrorMsg(msg);
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
    <div className="page-shell document-prototype-shell purchase-new-prototype" dir="rtl">
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
      <div className="purchase-prototype-sticky-stack">
        <div className="purchase-prototype-document-surface">
          <div className="document-prototype-topbar">
            <div className="document-prototype-topbar-right">
              <button type="button" className="document-prototype-back-link" aria-label="رجوع" onClick={() => navigate('/inventory')}>&larr;</button>
              <h1>إذن صرف جديد</h1>
              <span className="document-prototype-status-badge is-draft">مسودة</span>
            </div>
            
            <div className="document-prototype-topbar-actions">
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
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'جاري الاعتماد...' : 'اعتماد إذن الصرف'}</span>
              </Button>
              
              {errorMsg && (
                <div className="purchase-prototype-inline-message is-error" role="alert" aria-live="polite">
                  {errorMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="document-prototype-column">
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
            <div className="purchase-prototype-items-table-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table className="purchase-prototype-items-table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500, width: fromLocationId === 'all' ? '30%' : '40%' }}>الصنف (بحث بالاسم أو الباركود)</th>
                    {fromLocationId === 'all' && (
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500, width: '20%' }}>مخزن الصرف</th>
                    )}
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500, width: '20%' }}>الكمية المتاحة (بالمخزن)</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500, width: '20%' }}>الكمية المصروفة</th>
                    <th style={{ padding: '12px 16px', width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody style={{ }}>
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
                            defaultOptions={productOptions}
                            value={line.productName || ''}
                            onChange={(v) => updateLine(line.id, 'productName', v)}
                            onSelect={(p) => updateLine(line.id, 'productId', p.id)}
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
                            type="number"
                            className="purchase-prototype-field-input"
                            min="0.001"
                            step="any"
                            value={line.qty}
                            onChange={(e) => updateLine(line.id, 'qty', e.target.value ? Number(e.target.value) : '')}
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
            
            <div style={{ marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={addLine}
                style={{ 
                  color: 'var(--primary-color)', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
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
