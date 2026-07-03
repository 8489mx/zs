import { useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/components/data-table/DataTable';
import type { DataTableColumn } from '@/shared/components/data-table/DataTable.types';
import { Location } from '@/types/domain';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import { useCreateLocationMutation, useUpdateLocationMutation, useDeleteLocationMutation } from '@/features/settings/hooks/useSettingsMutations';
import { Field } from '@/shared/ui/field';

export function LocationsManagementPage() {
  const { locationsQuery, branchesQuery } = useInventoryActionCatalog();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState('');

  const createMutation = useCreateLocationMutation(() => setModalOpen(false));
  const updateMutation = useUpdateLocationMutation(() => setModalOpen(false));
  const deleteMutation = useDeleteLocationMutation();

  const locations = locationsQuery.data || [];

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setName(location.name);
    setCode(location.code || '');
    setBranchId(String(location.branchId || ''));
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setName('');
    setCode('');
    setBranchId('');
    setModalOpen(true);
  };

  const handleDelete = async (location: Location) => {
    if (!window.confirm(`هل أنت متأكد من حذف المخزن "${location.name}"؟`)) return;
    deleteMutation.mutate(String(location.id));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateMutation.mutate({ locationId: String(editingLocation.id), values: { name, code, branchId } });
    } else {
      createMutation.mutate({ name, code, branchId });
    }
  };

  const columns: DataTableColumn<Location>[] = [
    { key: 'id', header: 'الرقم', cell: (row) => row.id },
    { key: 'name', header: 'الاسم', cell: (row) => row.name },
    { key: 'code', header: 'الكود', cell: (row) => row.code || '-' },
    { key: 'branchName', header: 'الفرع', cell: (row) => (row as any).branchName || row.branchId || 'الرئيسي' },
    {
      key: 'actions',
      header: 'إجراءات',
      cell: (row) => (
        <div className="actions" style={{ flexWrap: 'nowrap' }}>
          <button className="btn-icon" onClick={() => handleEdit(row)} title="تعديل">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </button>
          <button className="btn-icon text-danger" onClick={() => handleDelete(row)} title="حذف">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <main className="document-prototype-column" style={{ maxWidth: '1000px' }}>
      <PageHeader
        title="إدارة المخازن"
        description="إضافة، تعديل، وحذف المخازن في النظام"
      />
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleCreate}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          إضافة مخزن
        </button>
      </div>

      <FormSection title="قائمة المخازن">
        <DataTable
          columns={columns}
          data={locations}
          getRowKey={(row) => String(row.id)}
          loading={locationsQuery.isLoading}
        />
      </FormSection>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingLocation ? 'تعديل المخزن' : 'إضافة مخزن جديد'}</h2>
              <button className="btn-icon" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={onSave} className="form-grid">
                <Field label="اسم المخزن">
                  <input required value={name} onChange={(e) => setName(e.target.value)} disabled={createMutation.isPending || updateMutation.isPending} />
                </Field>
                <Field label="كود المخزن">
                  <input value={code} onChange={(e) => setCode(e.target.value)} disabled={createMutation.isPending || updateMutation.isPending} />
                </Field>
                <Field label="الفرع">
                  <select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={createMutation.isPending || updateMutation.isPending}>
                    <option value="">بدون ربط (فرع رئيسي)</option>
                    {(branchesQuery.data || []).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="actions" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingLocation ? 'حفظ التعديلات' : 'إضافة المخزن'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
