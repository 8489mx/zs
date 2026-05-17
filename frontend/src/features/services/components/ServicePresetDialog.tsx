import type { RefObject } from 'react';
import { Card } from '@/shared/ui/card';
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
  return (
    <DialogShell open={open} onClose={onClose} width="min(760px, 100%)" zIndex={75}>
      <Card
        title="تخصيص خدمات النشاط"
        className="dialog-card"
        description="اختر قالبًا جاهزًا أو أضف خدماتك يدويًا حسب طبيعة نشاطك."
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
                  borderRadius: 12,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Card title="الخدمات المقترحة" description="يمكنك تعديل الأسعار أو إلغاء أي خدمة قبل الحفظ.">
            <div className="page-stack" style={{ gap: 10 }}>
              {!presetDrafts.length ? (
                <div className="muted">لا توجد خدمات مقترحة لهذا الاختيار. أضف خدماتك يدويًا من الزر التالي.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {presetDrafts.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 12,
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
                        <span className="muted small">السعر الافتراضي اختياري</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amountInput}
                          onChange={(event) => onDraftAmountChange(item.id, event.target.value)}
                          placeholder="اختياري"
                          style={{ minHeight: 36 }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div className="actions compact-actions" style={{ justifyContent: 'flex-start' }}>
                <Button type="button" variant="secondary" onClick={onToggleCustomDraftInputs}>إضافة خدمة مخصصة +</Button>
              </div>

              {showCustomDraftInputs ? (
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 12,
                    background: 'var(--surface-soft)',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div className="muted small" style={{ fontWeight: 600 }}>إضافة خدمة مخصصة</div>
                  <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr auto', gap: 10 }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label>
                        <span>اسم الخدمة</span>
                        <input
                          ref={customServiceNameInputRef}
                          value={customDraftName}
                          onFocus={() => onCustomNameFocusChange(true)}
                          onBlur={() => onCustomNameFocusChange(false)}
                          onChange={(event) => onCustomDraftNameChange(event.target.value)}
                          placeholder="اسم الخدمة"
                        />
                      </label>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>
                        <span>السعر (اختياري)</span>
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
                      <Button type="button" onClick={onAddCustomDraftService}>إضافة للقائمة</Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          {presetMessage ? (
            <div className={`notice-banner ${presetMessageTone === 'error' ? 'is-error' : 'is-success'}`}>{presetMessage}</div>
          ) : null}

          <div className="actions sticky-form-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPresetSavePending}>إلغاء</Button>
            <Button type="button" onClick={onSavePresetServices} disabled={isPresetSavePending}>
              {isPresetSavePending ? 'جاري الحفظ...' : `حفظ التخصيص (${selectedDraftCount})`}
            </Button>
          </div>
        </div>
      </Card>
    </DialogShell>
  );
}
