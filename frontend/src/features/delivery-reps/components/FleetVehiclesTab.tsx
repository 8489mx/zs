import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { TruckIcon, SearchIcon, RefreshCwIcon } from '@/shared/components/icons/AppIcons';
import { vanSalesApi, type FleetVehicle } from '../api/van-sales.api';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { UpsertFleetVehicleModal } from './UpsertFleetVehicleModal';
import { AssignDriverModal } from './AssignDriverModal';

export function FleetVehiclesTab() {
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<'all' | 'available' | 'assigned' | 'maintenance'>('all');
  const [isUpsertVehicleOpen, setIsUpsertVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [assigningVehicle, setAssigningVehicle] = useState<FleetVehicle | null>(null);

  const {
    data: vehicles = [],
    isLoading: isVehiclesLoading,
    refetch: refetchVehicles,
  } = useQuery<FleetVehicle[]>({
    queryKey: ['fleet-vehicles'],
    queryFn: vanSalesApi.listVehicles,
    refetchInterval: 25000,
  });

  const {
    data: reps = [],
    refetch: refetchReps,
  } = useQuery<DeliveryRep[]>({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
  });

  const totalVehiclesCount = vehicles.length;
  const assignedVehiclesCount = vehicles.filter((v) => v.status === 'assigned' || v.assignedRepId).length;
  const availableVehiclesCount = vehicles.filter((v) => v.status === 'available' && !v.assignedRepId).length;
  const maintenanceVehiclesCount = vehicles.filter((v) => v.status === 'maintenance').length;

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (vehicleStatusFilter !== 'all' && v.status !== vehicleStatusFilter) return false;
      if (vehicleSearch.trim()) {
        const q = vehicleSearch.toLowerCase().trim();
        const matchesPlate = (v.plateNumber || '').toLowerCase().includes(q);
        const matchesModel = (v.modelName || '').toLowerCase().includes(q);
        const matchesRep = (v.assignedRepName || '').toLowerCase().includes(q);
        return matchesPlate || matchesModel || matchesRep;
      }
      return true;
    });
  }, [vehicles, vehicleStatusFilter, vehicleSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'block' }}>إجمالي أسطول الشركة</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '4px' }}>
            {totalVehiclesCount} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>مركبة</span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', display: 'block' }}>مركبات مسندة بسائق</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0369a1', display: 'block', marginTop: '4px' }}>
            {assignedVehiclesCount} <span style={{ fontSize: '12px', color: '#7dd3fc', fontWeight: 600 }}>في الخدمة</span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'block' }}>مركبات متاحة للتشغيل</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', display: 'block', marginTop: '4px' }}>
            {availableVehiclesCount} <span style={{ fontSize: '12px', color: '#86efac', fontWeight: 600 }}>جاهزة</span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#ea580c', display: 'block' }}>تحت الصيانة والإصلاح</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#c2410c', display: 'block', marginTop: '4px' }}>
            {maintenanceVehiclesCount} <span style={{ fontSize: '12px', color: '#fdba74', fontWeight: 600 }}>بالورشة</span>
          </span>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: '1', minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: '1' }}>
            <input
              type="text"
              placeholder="بحث برقم اللوحة، الموديل، أو اسم السائق..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}>
              <SearchIcon size={16} />
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { label: `الكل (${vehicles.length})`, value: 'all' as const },
              { label: `مسندة (${assignedVehiclesCount})`, value: 'assigned' as const },
              { label: `متاحة (${availableVehiclesCount})`, value: 'available' as const },
              { label: `صيانة (${maintenanceVehiclesCount})`, value: 'maintenance' as const },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setVehicleStatusFilter(f.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: vehicleStatusFilter === f.value ? '#170e5e' : '#f1f5f9',
                  color: vehicleStatusFilter === f.value ? '#ffffff' : '#475569',
                  transition: 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="primary"
            style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '13px' }}
            onClick={() => {
              setEditingVehicle(null);
              setIsUpsertVehicleOpen(true);
            }}
          >
            + إضافة سيارة للأسطول
          </Button>
          <Button
            variant="secondary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              refetchVehicles();
              refetchReps();
            }}
          >
            <RefreshCwIcon size={14} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Vehicles Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {isVehiclesLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
            جاري تحميل أسطول السيارات...
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            لا توجد مركبات مسجلة في الأسطول حالياً. انقر على "+ إضافة سيارة للأسطول" لإضافة أول سيارة لأسطول الشركة.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>لوحة المركبة والطراز</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>نوع المركبة والوقود</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>مستودع الفان المتنقل</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>السائق المسند</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>قراءة العداد</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>الحالة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((v) => {
                const isAssigned = Boolean(v.assignedRepId);
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: '#f0f9ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <TruckIcon size={18} color="#0284c7" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>
                            {v.plateNumber}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {v.modelName || 'بدون موديل محدد'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        {v.vehicleType === 'van'
                          ? 'فان مغلقة'
                          : v.vehicleType === 'pickup'
                          ? 'ربع نقل'
                          : v.vehicleType === 'truck'
                          ? 'شاحنة توزيع'
                          : v.vehicleType}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        وقود: {v.fuelType === 'gasoline' ? 'بنزين' : v.fuelType === 'diesel' ? 'سولار' : v.fuelType}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          background: '#f8fafc',
                          color: '#334155',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontWeight: 600,
                          display: 'inline-block',
                        }}
                      >
                        {v.vanLocationName}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {isAssigned ? (
                        <div>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{v.assignedRepName}</span>
                          {v.assignedRepPhone && (
                            <div style={{ fontSize: '11px', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>
                              {v.assignedRepPhone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                          -- بدون سائق مسند --
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                      {Number(v.currentOdometer || 0).toLocaleString()} كم
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background:
                            v.status === 'assigned'
                              ? '#e0f2fe'
                              : v.status === 'available'
                              ? '#dcfce7'
                              : v.status === 'maintenance'
                              ? '#ffedd5'
                              : '#f1f5f9',
                          color:
                            v.status === 'assigned'
                              ? '#0369a1'
                              : v.status === 'available'
                              ? '#15803d'
                              : v.status === 'maintenance'
                              ? '#c2410c'
                              : '#475569',
                          border: `1px solid ${
                            v.status === 'assigned'
                              ? '#bae6fd'
                              : v.status === 'available'
                              ? '#bbf7d0'
                              : v.status === 'maintenance'
                              ? '#fed7aa'
                              : '#e2e8f0'
                          }`,
                        }}
                      >
                        {v.status === 'assigned'
                          ? 'مسندة بالخدمة'
                          : v.status === 'available'
                          ? 'متاحة للتشغيل'
                          : v.status === 'maintenance'
                          ? 'تحت الصيانة'
                          : 'مستبعدة'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          onClick={() => {
                            setAssigningVehicle(v);
                            setIsAssignDriverOpen(true);
                          }}
                        >
                          {isAssigned ? 'تغيير السائق والوردية' : 'تخصيص سائق'}
                        </Button>
                        <Button
                          variant="secondary"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          onClick={() => {
                            setEditingVehicle(v);
                            setIsUpsertVehicleOpen(true);
                          }}
                        >
                          تعديل
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <UpsertFleetVehicleModal
        open={isUpsertVehicleOpen}
        onClose={() => {
          setIsUpsertVehicleOpen(false);
          setEditingVehicle(null);
        }}
        vehicle={editingVehicle}
        reps={reps}
      />

      <AssignDriverModal
        open={isAssignDriverOpen}
        onClose={() => {
          setIsAssignDriverOpen(false);
          setAssigningVehicle(null);
        }}
        vehicle={assigningVehicle}
        reps={reps}
      />
    </div>
  );
}
