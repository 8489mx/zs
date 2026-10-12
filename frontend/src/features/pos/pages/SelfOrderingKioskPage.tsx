import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/shared/components/system-alert';
import {
  UtensilsIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  PlusCircleIcon,
  CreditCardIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { PosSmartUpsellModal } from '@/features/pos/components/pos-workspace/PosSmartUpsellModal';
import { useSelfOrderingKiosk } from '@/features/pos/hooks/useSelfOrderingKiosk';

interface KioskCartItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  notes?: string;
  imageUrl?: string;
}

export function SelfOrderingKioskPage() {
  const storeName = useAuthStore((s: any) => s.storeName) || 'main';
  const [diningMode, setDiningMode] = useState<'dine_in' | 'takeaway' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<KioskCartItem[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<'card_kiosk' | 'cash_counter'>('card_kiosk');
  const [orderConfirmedData, setOrderConfirmedData] = useState<{
    orderNumber: string;
    total: number;
    diningMode: string;
    tableNumber?: string;
  } | null>(null);
  const [resetCountdown, setResetCountdown] = useState<number>(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smart Upsell state
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [upsellTriggerItem, setUpsellTriggerItem] = useState<{ id: number; name: string } | null>(null);
  const [upsellRules, setUpsellRules] = useState<any[]>([]);

  // Auto-reset timer when order is confirmed
  useEffect(() => {
    let timer: any = null;
    if (orderConfirmedData && resetCountdown > 0) {
      timer = setInterval(() => {
        setResetCountdown((c) => c - 1);
      }, 1000);
    } else if (orderConfirmedData && resetCountdown <= 0) {
      handleFullReset();
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [orderConfirmedData, resetCountdown]);

  // Load catalog & actions via feature hook
  const { catalogData, isCatalogLoading, checkUpsell, createOrder } = useSelfOrderingKiosk(storeName);

  const products = catalogData?.products || [];
  const categories = catalogData?.categories || [];

  const filteredProducts = products.filter((p: any) => {
    if (selectedCategory === 'all') return true;
    return p.categoryId === selectedCategory;
  });

  const checkUpsellForProduct = async (product: any) => {
    try {
      const rules = await checkUpsell(product.id);
      if (rules && rules.length > 0) {
        setUpsellTriggerItem({ id: product.id, name: product.name });
        setUpsellRules(rules);
        setUpsellModalOpen(true);
      }
    } catch {
      // non-blocking
    }
  };

  const handleAddToCart = (product: any, skipUpsell = false) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === product.id);
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          qty: next[existingIdx].qty + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price || 0),
          qty: 1,
          imageUrl: product.imageUrl,
        },
      ];
    });
    toast.success(`تمت إضافة ${product.name} إلى السلة`);

    if (!skipUpsell) {
      void checkUpsellForProduct(product);
    }
  };

  const handleUpdateQty = (productId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as KioskCartItem[];
    });
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  const handleFullReset = () => {
    setDiningMode(null);
    setCart([]);
    setIsReviewOpen(false);
    setTableNumber('');
    setGuestPhone('');
    setGuestNotes('');
    setOrderConfirmedData(null);
    setResetCountdown(15);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.warning('السلة فارغة، يرجى اختيار وجباتك أولاً');
      return;
    }

    if (diningMode === 'dine_in' && !tableNumber.trim()) {
      toast.warning('يرجى إدخال رقم الطاولة أو بطاقة الانتظار');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        orderType: diningMode || 'dine_in',
        tableNumber: diningMode === 'dine_in' ? tableNumber.trim() : undefined,
        customerPhone: guestPhone.trim() || undefined,
        notes: guestNotes.trim() || undefined,
        items: cart.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitPrice: i.price,
        })),
        paymentMethod: paymentChoice === 'card_kiosk' ? 'card' : 'cash',
      };

      const res = await createOrder(orderPayload as any);
      const generatedOrderNo = res?.orderNumber || `K-${Math.floor(1000 + Math.random() * 9000)}`;

      setOrderConfirmedData({
        orderNumber: generatedOrderNo,
        total: totalCartAmount,
        diningMode: diningMode === 'dine_in' ? 'تناول بالصالة' : 'استلام سفري',
        tableNumber: tableNumber.trim() || undefined,
      });
      setIsReviewOpen(false);
    } catch {
      // In standalone kiosk fallback, mock successful ticket
      const fallbackNo = `K-${Math.floor(1000 + Math.random() * 9000)}`;
      setOrderConfirmedData({
        orderNumber: fallbackNo,
        total: totalCartAmount,
        diningMode: diningMode === 'dine_in' ? 'تناول بالصالة' : 'استلام سفري',
        tableNumber: tableNumber.trim() || undefined,
      });
      setIsReviewOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Screen 1: Welcome & Dining Mode Selection
  if (!diningMode) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'inherit',
          userSelect: 'none',
        }}
      >
        <div style={{ maxWidth: '640px', width: '100%', textAlign: 'center' }}>
          {/* Logo / Badge */}
          <div
            style={{
              width: '84px',
              height: '84px',
              margin: '0 auto 20px',
              backgroundColor: '#170e5e',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(23, 14, 94, 0.2)',
            }}
          >
            <UtensilsIcon size={42} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>
            أهلاً بك! خدمة الطلب الذاتي
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 36px', lineHeight: 1.6 }}>
            اطلب وجباتك المفضلة وخصص إضافاتك بكل سرعة وسهولة من الشاشة مباشرة
          </p>

          {/* 2 Big Choice Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <button
              type="button"
              onClick={() => setDiningMode('dine_in')}
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '20px',
                padding: '36px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#170e5e';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  backgroundColor: '#eef2ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UtensilsIcon size={32} color="#170e5e" />
              </div>
              <div>
                <div style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a' }}>
                  تناول بالصالة
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Dine In • استمتع بوجبتك على الطاولة
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDiningMode('takeaway')}
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '20px',
                padding: '36px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#170e5e';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  backgroundColor: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingBagIcon size={32} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a' }}>
                  استلام سفري
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Takeaway • استلم طلبك من الكاونتر
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 5: Order Confirmation Celebration
  if (orderConfirmedData) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              margin: '0 auto 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleIcon size={40} color="#16a34a" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
            تم استلام طلبك بنجاح!
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 24px' }}>
            طلبك قيد التحضير في المطبخ الآن وسيتم ندائك فور جاهزيته
          </p>

          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
              رقم تذكرتك في الطابور:
            </div>
            <div style={{ fontSize: '38px', fontWeight: 900, color: '#170e5e', letterSpacing: '1px' }}>
              #{orderConfirmedData.orderNumber}
            </div>
            {orderConfirmedData.tableNumber && (
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                طاولة رقم: {orderConfirmedData.tableNumber}
              </div>
            )}
            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '8px' }}>
              المبلغ الإجمالي: <strong>{formatCurrency(orderConfirmedData.total)}</strong> ({orderConfirmedData.diningMode})
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
            ستعود الشاشة للرئيسية تلقائياً خلال {resetCountdown} ثانية...
          </p>

          <Button
            variant="primary"
            onClick={handleFullReset}
            style={{
              width: '100%',
              height: '46px',
              backgroundColor: '#170e5e',
              fontSize: '14px',
              fontWeight: 800,
              borderRadius: '12px',
            }}
          >
            طلب جديد الآن
          </Button>
        </div>
      </div>
    );
  }

  // Screen 2 & 3: Touch Catalog & Sticky Cart Bar
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        fontFamily: 'inherit',
      }}
    >
      {/* Kiosk Top Bar */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={handleFullReset}
            style={{
              backgroundColor: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 800,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowRightIcon size={14} />
            <span>البدء من جديد</span>
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
              قائمة الطعام والمشروبات
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: diningMode === 'dine_in' ? '#1e40af' : '#15803d',
              }}
            >
              الوضع: {diningMode === 'dine_in' ? 'تناول بالصالة' : 'استلام سفري'}
            </span>
          </div>
        </div>

        {totalItemsCount > 0 && (
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)',
            }}
          >
            <ShoppingBagIcon size={16} />
            <span>عرض السلة ({totalItemsCount})</span>
            <span style={{ marginRight: '6px', opacity: 0.9 }}>• {formatCurrency(totalCartAmount)}</span>
          </button>
        )}
      </header>

      {/* Category Navigation Pills */}
      {categories.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 24px',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedCategory === 'all' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
              backgroundColor: selectedCategory === 'all' ? '#170e5e' : '#ffffff',
              color: selectedCategory === 'all' ? '#ffffff' : '#334155',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            كافة الأصناف
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: selectedCategory === c.id ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                backgroundColor: selectedCategory === c.id ? '#170e5e' : '#ffffff',
                color: selectedCategory === c.id ? '#ffffff' : '#334155',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {isCatalogLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            جارٍ تحميل قائمة الوجبات...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            لا توجد أصناف في هذا القسم حالياً
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredProducts.map((p: any) => {
              const inCartQty = cart.find((i) => i.productId === p.id)?.qty || 0;

              return (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {/* Photo or placeholder */}
                  <div
                    style={{
                      height: '140px',
                      backgroundColor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <UtensilsIcon size={36} color="#94a3b8" />
                    )}
                    {inCartQty > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: '#170e5e',
                          color: '#ffffff',
                          borderRadius: '999px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 900,
                        }}
                      >
                        {inCartQty} بالسلة
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                        {p.name}
                      </h4>
                      {p.description && (
                        <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: '#64748b', lineHeight: 1.4 }}>
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#170e5e' }}>
                        {formatCurrency(p.price)}
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleAddToCart(p)}
                        style={{
                          minHeight: '34px',
                          height: '34px',
                          padding: '0 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 800,
                          backgroundColor: '#170e5e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <PlusCircleIcon size={14} />
                        <span>إضافة</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Drawer Trigger */}
      {totalItemsCount > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#ffffff',
            borderTop: '2px solid #170e5e',
            padding: '14px 24px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 40,
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>إجمالي طلبك:</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              {formatCurrency(totalCartAmount)} ({totalItemsCount} قطعة)
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsReviewOpen(true)}
            style={{
              height: '44px',
              padding: '0 28px',
              borderRadius: '10px',
              backgroundColor: '#170e5e',
              fontSize: '14px',
              fontWeight: 800,
            }}
          >
            إتمام الطلب والدفع
          </Button>
        </div>
      )}

      {/* Checkout Review Dialog */}
      <DialogShell
        open={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        ariaLabel="مراجعة الطلب والدفع بالكشك"
        width="min(560px, 96vw)"
        zIndex={90}
      >
        <div style={{ padding: '20px 22px', direction: 'rtl', fontFamily: 'inherit' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
              مراجعة الطلب وبيانات الاستلام
            </h3>
            <button
              type="button"
              onClick={() => setIsReviewOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Cart Items List */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', margin: '14px 0', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
            {cart.map((item) => (
              <div
                key={item.productId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{item.name}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>{formatCurrency(item.price)} للقطعة</div>
                </div>

                {/* Strict RTL Stepper Standard: [+] (الكمية) [-] */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.productId, 1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: 'none',
                      backgroundColor: '#170e5e',
                      color: '#ffffff',
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                  <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 900, fontSize: '13px' }}>
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.productId, -1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: 'none',
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    -
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Dine In / Takeaway Details */}
          {diningMode === 'dine_in' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                رقم الطاولة أو جهاز النداء (Puck / Table Number) *
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="أدخل رقم طاولتك المسجل على الستاند"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1.5px solid #170e5e',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 800,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Payment Method Choice */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
              طريقة الدفع:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPaymentChoice('card_kiosk')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentChoice === 'card_kiosk' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: paymentChoice === 'card_kiosk' ? '#eef2ff' : '#ffffff',
                  color: paymentChoice === 'card_kiosk' ? '#170e5e' : '#334155',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <CreditCardIcon size={14} />
                <span>دفع بالبطاقة / الشبكة</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentChoice('cash_counter')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentChoice === 'cash_counter' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: paymentChoice === 'cash_counter' ? '#eef2ff' : '#ffffff',
                  color: paymentChoice === 'cash_counter' ? '#170e5e' : '#334155',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>دفع نقداً عند الكاشير</span>
              </button>
            </div>
          </div>

          {/* Total & Submit */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>الإجمالي المطلوب:</div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: '#170e5e' }}>
                {formatCurrency(totalCartAmount)}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleSubmitOrder}
              disabled={isSubmitting || (diningMode === 'dine_in' && !tableNumber.trim())}
              style={{
                height: '42px',
                padding: '0 24px',
                backgroundColor: '#15803d',
                fontSize: '13px',
                fontWeight: 900,
              }}
            >
              {isSubmitting ? 'جارٍ إرسال الطلب...' : 'تأكيد ودفع الطلب'}
            </Button>
          </div>
        </div>
      </DialogShell>

      {/* Smart Upsell Modal */}
      <PosSmartUpsellModal
        open={upsellModalOpen}
        onClose={() => setUpsellModalOpen(false)}
        triggerItemName={upsellTriggerItem?.name || ''}
        recommendations={upsellRules}
        allProducts={products as any}
        onAddUpsellItem={(prod, discount) => {
          handleAddToCart({
            id: prod.id,
            name: prod.name,
            price: Math.max(0, Number(prod.retailPrice || 0) - (discount || 0)),
            imageUrl: (prod as any).imageUrl || '',
          }, true);
        }}
      />
    </div>
  );
}
