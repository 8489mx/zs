import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  XIcon,
  SearchIcon,
  HomeIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  PackageIcon,
  TruckIcon,
  UsersIcon,
  DollarSignIcon,
  WarehouseIcon,
  SettingsIcon,
  GlobeIcon,
  UtensilsIcon,
  ArrowRightIcon,
  BuildingIcon,
  CalendarIcon,
} from '@/shared/components/icons/AppIcons';

interface NavItem {
  id: string;
  label: string;
  subLabel?: string;
  path: string;
  icon: React.ReactNode;
  category: string;
  badge?: string;
}

interface SignageNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  storeName?: string;
}

export const SignageNavDrawer: React.FC<SignageNavDrawerProps> = ({
  isOpen,
  onClose,
  onBack,
  storeName = 'Z-Systems ERP',
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems: NavItem[] = useMemo(
    () => [
      // Quick Core
      {
        id: 'dashboard',
        label: 'لوحة التحكم الرئيسية',
        subLabel: 'مؤشرات الأداء ورادار الأعمال',
        path: '/dashboard',
        icon: <HomeIcon size={18} color="#170e5e" />,
        category: 'الرئيسية والكاشير',
      },
      {
        id: 'pos',
        label: 'نقطة البيع السريعة (POS)',
        subLabel: 'واجهة الكاشير وإصدار الفواتير',
        path: '/pos',
        icon: <ShoppingCartIcon size={18} color="#16a34a" />,
        category: 'الرئيسية والكاشير',
        badge: 'الكاشير',
      },
      {
        id: 'sales',
        label: 'المبيعات والفواتير',
        subLabel: 'سجل الفواتير وعروض الأسعار والعملاء',
        path: '/sales',
        icon: <ReceiptIcon size={18} color="#2563eb" />,
        category: 'الرئيسية والكاشير',
      },
      // Inventory & Purchases
      {
        id: 'products',
        label: 'دليل الأصناف والأسعار',
        subLabel: 'قوائم الأسعار والباركود والباركودات',
        path: '/products',
        icon: <PackageIcon size={18} color="#d97706" />,
        category: 'المخزون والمشتريات',
      },
      {
        id: 'inventory',
        label: 'المستودعات وحركات المخزون',
        subLabel: 'التحويلات وأرصدة المخازن والتوالف',
        path: '/inventory',
        icon: <WarehouseIcon size={18} color="#0891b2" />,
        category: 'المخزون والمشتريات',
      },
      {
        id: 'purchases',
        label: 'فواتير المشتريات',
        subLabel: 'أوامر الشراء وإدخال فواتير الموردين',
        path: '/purchases',
        icon: <BuildingIcon size={18} color="#4f46e5" />,
        category: 'المخزون والمشتريات',
      },
      {
        id: 'suppliers',
        label: 'دليل الموردين',
        subLabel: 'حسابات وأرصدة الموردين وجهات التوريد',
        path: '/suppliers',
        icon: <UsersIcon size={18} color="#7c3aed" />,
        category: 'المخزون والمشتريات',
      },
      // Finance & Management
      {
        id: 'customers',
        label: 'دليل العملاء والذمم',
        subLabel: 'أرصدة العملاء والائتمان وسجل المشتريات',
        path: '/customers',
        icon: <UsersIcon size={18} color="#0284c7" />,
        category: 'المالية والإدارة',
      },
      {
        id: 'accounts',
        label: 'المالية والحسابات العامة',
        subLabel: 'شجرة الحسابات والقيود والتحصيلات',
        path: '/accounts',
        icon: <DollarSignIcon size={18} color="#059669" />,
        category: 'المالية والإدارة',
      },
      {
        id: 'delivery-reps',
        label: 'مناديب التوصيل والشحن',
        subLabel: 'إسناد الطلبات ومتابعة التوصيل',
        path: '/delivery-reps',
        icon: <TruckIcon size={18} color="#ea580c" />,
        category: 'المالية والإدارة',
      },
      {
        id: 'hr',
        label: 'الموارد البشرية والموظفون',
        subLabel: 'الحضور والانصراف والورديات والرواتب',
        path: '/hr',
        icon: <CalendarIcon size={18} color="#6366f1" />,
        category: 'المالية والإدارة',
      },
      {
        id: 'settings',
        label: 'إعدادات النظام العامة',
        subLabel: 'تهيئة الفروع، الضرائب، الطابعات، والأذونات',
        path: '/settings',
        icon: <SettingsIcon size={18} color="#475569" />,
        category: 'المالية والإدارة',
      },
      // Portals & Screens
      {
        id: 'kds',
        label: 'شاشة المطبخ التفاعلية (KDS)',
        subLabel: 'توجيه طلبات المطاعم والمطبخ الذكي',
        path: '/kds',
        icon: <UtensilsIcon size={18} color="#dc2626" />,
        category: 'الشاشات والبوابات',
        badge: 'شاشة',
      },
      {
        id: 'hub',
        label: 'مركز البوابات الرقمية',
        subLabel: 'دليل كافة البوابات وشاشات الخدمة الذاتية',
        path: '/hub',
        icon: <GlobeIcon size={18} color="#0284c7" />,
        category: 'الشاشات والبوابات',
      },
    ],
    []
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) return navItems;
    const q = search.trim().toLowerCase();
    return navItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subLabel && item.subLabel.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [navItems, search]);

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: NavItem[] } = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Drawer Panel */}
      <aside
        style={{
          position: 'relative',
          width: '380px',
          maxWidth: '88vw',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '8px 0 28px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1010,
          borderLeft: '1px solid #e2e8f0',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 900,
                color: '#170e5e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>القائمة والتنقل السريع</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
              {storeName} • اختيار الوجهة المباشرة
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="إغلاق القائمة (Esc)"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Instant Back Button */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onBack();
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(23, 14, 94, 0.25)',
              transition: 'background-color 0.15s ease',
            }}
            title="الرجوع إلى الشاشة السابقة مباشرة"
          >
            <ArrowRightIcon size={16} color="#ffffff" strokeWidth={2.5} />
            <span>العودة للشاشة السابقة</span>
          </button>
        </div>

        {/* Search Filter */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                display: 'flex',
              }}
            >
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث سريع عن قسم أو شاشة..."
              style={{
                width: '100%',
                padding: '8px 34px 8px 12px',
                fontSize: '12.5px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Nav Links Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#64748b',
                  marginBottom: '6px',
                  paddingRight: '8px',
                  letterSpacing: '0.2px',
                }}
              >
                {category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    style={{
                      width: '100%',
                      textAlign: 'right',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#f1f5f9';
                    }}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subLabel && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            fontWeight: 500,
                            marginTop: '2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.subLabel}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '30px 16px',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              لا توجد شاشات مطابقة للبحث
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#64748b',
            fontWeight: 600,
          }}
        >
          <span>نسخة سطح المكتب (Electron)</span>
          <span>Z-Systems ERP</span>
        </div>
      </aside>
    </div>
  );
};
