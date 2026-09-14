import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { addonsApi, type Addon } from '@/features/products/api/addons.api';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { toast } from '@/shared/components/system-alert';

interface AddonsManagementDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddonsManagementDialog({ open, onClose }: AddonsManagementDialogProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<Partial<Addon>>({ name: '', price: 0, costPrice: 0, isActive: true });
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const { data: addons = [], isLoading } = useQuery({
    queryKey: ['addons'],
    queryFn: addonsApi.list,
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Addon>) => {
      if (editingId) return addonsApi.update(editingId, payload);
      return addonsApi.create(payload as Omit<Addon, 'id'>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] });
      toast.success(editingId ? 'تم تعديل الإضافة بنجاح' : 'تم إضافة العنصر بنجاح');
      setEditingId(null);
      setFormData({ name: '', price: 0, costPrice: 0, isActive: true });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ الإضافة');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: addonsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] });
      toast.success('تم حذف الإضافة بنجاح');
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف الإضافة');
    },
  });

  const handleEdit = (addon: Addon) => {
    setEditingId(addon.id!);
    setFormData({ name: addon.name, price: addon.price, costPrice: addon.costPrice, isActive: addon.isActive });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', price: 0, costPrice: 0, isActive: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    saveMutation.mutate(formData);
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إدارة الإضافات (Modifiers)"
      subtitle="إدارة مصفوفة الإضافات والخيارات للوجبات والمنتجات وتحديد الأسعار"
      maxWidth="760px"
      footerActions={
        <StandardDialogFooter
          cancelText="إغلاق"
          onCancel={onClose}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir="rtl">
        {/* 1. بيانات الإضافة والتسعير */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Layers size={15} />
            <span>1. بيانات الإضافة والتسعير (Add-on Details & Pricing)</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <Field label="اسم الإضافة *">
                <input
                  type="text"
                  required
                  placeholder="مثال: جبنة إضافية، صلصة حارة..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Field>

              <Field label="السعر للعميل *">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </Field>

              <Field label="التكلفة (اختياري)">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                />
              </Field>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>نشط</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
              {editingId ? (
                <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                  إلغاء التعديل
                </Button>
              ) : null}
              <Button type="submit" disabled={saveMutation.isPending} variant="primary">
                {editingId ? 'حفظ التعديل' : 'إضافة إلى القائمة'}
              </Button>
            </div>
          </form>
        </div>

        {/* 2. جدول الإضافات المسجلة */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Package size={15} />
            <span>2. قائمة الإضافات المسجلة (Registered Add-ons)</span>
          </div>

          <div className="table-responsive">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>جاري التحميل...</div>
            ) : (
              <table className="table" style={{ width: '100%', background: '#ffffff', borderRadius: '6px', overflow: 'hidden' }}>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>السعر</th>
                    <th>التكلفة</th>
                    <th>الحالة</th>
                    <th style={{ textAlign: 'center' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {addons.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        لا توجد إضافات مسجلة حالياً
                      </td>
                    </tr>
                  ) : (
                    addons.map((addon) => (
                      <tr key={addon.id}>
                        <td><strong>{addon.name}</strong></td>
                        <td>{addon.price}</td>
                        <td>{addon.costPrice || '—'}</td>
                        <td>
                          <span className="badge" style={{ background: addon.isActive === false ? '#fef2f2' : '#ecfdf5', color: addon.isActive === false ? '#ef4444' : '#10b981' }}>
                            {addon.isActive === false ? 'غير نشط' : 'نشط'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <Button variant="secondary" onClick={() => handleEdit(addon)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                              تعديل
                            </Button>
                            <Button variant="secondary" onClick={() => setDeletingId(addon.id!)} style={{ padding: '2px 8px', fontSize: '0.75rem', color: '#ef4444' }}>
                              حذف
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <ActionConfirmDialog
        open={Boolean(deletingId)}
        title="حذف الإضافة"
        description="هل أنت متأكد من حذف هذه الإضافة؟"
        confirmLabel="نعم، حذف"
        isBusy={deleteMutation.isPending}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) deleteMutation.mutate(deletingId);
        }}
      />
    </StandardDialog>
  );
}
