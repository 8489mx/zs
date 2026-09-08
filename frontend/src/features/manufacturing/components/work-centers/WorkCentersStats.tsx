import { PackageIcon, CheckCircleIcon, AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { WorkCenterRecord } from '@/features/manufacturing/api/work-centers.api';

interface WorkCentersStatsProps {
  workCenters: WorkCenterRecord[];
}

export function WorkCentersStats({ workCenters }: WorkCentersStatsProps) {
  const activeCount = workCenters.filter(w => w.status === 'active').length;
  const maintenanceCount = workCenters.filter(w => w.status === 'maintenance').length;
  const totalCapacity = workCenters.reduce((sum, w) => sum + (w.status === 'active' ? Number(w.capacity || 0) : 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#170e5e' }}>
          <PackageIcon size={20} />
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>إجمالي مراكز العمل</span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{workCenters.length}</div>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
          <CheckCircleIcon size={20} />
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>مراكز نشطة وجاهزة</span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>{activeCount}</div>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
          <AlertTriangleIcon size={20} />
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>تحت الصيانة</span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706' }}>{maintenanceCount}</div>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
          <PackageIcon size={20} />
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>إجمالي الطاقة الإنتاجية/ساعة</span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed' }}>{totalCapacity.toFixed(1)} وحدة</div>
        </div>
      </div>
    </div>
  );
}
