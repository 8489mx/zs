import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { StorefrontCoupon, CreateCouponPayload } from '../types/storefront.types';

export function StorefrontCouponsManager() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<StorefrontCoupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formMinOrderAmount, setFormMinOrderAmount] = useState<number>(0);
  const [formMaxDiscountAmount, setFormMaxDiscountAmount] = useState<string>('');
  const [formUsageLimit, setFormUsageLimit] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const couponsQuery = useQuery({
    queryKey: ['storefront-admin-coupons'],
    queryFn: storefrontApi.listCoupons,
  });

  const coupons = couponsQuery.data?.coupons || [];

  const createMutation = useMutation({
    mutationFn: storefrontApi.createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-coupons'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      setActionError(err.message || 'حدث خطأ أثناء حفظ الكوبون');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      storefrontApi.updateCoupon(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-coupons'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      setActionError(err.message || 'حدث خطأ أثناء تعديل الكوبون');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      storefrontApi.updateCoupon(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-coupons'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: storefrontApi.deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-coupons'] });
    },
    onError: (err: any) => {
      alert(`تعذر حذف الكوبون: ${err.message || 'خطأ غير معروف'}`);
    },
  });

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormDiscountType('percentage');
    setFormDiscountValue(10);
    setFormMinOrderAmount(0);
    setFormMaxDiscountAmount('');
    setFormUsageLimit('');
    setFormIsActive(true);
    setActionError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: StorefrontCoupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormDiscountType(coupon.discountType);
    setFormDiscountValue(coupon.discountValue);
    setFormMinOrderAmount(coupon.minOrderAmount || 0);
    setFormMaxDiscountAmount(coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '');
    setFormUsageLimit(coupon.usageLimit ? String(coupon.usageLimit) : '');
    setFormIsActive(coupon.isActive);
    setActionError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
    setActionError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');

    const cleanCode = formCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode) {
      setActionError('يرجى كتابة كود الكوبون');
      return;
    }

    const payload: CreateCouponPayload = {
      code: cleanCode,
      discountType: formDiscountType,
      discountValue: formDiscountType === 'free_shipping' ? 0 : Number(formDiscountValue) || 0,
      minOrderAmount: Number(formMinOrderAmount) || 0,
      maxDiscountAmount: formDiscountType === 'percentage' && formMaxDiscountAmount ? Number(formMaxDiscountAmount) : null,
      usageLimit: formUsageLimit ? Number(formUsageLimit) : null,
      isActive: formIsActive,
    };

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteCoupon = (coupon: StorefrontCoupon) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف الكوبون "${coupon.code}" نهائياً؟`)) {
      deleteMutation.mutate(coupon.id);
    }
  };

  const activeCount = coupons.filter((c) => c.isActive).length;
  const totalUses = coupons.reduce((sum, c) => sum + (c.timesUsed || 0), 0);

  return (
    <div style={{ width: '100%', direction: 'rtl' }}>
      {/* Header & Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* Stat 1: Total Coupons */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>إجمالي الكوبونات</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {coupons.length}
            </div>
          </div>
          <span style={{ fontSize: '24px' }}>🏷️</span>
        </div>

        {/* Stat 2: Active Coupons */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>كوبونات مفعلة حالياً</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {activeCount}
            </div>
          </div>
          <span style={{ fontSize: '24px' }}>⚡</span>
        </div>

        {/* Stat 3: Total Orders Used */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>مرات استخدام الزبائن</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {totalUses}
            </div>
          </div>
          <span style={{ fontSize: '24px' }}>🛒</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        {/* Card Header with Add Button */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              قائمة كوبونات الخصم وقواعد العروض
            </h3>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              أنشئ أكواد خصم ترويجية (نسبة مئوية، مبلغ مالي، أو شحن مجاني) وشاركها مع زبائنك
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(23, 14, 94, 0.2)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#110a47')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#170e5e')}
          >
            <span>+ إضافة كوبون جديد</span>
          </button>
        </div>

        {/* Coupons Table */}
        {couponsQuery.isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            جاري تحميل الكوبونات...
          </div>
        ) : coupons.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🏷️</span>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              لا توجد كوبونات خصم حالياً
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#94a3b8' }}>
              اضغط على زر "إضافة كوبون جديد" لبدء إنشاء أول كود خصم لمتجرك لزيادة المبيعات!
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                background: '#170e5e',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              إنشاء أول كوبون الآن
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>كود الكوبون</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>نوع الخصم</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>قيمة الخصم</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>الحد الأدنى للطلب</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>مرات الاستخدام</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const isMaxReached = typeof coupon.usageLimit === 'number' && coupon.timesUsed >= coupon.usageLimit;

                  return (
                    <tr
                      key={coupon.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      {/* Code */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '13px',
                              background: '#eff6ff',
                              color: '#1e40af',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #bfdbfe',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.code)}
                            title="نسخ الكود"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                              color: copiedCode === coupon.code ? '#16a34a' : '#64748b',
                              padding: '2px 4px',
                            }}
                          >
                            {copiedCode === coupon.code ? '✓ منسوخ' : '📋'}
                          </button>
                        </div>
                      </td>

                      {/* Discount Type */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 600 }}>
                        {coupon.discountType === 'percentage' && (
                          <span style={{ color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                            نسبة مئوية %
                          </span>
                        )}
                        {coupon.discountType === 'fixed' && (
                          <span style={{ color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                            مبلغ مالي ثابت
                          </span>
                        )}
                        {coupon.discountType === 'free_shipping' && (
                          <span style={{ color: '#6d28d9', background: '#ede9fe', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                            شحن مجاني 🚚
                          </span>
                        )}
                      </td>

                      {/* Value */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 700, color: '#0f172a' }}>
                        {coupon.discountType === 'percentage' && (
                          <div>
                            <span>{coupon.discountValue}%</span>
                            {coupon.maxDiscountAmount && (
                              <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
                                (بحد أقصى {coupon.maxDiscountAmount} ج)
                              </span>
                            )}
                          </div>
                        )}
                        {coupon.discountType === 'fixed' && <span>{coupon.discountValue} ج.م</span>}
                        {coupon.discountType === 'free_shipping' && <span style={{ color: '#6d28d9' }}>100% التوصيل</span>}
                      </td>

                      {/* Min Order */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#475569' }}>
                        {coupon.minOrderAmount > 0 ? (
                          <span>{coupon.minOrderAmount} ج.م فما فوق</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>بدون حد أدنى</span>
                        )}
                      </td>

                      {/* Usage */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>{coupon.timesUsed}</span>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>
                            / {coupon.usageLimit ? `${coupon.usageLimit} مرة` : 'غير محدود'}
                          </span>
                          {isMaxReached && (
                            <span style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              استنفد
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Toggle Active Switch */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleActiveMutation.mutate({ id: coupon.id, isActive: !coupon.isActive })}
                          disabled={toggleActiveMutation.isPending}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: coupon.isActive ? '#ecfdf5' : '#f1f5f9',
                            color: coupon.isActive ? '#059669' : '#64748b',
                            borderStyle: 'solid',
                            borderWidth: '1px',
                            borderColor: coupon.isActive ? '#a7f3d0' : '#cbd5e1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: coupon.isActive ? '#10b981' : '#94a3b8',
                            }}
                          />
                          <span>{coupon.isActive ? 'مفعل' : 'معطل'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(coupon)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(coupon)}
                            disabled={deleteMutation.isPending}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '5px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Coupon Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#ffffff',
              borderRadius: '14px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {editingCoupon ? `تعديل الكوبون: ${editingCoupon.code}` : 'إنشاء كوبون خصم جديد'}
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  حدد كود الخصم ونوعه وشروط تطبيقه
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '18px 20px' }}>
              {actionError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#991b1b',
                    marginBottom: '14px',
                  }}
                >
                  {actionError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Coupon Code Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    كود الكوبون (الرمز الترويجي) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="مثال: SAVE10 أو RAMADAN أو FREESHIP"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      direction: 'ltr',
                      textAlign: 'right',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                    سيقوم العميل بكتابة هذا الكود في شاشة الدفع للاستفادة من الخصم
                  </span>
                </div>

                {/* Discount Type Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    نوع الخصم
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setFormDiscountType('percentage')}
                      style={{
                        padding: '7px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: formDiscountType === 'percentage' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                        background: formDiscountType === 'percentage' ? '#f0f3ff' : '#ffffff',
                        color: formDiscountType === 'percentage' ? '#170e5e' : '#475569',
                      }}
                    >
                      نسبة مئوية (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDiscountType('fixed')}
                      style={{
                        padding: '7px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: formDiscountType === 'fixed' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                        background: formDiscountType === 'fixed' ? '#f0f3ff' : '#ffffff',
                        color: formDiscountType === 'fixed' ? '#170e5e' : '#475569',
                      }}
                    >
                      مبلغ ثابت (ج.م)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDiscountType('free_shipping')}
                      style={{
                        padding: '7px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: formDiscountType === 'free_shipping' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                        background: formDiscountType === 'free_shipping' ? '#f0f3ff' : '#ffffff',
                        color: formDiscountType === 'free_shipping' ? '#170e5e' : '#475569',
                      }}
                    >
                      شحن مجاني 🚚
                    </button>
                  </div>
                </div>

                {/* Discount Value (if percentage or fixed) */}
                {formDiscountType !== 'free_shipping' && (
                  <div style={{ display: 'grid', gridTemplateColumns: formDiscountType === 'percentage' ? '1fr 1fr' : '1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        {formDiscountType === 'percentage' ? 'نسبة الخصم (%):' : 'مبلغ الخصم (ج.م):'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={formDiscountType === 'percentage' ? 100 : undefined}
                        required
                        value={formDiscountValue}
                        onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {formDiscountType === 'percentage' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          أقصى خصم (ج.م) [اختياري]:
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="مثال: 50"
                          value={formMaxDiscountAmount}
                          onChange={(e) => setFormMaxDiscountAmount(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Conditions: Min Order & Usage Limit */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      الحد الأدنى للطلب (ج.م):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formMinOrderAmount}
                      onChange={(e) => setFormMinOrderAmount(Number(e.target.value))}
                      placeholder="0 = بدون حد أدنى"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      أقصى عدد مرات استخدام:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formUsageLimit}
                      onChange={(e) => setFormUsageLimit(e.target.value)}
                      placeholder="فارغ = غير محدود"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Active Checkbox */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#1e293b',
                    fontWeight: 700,
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    marginTop: '2px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#170e5e', cursor: 'pointer' }}
                  />
                  <span>تفعيل الكوبون فوراً للزبائن في المتجر الإلكتروني</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: '#170e5e',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(23, 14, 94, 0.2)',
                  }}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'جاري الحفظ...'
                    : editingCoupon
                    ? 'حفظ التعديلات'
                    : 'إنشاء وتفعيل الكوبون'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
