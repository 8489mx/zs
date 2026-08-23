import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { addonsApi } from '@/shared/api/addons.api';
import type { PosItem } from '@/features/pos/types/pos.types';

interface PosItemModifiersModalProps {
  open: boolean;
  onClose: () => void;
  item: PosItem | null;
  onSave: (modifiers: any[]) => void;
}

export function PosItemModifiersModal({ open, onClose, item, onSave }: PosItemModifiersModalProps) {
  const [modifiers, setModifiers] = useState<any[]>([]);

  let addons: any[] = [];
  let isLoading = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const addonsQuery = useQuery({
      queryKey: ['addons'],
      queryFn: addonsApi.list,
      enabled: open,
    });
    addons = addonsQuery.data || [];
    isLoading = addonsQuery.isLoading;
  } catch {}

  useEffect(() => {
    if (open && item) {
      setModifiers(item.modifiers ? [...item.modifiers] : []);
    }
  }, [open, item]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !item) return null;

  const activeAddons = addons.filter(a => a.isActive !== false);

  const handleToggleAddon = (addon: any) => {
    const existingIndex = modifiers.findIndex(m => String(m.productId) === String(addon.id) || String(m.name) === addon.name);
    
    if (existingIndex >= 0) {
      const next = [...modifiers];
      next[existingIndex].qty += 1;
      setModifiers(next);
    } else {
      setModifiers([...modifiers, { 
        productId: addon.id, 
        name: addon.name, 
        qty: 1,
        price: Number(addon.price || 0),
        costPrice: Number(addon.costPrice || 0)
      }]);
    }
  };

  const handleDecreaseAddon = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const next = [...modifiers];
    if (next[index].qty > 1) {
      next[index].qty -= 1;
      setModifiers(next);
    } else {
      next.splice(index, 1);
      setModifiers(next);
    }
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
          width: '650px', 
          maxWidth: '95vw',
          maxHeight: '90vh',
          borderRadius: 16,
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          flexShrink: 0
        }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>إضافات: {item.name}</h2>
        </header>

        <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>جاري تحميل الإضافات...</div>
          ) : activeAddons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              لا توجد إضافات معرفة في النظام
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
              {activeAddons.map((addon) => {
                const modIndex = modifiers.findIndex(m => String(m.productId) === String(addon.id) || String(m.name) === addon.name);
                const isSelected = modIndex >= 0;
                const qty = isSelected ? modifiers[modIndex].qty : 0;

                return (
                  <div 
                    key={addon.id}
                    onClick={() => handleToggleAddon(addon)}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '12px', 
                      border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '10px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      userSelect: 'none',
                      boxShadow: isSelected ? '0 4px 6px -1px rgba(59, 130, 246, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      transform: isSelected ? 'translateY(-2px)' : 'none'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#94a3b8';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.transform = 'none';
                      }
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem', lineHeight: 1.2 }}>{addon.name}</span>
                    <span style={{ color: '#475569', fontSize: '0.95rem', fontWeight: 500 }}>{addon.price} ج</span>
                    
                    {isSelected && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '-10px', 
                        right: '-10px', 
                        background: '#170c5c', 
                        color: 'white', 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
                      }}>
                        {qty}
                      </div>
                    )}

                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => handleDecreaseAddon(e, modIndex)}
                        style={{
                          marginTop: '6px',
                          background: '#dbeafe',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          width: '100%',
                          padding: '6px',
                          cursor: 'pointer',
                          color: '#1e40af',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                          fontSize: '0.9rem'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#bfdbfe'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#dbeafe'}
                      >
                        إزالة / تقليل
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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

