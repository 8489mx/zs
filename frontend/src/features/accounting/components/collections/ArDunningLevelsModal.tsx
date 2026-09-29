import React, { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import { arCollectionsApi, type ArDunningLevel } from '../../api/ar-collections.api';
import { SlidersIcon, CheckShieldIcon } from '@/shared/components/icons/AppIcons';

interface ArDunningLevelsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ArDunningLevelsModal: React.FC<ArDunningLevelsModalProps> = ({
  open,
  onClose,
  onSaved,
}) => {
  const [levels, setLevels] = useState<ArDunningLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadLevels();
    }
  }, [open]);

  const loadLevels = async () => {
    setLoading(true);
    try {
      const res = await arCollectionsApi.getDunningLevels();
      setLevels(res);
    } catch (err: any) {
      toast.error('تعذر جلب إعدادات مستويات المطالبة والتصعيد');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (id: string, field: keyof ArDunningLevel, value: any) => {
    setLevels((prev) =>
      prev.map((lvl) => (lvl.id === id ? { ...lvl, [field]: value } : lvl)),
    );
  };

  const handleSaveLevel = async (lvl: ArDunningLevel) => {
    setSavingId(lvl.id);
    try {
      await arCollectionsApi.updateDunningLevel(lvl.id, {
        levelName: lvl.level_name,
        daysPastDue: Number(lvl.days_past_due),
        autoBlockSales: Boolean(lvl.auto_block_sales),
        actionType: lvl.action_type,
        templateText: lvl.template_text,
      });
      toast.success(`تم حفظ تعديلات المستوى (${lvl.level_name}) بنجاح.`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حفظ تعديلات المستوى');
    } finally {
      setSavingId(null);
    }
  };

  if (!open) return null;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إعدادات مستويات المطالبة والتصعيد الآلي (Dunning Tiers)"
      subtitle="تحديد مدد التأخير بالايام، نصوص خطابات المطالبة، والتفعيل التلقائي لحظر البيع الآجل"
      size="lg"
    >
      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
          جاري تحميل المستويات...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
          {levels.map((lvl) => (
            <div
              key={lvl.id}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#170e5e',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {lvl.level_order}
                  </div>
                  <input
                    type="text"
                    value={lvl.level_name}
                    onChange={(e) => handleFieldChange(lvl.id, 'level_name', e.target.value)}
                    style={{
                      fontWeight: 700,
                      fontSize: '13.5px',
                      color: '#0f172a',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      width: '280px',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={savingId === lvl.id}
                  onClick={() => handleSaveLevel(lvl)}
                  style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '11.5px', padding: '5px 12px' }}
                >
                  {savingId === lvl.id ? 'جاري الحفظ...' : 'حفظ المستوى'}
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    مهلة التأخير (أيام بعد الاستحقاق)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lvl.days_past_due}
                    onChange={(e) => handleFieldChange(lvl.id, 'days_past_due', parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    نوع الإجراء المعتمد
                  </label>
                  <select
                    value={lvl.action_type}
                    onChange={(e) => handleFieldChange(lvl.id, 'action_type', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="whatsapp">محادثة واتساب فورية</option>
                    <option value="manual_call">اتصال هاتفي مباشر</option>
                    <option value="legal">تصعيد قانوني رسمي</option>
                    <option value="email">بريد إلكتروني</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    حظر البيع الآجل تلقائياً
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 0', fontSize: '12.5px', color: '#1e293b' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(lvl.auto_block_sales)}
                      onChange={(e) => handleFieldChange(lvl.id, 'auto_block_sales', e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
                    />
                    <span>حظر الآجل عند بلوغ هذا المستوى</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  نص قالب المطالبة (المتغيرات المتاحة: &#123;customer_name&#125;, &#123;total_overdue&#125;, &#123;days_overdue&#125;)
                </label>
                <textarea
                  rows={2}
                  value={lvl.template_text}
                  onChange={(e) => handleFieldChange(lvl.id, 'template_text', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <StandardDialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
};
