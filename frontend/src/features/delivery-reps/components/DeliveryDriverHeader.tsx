import { Button } from '@/shared/ui/button';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import {
  TruckIcon,
  RefreshCwIcon,
  CameraIcon,
  PlusIcon,
} from '@/shared/components/icons/AppIcons';

interface DeliveryDriverHeaderProps {
  selectedRepId: number;
  setSelectedRepId: (id: number) => void;
  reps: any[];
  refetchOrders: () => void;
  isSyncingOffline: boolean;
  offlineQueueCount: number;
  syncOfflineQueue: () => void;
  setScannerOpen: (open: boolean) => void;
  setVanSaleModalOpen: (open: boolean) => void;
  deferredPrompt: any;
  handleInstallPWA: () => void;
  pendingCount: number;
  settledCount: number;
  totalCollected: number;
  pendingAmount: number;
  statusFilter: 'pending' | 'settled' | 'all';
  setStatusFilter: (f: 'pending' | 'settled' | 'all') => void;
}

export function DeliveryDriverHeader({
  selectedRepId,
  setSelectedRepId,
  reps,
  refetchOrders,
  isSyncingOffline,
  offlineQueueCount,
  syncOfflineQueue,
  setScannerOpen,
  setVanSaleModalOpen,
  deferredPrompt,
  handleInstallPWA,
  pendingCount,
  settledCount,
  totalCollected,
  pendingAmount,
  statusFilter,
  setStatusFilter,
}: DeliveryDriverHeaderProps) {
  return (
    <>
      {/* Top Mobile Bar */}
      <div style={{ background: '#170e5e', color: '#ffffff', padding: '14px 16px', borderRadius: '14px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(23, 14, 94, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TruckIcon size={22} color="#ffffff" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>بوابة الطيار المتنقلة</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => refetchOrders()}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              <RefreshCwIcon size={14} />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* PWA Offline Sync Indicator */}
        {offlineQueueCount > 0 && (
          <div style={{ marginTop: '10px', background: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span>يوجد {offlineQueueCount} عمليات مسجلة بدون إنترنت</span>
            <button
              type="button"
              onClick={syncOfflineQueue}
              disabled={isSyncingOffline}
              style={{ background: '#eab308', color: '#000', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
            >
              {isSyncingOffline ? 'جاري المزامنة...' : 'مزامنة الآن'}
            </button>
          </div>
        )}

        {/* Rep Selector */}
        <div style={{ marginTop: '12px' }}>
          <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>تحديد حساب المندوب:</label>
          <select
            value={selectedRepId}
            onChange={(e) => setSelectedRepId(Number(e.target.value))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', fontWeight: 700 }}
          >
            {reps.map((r: any) => (
              <option key={r.id} value={r.id} style={{ color: '#000' }}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Scanner & Van Sales Floating Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <Button
          variant="secondary"
          onClick={() => setScannerOpen(true)}
          style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1' }}
        >
          <CameraIcon size={18} color="#170e5e" />
          <span>مسح بوليصة شحن</span>
        </Button>

        <Button
          variant="primary"
          onClick={() => setVanSaleModalOpen(true)}
          style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, borderRadius: '10px', background: '#170e5e' }}
        >
          <PlusIcon size={18} color="#ffffff" />
          <span>فاتورة فان سيلز</span>
        </Button>
      </div>

      {/* PWA Install Banner */}
      {deferredPrompt && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: '12px', color: '#166534', display: 'block' }}>ثبّت التطبيق على شاشة هاتفك</strong>
            <span style={{ fontSize: '11px', color: '#15803d' }}>للوصول السريع والعمل في وضع عدم الاتصال</span>
          </div>
          <button
            type="button"
            onClick={handleInstallPWA}
            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
          >
            تثبيت التطبيق
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>شحنات معلقة</span>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            بمبلغ: {pendingAmount.toLocaleString('ar-EG')} <CurrencySymbol />
          </span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>تم تسليمه اليوم</span>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
            {settledCount}
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            محصل: {totalCollected.toLocaleString('ar-EG')} <CurrencySymbol />
          </span>
        </div>
      </div>

      {/* Status Filter Bar */}
      <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', background: statusFilter === 'pending' ? '#ffffff' : 'transparent', color: statusFilter === 'pending' ? '#170e5e' : '#64748b' }}
        >
          قيد التوصيل ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('settled')}
          style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', background: statusFilter === 'settled' ? '#ffffff' : 'transparent', color: statusFilter === 'settled' ? '#170e5e' : '#64748b' }}
        >
          تم تسليمها ({settledCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', background: statusFilter === 'all' ? '#ffffff' : 'transparent', color: statusFilter === 'all' ? '#170e5e' : '#64748b' }}
        >
          الكل ({pendingCount + settledCount})
        </button>
      </div>
    </>
  );
}
