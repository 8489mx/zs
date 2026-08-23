import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { SearchIcon, XCircleIcon, ShieldCheckIcon } from '@/shared/components/icons/AppIcons';
import { productSerialsApi, type ProductSerialItem } from '../api/product-serials.api';

interface SerialLookupModalProps {
  open: boolean;
  onClose: () => void;
}

export function SerialLookupModal({ open, onClose }: SerialLookupModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ProductSerialItem | null | 'not_found'>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    setIsSearching(true);
    setErrorMsg(null);
    try {
      const item = await productSerialsApi.lookup(query);
      setResult(item || 'not_found');
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر البحث عن رقم السيريال');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClose = () => {
    setSearchInput('');
    setResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <DialogShell open={open} onClose={handleClose} ariaLabel="فحص واستعلام عن السيريال والـ IMEI والضمان">
      <div className="page-stack" dir="rtl" style={{ gap: '16px', minWidth: '320px', maxWidth: '560px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SearchIcon size={20} color="#2563eb" /> فحص واستعلام عن السيريال والـ IMEI والضمان
        </h3>
        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            dir="ltr"
            autoFocus
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="امسح الباركود أو اكتب السيريال / الـ IMEI..."
            style={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: '1rem',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
            }}
          />
          <Button type="submit" variant="primary" disabled={isSearching || !searchInput.trim()}>
            {isSearching ? 'جارٍ الفحص...' : 'فحص الجهاز'}
          </Button>
        </form>

        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Not Found */}
        {result === 'not_found' && (
          <div style={{ padding: '24px', textAlign: 'center', background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}><XCircleIcon size={36} color="#ef4444" /></div>
            <strong style={{ color: '#be123c', display: 'block', fontSize: '1.05rem' }}>رقم السيريال / الـ IMEI غير مسجل في النظام</strong>
            <p style={{ color: '#9f1239', fontSize: '0.85rem', margin: '4px 0 0' }}>
              تأكد من صحة الرقم المكتوب أو مسح الباركود بشكل دقيق.
            </p>
          </div>
        )}

        {/* Found Result Card */}
        {result && result !== 'not_found' && (
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {/* Header / Product */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>الصنف / الموديل:</div>
              <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{result.productName || 'جهاز بدون اسم'}</strong>
              <div style={{ fontFamily: 'monospace', color: '#475569', fontSize: '0.9rem', marginTop: '4px', direction: 'ltr', textAlign: 'right' }}>
                IMEI / Serial: <strong>{result.serialNumber}</strong>
                {result.imei2 ? <span style={{ marginInlineStart: '12px', color: '#64748b' }}>IMEI 2: {result.imei2}</span> : null}
              </div>
            </div>

            {/* Status & Location Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>حالة الجهاز: </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: result.status === 'in_stock' ? '#dcfce7' : result.status === 'sold' ? '#dbeafe' : '#fef3c7',
                    color: result.status === 'in_stock' ? '#166534' : result.status === 'sold' ? '#1e40af' : '#92400e',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: result.status === 'in_stock' ? '#16a34a' : result.status === 'sold' ? '#2563eb' : '#d97706' }} />
                  {result.status === 'in_stock' ? 'متاح بالمخزن' : result.status === 'sold' ? 'تم البيع' : result.status === 'returned' ? 'مرتجع' : result.status}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748b' }}>الفرع والموقع: </span>
                <strong>{result.locationName || result.branchName || '—'}</strong>
              </div>

              {result.saleDocNo && (
                <div>
                  <span style={{ color: '#64748b' }}>فاتورة البيع: </span>
                  <strong>{result.saleDocNo}</strong>
                </div>
              )}

              {result.customerName && (
                <div>
                  <span style={{ color: '#64748b' }}>العميل: </span>
                  <strong>{result.customerName} {result.customerPhone ? `(${result.customerPhone})` : ''}</strong>
                </div>
              )}

              {result.purchaseDocNo && (
                <div>
                  <span style={{ color: '#64748b' }}>فاتورة الشراء: </span>
                  <strong>{result.purchaseDocNo}</strong>
                </div>
              )}

              {result.supplierName && (
                <div>
                  <span style={{ color: '#64748b' }}>المورد: </span>
                  <strong>{result.supplierName}</strong>
                </div>
              )}

              {result.warrantyEndDate && (
                <div style={{ gridColumn: 'span 2', background: '#fef3c7', padding: '8px 12px', borderRadius: '6px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheckIcon size={16} color="#d97706" /> <strong>فترة الضمان سارية حتى:</strong> {new Date(result.warrantyEndDate).toLocaleDateString('ar-EG')}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={handleClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
