import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { productsApi } from '@/features/products/api/products.api';
import { useAppToolbar } from '@/stores/toolbar-store';
import { getErrorMessage } from '@/lib/errors';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { DialogShell } from '@/shared/components/dialog-shell';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';

export function ProductCategoriesPage() {
  useAppToolbar([{ label: 'أقسام المنتجات' }]);
  
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: productsApi.categories });
  const categories = categoriesQuery.data || [];
  
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: string | number; name: string } | null>(null);
  const [transferringCategory, setTransferringCategory] = useState<{ id: string | number; name: string } | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<{ id: string | number; name: string } | null>(null);
  const [editError, setEditError] = useState('');

  const filteredCategories = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter(c => (c.name || '').toLowerCase().includes(s));
  }, [categories, search]);

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string | number; name: string }) => productsApi.updateCategory(String(payload.id), { name: payload.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
      setEditError('');
    },
    onError: (err) => {
      setEditError(getErrorMessage(err, 'حدث خطأ أثناء تعديل القسم'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => productsApi.deleteCategory(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeletingCategory(null);
    }
  });

  const transferMutation = useMutation({
    mutationFn: (payload: { id: string | number; targetCategoryId: string }) => productsApi.transferCategory(String(payload.id), { targetCategoryId: Number(payload.targetCategoryId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setTransferringCategory(null);
      setTargetCategoryId('');
      setEditError('');
    },
    onError: (err) => {
      setEditError(getErrorMessage(err, 'حدث خطأ أثناء نقل الأصناف'));
    }
  });

  const handleSave = () => {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) {
      setEditError('الاسم مطلوب');
      return;
    }
    updateMutation.mutate({ id: editingCategory.id, name });
  };

  return (
    <div className="page-stack page-shell">
      <PageHeader 
        title="أقسام المنتجات" 
        description="إدارة وتعديل أسماء أقسام المنتجات التي تمت إضافتها للنظام."
      />

      <Card title="الأقسام" className="workspace-panel">
        <div style={{ marginBottom: 16 }}>
          <SearchToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="بحث في الأقسام..."
          />
        </div>

        {categoriesQuery.isLoading ? (
          <div className="muted">جاري التحميل...</div>
        ) : filteredCategories.length > 0 ? (
          <DataTable
            rows={filteredCategories}
            rowKey={(r) => String(r.id)}
            columns={[
              {
                key: 'name',
                header: 'اسم القسم',
                cell: (row) => row.name
              },
              {
                key: 'productCount',
                header: 'عدد الأصناف',
                cell: (row) => row.productCount || 0
              },
              {
                key: 'actions',
                header: '',
                cell: (row) => (
                  <div style={{ textAlign: 'left', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        setEditingCategory({ id: row.id, name: row.name });
                        setEditError('');
                      }}
                      title="تعديل الاسم"
                    >
                      تعديل
                    </Button>
                    {(row.productCount || 0) > 0 ? (
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setTransferringCategory({ id: row.id, name: row.name });
                          setTargetCategoryId('');
                          setEditError('');
                        }}
                        title="نقل الأصناف لقسم آخر"
                        style={{ color: 'var(--text-info)' }}
                      >
                        نقل الأصناف
                      </Button>
                    ) : (
                      <Button 
                        variant="secondary" 
                        onClick={() => setDeletingCategory({ id: row.id, name: row.name })}
                        title="حذف القسم"
                        style={{ color: 'var(--text-danger)' }}
                      >
                        حذف
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
          />
        ) : (
          <div className="muted">لا توجد أقسام متطابقة مع البحث.</div>
        )}
      </Card>

      {editingCategory && (
        <DialogShell 
          open={true} 
          onClose={() => setEditingCategory(null)}
          width="400px"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>تعديل اسم القسم</h3>
            <button className="icon-btn" onClick={() => setEditingCategory(null)} aria-label="إغلاق" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div className="form-grid single-col" style={{ padding: '24px' }}>
            <Field label="اسم القسم">
              <input 
                value={editingCategory.name} 
                onChange={(e) => setEditingCategory(c => c ? { ...c, name: e.target.value } : null)}
                placeholder="أدخل اسم القسم الجديد"
              />
            </Field>
            {editError && <div className="error-box">{editError}</div>}
          </div>
          <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--bg-muted)' }}>
            <Button variant="secondary" onClick={() => setEditingCategory(null)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديل'}
            </Button>
          </div>
        </DialogShell>
      )}

      {transferringCategory && (
        <DialogShell 
          open={true} 
          onClose={() => setTransferringCategory(null)}
          width="400px"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>نقل أصناف القسم</h3>
            <button className="icon-btn" onClick={() => setTransferringCategory(null)} aria-label="إغلاق" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div className="form-grid single-col" style={{ padding: '24px' }}>
            <div className="muted small" style={{ marginBottom: 12 }}>
              سيتم نقل جميع الأصناف التابعة لقسم "{transferringCategory.name}" إلى القسم التالي:
            </div>
            <Field label="القسم الوجهة">
              <select 
                value={targetCategoryId} 
                onChange={(e) => setTargetCategoryId(e.target.value)}
                className="purchase-prototype-field-input"
              >
                <option value="">اختر القسم...</option>
                {categories.filter(c => c.id !== transferringCategory.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            {editError && <div className="error-box">{editError}</div>}
          </div>
          <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--bg-muted)' }}>
            <Button variant="secondary" onClick={() => setTransferringCategory(null)}>إلغاء</Button>
            <Button 
              onClick={() => transferMutation.mutate({ id: transferringCategory.id, targetCategoryId })} 
              disabled={!targetCategoryId || transferMutation.isPending}
            >
              {transferMutation.isPending ? 'جاري النقل...' : 'نقل الأصناف'}
            </Button>
          </div>
        </DialogShell>
      )}

      {deletingCategory && (
        <ActionConfirmDialog
          open={true}
          title="حذف قسم"
          description={`هل أنت متأكد من حذف قسم "${deletingCategory.name}"؟`}
          confirmLabel="حذف"
          confirmVariant="danger"
          isBusy={deleteMutation.isPending}
          onConfirm={async () => {
            await deleteMutation.mutateAsync(deletingCategory.id);
          }}
          onCancel={() => setDeletingCategory(null)}
        />
      )}
    </div>
  );
}
