import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryRepsApi, type DeliveryRep } from '../api/delivery-reps.api';
import { Button } from '@/shared/ui/button';

import { systemAlert } from '@/shared/components/system-alert';

export function DeliveryRepsList({ selectedRepId, onSelectRep }: { selectedRepId: number | null, onSelectRep: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const repsQuery = useQuery({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string, phone?: string }) => deliveryRepsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
      setIsAdding(false);
      setNameInput('');
      setPhoneInput('');
    },
    onError: (error: any) => {
      console.error('API Error details:', error.details || error);
      systemAlert((error.message || 'حدث خطأ أثناء الإضافة') + '\n\n' + JSON.stringify(error.details || {}));
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number, payload: { name: string, phone?: string, isActive?: boolean } }) => 
      deliveryRepsApi.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
      setEditingId(null);
    },
    onError: (error: any) => {
      systemAlert(error.message || 'حدث خطأ أثناء التعديل');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (data: { id: number, isActive: boolean }) => 
      deliveryRepsApi.update(data.id, { name: repsQuery.data?.find(r => r.id === data.id)?.name || '', isActive: data.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
    },
    onError: (error: any) => {
      systemAlert(error.message || 'حدث خطأ أثناء تغيير الحالة');
    }
  });

  const handleSave = () => {
    if (!nameInput.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: { name: nameInput, phone: phoneInput } });
    } else {
      createMutation.mutate({ name: nameInput, phone: phoneInput });
    }
  };

  const startEdit = (rep: DeliveryRep) => {
    setEditingId(rep.id);
    setNameInput(rep.name);
    setPhoneInput(rep.phone || '');
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setNameInput('');
    setPhoneInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
        {!isAdding && !editingId ? (
          <Button variant="primary" style={{ width: '100%' }} onClick={startAdd}>+ إضافة مندوب</Button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="اسم المندوب" 
              value={nameInput} 
              onChange={e => setNameInput(e.target.value)}
              className="purchase-prototype-field-input"
            />
            <input 
              type="text" 
              placeholder="رقم التليفون" 
              value={phoneInput} 
              onChange={e => setPhoneInput(e.target.value)}
              className="purchase-prototype-field-input"
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="primary" onClick={handleSave} style={{ flex: 1 }} disabled={!nameInput.trim() || createMutation.isPending || updateMutation.isPending}>
                حفظ
              </Button>
              <Button variant="secondary" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {repsQuery.isLoading && <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</div>}
        {repsQuery.data?.map(rep => (
          <div 
            key={rep.id} 
            onClick={() => onSelectRep(rep.id)}
            style={{
              padding: '16px', 
              cursor: 'pointer', 
              borderBottom: '1px solid var(--border)',
              background: selectedRepId === rep.id ? 'var(--primary-light, #eff6ff)' : 'transparent',
              fontWeight: selectedRepId === rep.id ? 'bold' : 'normal',
              color: selectedRepId === rep.id ? 'var(--primary, #2563eb)' : 'inherit',
              transition: 'background 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{rep.name}</span>
              {rep.is_active ? (
                <span style={{ color: '#16a34a', fontSize: '12px', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>نشط</span>
              ) : (
                <span style={{ color: '#ef4444', fontSize: '12px', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>موقوف</span>
              )}
            </div>
            
            {selectedRepId === rep.id && !editingId && !isAdding && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Button variant="secondary" style={{ flex: 1, fontSize: '12px', padding: '4px' }} onClick={(e) => { e.stopPropagation(); startEdit(rep); }}>
                  تعديل
                </Button>
                <Button variant="secondary" style={{ flex: 1, fontSize: '12px', padding: '4px', color: rep.is_active ? '#ef4444' : '#16a34a' }} onClick={(e) => { e.stopPropagation(); toggleActiveMutation.mutate({ id: rep.id, isActive: !rep.is_active }); }}>
                  {rep.is_active ? 'إيقاف' : 'تفعيل'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
