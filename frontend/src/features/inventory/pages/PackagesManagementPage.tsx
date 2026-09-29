import { useState, useEffect, useMemo, type FC } from 'react';
import {
  warehousePackagesApi,
  type WarehousePackageRecord,
} from '../api/warehouse-packages.api';
import { CreatePackageModal } from '../components/CreatePackageModal';
import { PackageDetailsModal } from '../components/PackageDetailsModal';
import { toast } from '@/shared/components/system-alert';
import {
  PlusIcon,
  PackageIcon,
  SearchIcon,
  LayersIcon,
  EyeIcon,
} from '@/shared/components/icons/AppIcons';

export const PackagesManagementPage: FC = () => {
  const [packages, setPackages] = useState<WarehousePackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'pallet' | 'box'>('all');
  const [statusFilter] = useState<'all' | 'sealed' | 'opened'>('all');
  const [search, setSearch] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const data = await warehousePackagesApi.list({
        packageType: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setPackages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل بيانات الطرود');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPackages();
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    setSelectedPackageId(scanInput.trim());
    setScanInput('');
  };

  const kpis = useMemo(() => {
    const pallets = packages.filter((p) => p.package_type === 'pallet').length;
    const boxes = packages.filter((p) => p.package_type !== 'pallet').length;
    const sealed = packages.filter((p) => p.status === 'sealed').length;
    const opened = packages.filter((p) => p.status === 'opened').length;
    return { pallets, boxes, sealed, opened };
  }, [packages]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sealed':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>مختوم</span>;
      case 'opened':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#fef3c7', color: '#b45309' }}>مفتوح</span>;
      case 'shipped':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#e0e7ff', color: '#3730a3' }}>تم الشحن</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          background: type === 'pallet' ? '#f5f3ff' : '#f8fafc',
          color: type === 'pallet' ? '#6d28d9' : '#334155',
          border: '1px solid #e2e8f0',
        }}
      >
        <LayersIcon size={12} />
        {type === 'pallet' ? 'طبلية خشبية (Pallet)' : type === 'carton' ? 'كرتونة مجمعة' : 'صندوق (Box)'}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1280px', width: 'min(100%, 1280px)', margin: '0 auto', padding: '24px 16px' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            إدارة الطرود والتعبئة متعددة الطبقات والطبليات (Pack-in-Pack & Pallets)
          </h1>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
            ترميز الطبليات والكراتين، تتبع التعبئة المتداخلة الهرمية، وقراءة محتويات الطرود بالباركود
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={16} />
            طرد / بالتة جديدة
          </button>
        </div>
      </div>

      {/* Barcode Quick Scan Bar */}
      <div
        style={{
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #cbd5e1',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#170e5e', fontWeight: 700, fontSize: '13.5px' }}>
          <PackageIcon size={18} />
          مسح باركود الطرد السريع (Scanner):
        </div>
        <form onSubmit={handleBarcodeScan} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="امسح بقارئ الباركود أو اكتب كود الطرد (مثال: PAL-260930-0001)..."
            style={{ flex: 1, height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
          <button
            type="submit"
            style={{
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            استعلام المحتويات
          </button>
        </form>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '4px' }}>إجمالي الطبليات (Pallets)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#6d28d9' }}>{kpis.pallets}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '4px' }}>إجمالي الصناديق والكراتين</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{kpis.boxes}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '4px' }}>طرود مختومة وسليمة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>{kpis.sealed}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '4px' }}>طرود مفتوحة / تحت الفحص</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }}>{kpis.opened}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: 'كافة الطرود' },
            { id: 'pallet', label: 'الطبليات فقط' },
            { id: 'box', label: 'الصناديق والكراتين' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: typeFilter === tab.id ? '#170e5e' : '#e2e8f0',
                background: typeFilter === tab.id ? '#170e5e' : '#ffffff',
                color: typeFilter === tab.id ? '#ffffff' : '#475569',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="بحث برقم الطرد، ملاحظات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '220px', height: '34px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
          <button
            type="submit"
            style={{ padding: '0 12px', height: '34px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
          >
            <SearchIcon size={15} />
          </button>
        </form>
      </div>

      {/* Packages Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>جاري تحميل الطرود المخزنية...</div>
        ) : packages.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
            <PackageIcon size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div style={{ fontWeight: 600, fontSize: '14px' }}>لا توجد طرود مسجلة حالياً</div>
            <div style={{ fontSize: '12.5px', marginTop: '4px' }}>اضغط على "طرد / بالتة جديدة" لتجهيز وترميز أول شحنة</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>باركود الطرد</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>المستوى والنوع</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>الطرد الحاوي</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>أصناف مباشرة</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>طرود فرعية</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>الوزن القائم</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>الحالة</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      {pkg.package_number}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getTypeBadge(pkg.package_type)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {pkg.parent_package_number ? (
                        <span style={{ fontWeight: 600, color: '#170e5e' }}>{pkg.parent_package_number}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>رئيسي</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        {pkg.itemsCount} صنف ({pkg.totalQuantity} وحدة)
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {pkg.childrenCount > 0 ? (
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          {pkg.childrenCount} طرد
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {pkg.gross_weight_kg ? `${pkg.gross_weight_kg} كجم` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(pkg.status)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedPackageId(pkg.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#1e293b',
                          cursor: 'pointer',
                        }}
                      >
                        <EyeIcon size={14} />
                        معاينة وتفكيك
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreatePackageModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchPackages}
        existingPackages={packages}
      />

      <PackageDetailsModal
        open={!!selectedPackageId}
        onClose={() => setSelectedPackageId(null)}
        packageIdentifier={selectedPackageId}
        onUpdated={fetchPackages}
      />
    </div>
  );
};
