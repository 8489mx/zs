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

export function ProductCategoriesPage() {
  useAppToolbar([{ label: 'أقسام المنتجات' }]);
  
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: productsApi.categories });
  const categories = categoriesQuery.data || [];
  
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: string | number; name: string } | null>(null);
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
                key: 'actions',
                header: '',
                cell: (row) => (
                  <div style={{ textAlign: 'left' }}>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        setEditingCategory({ id: row.id, name: row.name });
                        setEditError('');
                      }}
                    >
                      تعديل الاسم
                    </Button>
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
    </div>
  );
}
