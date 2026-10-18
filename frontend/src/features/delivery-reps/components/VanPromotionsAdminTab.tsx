import { useTranslation } from 'react-i18next';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import {
  PlusIcon,
  RefreshCwIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  LayersIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import { vanSalesApi, FmcgPromotion } from '../api/van-sales.api';

const PROMO_TYPE_LABELS: Record<string, string> = {
  mix_and_match: 'خلطات وباقات (Mix & Match)',
  tiered_qty: 'شرائح كميات وبونص',
  invoice_threshold: 'سقف قيمة الفاتورة',
};

export function VanPromotionsAdminTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<FmcgPromotion | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formPromoType, setFormPromoType] = useState<'mix_and_match' | 'tiered_qty' | 'invoice_threshold'>('mix_and_match');
  const [formApplyType, setFormApplyType] = useState<'free_bonus' | 'discount_percent' | 'discount_amount'>('free_bonus');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formMaxApps, setFormMaxApps] = useState('1');
  const [formPriority, setFormPriority] = useState('0');
  const [formNotes, setFormNotes] = useState('');

  // Conditions Form State
  const [conditionItems, setConditionItems] = useState<{ productId: number; productName: string; minQty: number }[]>([]);
  const [thresholdAmount, setThresholdAmount] = useState('5000');

  // Reward Form State
  const [rewardBonusProductId, setRewardBonusProductId] = useState<number | null>(null);
  const [rewardBonusProductName, setRewardBonusProductName] = useState('');
  const [rewardBonusQty, setRewardBonusQty] = useState('1');
  const [rewardDiscountPercent, setRewardDiscountPercent] = useState('5');
  const [rewardDiscountAmount, setRewardDiscountAmount] = useState('100');

  // Product Picker State
  const [selectedProdForCondition, setSelectedProdForCondition] = useState<number | null>(null);
  const [selectedProdQty, setSelectedProdQty] = useState('1');

  // Fetch Promotions
  const { data: promoData, isLoading, refetch } = useQuery({
    queryKey: ['van-admin-promotions'],
    queryFn: () => vanSalesApi.fetchAdminPromotions(),
  });

  const promotions = promoData?.promotions || [];

  // Fetch Products for search
  const { data: productsData } = useQuery({
    queryKey: ['catalog-products-for-promos'],
    queryFn: () => vanSalesApi.getAvailableProducts(),
    enabled: isDialogOpen,
  });

  const availableProducts = useMemo<Array<{ id: number; name: string; barcode: string; price: number }>>(() => {
    return (productsData || []).map((p: any) => ({
      id: Number(p.id || p.productId),
      name: String(p.name || p.productName || ''),
      barcode: String(p.barcode || ''),
      price: Number(p.retailPrice || p.retail_price || p.price || 0),
    }));
  }, [productsData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('تم تحديث العروض الترويجية بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      if (typeFilter !== 'all' && p.promoType !== typeFilter) return false;
      if (statusFilter === 'active' && !p.isActive) return false;
      if (statusFilter === 'inactive' && p.isActive) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesCode = (p.code || '').toLowerCase().includes(q);
        return matchesName || matchesCode;
      }
      return true;
    });
  }, [promotions, typeFilter, statusFilter, searchTerm]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (dto: any) => vanSalesApi.createAdminPromotion(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['van-admin-promotions'] });
      toast.success('تم إنشاء العرض الترويجي بنجاح');
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل إنشاء العرض الترويجي');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) => vanSalesApi.updateAdminPromotion(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['van-admin-promotions'] });
      toast.success('تم تعديل العرض الترويجي بنجاح');
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تعديل العرض الترويجي');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      vanSalesApi.toggleAdminPromotionActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['van-admin-promotions'] });
      toast.success('تم تحديث حالة العرض');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تغيير حالة العرض');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vanSalesApi.deleteAdminPromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['van-admin-promotions'] });
      toast.success('تم حذف العرض الترويجي');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل حذف العرض');
    },
  });

  const openCreateDialog = () => {
    setEditingPromo(null);
    setFormName('');
    setFormCode('');
    setFormPromoType('mix_and_match');
    setFormApplyType('free_bonus');
    setFormStartDate('');
    setFormEndDate('');
    setFormMaxApps('1');
    setFormPriority('0');
    setFormNotes('');
    setConditionItems([]);
    setThresholdAmount('5000');
    setRewardBonusProductId(null);
    setRewardBonusProductName('');
    setRewardBonusQty('1');
    setRewardDiscountPercent('5');
    setRewardDiscountAmount('100');
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: FmcgPromotion) => {
    setEditingPromo(promo);
    setFormName(promo.name);
    setFormCode(promo.code);
    setFormPromoType(promo.promoType as any);
    setFormApplyType(promo.applyType as any);
    setFormStartDate(promo.startDate || '');
    setFormEndDate(promo.endDate || '');
    setFormMaxApps(String(promo.maxApplicationsPerOrder || 1));
    setFormPriority(String(promo.priority || 0));
    setFormNotes(promo.notes || '');

    if (promo.promoType === 'mix_and_match') {
      const conds = Array.isArray(promo.buyConditions) ? promo.buyConditions : [promo.buyConditions];
      setConditionItems(conds.map((c: any) => ({
        productId: Number(c.productId),
        productName: c.productName || `صنف #${c.productId}`,
        minQty: Number(c.minQty || 1),
      })));
    } else if (promo.promoType === 'tiered_qty') {
      const cond = Array.isArray(promo.buyConditions) ? promo.buyConditions[0] : promo.buyConditions;
      if (cond && cond.productId) {
        setConditionItems([{
          productId: Number(cond.productId),
          productName: cond.productName || `صنف #${cond.productId}`,
          minQty: Number(cond.minQty || 1),
        }]);
      }
    } else if (promo.promoType === 'invoice_threshold') {
      setThresholdAmount(String(promo.buyConditions?.minInvoiceTotal || 5000));
    }

    setRewardBonusProductId(promo.reward?.bonusProductId || null);
    setRewardBonusProductName(promo.reward?.bonusProductName || '');
    setRewardBonusQty(String(promo.reward?.bonusQty || 1));
    setRewardDiscountPercent(String(promo.reward?.discountPercent || 5));
    setRewardDiscountAmount(String(promo.reward?.discountAmount || 100));

    setIsDialogOpen(true);
  };

  const handleAddConditionItem = () => {
    if (!selectedProdForCondition) {
      toast.warning('يرجى اختيار الصنف أولاً');
      return;
    }
    const prod = availableProducts.find((p) => p.id === selectedProdForCondition);
    if (!prod) return;

    if (conditionItems.some((c) => c.productId === prod.id)) {
      toast.warning('هذا الصنف مضاف بالفعل في شروط العرض');
      return;
    }

    setConditionItems([
      ...conditionItems,
      {
        productId: prod.id,
        productName: prod.name,
        minQty: Math.max(1, Number(selectedProdQty) || 1),
      },
    ]);
    setSelectedProdForCondition(null);
    setSelectedProdQty('1');
  };

  const handleRemoveConditionItem = (pId: number) => {
    setConditionItems(conditionItems.filter((c) => c.productId !== pId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('يرجى إدخال اسم العرض الترويجي');
      return;
    }

    let buyConditions: any = [];
    if (formPromoType === 'mix_and_match') {
      if (conditionItems.length < 2) {
        toast.error('عروض الخلطات (Mix & Match) تتطلب صنفين على الأقل');
        return;
      }
      buyConditions = conditionItems;
    } else if (formPromoType === 'tiered_qty') {
      if (conditionItems.length === 0) {
        toast.error('يرجى تحديد الصنف والكمية المطلوبة للشريحة');
        return;
      }
      buyConditions = conditionItems[0];
    } else if (formPromoType === 'invoice_threshold') {
      const minTotal = Number(thresholdAmount);
      if (isNaN(minTotal) || minTotal <= 0) {
        toast.error('يرجى إدخال حد أدنى صالح لقيمة الفاتورة');
        return;
      }
      buyConditions = { minInvoiceTotal: minTotal };
    }

    const reward: any = {};
    if (formApplyType === 'free_bonus') {
      if (!rewardBonusProductId) {
        toast.error('يرجى اختيار صنف الهدية / البونص المجاني');
        return;
      }
      reward.bonusProductId = rewardBonusProductId;
      reward.bonusProductName = rewardBonusProductName;
      reward.bonusQty = Math.max(1, Number(rewardBonusQty) || 1);
      reward.bonusReason = `عرض ترويجي: ${formName.trim()}`;
    } else if (formApplyType === 'discount_percent') {
      const pct = Number(rewardDiscountPercent);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        toast.error('يرجى إدخال نسبة خصم صالحة (1 - 100%)');
        return;
      }
      reward.discountPercent = pct;
    } else if (formApplyType === 'discount_amount') {
      const amt = Number(rewardDiscountAmount);
      if (isNaN(amt) || amt <= 0) {
        toast.error('يرجى إدخال قيمة خصم نقدية صالحة');
        return;
      }
      reward.discountAmount = amt;
    }

    const payload = {
      name: formName.trim(),
      code: formCode.trim() || undefined,
      promoType: formPromoType,
      applyType: formApplyType,
      buyConditions,
      reward,
      startDate: formStartDate || null,
      endDate: formEndDate || null,
      maxApplicationsPerOrder: Math.max(1, Number(formMaxApps) || 1),
      priority: Number(formPriority) || 0,
      notes: formNotes.trim() || null,
    };

    if (editingPromo) {
      updateMutation.mutate({ id: editingPromo.id, dto: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = async (promo: FmcgPromotion) => {
    const ok = await systemConfirm({
      title: 'حذف العرض الترويجي',
      message: `هل أنت متأكد من حذف العرض الترويجي «${promo.name}» نهائياً؟`,
      confirmText: 'نعم، حذف',
      cancelText: 'تراجع',
      variant: 'danger',
    });
    if (ok) {
      deleteMutation.mutate(promo.id);
    }
  };

  // KPI Calculations
  const activeCount = promotions.filter((p) => p.isActive).length;
  const mixMatchCount = promotions.filter((p) => p.promoType === 'mix_and_match').length;
  const tieredCount = promotions.filter((p) => p.promoType === 'tiered_qty' || p.promoType === 'invoice_threshold').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. KPI Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            {t('delivery_reps.van_promotions_admin_tab.s0', "إجمالي العروض الترويجية")}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            {promotions.length}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('delivery_reps.van_promotions_admin_tab.s1', "كافة الخطط والسياسات المسجلة")}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            {t('delivery_reps.van_promotions_admin_tab.s2', "العروض المفعلة حالياً")}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('delivery_reps.van_promotions_admin_tab.s3', "تطبق فورياً في سلة المناديب")}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            {t('delivery_reps.van_promotions_admin_tab.s4', "باقات وخلطات (Mix & Match)")}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#170e5e' }}>
            {mixMatchCount}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('delivery_reps.van_promotions_admin_tab.s5', "توليفات الأصناف المتزامنة")}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            {t('delivery_reps.van_promotions_admin_tab.s6', "شرائح الكميات وسقف الفاتورة")}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706' }}>
            {tieredCount}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('delivery_reps.van_promotions_admin_tab.s7', "حوافز زيادة حجم الطلبية")}
          </div>
        </div>
      </div>

      {/* 2. Action & Filter Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 320px', maxWidth: '420px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <SearchIcon
              size={16}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder={t('delivery_reps.van_promotions_admin_tab.s8', "البحث باسم العرض أو الكود...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 38px 0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            options={[
              { value: 'all', label: t('delivery_reps.van_promotions_admin_tab.s9', "كافة أنواع العروض") },
              { value: 'mix_and_match', label: t('delivery_reps.van_promotions_admin_tab.s10', "خلطات وباقات (Mix & Match)") },
              { value: 'tiered_qty', label: t('delivery_reps.van_promotions_admin_tab.s11', "شرائح كميات وبونص") },
              { value: 'invoice_threshold', label: t('delivery_reps.van_promotions_admin_tab.s12', "سقف قيمة الفاتورة") },
            ]}
            style={{ minWidth: '170px' }}
          />

          <CustomSelect
            value={statusFilter}
            onChange={(val: any) => setStatusFilter(val)}
            options={[
              { value: 'all', label: t('delivery_reps.van_promotions_admin_tab.s13', "كافة الحالات") },
              { value: 'active', label: t('delivery_reps.van_promotions_admin_tab.s14', "المفعلة فقط") },
              { value: 'inactive', label: t('delivery_reps.van_promotions_admin_tab.s15', "المعطلة") },
            ]}
            style={{ minWidth: '130px' }}
          />

          <Button
            variant="secondary"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCwIcon size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {t('delivery_reps.van_promotions_admin_tab.s16', "تحديث")}
          </Button>

          <Button
            onClick={openCreateDialog}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              height: '38px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <PlusIcon size={16} />
            {t('delivery_reps.van_promotions_admin_tab.s17', "إضافة عرض ترويجي")}
          </Button>
        </div>
      </div>

      {/* 3. Promotions Table / List */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12.5px' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('delivery_reps.van_promotions_admin_tab.s18', "العرض والكود")}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('delivery_reps.van_promotions_admin_tab.s19', "نوع العرض")}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('delivery_reps.van_promotions_admin_tab.s20', "شروط الشراء والتفعيل")}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('delivery_reps.van_promotions_admin_tab.s21', "المكافأة الممنوحة")}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('delivery_reps.van_promotions_admin_tab.s22', "فترة الصلاحية")}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('delivery_reps.van_promotions_admin_tab.s23', "الحالة")}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>{t('delivery_reps.van_promotions_admin_tab.s24', "الإجراءات")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    {t('delivery_reps.van_promotions_admin_tab.s25', "جاري تحميل العروض الترويجية...")}
                  </td>
                </tr>
              ) : filteredPromotions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <LayersIcon size={32} style={{ color: '#cbd5e1' }} />
                      <div style={{ fontWeight: 600, color: '#64748b' }}>{t('delivery_reps.van_promotions_admin_tab.s26', "لا توجد عروض ترويجية مسجلة حالياً")}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {t('delivery_reps.van_promotions_admin_tab.s27', "اضغط على «إضافة عرض ترويجي» لبدء برمجة باقات الخلطات وبونص الكميات")}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPromotions.map((p) => {
                  let conditionSummary = '';
                  if (p.promoType === 'mix_and_match') {
                    const conds = Array.isArray(p.buyConditions) ? p.buyConditions : [p.buyConditions];
                    conditionSummary = conds.map((c: any) => `${c.minQty}x ${c.productName || `صنف #${c.productId}`}`).join(' + ');
                  } else if (p.promoType === 'tiered_qty') {
                    const cond = Array.isArray(p.buyConditions) ? p.buyConditions[0] : p.buyConditions;
                    conditionSummary = `شراء ${cond?.minQty || 1} قطعة فأكثر من ${cond?.productName || t('delivery_reps.van_promotions_admin_tab.s28', "الصنف")}`;
                  } else if (p.promoType === 'invoice_threshold') {
                    conditionSummary = `فاتورة تتجاوز ${Number(p.buyConditions?.minInvoiceTotal || 0).toLocaleString()} ج.م`;
                  }

                  let rewardSummary = '';
                  if (p.applyType === 'free_bonus') {
                    rewardSummary = `بونص: ${p.reward?.bonusQty || 1}x ${p.reward?.bonusProductName || t('delivery_reps.van_promotions_admin_tab.s29', "صنف مجاني")} (0.00 ج.م)`;
                  } else if (p.applyType === 'discount_percent') {
                    rewardSummary = `خصم ${p.reward?.discountPercent}%`;
                  } else if (p.applyType === 'discount_amount') {
                    rewardSummary = `خصم ${p.reward?.discountAmount} ج.م`;
                  }

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                          {p.code}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor:
                              p.promoType === 'mix_and_match'
                                ? '#eef2ff'
                                : p.promoType === 'tiered_qty'
                                ? '#fef3c7'
                                : '#f0fdf4',
                            color:
                              p.promoType === 'mix_and_match'
                                ? '#3730a3'
                                : p.promoType === 'tiered_qty'
                                ? '#92400e'
                                : '#166534',
                          }}
                        >
                          {PROMO_TYPE_LABELS[p.promoType] || p.promoType}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                        <div style={{ fontSize: '12.5px', color: '#1e293b', fontWeight: 500 }}>
                          {conditionSummary || '—'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: p.applyType === 'free_bonus' ? '#16a34a' : '#170e5e',
                          }}
                        >
                          {rewardSummary || '—'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '11.5px' }}>
                        {p.startDate || p.endDate ? (
                          <div>
                            <div>{t('delivery_reps.van_promotions_admin_tab.s30', "من:")} {p.startDate || t('delivery_reps.van_promotions_admin_tab.s31', "البداية")}</div>
                            <div>{t('delivery_reps.van_promotions_admin_tab.s32', "إلى:")} {p.endDate || t('delivery_reps.van_promotions_admin_tab.s33', "حتى إشعار آخر")}</div>
                          </div>
                        ) : (
                          t('delivery_reps.van_promotions_admin_tab.s34', "مستمر دائم")
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <button
                          type="button"
                          onClick={() => toggleActiveMutation.mutate({ id: p.id, isActive: !p.isActive })}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: p.isActive ? '#dcfce7' : '#f1f5f9',
                            color: p.isActive ? '#15803d' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: p.isActive ? '#16a34a' : '#94a3b8',
                            }}
                          />
                          {p.isActive ? t('delivery_reps.van_promotions_admin_tab.s35', "مفعل") : t('delivery_reps.van_promotions_admin_tab.s36', "معطل")}
                        </button>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openEditDialog(p)}
                            title={t('delivery_reps.van_promotions_admin_tab.s37', "تعديل العرض")}
                            style={{
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#475569',
                            }}
                          >
                            <EditIcon size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            title={t('delivery_reps.van_promotions_admin_tab.s38', "حذف العرض")}
                            style={{
                              border: '1px solid #fee2e2',
                              backgroundColor: '#fff5f5',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#dc2626',
                            }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Upsert Promotion Modal */}
      {isDialogOpen && (
        <StandardDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title={editingPromo ? t('delivery_reps.van_promotions_admin_tab.s39', "تعديل العرض الترويجي") : t('delivery_reps.van_promotions_admin_tab.s40', "برمجة عرض ترويجي جديد")}
          subtitle={t('delivery_reps.van_promotions_admin_tab.s41', "تحديد باقات الخلطات (Mix & Match) والشرائح الكمية والبونص العيني التلقائي")}
          width="780px"
          minHeight="540px"
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  {t('delivery_reps.van_promotions_admin_tab.s42', "اسم العرض الترويجي *")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('delivery_reps.van_promotions_admin_tab.s43', "مثال: باقة عصير 5+2 = 1 مجاناً")}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  {t('delivery_reps.van_promotions_admin_tab.s44', "كود العرض (اختياري)")}
                </label>
                <input
                  type="text"
                  placeholder={t('delivery_reps.van_promotions_admin_tab.s45', "مثال: PROMO-JUICE-01")}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  {t('delivery_reps.van_promotions_admin_tab.s46', "نوع العرض الترويجي *")}
                </label>
                <CustomSelect
                  value={formPromoType}
                  onChange={(val: any) => setFormPromoType(val)}
                  options={[
                    { value: 'mix_and_match', label: t('delivery_reps.van_promotions_admin_tab.s47', "خلطات وباقات (Mix & Match)") },
                    { value: 'tiered_qty', label: t('delivery_reps.van_promotions_admin_tab.s48', "شرائح كميات الصنف") },
                    { value: 'invoice_threshold', label: t('delivery_reps.van_promotions_admin_tab.s49', "سقف قيمة الفاتورة") },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  {t('delivery_reps.van_promotions_admin_tab.s50', "نوع المكافأة الممنوحة *")}
                </label>
                <CustomSelect
                  value={formApplyType}
                  onChange={(val: any) => setFormApplyType(val)}
                  options={[
                    { value: 'free_bonus', label: t('delivery_reps.van_promotions_admin_tab.s51', "بونص عيني مجاني (0.00 ج.م)") },
                    { value: 'discount_percent', label: t('delivery_reps.van_promotions_admin_tab.s52', "خصم نسبة مئوية (%)") },
                    { value: 'discount_amount', label: t('delivery_reps.van_promotions_admin_tab.s53', "خصم نقدي مقطوع (ج.م)") },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Conditions Builder */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                {t('delivery_reps.van_promotions_admin_tab.s54', "شروط الشراء والتفعيل")}
              </div>

              {formPromoType === 'invoice_threshold' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    {t('delivery_reps.van_promotions_admin_tab.s55', "الحد الأدنى لقيمة الفاتورة (ج.م) *")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={thresholdAmount}
                    onChange={(e) => setThresholdAmount(e.target.value)}
                    style={{
                      width: '220px',
                      height: '36px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Selected items list */}
                  {conditionItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {conditionItems.map((c) => (
                        <div
                          key={c.productId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#ffffff',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                            {c.productName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {t('delivery_reps.van_promotions_admin_tab.s56', "الكمية المطلوبة:")} <b>{c.minQty}</b>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveConditionItem(c.productId)}
                              style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <XIcon size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Product picker */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <CustomSelect
                        value={selectedProdForCondition ? String(selectedProdForCondition) : ''}
                        onChange={(val) => setSelectedProdForCondition(Number(val))}
                        options={[
                          { value: '', label: t('delivery_reps.van_promotions_admin_tab.s57', "اختر الصنف المطلوب...") },
                          ...availableProducts.map((p) => ({
                            value: String(p.id),
                            label: `${p.name} (${p.price} ج.م)`,
                          })),
                        ]}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <input
                      type="number"
                      min="1"
                      placeholder={t('delivery_reps.van_promotions_admin_tab.s58', "الكمية")}
                      value={selectedProdQty}
                      onChange={(e) => setSelectedProdQty(e.target.value)}
                      style={{
                        width: '80px',
                        height: '36px',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        textAlign: 'center',
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddConditionItem}
                      style={{ height: '36px', fontSize: '12px' }}
                    >
                      {t('delivery_reps.van_promotions_admin_tab.s59', "+ إضافة صنف")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Reward Builder */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                {t('delivery_reps.van_promotions_admin_tab.s60', "المكافأة الممنوحة عند التفعيل")}
              </div>

              {formApplyType === 'free_bonus' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                      {t('delivery_reps.van_promotions_admin_tab.s61', "صنف الهدية / البونص المجاني *")}
                    </label>
                    <CustomSelect
                      value={rewardBonusProductId ? String(rewardBonusProductId) : ''}
                      onChange={(val) => {
                        const pid = Number(val);
                        setRewardBonusProductId(pid);
                        const p = availableProducts.find((x) => x.id === pid);
                        setRewardBonusProductName(p ? p.name : '');
                      }}
                      options={[
                        { value: '', label: t('delivery_reps.van_promotions_admin_tab.s62', "اختر صنف البونص المجاني...") },
                        ...availableProducts.map((p) => ({
                          value: String(p.id),
                          label: p.name,
                        })),
                      ]}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                      {t('delivery_reps.van_promotions_admin_tab.s63', "كمية البونص *")}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={rewardBonusQty}
                      onChange={(e) => setRewardBonusQty(e.target.value)}
                      style={{
                        width: '100%',
                        height: '36px',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        textAlign: 'center',
                      }}
                    />
                  </div>
                </div>
              ) : formApplyType === 'discount_percent' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                    {t('delivery_reps.van_promotions_admin_tab.s64', "نسبة الخصم المئوية (%) *")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={rewardDiscountPercent}
                    onChange={(e) => setRewardDiscountPercent(e.target.value)}
                    style={{
                      width: '140px',
                      height: '36px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                    {t('delivery_reps.van_promotions_admin_tab.s65', "مبلغ الخصم النقدي (ج.م) *")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rewardDiscountAmount}
                    onChange={(e) => setRewardDiscountAmount(e.target.value)}
                    style={{
                      width: '160px',
                      height: '36px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Dates & Limits */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  {t('delivery_reps.van_promotions_admin_tab.s66', "تاريخ البداية (اختياري)")}
                </label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  {t('delivery_reps.van_promotions_admin_tab.s67', "تاريخ الانتهاء (اختياري)")}
                </label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  {t('delivery_reps.van_promotions_admin_tab.s68', "تكرار الباقة بالفاتورة")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formMaxApps}
                  onChange={(e) => setFormMaxApps(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>

            <StandardDialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
                {t('delivery_reps.van_promotions_admin_tab.s69', "إلغاء")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                {editingPromo ? t('delivery_reps.van_promotions_admin_tab.s70', "حفظ التعديلات") : t('delivery_reps.van_promotions_admin_tab.s71', "إنشاء وتفعيل العرض")}
              </Button>
            </StandardDialogFooter>
          </form>
        </StandardDialog>
      )}
    </div>
  );
}
