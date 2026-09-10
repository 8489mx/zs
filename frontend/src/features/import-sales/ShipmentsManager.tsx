import { useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useShipmentsQuery, type Shipment } from './api/shipments.api';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import { NewShipmentDialog } from './NewShipmentDialog';
import {
  GlobeIcon,
  BuildingIcon,
  WarehouseIcon,
  RefreshCwIcon,
  FileTextIcon,
  PackageIcon,
} from '@/shared/components/icons/AppIcons';

export default function ShipmentsManager() {
  const { data, isLoading, refetch, isRefetching } = useShipmentsQuery();
  const navigate = useNavigate();
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false);

  const seaCount = data?.stats?.sea || 0;
  const customsCount = data?.stats?.customs || 0;
  const arrivedCount = data?.stats?.arrived || 0;
  const rows = data?.rows || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <span style={{ fontSize: '0.74rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            في البحر (شحن بحري)
          </span>
        );
      case 'In Customs':
        return (
          <span style={{ fontSize: '0.74rem', background: '#fefce8', color: '#a16207', border: '1px solid #fef08a', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            في الجمارك (تخليص)
          </span>
        );
      case 'Arrived':
        return (
          <span style={{ fontSize: '0.74rem', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            تم الوصول للمخزن
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '0.74rem', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            {status || 'غير محدد'}
          </span>
        );
    }
  };

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader 
          title="إدارة الحاويات والشحنات المستوردة" 
          description="متابعة حركة الحاويات من بلد المنشأ والمصنع حتى الوصول للمخازن، وتوزيع تكاليف الشحن والجمارك."
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button 
                variant="primary" 
                onClick={() => setIsNewShipmentOpen(true)}
                style={{
                  height: '38px',
                  padding: '0 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <PackageIcon size={16} />
                <span>إضافة حاوية جديدة</span>
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => void refetch()}
                disabled={isLoading || isRefetching}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCwIcon size={15} />
                <span>تحديث</span>
              </Button>
            </div>
          } 
        />

        {/* KPI Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '8px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>حاويات في البحر (قيد الإبحار)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {seaCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>حاوية</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
              <GlobeIcon size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>حاويات في مرحلة التخليص الجمركي</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {customsCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>حاوية</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a16207' }}>
              <BuildingIcon size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>حاويات مكتملة التكلفة بالمخازن</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {arrivedCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>حاوية</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <WarehouseIcon size={20} />
            </div>
          </div>
        </div>

        {/* Shipments Table Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                قائمة الحاويات والشحنات
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                انقر على أي حاوية لاستعراض بنود البضاعة وتفاصيل التكاليف وحساب تكلفة الوحدة
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
              {rows.length} حاوية
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}>
                  <th style={{ padding: '10px 16px', width: '160px' }}>رقم الحاوية</th>
                  <th style={{ padding: '10px 16px', minWidth: '160px' }}>المصنع / المورد</th>
                  <th style={{ padding: '10px 16px', width: '150px' }}>حالة الشحنة</th>
                  <th style={{ padding: '10px 16px', width: '120px' }}>تاريخ الوصول</th>
                  <th style={{ padding: '10px 16px', width: '140px' }}>تكلفة الشحن ($)</th>
                  <th style={{ padding: '10px 16px', width: '140px' }}>الجمارك والمصاريف</th>
                  <th style={{ padding: '10px 16px', width: '110px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      جاري تحميل بيانات الحاويات...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', color: '#94a3b8' }}>
                        <FileTextIcon size={22} />
                      </div>
                      <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.88rem' }}>لا توجد حاويات مسجلة بعد</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>اضغط على «إضافة حاوية جديدة» لبدء تسجيل وتتبع الشحنات المستوردة.</div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row: Shipment, idx: number) => (
                    <tr 
                      key={row.id || idx} 
                      onClick={() => navigate(`/import-sales/shipments/${row.id}`)}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa')}
                    >
                      <td style={{ padding: '11px 16px', fontWeight: 800, color: '#170e5e', fontFamily: 'monospace', fontSize: '0.86rem' }}>
                        {row.container_number}
                      </td>
                      <td style={{ padding: '11px 16px', fontWeight: 600, color: '#0f172a' }}>
                        {row.supplier_name || 'غير محدد'}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        {getStatusBadge(row.status)}
                      </td>
                      <td style={{ padding: '11px 16px', color: '#475569', fontFamily: 'monospace' }}>
                        {row.arrival_date || '—'}
                      </td>
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                        ${Number(row.shipping_cost_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(Number(row.customs_cost_egp || 0))}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/import-sales/shipments/${row.id}`);
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            height: '26px',
                          }}
                        >
                          التفاصيل
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <NewShipmentDialog 
        open={isNewShipmentOpen} 
        onClose={() => setIsNewShipmentOpen(false)} 
      />
    </div>
  );
}

