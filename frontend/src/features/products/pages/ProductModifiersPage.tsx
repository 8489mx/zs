import { useState, useEffect, type FC } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';
import {
  addonsApi,
  ModifierGroup,
  ModifierOption,
} from '@/shared/api/addons.api';

export const ProductModifiersPage: FC = () => {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formSelectionType, setFormSelectionType] = useState<'single' | 'multiple'>('multiple');
  const [formIsMandatory, setFormIsMandatory] = useState(false);
  const [formMinSelections, setFormMinSelections] = useState(0);
  const [formMaxSelections, setFormMaxSelections] = useState(10);
  const [formOptions, setFormOptions] = useState<ModifierOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await addonsApi.listModifierGroups();
      setGroups(res || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormName('');
    setFormNameEn('');
    setFormSelectionType('multiple');
    setFormIsMandatory(false);
    setFormMinSelections(0);
    setFormMaxSelections(10);
    setFormOptions([
      { name: '', price: 0, costPrice: 0, isDefault: false, isActive: true },
    ]);
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: ModifierGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormNameEn(group.nameEn || '');
    setFormSelectionType(group.selectionType);
    setFormIsMandatory(group.isMandatory);
    setFormMinSelections(group.minSelections);
    setFormMaxSelections(group.maxSelections);
    setFormOptions(group.options?.length ? [...group.options] : [{ name: '', price: 0, costPrice: 0, isDefault: false, isActive: true }]);
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  const handleAddOptionRow = () => {
    setFormOptions([...formOptions, { name: '', price: 0, costPrice: 0, isDefault: false, isActive: true }]);
  };

  const handleRemoveOptionRow = (index: number) => {
    setFormOptions(formOptions.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: keyof ModifierOption, value: any) => {
    const updated = [...formOptions];
    updated[index] = { ...updated[index], [field]: value };
    setFormOptions(updated);
  };

  const handleSaveGroup = async () => {
    if (!formName.trim()) {
      setModalFeedback({ text: 'يرجى إدخال اسم مجموعة الإضافات', error: true });
      return;
    }

    const cleanOptions = formOptions
      .filter((opt) => opt.name.trim() !== '')
      .map((opt) => ({
        ...opt,
        name: opt.name.trim(),
        price: Number(opt.price || 0),
        costPrice: Number(opt.costPrice || 0),
      }));

    if (cleanOptions.length === 0) {
      setModalFeedback({ text: 'يرجى إضافة خيار واحد على الأقل داخل المجموعة', error: true });
      return;
    }

    setSaving(true);
    setModalFeedback(null);
    try {
      const payload = {
        name: formName.trim(),
        nameEn: formNameEn.trim() || undefined,
        selectionType: formSelectionType,
        isMandatory: formIsMandatory,
        minSelections: formMinSelections,
        maxSelections: formMaxSelections,
        options: cleanOptions,
      };

      if (editingGroup) {
        await addonsApi.updateModifierGroup(editingGroup.id, payload);
      } else {
        await addonsApi.createModifierGroup(payload);
      }

      setIsModalOpen(false);
      loadGroups();
    } catch (err: any) {
      setModalFeedback({ text: err?.message || 'تعذر حفظ مجموعة الإضافات', error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة وكافة خياراتها؟')) return;
    try {
      await addonsApi.deleteModifierGroup(id);
      loadGroups();
    } catch (err: any) {
      alert(err?.message || 'تعذر حذف المجموعة');
    }
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader
          title="مجموعات خيارات وإضافات الأصناف (Item Modifiers & Add-ons)"
          description="إدارة مصفوفة الخيارات والإضافات ودرجات الطهي والوجبات الكومبو المدمجة فورياً مع شاشة الكاشير والمطبخ (KDS) والإيصال الحراري."
          badge={<span className="nav-pill">المطاعم ونقاط البيع</span>}
          actions={
            <button
              type="button"
              onClick={handleOpenCreate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <AppIcons.Plus size={16} />
              إضافة مجموعة خيارات جديدة (New Group)
            </button>
          }
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
            جاري تحميل مجموعات الإضافات والخيارات...
          </div>
        ) : groups.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              color: '#64748b',
            }}
          >
            <AppIcons.Layers size={42} color="#94a3b8" />
            <div style={{ marginTop: '12px', fontSize: '15px', fontWeight: 700, color: '#334155' }}>
              لا توجد مجموعات خيارات معرفة حتى الآن
            </div>
            <div style={{ marginTop: '4px', fontSize: '13px', color: '#94a3b8' }}>
              يمكنك إضافة مجموعات مثل "درجة الطهي"، "الصوصات"، "إضافات إكسترا"، أو "مكونات الوجبة الكومبو".
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {groups.map((group) => (
              <div
                key={group.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {group.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: group.selectionType === 'single' ? '#eff6ff' : '#f0fdf4',
                          color: group.selectionType === 'single' ? '#1d4ed8' : '#166534',
                        }}
                      >
                        {group.selectionType === 'single' ? 'اختيار أحادي (Single)' : 'اختيار متعدد (Multiple)'}
                      </span>
                      {group.isMandatory && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                          }}
                        >
                          إلزامي
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(group)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: '#475569',
                      }}
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.id)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: '#dc2626',
                      }}
                    >
                      حذف
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                    الخيارات المتاحة ({group.options?.length || 0}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {group.options?.map((opt) => (
                      <div
                        key={opt.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#f8fafc',
                          fontSize: '12.5px',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                          {opt.name} {opt.isDefault ? '(افتراضي)' : ''}
                        </span>
                        <span style={{ fontWeight: 700, color: Number(opt.price) > 0 ? '#059669' : '#64748b' }}>
                          {Number(opt.price) > 0 ? `+${formatCurrency(opt.price)}` : 'مجاناً'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create / Edit Group */}
        <StandardDialog
          isOpen={isModalOpen}
          onClose={() => {
            if (!saving) setIsModalOpen(false);
          }}
          title={editingGroup ? 'تعديل مجموعة الإضافات والخيارات' : 'إضافة مجموعة خيارات جديدة'}
          subtitle="تحديد نوع الاختيار، قواعد الإلزام، والخيارات الإضافية وأسعارها"
          width="620px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveGroup}
                disabled={saving || !formName.trim()}
                style={{
                  padding: '8px 22px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ المجموعة والخيارات'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }} dir="rtl">
            {modalFeedback && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  backgroundColor: modalFeedback.error ? '#fef2f2' : '#f0fdf4',
                  color: modalFeedback.error ? '#991b1b' : '#166534',
                  border: `1px solid ${modalFeedback.error ? '#fecaca' : '#bbf7d0'}`,
                }}
              >
                {modalFeedback.text}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  اسم المجموعة بالعربية <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: درجة الطهي، الصوصات، إضافات إكسترا..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  الاسم بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="e.g. Cooking Level, Sauces..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  نوع الاختيار
                </label>
                <select
                  value={formSelectionType}
                  onChange={(e) => setFormSelectionType(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                >
                  <option value="single">اختيار أحادي (Radio - صنف واحد فقط)</option>
                  <option value="multiple">اختيار متعدد (Multiple - أكثر من خيار)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '22px' }}>
                <input
                  type="checkbox"
                  id="mandatoryCheck"
                  checked={formIsMandatory}
                  onChange={(e) => setFormIsMandatory(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="mandatoryCheck" style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                  اختيار إلزامي قبل إضافة الصنف للسلة
                </label>
              </div>
            </div>

            {/* Options List Builder */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  قائمة الخيارات والإضافات في هذه المجموعة
                </label>
                <button
                  type="button"
                  onClick={handleAddOptionRow}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: '1px solid #170e5e',
                    backgroundColor: '#f8fafc',
                    color: '#170e5e',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + إضافة خيار
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {formOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => handleOptionChange(idx, 'name', e.target.value)}
                      placeholder="اسم الخيار (مثل: جبنة إضافية)..."
                      style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={opt.price}
                      onChange={(e) => handleOptionChange(idx, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="السعر الإضافي..."
                      style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(opt.isDefault)}
                        onChange={(e) => handleOptionChange(idx, 'isDefault', e.target.checked)}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>افتراضي</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionRow(idx)}
                      disabled={formOptions.length <= 1}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        cursor: formOptions.length > 1 ? 'pointer' : 'not-allowed',
                        opacity: formOptions.length > 1 ? 1 : 0.4,
                      }}
                    >
                      <AppIcons.Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </StandardDialog>
      </main>
    </div>
  );
};
