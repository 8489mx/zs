import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/features/pos/api/pos.api';
import { settingsApi } from '@/features/settings/api/settings.api';
import { formatCurrency } from '@/lib/format';
import { printKitchenTicket } from '@/lib/pos-printing/kitchen';
import { toast } from '@/shared/components/system-alert';
import {
  UsersIcon,
  SearchIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SlidersIcon,
  ClockIcon,
  PlusCircleIcon,
  TrashIcon,
} from '@/shared/components/icons/AppIcons';

interface WaiterCartItem {
  id: string;
  productId: number;
  name: string;
  price: number;
  qty: number;
  notes?: string;
  modifiers?: Array<{ name: string; price: number }>;
}

export function WaiterStationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Authentication State
  const [waiterPin, setWaiterPin] = useState<string>('101');
  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(true);

  // Active Order State
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [cart, setCart] = useState<WaiterCartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeItemNoteModal, setActiveItemNoteModal] = useState<WaiterCartItem | null>(null);
  const [itemNoteText, setItemNoteText] = useState<string>('');

  // Settings & Configuration
  const { data: settings } = useQuery({
    queryKey: ['waiter-settings'],
    queryFn: () => settingsApi.getSettings(),
  });
  const tablesCount = Math.max(1, Number(settings?.restaurantTablesCount || 20));

  // Products Catalog (Cached & Fast)
  const { data: productsData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['waiter-products'],
    queryFn: () => posApi.searchProducts({ fullCatalog: true, limit: 100 }),
  });
  const products = productsData || [];

  // Active Held Drafts (To know occupied tables and their items)
  const { data: heldDrafts = [], refetch: refetchDrafts } = useQuery({
    queryKey: ['waiter-held-drafts'],
    queryFn: () => posApi.listHeldDrafts(),
    refetchInterval: 10_000,
  });

  const occupiedTablesMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const d of heldDrafts) {
      if (d.tableNumber && String(d.tableNumber).trim()) {
        map.set(String(d.tableNumber).trim(), d);
      }
    }
    return map;
  }, [heldDrafts]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of products) {
      if ((p as any).category?.name) cats.add((p as any).category.name);
      else if ((p as any).category_name) cats.add((p as any).category_name);
    }
    return Array.from(cats);
  }, [products]);

  // Filter products by category & search
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchCat =
        selectedCategory === 'all' ||
        (p.category?.name === selectedCategory || p.category_name === selectedCategory);
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Add Item to Waiter Cart
  const handleAddItem = (product: any) => {
    const existingIndex = cart.findIndex((item) => item.productId === product.id && !item.notes);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      const newItem: WaiterCartItem = {
        id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        productId: product.id,
        name: product.name,
        price: Number(product.price || product.retail_price || 0),
        qty: 1,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as WaiterCartItem[]
    );
  };

  const handleSaveItemNote = () => {
    if (!activeItemNoteModal) return;
    setCart((prev) =>
      prev.map((item) =>
        item.id === activeItemNoteModal.id ? { ...item, notes: itemNoteText.trim() || undefined } : item
      )
    );
    setActiveItemNoteModal(null);
    setItemNoteText('');
  };

  // Select Table
  const handleSelectTable = (tableNum: string) => {
    setSelectedTable(tableNum);
    const existingDraft = occupiedTablesMap.get(tableNum);
    if (existingDraft && Array.isArray(existingDraft.cart)) {
      setGuestCount(Number(existingDraft.guestCount || 2));
    } else {
      setGuestCount(2);
    }
    setCart([]);
  };

  // Submit & Send to Kitchen Mutation
  const sendToKitchenMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTable || cart.length === 0) return;

      const existingDraft = occupiedTablesMap.get(selectedTable);
      const existingCart = existingDraft?.cart || [];

      // Consolidate payload
      const combinedCart = [
        ...existingCart,
        ...cart.map((c) => ({
          productId: c.productId,
          productName: c.name,
          name: c.name,
          price: c.price,
          qty: c.qty,
          notes: c.notes,
          modifiers: c.modifiers || [],
        })),
      ];

      const draftPayload = {
        id: existingDraft?.id || `draft-${Date.now()}`,
        tableNumber: selectedTable,
        orderType: 'dine_in',
        guestCount,
        waiterPin,
        cart: combinedCart,
        updatedAt: new Date().toISOString(),
      };

      // 1. Save / Update Held Draft
      await posApi.saveHeldDraft(draftPayload);

      // 2. Thermal Kitchen Order Ticket (KOT)
      try {
        printKitchenTicket({
          ticketNumber: String(draftPayload.id).slice(-4),
          tableNumber: selectedTable,
          orderType: 'dine_in',
          items: cart.map((c) => ({
            name: c.name,
            qty: c.qty,
            notes: c.notes,
            modifiers: c.modifiers,
          })),
          timestamp: new Date(),
          serverName: `ويتر #${waiterPin}`,
        });
      } catch {
        // Kitchen print non-blocking
      }
    },
    onSuccess: () => {
      toast.success(`تم إرسال طلب طاولة ${selectedTable} إلى المطبخ بنجاح!`);
      queryClient.invalidateQueries({ queryKey: ['waiter-held-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['pos-floor-kds-tickets'] });
      setSelectedTable(null);
      setCart([]);
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إرسال الطلب إلى المطبخ.');
    },
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // VIEW 1: TABLE SELECTION (خريطة الطاولات السريعة للويتر)
  if (!selectedTable) {
    return (
      <div
        dir="rtl"
        style={{
          width: '100vw',
          height: '100vh',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top Header */}
        <header
          style={{
            background: '#170e5e',
            color: '#ffffff',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => navigate('/pos')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <ArrowRightIcon size={14} color="#ffffff" />
              <span>العودة للكاشير</span>
            </button>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
              محطة الويتر وكابتن الصالة (Captain Station)
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
              كابتن #{waiterPin}
            </span>
          </div>
        </header>

        {/* Subheader info banner */}
        <div style={{ background: '#eef2ff', borderBottom: '1px solid #c7d2fe', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#3730a3' }}>
            اختر الطاولة لتسجيل طلب جديد أو إضافة أصناف:
          </span>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: 700 }}>
            <span style={{ color: '#16a34a' }}>● شاغرة ({tablesCount - occupiedTablesMap.size})</span>
            <span style={{ color: '#dc2626' }}>● مشغولة ({occupiedTablesMap.size})</span>
          </div>
        </div>

        {/* Tables Grid */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
            gap: '12px',
            alignContent: 'start',
          }}
        >
          {Array.from({ length: tablesCount }, (_, i) => String(i + 1)).map((tNum) => {
            const occupied = occupiedTablesMap.get(tNum);
            const isOccupied = Boolean(occupied);
            const total = (occupied?.cart || []).reduce(
              (sum: number, it: any) => sum + (it.qty || 1) * Number(it.price || 0),
              0
            );

            return (
              <button
                key={tNum}
                type="button"
                onClick={() => handleSelectTable(tNum)}
                style={{
                  background: isOccupied ? '#fef2f2' : '#ffffff',
                  border: isOccupied ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px 10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'transform 0.1s ease',
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 900, color: isOccupied ? '#991b1b' : '#0f172a' }}>
                  طاولة {tNum}
                </div>
                {isOccupied ? (
                  <>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#dc2626' }}>
                      {formatCurrency(total)}
                    </div>
                    <span style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      مشغولة ({occupied.cart?.length || 0})
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                    شاغرة ومتاحة
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // VIEW 2: ACTIVE ORDER TAKING SCREEN (شاشة أخذ الطلب للطاولة المحددة)
  return (
    <div
      dir="rtl"
      style={{
        width: '100vw',
        height: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          background: '#170e5e',
          color: '#ffffff',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => {
              if (cart.length > 0) {
                if (window.confirm('هل تريد إلغاء الطلب الحالي والعودة لشبكة الطاولات؟')) {
                  setSelectedTable(null);
                  setCart([]);
                }
              } else {
                setSelectedTable(null);
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← تغيير الطاولة
          </button>
          <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>
            طاولة {selectedTable}
          </div>
        </div>

        {/* Covers RTL Stepper: [+] first, label, [-] last */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700 }}>الضيوف:</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#ffffff', borderRadius: '6px', height: '30px' }}>
            <button
              type="button"
              onClick={() => setGuestCount((c) => c + 1)}
              style={{ width: '30px', height: '100%', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 800, color: '#170e5e', cursor: 'pointer' }}
            >
              +
            </button>
            <span style={{ minWidth: '30px', textAlign: 'center', fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
              {guestCount}
            </span>
            <button
              type="button"
              onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
              style={{ width: '30px', height: '100%', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}
            >
              -
            </button>
          </div>
        </div>
      </header>

      {/* Main Body: Menu Left / Cart Right */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>
        {/* MENU COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #cbd5e1', overflow: 'hidden' }}>
          {/* Categories Horizontal Bar */}
          <div
            style={{
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              padding: '8px 12px',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              style={{
                background: selectedCategory === 'all' ? '#170e5e' : '#f1f5f9',
                color: selectedCategory === 'all' ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: selectedCategory === cat ? '#170e5e' : '#f1f5f9',
                  color: selectedCategory === cat ? '#ffffff' : '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px' }}>
              <SearchIcon size={14} color="#64748b" />
              <input
                type="text"
                placeholder="بحث سريع باسم الوجبة أو المشروب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* Product Items Grid */}
          <div
            style={{
              flex: 1,
              padding: '12px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '10px',
              alignContent: 'start',
            }}
          >
            {filteredProducts.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAddItem(p)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '85px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: '1.25' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#170e5e', marginTop: '6px' }}>
                  {formatCurrency(p.price || p.retail_price || 0)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CART COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              طلبات الطاولة الجديدة ({cartItemsCount})
            </div>
          </div>

          {/* Cart Items List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b', fontSize: '12px' }}>
                اضغط على الأصناف من القائمة لإضافتها للطلب.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                    <div style={{ fontSize: '12.5px', fontWeight: 900, color: '#170e5e' }}>
                      {formatCurrency(item.price * item.qty)}
                    </div>
                  </div>

                  {item.notes && (
                    <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 600, marginTop: '2px' }}>
                      ملاحظة: {item.notes}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    {/* RTL Stepper: [+] first, number, [-] last */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', height: '26px' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        style={{ width: '26px', height: '100%', border: 'none', background: 'transparent', fontWeight: 800, color: '#170e5e', cursor: 'pointer' }}
                      >
                        +
                      </button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '12px', fontWeight: 800 }}>
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        style={{ width: '26px', height: '100%', border: 'none', background: 'transparent', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}
                      >
                        -
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveItemNoteModal(item);
                        setItemNoteText(item.notes || '');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {item.notes ? 'تعديل الملاحظة' : '+ ملاحظة طبق'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer & Big Kitchen Action Button */}
          <div style={{ padding: '12px 14px', borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>إجمالي الطلب:</span>
              <strong style={{ fontSize: '16px', fontWeight: 900, color: '#170e5e' }}>{formatCurrency(cartTotal)}</strong>
            </div>

            <button
              type="button"
              disabled={cart.length === 0 || sendToKitchenMutation.isPending}
              onClick={() => sendToKitchenMutation.mutate()}
              style={{
                width: '100%',
                background: cart.length === 0 ? '#94a3b8' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 900,
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: cart.length > 0 ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
              }}
            >
              <CheckCircleIcon size={16} color="#ffffff" />
              <span>{sendToKitchenMutation.isPending ? 'جاري الإرسال...' : 'إرسال الطلب للمطبخ (Send to Kitchen)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Item Note Modal */}
      {activeItemNoteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '18px', width: '360px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              ملاحظات تحضير الطبق: {activeItemNoteModal.name}
            </h3>
            <textarea
              rows={3}
              placeholder="مثال: بدون بصل / صوص جانبي / مستوي جيداً / يقدم مع المقبلات"
              value={itemNoteText}
              onChange={(e) => setItemNoteText(e.target.value)}
              style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setActiveItemNoteModal(null)}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveItemNote}
                style={{ background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                تأكيد الملاحظة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default WaiterStationPage;
