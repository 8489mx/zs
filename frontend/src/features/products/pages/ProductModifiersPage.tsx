import { useState, useEffect, type FC } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';
import {
  addonsApi,
  ModifierGroup,
  ModifierOption,
} from '@/shared/api/addons.api';
import { ModifierGroupCard } from '@/features/products/components/modifiers/ModifierGroupCard';
import { ModifierGroupModal } from '@/features/products/components/modifiers/ModifierGroupModal';

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
      <div className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title="مجموعات خيارات وإضافات الأصناف (Item Modifiers & Add-ons)"
          description="إدارة مصفوفة الخيارات والإضافات ودرجات الطهي والوجبات الكومبو المدمجة فورياً مع شاشة الكاشير والمطبخ (KDS) والإيصال الحراري."
          badge={<span className="nav-pill">المطاعم ونقاط البيع</span>}
          actions={
            <Button
              variant="primary"
              onClick={handleOpenCreate}
            >
              <AppIcons.Plus size={16} />
              إضافة مجموعة خيارات جديدة
            </Button>
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
              <ModifierGroupCard
                key={group.id}
                group={group}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteGroup}
              />
            ))}
          </div>
        )}

        <ModifierGroupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingGroup={editingGroup}
          formName={formName}
          setFormName={setFormName}
          formNameEn={formNameEn}
          setFormNameEn={setFormNameEn}
          formSelectionType={formSelectionType}
          setFormSelectionType={setFormSelectionType}
          formIsMandatory={formIsMandatory}
          setFormIsMandatory={setFormIsMandatory}
          formOptions={formOptions}
          onAddOptionRow={handleAddOptionRow}
          onRemoveOptionRow={handleRemoveOptionRow}
          onOptionChange={handleOptionChange}
          saving={saving}
          modalFeedback={modalFeedback}
          onSave={handleSaveGroup}
        />
      </div>
    </div>
  );
};
