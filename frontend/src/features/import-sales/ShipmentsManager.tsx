import { useTranslation } from 'react-i18next';
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
  DownloadIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { downloadExcelFile } from '@/lib/browser';

export default function ShipmentsManager() {
  const { t } = useTranslation();
  const { data, isLoading, refetch, isRefetching } = useShipmentsQuery();
  const navigate = useNavigate();
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false);

  const seaCount = data?.stats?.sea || 0;
  const customsCount = data?.stats?.customs || 0;
  const arrivedCount = data?.stats?.arrived || 0;
  const rows = data?.rows || [];

  const handleExportExcel = async () => {
    if (!rows.length) return;
    try {
      const headers = [
        'رقم الحاوية',
        'المصنع / المورد',
        'حالة الشحنة',
        'تاريخ الوصول',
        'تكلفة الشحن بالدولار ($)',
        'الجمارك والمصاريف (ج.م)',
        'سعر الصرف عند الوصول',
        'بوليصة الشحن (B/L)',
      ];
      const exportRows = rows.map((r: any) => [
        r.container_number,
        r.supplier_name || 'غير محدد',
        r.status === 'Pending' ? 'في البحر' : r.status === 'In Customs' ? 'في الجمارك' : r.status === 'Arrived' ? 'تم الوصول للمخزن' : r.status,
        r.arrival_date ? r.arrival_date.split('T')[0] : '—',
        Number(r.shipping_cost_usd || 0),
        Number(r.customs_cost_egp || 0),
        Number(r.exchange_rate_at_arrival || 1),
        r.bill_of_lading || '—',
      ]);
      await downloadExcelFile('قائمة_حاويات_وشحنات_الاستيراد.xlsx', headers, exportRows);
      toast.success('تم تصدير قائمة الشحنات إلى ملف إكسل بنجاح');
    } catch (err: any) {
      toast.error('فشل تصدير الإكسل: ' + (err?.message || 'خطأ'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <span style={{ fontSize: '0.74rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            {t('import_sales.shipments_manager.s0', "في البحر (شحن بحري)")}
          </span>
        );
      case 'In Customs':
        return (
          <span style={{ fontSize: '0.74rem', background: '#fefce8', color: '#a16207', border: '1px solid #fef08a', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            {t('import_sales.shipments_manager.s1', "في الجمارك (تخليص)")}
          </span>
        );
      case 'Arrived':
        return (
          <span style={{ fontSize: '0.74rem', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            {t('import_sales.shipments_manager.s2', "تم الوصول للمخزن")}
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '0.74rem', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            {status || t('import_sales.shipments_manager.s3', "غير محدد")}
          </span>
        );
    }
  };

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader 
          title={t('import_sales.shipments_manager.s4', "إدارة الحاويات والشحنات المستوردة")} 
          description={t('import_sales.shipments_manager.s5', "متابعة حركة الحاويات من بلد المنشأ والمصنع حتى الوصول للمخازن، وتوزيع تكاليف الشحن والجمارك.")}
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
                <span>{t('import_sales.shipments_manager.s6', "إضافة حاوية جديدة")}</span>
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleExportExcel}
                disabled={isLoading || rows.length === 0}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: '#bbf7d0',
                  color: '#15803d',
                }}
              >
                <DownloadIcon size={15} />
                <span>تصدير إكسل</span>
              </Button>
              <Button 
                variant="secondary" 
                onClick={async () => {
                  try {
                    await refetch();
                    toast.success(t('import_sales.shipments_manager.s7', "تم تحديث قائمة الحاويات والمؤشرات بنجاح"), undefined, 2000);
                  } catch (err) {
                    toast.error(t('import_sales.shipments_manager.s8', "فشل تحديث البيانات"));
                  }
                }}
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
                <RefreshCwIcon
                  size={15}
                  style={{ animation: isRefetching ? 'spin 0.7s linear infinite' : 'none' }}
                />
                <span>{isRefetching ? t('import_sales.shipments_manager.s9', "جارٍ التحديث...") : t('import_sales.shipments_manager.s10', "تحديث")}</span>
              </Button>
            </div>
          } 
        />

        {/* KPI Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '8px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.shipments_manager.s11', "حاويات في البحر (قيد الإبحار)")}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {seaCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.shipments_manager.s12', "حاوية")}</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
              <GlobeIcon size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.shipments_manager.s13', "حاويات في مرحلة التخليص الجمركي")}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {customsCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.shipments_manager.s14', "حاوية")}</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a16207' }}>
              <BuildingIcon size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.shipments_manager.s15', "حاويات مكتملة التكلفة بالمخازن")}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {arrivedCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{t('import_sales.shipments_manager.s16', "حاوية")}</span>
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
                {t('import_sales.shipments_manager.s17', "قائمة الحاويات والشحنات")}
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                {t('import_sales.shipments_manager.s18', "انقر على أي حاوية لاستعراض بنود البضاعة وتفاصيل التكاليف وحساب تكلفة الوحدة")}
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
              {rows.length} {t('import_sales.shipments_manager.s19', "حاوية")}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}>
                  <th style={{ padding: '10px 16px', width: '160px' }}>{t('import_sales.shipments_manager.s20', "رقم الحاوية")}</th>
                  <th style={{ padding: '10px 16px', minWidth: '160px' }}>{t('import_sales.shipments_manager.s21', "المصنع / المورد")}</th>
                  <th style={{ padding: '10px 16px', width: '150px' }}>{t('import_sales.shipments_manager.s22', "حالة الشحنة")}</th>
                  <th style={{ padding: '10px 16px', width: '120px' }}>{t('import_sales.shipments_manager.s23', "تاريخ الوصول")}</th>
                  <th style={{ padding: '10px 16px', width: '140px' }}>{t('import_sales.shipments_manager.s24', "تكلفة الشحن ($)")}</th>
                  <th style={{ padding: '10px 16px', width: '140px' }}>{t('import_sales.shipments_manager.s25', "الجمارك والمصاريف")}</th>
                  <th style={{ padding: '10px 16px', width: '110px', textAlign: 'center' }}>{t('import_sales.shipments_manager.s26', "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      {t('import_sales.shipments_manager.s27', "جاري تحميل بيانات الحاويات...")}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', color: '#94a3b8' }}>
                        <FileTextIcon size={22} />
                      </div>
                      <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.88rem' }}>{t('import_sales.shipments_manager.s28', "لا توجد حاويات مسجلة بعد")}</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>{t('import_sales.shipments_manager.s29', "اضغط على «إضافة حاوية جديدة» لبدء تسجيل وتتبع الشحنات المستوردة.")}</div>
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
                        {row.supplier_name || t('import_sales.shipments_manager.s30', "غير محدد")}
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
                          {t('import_sales.shipments_manager.s31', "التفاصيل")}
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

