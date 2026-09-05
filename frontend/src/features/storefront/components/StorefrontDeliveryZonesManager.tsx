import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { StorefrontDeliveryZone, CreateDeliveryZonePayload } from '../types/storefront.types';

export function StorefrontDeliveryZonesManager() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<StorefrontDeliveryZone | null>(null);
  const [actionError, setActionError] = useState('');
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDeliveryFee, setFormDeliveryFee] = useState<number>(20);
  const [formEstimatedTime, setFormEstimatedTime] = useState('');
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const zonesQuery = useQuery({
    queryKey: ['storefront-admin-delivery-zones'],
    queryFn: storefrontApi.listDeliveryZones,
  });

  const zones = zonesQuery.data?.zones || [];

  const createMutation = useMutation({
    mutationFn: storefrontApi.createDeliveryZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-delivery-zones'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      setActionError(err.message || 'حدث خطأ أثناء حفظ منطقة التوصيل');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      storefrontApi.updateDeliveryZone(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-delivery-zones'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      setActionError(err.message || 'حدث خطأ أثناء تعديل منطقة التوصيل');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      storefrontApi.updateDeliveryZone(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-delivery-zones'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: storefrontApi.deleteDeliveryZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-delivery-zones'] });
    },
    onError: (err: any) => {
      alert(`تعذر حذف المنطقة: ${err.message || 'خطأ غير معروف'}`);
    },
  });

  const handleOpenCreateModal = () => {
    setEditingZone(null);
    setFormName('');
    setFormDeliveryFee(20);
    setFormEstimatedTime('');
    setFormSortOrder(zones.length);
    setFormIsActive(true);
    setActionError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (zone: StorefrontDeliveryZone) => {
    setEditingZone(zone);
    setFormName(zone.name);
    setFormDeliveryFee(zone.deliveryFee);
    setFormEstimatedTime(zone.estimatedTime || '');
    setFormSortOrder(zone.sortOrder ?? 0);
    setFormIsActive(zone.isActive !== false);
    setActionError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingZone(null);
    setActionError('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');

    const cleanName = formName.trim();
    if (!cleanName || cleanName.length < 2) {
      setActionError('يرجى إدخال اسم صحيح للمنطقة (حرفين على الأقل)');
      return;
    }

    if (formDeliveryFee < 0) {
      setActionError('رسوم التوصيل يجب أن تكون 0 أو أكثر');
      return;
    }

    const payload: CreateDeliveryZonePayload = {
      name: cleanName,
      deliveryFee: Number(formDeliveryFee),
      estimatedTime: formEstimatedTime.trim() || undefined,
      sortOrder: Number(formSortOrder || 0),
      isActive: formIsActive,
    };

    if (editingZone) {
      updateMutation.mutate({ id: editingZone.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeleteZone = (zone: StorefrontDeliveryZone) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف منطقة "${zone.name}"؟`)) {
      deleteMutation.mutate(zone.id);
    }
  };

  // Quick Preset Presets
  const applyPreset = async (presetList: Array<{ name: string; deliveryFee: number; estimatedTime: string; sortOrder: number }>) => {
    if (zones.length > 0) {
      if (!window.confirm('لديك مناطق توصيل معرفة بالفعل. هل تريد إضافة مناطق القالب الجديد إليها؟')) {
        return;
      }
    }

    setIsApplyingPreset(true);
    try {
      for (const item of presetList) {
        await storefrontApi.createDeliveryZone({
          name: item.name,
          deliveryFee: item.deliveryFee,
          estimatedTime: item.estimatedTime,
          sortOrder: zones.length + item.sortOrder,
          isActive: true,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-delivery-zones'] });
    } catch (err: any) {
      alert(`حدث خطأ أثناء تطبيق القالب: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setIsApplyingPreset(false);
    }
  };

  const localPreset = [
    { name: 'داخل الحي والمنطقة المجاورة', deliveryFee: 15, estimatedTime: '30 - 45 دقيقة', sortOrder: 1 },
    { name: 'أحياء مجاورة (نطاق متوسط)', deliveryFee: 25, estimatedTime: '45 - 60 دقيقة', sortOrder: 2 },
    { name: 'أطراف المدينة وضواحيها', deliveryFee: 40, estimatedTime: '60 - 90 دقيقة', sortOrder: 3 },
  ];

  const governoratesPreset = [
    { name: 'القاهرة والجيزة', deliveryFee: 35, estimatedTime: 'خلال 24 ساعة', sortOrder: 1 },
    { name: 'الإسكندرية ومحافظات الدلتا والوجه البحري', deliveryFee: 50, estimatedTime: '24 - 48 ساعة', sortOrder: 2 },
    { name: 'محافظات القناة (الإسماعيلية، السويس، بورسعيد)', deliveryFee: 55, estimatedTime: '24 - 48 ساعة', sortOrder: 3 },
    { name: 'محافظات الصعيد والوجه القبلي', deliveryFee: 65, estimatedTime: '48 - 72 ساعة', sortOrder: 4 },
  ];

  const activeZonesCount = zones.filter((z) => z.isActive !== false).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', direction: 'rtl' }}>
      {/* Top Banner / Explainer Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>🚚</span>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              تسعير التوصيل الذكي حسب المناطق والمحافظات (Shipping Zones Matrix)
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: activeZonesCount > 0 ? '#dcfce7' : '#f1f5f9',
                color: activeZonesCount > 0 ? '#166534' : '#64748b',
                padding: '2px 8px',
                borderRadius: '999px',
                border: activeZonesCount > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
              }}
            >
              {activeZonesCount > 0 ? `${activeZonesCount} منطقة نشطة` : 'لا توجد مناطق نشطة'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
            حدد رسوم توصيل مخصصة لكل حي أو محافظة تخدمها. عند إتمام الطلب، سيختار العميل منطقته وتُحسب رسوم التوصيل والإجمالي تلقائياً وبدقة.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '6px',
            background: '#170e5e',
            color: '#ffffff',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(23, 14, 94, 0.2)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#110a47')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#170e5e')}
        >
          <span>+</span>
          <span>إضافة منطقة توصيل جديدة</span>
        </button>
      </div>

      {/* Quick 1-Click Preset Templates Banner */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>⚡</span>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', display: 'block' }}>
              قوالب تسعير سريعة بضغطة زر واحدة:
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              أنشئ مصفوفة توصيل متكاملة جاهزة وفورية تناسب نشاطك
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={isApplyingPreset}
            onClick={() => applyPreset(localPreset)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              cursor: isApplyingPreset ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#170e5e')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
          >
            <span>🏘️</span>
            <span>قالب دليفري محلي (أحياء قريبة / متوسطة / بعيدة)</span>
          </button>

          <button
            type="button"
            disabled={isApplyingPreset}
            onClick={() => applyPreset(governoratesPreset)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              cursor: isApplyingPreset ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#170e5e')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
          >
            <span>🇪🇬</span>
            <span>قالب شحن محافظات (القاهرة / الإسكندرية / القناة / الصعيد)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {zonesQuery.isLoading ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '40px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '13px',
          }}
        >
          جاري تحميل مناطق التوصيل...
        </div>
      ) : zones.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px dashed #cbd5e1',
            padding: '36px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            📍
          </div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
            لم تقم بإضافة مناطق توصيل مخصصة بعد
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', maxWidth: '460px', lineHeight: 1.5 }}>
            حالياً يعتمد متجرك على قيمة التوصيل الثابتة المحددة في الإعدادات العامة. يمكنك تفعيل مصفوفة التوصيل الذكي بالضغط على أحد القوالب الجاهزة أعلاه أو إضافة مناطقك يدوياً.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + إضافة أول منطقة
            </button>
            <button
              type="button"
              onClick={() => applyPreset(localPreset)}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                background: '#f8fafc',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⚡ تطبيق قالب سريع
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1.5fr 0.8fr 1fr 100px',
              padding: '10px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '11.5px',
              fontWeight: 800,
              color: '#475569',
            }}
          >
            <div>اسم المنطقة / الحي</div>
            <div>رسوم التوصيل</div>
            <div>الوقت المتوقع</div>
            <div style={{ textAlign: 'center' }}>الترتيب</div>
            <div style={{ textAlign: 'center' }}>الحالة</div>
            <div style={{ textAlign: 'center' }}>إجراءات</div>
          </div>

          {/* Table Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {zones.map((zone, index) => {
              const isZoneActive = zone.isActive !== false;
              return (
                <div
                  key={zone.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.2fr 1.5fr 0.8fr 1fr 100px',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: index < zones.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: isZoneActive ? '#ffffff' : '#fafafa',
                    transition: 'background 0.1s ease',
                  }}
                >
                  {/* Zone Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>📍</span>
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: isZoneActive ? '#0f172a' : '#94a3b8',
                      }}
                    >
                      {zone.name}
                    </span>
                  </div>

                  {/* Delivery Fee */}
                  <div>
                    {zone.deliveryFee === 0 ? (
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        توصيل مجاني (0 ج)
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: '#170e5e',
                          fontFamily: 'monospace',
                        }}
                      >
                        {zone.deliveryFee} <span style={{ fontSize: '11px', fontFamily: 'inherit', fontWeight: 600 }}>ج.م</span>
                      </span>
                    )}
                  </div>

                  {/* Estimated Delivery Time */}
                  <div>
                    {zone.estimatedTime ? (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#475569',
                          background: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        ⏱️ {zone.estimatedTime}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>غير محدد</span>
                    )}
                  </div>

                  {/* Sort Order */}
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    #{zone.sortOrder ?? 0}
                  </div>

                  {/* Status Toggle */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      disabled={toggleActiveMutation.isPending}
                      onClick={() => toggleActiveMutation.mutate({ id: zone.id, isActive: !isZoneActive })}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: isZoneActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                        background: isZoneActive ? '#f0fdf4' : '#f1f5f9',
                        color: isZoneActive ? '#166534' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="انقر لتغيير حالة التفعيل"
                    >
                      {isZoneActive ? '✓ نشطة' : '✕ معطلة'}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(zone)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                      title="تعديل المنطقة"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDeleteZone(zone)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        cursor: 'pointer',
                      }}
                      title="حذف المنطقة"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Zone Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            direction: 'rtl',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🚚</span>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  {editingZone ? 'تعديل منطقة التوصيل' : 'إضافة منطقة توصيل جديدة'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} style={{ padding: '18px' }}>
              {actionError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#b91c1c',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '14px',
                  }}
                >
                  ⚠️ {actionError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Zone Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    اسم المنطقة أو الحي أو المحافظة: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: مدينة نصر ومصر الجديدة، أو داخل الحي، أو الإسكندرية"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Delivery Fee & Sort Order Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      رسوم التوصيل (ج.م): <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.5"
                      value={formDeliveryFee}
                      onChange={(e) => setFormDeliveryFee(Number(e.target.value))}
                      placeholder="مثال: 25"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12.5px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      اكتب 0 إذا كان التوصيل لهذه المنطقة مجانياً
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      ترتيب الظهور:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formSortOrder}
                      onChange={(e) => setFormSortOrder(Number(e.target.value))}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12.5px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Estimated Delivery Time */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    الوقت المتوقع للتوصيل (اختياري):
                  </label>
                  <input
                    type="text"
                    value={formEstimatedTime}
                    onChange={(e) => setFormEstimatedTime(e.target.value)}
                    placeholder="مثال: 45 - 60 دقيقة، أو خلال 24 ساعة"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    يظهر للعميل في شاشة الدفع ليمنحه ثقة ووضوحاً عن موعد وصول شحنته
                  </span>
                </div>

                {/* Active Toggle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    marginTop: '4px',
                  }}
                >
                  <label htmlFor="modalZoneActive" style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                    تفعيل المنطقة للعملاء في المتجر
                  </label>
                  <input
                    id="modalZoneActive"
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#170e5e', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '18px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#170e5e',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: createMutation.isPending || updateMutation.isPending ? 'wait' : 'pointer',
                    boxShadow: '0 1px 3px rgba(23, 14, 94, 0.2)',
                  }}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ المنطقة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
