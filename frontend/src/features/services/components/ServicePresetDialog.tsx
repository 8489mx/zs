import { useTranslation } from 'react-i18next';
import type { RefObject } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { SERVICE_PRESETS, type PresetServiceDraft, type ServicePresetKey } from '@/features/services/lib/services-page.constants';

interface ServicePresetDialogProps {
  open: boolean;
  selectedPresetKey: ServicePresetKey;
  presetDrafts: PresetServiceDraft[];
  selectedDraftIds: Record<string, boolean>;
  selectedDraftCount: number;
  showCustomDraftInputs: boolean;
  customDraftName: string;
  customDraftAmount: string;
  isCustomNameFocused: boolean;
  isPresetSavePending: boolean;
  presetMessage: string;
  presetMessageTone: 'success' | 'error';
  customServiceNameInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onPresetSelection: (key: ServicePresetKey) => void;
  onToggleDraftSelection: (id: string) => void;
  onDraftAmountChange: (id: string, value: string) => void;
  onToggleCustomDraftInputs: () => void;
  onCustomDraftNameChange: (value: string) => void;
  onCustomDraftAmountChange: (value: string) => void;
  onCustomNameFocusChange: (isFocused: boolean) => void;
  onAddCustomDraftService: () => void;
  onSavePresetServices: () => void;
}

export function ServicePresetDialog({
  open,
  selectedPresetKey,
  presetDrafts,
  selectedDraftIds,
  selectedDraftCount,
  showCustomDraftInputs,
  customDraftName,
  customDraftAmount,
  isCustomNameFocused,
  isPresetSavePending,
  presetMessage,
  presetMessageTone,
  customServiceNameInputRef,
  onClose,
  onPresetSelection,
  onToggleDraftSelection,
  onDraftAmountChange,
  onToggleCustomDraftInputs,
  onCustomDraftNameChange,
  onCustomDraftAmountChange,
  onCustomNameFocusChange,
  onAddCustomDraftService,
  onSavePresetServices,
}: ServicePresetDialogProps) {
  const { t } = useTranslation();
  return (
    <DialogShell open={open} onClose={onClose} width="min(760px, 100%)" zIndex={75}>
      <FormSection
        title={t('services.service_preset_dialog.s0', "تخصيص خدمات النشاط")}
        className="dialog-card"
        description={t('services.service_preset_dialog.s1', "اختر قالبًا جاهزًا أو أضف خدماتك يدويًا حسب طبيعة نشاطك.")}
      >
        <div className="page-stack" style={{ gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {SERVICE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onPresetSelection(preset.key)}
                className={`nav-pill ${selectedPresetKey === preset.key ? 'is-active' : ''}`}
                tabIndex={isCustomNameFocused ? -1 : 0}
                style={{
                  border: selectedPresetKey === preset.key ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: selectedPresetKey === preset.key ? 'var(--primary-soft)' : 'var(--surface)',
                  padding: '10px 12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 8,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <FormSection title={t('services.service_preset_dialog.s2', "الخدمات المقترحة")} description={t('services.service_preset_dialog.s3', "يمكنك تعديل الأسعار أو إلغاء أي خدمة قبل الحفظ.")}>
            <div className="page-stack" style={{ gap: 10 }}>
              {!presetDrafts.length ? (
                <div className="muted">{t('services.service_preset_dialog.s4', "لا توجد خدمات مقترحة لهذا الاختيار. أضف خدماتك يدويًا من الزر التالي.")}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {presetDrafts.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: 'var(--surface)',
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedDraftIds[item.id])}
                          onChange={() => onToggleDraftSelection(item.id)}
                          style={{ width: 16, height: 16, margin: 0, flexShrink: 0 }}
                        />
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                      </label>
                      <label className="field" style={{ margin: 0 }}>
                        <span className="muted small">{t('services.service_preset_dialog.s5', "السعر الافتراضي اختياري")}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amountInput}
                          onChange={(event) => onDraftAmountChange(item.id, event.target.value)}
                          placeholder={t('services.service_preset_dialog.s6', "اختياري")}
                          style={{ minHeight: 36 }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div className="actions compact-actions" style={{ justifyContent: 'flex-start' }}>
                <Button type="button" variant="secondary" onClick={onToggleCustomDraftInputs}>{t('services.service_preset_dialog.s7', "إضافة خدمة مخصصة +")}</Button>
              </div>

              {showCustomDraftInputs ? (
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 12,
                    background: 'var(--surface-soft)',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div className="muted small" style={{ fontWeight: 600 }}>{t('services.service_preset_dialog.s8', "إضافة خدمة مخصصة")}</div>
                  <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr auto', gap: 10 }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label>
                        <span>{t('services.service_preset_dialog.s9', "اسم الخدمة")}</span>
                        <input
                          ref={customServiceNameInputRef}
                          value={customDraftName}
                          onFocus={() => onCustomNameFocusChange(true)}
                          onBlur={() => onCustomNameFocusChange(false)}
                          onChange={(event) => onCustomDraftNameChange(event.target.value)}
                          placeholder={t('services.service_preset_dialog.s10', "اسم الخدمة")}
                        />
                      </label>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>
                        <span>{t('services.service_preset_dialog.s11', "السعر (اختياري)")}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={customDraftAmount}
                          onChange={(event) => onCustomDraftAmountChange(event.target.value)}
                          placeholder="0"
                        />
                      </label>
                    </div>
                    <div className="actions compact-actions" style={{ alignItems: 'flex-end' }}>
                      <Button type="button" onClick={onAddCustomDraftService}>{t('services.service_preset_dialog.s12', "إضافة للقائمة")}</Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </FormSection>

          {presetMessage ? (
            <div className={`notice-banner ${presetMessageTone === 'error' ? 'is-error' : 'is-success'}`}>{presetMessage}</div>
          ) : null}

          <div className="actions sticky-form-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPresetSavePending}>{t('services.service_preset_dialog.s13', "إلغاء")}</Button>
            <Button type="button" onClick={onSavePresetServices} disabled={isPresetSavePending}>
              {isPresetSavePending ? t('services.service_preset_dialog.s14', "جاري الحفظ...") : `حفظ التخصيص (${selectedDraftCount})`}
            </Button>
          </div>
        </div>
      </FormSection>
    </DialogShell>
  );
}
