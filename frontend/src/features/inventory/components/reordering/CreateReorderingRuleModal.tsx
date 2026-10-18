import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import {
  LayersIcon,
  SlidersIcon,
  TruckIcon,
  CheckShieldIcon,
} from '@/shared/components/icons/AppIcons';
import {
  reorderingRulesApi,
  type ReorderingRuleRecord,
  type CreateReorderingRulePayload,
} from '../../api/reordering-rules.api';

interface CreateReorderingRuleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ruleToEdit?: ReorderingRuleRecord | null;
  products: Array<{ id: string | number; name: string; barcode?: string; costPrice?: number }>;
  suppliers: Array<{ id: string | number; name: string }>;
  locations: Array<{ id: string | number; name: string; branchId?: number }>;
  branches: Array<{ id: string | number; name: string }>;
}

export function CreateReorderingRuleModal({
  open,
  onClose,
  onSuccess,
  ruleToEdit,
  products,
  suppliers,
  locations,
  branches,
}: CreateReorderingRuleModalProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(ruleToEdit);

  const [productId, setProductId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [preferredSupplierId, setPreferredSupplierId] = useState<string>('');
  const [minQty, setMinQty] = useState<number>(10);
  const [maxQty, setMaxQty] = useState<number>(50);
  const [qtyMultiple, setQtyMultiple] = useState<number>(1);
  const [actionMode, setActionMode] = useState<'auto_draft_po' | 'manual_review'>('auto_draft_po');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (ruleToEdit) {
      setProductId(String(ruleToEdit.product_id));
      setWarehouseId(ruleToEdit.warehouse_id ? String(ruleToEdit.warehouse_id) : '');
      setBranchId(ruleToEdit.branch_id ? String(ruleToEdit.branch_id) : '');
      setPreferredSupplierId(ruleToEdit.preferred_supplier_id ? String(ruleToEdit.preferred_supplier_id) : '');
      setMinQty(Number(ruleToEdit.min_qty || 0));
      setMaxQty(Number(ruleToEdit.max_qty || 0));
      setQtyMultiple(Number(ruleToEdit.qty_multiple || 1));
      setActionMode(ruleToEdit.action_mode || 'auto_draft_po');
      setIsActive(ruleToEdit.is_active !== undefined ? ruleToEdit.is_active : true);
      setNotes(ruleToEdit.notes || '');
    } else {
      setProductId('');
      setWarehouseId(locations[0]?.id ? String(locations[0].id) : '');
      setBranchId('');
      setPreferredSupplierId('');
      setMinQty(10);
      setMaxQty(50);
      setQtyMultiple(1);
      setActionMode('auto_draft_po');
      setIsActive(true);
      setNotes('');
    }
  }, [ruleToEdit, open, locations]);

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: p.name,
    hint: p.barcode ? `باركود: ${p.barcode}` : undefined,
  }));

  const supplierOptions = [
    { value: '', label: 'بدون مورد مفضل محدد (عام)' },
    ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
  ];

  const locationOptions = [
    { value: '', label: 'كافة المستودعات (على مستوى المنشأة)' },
    ...locations.map((loc) => ({ value: String(loc.id), label: loc.name })),
  ];

  const branchOptions = [
    { value: '', label: 'كافة الفروع' },
    ...branches.map((b) => ({ value: String(b.id), label: b.name })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast.error('يرجى تحديد الصنف المراد ضبط قاعدة إعادة الطلب له');
      return;
    }

    if (minQty < 0) {
      toast.error('الحد الأدنى للأمان يجب أن يكون صفرًا أو أكبر');
      return;
    }

    if (maxQty < minQty) {
      toast.error('الحد الأقصى للمخزون يجب أن يكون أكبر من أو مساوياً للحد الأدنى للأمان');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && ruleToEdit) {
        await reorderingRulesApi.updateRule(ruleToEdit.id, {
          warehouseId: warehouseId ? Number(warehouseId) : undefined,
          branchId: branchId ? Number(branchId) : undefined,
          preferredSupplierId: preferredSupplierId ? Number(preferredSupplierId) : undefined,
          minQty,
          maxQty,
          qtyMultiple: qtyMultiple > 0 ? qtyMultiple : 1,
          actionMode,
          isActive,
          notes,
        });
        toast.success('تم تحديث قاعدة إعادة الطلب بنجاح');
      } else {
        const payload: CreateReorderingRulePayload = {
          productId: Number(productId),
          warehouseId: warehouseId ? Number(warehouseId) : undefined,
          branchId: branchId ? Number(branchId) : undefined,
          preferredSupplierId: preferredSupplierId ? Number(preferredSupplierId) : undefined,
          minQty,
          maxQty,
          qtyMultiple: qtyMultiple > 0 ? qtyMultiple : 1,
          actionMode,
          isActive,
          notes,
        };
        await reorderingRulesApi.createRule(payload);
        toast.success('تم تأسيس قاعدة إعادة الطلب التلقائي بنجاح');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء حفظ قاعدة إعادة الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={isEditing ? t('inventory.reordering.create_reordering_rule_modal.s0', "تعديل قاعدة إعادة الطلب التلقائي") : t('inventory.reordering.create_reordering_rule_modal.s1', "إضافة قاعدة إعادة طلب تلقائي جديدة")}
      subtitle={t('inventory.reordering.create_reordering_rule_modal.s2', "ضبط حدود الأمان ونقاط إعادة الطلب (Min/Max) لتوليد أوامر الشراء آلياً")}
      width="min(860px, 95vw)"
      minHeight="auto"
      footerActions={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: '8px 18px', borderRadius: '7px', fontWeight: 600 }}
          >
            {t('inventory.reordering.create_reordering_rule_modal.s3', "إلغاء")}
          </button>
          <button
            type="button"
            className="button primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '8px 22px',
              borderRadius: '7px',
              background: '#170e5e',
              color: '#ffffff',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckShieldIcon size={16} />
            <span>{isSubmitting ? t('inventory.reordering.create_reordering_rule_modal.s4', "جارٍ الحفظ...") : isEditing ? t('inventory.reordering.create_reordering_rule_modal.s5', "تحديث القاعدة") : t('inventory.reordering.create_reordering_rule_modal.s6', "حفظ وتفعيل القاعدة")}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Section 1: تحديد الصنف والموقع */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
            <LayersIcon size={18} color="#170e5e" />
            <strong style={{ fontSize: '0.88rem', color: '#170e5e' }}>{t('inventory.reordering.create_reordering_rule_modal.s7', "1. الصنف ونطاق التخزين والمورد")}</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <Field label={t('inventory.reordering.create_reordering_rule_modal.s8', "الصنف المستهدف (مطلوب)")}>
              <CustomSelect
                value={productId}
                onChange={setProductId}
                options={productOptions}
                placeholder={t('inventory.reordering.create_reordering_rule_modal.s9', "ابحث عن الصنف بالاسم أو الباركود...")}
                disabled={isEditing || isSubmitting}
              />
            </Field>

            <Field label={t('inventory.reordering.create_reordering_rule_modal.s10', "المورد المفضل (لأمر الشراء التلقائي)")}>
              <CustomSelect
                value={preferredSupplierId}
                onChange={setPreferredSupplierId}
                options={supplierOptions}
                placeholder={t('inventory.reordering.create_reordering_rule_modal.s11', "اختر المورد المعتمد...")}
                disabled={isSubmitting}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <Field label={t('inventory.reordering.create_reordering_rule_modal.s12', "المستودع / المخزن")}>
              <CustomSelect
                value={warehouseId}
                onChange={setWarehouseId}
                options={locationOptions}
                placeholder={t('inventory.reordering.create_reordering_rule_modal.s13', "اختر المستودع...")}
                disabled={isSubmitting}
              />
            </Field>

            <Field label={t('inventory.reordering.create_reordering_rule_modal.s14', "الفرع")}>
              <CustomSelect
                value={branchId}
                onChange={setBranchId}
                options={branchOptions}
                placeholder={t('inventory.reordering.create_reordering_rule_modal.s15', "اختر الفرع...")}
                disabled={isSubmitting}
              />
            </Field>
          </div>
        </div>

        {/* Section 2: حدود الأمان ومعايير الحساب */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
            <SlidersIcon size={18} color="#170e5e" />
            <strong style={{ fontSize: '0.88rem', color: '#170e5e' }}>{t('inventory.reordering.create_reordering_rule_modal.s16', "2. معادلة إعادة الطلب ومضاعف التعبئة")}</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <Field label={t('inventory.reordering.create_reordering_rule_modal.s17', "حد الأمان الأدنى (نقطة التحفيز Min)")}>
              <input
                type="number"
                min="0"
                step="0.001"
                value={minQty}
                onChange={(e) => setMinQty(Number(e.target.value))}
                disabled={isSubmitting}
                style={{
                  height: '38px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <small className="muted" style={{ fontSize: '0.7rem', display: 'block', marginTop: '3px' }}>
                {t('inventory.reordering.create_reordering_rule_modal.s18', "عندما يهبط المخزون المتوقع دون هذا الحد يطلق النظام أمر الشراء.")}
              </small>
            </Field>

            <Field label={t('inventory.reordering.create_reordering_rule_modal.s19', "الحد الأقصى المستهدف (Target Max)")}>
              <input
                type="number"
                min="0"
                step="0.001"
                value={maxQty}
                onChange={(e) => setMaxQty(Number(e.target.value))}
                disabled={isSubmitting}
                style={{
                  height: '38px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <small className="muted" style={{ fontSize: '0.7rem', display: 'block', marginTop: '3px' }}>
                {t('inventory.reordering.create_reordering_rule_modal.s20', "المستوى المستهدف ملء المخزن به عند اكتمال التوريد.")}
              </small>
            </Field>

            <Field label={t('inventory.reordering.create_reordering_rule_modal.s21', "مضاعف التعبئة / الحزمة (Batch Multiple)")}>
              <input
                type="number"
                min="1"
                step="1"
                value={qtyMultiple}
                onChange={(e) => setQtyMultiple(Math.max(1, Number(e.target.value)))}
                disabled={isSubmitting}
                style={{
                  height: '38px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <small className="muted" style={{ fontSize: '0.7rem', display: 'block', marginTop: '3px' }}>
                {t('inventory.reordering.create_reordering_rule_modal.s22', "التقريب لأقرب كرتونة/حزمة (مثال: 12 أو 24 قطعة).")}
              </small>
            </Field>
          </div>
        </div>

        {/* Section 3: نمط التشغيل والملاحظات */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
            <TruckIcon size={18} color="#170e5e" />
            <strong style={{ fontSize: '0.88rem', color: '#170e5e' }}>{t('inventory.reordering.create_reordering_rule_modal.s23', "3. إجراء الأتمتة وحالة التفعيل")}</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <Field label={t('inventory.reordering.create_reordering_rule_modal.s24', "إجراء التشغيل التلقائي")}>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: actionMode === 'auto_draft_po' ? '#eff6ff' : '#ffffff',
                    border: actionMode === 'auto_draft_po' ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: actionMode === 'auto_draft_po' ? 700 : 500,
                    color: actionMode === 'auto_draft_po' ? '#1d4ed8' : '#334155',
                  }}
                >
                  <input
                    type="radio"
                    name="actionMode"
                    checked={actionMode === 'auto_draft_po'}
                    onChange={() => setActionMode('auto_draft_po')}
                    style={{ accentColor: '#170e5e' }}
                  />
                  <span>{t('inventory.reordering.create_reordering_rule_modal.s25', "توليد مسودة أمر شراء تلقائياً (Draft PO)")}</span>
                </label>

                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: actionMode === 'manual_review' ? '#eff6ff' : '#ffffff',
                    border: actionMode === 'manual_review' ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: actionMode === 'manual_review' ? 700 : 500,
                    color: actionMode === 'manual_review' ? '#1d4ed8' : '#334155',
                  }}
                >
                  <input
                    type="radio"
                    name="actionMode"
                    checked={actionMode === 'manual_review'}
                    onChange={() => setActionMode('manual_review')}
                    style={{ accentColor: '#170e5e' }}
                  />
                  <span>{t('inventory.reordering.create_reordering_rule_modal.s26', "تنبيه للمراجعة اليدوية فقط")}</span>
                </label>
              </div>
            </Field>

            <Field label={t('inventory.reordering.create_reordering_rule_modal.s27', "حالة القاعدة")}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#170e5e' }}
                />
                <span>{t('inventory.reordering.create_reordering_rule_modal.s28', "تفعيل القاعدة للمراقبة الدورية المباشرة")}</span>
              </label>
            </Field>
          </div>

          <Field label={t('inventory.reordering.create_reordering_rule_modal.s29', "ملاحظات أو تعليمات الشراء")}>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('inventory.reordering.create_reordering_rule_modal.s30', "شروط التوريد الخاصة بهذا الصنف أو تعليمات للمورد...")}
              disabled={isSubmitting}
              style={{
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                padding: '8px 10px',
                fontSize: '0.84rem',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </Field>
        </div>
      </form>
    </StandardDialog>
  );
}
