import { useState, useEffect, type FC } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { AppIcons, PlusIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';
import { priceListsApi, PriceList, UpsertPriceListPayload } from '../api/price-lists.api';
import { PriceListModal } from '../components/price-lists/PriceListModal';
import { PriceListCard } from '../components/price-lists/PriceListCard';

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

  const filteredLists = priceLists.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-stack page-shell price-lists-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader
          title="قوائم الأسعار وشرائح العملاء (Customer Price Lists)"
          description="إدارة قوائم أسعار الجملة، الموزعين، والخصومات المتدرجة حسب كمية الشراء (Volume Tiers)"
          badge={<span className="nav-pill">المبيعات والتسعير</span>}
          actions={
            <Button
              variant="primary"
              onClick={openCreateModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#170e5e',
                borderColor: '#170e5e',
                fontWeight: 700,
              }}
            >
              <PlusIcon size={16} />
              إنشاء قائمة أسعار جديدة
            </Button>
          }
        />

        {/* Control Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="بحث باسم أو كود القائمة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                paddingInlineStart: '36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: 'var(--font-body)',
              }}
            />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <AppIcons.Search size={16} />
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--font-table-head)', color: '#64748b' }}>
              إجمالي القوائم: <strong>{priceLists.length}</strong>
            </span>
          </div>
        </div>

        {/* Grid of Price Lists */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            جاري تحميل قوائم الأسعار...
          </div>
        ) : filteredLists.length === 0 ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#170e5e', marginBottom: '16px' }}>
              <AppIcons.Tag size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              لا توجد قوائم أسعار مسجلة
            </h3>
            <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '480px', margin: '0 auto 20px' }}>
              أنشئ قوائم أسعار مخصصة لجملة وموزعي المحل مع تحديد خصومات تلقائية وشرائح كميات متدرجة.
            </p>
            <button
              onClick={openCreateModal}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + إضافة أول قائمة أسعار
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredLists.map((list) => (
              <PriceListCard
                key={list.id}
                list={list}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

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
      </main>
    </div>
  );
};
