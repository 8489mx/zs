import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { BrandCombobox } from '@/shared/components/BrandCombobox';
import { XIcon } from '@/shared/components/icons/AppIcons';
import type { UpsertTradeInPayload } from '../api/tradein.api';

interface CreateTradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: UpsertTradeInPayload;
  onChange: (val: UpsertTradeInPayload) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  serialLabel: string;
}

export function CreateTradeInModal({
  isOpen,
  onClose,
  formData,
  onChange,
  onSubmit,
  isPending,
  serialLabel,
}: CreateTradeInModalProps) {
  if (!isOpen) return null;

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(740px, 96vw)"
      ariaLabel="تسجيل شراء جهاز مستعمل"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">تسجيل شراء / استبدال جهاز (شراء من الأفراد)</h3>
            <p className="standard-dialog-subtitle">توثيق بيانات البائع القانونية وفحص حالة الجهاز وإصدار إقرار التنازل</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Seller details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', backgroundColor: '#f8fafc' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', display: 'block', marginBottom: '8px' }}>
              1. بيانات العميل البائع (الإلزامية قانونياً)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>اسم البائع رباعي *</label>
                <input
                  type="text"
                  required
                  value={formData.sellerName}
                  onChange={(e) => onChange({ ...formData, sellerName: e.target.value })}
                  placeholder="محمد أحمد علي..."
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>رقم الهاتف *</label>
                <input
                  type="text"
                  required
                  value={formData.sellerPhone}
                  onChange={(e) => onChange({ ...formData, sellerPhone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>الرقم القومي (14 رقم) *</label>
                <input
                  type="text"
                  required
                  value={formData.sellerNationalId}
                  onChange={(e) => onChange({ ...formData, sellerNationalId: e.target.value })}
                  placeholder="29xxxx..."
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Device details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', backgroundColor: '#ffffff' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', display: 'block', marginBottom: '8px' }}>
              2. مواصفات وسيريال الجهاز
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>الماركة / الشركة</label>
                <BrandCombobox
                  value={formData.deviceBrand || ''}
                  onChange={(val) => onChange({ ...formData, deviceBrand: val })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>موديل الجهاز *</label>
                <input
                  type="text"
                  required
                  value={formData.deviceModel}
                  onChange={(e) => onChange({ ...formData, deviceModel: e.target.value })}
                  placeholder="iPhone 13 Pro Max 256GB..."
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{serialLabel} *</label>
                <input
                  type="text"
                  required
                  value={formData.serialNumber}
                  onChange={(e) => onChange({ ...formData, serialNumber: e.target.value })}
                  placeholder="السيريال أو IMEI 1"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>IMEI 2 (إن وجد)</label>
                <input
                  type="text"
                  value={formData.imei2 || ''}
                  onChange={(e) => onChange({ ...formData, imei2: e.target.value })}
                  placeholder="IMEI 2"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>حالة الجهاز الفنية</label>
                <select
                  value={formData.deviceConditionState || 'used'}
                  onChange={(e) => onChange({ ...formData, deviceConditionState: e.target.value as any })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                >
                  <option value="new_sealed">جديد متبرشم (Sealed)</option>
                  <option value="like_new">كسر زيرو (Like New)</option>
                  <option value="used">مستعمل (Used)</option>
                  <option value="for_parts">قطع غيار / تالف</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>سعر الشراء المتفق عليه (ج.م) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={formData.agreedPurchasePrice || ''}
                  onChange={(e) => onChange({ ...formData, agreedPurchasePrice: Number(e.target.value) })}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 800, color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Pricing and Stock Check */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: '#f1f5f9' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formData.autoAddToInventory ?? true}
                onChange={(e) => onChange({ ...formData, autoAddToInventory: e.target.checked })}
              />
              <span>إدراج الجهاز تلقائياً في المخزون كصنف متاح للبيع بالسيريال</span>
            </label>

            {formData.autoAddToInventory && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>سعر البيع المقترح:</span>
                <input
                  type="number"
                  value={formData.resalePrice || ''}
                  onChange={(e) => onChange({ ...formData, resalePrice: Number(e.target.value) })}
                  placeholder="0.00"
                  style={{ width: '100px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            )}
          </div>

          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 700 }}
            >
              {isPending ? 'جاري الحفظ...' : 'تسجيل الشراء وطباعة الإقرار'}
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
