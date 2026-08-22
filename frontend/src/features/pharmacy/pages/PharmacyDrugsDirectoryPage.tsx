import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyDrug } from '../types/pharmacy.types';
import { DOSAGE_FORMS, MAJOR_PHARMA_COMPANIES, DRUG_CLASSES } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';
import { GenericSubstitutesModal } from '../components/GenericSubstitutesModal';

export default function PharmacyDrugsDirectoryPage() {
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

  const { data, isLoading } = useQuery({
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
    <div className="page-stack" dir="rtl" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💊</span> دليل الأدوية والمواد الفعالة والبدائل (Master Drug Catalog)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            إدارة كشوف الأدوية، تسعير العلبة والشريط، تصنيف الجداول والرقابة الدوائية، والبحث الفوري عن البدائل
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn btn-primary"
          style={{ fontWeight: 800, fontSize: '0.85rem', background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>➕</span> إضافة دواء جديد
        </button>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="بحث بالاسم التجاري، المادة الفعالة، الشركة، أو الباركود..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          style={{ flex: '1 1 280px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />

        <select
          value={dosageFilter}
          onChange={(e) => { setDosageFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
        >
          <option value="all">كل الأشكال الصيدلانية</option>
          {DOSAGE_FORMS.map((form) => (
            <option key={form} value={form}>{form}</option>
          ))}
        </select>

        <select
          value={controlledFilter}
          onChange={(e) => { setControlledFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
        >
          <option value="all">كل الأدوية</option>
          <option value="none">أدوية عادية (بدون جدول)</option>
          <option value="table_1">أدوية جدول أول (رقابة مشددة)</option>
          <option value="table_2">أدوية جدول ثان (مؤثرات عقلية)</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
              <th style={{ padding: '12px 14px' }}>الدواء (Trade Name)</th>
              <th style={{ padding: '12px 14px' }}>المادة الفعالة (Active Ingredient)</th>
              <th style={{ padding: '12px 14px' }}>الشكل والتركيز</th>
              <th style={{ padding: '12px 14px' }}>الشركة المصنعة</th>
              <th style={{ padding: '12px 14px' }}>سعر العلبة / الشريط</th>
              <th style={{ padding: '12px 14px' }}>الرقابة</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>جاري تحميل دليل الأدوية...</td>
              </tr>
            ) : data?.drugs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>لا توجد أدوية مطابقة للبحث</td>
              </tr>
            ) : (
              data?.drugs.map((drug: PharmacyDrug) => (
                <tr key={drug.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {Number(drug.strip_price).toFixed(2)} ج.م / {drug.unit_name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {drug.controlled_level === 'table_1' ? (
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                        جدول 1
                      </span>
                    ) : drug.controlled_level === 'table_2' ? (
                      <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                        جدول 2
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>عادي</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubIngredient(drug.active_ingredient);
                          setSelectedSubTrade(drug.trade_name);
                          setSubModalOpen(true);
                        }}
                        className="btn btn-sm"
                        style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}
                        title="البحث عن البدائل والمثائل"
                      >
                        ⚡ البدائل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(drug)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من حذف هذا الدواء من الدليل؟')) {
                            deleteMutation.mutate(drug.id);
                          }
                        }}
                        className="btn btn-sm btn-danger"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        حذف
                      </button>
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
        <DialogShell open={modalOpen} onClose={() => setModalOpen(false)} width="min(720px, 95vw)" ariaLabel="بيانات الدواء">
          <form onSubmit={handleSave} dir="rtl" style={{ padding: '16px 20px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {editingDrug.id ? '✏️ تعديل بيانات الدواء' : '➕ إضافة دواء جديد للدليل الصيدلي'}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  الاسم التجاري بالإنجليزية (Trade Name)*:
                </label>
                <input
                  type="text"
                  required
                  value={editingDrug.trade_name || ''}
                  onChange={(e) => setEditingDrug({ ...editingDrug, trade_name: e.target.value })}
                  placeholder="e.g. Panadol Extra 500mg"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  الاسم التجاري بالعربية:
                </label>
                <input
                  type="text"
                  value={editingDrug.trade_name_ar || ''}
                  onChange={(e) => setEditingDrug({ ...editingDrug, trade_name_ar: e.target.value })}
                  placeholder="مثال: بنادول اكسترا"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  المادة الفعالة (Active Ingredient)*:
                </label>
                <input
                  type="text"
                  required
                  value={editingDrug.active_ingredient || ''}
                  onChange={(e) => setEditingDrug({ ...editingDrug, active_ingredient: e.target.value })}
                  placeholder="e.g. Paracetamol + Caffeine"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  المادة الفعالة بالعربية:
                </label>
                <input
                  type="text"
                  value={editingDrug.active_ingredient_ar || ''}
                  onChange={(e) => setEditingDrug({ ...editingDrug, active_ingredient_ar: e.target.value })}
                  placeholder="مثال: باراسيتامول + كافيين"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  الشكل الصيدلي (Dosage Form):
                </label>
                <select
                  value={editingDrug.dosage_form || DOSAGE_FORMS[0]}
                  onChange={(e) => setEditingDrug({ ...editingDrug, dosage_form: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  {DOSAGE_FORMS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  التركيز (Strength):
                </label>
                <input
                  type="text"
                  value={editingDrug.strength || ''}
                  onChange={(e) => setEditingDrug({ ...editingDrug, strength: e.target.value })}
                  placeholder="e.g. 500mg / 1g / 250mg/5ml"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  الشركة المصنعة (Manufacturer):
                </label>
                <input
                  type="text"
                  value={editingDrug.manufacturer || ''}
                  onChange={(e) => setEditingDrug({ ...editingDrug, manufacturer: e.target.value })}
                  placeholder="مثال: فاركو / GSK / إيفا فارما"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  تصنيف الجدول والرقابة:
                </label>
                <select
                  value={editingDrug.controlled_level || 'none'}
                  onChange={(e) => setEditingDrug({ ...editingDrug, controlled_level: e.target.value as any })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="none">دواء عادي (OTC / غير مدرج بجدول)</option>
                  <option value="table_1">أدوية جدول أول (رقابة مشددة وسجلات)</option>
                  <option value="table_2">أدوية جدول ثان (مؤثرات عقلية ونفسية)</option>
                </select>
              </div>

              {/* Pricing & Units Grid */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  سعر بيع العلبة (ج.م)*:
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
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
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    عدد الوحدات بالعلبة:
                  </label>
                  <input
                    type="number"
                    min="1"
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
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    سعر بيع الشريط / الوحدة:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingDrug.strip_price ?? 0}
                    onChange={(e) => setEditingDrug({ ...editingDrug, strip_price: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'جاري الحفظ...' : '💾 حفظ بيانات الدواء'}
              </button>
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
    </div>
  );
}
