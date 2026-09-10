import { useState, useEffect } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { CheckIcon, UsersIcon, ReceiptIcon, PlusIcon, TrashIcon } from '@/shared/components/icons/AppIcons';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { PosItem } from '@/features/pos/types/pos.types';

interface PosSplitBillModalProps {
  open: boolean;
  pos: PosWorkspaceState;
  onClose: () => void;
  onSplitCompleted?: () => void;
}

interface SplitBill {
  id: string;
  name: string;
  items: PosItem[];
  isPaid: boolean;
  paymentMethod?: 'cash' | 'card';
}

interface EvenSplitGuest {
  id: number;
  name: string;
  amount: number;
  paid: boolean;
  method: 'cash' | 'card' | 'transfer';
}

export function PosSplitBillModal({ open, pos, onClose, onSplitCompleted }: PosSplitBillModalProps) {
  const [splitMode, setSplitMode] = useState<'items' | 'even'>('items');

  // Mode 1: Split by Items state
  const [bills, setBills] = useState<SplitBill[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Mode 2: Split Evenly state
  const [guestCount, setGuestCount] = useState<number>(2);
  const [evenGuests, setEvenGuests] = useState<EvenSplitGuest[]>([]);

  const totalAmount = Number(pos.totals?.total || 0);

  // Sync state whenever modal opens or cart changes
  useEffect(() => {
    if (open) {
      // 1. Initialize split bills: Bill 1 gets all current cart items, Bill 2 starts empty
      const initialBills: SplitBill[] = [
        {
          id: 'main',
          name: 'الشيك 1 (الرئيسي)',
          items: (pos.cart || []).map((i) => ({ ...i })),
          isPaid: false,
        },
        {
          id: 'split-2',
          name: 'الشيك 2',
          items: [],
          isPaid: false,
        },
      ];
      setBills(initialBills);

      // 2. Initialize even guests split
      const currentTotal = Number(pos.totals?.total || 0);
      const perGuest = currentTotal > 0 ? Number((currentTotal / guestCount).toFixed(2)) : 0;
      const newGuests: EvenSplitGuest[] = [];
      let allocated = 0;
      for (let i = 1; i <= guestCount; i++) {
        const isLast = i === guestCount;
        const amt = isLast ? Number((currentTotal - allocated).toFixed(2)) : perGuest;
        allocated += amt;
        newGuests.push({
          id: i,
          name: `الضيف ${i}`,
          amount: amt,
          paid: false,
          method: 'cash',
        });
      }
      setEvenGuests(newGuests);
      setStatusMessage('');
      setIsProcessingPayment(false);
    }
  }, [open, pos.cart, pos.totals?.total]);

  // Re-calculate even splits when guestCount changes
  const handleGuestCountChange = (count: number) => {
    if (count < 2) count = 2;
    if (count > 12) count = 12;
    setGuestCount(count);
    const perGuest = Number((totalAmount / count).toFixed(2));
    const newGuests: EvenSplitGuest[] = [];
    let allocated = 0;
    for (let i = 1; i <= count; i++) {
      const isLast = i === count;
      const amt = isLast ? Number((totalAmount - allocated).toFixed(2)) : perGuest;
      allocated += amt;
      newGuests.push({
        id: i,
        name: `الضيف ${i}`,
        amount: amt,
        paid: false,
        method: 'cash',
      });
    }
    setEvenGuests(newGuests);
  };

  // Add extra split bill
  const handleAddBill = () => {
    const nextIndex = bills.length + 1;
    const newBill: SplitBill = {
      id: `split-${Date.now()}`,
      name: `الشيك ${nextIndex}`,
      items: [],
      isPaid: false,
    };
    setBills((prev) => [...prev, newBill]);
  };

  // Remove empty split bill (if extra)
  const handleRemoveBill = (billId: string) => {
    if (bills.length <= 2) return;
    setBills((prev) => prev.filter((b) => b.id !== billId));
  };

  // Move item from one bill to another
  const handleMoveItem = (fromBillId: string, toBillId: string, itemLineKey: string, moveQty?: number) => {
    setBills((prev) => {
      const fromBill = prev.find((b) => b.id === fromBillId);
      const toBill = prev.find((b) => b.id === toBillId);
      if (!fromBill || !toBill || fromBill.isPaid || toBill.isPaid) return prev;

      const itemIdx = fromBill.items.findIndex((i) => i.lineKey === itemLineKey);
      if (itemIdx === -1) return prev;
      const item = fromBill.items[itemIdx];

      const actualMoveQty = moveQty === undefined ? item.qty : Math.min(item.qty, moveQty);
      if (actualMoveQty <= 0) return prev;

      const updatedFromItems = [...fromBill.items];
      if (item.qty <= actualMoveQty) {
        // remove completely
        updatedFromItems.splice(itemIdx, 1);
      } else {
        // decrement
        updatedFromItems[itemIdx] = {
          ...item,
          qty: item.qty - actualMoveQty,
        };
      }

      // Add to toBill
      const existingToIdx = toBill.items.findIndex((i) => i.productId === item.productId && i.unitId === item.unitId && i.price === item.price);
      let updatedToItems = [...toBill.items];
      if (existingToIdx !== -1) {
        updatedToItems[existingToIdx] = {
          ...updatedToItems[existingToIdx],
          qty: updatedToItems[existingToIdx].qty + actualMoveQty,
        };
      } else {
        updatedToItems.push({
          ...item,
          lineKey: `${item.productId}::${item.unitId}::split::${Date.now()}::${Math.random()}`,
          qty: actualMoveQty,
        });
      }

      return prev.map((b) => {
        if (b.id === fromBillId) return { ...b, items: updatedFromItems };
        if (b.id === toBillId) return { ...b, items: updatedToItems };
        return b;
      });
    });
  };

  // Move all items from one bill to another
  const handleMoveAllItems = (fromBillId: string, toBillId: string) => {
    setBills((prev) => {
      const fromBill = prev.find((b) => b.id === fromBillId);
      const toBill = prev.find((b) => b.id === toBillId);
      if (!fromBill || !toBill || fromBill.isPaid || toBill.isPaid || !fromBill.items.length) return prev;

      const updatedToItems = [...toBill.items];
      for (const item of fromBill.items) {
        const existingIdx = updatedToItems.findIndex((i) => i.productId === item.productId && i.unitId === item.unitId && i.price === item.price);
        if (existingIdx !== -1) {
          updatedToItems[existingIdx] = {
            ...updatedToItems[existingIdx],
            qty: updatedToItems[existingIdx].qty + item.qty,
          };
        } else {
          updatedToItems.push({
            ...item,
            lineKey: `${item.productId}::${item.unitId}::split::${Date.now()}::${Math.random()}`,
          });
        }
      }

      return prev.map((b) => {
        if (b.id === fromBillId) return { ...b, items: [] };
        if (b.id === toBillId) return { ...b, items: updatedToItems };
        return b;
      });
    });
  };

  // Compute total for each bill
  const getBillTotal = (items: PosItem[]) => {
    return items.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.qty || 0)), 0);
  };

  // Pay individual split bill
  const handlePayBill = async (billId: string, paymentChannel: 'cash' | 'card') => {
    const targetBill = bills.find((b) => b.id === billId);
    if (!targetBill || !targetBill.items.length || targetBill.isPaid) return;

    setIsProcessingPayment(true);
    setStatusMessage('');

    try {
      const billSum = getBillTotal(targetBill.items);
      await pos.createSale.mutateAsync({
        source: 'pos',
        cart: targetBill.items,
        customerId: String(pos.customerId || ''),
        paymentType: 'cash',
        paymentChannel,
        discount: 0,
        deliveryFee: 0,
        taxRate: 0,
        pricesIncludeTax: false,
        paidAmount: billSum,
        tenderedAmount: billSum,
        payments: [{ paymentChannel, amount: billSum }],
        expectedTotal: billSum,
        orderType: pos.orderType,
        tableNumber: pos.tableNumber ? `${pos.tableNumber} (مجزأ)` : undefined,
        note: `فاتورة مجزأة من طاولة ${pos.tableNumber || ''} - ${targetBill.name}`,
      });

      // Mark this bill as paid
      const updatedBills = bills.map((b) => (b.id === billId ? { ...b, isPaid: true, paymentMethod: paymentChannel } : b));
      setBills(updatedBills);

      setStatusMessage(`تم تحصيل ${targetBill.name} بنجاح بقيمة ${formatCurrency(billSum)}.`);

      // Check if all bills are now paid
      const remainingUnpaid = updatedBills.filter((b) => !b.isPaid && b.items.length > 0);
      if (remainingUnpaid.length === 0) {
        // Everything settled! Clear active cart
        pos.setCart([]);
        pos.setTableNumber('');
        if (onSplitCompleted) onSplitCompleted();
        setTimeout(() => onClose(), 1200);
      } else {
        // Sync the remaining unpaid items back to the active cart!
        const remainingItems = remainingUnpaid.flatMap((b) => b.items);
        pos.setCart(remainingItems);
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'تعذر تسجيل تحصيل الشيك المجزأ');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Even split payment for single guest
  const handlePayGuest = async (guestId: number, method: 'cash' | 'card' | 'transfer') => {
    const guest = evenGuests.find((g) => g.id === guestId);
    if (!guest || guest.paid) return;

    setIsProcessingPayment(true);
    setStatusMessage('');

    try {
      // Record payment for this share
      setEvenGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, paid: true, method } : g))
      );

      setStatusMessage(`تم سداد نصيب ${guest.name} بقيمة ${formatCurrency(guest.amount)} بنجاح.`);

      // If all guests paid, finalize full sale!
      const updated = evenGuests.map((g) => (g.id === guestId ? { ...g, paid: true, method } : g));
      const allPaid = updated.every((g) => g.paid);

      if (allPaid) {
        const cashTotal = updated.filter((g) => g.method === 'cash').reduce((s, g) => s + g.amount, 0);
        const cardTotal = updated.filter((g) => g.method === 'card').reduce((s, g) => s + g.amount, 0);
        const transferTotal = updated.filter((g) => g.method === 'transfer').reduce((s, g) => s + g.amount, 0);

        await pos.createSale.mutateAsync({
          source: 'pos',
          cart: pos.cart,
          customerId: String(pos.customerId || ''),
          paymentType: 'cash',
          paymentChannel: 'cash',
          discount: Number(pos.discount || 0),
          deliveryFee: 0,
          taxRate: 0,
          pricesIncludeTax: false,
          paidAmount: totalAmount,
          tenderedAmount: totalAmount,
          payments: [
            ...(cashTotal > 0 ? [{ paymentChannel: 'cash' as const, amount: cashTotal }] : []),
            ...(cardTotal > 0 ? [{ paymentChannel: 'card' as const, amount: cardTotal }] : []),
            ...(transferTotal > 0 ? [{ paymentChannel: 'instapay' as const, amount: transferTotal }] : []),
          ],
          expectedTotal: totalAmount,
          orderType: pos.orderType,
          tableNumber: pos.tableNumber,
          note: `سداد مجزأ بالتساوي على ${guestCount} ضيوف`,
        });

        pos.setCart([]);
        pos.setTableNumber('');
        if (onSplitCompleted) onSplitCompleted();
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'تعذر تسجيل سداد الضيف');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Save split checks as separate held drafts
  const handleSaveAsSeparateHeldChecks = async () => {
    const validBills = bills.filter((b) => !b.isPaid && b.items.length > 0);
    if (!validBills.length) return;

    setIsProcessingPayment(true);
    setStatusMessage('');

    try {
      for (let i = 0; i < validBills.length; i++) {
        const b = validBills[i];
        pos.setCart(b.items);
        if (pos.tableNumber) {
          pos.setTableNumber(`${pos.tableNumber} - شيك ${i + 1}`);
        }
        await pos.holdDraft();
      }

      pos.setCart([]);
      pos.setTableNumber('');
      setStatusMessage('تم حفظ الشيكات المجزأة كطلبات معلقة منفصلة بنجاح.');
      if (onSplitCompleted) onSplitCompleted();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setStatusMessage(err?.message || 'تعذر حفظ الشيكات كطلبات معلقة');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!open) return null;

  const totalSplitSum = bills.reduce((sum, b) => sum + getBillTotal(b.items), 0);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(1080px, calc(100vw - 32px))"
      zIndex={90}
      ariaLabel="تجزئة وتقسيم الفاتورة والشيكات"
    >
      <Card
        title="تجزئة وتقسيم الفاتورة والشيكات (Split Bill)"
        className="dialog-card"
        style={{
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: '16px 20px',
        }}
      >
        <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ReceiptIcon size={20} color="#170e5e" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  تقسيم الفاتورة {pos.tableNumber ? `(طاولة ${pos.tableNumber})` : ''}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  إجمالي الطلب: <strong style={{ color: '#170e5e' }}>{formatCurrency(totalAmount)}</strong> • {pos.cart.length} أصناف بالسلة
                </span>
              </div>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setSplitMode('items')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: splitMode === 'items' ? '#170e5e' : 'transparent',
                  color: splitMode === 'items' ? '#ffffff' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                تجزئة حسب الأصناف
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('even')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: splitMode === 'even' ? '#170e5e' : 'transparent',
                  color: splitMode === 'even' ? '#ffffff' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                تقسيم بالتساوي (ضيوف)
              </button>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
            >
              {statusMessage}
            </div>
          )}

          {/* MODE 1: SPLIT BY ITEMS */}
          {splitMode === 'items' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                  وزّع الأصناف والكميات على الشيكات المستقلة بالضغط على أزرار النقل، ثم حصّل كل شيك على حدة:
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddBill}
                  style={{ fontSize: '12px', minHeight: '30px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PlusIcon size={14} />
                  <span>إضافة شيك إضافي</span>
                </Button>
              </div>

              {/* Bills Columns Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(Math.max(bills.length, 1), 3)}, minmax(0, 1fr))`,
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  paddingBottom: '4px',
                }}
              >
                {bills.map((bill, _billIdx) => {
                  const billTotal = getBillTotal(bill.items);
                  const otherBills = bills.filter((b) => b.id !== bill.id && !b.isPaid);

                  return (
                    <div
                      key={bill.id}
                      style={{
                        border: bill.isPaid ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        background: bill.isPaid ? '#f0fdf4' : '#ffffff',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '300px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div>
                        {/* Bill Title & Badges */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13.5px', color: bill.isPaid ? '#166534' : '#0f172a' }}>
                              {bill.name}
                            </strong>
                            <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>
                              {bill.items.reduce((s, i) => s + i.qty, 0)} قطعة
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {bill.isPaid ? (
                              <span style={{ fontSize: '11px', background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                تم السداد ({bill.paymentMethod === 'card' ? 'شبكة' : 'نقد'})
                              </span>
                            ) : (
                              <span style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e' }}>
                                {formatCurrency(billTotal)}
                              </span>
                            )}

                            {/* Option to delete extra bill if empty & unpaid */}
                            {!bill.isPaid && bill.items.length === 0 && bills.length > 2 && bill.id !== 'main' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBill(bill.id)}
                                title="حذف هذا الشيك الفارغ"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <TrashIcon size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick action: Move all items if available */}
                        {!bill.isPaid && bill.items.length > 0 && otherBills.length === 1 && (
                          <div style={{ marginBottom: '8px', textAlign: 'start' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveAllItems(bill.id, otherBills[0].id)}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#475569',
                                cursor: 'pointer',
                                width: '100%',
                              }}
                            >
                              نقل جميع الأصناف إلى {otherBills[0].name}
                            </button>
                          </div>
                        )}

                        {/* Items in this bill */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                          {bill.items.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '12px' }}>
                              <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#64748b' }}>هذا الشيك فارغ</p>
                              <span>اضغط على أزرار النقل بجوار الأصناف في الشيكات الأخرى لنقلها هنا</span>
                            </div>
                          ) : (
                            bill.items.map((item) => (
                              <div
                                key={item.lineKey}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  background: bill.isPaid ? '#ffffff' : '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  fontSize: '12px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ fontWeight: 700, color: '#0f172a', flex: 1, wordBreak: 'break-word' }}>
                                    {item.name}
                                  </div>
                                  <div style={{ fontWeight: 800, color: '#170e5e', whiteSpace: 'nowrap', marginInlineStart: '6px' }}>
                                    {formatCurrency(item.qty * item.price)}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                                    {item.qty} × {formatCurrency(item.price)}
                                  </span>

                                  {/* Item Transfer Buttons */}
                                  {!bill.isPaid && otherBills.length > 0 && (
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                      {otherBills.map((target) => (
                                        <div key={target.id} style={{ display: 'flex', gap: '2px' }}>
                                          {item.qty > 1 ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleMoveItem(bill.id, target.id, item.lineKey, 1)}
                                                title={`نقل قطعة واحدة إلى ${target.name}`}
                                                style={{
                                                  background: '#ffffff',
                                                  border: '1px solid #cbd5e1',
                                                  borderRadius: '4px',
                                                  padding: '2px 6px',
                                                  fontSize: '10.5px',
                                                  fontWeight: 700,
                                                  color: '#170e5e',
                                                  cursor: 'pointer',
                                                }}
                                              >
                                                نقل 1 {otherBills.length > 1 ? `← #${target.name.replace('الشيك ', '')}` : `← ${target.name}`}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleMoveItem(bill.id, target.id, item.lineKey, item.qty)}
                                                title={`نقل كل الكمية (${item.qty}) إلى ${target.name}`}
                                                style={{
                                                  background: '#f1f5f9',
                                                  border: '1px solid #cbd5e1',
                                                  borderRadius: '4px',
                                                  padding: '2px 6px',
                                                  fontSize: '10.5px',
                                                  fontWeight: 700,
                                                  color: '#334155',
                                                  cursor: 'pointer',
                                                }}
                                              >
                                                الكل ({item.qty})
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => handleMoveItem(bill.id, target.id, item.lineKey, 1)}
                                              title={`نقل إلى ${target.name}`}
                                              style={{
                                                background: '#ffffff',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                padding: '2px 8px',
                                                fontSize: '10.5px',
                                                fontWeight: 700,
                                                color: '#170e5e',
                                                cursor: 'pointer',
                                              }}
                                            >
                                              نقل {otherBills.length > 1 ? `← #${target.name.replace('الشيك ', '')}` : `← ${target.name}`}
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Bill Actions */}
                      {!bill.isPaid && bill.items.length > 0 && (
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '10px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Button
                              type="button"
                              variant="primary"
                              disabled={isProcessingPayment}
                              onClick={() => void handlePayBill(bill.id, 'cash')}
                              style={{ flex: 1, minHeight: '32px', fontSize: '12px', padding: '0 4px' }}
                            >
                              تحصيل نقد
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isProcessingPayment}
                              onClick={() => void handlePayBill(bill.id, 'card')}
                              style={{ flex: 1, minHeight: '32px', fontSize: '12px', padding: '0 4px', borderColor: '#170e5e', color: '#170e5e' }}
                            >
                              تحصيل شبكة
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom bulk action & Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleSaveAsSeparateHeldChecks()}
                    disabled={isProcessingPayment || bills.filter((b) => !b.isPaid && b.items.length > 0).length < 2}
                    style={{ fontSize: '12px' }}
                  >
                    حفظ الشيكات كطلبات معلقة منفصلة في الصالة
                  </Button>

                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    المجموع الموزع: <strong style={{ color: '#0f172a' }}>{formatCurrency(totalSplitSum)}</strong> من أصل <strong style={{ color: '#170e5e' }}>{formatCurrency(totalAmount)}</strong>
                  </span>
                </div>

                <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessingPayment}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}

          {/* MODE 2: SPLIT EVENLY */}
          {splitMode === 'even' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Guest Count Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UsersIcon size={18} color="#170e5e" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                    عدد الضيوف للتقسيم:
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleGuestCountChange(num)}
                      style={{
                        padding: '5px 14px',
                        borderRadius: '6px',
                        border: guestCount === num ? '2px solid #170e5e' : '1px solid #cbd5e1',
                        background: guestCount === num ? '#170e5e' : '#ffffff',
                        color: guestCount === num ? '#ffffff' : '#334155',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {num} ضيوف
                    </button>
                  ))}
                </div>
                <div style={{ marginInlineStart: 'auto', fontSize: '13px', color: '#64748b' }}>
                  نصيب كل ضيف: <strong style={{ color: '#0f172a', fontSize: '14px' }}>{formatCurrency(evenGuests[0]?.amount || 0)}</strong>
                </div>
              </div>

              {/* Guest Shares List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                {evenGuests.map((guest) => (
                  <div
                    key={guest.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: guest.paid ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                      background: guest.paid ? '#f0fdf4' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: guest.paid ? '#16a34a' : '#170e5e',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        {guest.id}
                      </span>
                      <div>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{guest.name}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          المبلغ المطلوب: <strong style={{ color: '#170e5e' }}>{formatCurrency(guest.amount)}</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      {guest.paid ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 800, fontSize: '12.5px' }}>
                          <CheckIcon size={16} />
                          <span>تم السداد ({guest.method === 'card' ? 'شبكة' : guest.method === 'transfer' ? 'تحويل' : 'نقد'})</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            type="button"
                            variant="primary"
                            disabled={isProcessingPayment}
                            onClick={() => void handlePayGuest(guest.id, 'cash')}
                            style={{ minHeight: '32px', fontSize: '12px', padding: '0 14px' }}
                          >
                            سداد نقد
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isProcessingPayment}
                            onClick={() => void handlePayGuest(guest.id, 'card')}
                            style={{ minHeight: '32px', fontSize: '12px', padding: '0 14px', borderColor: '#170e5e', color: '#170e5e' }}
                          >
                            سداد شبكة
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <div style={{ fontSize: '12.5px', color: '#475569' }}>
                  تم تحصيل: <strong style={{ color: '#16a34a' }}>
                    {formatCurrency(evenGuests.filter((g) => g.paid).reduce((s, g) => s + g.amount, 0))}
                  </strong> من أصل <strong style={{ color: '#0f172a' }}>{formatCurrency(totalAmount)}</strong>
                </div>

                <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessingPayment}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </DialogShell>
  );
}

