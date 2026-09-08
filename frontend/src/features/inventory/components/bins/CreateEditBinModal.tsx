import React from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { WarehouseBin } from '../../api/warehouse-bins.api';

interface CreateEditBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBin: WarehouseBin | null;
  locations: any[];
  formLocationId: number | '';
  setFormLocationId: (val: number | '') => void;
  formCode: string;
  setFormCode: (val: string) => void;
  formBarcode: string;
  setFormBarcode: (val: string) => void;
  formAisle: string;
  setFormAisle: (val: string) => void;
  formRack: string;
  setFormRack: (val: string) => void;
  formShelf: string;
  setFormShelf: (val: string) => void;
  formBin: string;
  setFormBin: (val: string) => void;
  formNotes: string;
  setFormNotes: (val: string) => void;
  saving: boolean;
  modalFeedback: { text: string; error?: boolean } | null;
  onSave: () => void;
}

export const CreateEditBinModal: React.FC<CreateEditBinModalProps> = ({
  isOpen,
  onClose,
  editingBin,
  locations,
  formLocationId,
  setFormLocationId,
  formCode,
  setFormCode,
  formBarcode,
  setFormBarcode,
  formAisle,
  setFormAisle,
  formRack,
  setFormRack,
  formShelf,
  setFormShelf,
  formBin,
  setFormBin,
  formNotes,
  setFormNotes,
  saving,
  modalFeedback,
  onSave,
}) => {
  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={editingBin ? 'تعديل مكان التخزين (Edit Bin)' : 'إضافة مكان تخزين جديد (New Bin)'}
      subtitle="تحديد المستودع، رمز المكان، الممر، الحامل، والباركود لسهولة التوجيه والجرد"
      width="560px"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !formCode.trim()}
            style={{
              padding: '8px 22px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ مكان التخزين'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 0' }} dir="rtl">
        {modalFeedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: modalFeedback.error ? '#fef2f2' : '#f0fdf4',
              color: modalFeedback.error ? '#991b1b' : '#166534',
              border: `1px solid ${modalFeedback.error ? '#fecaca' : '#bbf7d0'}`,
            }}
          >
            {modalFeedback.text}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            المستودع / مكان التخزين الرئيسي <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={formLocationId}
            onChange={(e) => setFormLocationId(Number(e.target.value))}
            disabled={Boolean(editingBin)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: editingBin ? '#f1f5f9' : '#ffffff',
            }}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              رمز مكان التخزين (Code) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              placeholder="مثال: A1-R02-S3-B05"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 700,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              الباركود (Barcode)
            </label>
            <input
              type="text"
              value={formBarcode}
              onChange={(e) => setFormBarcode(e.target.value)}
              placeholder="اتركه فارغاً للتوليد التلقائي..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
              الممر (Aisle)
            </label>
            <input
              type="text"
              value={formAisle}
              onChange={(e) => setFormAisle(e.target.value)}
              placeholder="A, B, 01..."
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
              الحامل (Rack)
            </label>
            <input
              type="text"
              value={formRack}
              onChange={(e) => setFormRack(e.target.value)}
              placeholder="R1, R2..."
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
              المستوى (Shelf)
            </label>
            <input
              type="text"
              value={formShelf}
              onChange={(e) => setFormShelf(e.target.value)}
              placeholder="S1, S2..."
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
              العين (Bin)
            </label>
            <input
              type="text"
              value={formBin}
              onChange={(e) => setFormBin(e.target.value)}
              placeholder="B01, B02..."
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            ملاحظات
          </label>
          <textarea
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="ملاحظات أو مواصفات خاصة بمكان التخزين..."
            rows={2}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
          />
        </div>
      </div>
    </StandardDialog>
  );
};
