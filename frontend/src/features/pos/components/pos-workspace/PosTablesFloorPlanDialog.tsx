import React, { useEffect, useState, useCallback } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon, AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import type { HeldPosDraftSummary } from '@/features/pos/components/pos-cart-panel/posCartPanel.types';

interface PosTablesFloorPlanDialogProps {
  open: boolean;
  onClose: () => void;
  currentTableNumber: string;
  currentCartItemsCount?: number;
  currentCartTotal?: number;
  heldDrafts: HeldPosDraftSummary[];
  onSelectTable: (tableNumber: string) => Promise<void> | void;
  onRecallDraft: (draftId: string) => Promise<void>;
  onDeleteDraft?: (draftId: string) => Promise<void>;
  onClearAllDrafts?: () => Promise<void>;
  onTransferTable?: (fromTable: string, toTable: string) => void;
  onMergeTable?: (fromTable: string, toTable: string) => void;
  initialTab?: 'floor' | 'list';
}

export function PosTablesFloorPlanDialog({
  open,
  onClose,
  currentTableNumber,
  currentCartItemsCount = 0,
  currentCartTotal = 0,
  heldDrafts,
  onSelectTable,
  onRecallDraft,
  onDeleteDraft,
  onClearAllDrafts,
  onTransferTable,
  onMergeTable,
  initialTab = 'floor',
}: PosTablesFloorPlanDialogProps) {
  const [activeTab, setActiveTab] = useState<'floor' | 'list'>(initialTab);
  const [customInput, setCustomInput] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [pendingRecallId, setPendingRecallId] = useState('');
  const [isSubmittingTable, setIsSubmittingTable] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setIsTransferring(false);
      setIsSubmittingTable(false);
      setCustomInput('');
      setSelectedIndex((curr) => {
        if (!heldDrafts.length) return 0;
        return Math.min(curr, heldDrafts.length - 1);
      });
    }
  }, [open, initialTab, heldDrafts.length]);

  // Tables 1 to 24 by default
  const defaultTables = Array.from({ length: 24 }, (_, i) => String(i + 1));

  // Map occupied tables by table number
  const occupiedMap = new Map<string, HeldPosDraftSummary>();
  const nonTableDrafts: HeldPosDraftSummary[] = [];

  for (const draft of heldDrafts) {
    if (draft.tableNumber && String(draft.tableNumber).trim()) {
      occupiedMap.set(String(draft.tableNumber).trim(), draft);
    } else {
      nonTableDrafts.push(draft);
    }
  }

  // Live cart on currently active table that has items and is not yet in heldDrafts
  const currentTableHasLiveCart = Boolean(
    currentTableNumber &&
    currentCartItemsCount > 0 &&
    !occupiedMap.has(currentTableNumber)
  );

  // Calculate statistics (including the active live cart table)
  const occupiedCount = occupiedMap.size + (currentTableHasLiveCart ? 1 : 0);
  const totalOccupiedMoney =
    Array.from(occupiedMap.values()).reduce((sum, d) => sum + Number(d.total || 0), 0) +
    (currentTableHasLiveCart ? Number(currentCartTotal || 0) : 0);
  const availableCount = Math.max(0, 24 - occupiedCount);

  const handleRecall = useCallback(async (draftId: string) => {
    setPendingRecallId(draftId);
    try {
      await onRecallDraft(draftId);
      onClose();
    } finally {
      setPendingRecallId('');
    }
  }, [onRecallDraft, onClose]);

  const handleTableClick = async (tableNum: string) => {
    if (isTransferring) {
      if (currentTableNumber && currentTableNumber !== tableNum) {
        const isTargetOccupied = occupiedMap.has(tableNum);
        if (isTargetOccupied && onMergeTable) {
          const confirmMerge = window.confirm(`الطاولة ${tableNum} مشغولة بالفعل بطلب قيمته ${Number(occupiedMap.get(tableNum)?.total || 0).toLocaleString('ar-EG')} ج.م.\n\nهل ترغب في دمج طلب الطاولة ${currentTableNumber} مع هذه الطاولة؟`);
          if (confirmMerge) {
            onMergeTable(currentTableNumber, tableNum);
            setIsTransferring(false);
            onClose();
            return;
          }
        } else if (onTransferTable) {
          onTransferTable(currentTableNumber, tableNum);
          setIsTransferring(false);
          onClose();
          return;
        }
      }
      setIsTransferring(false);
      return;
    }

    // If clicking the currently selected table that already has active cart items
    if (tableNum === currentTableNumber && currentCartItemsCount > 0) {
      onClose();
      return;
    }

    const occupiedDraft = occupiedMap.get(tableNum);
    if (occupiedDraft) {
      await handleRecall(occupiedDraft.id);
    } else {
      setIsSubmittingTable(true);
      try {
        await onSelectTable(tableNum);
        onClose();
      } finally {
        setIsSubmittingTable(false);
      }
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;

    if (trimmed === currentTableNumber && currentCartItemsCount > 0) {
      onClose();
      return;
    }

    setIsSubmittingTable(true);
    try {
      await onSelectTable(trimmed);
      setCustomInput('');
      onClose();
    } finally {
      setIsSubmittingTable(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));
      if (isTypingTarget) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (activeTab === 'list' && heldDrafts.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((curr) => Math.min(curr + 1, heldDrafts.length - 1));
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex((curr) => Math.max(curr - 1, 0));
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          const draft = heldDrafts[selectedIndex];
          if (draft) void handleRecall(draft.id);
          return;
        }
        if (event.key === 'Delete' && onDeleteDraft) {
          event.preventDefault();
          const draft = heldDrafts[selectedIndex];
          if (draft) void onDeleteDraft(draft.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, activeTab, heldDrafts, selectedIndex, handleRecall, onDeleteDraft, onClose]);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      ariaLabel="خريطة الصالة وإدارة الطاولات والطلبات المعلقة"
      width="880px"
      zIndex={87}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px 22px' }} dir="rtl">
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                خريطة الصالة وإدارة الطاولات والطلبات
              </h3>
              {currentTableNumber && (
                <span
                  style={{
                    fontSize: '11.5px',
                    background: currentCartItemsCount > 0 ? '#eff6ff' : '#f8fafc',
                    color: currentCartItemsCount > 0 ? '#170e5e' : '#475569',
                    border: currentCartItemsCount > 0 ? '1.5px solid #bfdbfe' : '1px solid #cbd5e1',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>الطاولة الحالية بالسلة: {currentTableNumber}</span>
                  {currentCartItemsCount > 0 && (
                    <span
                      style={{
                        background: '#170e5e',
                        color: '#ffffff',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        fontSize: '10.5px',
                        fontWeight: 900,
                      }}
                    >
                      {Number(currentCartTotal).toLocaleString('ar-EG')} ج.م ({currentCartItemsCount} صنف بالسلة)
                    </span>
                  )}
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
              إدارة شاملة لطاولات الصالة وجلسات الطعام والطلبات المعلقة والتيك أواي
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '6px',
            }}
            title="إغلاق"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* View Tabs Switcher */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('floor')}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              border: activeTab === 'floor' ? '2px solid #170e5e' : '1px solid #cbd5e1',
              background: activeTab === 'floor' ? '#170e5e' : '#ffffff',
              color: activeTab === 'floor' ? '#ffffff' : '#334155',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            خريطة الصالة والطاولات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              border: activeTab === 'list' ? '2px solid #170e5e' : '1px solid #cbd5e1',
              background: activeTab === 'list' ? '#170e5e' : '#ffffff',
              color: activeTab === 'list' ? '#ffffff' : '#334155',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>قائمة الطلبات المعلقة والتيك أواي</span>
            <span
              style={{
                background: activeTab === 'list' ? '#ffffff' : '#f1f5f9',
                color: activeTab === 'list' ? '#170e5e' : '#475569',
                fontSize: '11px',
                padding: '1px 7px',
                borderRadius: '999px',
                fontWeight: 900,
              }}
            >
              {heldDrafts.length}
            </span>
          </button>
        </div>

        {activeTab === 'floor' ? (
          <>
            {/* Stats and Quick Info Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#166534', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  <span>طاولات شاغرة: <strong>{availableCount}</strong></span>
                </div>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#991b1b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                  <span>طاولات مشغولة: <strong>{occupiedCount}</strong> ({totalOccupiedMoney.toLocaleString('ar-EG')} ج.م)</span>
                </div>
                {nonTableDrafts.length > 0 && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#1e40af', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                    <span>تيك أواي معلق: <strong>{nonTableDrafts.length}</strong></span>
                  </div>
                )}
              </div>

              {/* Transfer Table Button */}
              {currentTableNumber && (
                <button
                  type="button"
                  onClick={() => setIsTransferring(!isTransferring)}
                  style={{
                    background: isTransferring ? '#ea580c' : '#ffffff',
                    color: isTransferring ? '#ffffff' : '#ea580c',
                    border: '1px solid #fdba74',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {isTransferring ? 'إلغاء وضع النقل' : 'نقل الطلب إلى طاولة أخرى'}
                </button>
              )}
            </div>

            {isTransferring && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#c2410c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangleIcon size={14} color="#c2410c" />
                <span>وضع النقل نشط: اضغط الآن على الطاولة الجديدة التي ترغب في نقل طلب الطاولة ({currentTableNumber}) إليها.</span>
              </div>
            )}

            {/* Non-table / Takeaway Held Orders Quick Bar */}
            {nonTableDrafts.length > 0 && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                  <span>طلبات تيك أواي / معلقة بدون طاولة ({nonTableDrafts.length}):</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {nonTableDrafts.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      disabled={pendingRecallId === d.id}
                      onClick={() => void handleRecall(d.id)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s',
                      }}
                      title="استرجاع هذا الطلب للسلة فوراً"
                    >
                      <span>{d.label || 'طلب تيك أواي'}</span>
                      <strong style={{ color: '#16a34a' }}>{Number(d.total || 0).toLocaleString('ar-EG')} ج.م</strong>
                      <span style={{ color: '#64748b' }}>({d.itemsCount} صنف)</span>
                      <span style={{ color: '#170e5e', fontWeight: 800 }}>
                        {pendingRecallId === d.id ? 'جارٍ الفتح...' : 'استرجاع'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tables Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
                gap: '10px',
                maxHeight: '340px',
                overflowY: 'auto',
                padding: '4px',
              }}
            >
              {defaultTables.map((tableNum) => {
                const occupied = occupiedMap.get(tableNum);
                const isCurrent = currentTableNumber === tableNum;
                const hasLiveCart = isCurrent && currentCartItemsCount > 0;

                let borderColor = '#e2e8f0';
                let bgColor = '#ffffff';
                let dotColor = '#10b981';

                if (hasLiveCart) {
                  borderColor = '#170e5e';
                  bgColor = '#eff6ff';
                  dotColor = '#170e5e';
                } else if (occupied) {
                  borderColor = '#fecaca';
                  bgColor = '#ffffff';
                  dotColor = '#ef4444';
                } else if (isCurrent) {
                  borderColor = '#94a3b8';
                  bgColor = '#f8fafc';
                  dotColor = '#10b981';
                }

                return (
                  <button
                    key={tableNum}
                    type="button"
                    disabled={Boolean(pendingRecallId) || isSubmittingTable}
                    onClick={() => void handleTableClick(tableNum)}
                    style={{
                      height: '92px',
                      borderRadius: '10px',
                      border: `${hasLiveCart ? '2.5px' : isCurrent ? '2px' : '1.5px'} solid ${borderColor}`,
                      background: bgColor,
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      boxShadow: hasLiveCart ? '0 2px 8px rgba(23, 14, 94, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    {/* Table Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>طاولة {tableNum}</strong>
                      {hasLiveCart ? (
                        <span
                          style={{
                            fontSize: '9.5px',
                            background: '#170e5e',
                            color: '#ffffff',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 800,
                          }}
                        >
                          نشطة
                        </span>
                      ) : (
                        <span
                          style={{
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: dotColor,
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>

                    {/* Table Status / Money */}
                    {hasLiveCart ? (
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#170e5e' }}>
                          {Number(currentCartTotal).toLocaleString('ar-EG')} ج.م
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '1px' }}>
                          {currentCartItemsCount} أصناف • بالسلة النشطة
                        </div>
                      </div>
                    ) : occupied ? (
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#dc2626' }}>
                          {Number(occupied.total).toLocaleString('ar-EG')} ج.م
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                          {occupied.itemsCount} أصناف • معلقة
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: isCurrent ? '#475569' : '#16a34a', fontWeight: 700 }}>
                        {isCurrent ? 'شاغرة (محددة)' : 'شاغرة (متاحة)'}
                      </div>
                    )}

                    {/* Action Hint */}
                    <div
                      style={{
                        fontSize: '10px',
                        color: hasLiveCart ? '#170e5e' : occupied ? '#b91c1c' : '#64748b',
                        fontWeight: hasLiveCart ? 800 : 500,
                      }}
                    >
                      {hasLiveCart
                        ? 'العودة للطلب ↵'
                        : occupied
                        ? pendingRecallId === occupied.id
                          ? 'جاري الفتح...'
                          : 'فتح الشيك'
                        : isSubmittingTable
                        ? 'جارٍ الفتح...'
                        : 'بدء طلب +'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer: Custom table number input */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', flexWrap: 'wrap', gap: '10px' }}>
              <form onSubmit={handleCustomSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700 }}>رقم طاولة أو مكان إضافي:</span>
                <input
                  type="text"
                  placeholder="مثال: VIP 2 أو ركن 5"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  style={{ width: '130px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <Button variant="secondary" type="submit" style={{ padding: '6px 10px', fontSize: '12px' }}>
                  اختيار
                </Button>
              </form>

              <Button variant="secondary" onClick={onClose} style={{ padding: '6px 16px', fontSize: '12.5px' }}>
                إغلاق
              </Button>
            </div>
          </>
        ) : (
          /* List View Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Keyboard Hints Bar */}
            <div style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
            }}>
              <span><kbd style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: 4, fontWeight: 700, color: '#334155' }}>↑ ↓</kbd> للتنقل</span>
              <span>•</span>
              <span><kbd style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: 4, fontWeight: 700, color: '#334155' }}>Enter</kbd> للاسترجاع</span>
              <span>•</span>
              <span><kbd style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: 4, fontWeight: 700, color: '#334155' }}>Del</kbd> للحذف</span>
              <span style={{ marginInlineStart: 'auto', color: '#94a3b8' }}>أو انقر نقراً مزدوجاً بالماوس</span>
            </div>

            {/* Drafts List */}
            {heldDrafts.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', padding: '2px' }}>
                {heldDrafts.map((draft, idx) => {
                  const isSelected = selectedIndex === idx;
                  const isPending = pendingRecallId === draft.id;

                  return (
                    <div
                      key={draft.id}
                      onClick={() => setSelectedIndex(idx)}
                      onDoubleClick={() => void handleRecall(draft.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: isSelected ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        boxShadow: isSelected ? '0 2px 8px rgba(15,23,42,0.06)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Left: Draft Info & Badges */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? '#170e5e' : '#94a3b8' }}>
                            #{idx + 1}
                          </span>
                          <strong style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 700 }}>
                            {draft.label || 'عميل نقدي'}
                          </strong>
                          <span style={{
                            background: draft.tableNumber ? '#f0fdf4' : '#eff6ff',
                            color: draft.tableNumber ? '#166534' : '#1e40af',
                            border: draft.tableNumber ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}>
                            {draft.tableNumber ? `طاولة: ${draft.tableNumber}` : draft.orderType === 'delivery' ? 'دليفري' : 'تيك أواي'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                          <span>{draft.itemsCount} {draft.itemsCount === 1 ? 'صنف' : 'أصناف'}</span>
                          <span>•</span>
                          <span>الإجمالي: <strong style={{ color: '#0f172a', fontWeight: 800 }}>{formatCurrency(draft.total)}</strong></span>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button
                          type="button"
                          variant="primary"

                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRecall(draft.id);
                          }}
                          style={{
                            background: '#170e5e',
                            borderColor: '#170e5e',
                            color: '#ffffff',
                            fontWeight: 700,
                            minHeight: '30px',
                            padding: '0 14px',
                            fontSize: '12px',
                          }}
                        >
                          {isPending ? 'جاري الاسترجاع...' : 'استرجاع'}
                        </Button>
                        {onDeleteDraft && (
                          <Button
                            type="button"
                            variant="secondary"
  
                            onClick={(e) => {
                              e.stopPropagation();
                              void onDeleteDraft(draft.id);
                            }}
                            style={{
                              minHeight: '30px',
                              padding: '0 10px',
                              fontSize: '12px',
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                            }}
                          >
                            حذف
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>
                  لا توجد طلبات معلقة حالياً.
                </p>
              </div>
            )}

            {/* List Tab Footer Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              {onClearAllDrafts && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { void onClearAllDrafts(); }}
                  disabled={!heldDrafts.length}
                  style={{
                    color: heldDrafts.length ? '#dc2626' : '#94a3b8',
                    borderColor: heldDrafts.length ? '#fca5a5' : '#e2e8f0',
                    fontSize: '12px',
                  }}
                >
                  حذف الكل
                </Button>
              )}
              <Button variant="secondary" onClick={onClose} style={{ padding: '6px 16px', fontSize: '12.5px' }}>
                إغلاق
              </Button>
            </div>
          </div>
        )}

      </div>
    </DialogShell>
  );
}
