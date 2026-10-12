import { useState, useEffect } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/shared/components/system-alert';
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import {
  restaurantAdvancedFnbApi,
  type RestaurantDriveThruOrder,
} from '@/features/pos/api/restaurant-advanced-fnb.api';

interface PosDriveThruModalProps {
  open: boolean;
  onClose: () => void;
  branchId?: number;
  onSelectDriveThruOrder?: (order: RestaurantDriveThruOrder) => void;
}

export function PosDriveThruModal({ open, onClose, branchId: _branchId, onSelectDriveThruOrder }: PosDriveThruModalProps) {
  const [orders, setOrders] = useState<RestaurantDriveThruOrder[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [averageSos, setAverageSos] = useState(0);

  // New vehicle form
  const [newPlate, setNewPlate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrders = async () => {
    if (!open) return;
    try {
      const res = await restaurantAdvancedFnbApi.getDriveThruOrders();
      setOrders(res.orders || []);
      setActiveCount(res.activeCount || 0);
      setAverageSos(res.averageSosSeconds || 0);
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    if (open) {
      void fetchOrders();
      const interval = setInterval(() => {
        void fetchOrders();
      }, 5000); // Polling every 5s for live loop SOS timer
      return () => clearInterval(interval);
    }
  }, [open]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) {
      toast.error('أدخل رقم لوحة السيارة');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await restaurantAdvancedFnbApi.createDriveThruOrder({
        vehiclePlate: newPlate.trim(),
        vehicleDesc: newDesc.trim() || undefined,
        totalAmount: Number(newAmount || 0),
        notes: newNotes.trim() || undefined,
      });
      toast.success(res.message);
      setNewPlate('');
      setNewDesc('');
      setNewAmount(0);
      setNewNotes('');
      void fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تسجيل السيارة في المسار');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    id: number,
    status: 'order_taken' | 'at_window' | 'completed' | 'cancelled',
  ) => {
    try {
      const res = await restaurantAdvancedFnbApi.updateDriveThruStatus(id, status);
      toast.success(res.message);
      void fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحديث حالة السيارة');
    }
  };

  const formatSosTime = (seconds: number = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} ثانية`;
    return `${mins} د ${secs} ث`;
  };

  if (!open) return null;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(1080px, calc(100vw - 32px))"
      zIndex={90}
      ariaLabel="مسار طلبات السيارات ودرايف ثرو"
    >
      <Card
        title="مسار طلبات السيارات ومؤشر سرعة الخدمة (Drive-Thru SOS)"
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
          {/* Header & KPI Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                backgroundColor: '#eff6ff',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TruckIcon size={20} color="#1d4ed8" />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>سيارات بالمسار حالياً</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#1e40af' }}>{activeCount} مركبة</div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f0fdf4',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClockIcon size={20} color="#15803d" />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>متوسط زمن الخدمة (SOS)</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#166534' }}>
                  {formatSosTime(averageSos)}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircleIcon size={20} color="#170e5e" />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>المعيار العالمي للسرعة</div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
                  &lt; 90 ثانية (ممتاز) • &lt; 180 ثانية (مقبول)
                </div>
              </div>
            </div>
          </div>

          {/* Form to insert vehicle entering lane */}
          <form
            onSubmit={handleCreateOrder}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.5fr 1fr 1.5fr auto',
              gap: '10px',
              alignItems: 'flex-end',
              backgroundColor: '#f8fafc',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                رقم اللوحة *
              </label>
              <input
                type="text"
                placeholder="مثال: أ ب ج 1234"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                نوع ولون المركبة
              </label>
              <input
                type="text"
                placeholder="مثال: أبيض - كيا سيراتو"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                قيمة الطلب
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="0.00"
                value={newAmount || ''}
                onChange={(e) => setNewAmount(Number(e.target.value || 0))}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                ملاحظات
              </label>
              <input
                type="text"
                placeholder="طلب بدون سكر، استلام سريع..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              style={{
                height: '35px',
                padding: '0 16px',
                fontSize: '12.5px',
                fontWeight: 800,
                backgroundColor: '#170e5e',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PlusCircleIcon size={15} color="#ffffff" />
              <span>دخول المسار</span>
            </Button>
          </form>

          {/* Active Lane Queue List */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '9px 12px', fontSize: '12px', fontWeight: 800, color: '#475569' }}>رقم اللوحة والمركبة</th>
                  <th style={{ padding: '9px 12px', fontSize: '12px', fontWeight: 800, color: '#475569' }}>مرحلة المسار</th>
                  <th style={{ padding: '9px 12px', fontSize: '12px', fontWeight: 800, color: '#475569' }}>مؤشر زمن الخدمة (SOS)</th>
                  <th style={{ padding: '9px 12px', fontSize: '12px', fontWeight: 800, color: '#475569' }}>قيمة الطلب</th>
                  <th style={{ padding: '9px 12px', fontSize: '12px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>الإجراءات السريعة</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      لا توجد سيارات في مسار الطلبات حالياً.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const isCompleted = o.status === 'completed';
                    const isAtWindow = o.status === 'at_window';
                    const sos = o.liveSosSeconds || o.sos_seconds || 0;
                    const sosColor = sos < 90 ? '#15803d' : sos <= 180 ? '#b45309' : '#dc2626';
                    const sosBg = sos < 90 ? '#f0fdf4' : sos <= 180 ? '#fffbeb' : '#fef2f2';

                    return (
                      <tr
                        key={o.id}
                        onClick={() => onSelectDriveThruOrder?.(o)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isCompleted ? '#f8fafc' : isAtWindow ? '#eff6ff' : '#ffffff',
                          opacity: isCompleted ? 0.65 : 1,
                          cursor: onSelectDriveThruOrder ? 'pointer' : 'default',
                        }}
                      >
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{o.vehicle_plate}</div>
                          {o.vehicle_desc && (
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{o.vehicle_desc}</div>
                          )}
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor:
                                o.status === 'order_taken'
                                  ? '#fef3c7'
                                  : o.status === 'at_window'
                                  ? '#dbeafe'
                                  : o.status === 'completed'
                                  ? '#dcfce7'
                                  : '#f1f5f9',
                              color:
                                o.status === 'order_taken'
                                  ? '#92400e'
                                  : o.status === 'at_window'
                                  ? '#1e40af'
                                  : o.status === 'completed'
                                  ? '#166534'
                                  : '#64748b',
                            }}
                          >
                            {o.status === 'order_taken'
                              ? 'عند شباك الطلب'
                              : o.status === 'at_window'
                              ? 'وصلت لشباك الاستلام'
                              : o.status === 'completed'
                              ? 'تم التسليم وخروج'
                              : 'ملغي'}
                          </span>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: sosBg,
                              color: sosColor,
                              fontWeight: 800,
                              fontSize: '12px',
                              fontFamily: 'monospace',
                            }}
                          >
                            <ClockIcon size={12} color={sosColor} />
                            {formatSosTime(sos)}
                          </span>
                        </td>

                        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          {Number(o.total_amount || 0) > 0 ? formatCurrency(o.total_amount) : '—'}
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {!isCompleted && (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {o.status === 'order_taken' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(o.id, 'at_window')}
                                  style={{
                                    fontSize: '11px',
                                    padding: '4px 8px',
                                    backgroundColor: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                  }}
                                  title="انتقال السيارة لشباك الاستلام والدفع"
                                >
                                  وصول للشباك
                                </Button>
                              )}

                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleUpdateStatus(o.id, 'completed')}
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  backgroundColor: '#15803d',
                                }}
                                title="إتمام تسليم الوجبة وخروج السيارة من المسار"
                              >
                                إتمام وخروج
                              </Button>

                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(o.id, 'cancelled')}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  padding: '4px',
                                }}
                                title="إلغاء من المسار"
                              >
                                <XIcon size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Close */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 20px', fontSize: '12.5px' }}>
              إغلاق
            </Button>
          </div>
        </div>
      </Card>
    </DialogShell>
  );
}
