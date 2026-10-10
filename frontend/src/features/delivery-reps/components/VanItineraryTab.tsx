import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { vanSalesApi, VanCustomerItineraryItem } from '../api/van-sales.api';
import {
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SearchIcon,
  PhoneIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CalendarIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  PlusIcon,
  SlidersIcon,
  PlayIcon,
  CreditCardIcon,
  ReceiptIcon,
  RotateCcwIcon,
} from '@/shared/components/icons/AppIcons';
import { catalogApi } from '@/lib/api/catalog';

interface VanItineraryTabProps {
  itinerary: VanCustomerItineraryItem[];
  tripId?: number;
  onSelectCustomerForSale: (customerId: number) => void;
  onSelectCustomerForReturn?: (customerId: number) => void;
  onSelectCustomerForCollection?: (customerId: number) => void;
  onRefreshItinerary: () => void;
  isLoading?: boolean;
  activeVisit?: {
    customerId: number;
    customerName: string;
    startedAt: number;
    startedTimeStr?: string;
  } | null;
  onStartVisit?: (customerId: number, customerName: string) => void;
  onEndVisit?: () => void;
}

const DAY_ALIASES: Record<string, string[]> = {
  sunday: ['sunday', 'الأحد', 'احد'],
  monday: ['monday', 'الإثنين', 'الاثنين', 'إثنين', 'اثنين'],
  tuesday: ['tuesday', 'الثلاثاء', 'ثلاثاء', 'تلات', 'التلات'],
  wednesday: ['wednesday', 'الأربعاء', 'الاربعاء', 'أربعاء', 'اربعاء'],
  thursday: ['thursday', 'الخميس', 'خميس'],
  friday: ['friday', 'الجمعة', 'جمعة'],
  saturday: ['saturday', 'السبت', 'سبت'],
};

const ALL_WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'] as const;

function normalizeDayKey(day?: string): string {
  if (!day) return '';
  const d = day.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(DAY_ALIASES)) {
    if (aliases.some((a) => d === a || d.includes(a))) {
      return key;
    }
  }
  return d;
}

function customerMatchesDay(
  item: VanCustomerItineraryItem,
  targetDay: string,
  todayArabicName: string,
): boolean {
  if (!targetDay || targetDay === 'all') return true;

  const targetKey = normalizeDayKey(targetDay);
  const todayKey = normalizeDayKey(todayArabicName);
  const isTargetToday = targetDay === 'today' || (targetKey && targetKey === todayKey);

  const days: string[] = [
    ...(Array.isArray(item.visitDays) ? item.visitDays : []),
    ...(item.visitDay ? [item.visitDay] : []),
  ];

  // If customer has no specific restricted visit days:
  // They are available every day (open route / daily itinerary)
  if (days.length === 0) {
    return true;
  }

  // If target day is today and customer is marked scheduled today
  if (isTargetToday && item.isScheduledToday) {
    return true;
  }

  // Match against customer's assigned days (supports Arabic or English names)
  return days.some((d) => normalizeDayKey(d) === targetKey);
}

interface VanItineraryPaginationProps {
  startIdx: number;
  pageSize: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const VanItineraryPagination: React.FC<VanItineraryPaginationProps> = ({
  startIdx,
  pageSize,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalCount === 0 || totalPages <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '5px 10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        gap: '6px',
        flexWrap: 'nowrap',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Right Cluster: Count & Page Size Selector */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
          {startIdx + 1}-{Math.min(startIdx + pageSize, totalCount)}
          <span style={{ color: '#64748b', fontSize: '10.5px', fontWeight: 500, margin: '0 2px' }}>من</span>
          {totalCount}
        </span>

        <span style={{ width: '1px', height: '14px', backgroundColor: '#e2e8f0', margin: '0 1px' }} />

        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          title="عدد العناصر المعروضة لكل صفحة"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '1px 5px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#170e5e',
            cursor: 'pointer',
            outline: 'none',
            height: '25px',
          }}
        >
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={20}>20</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Left Cluster: Page Navigation */}
      {totalCount > pageSize && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              height: '25px',
              padding: '0 7px',
              borderRadius: '6px',
              border: '1px solid ' + (currentPage <= 1 ? '#e2e8f0' : '#cbd5e1'),
              backgroundColor: currentPage <= 1 ? '#f8fafc' : '#ffffff',
              color: currentPage <= 1 ? '#cbd5e1' : '#170e5e',
              fontSize: '10.5px',
              fontWeight: 800,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              boxShadow: currentPage <= 1 ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <ArrowRightIcon size={11} />
            <span>السابق</span>
          </button>

          <span
            dir="ltr"
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#170e5e',
              minWidth: '32px',
              textAlign: 'center',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              padding: '0 2px',
            }}
          >
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              height: '25px',
              padding: '0 7px',
              borderRadius: '6px',
              border: '1px solid ' + (currentPage >= totalPages ? '#e2e8f0' : '#cbd5e1'),
              backgroundColor: currentPage >= totalPages ? '#f8fafc' : '#ffffff',
              color: currentPage >= totalPages ? '#cbd5e1' : '#170e5e',
              fontSize: '10.5px',
              fontWeight: 800,
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              boxShadow: currentPage >= totalPages ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <span>التالي</span>
            <ArrowLeftIcon size={11} />
          </button>
        </div>
      )}
    </div>
  );
};

export const VanItineraryTab: React.FC<VanItineraryTabProps> = ({
  itinerary,
  tripId,
  onSelectCustomerForSale,
  onSelectCustomerForReturn,
  onSelectCustomerForCollection,
  onRefreshItinerary,
  isLoading,
  activeVisit,
  onStartVisit,
  onEndVisit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'positive' | 'negative'>('all');
  const [dayFilter, setDayFilter] = useState<'today' | 'all' | string>('today');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zs_van_itinerary_page_size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([10, 15, 20, 25, 50, 100].includes(parsed)) return parsed;
      }
    }
    return 15;
  });

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zs_van_itinerary_page_size', String(size));
    }
  };

  // Selected customer for the unified hub modal
  const [selectedCustomerForHub, setSelectedCustomerForHub] = useState<VanCustomerItineraryItem | null>(null);

  // Route Reordering Mode
  const [isReorderingMode, setIsReorderingMode] = useState(false);

  // Load saved itinerary ordering from localStorage
  const [customDistrictOrder, setCustomDistrictOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('zs_van_district_order');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customCustomerOrder, setCustomCustomerOrder] = useState<Record<string, number[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('zs_van_customer_order');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveDistrictOrder = (newOrder: string[]) => {
    setCustomDistrictOrder(newOrder);
    try {
      localStorage.setItem('zs_van_district_order', JSON.stringify(newOrder));
    } catch {}
  };

  const saveCustomerOrder = (district: string, customerIds: number[]) => {
    const updated = { ...customCustomerOrder, [district]: customerIds };
    setCustomCustomerOrder(updated);
    try {
      localStorage.setItem('zs_van_customer_order', JSON.stringify(updated));
    } catch {}
  };

  const resetOrderToDefault = () => {
    setCustomDistrictOrder([]);
    setCustomCustomerOrder({});
    try {
      localStorage.removeItem('zs_van_district_order');
      localStorage.removeItem('zs_van_customer_order');
    } catch {}
    toast.info('تم استعادة الترتيب التلقائي لخط السير');
  };

  // Add Customer Modal State
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustDistrict, setNewCustDistrict] = useState('');
  const [newCustRoute, setNewCustRoute] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGps, setNewCustGps] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [routeDropdownOpen, setRouteDropdownOpen] = useState(false);
  const [newCustVisitDays, setNewCustVisitDays] = useState<string[]>([]);
  const districtContainerRef = useRef<HTMLDivElement | null>(null);
  const routeContainerRef = useRef<HTMLDivElement | null>(null);

  // Close combobox dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (districtContainerRef.current && !districtContainerRef.current.contains(e.target as Node)) {
        setDistrictDropdownOpen(false);
      }
      if (routeContainerRef.current && !routeContainerRef.current.contains(e.target as Node)) {
        setRouteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Memory list of saved districts
  const savedDistrictsList = useMemo(() => {
    const set = new Set<string>();
    // From itinerary
    itinerary.forEach((it) => {
      if (it.district) set.add(it.district.trim());
      else if (it.route) set.add(it.route.trim());
    });
    // From localStorage
    if (typeof window !== 'undefined') {
      try {
        const localDistricts: string[] = JSON.parse(localStorage.getItem('zs_van_saved_districts') || '[]');
        localDistricts.forEach((d) => set.add(d.trim()));
      } catch {}
    }
    return Array.from(set).filter(Boolean);
  }, [itinerary]);

  const filteredDistricts = useMemo(() => {
    if (!newCustDistrict.trim()) return savedDistrictsList;
    const q = newCustDistrict.trim().toLowerCase();
    return savedDistrictsList.filter((d) => d.toLowerCase().includes(q));
  }, [savedDistrictsList, newCustDistrict]);

  const handleCaptureGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.warning('خدمة تحديد المواقع (GPS) غير مدعومة في جهازك');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        setNewCustGps({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        toast.success('تم التقاط إحداثيات موقع المحل عبر GPS بنجاح');
      },
      () => {
        setIsLocatingGps(false);
        toast.warning('تعذر تحديد الموقع، يرجى تفعيل الـ GPS في الهاتف');
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  };

  // Live timer interval for active visit duration
  const [timerTick, setTimerTick] = useState(Date.now());
  useEffect(() => {
    if (!activeVisit) return;
    const interval = setInterval(() => setTimerTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeVisit]);

  const elapsedVisitSeconds = activeVisit
    ? Math.max(0, Math.floor((timerTick - activeVisit.startedAt) / 1000))
    : 0;

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const arabicDayNames = useMemo(() => ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], []);
  const todayArabicName = useMemo(() => {
    return itinerary[0]?.currentDayName || arabicDayNames[new Date().getDay()];
  }, [itinerary, arabicDayNames]);

  const todayCount = useMemo(() => {
    return itinerary.filter((i) => customerMatchesDay(i, 'today', todayArabicName)).length;
  }, [itinerary, todayArabicName]);

  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const dayDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dayDropdownRef.current && !dayDropdownRef.current.contains(e.target as Node)) {
        setDayDropdownOpen(false);
      }
    };
    if (dayDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dayDropdownOpen]);

  // Reset pagination to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, routeFilter, statusFilter, dayFilter]);

  // Negative visit modal state
  const [negativeModalOpen, setNegativeModalOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<VanCustomerItineraryItem | null>(null);
  const [negativeReason, setNegativeReason] = useState<
    'no_cash' | 'shop_closed' | 'sufficient_stock' | 'item_unavailable' | 'postponed' | 'other'
  >('shop_closed');
  const [postponedDate, setPostponedDate] = useState('');
  const [negativeNotes, setNegativeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract unique routes
  const routes = useMemo(() => {
    return Array.from(new Set(itinerary.map((i) => i.route).filter(Boolean)));
  }, [itinerary]);

  const filteredRoutes = useMemo(() => {
    if (!newCustRoute.trim()) return routes;
    const q = newCustRoute.trim().toLowerCase();
    return routes.filter((r) => r.toLowerCase().includes(q));
  }, [routes, newCustRoute]);

  // Default to today's visit day and current trip route when opening the modal
  useEffect(() => {
    if (addCustomerModalOpen) {
      if (newCustVisitDays.length === 0) {
        setNewCustVisitDays([todayArabicName]);
      }
      if (!newCustRoute.trim() && routes.length > 0) {
        setNewCustRoute(routes[0]);
      }
    }
  }, [addCustomerModalOpen, todayArabicName, newCustVisitDays.length, newCustRoute, routes]);

  const filtered = useMemo(() => {
    const rawSearch = searchTerm.trim().toLowerCase();
    const cleanSearch = rawSearch.replace(/^[c#]-?/, '');
    const isPureNumeric = cleanSearch.length > 0 && /^\d+$/.test(cleanSearch);
    const isExplicitCodeSearch = rawSearch.startsWith('c') || rawSearch.startsWith('#');

    const matched = itinerary.filter((item) => {
      // Day / schedule filter
      if (!customerMatchesDay(item, dayFilter, todayArabicName)) {
        return false;
      }

      if (statusFilter !== 'all' && item.visitStatus !== statusFilter) return false;
      if (routeFilter !== 'all' && item.route !== routeFilter) return false;
      if (!rawSearch) return true;

      const codeDigits = (item.customerCode || '').replace(/\D/g, '');

      // Explicit code prefix search (e.g. "c1", "c-1", "#1", "c-0001")
      if (isExplicitCodeSearch && isPureNumeric) {
        return codeDigits === cleanSearch || Number(codeDigits) === Number(cleanSearch);
      }

      // Normal multi-field search:
      const matchesCode =
        (item.customerCode || '').toLowerCase().includes(rawSearch) ||
        (isPureNumeric && (codeDigits === cleanSearch || Number(codeDigits) === Number(cleanSearch)));

      return (
        matchesCode ||
        item.customerName.toLowerCase().includes(rawSearch) ||
        item.customerPhone.includes(rawSearch) ||
        item.route.toLowerCase().includes(rawSearch) ||
        (item.district && item.district.toLowerCase().includes(rawSearch))
      );
    });

    // If searching by number (e.g. "1"), prioritize exact customer code matches to the very top!
    if (isPureNumeric) {
      return matched.sort((a, b) => {
        const aDigits = (a.customerCode || '').replace(/\D/g, '');
        const bDigits = (b.customerCode || '').replace(/\D/g, '');
        const aExact = aDigits === cleanSearch || Number(aDigits) === Number(cleanSearch);
        const bExact = bDigits === cleanSearch || Number(bDigits) === Number(cleanSearch);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
    }

    return matched;
  }, [itinerary, dayFilter, todayArabicName, statusFilter, routeFilter, searchTerm]);

  // 1. Group ALL filtered items by District to establish canonical itinerary ordering
  const allDistrictGroups = useMemo(() => {
    const groupsMap = new Map<string, VanCustomerItineraryItem[]>();

    for (const item of filtered) {
      const dName = (item.district || item.route || 'حي عام / بدون تحديد').trim();
      if (!groupsMap.has(dName)) {
        groupsMap.set(dName, []);
      }
      groupsMap.get(dName)!.push(item);
    }

    const sortedDistrictNames = Array.from(groupsMap.keys()).sort((a, b) => {
      const idxA = customDistrictOrder.indexOf(a);
      const idxB = customDistrictOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, 'ar');
    });

    return sortedDistrictNames.map((name) => {
      const items = groupsMap.get(name)!;
      const orderList = customCustomerOrder[name] || [];
      const sortedItems = [...items].sort((a, b) => {
        const idxA = orderList.indexOf(a.customerId);
        const idxB = orderList.indexOf(b.customerId);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.customerName.localeCompare(b.customerName, 'ar');
      });

      return {
        name,
        items: sortedItems,
        totalCount: sortedItems.length,
        visitedCount: sortedItems.filter((i) => i.visitStatus !== 'pending').length,
      };
    });
  }, [filtered, customDistrictOrder, customCustomerOrder]);

  // 2. Flatten ordered customers with their permanent global sequence number (1, 2, ... N)
  const allSortedCustomers = useMemo(() => {
    const list: Array<VanCustomerItineraryItem & { globalSeq: number }> = [];
    let seq = 1;
    for (const group of allDistrictGroups) {
      for (const item of group.items) {
        list.push({ ...item, globalSeq: seq++ });
      }
    }
    return list;
  }, [allDistrictGroups]);

  const totalPages = Math.ceil(allSortedCustomers.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedItems = useMemo(() => {
    return allSortedCustomers.slice(startIdx, startIdx + pageSize);
  }, [allSortedCustomers, startIdx, pageSize]);

  // 3. Group ONLY the items of the current page (10 items) by District for lightning-fast mobile rendering
  const districtGroups = useMemo(() => {
    const groupsMap = new Map<string, Array<VanCustomerItineraryItem & { globalSeq: number }>>();

    for (const item of paginatedItems) {
      const dName = (item.district || item.route || 'حي عام / بدون تحديد').trim();
      if (!groupsMap.has(dName)) {
        groupsMap.set(dName, []);
      }
      groupsMap.get(dName)!.push(item);
    }

    const result: Array<{
      name: string;
      items: Array<VanCustomerItineraryItem & { globalSeq: number }>;
      totalCount: number;
      visitedCount: number;
    }> = [];

    for (const group of allDistrictGroups) {
      const pageItems = groupsMap.get(group.name);
      if (pageItems && pageItems.length > 0) {
        result.push({
          name: group.name,
          items: pageItems,
          totalCount: group.totalCount,
          visitedCount: group.visitedCount,
        });
      }
    }

    return result;
  }, [paginatedItems, allDistrictGroups]);

  const moveDistrict = (districtName: string, dir: 'up' | 'down') => {
    const currentOrder = allDistrictGroups.map((g) => g.name);
    const idx = currentOrder.indexOf(districtName);
    if (idx === -1) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;
    const newOrder = [...currentOrder];
    const temp = newOrder[idx];
    newOrder[idx] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    saveDistrictOrder(newOrder);
    toast.success(`تم ${dir === 'up' ? 'تقديم' : 'تأخير'} ${districtName}`);
  };

  const moveCustomer = (districtName: string, customerId: number, dir: 'up' | 'down') => {
    const grp = allDistrictGroups.find((g) => g.name === districtName);
    if (!grp) return;
    const currentIds = grp.items.map((i) => i.customerId);
    const idx = currentIds.indexOf(customerId);
    if (idx === -1) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentIds.length) return;
    const newIds = [...currentIds];
    const temp = newIds[idx];
    newIds[idx] = newIds[targetIdx];
    newIds[targetIdx] = temp;
    saveCustomerOrder(districtName, newIds);
  };

  const handleCreateCustomer = async () => {
    if (!newCustName.trim()) {
      toast.warning('يرجى كتابة اسم المحل / العميل');
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const districtVal = newCustDistrict.trim() || undefined;
      const routeVal = newCustRoute.trim() || undefined;
      const addressVal = newCustAddress.trim() || districtVal;
      const locationUrl = newCustGps
        ? `https://maps.google.com/?q=${newCustGps.lat},${newCustGps.lng}`
        : undefined;

      const visitDaysVal = newCustVisitDays.length > 0 ? newCustVisitDays : [todayArabicName];
      const customerPayload = {
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        district: districtVal,
        route: routeVal,
        address: addressVal,
        visitDays: visitDaysVal,
        metadata: {
          district: districtVal,
          route: routeVal,
          visit_days: visitDaysVal,
          gpsLat: newCustGps?.lat,
          gpsLng: newCustGps?.lng,
          locationUrl,
        },
      };

      let createRes: any = null;
      try {
        createRes = await vanSalesApi.createCustomer(customerPayload);
      } catch (vanErr: any) {
        // Fallback to standard catalog API if in web session
        await catalogApi.createCustomer({
          name: newCustName.trim(),
          phone: newCustPhone.trim() || undefined,
          type: 'cash',
          creditLimit: 0,
          balance: 0,
          address: addressVal,
          metadata: customerPayload.metadata,
        });
      }

      if (districtVal && typeof window !== 'undefined') {
        try {
          const saved: string[] = JSON.parse(localStorage.getItem('zs_van_saved_districts') || '[]');
          if (!saved.includes(districtVal)) {
            localStorage.setItem('zs_van_saved_districts', JSON.stringify([...saved, districtVal].slice(-50)));
          }
        } catch {}
      }

      if (createRes?.alreadyExisted) {
        toast.info(createRes.message || `المحل مسجل مسبقاً وتم ربطه بخط سيرك بنجاح`);
      } else {
        toast.success(`تم إضافة المحل (${newCustName.trim()}) لخط السير بنجاح`);
      }
      setAddCustomerModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustDistrict('');
      setNewCustRoute('');
      setNewCustAddress('');
      setNewCustGps(null);
      setNewCustVisitDays([todayArabicName]);
      setDistrictDropdownOpen(false);
      setRouteDropdownOpen(false);
      onRefreshItinerary();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إضافة العميل');
    } finally {
      setIsCreatingCustomer(false);
    }
  };



  const openNegativeVisitModal = (customer: VanCustomerItineraryItem) => {
    setActiveCustomer(customer);
    setNegativeReason('shop_closed');
    setPostponedDate('');
    setNegativeNotes('');
    setNegativeModalOpen(true);
  };

  const handleSubmitNegativeVisit = async () => {
    if (!activeCustomer) return;
    if (!tripId) {
      toast.warning('يرجى بدء رحلة التوزيع أولاً لتسجيل الزيارات الميدانية');
      return;
    }

    if (negativeReason === 'postponed' && !postponedDate) {
      toast.warning('يرجى تحديد تاريخ تأجيل الزيارة');
      return;
    }

    setIsSubmitting(true);
    let lat: number | undefined;
    let lng: number | undefined;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // GPS optional if timed out or rejected
      }
    }

    try {
      const res = await vanSalesApi.recordFieldVisit({
        tripId,
        customerId: activeCustomer.customerId,
        visitType: 'negative',
        negativeReason,
        postponedToDate: negativeReason === 'postponed' ? postponedDate : undefined,
        gpsLat: lat,
        gpsLng: lng,
        notes: negativeNotes.trim() || undefined,
      });

      if (res.consecutiveNegativeAlert) {
        toast.warning(
          `تنبيه: تكررت الزيارة السلبية للمرة الثالثة على التوالي للمحل (${activeCustomer.customerName}) - تم إشعار الإدارة تلقائياً`,
        );
      } else {
        toast.success(`تم تسجيل الزيارة السلبية للمحل: ${activeCustomer.customerName}`);
      }

      setNegativeModalOpen(false);
      if (activeVisit && activeVisit.customerId === activeCustomer.customerId) {
        onEndVisit?.();
      }
      onRefreshItinerary();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تسجيل الزيارة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case 'no_cash':
        return 'مفيش نقدية / رفض الدفع';
      case 'shop_closed':
        return 'المحل مغلق';
      case 'sufficient_stock':
        return 'لديه بضاعة كافية';
      case 'item_unavailable':
        return 'الصنف المطلوب غير متوفر بالسيارة';
      case 'postponed':
        return 'تأجيل الزيارة';
      default:
        return 'أسباب أخرى';
    }
  };

  // KPIs
  const total = itinerary.length;
  const positiveCount = itinerary.filter((i) => i.visitStatus === 'positive').length;
  const negativeCount = itinerary.filter((i) => i.visitStatus === 'negative').length;
  const pendingCount = total - positiveCount - negativeCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: selectedCustomerForHub ? '6px' : '10px', paddingBottom: selectedCustomerForHub ? '4px' : '24px' }}>
      {selectedCustomerForHub ? (
        /* Z-SYSTEMS OFFICIAL MOBILE VISUAL IDENTITY: ZERO-SCROLL CUSTOMER VISIT HUB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* 1. STORE PROFILE HEADER CARD (Top Bar + Store Info + Quick Actions) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '8px 12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {/* Row 1: Back Button + Customer Name + Phone / GPS Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForHub(null)}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#170e5e',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <ArrowRightIcon size={13} color="#170e5e" />
                  <span>خط السير</span>
                </button>

                <h2
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 900,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={selectedCustomerForHub.customerName}
                >
                  {selectedCustomerForHub.customerName}
                </h2>
              </div>

              {/* Call & GPS Action Buttons with soft squircle styling */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {selectedCustomerForHub.customerPhone ? (
                  <a
                    href={`tel:${selectedCustomerForHub.customerPhone}`}
                    style={{
                      backgroundColor: '#dcfce7',
                      border: '1px solid #bbf7d0',
                      color: '#15803d',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      textDecoration: 'none',
                    }}
                    title={selectedCustomerForHub.customerPhone}
                  >
                    <PhoneIcon size={12} color="#15803d" />
                    <span>اتصال</span>
                  </a>
                ) : null}

                {selectedCustomerForHub.locationUrl ? (
                  <a
                    href={selectedCustomerForHub.locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      backgroundColor: '#e0f2fe',
                      border: '1px solid #bae6fd',
                      color: '#0284c7',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      textDecoration: 'none',
                    }}
                  >
                    <MapPinIcon size={12} color="#0284c7" />
                    <span>GPS</span>
                  </a>
                ) : null}
              </div>
            </div>

            {/* Row 2: Code, District/Route, Address & Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '10.5px', color: '#64748b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#170e5e',
                    backgroundColor: '#eef2ff',
                    border: '1px solid #c7d2fe',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                >
                  [{selectedCustomerForHub.customerCode.replace(/^#/, '')}]
                </span>

                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedCustomerForHub.district ? `حي: ${selectedCustomerForHub.district}` : (selectedCustomerForHub.route ? `خط: ${selectedCustomerForHub.route}` : '')}
                  {selectedCustomerForHub.customerAddress ? ` • ${selectedCustomerForHub.customerAddress}` : ''}
                </span>
              </div>

              {/* Status Badge */}
              <div style={{ flexShrink: 0 }}>
                {selectedCustomerForHub.visitStatus === 'positive' && (
                  <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', border: '1px solid #86efac' }}>
                    تم البيع
                  </span>
                )}
                {selectedCustomerForHub.visitStatus === 'negative' && (
                  <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                    زيارة سلبية
                  </span>
                )}
                {selectedCustomerForHub.visitStatus === 'pending' && (
                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    بانتظار الزيارة
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. TWO FINANCIAL METRIC CAPSULES (Debt + Credit Limit) - BALANCED 50% ROW */}
          <div
            className="keep-grid-row"
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '8px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* Capsule 1: Debt */}
            <div
              style={{
                flex: '1 1 0',
                minWidth: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '8px 10px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                المديونية المستحقة
              </span>
              <strong style={{ fontSize: '14px', fontWeight: 900, color: selectedCustomerForHub.balance > 0 ? '#dc2626' : '#15803d', display: 'block', lineHeight: 1.15 }}>
                {selectedCustomerForHub.balance.toFixed(0)} <CurrencySymbol />
              </strong>
            </div>

            {/* Capsule 2: Credit Limit */}
            <div
              style={{
                flex: '1 1 0',
                minWidth: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '8px 10px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                سقف الائتمان
              </span>
              <strong style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', display: 'block', lineHeight: 1.15 }}>
                {selectedCustomerForHub.creditLimit.toFixed(0)} <CurrencySymbol />
              </strong>
            </div>
          </div>

          {/* 3. PRIMARY FULL-WIDTH VISIT TIMER BUTTON / COCKPIT BAR */}
          {activeVisit?.customerId === selectedCustomerForHub.customerId ? (
            /* Active Visit Bar */
            <div
              style={{
                width: '100%',
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ClockIcon size={16} color="#15803d" />
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 700, display: 'block' }}>
                    الزيارة الميدانية جارية الآن
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '15px',
                      fontWeight: 900,
                      color: '#166534',
                      letterSpacing: '0.5px',
                      lineHeight: 1.1,
                    }}
                  >
                    {formatElapsed(elapsedVisitSeconds)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEndVisit?.()}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>إنهاء الزيارة</span>
              </button>
            </div>
          ) : (
            /* Standalone Primary Full-Width CTA to Start Visit */
            <button
              type="button"
              onClick={() => onStartVisit?.(selectedCustomerForHub.customerId, selectedCustomerForHub.customerName)}
              style={{
                width: '100%',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '9px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(23, 14, 94, 0.18)',
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PlayIcon size={12} color="#ffffff" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>بدء الزيارة الميدانية وتفعيل المؤقت</span>
            </button>
          )}

          {/* 3. SECTION HEADER (Classic Z-Systems Royal Navy Vertical Accent Bar) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 0' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              <span style={{ width: '3.5px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <span>إجراءات الزيارة الميدانية</span>
            </h3>
            <span style={{ fontSize: '10.5px', color: '#64748b' }}>اختر الإجراء المطلوب</span>
          </div>

          {/* 4. FOUR OPERATIONAL ACTION TILES (Z-Systems Squircle 2x2 Grid - TWO EXPLICIT HORIZONTAL FLEX ROWS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
            {/* ROW 1: Sale Invoice & Customer Return */}
            <div className="keep-grid-row" style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
              {/* Tile 1: New Sale Invoice */}
              <div
                onClick={() => {
                  if (!activeVisit || activeVisit.customerId !== selectedCustomerForHub.customerId) {
                    onStartVisit?.(selectedCustomerForHub.customerId, selectedCustomerForHub.customerName);
                  }
                  const cId = selectedCustomerForHub.customerId;
                  setSelectedCustomerForHub(null);
                  onSelectCustomerForSale(cId);
                }}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: '#f3e8ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6px',
                  }}
                >
                  <ReceiptIcon size={18} color="#7c3aed" strokeWidth={2} />
                </div>
                <h4 style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  فاتورة بيع جديدة
                </h4>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                  بيع وصرف بضاعة
                </p>
              </div>

              {/* Tile 2: Customer Return */}
              <div
                onClick={() => {
                  if (!activeVisit || activeVisit.customerId !== selectedCustomerForHub.customerId) {
                    onStartVisit?.(selectedCustomerForHub.customerId, selectedCustomerForHub.customerName);
                  }
                  const cId = selectedCustomerForHub.customerId;
                  setSelectedCustomerForHub(null);
                  if (onSelectCustomerForReturn) {
                    onSelectCustomerForReturn(cId);
                  } else {
                    onSelectCustomerForSale(cId);
                  }
                }}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: '#ffedd5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6px',
                  }}
                >
                  <RotateCcwIcon size={18} color="#ea580c" strokeWidth={2} />
                </div>
                <h4 style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  مرتجع بضاعة
                </h4>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                  من فواتير العميل
                </p>
              </div>
            </div>

            {/* ROW 2: Debt Collection & Negative Visit */}
            <div className="keep-grid-row" style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
              {/* Tile 3: Debt Collection */}
              <div
                onClick={() => {
                  if (!activeVisit || activeVisit.customerId !== selectedCustomerForHub.customerId) {
                    onStartVisit?.(selectedCustomerForHub.customerId, selectedCustomerForHub.customerName);
                  }
                  const cId = selectedCustomerForHub.customerId;
                  setSelectedCustomerForHub(null);
                  if (onSelectCustomerForCollection) {
                    onSelectCustomerForCollection(cId);
                  }
                }}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6px',
                  }}
                >
                  <CreditCardIcon size={18} color="#16a34a" strokeWidth={2} />
                </div>
                <h4 style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  سند تحصيل نقدية
                </h4>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                  سداد وتخفيض مديونية
                </p>
              </div>

              {/* Tile 4: Negative Visit */}
              <div
                onClick={() => {
                  const cust = selectedCustomerForHub;
                  openNegativeVisitModal(cust);
                }}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6px',
                  }}
                >
                  <XCircleIcon size={18} color="#dc2626" strokeWidth={2} />
                </div>
                <h4 style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  تسجيل زيارة سلبية
                </h4>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                  محل مغلق / لم يشترِ
                </p>
              </div>
            </div>
          </div>

          {/* 5. Today's Visit Summary if already visited today (Z-Systems Crisp White Card) */}
          {selectedCustomerForHub.todayVisit && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '8px 12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClockIcon size={13} color="#64748b" />
                <span style={{ fontWeight: 700, color: '#475569', flexShrink: 0 }}>زيارة سابقة اليوم:</span>
              </div>
              {selectedCustomerForHub.todayVisit.visitType === 'positive' ? (
                <span style={{ color: '#15803d', fontWeight: 800 }}>
                  فاتورة #{selectedCustomerForHub.todayVisit.saleDocNo} ({selectedCustomerForHub.todayVisit.saleTotal} <CurrencySymbol />)
                </span>
              ) : (
                <span style={{ color: '#b91c1c', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getReasonLabel(selectedCustomerForHub.todayVisit.negativeReason)}
                  {selectedCustomerForHub.todayVisit.notes && ` — "${selectedCustomerForHub.todayVisit.notes}"`}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Unified High-Density Itinerary Toolbar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '8px 10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {/* Row 1: Visit Status Quick Filters (Height 28px) */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', textAlign: 'center', width: '100%' }}>
          <div
            onClick={() => setStatusFilter((prev) => (prev === 'positive' ? 'all' : 'positive'))}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              backgroundColor: statusFilter === 'positive' ? '#d1fae5' : '#f0fdf4',
              borderRadius: '6px',
              padding: '2px 4px',
              border: statusFilter === 'positive' ? '1.5px solid #059669' : '1px solid #bbf7d0',
              cursor: 'pointer',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '28px',
            }}
            title="المحلات التي تم البيع لها"
          >
            <span style={{ fontSize: '10px', color: '#166534', fontWeight: 700, whiteSpace: 'nowrap' }}>تم البيع:</span>
            <strong style={{ fontSize: '12px', fontWeight: 900, color: '#15803d' }}>{positiveCount}</strong>
          </div>

          <div
            onClick={() => setStatusFilter((prev) => (prev === 'negative' ? 'all' : 'negative'))}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              backgroundColor: statusFilter === 'negative' ? '#fee2e2' : '#fef2f2',
              borderRadius: '6px',
              padding: '2px 4px',
              border: statusFilter === 'negative' ? '1.5px solid #dc2626' : '1px solid #fecaca',
              cursor: 'pointer',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '28px',
            }}
            title="الزيارات السلبية"
          >
            <span style={{ fontSize: '10px', color: '#991b1b', fontWeight: 700, whiteSpace: 'nowrap' }}>سلبية:</span>
            <strong style={{ fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>{negativeCount}</strong>
          </div>

          <div
            onClick={() => setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              backgroundColor: statusFilter === 'pending' ? '#e2e8f0' : '#f8fafc',
              borderRadius: '6px',
              padding: '2px 4px',
              border: statusFilter === 'pending' ? '1.5px solid #334155' : '1px solid #e2e8f0',
              cursor: 'pointer',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '28px',
            }}
            title="المحلات المتبقية للزيارة"
          >
            <span style={{ fontSize: '10px', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>متبقي:</span>
            <strong style={{ fontSize: '12px', fontWeight: 900, color: '#1e293b' }}>{pendingCount}</strong>
          </div>
        </div>

        {/* Row 2: Day Filter Segment Switcher (اليوم vs الكل vs يوم آخر) */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', width: '100%', alignItems: 'stretch' }}>
          <button
            type="button"
            onClick={() => setDayFilter('today')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '0 6px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              boxSizing: 'border-box',
              border:
                dayFilter === 'today' || normalizeDayKey(dayFilter) === normalizeDayKey(todayArabicName)
                  ? '1.5px solid #170e5e'
                  : '1px solid #e2e8f0',
              backgroundColor:
                dayFilter === 'today' || normalizeDayKey(dayFilter) === normalizeDayKey(todayArabicName)
                  ? '#170e5e'
                  : '#f8fafc',
              color:
                dayFilter === 'today' || normalizeDayKey(dayFilter) === normalizeDayKey(todayArabicName)
                  ? '#ffffff'
                  : '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '30px',
            }}
          >
            <CalendarIcon size={12} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>{todayArabicName}</span>
            <span
              style={{
                backgroundColor:
                  dayFilter === 'today' || normalizeDayKey(dayFilter) === normalizeDayKey(todayArabicName)
                    ? 'rgba(255,255,255,0.25)'
                    : '#e2e8f0',
                color:
                  dayFilter === 'today' || normalizeDayKey(dayFilter) === normalizeDayKey(todayArabicName)
                    ? '#ffffff'
                    : '#475569',
                padding: '0 4px',
                borderRadius: '6px',
                fontSize: '9.5px',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {todayCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDayFilter('all')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '0 6px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              boxSizing: 'border-box',
              border: dayFilter === 'all' ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
              backgroundColor: dayFilter === 'all' ? '#170e5e' : '#f8fafc',
              color: dayFilter === 'all' ? '#ffffff' : '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '30px',
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>كافة المحلات</span>
            <span
              style={{
                backgroundColor: dayFilter === 'all' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: dayFilter === 'all' ? '#ffffff' : '#475569',
                padding: '0 4px',
                borderRadius: '6px',
                fontSize: '9.5px',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {total}
            </span>
          </button>

          {/* Day Picker Button & Dropdown */}
          <div ref={dayDropdownRef} style={{ position: 'relative', width: '85px', flexShrink: 0, height: '30px' }}>
            <button
              type="button"
              onClick={() => setDayDropdownOpen((prev) => !prev)}
              style={{
                width: '100%',
                padding: '0 6px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                boxSizing: 'border-box',
                border:
                  dayFilter !== 'today' && dayFilter !== 'all' && normalizeDayKey(dayFilter) !== normalizeDayKey(todayArabicName)
                    ? '1.5px solid #170e5e'
                    : '1px solid #e2e8f0',
                backgroundColor:
                  dayFilter !== 'today' && dayFilter !== 'all' && normalizeDayKey(dayFilter) !== normalizeDayKey(todayArabicName)
                    ? '#170e5e'
                    : '#f8fafc',
                color:
                  dayFilter !== 'today' && dayFilter !== 'all' && normalizeDayKey(dayFilter) !== normalizeDayKey(todayArabicName)
                    ? '#ffffff'
                    : '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                height: '30px',
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {dayFilter !== 'today' && dayFilter !== 'all' && normalizeDayKey(dayFilter) !== normalizeDayKey(todayArabicName)
                  ? dayFilter
                  : 'يوم...'}
              </span>
              <ChevronDownIcon size={11} style={{ flexShrink: 0 }} />
            </button>

            {dayDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  width: '125px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  zIndex: 100,
                  overflow: 'hidden',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div
                  onClick={() => {
                    setDayFilter('all');
                    setDayDropdownOpen(false);
                  }}
                  style={{
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: dayFilter === 'all' ? 800 : 600,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: dayFilter === 'all' ? '#170e5e' : '#334155',
                    backgroundColor: dayFilter === 'all' ? '#eef2ff' : 'transparent',
                  }}
                >
                  كافة الأيام
                </div>
                {arabicDayNames.map((d) => {
                  const isCurrent = d === todayArabicName;
                  const isSelected = dayFilter === d || (isCurrent && dayFilter === 'today');
                  return (
                    <div
                      key={d}
                      onClick={() => {
                        if (isCurrent) {
                          setDayFilter('today');
                        } else {
                          setDayFilter(d);
                        }
                        setDayDropdownOpen(false);
                      }}
                      style={{
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: isSelected ? 800 : 600,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: isSelected ? '#170e5e' : '#334155',
                        backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>يوم {d}</span>
                      {isCurrent && (
                        <span style={{ fontSize: '9px', color: '#16a34a', fontWeight: 800 }}>اليوم</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Full-width Clean Search Bar */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم المحل، الكود، الحي، أو الهاتف..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '6px 12px 6px 32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              height: '35px',
              backgroundColor: '#f8fafc',
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }}>
            <SearchIcon size={14} />
          </span>
        </div>

        {/* Row 4: Route Actions & Route Filter */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* Add Store Button */}
          <button
            type="button"
            onClick={() => setAddCustomerModalOpen(true)}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '7px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
            title="إضافة محل جديد لخط السير"
          >
            <PlusIcon size={12} color="#ffffff" />
            <span>+ إضافة محل</span>
          </button>

          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            {routes.length > 1 && (
              <div style={{ minWidth: '85px', maxWidth: '110px' }}>
                <CustomSelect
                  value={routeFilter}
                  onChange={(val) => setRouteFilter(val || 'all')}
                  dropdownAlign="left"
                  options={[
                    { value: 'all', label: 'كافة الخطوط' },
                    ...routes.map((r) => ({ value: r, label: r })),
                  ]}
                  placeholder="الخط"
                  style={{ height: '32px', fontSize: '11.5px' }}
                />
              </div>
            )}

            {/* Toggle Reordering Mode Button */}
            <button
              type="button"
              onClick={() => setIsReorderingMode((prev) => !prev)}
              style={{
                height: '32px',
                padding: '0 10px',
                borderRadius: '7px',
                backgroundColor: isReorderingMode ? '#1e293b' : '#ffffff',
                color: isReorderingMode ? '#ffffff' : '#334155',
                border: isReorderingMode ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
              }}
              title="إعادة ترتيب خط السير"
            >
              <SlidersIcon size={13} color={isReorderingMode ? '#ffffff' : '#334155'} />
              <span>{isReorderingMode ? 'إنهاء الترتيب' : 'ترتيب السير'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Reordering Mode Banner */}
      {isReorderingMode && (
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1.5px dashed #3b82f6',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '11px',
            color: '#1e40af',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <span>
            وضع إعادة ترتيب خط السير نشط: استخدم الأسهم (▲/▼) لتقديم أو تأخير الأحياء والمحلات.
          </span>
          <button
            type="button"
            onClick={resetOrderToDefault}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            استعادة الترتيب التلقائي
          </button>
        </div>
      )}

      {/* Active filter badge / reset */}
      {(statusFilter !== 'all' || (dayFilter !== 'today' && dayFilter !== 'all')) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f1f5f9',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#334155',
            border: '1px solid #e2e8f0',
          }}
        >
          <span>
            تصفية نشطة:{' '}
            {dayFilter !== 'today' && dayFilter !== 'all' && (
              <strong style={{ color: '#170e5e', marginInlineEnd: '4px' }}>يوم {dayFilter}</strong>
            )}
            {statusFilter !== 'all' && (
              <strong>
                {statusFilter === 'pending'
                  ? 'المحلات المتبقية فقط'
                  : statusFilter === 'positive'
                  ? 'المحلات التي تم البيع لها'
                  : 'الزيارات السلبية'}
              </strong>
            )}{' '}
            ({filtered.length} محل)
          </span>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setDayFilter('today');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '11px',
              padding: 0,
            }}
          >
            إلغاء التصفية
          </button>
        </div>
      )}

      {/* Customers List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
          جاري تحميل خط السير...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '30px 16px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
          }}
        >
          لا توجد محلات مسجلة تطابق معايير البحث
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Top Compact Pagination Bar - only shown if more than 1 page */}
          {totalPages > 1 && (
            <VanItineraryPagination
              startIdx={startIdx}
              pageSize={pageSize}
              totalCount={allSortedCustomers.length}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}

          {districtGroups.map((group, groupIdx) => {
            return (
              <div
                key={group.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '10px 12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* District Group Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '8px',
                    marginBottom: '4px',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPinIcon size={14} color="#170e5e" />
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {group.name}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: group.visitedCount === group.totalCount && group.totalCount > 0 ? '#dcfce7' : '#e0f2fe',
                          color: group.visitedCount === group.totalCount && group.totalCount > 0 ? '#15803d' : '#0369a1',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          marginInlineStart: '6px',
                        }}
                      >
                        {group.visitedCount} / {group.totalCount} تمت زيارتهم
                      </span>
                    </div>
                  </div>

                  {/* Reordering controls for District */}
                  {isReorderingMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>ترتيب الحي:</span>
                      <button
                        type="button"
                        onClick={() => moveDistrict(group.name, 'up')}
                        disabled={groupIdx === 0}
                        style={{
                          padding: '3px 7px',
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          cursor: groupIdx === 0 ? 'not-allowed' : 'pointer',
                          opacity: groupIdx === 0 ? 0.4 : 1,
                        }}
                        title="تقديم الحي في خط السير"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDistrict(group.name, 'down')}
                        disabled={groupIdx === districtGroups.length - 1}
                        style={{
                          padding: '3px 7px',
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          cursor: groupIdx === districtGroups.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: groupIdx === districtGroups.length - 1 ? 0.4 : 1,
                        }}
                        title="تأخير الحي في خط السير"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>

                {/* Stores Cards inside this District */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.items.map((item, itemIdx) => {
                    const isPositive = item.visitStatus === 'positive';
                    const isNegative = item.visitStatus === 'negative';
                    const isPending = item.visitStatus === 'pending';
                    const isActiveVisiting = activeVisit?.customerId === item.customerId;

                    return (
                      <div
                        key={item.customerId}
                        onClick={() => setSelectedCustomerForHub(item)}
                        style={{
                          backgroundColor: isActiveVisiting ? '#eff6ff' : '#ffffff',
                          borderRadius: '8px',
                          border: isActiveVisiting
                            ? '2px solid #2563eb'
                            : isPositive
                            ? '1.5px solid #10b981'
                            : isNegative
                            ? '1.5px solid #f87171'
                            : '1px solid #e2e8f0',
                          padding: '8px 10px',
                          boxShadow: isActiveVisiting ? '0 0 0 3px rgba(37,99,235,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease',
                        }}
                      >
                        {/* Header: Sequence, Code, Name, Status Badge & Reorder Arrows */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                backgroundColor: isActiveVisiting ? '#2563eb' : '#170e5e',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 800,
                                width: '20px',
                                height: '20px',
                                borderRadius: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {item.globalSeq}
                            </span>
                            <span style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 800, color: '#0369a1', flexShrink: 0 }}>
                              [{item.customerCode.replace(/^#/, '')}]
                            </span>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.4,
                              }}
                              title={item.customerName}
                            >
                              {item.customerName}
                            </h4>
                          </div>

                          {/* Status Badge & Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                            {isActiveVisiting && (
                              <span
                                style={{
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #bfdbfe',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb', animation: 'pulse 1.5s infinite' }} />
                                <span>الزيارة جارية ({formatElapsed(elapsedVisitSeconds)})</span>
                              </span>
                            )}
                            {isPositive && (
                              <span
                                style={{
                                  backgroundColor: '#ecfdf5',
                                  color: '#047857',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #a7f3d0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <CheckCircleIcon size={11} color="#047857" />
                                <span>تم البيع</span>
                              </span>
                            )}
                            {isNegative && (
                              <span
                                style={{
                                  backgroundColor: '#fef2f2',
                                  color: '#b91c1c',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #fecaca',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <XCircleIcon size={11} color="#b91c1c" />
                                <span>سلبية</span>
                              </span>
                            )}
                            {isPending && !isActiveVisiting && (
                              <span
                                style={{
                                  backgroundColor: '#f8fafc',
                                  color: '#64748b',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #e2e8f0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <ClockIcon size={11} color="#64748b" />
                                <span>بالانتظار</span>
                              </span>
                            )}

                            {/* Up/Down buttons if in reorder mode */}
                            {isReorderingMode && (
                              <div style={{ display: 'flex', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => moveCustomer(group.name, item.customerId, 'up')}
                                  disabled={itemIdx === 0}
                                  style={{
                                    padding: '2px 5px',
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                    cursor: itemIdx === 0 ? 'not-allowed' : 'pointer',
                                    opacity: itemIdx === 0 ? 0.3 : 1,
                                  }}
                                  title="تقديم المحل"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveCustomer(group.name, item.customerId, 'down')}
                                  disabled={itemIdx === group.items.length - 1}
                                  style={{
                                    padding: '2px 5px',
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                    cursor: itemIdx === group.items.length - 1 ? 'not-allowed' : 'pointer',
                                    opacity: itemIdx === group.items.length - 1 ? 0.3 : 1,
                                  }}
                                  title="تأخير المحل"
                                >
                                  ▼
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Repeated Negative Alert Badge */}
                        {item.hasRepeatedNegativeAlert && (
                          <div
                            style={{
                              backgroundColor: '#fffbeb',
                              border: '1px solid #fde68a',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#b45309',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <AlertTriangleIcon size={12} color="#b45309" />
                            <span>تنبيه: {item.repeatedNegativesCount} زيارات سابقة بدون بيع</span>
                          </div>
                        )}

                        {/* Sub-info: Phone, Route, Debt */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {item.customerPhone && (
                              <span style={{ fontSize: '10.5px', color: '#170e5e', fontWeight: 700 }} dir="ltr">
                                {item.customerPhone}
                              </span>
                            )}
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>{item.route}</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', fontSize: '10.5px' }}>المديونية: </span>
                            <strong style={{ color: item.balance > 0 ? '#b91c1c' : '#047857', fontSize: '11.5px' }}>
                              {item.balance.toFixed(0)} <CurrencySymbol />
                            </strong>
                          </div>
                        </div>

                        {/* If already visited: show visit outcome details */}
                        {item.todayVisit && (
                          <div style={{ backgroundColor: '#f8fafc', padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', color: '#475569', border: '1px solid #e2e8f0' }}>
                            {item.todayVisit.visitType === 'positive' ? (
                              <span>
                                فاتورة #{item.todayVisit.saleDocNo} بمبلغ <strong>{item.todayVisit.saleTotal} <CurrencySymbol /></strong>
                              </span>
                            ) : (
                              <span>
                                السبب: <strong>{getReasonLabel(item.todayVisit.negativeReason)}</strong>
                                {item.todayVisit.postponedToDate && ` (تم التأجيل إلى: ${item.todayVisit.postponedToDate})`}
                                {item.todayVisit.notes && ` — "${item.todayVisit.notes}"`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Customer / Store to Route Modal */}
      {addCustomerModalOpen && (
        <StandardDialog
          open={addCustomerModalOpen}
          onClose={() => setAddCustomerModalOpen(false)}
          title="إضافة محل جديد لخط السير"
          subtitle="تسجيل بيانات المحل وإدراجه بخط سير اليوم"
          minHeight="490px"
          footerActions={
            <StandardDialogFooter
              onClose={() => setAddCustomerModalOpen(false)}
              cancelText="إلغاء"
              extraActions={
                <Button
                  variant="primary"
                  onClick={handleCreateCustomer}
                  disabled={isCreatingCustomer || !newCustName.trim()}
                  style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 800 }}
                >
                  {isCreatingCustomer ? 'جاري الحفظ...' : 'حفظ وإدراج في خط السير'}
                </Button>
              }
            />
          }
        >
          <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 1. Store Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>
                اسم المحل / العميل *
              </label>
              <input
                type="text"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="مثال: سوبرماركت البركة"
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            {/* 2. Phone + District (2 Columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>
                  رقم الهاتف / الموبايل
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box', textAlign: 'right' }}
                />
              </div>

              {/* District Custom Combobox */}
              <div ref={districtContainerRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>
                  الحي / المربع السكني
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={newCustDistrict}
                    onChange={(e) => {
                      setNewCustDistrict(e.target.value);
                      if (!districtDropdownOpen) setDistrictDropdownOpen(true);
                    }}
                    onFocus={() => setDistrictDropdownOpen(true)}
                    placeholder="اختر أو اكتب الحي..."
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 26px 0 10px',
                      borderRadius: '6px',
                      border: districtDropdownOpen ? '1px solid #170e5e' : '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                    }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setDistrictDropdownOpen((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ChevronDownIcon
                      size={14}
                      style={{
                        transition: 'transform 0.15s ease',
                        transform: districtDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                </div>

                {/* Dropdown Card */}
                {districtDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      left: 0,
                      maxHeight: '190px',
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ padding: '6px 10px', fontSize: '10.5px', fontWeight: 700, color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      الأحياء المحفوظة ({savedDistrictsList.length}):
                    </div>
                    {filteredDistricts.length === 0 && !newCustDistrict.trim() && (
                      <div style={{ padding: '10px 12px', fontSize: '11.5px', color: '#94a3b8', textAlign: 'center' }}>
                        لا توجد أحياء مسجلة سابقاً
                      </div>
                    )}
                    {filteredDistricts.map((d) => (
                      <div
                        key={d}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setNewCustDistrict(d);
                          setDistrictDropdownOpen(false);
                        }}
                        style={{
                          padding: '7px 10px',
                          fontSize: '12px',
                          fontWeight: newCustDistrict.trim() === d ? 700 : 500,
                          color: newCustDistrict.trim() === d ? '#170e5e' : '#0f172a',
                          backgroundColor: newCustDistrict.trim() === d ? '#eef2ff' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #f8fafc',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPinIcon size={13} color={newCustDistrict.trim() === d ? '#170e5e' : '#94a3b8'} />
                          <span>{d}</span>
                        </div>
                        {newCustDistrict.trim() === d && <CheckCircleIcon size={13} color="#170e5e" />}
                      </div>
                    ))}
                    {newCustDistrict.trim() && !savedDistrictsList.some((d) => d.toLowerCase() === newCustDistrict.trim().toLowerCase()) && (
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setDistrictDropdownOpen(false);
                        }}
                        style={{
                          padding: '7px 10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#2563eb',
                          backgroundColor: '#eff6ff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <PlusIcon size={12} color="#2563eb" />
                        <span>إضافة حي جديد: &quot;{newCustDistrict.trim()}&quot;</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Detailed Address / Landmark with GPS button */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                  العنوان التفصيلي / علامة مميزة
                </label>
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  disabled={isLocatingGps}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    border: newCustGps ? '1px solid #86efac' : '1px solid #cbd5e1',
                    backgroundColor: newCustGps ? '#f0fdf4' : '#f8fafc',
                    color: newCustGps ? '#15803d' : '#475569',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <MapPinIcon size={12} color={newCustGps ? '#15803d' : '#64748b'} />
                  <span>
                    {isLocatingGps
                      ? 'جاري التحديد...'
                      : newCustGps
                        ? 'تم تثبيت GPS'
                        : 'التقاط موقع المحل (GPS)'}
                  </span>
                </button>
              </div>
              <input
                type="text"
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                placeholder="مثال: شارع الجمهورية - بجوار مسجد النور"
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            {/* 4. Scheduled Visit Days */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                  أيام الزيارة الأسبوعية المجدولة
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setNewCustVisitDays([...ALL_WEEK_DAYS])}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '11px',
                      fontWeight: 700,
                      color: newCustVisitDays.length === 7 ? '#170e5e' : '#2563eb',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    كل الأيام
                  </button>
                  <span style={{ fontSize: '10px', color: '#cbd5e1' }}>•</span>
                  <button
                    type="button"
                    onClick={() => setNewCustVisitDays([todayArabicName])}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    اليوم فقط
                  </button>
                </div>
              </div>

              {/* 7 Day Touch Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {ALL_WEEK_DAYS.map((day) => {
                  const isSelected = newCustVisitDays.some(
                    (d) => normalizeDayKey(d) === normalizeDayKey(day)
                  );
                  const isToday = normalizeDayKey(day) === normalizeDayKey(todayArabicName);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (newCustVisitDays.length > 1) {
                            setNewCustVisitDays((prev) =>
                              prev.filter((d) => normalizeDayKey(d) !== normalizeDayKey(day))
                            );
                          } else {
                            toast.warning('يجب تحديد يوم واحد على الأقل لزيارة العميل');
                          }
                        } else {
                          setNewCustVisitDays((prev) => [...prev, day]);
                        }
                      }}
                      style={{
                        flex: '1 0 calc(25% - 5px)',
                        minWidth: '46px',
                        height: '28px',
                        padding: '0 4px',
                        borderRadius: '6px',
                        border: isSelected ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#170e5e' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#475569',
                        fontSize: '11px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'none',
                      }}
                    >
                      {isToday && (
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: isSelected ? '#38bdf8' : '#170e5e',
                            display: 'inline-block',
                          }}
                        />
                      )}
                      <span>{day}</span>
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                يظهر المحل في خط سير المندوب تلقائياً في الأيام المختارة فقط.
              </span>
            </div>

            {/* 5. Main Route Combobox */}
            <div ref={routeContainerRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                  خط السير الرئيسي (Route)
                </label>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  مسار الرحلة الجغرافي
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={newCustRoute}
                  onChange={(e) => {
                    setNewCustRoute(e.target.value);
                    if (!routeDropdownOpen) setRouteDropdownOpen(true);
                  }}
                  onFocus={() => setRouteDropdownOpen(true)}
                  placeholder={routes[0] || 'مثال: خط فيصل الرئيسي'}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 26px 0 10px',
                    borderRadius: '6px',
                    border: routeDropdownOpen ? '1px solid #170e5e' : '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                  }}
                />
                {routes.length > 0 && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setRouteDropdownOpen((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ChevronDownIcon
                      size={14}
                      style={{
                        transition: 'transform 0.15s ease',
                        transform: routeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                )}
              </div>

              {/* Route Dropdown Card */}
              {routeDropdownOpen && routes.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    left: 0,
                    maxHeight: '160px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '6px 10px', fontSize: '10.5px', fontWeight: 700, color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    خطوط سير الرحلة الحالية:
                  </div>
                  {filteredRoutes.map((r) => (
                    <div
                      key={r}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNewCustRoute(r);
                        setRouteDropdownOpen(false);
                      }}
                      style={{
                        padding: '7px 10px',
                        fontSize: '12px',
                        fontWeight: newCustRoute.trim() === r ? 700 : 500,
                        color: newCustRoute.trim() === r ? '#170e5e' : '#0f172a',
                        backgroundColor: newCustRoute.trim() === r ? '#eef2ff' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f8fafc',
                      }}
                    >
                      <span>{r}</span>
                      {newCustRoute.trim() === r && <CheckCircleIcon size={13} color="#170e5e" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hint Notice */}
            <div style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircleIcon size={13} color="#15803d" />
              <span>المحل يُسجل بنظام (سداد نقدي) ويُدرج في خط سير اليوم لتبدأ زيارته فوراً، ويتكرر أسبوعياً في الأيام المحددة.</span>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Bottom Pagination Bar */}
      <VanItineraryPagination
        startIdx={startIdx}
        pageSize={pageSize}
        totalCount={allSortedCustomers.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />
      </>
      )}

      {/* Negative Visit Dialog */}
      {negativeModalOpen && activeCustomer && (
        <StandardDialog
          open={true}
          onClose={() => setNegativeModalOpen(false)}
          title="تسجيل زيارة غير موفقة"
          subtitle={`${activeCustomer.customerName} [${activeCustomer.customerCode.replace(/^#/, '')}]`}
          badge="خط السير الميداني"
          width="min(460px, 95vw)"
          compact={true}
          footerActions={
            <StandardDialogFooter
              onClose={() => setNegativeModalOpen(false)}
              cancelText="إلغاء"
              extraActions={
                <Button
                  variant="primary"
                  onClick={handleSubmitNegativeVisit}
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '12px', fontWeight: 800, padding: '6px 14px' }}
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'تأكيد وحفظ الزيارة السلبية'}
                </Button>
              }
            />
          }
        >
          <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                حدد سبب عدم إتمام البيع (لمسة واحدة):
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                }}
              >
                {[
                  { value: 'shop_closed', label: 'المحل مغلق' },
                  { value: 'no_cash', label: 'مفيش نقدية / رفض الدفع' },
                  { value: 'sufficient_stock', label: 'لديه بضاعة كافية' },
                  { value: 'item_unavailable', label: 'الصنف غير متوفر بالسيارة' },
                  { value: 'postponed', label: 'تأجيل الزيارة لموعد لاحق' },
                  { value: 'other', label: 'أسباب أخرى' },
                ].map((item) => {
                  const isSelected = negativeReason === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setNegativeReason(item.value as any)}
                      style={{
                        padding: '7px 8px',
                        borderRadius: '7px',
                        border: isSelected ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#fef2f2' : '#ffffff',
                        color: isSelected ? '#991b1b' : '#334155',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        textAlign: 'center',
                        lineHeight: 1.3,
                        minHeight: '36px',
                      }}
                    >
                      {isSelected && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }} />
                      )}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {negativeReason === 'postponed' && (
              <div style={{ backgroundColor: '#eff6ff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#1e40af', marginBottom: '4px' }}>
                  تاريخ التأجيل المقترح:
                </label>
                <input
                  type="date"
                  value={postponedDate}
                  onChange={(e) => setPostponedDate(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1.5px solid #93c5fd',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                ملاحظات المندوب الميدانية (اختياري):
              </label>
              <textarea
                value={negativeNotes}
                onChange={(e) => setNegativeNotes(e.target.value)}
                placeholder="أية ملاحظات إضافية حول سبب الزيارة..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11.5px',
                  boxSizing: 'border-box',
                  resize: 'none',
                }}
              />
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '10.5px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <MapPinIcon size={13} color="#0284c7" />
              <span>سيتم التقاط إحداثيات الموقع الجغرافي (GPS) تلقائياً لتوثيق وصول المندوب للمحل.</span>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
};
