import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { kitchenPrintersApi, type KitchenPrinter } from '../../api/kitchen-printers.api';
import { toast } from '@/shared/components/system-alert';
import { PrinterIcon, TrashIcon } from '@/shared/components/icons/AppIcons';

interface PosKitchenPrintersModalProps {
  open: boolean;
  onClose: () => void;
  branchId?: number;
}

export const PosKitchenPrintersModal: React.FC<PosKitchenPrintersModalProps> = ({
  open,
  onClose,
  branchId,
}) => {
  const { t } = useTranslation();

  const stationOptions = React.useMemo(() => [
    { label: t('pos.kitchen_printers.station_kitchen', 'المطبخ الساخن والرئيسي (Kitchen)'), value: 'kitchen' },
    { label: t('pos.kitchen_printers.station_bar', 'البار والمشروبات (Bar)'), value: 'bar' },
    { label: t('pos.kitchen_printers.station_grill', 'محطة الشواية (Grill)'), value: 'grill' },
    { label: t('pos.kitchen_printers.station_fryer', 'محطة المقليات (Fryer)'), value: 'fryer' },
    { label: t('pos.kitchen_printers.station_cold', 'محطة التجهيز البارد والسلطات (Cold)'), value: 'cold' },
    { label: t('pos.kitchen_printers.station_dessert', 'محطة الحلويات (Dessert)'), value: 'dessert' },
    { label: t('pos.kitchen_printers.station_expo', 'منسق تسليم الطلبات (Expo)'), value: 'expo' },
  ], [t]);
  const [printers, setPrinters] = useState<KitchenPrinter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [stationCode, setStationCode] = useState('kitchen');
  const [ipAddress, setIpAddress] = useState('192.168.1.200');
  const [port, setPort] = useState(9100);
  const [paperWidth, setPaperWidth] = useState('80mm');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrinters = async () => {
    setLoading(true);
    try {
      const list = await kitchenPrintersApi.listPrinters(branchId);
      setPrinters(list);
    } catch {
      toast.error(t('pos.kitchen_printers.load_failed', 'تعذر تحميل طابعات المطبخ والبار'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPrinters();
    }
  }, [open, branchId]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setStationCode('kitchen');
    setIpAddress('192.168.1.200');
    setPort(9100);
    setPaperWidth('80mm');
    setIsActive(true);
  };

  const handleEdit = (printer: KitchenPrinter) => {
    setEditingId(printer.id);
    setName(printer.name);
    setStationCode(printer.station_code);
    setIpAddress(printer.ip_address || '');
    setPort(printer.port || 9100);
    setPaperWidth(printer.paper_width || '80mm');
    setIsActive(printer.is_active);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('pos.kitchen_printers.enter_name', 'يرجى إدخال اسم الطابعة'));
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await kitchenPrintersApi.updatePrinter(editingId, {
          name,
          stationCode,
          ipAddress,
          port,
          paperWidth,
          isActive,
          branchId,
        });
        toast.success(t('pos.kitchen_printers.updated_success', 'تم تحديث إعدادات الطابعة بنجاح'));
      } else {
        await kitchenPrintersApi.createPrinter({
          name,
          stationCode,
          ipAddress,
          port,
          paperWidth,
          isActive,
          branchId,
        });
        toast.success('تم إضافة طابعة المطبخ بنجاح');
      }
      resetForm();
      fetchPrinters();
    } catch {
      toast.error('حدث خطأ أثناء حفظ إعدادات الطابعة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await kitchenPrintersApi.deletePrinter(id);
      toast.success('تم حذف الطابعة');
      if (editingId === id) resetForm();
      fetchPrinters();
    } catch {
      toast.error('تعذر حذف الطابعة');
    }
  };

  const getStationLabel = (code: string) => {
    const found = stationOptions.find((o) => o.value === code);
    return found ? found.label.split(' (')[0] : code;
  };

  const inputStyle: React.CSSProperties = {
    height: '35px',
    fontSize: '0.8125rem',
    borderRadius: '6px',
    padding: '0 12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none',
    width: '100%',
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={t('pos.pos_workspace.pos_kitchen_printers_modal.s0', "إدارة طابعات المطبخ والبار الشبكية (Network KOT Printers)")}
      subtitle={t('pos.pos_workspace.pos_kitchen_printers_modal.s1', "توجيه بونات التحضير تلقائياً حسب المحطة (مطبخ / بار / شواية / حلويات) عبر الشبكة المحلية")}
      width="680px"
      compact
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Form Container */}
        <form onSubmit={handleSave} style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{editingId ? t('pos.pos_workspace.pos_kitchen_printers_modal.s2', "تعديل طابعة") : t('pos.pos_workspace.pos_kitchen_printers_modal.s3', "إضافة طابعة مطبخ جديدة")}</span>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm} style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}>
                {t('pos.pos_workspace.pos_kitchen_printers_modal.s4', "إلغاء التعديل")}
              </Button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                {t('pos.pos_workspace.pos_kitchen_printers_modal.s5', "اسم الطابعة / المحطة:")}
              </label>
              <input
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder={t('pos.pos_workspace.pos_kitchen_printers_modal.s6', "مثال: طابعة البار والمشروبات")}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                {t('pos.pos_workspace.pos_kitchen_printers_modal.s7', "محطة التحضير (Station):")}
              </label>
              <CustomSelect
                value={stationCode}
                onChange={(val: string) => setStationCode(val)}
                options={stationOptions}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                {t('pos.pos_workspace.pos_kitchen_printers_modal.s8', "عنوان IP على الشبكة (Local IP):")}
              </label>
              <input
                value={ipAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIpAddress(e.target.value)}
                placeholder="192.168.1.200"
                style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  {t('pos.pos_workspace.pos_kitchen_printers_modal.s9', "المنفذ (Port):")}
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPort(Number(e.target.value))}
                  placeholder="9100"
                  style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  {t('pos.pos_workspace.pos_kitchen_printers_modal.s10', "عرض الورق:")}
                </label>
                <CustomSelect
                  value={paperWidth}
                  onChange={(val: string) => setPaperWidth(val)}
                  options={[
                    { label: t('pos.pos_workspace.pos_kitchen_printers_modal.s11', "80 مم (قياسي)"), value: '80mm' },
                    { label: t('pos.pos_workspace.pos_kitchen_printers_modal.s12', "58 مم (مصغر)"), value: '58mm' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsActive(e.target.checked)}
              />
              <span>{t('pos.pos_workspace.pos_kitchen_printers_modal.s13', "تفعيل الطابعة لاستقبال بونات التحضير آلياً")}</span>
            </label>

            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              style={{ height: '34px', fontSize: '12px', fontWeight: 700, minWidth: '110px' }}
            >
              {saving ? t('pos.pos_workspace.pos_kitchen_printers_modal.s14', "جاري الحفظ...") : (editingId ? t('pos.pos_workspace.pos_kitchen_printers_modal.s15', "تحديث الطابعة") : t('pos.pos_workspace.pos_kitchen_printers_modal.s16', "حفظ الطابعة"))}
            </Button>
          </div>
        </form>

        {/* Existing Printers List */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
            {t('pos.pos_workspace.pos_kitchen_printers_modal.s17', "الطابعات المعرفة بالنظام (")}{printers.length})
          </div>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              {t('pos.pos_workspace.pos_kitchen_printers_modal.s18', "جاري تحميل الطابعات...")}
            </div>
          ) : printers.length === 0 ? (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '12px',
            }}>
              {t('pos.pos_workspace.pos_kitchen_printers_modal.s19', "لم يتم تعريف أي طابعات مطبخ شبكية بعد. أضف طابعة للبدء في توجيه البونات تلقائياً.")}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '230px', overflowY: 'auto' }}>
              {printers.map((printer) => (
                <div key={printer.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: printer.is_active ? '#eef2ff' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <PrinterIcon size={16} color={printer.is_active ? '#170e5e' : '#94a3b8'} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                        {printer.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span>{t('pos.pos_workspace.pos_kitchen_printers_modal.s20', "المحطة:")} {getStationLabel(printer.station_code)}</span>
                        <span>•</span>
                        <span style={{ direction: 'ltr', display: 'inline-block' }}>{printer.ip_address || 'USB/Direct'}:{printer.port}</span>
                        <span>•</span>
                        <span>{printer.paper_width}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: printer.is_active ? '#dcfce7' : '#fee2e2',
                      color: printer.is_active ? '#166534' : '#991b1b',
                    }}>
                      {printer.is_active ? t('pos.pos_workspace.pos_kitchen_printers_modal.s21', "نشطة") : t('pos.pos_workspace.pos_kitchen_printers_modal.s22', "معطلة")}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleEdit(printer)}
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                    >
                      {t('pos.pos_workspace.pos_kitchen_printers_modal.s23', "تعديل")}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => handleDelete(printer.id)}
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                    >
                      <TrashIcon size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StandardDialog>
  );
};
