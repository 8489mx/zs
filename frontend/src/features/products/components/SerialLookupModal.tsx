import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { AppIcons } from '@/shared/components/icons/AppIcons';
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
    <StandardDialog
      open={open}
      onClose={handleClose}
      title="فحص واستعلام السيريال والـ IMEI والضمان"
      subtitle="التحقق من بيانات الأجهزة وحالة البيع والضمان وتاريخ الفاتورة"
      maxWidth="620px"
      footerActions={
        <StandardDialogFooter
          cancelText="إغلاق"
          onCancel={handleClose}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir="rtl">
        {/* 1. مسح وفحص السيريال */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Search size={15} />
            <span>1. مسح وفحص السيريال (Serial & IMEI Lookup)</span>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              dir="ltr"
              autoFocus
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="امسح الباركود أو اكتب السيريال / IMEI..."
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: '0.95rem',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
            <Button type="submit" variant="primary" disabled={isSearching || !searchInput.trim()} style={{ whiteSpace: 'nowrap' }}>
              {isSearching ? 'جارٍ الفحص...' : 'فحص الجهاز'}
            </Button>
          </form>

          {errorMsg && (
            <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.82rem' }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Not Found */}
        {result === 'not_found' && (
          <div style={{ padding: '20px', textAlign: 'center', background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
              <AppIcons.XCircle size={32} color="#ef4444" />
            </div>
            <strong style={{ color: '#be123c', display: 'block', fontSize: '0.98rem' }}>رقم السيريال / الـ IMEI غير مسجل في النظام</strong>
            <p style={{ color: '#9f1239', fontSize: '0.8rem', margin: '4px 0 0' }}>
              تأكد من صحة الرقم المكتوب أو مسح الباركود بشكل دقيق.
            </p>
          </div>
        )}

        {/* Found Result Card */}
        {result && result !== 'not_found' && (
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.ShieldCheck size={15} />
              <span>2. تفاصيل الجهاز وسجل الضمان (Device Details & Warranty)</span>
            </div>

            <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>الصنف / الموديل:</div>
                <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{result.productName || 'جهاز بدون اسم'}</strong>
                <div style={{ fontFamily: 'monospace', color: '#475569', fontSize: '0.85rem', marginTop: '3px', direction: 'ltr', textAlign: 'right' }}>
                  IMEI / Serial: <strong>{result.serialNumber}</strong>
                  {result.imei2 ? <span style={{ marginInlineStart: '12px', color: '#64748b' }}>IMEI 2: {result.imei2}</span> : null}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>حالة الجهاز: </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: result.status === 'in_stock' ? '#dcfce7' : result.status === 'sold' ? '#dbeafe' : '#fef3c7',
                      color: result.status === 'in_stock' ? '#166534' : result.status === 'sold' ? '#1e40af' : '#92400e',
                    }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: result.status === 'in_stock' ? '#16a34a' : result.status === 'sold' ? '#2563eb' : '#d97706' }} />
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
                  <div style={{ gridColumn: 'span 2', background: '#fef3c7', padding: '8px 10px', borderRadius: '6px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', marginTop: '4px' }}>
                    <AppIcons.ShieldCheck size={15} color="#d97706" />
                    <strong>فترة الضمان سارية حتى:</strong> {new Date(result.warrantyEndDate).toLocaleDateString('ar-EG')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
