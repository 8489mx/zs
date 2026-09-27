import { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { vanSalesApi, VanStockItem, InterVanTransferRecord } from '../api/van-sales.api';
import { ClockIcon } from '@/shared/components/icons/AppIcons';

interface PeerRep {
  id: number;
  name: string;
  phone?: string;
  vehiclePlate?: string;
}

interface VanTransferModalProps {
  open: boolean;
  onClose: () => void;
  inventory: VanStockItem[];
  peerReps: PeerRep[];
  transfers: InterVanTransferRecord[];
  onRefreshTransfers: () => void;
  onRefreshInventory: () => void;
}

export const VanTransferModal: React.FC<VanTransferModalProps> = ({
  open,
  onClose,
  inventory,
  peerReps,
  transfers,
  onRefreshTransfers,
  onRefreshInventory,
}) => {
  const [activeTab, setActiveTab] = useState<'incoming' | 'create' | 'history'>('incoming');

  // Create transfer form state
  const [selectedRepId, setSelectedRepId] = useState<number | ''>('');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [transferQty, setTransferQty] = useState<string>('');
  const [transferItems, setTransferItems] = useState<Array<{ productId: number; productName: string; qty: number }>>([]);
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Incoming transfers pending
  const incomingPending = transfers.filter((t) => t.status === 'pending');

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const qty = parseFloat(transferQty);
    if (!qty || qty <= 0) {
      toast.warning('يرجى تحديد كمية صحيحة');
      return;
    }

    const item = inventory.find((i) => i.productId === selectedProductId);
    if (!item) return;

    if (qty > item.qty) {
      toast.warning(`الكمية المطلوبة (${qty}) تتجاوز المتوفر بسيارتك (${item.qty})`);
      return;
    }

    setTransferItems((prev) => {
      const existing = prev.find((it) => it.productId === item.productId);
      if (existing) {
        return prev.map((it) => (it.productId === item.productId ? { ...it, qty: it.qty + qty } : it));
      }
      return [...prev, { productId: item.productId, productName: item.productName, qty }];
    });

    setSelectedProductId('');
    setTransferQty('');
  };

  const handleRemoveItem = (productId: number) => {
    setTransferItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const handleCreateTransfer = async () => {
    if (!selectedRepId) {
      toast.warning('يرجى اختيار المندوب المستلم');
      return;
    }
    if (transferItems.length === 0) {
      toast.warning('يرجى إضافة صنف واحد على الأقل للتحويل');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await vanSalesApi.createDriverTransfer({
        toRepId: selectedRepId,
        items: transferItems.map((it) => ({ productId: it.productId, qty: it.qty })),
        notes: transferNotes.trim() || undefined,
      });

      toast.success(`تم إنشاء إذن التحويل (#${res.transferNo}) بنجاح! بانتظار موافقة واستلام الزميل.`);
      setTransferItems([]);
      setSelectedRepId('');
      setTransferNotes('');
      onRefreshTransfers();
      setActiveTab('incoming');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إرسال طلب التحويل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptTransfer = async (transferId: number) => {
    try {
      await vanSalesApi.acceptDriverTransfer(transferId);
      toast.success('تم قبول التحويل بنجاح ونقل الأصناف إلى رصيد سيارتك!');
      onRefreshTransfers();
      onRefreshInventory();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر قبول التحويل');
    }
  };

  const handleRejectTransfer = async (transferId: number) => {
    try {
      await vanSalesApi.rejectDriverTransfer(transferId, 'رفض بواسطة المندوب المستلم');
      toast.info('تم رفض طلب التحويل');
      onRefreshTransfers();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر رفض التحويل');
    }
  };

  if (!open) return null;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="التحويل بين سيارتين بالميدان (مناقلة بضاعة)"
      subtitle="تحويل بضاعة لحظي بين المناديب في الشارع بموافقة الطرفين"
      badge="تحويل ميداني"
      width="min(560px, 95vw)"
      footerActions={
        <Button variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', fontSize: '12px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeTab === 'incoming' ? '#ffffff' : 'transparent',
              color: activeTab === 'incoming' ? '#170e5e' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            التحويلات الواردة {incomingPending.length > 0 && `(${incomingPending.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeTab === 'create' ? '#ffffff' : 'transparent',
              color: activeTab === 'create' ? '#170e5e' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + تحويل جديد لسيارة أخرى
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? '#170e5e' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            السجل الأخير ({transfers.length})
          </button>
        </div>

        {/* TAB 1: Incoming Pending Transfers */}
        {activeTab === 'incoming' && (
          <div>
            {incomingPending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '12.5px', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
                لا توجد طلبات تحويل واردة بانتظار موافقتك حالياً
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {incomingPending.map((tr) => (
                  <div
                    key={tr.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '1.5px solid #93c5fd',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#0369a1' }}>
                          #{tr.transferNo}
                        </span>
                        <h4 style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                          محول من المندوب: {tr.fromRepName}
                        </h4>
                      </div>
                      <span
                        style={{
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #fde68a',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ClockIcon size={12} color="#b45309" />
                        <span>بانتظار تأكيدك</span>
                      </span>
                    </div>

                    {/* Items table */}
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '6px', padding: '8px', fontSize: '11.5px' }}>
                      <span style={{ color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        الأصناف المحولة:
                      </span>
                      {tr.items.map((it) => (
                        <div key={it.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>{it.productName}</span>
                          <strong style={{ color: '#0f172a' }}>{it.qty} قطعة</strong>
                        </div>
                      ))}
                    </div>

                    {tr.notes && (
                      <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                        ملاحظة: "{tr.notes}"
                      </span>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <Button
                        variant="primary"
                        onClick={() => handleAcceptTransfer(tr.id)}
                        style={{ flex: 1, backgroundColor: '#15803d', color: '#ffffff', fontSize: '12px', fontWeight: 800, height: '32px' }}
                      >
                        ✓ استلام وتأكيد البضاعة
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleRejectTransfer(tr.id)}
                        style={{ fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5', height: '32px' }}
                      >
                        رفض
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Create New Transfer */}
        {activeTab === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                المندوب الزميل المستلم:
              </label>
              <CustomSelect
                value={selectedRepId ? String(selectedRepId) : ''}
                onChange={(val) => setSelectedRepId(val ? Number(val) : '')}
                options={[
                  { value: '', label: '-- اختر المندوب المستلم --' },
                  ...peerReps.map((r) => ({
                    value: String(r.id),
                    label: `${r.name}${r.vehiclePlate ? ` (${r.vehiclePlate})` : ''}`,
                  })),
                ]}
                placeholder="اختر المندوب"
              />
            </div>

            {/* Product & Qty Picker */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  الصنف من سيارتك:
                </label>
                <CustomSelect
                  value={selectedProductId ? String(selectedProductId) : ''}
                  onChange={(val) => setSelectedProductId(val ? Number(val) : '')}
                  options={[
                    { value: '', label: '-- اختر الصنف --' },
                    ...inventory
                      .filter((i) => i.qty > 0)
                      .map((i) => ({
                        value: String(i.productId),
                        label: `${i.productName} (متوفر: ${i.qty})`,
                      })),
                  ]}
                  placeholder="اختر الصنف"
                />
              </div>

              <div style={{ width: '90px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  الكمية:
                </label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  placeholder="الكمية"
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={handleAddItem}
                style={{ height: '34px', fontSize: '12px', fontWeight: 700 }}
              >
                + إضافة
              </Button>
            </div>

            {/* Items List */}
            {transferItems.length > 0 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {transferItems.map((it) => (
                  <div
                    key={it.productId}
                    style={{
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '12px',
                    }}
                  >
                    <span>{it.productName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#0f172a' }}>{it.qty} قطعة</strong>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.productId)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                ملاحظات التحويل:
              </label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="سبب التحويل أو موقع اللقاء..."
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={handleCreateTransfer}
              disabled={isSubmitting || transferItems.length === 0 || !selectedRepId}
              style={{ backgroundColor: '#170e5e', color: '#ffffff', height: '38px', fontSize: '13px', fontWeight: 800, marginTop: '4px' }}
            >
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال طلب التحويل للزميل'}
            </Button>
          </div>
        )}

        {/* TAB 3: History */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transfers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '12px' }}>
                لا توجد تحويلات سابقة
              </div>
            ) : (
              transfers.map((tr) => (
                <div
                  key={tr.id}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}>#{tr.transferNo}</span>
                    <span style={{ color: '#64748b' }}> ({tr.fromRepName} ➔ {tr.toRepName})</span>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {tr.totalItemsCount} أصناف | إجمالي الكمية: {tr.totalQty}
                    </div>
                  </div>

                  <div>
                    {tr.status === 'accepted' ? (
                      <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '11px' }}>✓ تم الاستلام</span>
                    ) : tr.status === 'rejected' ? (
                      <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '11px' }}>✕ مرفوض</span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 800, fontSize: '11px' }}>⏳ معلق</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </StandardDialog>
  );
};
