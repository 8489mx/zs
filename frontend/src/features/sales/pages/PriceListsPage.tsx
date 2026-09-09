import { useState, useEffect, useMemo, type FC } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { AppIcons, PlusIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';
import { priceListsApi, PriceList, UpsertPriceListPayload } from '../api/price-lists.api';
import { PriceListModal } from '../components/price-lists/PriceListModal';

export const PriceListsPage: FC = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<PriceList | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UpsertPriceListPayload>({
    name: '',
    code: '',
    currency: 'EGP',
    type: 'percentage',
    default_discount_percent: 0,
    is_default: false,
    is_active: true,
    notes: '',
    items: [],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await priceListsApi.list();
      setPriceLists(data);
    } catch (err) {
      console.error('Failed to load price lists', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingList(null);
    setFormData({
      name: '',
      code: '',
      currency: 'EGP',
      type: 'percentage',
      default_discount_percent: 0,
      is_default: false,
      is_active: true,
      notes: '',
      items: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (list: PriceList) => {
    try {
      setLoading(true);
      const full = await priceListsApi.getOne(list.id);
      setEditingList(full);
      setFormData({
        name: full.name,
        code: full.code,
        currency: full.currency,
        type: full.type,
        default_discount_percent: full.default_discount_percent,
        is_default: full.is_default,
        is_active: full.is_active,
        notes: full.notes || '',
        items: full.items || [],
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to load price list details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);
      if (editingList) {
        await priceListsApi.update(editingList.id, formData);
      } else {
        await priceListsApi.create(formData);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save price list', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف قائمة الأسعار هذه؟ سيتم فك ارتباط أي عميل مرتبط بها.')) return;
    try {
      await priceListsApi.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete price list', err);
    }
  };

  const filteredLists = useMemo(() => {
    if (!search.trim()) return priceLists;
    const q = search.trim().toLowerCase();
    return priceLists.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [priceLists, search]);

  const stats = useMemo(() => [
    { key: 'total', label: 'إجمالي قوائم الأسعار', value: String(priceLists.length) },
    { key: 'active', label: 'القوائم المفعلة للبيع', value: String(priceLists.filter((l) => l.is_active).length) },
    { key: 'default', label: 'القائمة الافتراضية للنظام', value: priceLists.find((l) => l.is_default)?.name || 'غير محددة' },
    { key: 'items', label: 'إجمالي الشرائح والقواعد', value: `${priceLists.reduce((acc, l) => acc + (Number(l.items_count) || 0), 0)} قاعدة` },
  ], [priceLists]);

  return (
    <div className="page-stack page-shell price-lists-workspace" dir="rtl">
      <div className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title="قوائم الأسعار وشرائح العملاء (Customer Price Lists)"
          description="إدارة قوائم أسعار الجملة، الموزعين، والخصومات المتدرجة حسب كمية الشراء (Volume Tiers)"
          badge={<span className="nav-pill">المبيعات والتسعير</span>}
          actions={
            <Button
              variant="primary"
              onClick={openCreateModal}
            >
              <PlusIcon size={16} />
              إنشاء قائمة أسعار جديدة
            </Button>
          }
        />

        <StatsGrid items={stats} />

        <section className="document-prototype-section">
          <div className="section-header-compact-row" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 800, color: '#0f172a' }}>
              قوائم الأسعار المعرفة ({filteredLists.length})
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <input
                  type="text"
                  placeholder="بحث باسم أو كود القائمة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    paddingInlineStart: '32px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: 'var(--font-body)',
                    outline: 'none',
                  }}
                />
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                  <AppIcons.Search size={15} />
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>كود القائمة</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>اسم القائمة</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>العملة ونوع التسعير</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>الخصم العام</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>الأصناف والشرائح</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      جاري تحميل قوائم الأسعار...
                    </td>
                  </tr>
                ) : filteredLists.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', padding: '14px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#170e5e', marginBottom: '12px' }}>
                        <AppIcons.Tag size={32} />
                      </div>
                      <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                        لا توجد قوائم أسعار مسجلة
                      </div>
                      <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '440px', margin: '0 auto 16px' }}>
                        أنشئ قوائم أسعار مخصصة لجملة وموزعي المحل مع تحديد خصومات تلقائية وشرائح كميات متدرجة.
                      </div>
                      <Button variant="primary" onClick={openCreateModal}>
                        <PlusIcon size={16} />
                        إنشاء أول قائمة أسعار
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredLists.map((list) => (
                    <tr key={list.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#170e5e', fontFamily: 'monospace' }}>
                        {list.code}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{list.name}</span>
                          {list.is_default && (
                            <span style={{ fontSize: 'var(--font-micro)', backgroundColor: '#e0e7ff', color: '#170e5e', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              افتراضية
                            </span>
                          )}
                        </div>
                        {list.notes && (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px' }}>
                            {list.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 'var(--font-body)', color: '#475569' }}>
                        {list.currency} ({list.type === 'percentage' ? 'نسبة مئوية' : list.type === 'fixed_override' ? 'سعر مخصص' : 'هامش ربح'})
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                        {list.default_discount_percent > 0 ? `${list.default_discount_percent}%` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 'var(--font-body)' }}>
                        <span style={{ fontWeight: 700, color: '#170e5e' }}>{list.items_count || 0}</span> صنف / شريحة
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: 'var(--font-badge)',
                            fontWeight: 700,
                            backgroundColor: list.is_active ? '#dcfce7' : '#fee2e2',
                            color: list.is_active ? '#166534' : '#991b1b',
                          }}
                        >
                          {list.is_active ? 'نشطة' : 'معطلة'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(list)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              color: '#334155',
                              fontSize: 'var(--font-table-head)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          >
                            <AppIcons.Edit size={14} /> تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(list.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              fontSize: 'var(--font-table-head)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          >
                            <AppIcons.Trash size={14} /> حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isModalOpen && (
          <PriceListModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            editingList={editingList}
            formData={formData}
            setFormData={setFormData}
            saving={saving}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
};
