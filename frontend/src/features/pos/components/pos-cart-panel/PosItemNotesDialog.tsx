import { useState, useEffect, useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { DialogShell } from '@/shared/components/dialog-shell';
import { XIcon, CheckIcon, TrashIcon, FileTextIcon, SlidersIcon } from '@/shared/components/icons/AppIcons';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { KITCHEN_TAG_CATEGORIES, resolveItemEnglishName } from '@/features/pos/utils/kitchen-notes.util';

export interface PosItemNotesDialogProps {
  open: boolean;
  onClose: () => void;
  itemName: string;
  itemEnName?: string;
  initialNotes?: string;
  isRestaurant?: boolean;
  onSave: (notes: string) => void;
}

export function PosItemNotesDialog({
  open,
  onClose,
  itemName,
  itemEnName,
  initialNotes = '',
  isRestaurant: isRestaurantProp,
  onSave,
}: PosItemNotesDialogProps) {
  const { t } = useTranslation();
  const settingsQuery = useSettingsQuery();
  const isRestaurant = isRestaurantProp !== undefined
    ? isRestaurantProp
    : settingsQuery.data?.restaurantModuleEnabled === true;

  const [notesText, setNotesText] = useState(initialNotes);
  const [activeTab, setActiveTab] = useState(KITCHEN_TAG_CATEGORIES[0].id);

  useEffect(() => {
    if (open) {
      setNotesText(initialNotes || '');
    }
  }, [open, initialNotes]);

  const englishName = useMemo(() => {
    if (!isRestaurant) {
      return itemEnName || null;
    }
    return itemEnName || resolveItemEnglishName({ name: itemName });
  }, [itemName, itemEnName, isRestaurant]);

  if (!open) return null;

  const currentCategory = KITCHEN_TAG_CATEGORIES.find((c) => c.id === activeTab) || KITCHEN_TAG_CATEGORIES[0];

  const handleToggleTag = (tag: { ar: string; en: string }) => {
    const bilingualTag = `${tag.ar} (${tag.en})`;
    const current = notesText.trim();

    // Check if tag already exists in note (either in Arabic, English, or bilingual format)
    const hasTag = current.includes(tag.ar) || current.includes(tag.en);

    if (hasTag) {
      // Remove tag
      const pattern = new RegExp(`(?:,\\s*)?(?:${tag.ar}\\s*\\(${tag.en}\\)|${tag.ar}|${tag.en})(?:,\\s*)?`, 'gi');
      const updated = current.replace(pattern, ', ').replace(/^,\s*|,\s*$/g, '').trim();
      setNotesText(updated);
    } else {
      // Add tag
      if (!current) {
        setNotesText(bilingualTag);
      } else {
        setNotesText(`${current}، ${bilingualTag}`);
      }
    }
  };

  const isTagSelected = (tag: { ar: string; en: string }) => {
    return notesText.includes(tag.ar) || notesText.includes(tag.en);
  };

  const handleSave = () => {
    onSave(notesText.trim());
    onClose();
  };

  const handleClear = () => {
    setNotesText('');
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width={isRestaurant ? "min(680px, 96vw)" : "min(520px, 94vw)"}
      ariaLabel={isRestaurant ? t('pos.item_notes_modal_title', 'ملاحظات وتجهيز الصنف للمطبخ') : t('pos.item_notes_modal_title_generic', 'ملاحظات الصنف')}
      shellClassName="pos-item-notes-dialog-shell"
    >
      <div
        className="modal-surface full-bleed"
        style={{
          width: '100%',
          maxHeight: '90vh',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '14px',
        }}
        dir="rtl"
      >
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            flexShrink: 0,
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#eef2ff',
                color: '#170e5e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileTextIcon size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {isRestaurant
                  ? `${t('pos.item_notes_modal_title', 'ملاحظات وتجهيز الصنف للمطبخ:')} ${itemName}`
                  : `${t('pos.item_notes_modal_title_generic', 'ملاحظات الصنف:')} ${itemName}`}
              </h2>
              {englishName && (
                <div
                  dir="ltr"
                  style={{
                    fontSize: '0.78rem',
                    color: '#64748b',
                    marginTop: 2,
                    fontWeight: 600,
                    textAlign: 'right',
                    direction: 'ltr',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {englishName}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'إغلاق')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 6,
              borderRadius: 6,
              flexShrink: 0,
            }}
          >
            <XIcon size={18} />
          </button>
        </header>

        {/* Body */}
        <div
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {isRestaurant && (
            <>
              {/* Quick-Tags Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  <SlidersIcon size={14} color="#170e5e" />
                  <span>{t('pos.quick_kitchen_tags', 'تعديلات وتوجيهات المطبخ السريعة (Quick Kitchen Tags)')}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {t('pos.quick_tags_hint', 'انقر لاختيار التعديل ثنائي اللغة آلياً')}
                </span>
              </div>

              {/* Category Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                {KITCHEN_TAG_CATEGORIES.map((cat) => {
                  const isActive = cat.id === activeTab;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveTab(cat.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: isActive ? '1px solid #170e5e' : '1px solid #e2e8f0',
                        background: isActive ? '#170e5e' : '#f8fafc',
                        color: isActive ? '#ffffff' : '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'none',
                      }}
                    >
                      {cat.labelAr}
                    </button>
                  );
                })}
              </div>

              {/* Tags Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                  gap: '8px',
                  minHeight: '130px',
                  maxHeight: '190px',
                  overflowY: 'auto',
                  padding: '2px',
                }}
              >
                {currentCategory.tags.map((tag) => {
                  const selected = isTagSelected(tag);
                  return (
                    <button
                      key={tag.en}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: selected ? '2px solid #170e5e' : '1px solid #cbd5e1',
                        background: selected ? '#eef2ff' : '#ffffff',
                        color: selected ? '#170e5e' : '#1e293b',
                        cursor: 'pointer',
                        textAlign: 'center',
                        gap: '3px',
                        transition: 'none',
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{tag.ar}</span>
                      <span
                        dir="ltr"
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: selected ? '#4338ca' : '#64748b',
                          fontFamily: 'system-ui, sans-serif',
                          letterSpacing: '0.2px',
                        }}
                      >
                        {tag.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Notes Input Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                {isRestaurant
                  ? t('pos.custom_note_label', 'نص الملاحظة النهائي للمطبخ والبون:')
                  : t('pos.custom_note_label_generic', 'ملاحظات وتوجيهات خاصة على الصنف:')}
              </label>
              {notesText && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <TrashIcon size={12} color="#dc2626" />
                  <span>{t('pos.clear_notes', 'مسح الكل')}</span>
                </button>
              )}
            </div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder={isRestaurant
                ? t('pos.item_notes_placeholder', 'اكتب أي ملاحظات إضافية أو اختر من الأزرار السريعة بالأعلى (مثال: بدون بصل، صوص جانبي، تسوية كاملة)...')
                : t('pos.item_notes_placeholder_generic', 'اكتب أي ملاحظات أو تعليمات خاصة بالصنف هنا (مثل: تغليف هدية، مواصفات خاصة، تفاصيل إضافية)...')}
              rows={isRestaurant ? 3 : 5}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                color: '#0f172a',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: '12px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            flexShrink: 0,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              height: '36px',
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
            }}
          >
            {t('common.cancel', 'إلغاء')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            style={{
              height: '36px',
              padding: '0 20px',
              fontSize: '13px',
              fontWeight: 700,
              background: '#170e5e',
              borderColor: '#170e5e',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckIcon size={16} />
            <span>{t('pos.confirm_notes', 'حفظ الملاحظة')}</span>
          </button>
        </footer>
      </div>
    </DialogShell>
  );
}
