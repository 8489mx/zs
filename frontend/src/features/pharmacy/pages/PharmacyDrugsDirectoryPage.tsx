import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { useAppToolbar } from '@/stores/toolbar-store';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyDrug } from '../types/pharmacy.types';
import { GenericSubstitutesModal } from '../components/GenericSubstitutesModal';
import { DoseStickerPrintModal } from '../components/DoseStickerPrintModal';
import { EgyptianMasterCatalogModal } from '../components/EgyptianMasterCatalogModal';
import { DistributorInvoiceImportModal } from '../components/DistributorInvoiceImportModal';
import { PharmacyPresetsBar, FAST_DRUG_PRESETS } from '../components/PharmacyPresetsBar';
import { PharmacyDrugFormModal } from '../components/PharmacyDrugFormModal';
import { PharmacyDrugsTable } from '../components/PharmacyDrugsTable';
import {
  IconRefresh,
  IconPlus,
  IconSearch,
  IconBox,
} from '../components/PharmacyIcons';

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
        box_price: preset.boxPrice,
        strip_price: preset.stripPrice,
        manufacturer: preset.manufacturer,
        barcode: preset.barcode,
        controlled_level: 'none',
      });
    } else {
      setFormData({
        trade_name: '',
        trade_name_ar: '',
        active_ingredient: '',
        dosage_form: 'أقراص (Tablets)',
        units_per_box: 1,
        box_price: 0,
        strip_price: 0,
        controlled_level: 'none',
      });
    }
    setEditingDrug(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (drug: PharmacyDrug) => {
    setEditingDrug(drug);
    setFormData(drug);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDrug?.id) {
        await pharmacyApi.updateDrug(editingDrug.id, formData);
      } else {
        await pharmacyApi.createDrug(formData);
      }
      setIsModalOpen(false);
      fetchDrugs();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ الدواء');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الصنف الدوائي؟')) return;
    try {
      await pharmacyApi.deleteDrug(id);
      fetchDrugs();
    } catch (err: any) {
      alert(err.message || 'تعذر حذف الدواء');
    }
  };

  useAppToolbar([
    { label: 'الصيدلية', to: '/pharmacy' },
    { label: 'دليل الأدوية والمواد الفعالة' },
  ]);

  return (
    <div className="page-stack page-shell pharmacy-workspace" dir="rtl">
      <main className="page-content workspace-body" style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px' }}>
        <PageHeader
          title="دليل الأدوية المصري والمواد الفعالة (Drug Directory)"
          description="إدارة الأسماء التجارية، المواد الفعالة، التسعيرة الجبرية، وجداول الرقابة الدوائية مع محرك البدائل"
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={() => setIsMasterCatalogOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, background: '#1e1b4b', border: 'none' }}
              >
                <IconBox />
                <span>تحميل الدليل الدوائي المصري (EDA)</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setIsInvoiceModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <span>استيراد فاتورة الموزع (Excel/PDF)</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => handleOpenAdd()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <IconPlus />
                <span>إضافة دواء جديد</span>
              </Button>

              <Button
                variant="secondary"
                onClick={fetchDrugs}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* Quick Presets Bar */}
        <PharmacyPresetsBar onSelectPreset={(p) => handleOpenAdd(p)} />

        {/* Filters Toolbar */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="بحث بالاسم التجاري، المادة الفعالة، أو الباركود الدولي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 32px 7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <CustomSelect
              value={selectedControlled}
              onChange={(val) => setSelectedControlled(val)}
              options={[
                { value: 'all', label: 'جميع الجداول' },
                { value: 'none', label: 'عادي (غير مجدول)' },
                { value: 'table_1', label: 'جدول أول (مؤثر)' },
                { value: 'table_2', label: 'جدول ثانٍ (رقابة)' },
              ]}
            />
          </div>

          <div style={{ width: '180px' }}>
            <CustomSelect
              value={selectedDosageForm}
              onChange={(val) => setSelectedDosageForm(val)}
              options={[
                { value: 'all', label: 'جميع الأشكال الصيدلية' },
                { value: 'أقراص (Tablets)', label: 'أقراص' },
                { value: 'كبسولات (Capsules)', label: 'كبسولات' },
                { value: 'شراب (Syrup)', label: 'شراب' },
                { value: 'أمبولات حقن (Ampoules)', label: 'أمبولات' },
                { value: 'كريم جلدي (Cream)', label: 'كريمات' },
              ]}
            />
          </div>
        </div>

        {/* Drugs Table */}
        <PharmacyDrugsTable
          drugs={drugs}
          loading={loading}
          onOpenSubstitutes={(ai, tn) => setSubstitutesModalData({ open: true, activeIngredient: ai, tradeName: tn })}
          onOpenDoseSticker={(tn, ai) => setDoseStickerData({ open: true, tradeName: tn, activeIngredient: ai })}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />

        {/* Add/Edit Drug Modal */}
        <PharmacyDrugFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingDrug={editingDrug}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSave}
        />

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
      </main>
    </div>
  );
}
