import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { useAppToolbar } from '@/stores/toolbar-store';
import { Button } from '@/shared/ui/button';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyDrug } from '../types/pharmacy.types';
import { GenericSubstitutesModal } from '../components/GenericSubstitutesModal';
import { DoseStickerPrintModal } from '../components/DoseStickerPrintModal';
import { EgyptianMasterCatalogModal } from '../components/EgyptianMasterCatalogModal';
import { DistributorInvoiceImportModal } from '../components/DistributorInvoiceImportModal';
import {
  IconSparkles,
  IconPrinter,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconBox,
} from '../components/PharmacyIcons';

// Fast One-Click Popular Drugs Presets
const FAST_DRUG_PRESETS = [
  { tradeName: 'Panadol Extra 500mg', tradeNameAr: 'بنادول اكسترا أزرق/أحمر', activeIngredient: 'Paracetamol + Caffeine', dosageForm: 'أقراص (Tablets)', strength: '500mg/65mg', unitsPerBox: 2, boxPrice: 45, stripPrice: 22.5, manufacturer: 'GSK Egypt', barcode: '6221001000018' },
  { tradeName: 'Augmentin 1g', tradeNameAr: 'اوجمنتين 1 جم مضاد حيوي', activeIngredient: 'Amoxicillin + Clavulanic Acid', dosageForm: 'أقراص (Tablets)', strength: '1000mg', unitsPerBox: 2, boxPrice: 130, stripPrice: 65, manufacturer: 'GSK Egypt', barcode: '6221008000011' },
  { tradeName: 'Concor 5mg', tradeNameAr: 'كونكور 5 مجم للضغط', activeIngredient: 'Bisoprolol Fumarate', dosageForm: 'أقراص (Tablets)', strength: '5mg', unitsPerBox: 3, boxPrice: 85, stripPrice: 28.33, manufacturer: 'Merck', barcode: '6221024000014' },
  { tradeName: 'Controloc 40mg', tradeNameAr: 'كنترولوك 40 مجم للمعدة', activeIngredient: 'Pantoprazole', dosageForm: 'أقراص (Tablets)', strength: '40mg', unitsPerBox: 2, boxPrice: 120, stripPrice: 60, manufacturer: 'Takeda / EVA', barcode: '6221017000012' },
  { tradeName: 'Antinal 200mg', tradeNameAr: 'انتينال مطهر معوي', activeIngredient: 'Nifuroxazide', dosageForm: 'كبسولات (Capsules)', strength: '200mg', unitsPerBox: 2, boxPrice: 36, stripPrice: 18, manufacturer: 'Amoun Pharma', barcode: '6221016000013' },
  { tradeName: 'Brufen 600mg', tradeNameAr: 'بروفين 600 مسكن ومضاد التهاب', activeIngredient: 'Ibuprofen', dosageForm: 'أقراص (Tablets)', strength: '600mg', unitsPerBox: 3, boxPrice: 60, stripPrice: 20, manufacturer: 'Abbott', barcode: '6221003000016' },
];

export default function PharmacyDrugsDirectoryPage() {
  const [drugs, setDrugs] = useState<PharmacyDrug[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedControlled, setSelectedControlled] = useState('all');
  const [selectedDosageForm, setSelectedDosageForm] = useState('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Partial<PharmacyDrug> | null>(null);
  const [substitutesModalData, setSubstitutesModalData] = useState<{ open: boolean; activeIngredient: string; tradeName: string }>({
    open: false,
    activeIngredient: '',
    tradeName: '',
  });
  const [doseStickerData, setDoseStickerData] = useState<{ open: boolean; tradeName: string; activeIngredient?: string }>({
    open: false,
    tradeName: '',
  });
  const [isMasterCatalogOpen, setIsMasterCatalogOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<PharmacyDrug>>({
    trade_name: '',
    trade_name_ar: '',
    active_ingredient: '',
    active_ingredient_ar: '',
    dosage_form: 'أقراص (Tablets)',
    strength: '',
    manufacturer: '',
    drug_class: '',
    prescription_required: false,
    controlled_level: 'none',
    units_per_box: 1,
    unit_name: 'شريط',
    strip_price: 0,
    box_price: 0,
    barcode: '',
    pregnancy_safety: 'B',
    indications: '',
  });

  const fetchDrugs = async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.listDrugs({
        q: searchQuery,
        controlledLevel: selectedControlled,
        dosageForm: selectedDosageForm,
        pageSize: 50,
      });
      setDrugs(res.drugs || []);
    } catch {
      setDrugs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrugs();
  }, [searchQuery, selectedControlled, selectedDosageForm]);

  const handleOpenAdd = (preset?: typeof FAST_DRUG_PRESETS[0]) => {
    if (preset) {
      setFormData({
        trade_name: preset.tradeName,
        trade_name_ar: preset.tradeNameAr,
        active_ingredient: preset.activeIngredient,
        dosage_form: preset.dosageForm,
        strength: preset.strength,
        units_per_box: preset.unitsPerBox,
        unit_name: 'شريط',
        box_price: preset.boxPrice,
        strip_price: preset.stripPrice,
        manufacturer: preset.manufacturer,
        barcode: preset.barcode,
        controlled_level: 'none',
        prescription_required: false,
        pregnancy_safety: 'B',
        indications: '',
      });
    } else {
      setFormData({
        trade_name: '',
        trade_name_ar: '',
        active_ingredient: '',
        active_ingredient_ar: '',
        dosage_form: 'أقراص (Tablets)',
        strength: '',
        manufacturer: '',
        drug_class: '',
        prescription_required: false,
        controlled_level: 'none',
        units_per_box: 1,
        unit_name: 'شريط',
        strip_price: 0,
        box_price: 0,
        barcode: '',
        pregnancy_safety: 'B',
        indications: '',
      });
    }
    setEditingDrug(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (drug: PharmacyDrug) => {
    setEditingDrug(drug);
    setFormData({ ...drug });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trade_name || !formData.active_ingredient) {
      alert('يرجى كتابة الاسم التجاري والمادة الفعالة');
      return;
    }

    try {
      await pharmacyApi.upsertDrug({
        id: editingDrug?.id,
        ...formData,
      });
      setIsModalOpen(false);
      fetchDrugs();
    } catch (err: any) {
      alert('حدث خطأ أثناء الحفظ: ' + (err?.message || ''));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل تريد بالتأكيد حذف هذا الدواء؟')) return;
    try {
      await pharmacyApi.deleteDrug(id);
      fetchDrugs();
    } catch (err: any) {
      alert('فشل حذف الدواء: ' + (err?.message || ''));
    }
  };

  // Header and Toolbar
  useAppToolbar([
    { label: 'دليل الأدوية والمواد الفعالة' },
  ]);

  return (
    <div style={{ padding: '16px 20px', maxWidth: '1280px', margin: '0 auto' }} dir="rtl">
      <PageHeader
        title="دليل الأدوية والمواد الفعالة والتجزئة"
        description="إدارة كاملة للمواد الفعالة، بدائل الأدوية، تجزئة الشرائط، الباركود الدولي والتسعيرة الجبرية"
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            onClick={() => setIsMasterCatalogOpen(true)}
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', border: 'none', gap: '6px' }}
          >
            <IconSparkles size={16} />
            دليل الأدوية المصري الشامل (Master Index)
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsInvoiceModalOpen(true)}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none', gap: '6px' }}
          >
            <IconBox size={16} />
            استيراد فاتورة موزع (المتحدة / ابن سينا)
          </Button>

          <Button variant="primary" onClick={() => handleOpenAdd()} style={{ gap: '6px' }}>
            <IconPlus size={16} />
            + إضافة دواء جديد
          </Button>
        </div>
      </PageHeader>

      {/* 1-Click Fast Drug Entry Strip */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
          <IconSparkles size={16} color="#4f46e5" />
          إضافة سريعة بنقرة واحدة (أشهر الأدوية):
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FAST_DRUG_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleOpenAdd(p)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
            >
              + {p.tradeName.split(' ')[0]} ({p.boxPrice} ج.م)
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="ابحث بالاسم التجاري، المادة الفعالة، الباركود، أو الشركة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="purchase-prototype-field-input"
            style={{ width: '100%', paddingInlineStart: '34px' }}
          />
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '10px', color: '#9ca3af', display: 'flex' }}>
            <IconSearch size={16} />
          </div>
        </div>

        <div>
          <select
            value={selectedDosageForm}
            onChange={(e) => setSelectedDosageForm(e.target.value)}
            className="purchase-prototype-field-input"
            style={{ width: '100%' }}
          >
            <option value="all">جميع الأشكال الصيدلانية</option>
            <option value="أقراص (Tablets)">أقراص (Tablets)</option>
            <option value="كبسولات (Capsules)">كبسولات (Capsules)</option>
            <option value="شراب (Syrup)">شراب (Syrup)</option>
            <option value="أمبولات حقن (Ampoules)">حقن وأمبولات (Injections)</option>
            <option value="كريم جلدي (Cream)">كريمات ومراهم (Topicals)</option>
            <option value="قطرة / بخاخ أنف (Drops/Spray)">قطرات وبخاخات</option>
          </select>
        </div>

        <div>
          <select
            value={selectedControlled}
            onChange={(e) => setSelectedControlled(e.target.value)}
            className="purchase-prototype-field-input"
            style={{ width: '100%' }}
          >
            <option value="all">جميع مستويات الرقابة</option>
            <option value="none">عادي (OTC / غير مجدول)</option>
            <option value="table_1">جدول أول (أدوية مؤثرة)</option>
            <option value="table_2">جدول ثانٍ (رقابة مشددة)</option>
          </select>
        </div>
      </div>

      {/* Drugs Directory Table */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <tr>
                <th style={{ padding: '10px 14px' }}>الدواء (التجاري)</th>
                <th style={{ padding: '10px 14px' }}>المادة الفعالة والتركيز</th>
                <th style={{ padding: '10px 14px' }}>الشكل والشركة</th>
                <th style={{ padding: '10px 14px' }}>سعر العلبة</th>
                <th style={{ padding: '10px 14px' }}>التجزئة (سعر الشريط)</th>
                <th style={{ padding: '10px 14px' }}>الباركود</th>
                <th style={{ padding: '10px 14px' }}>الرقابة</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                    جاري تحميل الأدوية...
                  </td>
                </tr>
              ) : drugs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ color: '#64748b', marginBottom: '10px' }}>لا توجد أدوية مضافة حالياً في صيدليتك</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <Button
                        variant="primary"
                        onClick={() => setIsMasterCatalogOpen(true)}
                        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', border: 'none', gap: '6px' }}
                      >
                        <IconSparkles size={16} />
                        استيراد كافة الأدوية من المرجع المصري فوراً
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                drugs.map((drug) => (
                  <tr key={drug.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{drug.trade_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{drug.trade_name_ar || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ color: '#0f766e', fontWeight: 600 }}>{drug.active_ingredient}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{drug.active_ingredient_ar || ''} {drug.strength ? `(${drug.strength})` : ''}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div>{drug.dosage_form}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{drug.manufacturer || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#15803d' }}>
                      {Number(drug.box_price).toFixed(2)} ج.م
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: '12px' }}>
                        {Number(drug.units_per_box) > 1 ? (
                          <>
                            <strong style={{ color: '#2563eb' }}>{Number(drug.strip_price).toFixed(2)} ج.م</strong>
                            <span style={{ fontSize: '11px', color: '#64748b' }}> ({drug.units_per_box} {drug.unit_name || 'شريط'})</span>
                          </>
                        ) : (
                          <span style={{ color: '#64748b' }}>علبة مفردة</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                      {drug.barcode || '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {drug.controlled_level === 'table_1' ? (
                        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          جدول أول ⚠️
                        </span>
                      ) : drug.controlled_level === 'table_2' ? (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          جدول ثانٍ
                        </span>
                      ) : (
                        <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          عادي OTC
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <Button
                          variant="secondary"
                          className="btn-sm"
                          onClick={() => setSubstitutesModalData({ open: true, activeIngredient: drug.active_ingredient, tradeName: drug.trade_name })}
                          title="البدائل والمثائل"
                          style={{ padding: '4px 6px' }}
                        >
                          <IconSparkles size={14} color="#4f46e5" />
                        </Button>
                        <Button
                          variant="secondary"
                          className="btn-sm"
                          onClick={() => setDoseStickerData({ open: true, tradeName: drug.trade_name, activeIngredient: drug.active_ingredient })}
                          title="طباعة لاصق جرعة"
                          style={{ padding: '4px 6px' }}
                        >
                          <IconPrinter size={14} color="#059669" />
                        </Button>
                        <Button
                          variant="secondary"
                          className="btn-sm"
                          onClick={() => handleOpenEdit(drug)}
                          title="تعديل"
                          style={{ padding: '4px 6px' }}
                        >
                          <IconEdit size={14} color="#0284c7" />
                        </Button>
                        <Button
                          variant="danger"
                          className="btn-sm"
                          onClick={() => handleDelete(drug.id)}
                          title="حذف"
                          style={{ padding: '4px 6px' }}
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Drug Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', width: '90vw', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: 0, marginBottom: '14px', fontSize: '17px', fontWeight: 800 }}>
              {editingDrug ? 'تعديل بيانات الدواء' : 'إضافة دواء جديد للدليل'}
            </h3>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>الاسم التجاري (English) *</label>
                  <input
                    type="text"
                    required
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>الاسم التجاري (بالعربي)</label>
                  <input
                    type="text"
                    value={formData.trade_name_ar || ''}
                    onChange={(e) => setFormData({ ...formData, trade_name_ar: e.target.value })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>المادة الفعالة (English) *</label>
                  <input
                    type="text"
                    required
                    value={formData.active_ingredient}
                    onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>المادة الفعالة (بالعربي)</label>
                  <input
                    type="text"
                    value={formData.active_ingredient_ar || ''}
                    onChange={(e) => setFormData({ ...formData, active_ingredient_ar: e.target.value })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>الشكل الصيدلي</label>
                  <select
                    value={formData.dosage_form}
                    onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    <option value="أقراص (Tablets)">أقراص (Tablets)</option>
                    <option value="كبسولات (Capsules)">كبسولات (Capsules)</option>
                    <option value="شراب (Syrup)">شراب (Syrup)</option>
                    <option value="أمبولات حقن (Ampoules)">أمبولات حقن (Ampoules)</option>
                    <option value="فوار (Sachets)">فوار وأكياس (Sachets)</option>
                    <option value="كريم جلدي (Cream)">كريم موضعي (Cream)</option>
                    <option value="مرهم (Ointment)">مرهم (Ointment)</option>
                    <option value="قطرة / بخاخ أنف (Drops/Spray)">قطرة / بخاخ</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>التركيز</label>
                  <input
                    type="text"
                    placeholder="مثال: 500mg"
                    value={formData.strength || ''}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>الشركة المصنعة</label>
                  <input
                    type="text"
                    value={formData.manufacturer || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>الباركود الدولي</label>
                  <input
                    type="text"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>سعر العلبة (التسعيرة الجبرية)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.box_price || 0}
                    onChange={(e) => {
                      const bp = Number(e.target.value);
                      const units = Number(formData.units_per_box || 1);
                      setFormData({ ...formData, box_price: bp, strip_price: units > 0 ? bp / units : bp });
                    }}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>عدد الشرائط / الوحدات بالعلبة</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.units_per_box || 1}
                    onChange={(e) => {
                      const units = Number(e.target.value);
                      const bp = Number(formData.box_price || 0);
                      setFormData({ ...formData, units_per_box: units, strip_price: units > 0 ? bp / units : bp });
                    }}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>سعر بيع الشريط التلقائي</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.strip_price || 0}
                    onChange={(e) => setFormData({ ...formData, strip_price: Number(e.target.value) })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>جدول الرقابة الدوائية</label>
                  <select
                    value={formData.controlled_level}
                    onChange={(e) => setFormData({ ...formData, controlled_level: e.target.value as any })}
                    className="purchase-prototype-field-input"
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    <option value="none">عادي (غير مجدول OTC)</option>
                    <option value="table_1">جدول أول (مؤثر / عهدة)</option>
                    <option value="table_2">جدول ثانٍ (رقابة مشددة)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </Button>
                <Button variant="primary" type="submit">
                  {editingDrug ? 'تحديث الدواء' : 'حفظ وإدراج بالدليل'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Egyptian Catalog Modal */}
      <EgyptianMasterCatalogModal
        open={isMasterCatalogOpen}
        onClose={() => setIsMasterCatalogOpen(false)}
        onImportSuccess={fetchDrugs}
      />

      {/* Distributor E-Invoice Importer Modal */}
      <DistributorInvoiceImportModal
        open={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onImportSuccess={fetchDrugs}
      />

      {/* Generic Substitutes Engine Modal */}
      <GenericSubstitutesModal
        open={substitutesModalData.open}
        onClose={() => setSubstitutesModalData({ ...substitutesModalData, open: false })}
        activeIngredient={substitutesModalData.activeIngredient}
        originalTradeName={substitutesModalData.tradeName}
      />

      {/* Dose Sticker Print Modal */}
      <DoseStickerPrintModal
        open={doseStickerData.open}
        onClose={() => setDoseStickerData({ ...doseStickerData, open: false })}
        drugName={doseStickerData.tradeName}
        
      />
    </div>
  );
}
