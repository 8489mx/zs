import React, { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import {
  PackageIcon,
  LayersIcon,
  Trash2Icon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';
import {
  warehousePackagesApi,
  type PackageHierarchyNode,
} from '../api/warehouse-packages.api';

interface PackageDetailsModalProps {
  open: boolean;
  onClose: () => void;
  packageIdentifier: string | null;
  onUpdated: () => void;
}

export const PackageDetailsModal: React.FC<PackageDetailsModalProps> = ({
  open,
  onClose,
  packageIdentifier,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<{
    package: any;
    tree: PackageHierarchyNode;
    aggregatedContents: Array<{ productId: number; productName?: string; totalQuantity: number }>;
  } | null>(null);

  const fetchDetails = async () => {
    if (!packageIdentifier) return;
    setLoading(true);
    try {
      const data = await warehousePackagesApi.getDetails(packageIdentifier);
      setDetails(data);
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل بيانات الطرد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && packageIdentifier) {
      fetchDetails();
    }
  }, [open, packageIdentifier]);

  const handleUnpackAll = async () => {
    if (!details?.package?.id) return;
    const confirmed = await systemConfirm({
      title: 'فك وتفكيك الطرد بالكامل (Unpack Entire Package)',
      message: 'هل أنت متأكد من تفكيك محتويات الطرد وفصل كافة الكراتين والوحدات المعبأة داخله وإعادتها للمخزون المباشر؟',
      confirmText: 'تفكيك وإفراغ',
      cancelText: 'إلغاء',
    });
    if (!confirmed) return;

    try {
      await warehousePackagesApi.unpack(details.package.id, { action: 'unpack_all' });
      toast.success('تم تفكيك وإفراغ الطرد بنجاح');
      onUpdated();
      fetchDetails();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تفكيك الطرد');
    }
  };

  const handleStatusChange = async (newStatus: 'sealed' | 'opened' | 'shipped') => {
    if (!details?.package?.id) return;
    try {
      await warehousePackagesApi.updateStatus(details.package.id, newStatus);
      toast.success('تم تحديث حالة الطرد بنجاح');
      onUpdated();
      fetchDetails();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث الحالة');
    }
  };

  const renderTree = (node: PackageHierarchyNode, depth = 0) => {
    return (
      <div
        key={node.id}
        style={{
          borderRight: depth > 0 ? '2px solid #cbd5e1' : 'none',
          paddingRight: depth > 0 ? '14px' : '0',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: depth === 0 ? '#f1f5f9' : '#ffffff',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayersIcon size={16} color="#170e5e" />
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
              {node.packageNumber}
            </span>
            <span style={{ fontSize: '11.5px', background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px' }}>
              {node.packageType === 'pallet' ? 'طبلية' : node.packageType === 'carton' ? 'كرتونة' : 'صندوق'}
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              (الحالة: {node.status === 'sealed' ? 'مختوم' : node.status === 'opened' ? 'مفتوح' : node.status})
            </span>
          </div>

          <div style={{ fontSize: '12px', color: '#475569' }}>
            {node.items.length} أصناف مباشرة {node.children && node.children.length > 0 && `| ${node.children.length} طرود فرعية`}
          </div>
        </div>

        {/* Node direct items */}
        {node.items.length > 0 && (
          <div style={{ paddingRight: '20px', marginTop: '6px' }}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {node.items.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '12.5px',
                    color: '#334155',
                    padding: '4px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px dashed #e2e8f0',
                  }}
                >
                  <span>{item.productName || `صنف #${item.productId}`}</span>
                  <span style={{ fontWeight: 600 }}>{item.quantity} {item.unitName || 'قطعة'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recursive Children */}
        {node.children && node.children.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {node.children.map((child) => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={details?.package ? `تفاصيل الطرد: ${details.package.package_number}` : 'بيانات الطرد'}
      subtitle="المعاينة الهرمية لتسلسل التعبئة ومجموع المحتويات التراكمي"
      size="lg"
    >
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>جاري استرجاع بيانات الطرد...</div>
      ) : !details ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>لم يتم العثور على الطرد</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
          {/* Header Info Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>رقم / باركود الطرد</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{details.package.package_number}</div>
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>النوع</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#170e5e' }}>
                {details.package.package_type === 'pallet' ? 'طبلية خشبية (Pallet)' : 'صندوق / كرتونة'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>الحالة</div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>
                {details.package.status === 'sealed' ? 'مختوم ومحكم' : details.package.status === 'opened' ? 'مفتوح' : details.package.status}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>الوزن القائم (Gross)</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                {details.package.gross_weight_kg ? `${details.package.gross_weight_kg} كجم` : '—'}
              </div>
            </div>
          </div>

          {/* Aggregated Contents Summary */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#ffffff' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
              إجمالي المحتويات التراكمي في هذا الطرد (شاملاً كافة الصناديق الفرعية)
            </h4>
            {details.aggregatedContents.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '12.5px' }}>لا توجد أصناف معبأة داخل هذا الطرد</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <th style={{ padding: '8px 12px' }}>اسم الصنف</th>
                    <th style={{ padding: '8px 12px', width: '150px' }}>إجمالي الكمية الصافية</th>
                  </tr>
                </thead>
                <tbody>
                  {details.aggregatedContents.map((prod, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                        {prod.productName || `صنف #${prod.productId}`}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: '#16a34a' }}>
                        {prod.totalQuantity} وحدة
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Nested Hierarchy Tree */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#fafafa' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
              الهيكل الشجري للطرد والطرود الفرعية (Pack-in-Pack Hierarchy)
            </h4>
            {renderTree(details.tree)}
          </div>

          {/* Controls Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {details.package.status === 'opened' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('sealed')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #86efac',
                    background: '#f0fdf4',
                    color: '#15803d',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  إعادة الختم (Seal Package)
                </button>
              )}
              {details.package.status === 'sealed' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('opened')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  فتح الطرد (Open Package)
                </button>
              )}
            </div>

            {details.package.status !== 'shipped' && details.package.status !== 'consumed' && (
              <button
                type="button"
                onClick={handleUnpackAll}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Trash2Icon size={14} />
                تفكيك وإفراغ الطرد بالكامل
              </button>
            )}
          </div>
        </div>
      )}
    </StandardDialog>
  );
};
