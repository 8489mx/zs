import { useState, useEffect, type FC } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { AppIcons, PlusIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { priceListsApi, PriceList, UpsertPriceListPayload, PriceListItem } from '../api/price-lists.api';

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

  const [newItem, setNewItem] = useState<{
    product_name: string;
    min_quantity: number;
    fixed_price: string;
    discount_percent: string;
  }>({
    product_name: '',
    min_quantity: 1,
    fixed_price: '',
    discount_percent: '',
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
    setNewItem({ product_name: '', min_quantity: 1, fixed_price: '', discount_percent: '' });
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

  const addItemToRule = () => {
    if (!newItem.product_name.trim()) return;
    const item: PriceListItem = {
      product_name: newItem.product_name.trim(),
      min_quantity: Number(newItem.min_quantity) || 1,
      fixed_price: newItem.fixed_price ? Number(newItem.fixed_price) : null,
      discount_percent: newItem.discount_percent ? Number(newItem.discount_percent) : null,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), item],
    }));
    setNewItem({ product_name: '', min_quantity: 1, fixed_price: '', discount_percent: '' });
  };

  const removeItem = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== idx),
    }));
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
            <div
              key={list.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {list.name}
                      </h3>
                      {list.is_default && (
                        <span
                          style={{
                            fontSize: 'var(--font-micro)',
                            backgroundColor: '#e0e7ff',
                            color: '#170e5e',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          افتراضية
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontFamily: 'monospace' }}>
                      كود: {list.code}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 'var(--font-badge)',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      backgroundColor: list.is_active ? '#dcfce7' : '#fee2e2',
                      color: list.is_active ? '#166534' : '#991b1b',
                    }}
                  >
                    {list.is_active ? 'نشطة' : 'معطلة'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>الخصم العام</div>
                    <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                      {list.default_discount_percent > 0 ? `${list.default_discount_percent}%` : 'لا يوجد'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>قواعد الأصناف</div>
                    <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                      {list.items_count || 0} صنف/شريحة
                    </div>
                  </div>
                </div>

                {list.notes && (
                  <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', marginBottom: '14px', lineHeight: 1.4 }}>
                    {list.notes}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button
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
                  }}
                >
                  <AppIcons.Edit size={14} /> تعديل
                </button>
                <button
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
                  }}
                >
                  <AppIcons.Trash size={14} /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upsert Modal */}
      {isModalOpen && (
        <StandardDialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingList ? 'تعديل قائمة الأسعار' : 'إنشاء قائمة أسعار جديدة'}
          maxWidth="720px"
        >
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  اسم القائمة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أسعار كبار الموزعين VIP"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  كود القائمة (إنجليزي) *
                </label>
                <input
                  type="text"
                  placeholder="مثال: WHOLESALE_VIP"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  نسبة الخصم العام الافتراضية (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.default_discount_percent}
                  onChange={(e) => setFormData({ ...formData, default_discount_percent: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-body)' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  />
                  قائمة افتراضية للعملاء
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-body)' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  نشطة
                </label>
              </div>
            </div>

            {/* Volume Tiers & Specific Item Rules */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                شرائح الكميات وأسعار الأصناف المحددة
              </h4>
              <p style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginBottom: '12px' }}>
                حدد أسعاراً خاصة أو خصومات عند شراء كميات أكبر من حد أدنى معين (مثال: خصم 10% عند شراء 10 قطع فأكثر).
              </p>

              {/* Add item row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px' }}>اسم الصنف</label>
                  <input
                    type="text"
                    placeholder="مثال: شاي العروسة 250جم"
                    value={newItem.product_name}
                    onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px' }}>الحد الأدنى للكمية</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.min_quantity}
                    onChange={(e) => setNewItem({ ...newItem, min_quantity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px' }}>سعر ثابت</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="اختياري"
                    value={newItem.fixed_price}
                    onChange={(e) => setNewItem({ ...newItem, fixed_price: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px' }}>أو خصم %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="%"
                    value={newItem.discount_percent}
                    onChange={(e) => setNewItem({ ...newItem, discount_percent: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={addItemToRule}
                  style={{
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 'var(--font-table-head)',
                  }}
                >
                  + إضافة
                </button>
              </div>

              {/* Items Table */}
              {formData.items && formData.items.length > 0 && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>الصنف</th>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>الحد الأدنى</th>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>السعر المحدد</th>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>نسبة الخصم</th>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a' }}>{it.product_name}</td>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a' }}>{it.min_quantity} قطعة+</td>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a' }}>{it.fixed_price != null ? `${it.fixed_price} ج.م` : '-'}</td>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a' }}>{it.discount_percent != null ? `${it.discount_percent}%` : '-'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', padding: '2px' }}
                            >
                              <AppIcons.Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'var(--font-body)',
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '9px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'var(--font-body)',
                }}
              >
                {saving ? 'جاري الحفظ...' : editingList ? 'حفظ التعديلات' : 'إنشاء القائمة'}
              </button>
            </div>
          </form>
        </StandardDialog>
      )}
      </main>
    </div>
  );
};
