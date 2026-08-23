import { useState, useEffect } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { pharmacyApi, MasterDrugItem } from '../api/pharmacy.api';
import { IconSparkles, IconSearch, IconCheck } from './PharmacyIcons';

interface Props {
  open: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export function EgyptianMasterCatalogModal({ open, onClose, onImportSuccess }: Props) {
  const [drugs, setDrugs] = useState<MasterDrugItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importingSelected, setImportingSelected] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchMasterDrugs = async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.getMasterCatalog({
        q: searchQuery,
        drugClass: selectedClass,
        pageSize: 500,
      });
      setDrugs(res.drugs || []);
    } catch (err: any) {
      setStatusMessage({ text: 'حدث خطأ أثناء تحميل الدليل المصري: ' + (err?.message || ''), isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMasterDrugs();
    }
  }, [open, searchQuery, selectedClass]);

  if (!open) return null;

  const handleSeedAll = async () => {
    if (!window.confirm('هل تريد استيراد وتحديث كافة الأدوية المصرية بالكامل بأسعارها الرسمية وموادها الفعالة وشرائطها داخل صيدليتك؟')) {
      return;
    }
    setSeeding(true);
    setStatusMessage(null);
    try {
      const res = await pharmacyApi.seedAllMasterDrugs();
      setStatusMessage({ text: res.message || 'تم استيراد الدليل المصري بنجاح!' });
      if (onImportSuccess) onImportSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({ text: 'فشل الاستيراد: ' + (err?.message || ''), isError: true });
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleImportSelected = async () => {
    if (selectedIds.length === 0) {
      setStatusMessage({ text: 'يرجى تحديد دواء واحد على الأقل للاستيراد', isError: true });
      return;
    }
    setImportingSelected(true);
    setStatusMessage(null);
    try {
      const res = await pharmacyApi.importSelectedMasterDrugs(selectedIds);
      setStatusMessage({ text: `تم استيراد ${res.importedCount} دواء بنجاح إلى صيدليتك!` });
      setSelectedIds([]);
      if (onImportSuccess) onImportSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMessage({ text: 'فشل استيراد الأصناف المحددة: ' + (err?.message || ''), isError: true });
    } finally {
      setImportingSelected(false);
    }
  };

  return (
    <DialogShell open={open} onClose={onClose} width="min(1240px, 96vw)" ariaLabel="المرجع الدوائي المصري الشامل">
      <div dir="rtl" style={{ background: '#ffffff', borderRadius: '10px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              المرجع الدوائي المصري الشامل (Master Drug Index)
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              قاعدة البيانات المعتمدة لكافة الأدوية المصرية بالباركود والمواد الفعالة والتسعيرة الجبرية الرسمية
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="primary"
              onClick={handleSeedAll}
              disabled={seeding}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px' }}
            >
              <IconSparkles size={15} />
              <span>{seeding ? 'جاري الاستيراد الشامل...' : 'استيراد كافة الأدوية لصيدليتي'}</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: statusMessage.isError ? '#fef2f2' : '#f0fdf4',
              color: statusMessage.isError ? '#b91c1c' : '#166534',
              border: `1px solid ${statusMessage.isError ? '#fecaca' : '#bbf7d0'}`,
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Toolbar Filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="ابحث بالاسم التجاري، العربي، المادة الفعالة، الشركة، أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="purchase-prototype-field-input"
              style={{ width: '100%', paddingInlineStart: '34px', boxSizing: 'border-box' }}
            />
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '10px', color: '#9ca3af', display: 'flex' }}>
              <IconSearch size={16} />
            </div>
          </div>

          <div style={{ width: '240px' }}>
            <CustomSelect
              value={selectedClass}
              onChange={(val) => setSelectedClass(val)}
              options={[
                { value: 'all', label: 'جميع المجموعات العلاجية' },
                { value: 'مسكنات وخافضات حرارة', label: 'مسكنات وخافضات حرارة' },
                { value: 'مضادات حيوية واسعة المجال', label: 'مضادات حيوية واسعة المجال' },
                { value: 'مثبطات مضخة البروتون (PPI)', label: 'أدوية المعدة والحموضة' },
                { value: 'مغلقات بيتا (Beta Blockers)', label: 'أدوية القلب والضغط' },
                { value: 'أدوية السكر الفموية', label: 'أدوية السكري' },
                { value: 'مضادات احتقان الأنف', label: 'أدوية الجهاز التنفسي والبرد' },
                { value: 'فيتامينات ومقويات الأعصاب', label: 'فيتامينات ومقويات الأعصاب' },
                { value: 'مضادات حيوية موضعية', label: 'جلدية وقطرات ومراهم' },
              ]}
            />
          </div>
        </div>

        {/* Drug list table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: 'min(560px, calc(80vh - 180px))', overflowY: 'auto', overflowX: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>جاري استدعاء الأدوية من المرجع المصري...</div>
          ) : drugs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>لا توجد أدوية مطابقة لبحثك في المرجع المصري</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'right', tableLayout: 'fixed' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', zIndex: 2 }}>
                <tr style={{ color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 4px', width: '36px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === drugs.length && drugs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(drugs.map((d) => d.id));
                        else setSelectedIds([]);
                      }}
                    />
                  </th>
                  <th style={{ padding: '10px 8px', width: '26%', verticalAlign: 'middle' }}>الدواء والتجاري</th>
                  <th style={{ padding: '10px 8px', width: '25%', verticalAlign: 'middle' }}>المادة الفعالة والشكل</th>
                  <th style={{ padding: '10px 8px', width: '18%', verticalAlign: 'middle' }}>الشركة والباركود</th>
                  <th style={{ padding: '10px 6px', width: '9%', textAlign: 'center', verticalAlign: 'middle' }}>التجزئة</th>
                  <th style={{ padding: '10px 6px', width: '12%', textAlign: 'center', verticalAlign: 'middle' }}>التسعيرة الرسمية</th>
                  <th style={{ padding: '10px 6px', width: '10%', textAlign: 'center', verticalAlign: 'middle' }}>الرقابة</th>
                </tr>
              </thead>
              <tbody>
                {drugs.map((d) => {
                  const isSelected = selectedIds.includes(d.id);
                  return (
                    <tr
                      key={d.id}
                      onClick={() => handleToggleSelect(d.id)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <td style={{ padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(d.id)}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem', lineHeight: '1.25' }}>{d.trade_name}</div>
                        {d.trade_name_ar ? (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', lineHeight: '1.2' }}>
                            {d.trade_name_ar}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                        <div style={{ color: '#0f766e', fontWeight: 600, fontSize: '0.8rem', lineHeight: '1.25' }}>{d.active_ingredient}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', lineHeight: '1.2' }}>
                          {d.dosage_form}
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                        <div style={{ color: '#334155', fontSize: '0.78rem', lineHeight: '1.25' }}>{d.manufacturer}</div>
                        <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#64748b', marginTop: '2px', lineHeight: '1.2' }}>
                          {d.barcode}
                        </div>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'inline-block' }}>
                          {d.units_per_box} {d.unit_name}
                        </span>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.82rem', lineHeight: '1.2' }}>{d.box_price.toFixed(2)} ج.م</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                          الشريط: {d.strip_price.toFixed(2)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                        {d.controlled_level === 'table_1' ? (
                          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangleIcon size={12} color="#b91c1c" /> جدول أول
                          </span>
                        ) : d.controlled_level === 'table_2' ? (
                          <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-block' }}>
                            جدول ثانٍ
                          </span>
                        ) : (
                          <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', display: 'inline-block' }}>
                            عادي OTC
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          )}
        </div>



        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: '#475569' }}>
            المحدد: <strong style={{ color: 'var(--primary, #1e1b4b)' }}>{selectedIds.length}</strong> صنف من أصل {drugs.length} معروض
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} disabled={importingSelected || seeding}>
              إغلاق
            </Button>
            {selectedIds.length > 0 && (
              <Button
                variant="primary"
                onClick={handleImportSelected}
                disabled={importingSelected}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconCheck size={15} />
                <span>{importingSelected ? 'جاري الاستيراد...' : `استيراد المحدد (${selectedIds.length}) إلى صيدليتي`}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
