import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { PosItem } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';

interface PosItemModifiersModalProps {
  open: boolean;
  onClose: () => void;
  item: PosItem | null;
  products: Product[];
  onSave: (modifiers: any[]) => void;
}

export function PosItemModifiersModal({ open, onClose, item, products, onSave }: PosItemModifiersModalProps) {
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  useEffect(() => {
    if (open && item) {
      setModifiers(item.modifiers ? [...item.modifiers] : []);
      setSearchQuery('');
      setNewItemQty(1);
      setSelectedProductId('');
    }
  }, [open, item]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return products.filter(p => 
      p.name?.toLowerCase().includes(query) || 
      p.barcode?.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [searchQuery, products]);

  if (!open || !item) return null;

  const handleAdd = () => {
    const product = products.find(p => String(p.id) === selectedProductId);
    if (!product) return;
    
    const name = product.name || '';
    const existingIndex = modifiers.findIndex(m => String(m.productId) === String(product.id));
    
    if (existingIndex >= 0) {
      const next = [...modifiers];
      next[existingIndex].qty += newItemQty;
      setModifiers(next);
    } else {
      setModifiers([...modifiers, { 
        productId: product.id, 
        name, 
        qty: newItemQty,
        price: Number(product.retailPrice || 0),
        costPrice: Number((product as any).costPrice || 0)
      }]);
    }
    
    setSearchQuery('');
    setSelectedProductId('');
    setNewItemQty(1);
  };

  const handleRemove = (index: number) => {
    const next = [...modifiers];
    next.splice(index, 1);
    setModifiers(next);
  };

  const handleSave = () => {
    onSave(modifiers);
    onClose();
  };

  return createPortal(
    <div 
      className="modal-backdrop" 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.36)'
      }}
    >
      <div 
        className="modal-surface" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: '500px', 
          maxWidth: '95vw',
          maxHeight: 'calc(100vh - 32px)',
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 28px 70px rgba(15, 23, 42, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        dir="rtl"
      >
        <header style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>إضافات: {item.name}</h2>
          <button 
            type="button" 
            onClick={onClose} 
            aria-label="إغلاق"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              color: '#64748b',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </header>

        <div className="modal-body" style={{ padding: '20px', overflowY: 'visible', flex: 1 }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', position: 'relative' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="ابحث عن الإضافة (اسم أو باركود)..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedProductId('');
                }}
                style={{ width: '100%', height: '42px' }}
              />
              {filteredProducts.length > 0 && !selectedProductId && (
                <ul style={{ 
                  display: 'block', 
                  position: 'absolute', 
                  top: 'calc(100% + 4px)', 
                  left: 0, 
                  right: 0, 
                  zIndex: 50, 
                  maxHeight: '220px', 
                  overflowY: 'auto', 
                  background: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  padding: '4px', 
                  margin: 0, 
                  listStyle: 'none',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                  {filteredProducts.map((p, idx) => (
                    <li 
                      key={p.id} 
                      onClick={() => {
                        setSelectedProductId(String(p.id));
                        setSearchQuery(p.name || '');
                      }}
                      style={{ 
                        padding: '10px 14px', 
                        cursor: 'pointer', 
                        borderRadius: '6px',
                        background: idx % 2 === 0 ? 'transparent' : '#f8fafc',
                        borderBottom: idx === filteredProducts.length - 1 ? 'none' : '1px solid #f1f5f9',
                        fontWeight: 600,
                        color: '#1e293b'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#e0e7ff'}
                      onMouseOut={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : '#f8fafc'}
                    >
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input 
              type="number" 
              className="form-input" 
              value={newItemQty}
              onChange={(e) => setNewItemQty(Number(e.target.value) || 1)}
              min={1}
              style={{ width: '70px', textAlign: 'center', height: '42px', fontWeight: 'bold' }}
            />
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleAdd}

              disabled={!selectedProductId}
            >
              إضافة
            </button>
          </div>

          <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
            {modifiers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                لا توجد إضافات مرتبطة بهذا الصنف
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
                {modifiers.map((mod, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{mod.name}</span>
                      {mod.qty > 1 && <span style={{ fontSize: '0.85em', color: '#475569', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>الكمية: {mod.qty}</span>}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemove(i)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', padding: '0 8px', lineHeight: 1 }}
                      title="حذف"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-primary" onClick={handleSave} style={{ flex: 1, height: '44px', fontSize: '15px' }}>
            تأكيد وحفظ الإضافات
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ height: '44px', fontSize: '15px' }}>
            إلغاء
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
