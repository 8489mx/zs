import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyDrug } from '../types/pharmacy.types';
import { DOSAGE_FORMS, MAJOR_PHARMA_COMPANIES, DRUG_CLASSES } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';
import { GenericSubstitutesModal } from '../components/GenericSubstitutesModal';
import {
  IconPill,
  IconShield,
  IconBox,
  IconSparkles,
  IconPlus,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconSave,
} from '../components/PharmacyIcons';

// Popular drug templates for 1-click superfast entry
const QUICK_DRUG_PRESETS = [
  { trade_name: 'Panadol Extra 500mg', trade_name_ar: 'بنادول اكسترا', active_ingredient: 'Paracetamol + Caffeine', active_ingredient_ar: 'باراسيتامول + كافيين', dosage_form: 'أقراص (Tablets)', strength: '500mg/65mg', manufacturer: 'GSK', units_per_box: 2, unit_name: 'شريط', box_price: 45, strip_price: 22.5 },
  { trade_name: 'Augmentin 1g', trade_name_ar: 'اوجمنتين 1 جم', active_ingredient: 'Amoxicillin + Clavulanic Acid', active_ingredient_ar: 'اموكسيسيلين + حمض كلافولانيك', dosage_form: 'أقراص (Tablets)', strength: '1000mg', manufacturer: 'GSK', units_per_box: 2, unit_name: 'شريط', box_price: 130, strip_price: 65 },
  { trade_name: 'Concor 5mg', trade_name_ar: 'كونكور 5 مجم', active_ingredient: 'Bisoprolol Fumarate', active_ingredient_ar: 'بيسوبرولول', dosage_form: 'أقراص (Tablets)', strength: '5mg', manufacturer: 'Merck', units_per_box: 3, unit_name: 'شريط', box_price: 85, strip_price: 28.33 },
  { trade_name: 'Antinal 200mg', trade_name_ar: 'انتينال', active_ingredient: 'Nifuroxazide', active_ingredient_ar: 'نيفوروكسازيد', dosage_form: 'كبسولات (Capsules)', strength: '200mg', manufacturer: 'Amoun', units_per_box: 2, unit_name: 'شريط', box_price: 36, strip_price: 18 },
  { trade_name: 'Brufen 600mg', trade_name_ar: 'بروفين 600', active_ingredient: 'Ibuprofen', active_ingredient_ar: 'ايبوبروفين', dosage_form: 'أقراص (Tablets)', strength: '600mg', manufacturer: 'Abbott', units_per_box: 3, unit_name: 'شريط', box_price: 60, strip_price: 20 },
  { trade_name: 'Ketofan 50mg', trade_name_ar: 'كيتوفان', active_ingredient: 'Ketoprofen', active_ingredient_ar: 'كيتوبروفين', dosage_form: 'كبسولات (Capsules)', strength: '50mg', manufacturer: 'Amriya', units_per_box: 2, unit_name: 'شريط', box_price: 28, strip_price: 14 },
];

export default function PharmacyDrugsDirectoryPage() {
  useAppToolbar([{ label: 'دليل الأدوية والبدائل' }]);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dosageFilter, setDosageFilter] = useState('all');
  const [controlledFilter, setControlledFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Drug Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Partial<PharmacyDrug> | null>(null);

  // Substitute Modal State
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [selectedSubIngredient, setSelectedSubIngredient] = useState('');
  const [selectedSubTrade, setSelectedSubTrade] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pharmacy', 'drugs', searchQuery, dosageFilter, controlledFilter, page],
    queryFn: () =>
      pharmacyApi.listDrugs({
        q: searchQuery,
        dosageForm: dosageFilter,
        controlledLevel: controlledFilter,
        page,
        pageSize: 20,
      }),
  });

  const upsertMutation = useMutation({
    mutationFn: pharmacyApi.upsertDrug,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'drugs'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
      setModalOpen(false);
      setEditingDrug(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: pharmacyApi.deleteDrug,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'drugs'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
    },
  });

  const totalItems = data?.pagination.totalItems || 0;
  const drugsList = data?.drugs || [];

  const controlledCount = drugsList.filter((d: PharmacyDrug) => d.controlled_level !== 'none').length;
  const multiStripCount = drugsList.filter((d: PharmacyDrug) => Number(d.units_per_box) > 1).length;

  const handleOpenAdd = () => {
    setEditingDrug({
      trade_name: '',
      trade_name_ar: '',
      active_ingredient: '',
      active_ingredient_ar: '',
      dosage_form: DOSAGE_FORMS[0],
      strength: '',
      manufacturer: MAJOR_PHARMA_COMPANIES[0],
      drug_class: DRUG_CLASSES[0],
      prescription_required: false,
      controlled_level: 'none',
      units_per_box: 2,
      unit_name: 'شريط',
      strip_price: 0,
      box_price: 0,
      indications: '',
      side_effects: '',
    });
    setModalOpen(true);
  };

  const handleApplyPreset = (preset: typeof QUICK_DRUG_PRESETS[0]) => {
    setEditingDrug((prev) => ({
      ...prev,
      ...preset,
      controlled_level: 'none',
    }));
  };

  const handleOpenEdit = (drug: PharmacyDrug) => {
    setEditingDrug(drug);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDrug || !editingDrug.trade_name || !editingDrug.active_ingredient) return;

    upsertMutation.mutate({
      ...editingDrug,
      box_price: Number(editingDrug.box_price || 0),
      strip_price: Number(editingDrug.strip_price || 0),
      units_per_box: Number(editingDrug.units_per_box || 1),
    });
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="دليل الأدوية والمواد الفعالة وتجزئة الشرائط"
          description="تسجيل كشوف الأدوية والمواد الفعالة، تسعير العلبة والشريط، تصنيف الجداول والرقابة الدوائية، والبحث الفوري عن البدائل"
          badge={<span className="nav-pill">{totalItems} دواء مسجل</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus size={16} />
                <span>إضافة دواء جديد</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void refetch()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh size={16} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* 4 Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي الأدوية المسجلة</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{totalItems}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <IconPill size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أدوية خاضعة لجداول الرقابة</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>{controlledCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <IconShield size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أدوية تدعم بيع الشريط</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{multiStripCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <IconBox size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>محرك البدائل السريع</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0369a1', marginTop: '4px' }}>Generics Finder</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <IconSparkles size={20} />
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className={'btn btn-sm ' + (controlledFilter === 'all' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setControlledFilter('all'); setPage(1); }}
            >
              الكل ({totalItems})
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (controlledFilter === 'none' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setControlledFilter('none'); setPage(1); }}
            >
              أدوية عادية (OTC)
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (controlledFilter === 'table_1' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setControlledFilter('table_1'); setPage(1); }}
              style={controlledFilter === 'table_1' ? { background: '#dc2626', borderColor: '#dc2626' } : {}}
            >
              جدول أول
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (controlledFilter === 'table_2' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setControlledFilter('table_2'); setPage(1); }}
              style={controlledFilter === 'table_2' ? { background: '#d97706', borderColor: '#d97706' } : {}}
            >
              جدول ثانٍ
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flex: '1 1 340px', maxWidth: '560px' }}>
            <select
              className="purchase-prototype-field-input"
              value={dosageFilter}
              onChange={(e) => { setDosageFilter(e.target.value); setPage(1); }}
              style={{ padding: '6px 10px', fontSize: '0.82rem', background: '#fff' }}
            >
              <option value="all">كل الأشكال الصيدلانية</option>
              {DOSAGE_FORMS.map((form) => (
                <option key={form} value={form}>{form}</option>
              ))}
            </select>

            <input
              type="text"
              className="purchase-prototype-field-input"
              placeholder="بحث بالاسم التجاري، المادة الفعالة، الشركة، أو الباركود..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ flex: 1, padding: '6px 12px' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '10px 14px' }}>الدواء (Trade Name)</th>
                <th style={{ padding: '10px 14px' }}>المادة الفعالة (Active Ingredient)</th>
                <th style={{ padding: '10px 14px' }}>الشكل والتركيز</th>
                <th style={{ padding: '10px 14px' }}>الشركة المصنعة</th>
                <th style={{ padding: '10px 14px' }}>سعر العلبة / الشريط</th>
                <th style={{ padding: '10px 14px' }}>الرقابة والجدول</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>جاري تحميل كشوف الأدوية...</td>
                </tr>
              ) : drugsList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>لا توجد أدوية مطابقة لبحثك</td>
                </tr>
              ) : (
                drugsList.map((drug: PharmacyDrug) => (
                  <tr key={drug.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.1s ease' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{drug.trade_name}</div>
                      {drug.trade_name_ar && <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{drug.trade_name_ar}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0284c7' }}>{drug.active_ingredient}</div>
                      {drug.active_ingredient_ar && <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{drug.active_ingredient_ar}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div>{drug.dosage_form}</div>
                      {drug.strength && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{drug.strength}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>
                      {drug.manufacturer || '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <strong style={{ color: '#16a34a' }}>{Number(drug.box_price).toFixed(2)} ج.م</strong>
                      {Number(drug.strip_price) > 0 && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {Number(drug.strip_price).toFixed(2)} ج.م / {drug.unit_name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {drug.controlled_level === 'table_1' ? (
                        <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          جدول أول
                        </span>
                      ) : drug.controlled_level === 'table_2' ? (
                        <span style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          جدول ثانٍ
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>عادي OTC</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          className="btn-sm"
                          onClick={() => {
                            setSelectedSubIngredient(drug.active_ingredient);
                            setSelectedSubTrade(drug.trade_name);
                            setSubModalOpen(true);
                          }}
                          style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <IconSparkles size={14} />
                          <span>البدائل</span>
                        </Button>
                        <Button
                          variant="secondary"
                          className="btn-sm"
                          onClick={() => handleOpenEdit(drug)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <IconEdit size={14} />
                          <span>تعديل</span>
                        </Button>
                        <Button
                          variant="danger"
                          className="btn-sm"
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف هذا الدواء من الدليل؟')) {
                              deleteMutation.mutate(drug.id);
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <IconTrash size={14} />
                          <span>حذف</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Drug Modal Form */}
        {modalOpen && editingDrug && (
          <DialogShell open={modalOpen} onClose={() => setModalOpen(false)} width="min(760px, 95vw)" ariaLabel="بيانات الدواء">
            <form onSubmit={handleSave} dir="rtl" style={{ padding: '16px 20px' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconPill size={20} color="#0284c7" />
                  <span>{editingDrug.id ? 'تعديل بيانات الدواء' : 'إضافة دواء جديد للدليل الصيدلي'}</span>
                </h3>
              </div>

              {/* 1-Click Fast Drug Template Suggestions Bar */}
              {!editingDrug.id && (
                <div style={{ background: '#eff6ff', border: '1px dashed #bfdbfe', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <IconSparkles size={14} />
                    <span>تعبئة سريعة بنقرة واحدة (أشهر الأدوية المتداولة):</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {QUICK_DRUG_PRESETS.map((preset) => (
                      <button
                        key={preset.trade_name}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        style={{
                          background: '#fff',
                          border: '1px solid #93c5fd',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#1d4ed8',
                          cursor: 'pointer',
                        }}
                      >
                        + {preset.trade_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    الاسم التجاري بالإنجليزية (Trade Name) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={editingDrug.trade_name || ''}
                    onChange={(e) => setEditingDrug({ ...editingDrug, trade_name: e.target.value })}
                    placeholder="e.g. Panadol Extra 500mg"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    الاسم التجاري بالعربية
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={editingDrug.trade_name_ar || ''}
                    onChange={(e) => setEditingDrug({ ...editingDrug, trade_name_ar: e.target.value })}
                    placeholder="مثال: بنادول اكسترا"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    المادة الفعالة (Active Ingredient) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={editingDrug.active_ingredient || ''}
                    onChange={(e) => setEditingDrug({ ...editingDrug, active_ingredient: e.target.value })}
                    placeholder="e.g. Paracetamol + Caffeine"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    المادة الفعالة بالعربية
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={editingDrug.active_ingredient_ar || ''}
                    onChange={(e) => setEditingDrug({ ...editingDrug, active_ingredient_ar: e.target.value })}
                    placeholder="مثال: باراسيتامول + كافيين"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    الشكل الصيدلي (Dosage Form)
                  </label>
                  <select
                    className="purchase-prototype-field-input"
                    value={editingDrug.dosage_form || DOSAGE_FORMS[0]}
                    onChange={(e) => setEditingDrug({ ...editingDrug, dosage_form: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: '#fff' }}
                  >
                    {DOSAGE_FORMS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    التركيز (Strength)
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={editingDrug.strength || ''}
                    onChange={(e) => setEditingDrug({ ...editingDrug, strength: e.target.value })}
                    placeholder="e.g. 500mg / 1g / 250mg/5ml"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    الشركة المصنعة (Manufacturer)
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={editingDrug.manufacturer || ''}
                    onChange={(e) => setEditingDrug({ ...editingDrug, manufacturer: e.target.value })}
                    placeholder="مثال: فاركو / GSK / إيفا فارما"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    تصنيف الجدول والرقابة
                  </label>
                  <select
                    className="purchase-prototype-field-input"
                    value={editingDrug.controlled_level || 'none'}
                    onChange={(e) => setEditingDrug({ ...editingDrug, controlled_level: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', background: '#fff' }}
                  >
                    <option value="none">دواء عادي (OTC / غير مدرج بجدول)</option>
                    <option value="table_1">أدوية جدول أول (رقابة مشددة وسجلات)</option>
                    <option value="table_2">أدوية جدول ثانٍ (مؤثرات عقلية ونفسية)</option>
                  </select>
                </div>

                {/* Pricing & Automatic Fraction Calculation */}
                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    سعر بيع العلبة (ج.م) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="purchase-prototype-field-input"
                    value={editingDrug.box_price ?? 0}
                    onChange={(e) => {
                      const boxP = parseFloat(e.target.value) || 0;
                      const units = Number(editingDrug.units_per_box || 1);
                      setEditingDrug({
                        ...editingDrug,
                        box_price: boxP,
                        strip_price: units > 0 ? Number((boxP / units).toFixed(2)) : 0,
                      });
                    }}
                    style={{ width: '100%', padding: '8px 12px', fontWeight: 700, color: '#16a34a' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      عدد الوحدات بالعلبة
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="purchase-prototype-field-input"
                      value={editingDrug.units_per_box ?? 1}
                      onChange={(e) => {
                        const units = parseInt(e.target.value, 10) || 1;
                        const boxP = Number(editingDrug.box_price || 0);
                        setEditingDrug({
                          ...editingDrug,
                          units_per_box: units,
                          strip_price: units > 0 ? Number((boxP / units).toFixed(2)) : 0,
                        });
                      }}
                      style={{ width: '100%', padding: '8px 12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      سعر بيع الشريط / الوحدة
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="purchase-prototype-field-input"
                      value={editingDrug.strip_price ?? 0}
                      onChange={(e) => setEditingDrug({ ...editingDrug, strip_price: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 12px', fontWeight: 700, color: '#0284c7' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
                <Button variant="primary" type="submit" disabled={upsertMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconSave size={16} />
                  <span>{upsertMutation.isPending ? 'جاري الحفظ...' : 'حفظ بيانات الدواء'}</span>
                </Button>
              </div>
            </form>
          </DialogShell>
        )}

        {/* Substitutes Modal */}
        <GenericSubstitutesModal
          open={subModalOpen}
          onClose={() => setSubModalOpen(false)}
          activeIngredient={selectedSubIngredient}
          originalTradeName={selectedSubTrade}
        />
      </main>
    </div>
  );
}
