import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import {
  RefreshCwIcon,
  TruckIcon,
  SmartphoneIcon,
  PackageIcon,
} from '@/shared/components/icons/AppIcons';
import { DriverPortalUser } from '../api/delivery-reps.api';

interface DriverTopBarProps {
  driverUser: DriverPortalUser;
  deferredPrompt: any;
  onInstallPwa: () => void;
  offlineQueueCount: number;
  isSyncingOffline: boolean;
  onSyncOffline: () => void;
  isFetching: boolean;
  onRefresh: () => void;
  onSwitchTenant: () => void;
  onLogout: () => void;
}

export const DriverTopBar: React.FC<DriverTopBarProps> = ({
  driverUser,
  deferredPrompt,
  onInstallPwa,
  offlineQueueCount,
  isSyncingOffline,
  onSyncOffline,
  isFetching,
  onRefresh,
  onSwitchTenant,
  onLogout,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* PWA Install Banner */}
      {deferredPrompt && (
        <div
          style={{
            background: '#e0e7ff',
            border: '1px solid #c7d2fe',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1e1b4b' }}>
            <SmartphoneIcon size={18} color="#1e1b4b" />
            <div>
              <strong>تثبيت التطبيق على الموبايل:</strong> شاشة كاملة وسرعة وصول بدون متصفح.
            </div>
          </div>
          <button
            type="button"
            onClick={onInstallPwa}
            style={{
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            تثبيت الآن
          </button>
        </div>
      )}

      {/* Offline Pending Sync Banner */}
      {offlineQueueCount > 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400e' }}>
            <PackageIcon size={18} color="#92400e" />
            <div>
              <strong>شحنات بانتظار المزامنة:</strong> لديك {offlineQueueCount} شحنة سُلمت بدون نت.
            </div>
          </div>
          <button
            type="button"
            onClick={onSyncOffline}
            disabled={isSyncingOffline}
            style={{
              background: '#b45309',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isSyncingOffline ? 'جاري الرفع...' : 'مزامنة الآن'}
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TruckIcon size={20} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>أهلاً، كابتن {driverUser.name}</span>
              {driverUser.tenantName && (
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {driverUser.tenantName}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {driverUser.phone ? `هاتف: ${driverUser.phone}` : ''}
              {driverUser.vehiclePlate ? ` • لوحة: ${driverUser.vehiclePlate}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link
            to="/hub"
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #e2e8f0',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="العودة لمركز البوابات"
          >
            <span>مركز البوابات</span>
          </Link>
          <button
            type="button"
            onClick={() => navigate('/van-sales')}
            style={{
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="الانتقال إلى شاشة مبيعات سيارة الفان الميدانية"
          >
            <TruckIcon size={14} color="#047857" />
            <span>مبيعات الفان</span>
          </button>
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={isFetching}
            style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCwIcon size={13} color="#475569" />
            <span>{isFetching ? '...' : 'تحديث'}</span>
          </Button>
          <button
            type="button"
            onClick={onSwitchTenant}
            style={{
              background: '#f8fafc',
              color: '#170e5e',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="التبديل إلى منشأة أخرى"
          >
            <span>تبديل المنشأة</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            خروج
          </button>
        </div>
      </div>
    </>
  );
};
