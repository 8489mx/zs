import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { Button } from '@/shared/ui/button';
import { systemAlert } from '@/shared/components/system-alert';
import { TruckIcon, LayersIcon } from '@/shared/components/icons/AppIcons';
import { UpsertDeliveryRepModal } from './UpsertDeliveryRepModal';

function DeliveryMotorcycleIcon({ isSelected }: { isSelected: boolean }) {
  return (
    <svg width="30" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Speed smoke puffs */}
      <path d="M2 24C3.5 23 4.5 21 3.5 19.5" stroke={isSelected ? "#94a3b8" : "#cbd5e1"} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.5 26.5C5 26 6 24 4.5 22.5" stroke={isSelected ? "#94a3b8" : "#cbd5e1"} strokeWidth="1.8" strokeLinecap="round" />

      {/* Rear Wheel (Solid Tire + Rim) */}
      <circle cx="9" cy="25" r="5" fill="#0f172a" />
      <circle cx="9" cy="25" r="3" fill="#64748b" />
      <circle cx="9" cy="25" r="1.2" fill="#ffffff" />

      {/* Front Wheel (Solid Tire + Rim) */}
      <circle cx="27" cy="25" r="5" fill="#0f172a" />
      <circle cx="27" cy="25" r="3" fill="#64748b" />
      <circle cx="27" cy="25" r="1.2" fill="#ffffff" />

      {/* Exhaust Pipe & Muffler */}
      <path d="M12 25H6" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

      {/* Engine Block */}
      <rect x="12" y="20" width="7" height="5" rx="1.5" fill="#334155" />

      {/* Motorcycle Frame (Sport Red / Cyan) */}
      <path d="M9 25L14 17H21L27 25" stroke="#ef4444" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* Gas Tank (Glossy Red) */}
      <path d="M17.5 14.5C19 14.5 22 15 22.5 17.5H16C16.5 15.5 17 14.5 17.5 14.5Z" fill="#dc2626" />

      {/* Seat (Black) */}
      <path d="M12 16C13 15.5 15.5 15.5 16.5 16L16 18H11.5L12 16Z" fill="#0f172a" />

      {/* Delivery Box (Bright Golden Yellow Top Box) */}
      <rect x="7" y="8.5" width="8" height="8" rx="1.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
      <rect x="10" y="8.5" width="2" height="8" fill="#d97706" />

      {/* Fork & Handlebars */}
      <path d="M21 17L24 10H27" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Headlight (Bright Glowing Yellow) */}
      <circle cx="26.5" cy="12.5" r="1.8" fill="#facc15" />
      <path d="M28.5 11.5L32 10.5M28.5 13.5L32 14.5" stroke="#fde047" strokeWidth="1.2" strokeLinecap="round" />

      {/* Rider Helmet (Blue with Dark Visor) */}
      <circle cx="18.5" cy="7.5" r="3.2" fill="#2563eb" />
      <path d="M19.5 6.5H22C22.5 6.5 22.5 8.5 21.5 8.5H19.5V6.5Z" fill="#0f172a" />
    </svg>
  );
}

export function DeliveryRepsList({ selectedRepId, onSelectRep }: { selectedRepId: number | null, onSelectRep: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<DeliveryRep | null>(null);

  const repsQuery = useQuery({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (data: { id: number, isActive: boolean }) => 
      deliveryRepsApi.update(data.id, { name: repsQuery.data?.find(r => r.id === data.id)?.name || '', isActive: data.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
    },
    onError: (error: any) => {
      if (error?.status === 403 || error?.details?.statusCode === 403) {
        systemAlert('ليس لديك صلاحية. تواصل مع مدير النظام لتفعيل هذه الخاصية.');
      } else {
        systemAlert(error.message || 'حدث خطأ أثناء تغيير الحالة');
      }
    }
  });

  const startEdit = (rep: DeliveryRep) => {
    setEditingRep(rep);
    setIsModalOpen(true);
  };

  const startAdd = () => {
    setEditingRep(null);
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Button variant="primary" style={{ width: '100%', background: '#170e5e' }} onClick={startAdd}>
          + إضافة مندوب جديد
        </Button>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#1e293b' }}>
            <div>
              <div style={{ fontWeight: 700 }}>بوابة المندوب للموبايل:</div>
              <code style={{ fontSize: '11px', color: '#0369a1', direction: 'ltr', display: 'inline-block' }}>/driver</code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button
              variant="secondary"
              style={{ fontSize: '11px', padding: '4px 8px' }}
              onClick={() => {
                const url = window.location.origin + '/driver';
                navigator.clipboard.writeText(url);
                systemAlert('تم نسخ رابط بوابة المندوب إلى الحافظة!\n' + url);
              }}
              title="نسخ الرابط لمشاركته مع المناديب على الواتساب"
            >
              نسخ الرابط
            </Button>
            <Button
              variant="secondary"
              style={{ fontSize: '11px', padding: '4px 8px', background: '#170e5e', color: '#ffffff', borderColor: '#170e5e' }}
              onClick={() => window.open('/driver', '_blank')}
              title="فتح بوابة المندوب في نافذة جديدة للتجربة"
            >
              فتح البوابة ↗
            </Button>
          </div>
        </div>
      </div>

      {/* Unified Modal Dialog for Add / Edit Delivery Rep */}
      <UpsertDeliveryRepModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRep(null);
        }}
        rep={editingRep}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {repsQuery.isLoading && <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</div>}
        {repsQuery.data?.map(rep => {
          const isSelected = selectedRepId === rep.id;
          const isVan = rep.rep_type === 'van' || (!rep.rep_type && rep.is_van_rep);
          const isBoth = rep.rep_type === 'both';

          return (
            <div 
              key={rep.id} 
              onClick={() => onSelectRep(rep.id)}
              style={{
                padding: '12px', 
                cursor: 'pointer', 
                borderRadius: '8px',
                marginBottom: '8px',
                border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
                background: isSelected ? '#f8fafc' : '#ffffff',
                boxShadow: isSelected ? '0 4px 12px rgba(15, 23, 42, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div 
                    title={isBoth ? 'مندوب شامل (دليفري وفان)' : isVan ? 'مندوب توزيع فان' : 'طيار دليفري'}
                    style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '10px', 
                      background: isBoth ? '#f5f3ff' : isVan ? '#f0f9ff' : '#ffffff', 
                      border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0,
                      boxShadow: isSelected ? '0 2px 8px rgba(15, 23, 42, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {isBoth ? (
                      <LayersIcon size={22} color="#7c3aed" />
                    ) : isVan ? (
                      <TruckIcon size={22} color="#0284c7" />
                    ) : (
                      <DeliveryMotorcycleIcon isSelected={false} />
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', display: 'block' }}>{rep.name}</span>
                      {isBoth ? (
                        <span style={{ fontSize: '10px', color: '#6d28d9', background: '#ede9fe', padding: '1px 6px', borderRadius: '4px', border: '1px solid #ddd6fe', fontWeight: 700 }}>
                          شامل (فان ودليفري)
                        </span>
                      ) : isVan ? (
                        <span style={{ fontSize: '10px', color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bae6fd', fontWeight: 700 }}>
                          توزيع فان
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#c2410c', background: '#ffedd5', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fed7aa', fontWeight: 700 }}>
                          طيار دليفري
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '3px' }}>
                      {rep.phone ? (
                        <span style={{ fontSize: '11px', color: '#64748b', direction: 'ltr', display: 'inline-block' }}>
                          {rep.phone}
                        </span>
                      ) : null}
                      {rep.vehicle_plate ? (
                        <span style={{ fontSize: '10px', color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                          لوحة: {rep.vehicle_plate}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {rep.is_active ? (
                  <span style={{ color: '#15803d', fontSize: '11px', fontWeight: 700, background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>نشط</span>
                ) : (
                  <span style={{ color: '#b91c1c', fontSize: '11px', fontWeight: 700, background: '#fee2e2', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fecaca' }}>موقوف</span>
                )}
              </div>
              
              {isSelected && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <Button variant="secondary" style={{ flex: 1, fontSize: '11px', padding: '4px' }} onClick={(e) => { e.stopPropagation(); startEdit(rep); }}>
                    تعديل البيانات
                  </Button>
                  <Button 
                    variant="secondary" 
                    style={{ 
                      flex: 1, 
                      fontSize: '11px', 
                      padding: '4px', 
                      color: rep.is_active ? '#dc2626' : '#16a34a',
                      background: rep.is_active ? '#fef2f2' : '#f0fdf4',
                      borderColor: rep.is_active ? '#fecaca' : '#bbf7d0'
                    }} 
                    onClick={(e) => { e.stopPropagation(); toggleActiveMutation.mutate({ id: rep.id, isActive: !rep.is_active }); }}
                  >
                    {rep.is_active ? 'إيقاف المندوب' : 'تفعيل المندوب'}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
