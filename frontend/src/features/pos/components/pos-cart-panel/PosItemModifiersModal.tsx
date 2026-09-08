import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { addonsApi, type ModifierGroup } from '@/shared/api/addons.api';
import type { PosItem } from '@/features/pos/types/pos.types';
import { XIcon, CheckIcon, AlertCircleIcon, LayersIcon } from '@/shared/components/icons/AppIcons';

interface PosItemModifiersModalProps {
  open: boolean;
  onClose: () => void;
  item: PosItem | null;
  onSave: (modifiers: any[]) => void;
}

export function PosItemModifiersModal({ open, onClose, item, onSave }: PosItemModifiersModalProps) {
  const [selectedModifiers, setSelectedModifiers] = useState<any[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const productId = item?.productId ? Number(item.productId) : null;

  // 1. Fetch product-specific modifier groups
  const productGroupsQuery = useQuery({
    queryKey: ['product-modifier-groups', productId],
    queryFn: () => (productId ? addonsApi.getProductModifiers(productId) : Promise.resolve([])),
    enabled: open && !!productId,
  });

  // 2. Fetch all modifier groups as fallback
  const allGroupsQuery = useQuery({
    queryKey: ['all-modifier-groups'],
    queryFn: addonsApi.listModifierGroups,
    enabled: open,
  });

  // 3. Fetch flat legacy addons as fallback
  const addonsQuery = useQuery({
    queryKey: ['addons'],
    queryFn: addonsApi.list,
    enabled: open,
  });

  // Determine active groups or flat addons
  const activeGroups: ModifierGroup[] = useMemo(() => {
    if (productGroupsQuery.data && productGroupsQuery.data.length > 0) {
      return productGroupsQuery.data.filter(g => g.isActive !== false);
    }
    if (allGroupsQuery.data && allGroupsQuery.data.length > 0) {
      return allGroupsQuery.data.filter(g => g.isActive !== false);
    }
    return [];
  }, [productGroupsQuery.data, allGroupsQuery.data]);

  const flatAddons = useMemo(() => {
    return (addonsQuery.data || []).filter(a => a.isActive !== false);
  }, [addonsQuery.data]);

  const hasGroups = activeGroups.length > 0;
  const isLoading = productGroupsQuery.isLoading || allGroupsQuery.isLoading || addonsQuery.isLoading;

  useEffect(() => {
    if (open && item) {
      setSelectedModifiers(item.modifiers ? [...item.modifiers] : []);
      setValidationError(null);
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

  // Handle option toggle in structured groups
  const handleToggleGroupOption = (group: ModifierGroup, opt: any) => {
    setValidationError(null);
    const existingIndex = selectedModifiers.findIndex(
      m => (m.optionId && m.optionId === opt.id) || (!m.optionId && (m.productId === opt.id || m.name === opt.name))
    );

    if (group.selectionType === 'single') {
      // Remove any previously selected option from this group
      const filtered = selectedModifiers.filter(m => m.groupId !== group.id);
      if (existingIndex >= 0 && !group.isMandatory) {
        // If clicked again on optional single, deselect it
        setSelectedModifiers(filtered);
      } else {
        setSelectedModifiers([
          ...filtered,
          {
            productId: opt.id,
            optionId: opt.id,
            groupId: group.id,
            groupName: group.name,
            name: opt.name,
            qty: 1,
            price: Number(opt.price || 0),
            costPrice: Number(opt.costPrice || 0),
          },
        ]);
      }
    } else {
      // Multiple selection
      if (existingIndex >= 0) {
        // Option already selected, toggle off or decrease
        const next = [...selectedModifiers];
        next.splice(existingIndex, 1);
        setSelectedModifiers(next);
      } else {
        // Check max selections
        const currentGroupCount = selectedModifiers.filter(m => m.groupId === group.id).length;
        if (group.maxSelections && group.maxSelections > 0 && currentGroupCount >= group.maxSelections) {
          setValidationError(`الحد الأقصى للاختيار في مجموعة "${group.name}" هو ${group.maxSelections}`);
          return;
        }

        setSelectedModifiers([
          ...selectedModifiers,
          {
            productId: opt.id,
            optionId: opt.id,
            groupId: group.id,
            groupName: group.name,
            name: opt.name,
            qty: 1,
            price: Number(opt.price || 0),
            costPrice: Number(opt.costPrice || 0),
          },
        ]);
      }
    }
  };

  // Handle flat legacy addons toggle
  const handleToggleFlatAddon = (addon: any) => {
    setValidationError(null);
    const existingIndex = selectedModifiers.findIndex(
      m => String(m.productId) === String(addon.id) || String(m.name) === addon.name
    );

    if (existingIndex >= 0) {
      const next = [...selectedModifiers];
      next[existingIndex].qty += 1;
      setSelectedModifiers(next);
    } else {
      setSelectedModifiers([
        ...selectedModifiers,
        {
          productId: addon.id,
          name: addon.name,
          qty: 1,
          price: Number(addon.price || 0),
          costPrice: Number(addon.costPrice || 0),
        },
      ]);
    }
  };

  const handleDecreaseFlatAddon = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const next = [...selectedModifiers];
    if (next[index].qty > 1) {
      next[index].qty -= 1;
      setSelectedModifiers(next);
    } else {
      next.splice(index, 1);
      setSelectedModifiers(next);
    }
  };

  const handleSave = () => {
    // Validate mandatory groups
    if (hasGroups) {
      for (const group of activeGroups) {
        const count = selectedModifiers.filter(m => m.groupId === group.id).length;
        if (group.isMandatory && count === 0) {
          setValidationError(`يرجى تحديد اختيار لمجموعة "${group.name}" الإلزامية`);
          return;
        }
        if (group.minSelections && group.minSelections > 0 && count < group.minSelections) {
          setValidationError(`يرجى اختيار ما لا يقل عن ${group.minSelections} في مجموعة "${group.name}"`);
          return;
        }
      }
    }

    onSave(selectedModifiers);
    onClose();
  };

  // Calculate total additional modifier price
  const totalExtraPrice = selectedModifiers.reduce(
    (sum, m) => sum + (Number(m.price || 0) * Number(m.qty || 1)),
    0
  );

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
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="modal-surface"
        onClick={e => e.stopPropagation()}
        style={{
          width: '750px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          borderRadius: 16,
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        dir="rtl"
      >
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#eff6ff',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LayersIcon size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                خيارات ومعدلات: {item.name}
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                السعر الأساسي: {item.price} ج | الإضافات المختارة: +{totalExtraPrice.toFixed(2)} ج
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <XIcon size={20} />
          </button>
        </header>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {validationError && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircleIcon size={18} />
              <span>{validationError}</span>
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>جاري تحميل خيارات المنتج...</div>
          ) : hasGroups ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {activeGroups.map(group => {
                const groupSelections = selectedModifiers.filter(m => m.groupId === group.id);
                const isSatisfied = !group.isMandatory || groupSelections.length >= (group.minSelections || 1);

                return (
                  <div
                    key={group.id}
                    style={{
                      border: isSatisfied ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                      borderRadius: 12,
                      padding: 16,
                      background: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 14,
                        paddingBottom: 8,
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#1e293b' }}>
                          {group.name}
                        </span>
                        {group.isMandatory ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: '#fee2e2',
                              color: '#991b1b',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            مطلوب إلزامي
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            اختياري
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ({group.selectionType === 'single' ? 'اختيار واحد فقط' : 'خيارات متعددة'})
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        تم تحديد {groupSelections.length}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                      {(group.options || []).filter(opt => opt.isActive !== false).map(opt => {
                        const isSelected = selectedModifiers.some(
                          m => m.optionId === opt.id || (!m.optionId && m.productId === opt.id)
                        );
                        const optPrice = Number(opt.price || 0);

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleToggleGroupOption(group, opt)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: 10,
                              border: isSelected ? '2px solid #170e5e' : '1px solid #cbd5e1',
                              background: isSelected ? '#f5f3ff' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              textAlign: 'right',
                              boxShadow: isSelected ? '0 2px 4px rgba(23, 14, 94, 0.08)' : 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: group.selectionType === 'single' ? '50%' : 4,
                                  border: isSelected ? '2px solid #170e5e' : '1px solid #94a3b8',
                                  background: isSelected ? '#170e5e' : '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  flexShrink: 0,
                                }}
                              >
                                {isSelected && (
                                  group.selectionType === 'single' ? (
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
                                  ) : (
                                    <CheckIcon size={12} strokeWidth={3} />
                                  )
                                )}
                              </div>
                              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                                {opt.name}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: optPrice > 0 ? '#15803d' : '#64748b',
                              }}
                            >
                              {optPrice > 0 ? `+${optPrice} ج` : 'مجاني'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : flatAddons.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
              }}
            >
              لا توجد خيارات أو إضافات معرفة لهذا المنتج
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
              {flatAddons.map(addon => {
                const modIndex = selectedModifiers.findIndex(
                  m => String(m.productId) === String(addon.id) || String(m.name) === addon.name
                );
                const isSelected = modIndex >= 0;
                const qty = isSelected ? selectedModifiers[modIndex].qty : 0;

                return (
                  <div
                    key={addon.id}
                    onClick={() => handleToggleFlatAddon(addon)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                      background: isSelected ? '#f5f3ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{addon.name}</span>
                    <span style={{ color: '#15803d', fontSize: '0.9rem', fontWeight: 600 }}>{addon.price} ج</span>

                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#170e5e',
                          color: 'white',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                        }}
                      >
                        {qty}
                      </div>
                    )}

                    {isSelected && (
                      <button
                        type="button"
                        onClick={e => handleDecreaseFlatAddon(e, modIndex)}
                        style={{
                          marginTop: '4px',
                          background: '#e0e7ff',
                          border: 'none',
                          borderRadius: '6px',
                          width: '100%',
                          padding: '4px',
                          cursor: 'pointer',
                          color: '#3730a3',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
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

        {/* Footer */}
        <footer
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
            المجموع الإضافي: <span style={{ color: '#15803d' }}>+{totalExtraPrice.toFixed(2)} ج</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ height: '40px', padding: '0 18px', fontSize: '14px' }}
            >
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              style={{
                height: '40px',
                padding: '0 24px',
                fontSize: '14px',
                fontWeight: 700,
                background: '#170e5e',
                borderColor: '#170e5e',
              }}
            >
              تأكيد وحفظ الإضافات
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}

