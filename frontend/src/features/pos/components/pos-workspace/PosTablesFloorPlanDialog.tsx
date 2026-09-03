import React, { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import type { HeldPosDraftSummary } from '@/features/pos/components/pos-cart-panel/posCartPanel.types';

interface PosTablesFloorPlanDialogProps {
  open: boolean;
  onClose: () => void;
  currentTableNumber: string;
  heldDrafts: HeldPosDraftSummary[];
  onSelectTable: (tableNumber: string) => void;
  onRecallDraft: (draftId: string) => Promise<void>;
  onTransferTable?: (fromTable: string, toTable: string) => void;
}

export function PosTablesFloorPlanDialog({
  open,
  onClose,
  currentTableNumber,
  heldDrafts,
  onSelectTable,
  onRecallDraft,
  onTransferTable,
}: PosTablesFloorPlanDialogProps) {
  const [customInput, setCustomInput] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Tables 1 to 24 by default
  const defaultTables = Array.from({ length: 24 }, (_, i) => String(i + 1));

  // Map occupied tables by table number
  const occupiedMap = new Map<string, HeldPosDraftSummary>();
  for (const draft of heldDrafts) {
    if (draft.tableNumber) {
      occupiedMap.set(String(draft.tableNumber).trim(), draft);
    }
  }

  // Calculate statistics
  const occupiedCount = occupiedMap.size;
  const totalOccupiedMoney = Array.from(occupiedMap.values()).reduce((sum, d) => sum + Number(d.total || 0), 0);
  const availableCount = Math.max(0, 24 - occupiedCount);

  const handleTableClick = async (tableNum: string) => {
    if (isTransferring) {
      if (currentTableNumber && onTransferTable) {
        onTransferTable(currentTableNumber, tableNum);
        setIsTransferring(false);
        onClose();
      }
      return;
    }

    const occupiedDraft = occupiedMap.get(tableNum);
    if (occupiedDraft) {
      // Recall this draft directly into the cart
      await onRecallDraft(occupiedDraft.id);
      onClose();
    } else {
      // Empty table, select it for current/new order
      onSelectTable(tableNum);
      onClose();
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onSelectTable(customInput.trim());
    setCustomInput('');
    onClose();
  };

  return (
    <DialogShell open={open} onClose={onClose} ariaLabel="خريطة الصالة وإدارة الطاولات" width="850px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px' }} dir="rtl">
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🍽️</span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                خريطة الصالة وإدارة الطاولات
              </h3>
              {currentTableNumber && (
                <span style={{ fontSize: '11.5px', background: '#e0e7ff', color: '#170e5e', border: '1px solid #c7d2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  الطاولة الحالية بالفاتورة: {currentTableNumber}
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
              اختر طاولة فارغة لبدء طلب جديد، أو اضغط على أي طاولة مشغولة لفتح حسابها وتعديله فوراً.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Stats and Quick Info Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#166534', fontWeight: 700 }}>
              🟢 طاولات شاغرة: <strong>{availableCount}</strong>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#991b1b', fontWeight: 700 }}>
              🔴 طاولات مشغولة: <strong>{occupiedCount}</strong> ({totalOccupiedMoney.toLocaleString('ar-EG')} ج.م)
            </div>
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
              {isTransferring ? 'إلغاء وضع النقل' : '⇄ نقل الطلب إلى طاولة أخرى'}
            </button>
          )}
        </div>

        {isTransferring && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#c2410c', fontWeight: 700 }}>
            ⚠️ وضع النقل نشط: اضغط الآن على الطاولة الجديدة التي ترغب في نقل طلب الطاولة ({currentTableNumber}) إليها.
          </div>
        )}

        {/* Tables Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
            gap: '10px',
            maxHeight: '360px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {defaultTables.map((tableNum) => {
            const occupied = occupiedMap.get(tableNum);
            const isCurrent = currentTableNumber === tableNum;

            return (
              <button
                key={tableNum}
                type="button"
                onClick={() => handleTableClick(tableNum)}
                style={{
                  height: '92px',
                  borderRadius: '10px',
                  border: isCurrent
                    ? '2.5px solid #170e5e'
                    : occupied
                    ? '1.5px solid #fecaca'
                    : '1.5px solid #e2e8f0',
                  background: isCurrent
                    ? '#eff6ff'
                    : occupied
                    ? '#ffffff'
                    : '#ffffff',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {/* Table Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>طاولة {tableNum}</strong>
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: occupied ? '#ef4444' : '#10b981',
                      display: 'inline-block',
                    }}
                  />
                </div>

                {/* Table Status / Money */}
                {occupied ? (
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#dc2626' }}>
                      {Number(occupied.total).toLocaleString('ar-EG')} ج.م
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                      {occupied.itemsCount} أصناف • معلقة
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                    شاغرة (متاحة)
                  </div>
                )}

                {/* Action Hint */}
                <div style={{ fontSize: '10px', color: occupied ? '#b91c1c' : '#64748b' }}>
                  {occupied ? 'فتح الشيك ⏎' : 'بدء طلب +'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer: Custom table number input */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
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
      </div>
    </DialogShell>
  );
}
