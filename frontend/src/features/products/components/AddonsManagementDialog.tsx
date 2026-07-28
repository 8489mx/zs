import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { addonsApi, type Addon } from '@/features/products/api/addons.api';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';

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
      setEditingId(null);
      setFormData({ name: '', price: 0, costPrice: 0, isActive: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: addonsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] });
      setDeletingId(null);
    }
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
    <DialogShell open={open} onClose={onClose} width="min(700px, 100vw)" ariaLabel="إدارة الإضافات">
      <header className="dialog-header">
        <h2 className="dialog-title">إدارة الإضافات (Modifiers)</h2>
      </header>

      <div className="dialog-body list-stack" style={{ padding: '24px 32px' }}>
        <form onSubmit={handleSubmit} className="form-grid" style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div className="form-group">
            <label>الاسم</label>
            <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>السعر (للعميل)</label>
            <input type="number" className="form-input" min={0} step={0.01} required value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
          </div>
          <div className="form-group">
            <label>التكلفة (اختياري)</label>
            <input type="number" className="form-input" min={0} step={0.01} value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
            <input type="checkbox" checked={formData.isActive !== false} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
            <label style={{ margin: 0 }}>نشط</label>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancelEdit}>إلغاء</Button>}
            <Button type="submit" disabled={saveMutation.isPending}>{editingId ? 'حفظ التعديل' : 'إضافة'}</Button>
          </div>
        </form>

        <div className="table-responsive" style={{ marginTop: '20px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>جاري التحميل...</div>
          ) : (
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>السعر</th>
                  <th>التكلفة</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {addons.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>لا توجد إضافات</td>
                  </tr>
                ) : (
                  addons.map((addon) => (
                    <tr key={addon.id}>
                      <td>{addon.name}</td>
                      <td>{addon.price}</td>
                      <td>{addon.costPrice || '-'}</td>
                      <td>
                        <span className="badge" style={{ background: addon.isActive === false ? '#fef2f2' : '#ecfdf5', color: addon.isActive === false ? '#ef4444' : '#10b981' }}>
                          {addon.isActive === false ? 'غير نشط' : 'نشط'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(addon)}>تعديل</button>
                          <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444' }} onClick={() => setDeletingId(addon.id!)}>حذف</button>
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

      <footer className="dialog-footer">
        <Button variant="secondary" onClick={onClose}>إغلاق</Button>
      </footer>

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
    </DialogShell>
  );
}
