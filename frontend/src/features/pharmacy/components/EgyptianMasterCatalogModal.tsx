import { useState, useEffect } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { pharmacyApi, MasterDrugItem } from '../api/pharmacy.api';
import { IconSparkles, IconSearch, IconBox, IconCheck } from './PharmacyIcons';

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
        pageSize: 100,
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
    <DialogShell open={open} onClose={onClose} width="min(1050px, 95vw)" ariaLabel="المرجع الدوائي المصري الشامل">
      <div dir="rtl" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#e0e7ff', padding: '6px', borderRadius: '8px', color: '#4338ca', display: 'flex' }}>
              <IconSparkles size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>المرجع الدوائي المصري الشامل (Master Drug Index)</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                قاعدة البيانات الوطنية المعتمدة لكافة الأدوية المصرية بالباركودات والمواد الفعالة والتسعيرة الجبرية
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="primary"
              onClick={handleSeedAll}
              disabled={seeding}
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', border: 'none', gap: '6px' }}
            >
              <IconBox size={16} />
              {seeding ? 'جاري الاستيراد الشامل...' : '⚡ استيراد كافة الأدوية المصرية لصيدليتي'}
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
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
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
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="ابحث بالاسم التجاري، العربي، المادة الفعالة، الشركة، أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="purchase-prototype-field-input"
              style={{ width: '100%', paddingInlineStart: '32px' }}
            />
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '10px', color: '#9ca3af', display: 'flex' }}>
              <IconSearch size={16} />
            </div>
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="purchase-prototype-field-input"
            style={{ width: '220px' }}
          >
            <option value="all">جميع المجموعات العلاجية</option>
            <option value="مسكنات وخافضات حرارة">مسكنات وخافضات حرارة</option>
            <option value="مضادات حيوية واسعة المجال">مضادات حيوية واسعة المجال</option>
            <option value="مثبطات مضخة البروتون (PPI)">أدوية المعدة والحموضة</option>
            <option value="مغلقات بيتا (Beta Blockers)">أدوية القلب والضغط</option>
            <option value="أدوية السكر الفموية">أدوية السكري</option>
            <option value="مضادات احتقان الأنف">أدوية الجهاز التنفسي والبرد</option>
            <option value="فيتامينات ومقويات الأعصاب">فيتامينات ومقويات الأعصاب</option>
            <option value="مضادات حيوية موضعية">جلدية وقطرات ومراهم</option>
          </select>
        </div>

        {/* Drug list table */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '12px', maxHeight: '420px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>جاري استدعاء الأدوية من المرجع المصري...</div>
          ) : drugs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>لا توجد أدوية مطابقة لبحثك في المرجع المصري</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', zIndex: 2 }}>
                <tr>
                  <th style={{ padding: '8px 12px', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === drugs.length && drugs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(drugs.map((d) => d.id));
                        else setSelectedIds([]);
                      }}
                    />
                  </th>
                  <th style={{ padding: '8px 12px' }}>الدواء والتجاري</th>
                  <th style={{ padding: '8px 12px' }}>المادة الفعالة والتركيز</th>
                  <th style={{ padding: '8px 12px' }}>الشركة والباركود</th>
                  <th style={{ padding: '8px 12px' }}>التجزئة (الشرائط)</th>
                  <th style={{ padding: '8px 12px' }}>التسعيرة الرسمية</th>
                  <th style={{ padding: '8px 12px' }}>الرقابة والجدول</th>
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
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(d.id)}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{d.trade_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{d.trade_name_ar || '—'}</div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ color: '#0f766e', fontWeight: 600 }}>{d.active_ingredient}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{d.active_ingredient_ar || ''} • {d.dosage_form}</div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ color: '#475569' }}>{d.manufacturer}</div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>{d.barcode}</div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {d.units_per_box} {d.unit_name}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#15803d' }}>{d.box_price.toFixed(2)} ج.م</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>الشريط: {d.strip_price.toFixed(2)} ج.م</div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {d.controlled_level === 'table_1' ? (
                          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            جدول أول ⚠️
                          </span>
                        ) : d.controlled_level === 'table_2' ? (
                          <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            جدول ثانٍ
                          </span>
                        ) : (
                          <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            المحدد: <strong style={{ color: '#2563eb' }}>{selectedIds.length}</strong> صنف من أصل {drugs.length} معروض
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
                style={{ gap: '6px' }}
              >
                <IconCheck size={16} />
                {importingSelected ? 'جاري الاستيراد...' : `استيراد المحدد (${selectedIds.length}) إلى صيدليتي`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
