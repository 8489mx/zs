import React, { useState, useMemo, useEffect } from 'react';
import { ShippingLine } from '../api/maritime-freight.api';
import { AppIcons, XIcon } from '@/shared/components/icons/AppIcons';

export interface CarrierSelectionGridProps {
  carriers: ShippingLine[];
  selectedIds: number[];
  onChangeSelectedIds: (ids: number[]) => void;
  maxHeight?: string;
  defaultCategory?: 'overseas_agent' | 'shipping_line' | 'all';
}

interface TradeLaneDef {
  id: string;
  label: string;
}

const TRADE_LANES: TradeLaneDef[] = [
  { id: 'all', label: 'كافة الأقاليم' },
  { id: 'far_east', label: 'الصين والشرق الأقصى' },
  { id: 'europe_med', label: 'أوروبا والمتوسط' },
  { id: 'arabian_gulf', label: 'الخليج والبحر الأحمر' },
  { id: 'americas', label: 'الأمريكتين' },
  { id: 'indian_sub', label: 'الهند وجنوب آسيا' },
  { id: 'africa', label: 'أفريقيا' },
];

export function carrierMatchesTradeLane(carrier: ShippingLine, laneId: string): boolean {
  if (laneId === 'all') return true;
  const lanes = (carrier.trade_lanes || '').toLowerCase();
  if (lanes.includes(laneId)) return true;

  const cc = (carrier.country_code || '').toUpperCase();
  if (laneId === 'far_east') {
    return cc === 'CN' || cc === 'HK' || cc === 'TW' || cc === 'JP' || cc === 'KR' || cc === 'SG';
  }
  if (laneId === 'europe_med') {
    return ['TR', 'DE', 'IT', 'FR', 'ES', 'NL', 'GB', 'EG', 'GR'].includes(cc);
  }
  if (laneId === 'arabian_gulf') {
    return ['AE', 'SA', 'KW', 'QA', 'OM', 'BH', 'JO', 'EG'].includes(cc);
  }
  if (laneId === 'americas') {
    return ['US', 'CA', 'BR'].includes(cc);
  }
  if (laneId === 'indian_sub') {
    return ['IN', 'PK', 'BD'].includes(cc);
  }
  if (laneId === 'africa') {
    return cc === 'EG' || lanes.includes('africa');
  }
  return false;
}

export function CarrierSelectionGrid({
  carriers,
  selectedIds,
  onChangeSelectedIds,
  maxHeight = '240px',
  defaultCategory = 'overseas_agent',
}: CarrierSelectionGridProps) {
  const [categoryFilter, setCategoryFilter] = useState<'overseas_agent' | 'shipping_line' | 'all'>(defaultCategory);
  const [tradeLaneFilter, setTradeLaneFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search query on filter category or lane change
  useEffect(() => {
    setSearchQuery('');
  }, [categoryFilter, tradeLaneFilter]);

  // 1. Group by category
  const overseasAgents = useMemo(
    () => carriers.filter((c) => c.carrier_type === 'overseas_agent'),
    [carriers]
  );
  const shippingLines = useMemo(
    () => carriers.filter((c) => !c.carrier_type || c.carrier_type === 'shipping_line'),
    [carriers]
  );

  // Pool of carriers for the currently active category
  const activePool = useMemo(() => {
    if (categoryFilter === 'overseas_agent') return overseasAgents;
    if (categoryFilter === 'shipping_line') return shippingLines;
    return carriers;
  }, [categoryFilter, overseasAgents, shippingLines, carriers]);

  // 2. Final displayed list after Trade Lane and Search Query
  const displayedCarriers = useMemo(() => {
    return activePool.filter((carrier) => {
      if (tradeLaneFilter !== 'all' && !carrierMatchesTradeLane(carrier, tradeLaneFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNameAr = carrier.name_ar?.toLowerCase().includes(q);
        const matchNameEn = carrier.name_en?.toLowerCase().includes(q);
        const matchCode = carrier.code?.toLowerCase().includes(q);
        const matchEmail = (carrier.rfq_email || carrier.email || '').toLowerCase().includes(q);
        const matchCountry = carrier.country_name?.toLowerCase().includes(q);
        const matchCity = carrier.city_name?.toLowerCase().includes(q);
        return Boolean(matchNameAr || matchNameEn || matchCode || matchEmail || matchCountry || matchCity);
      }
      return true;
    });
  }, [activePool, tradeLaneFilter, searchQuery]);

  // Counts
  const selectedAgentsCount = useMemo(
    () => overseasAgents.filter((c) => selectedIds.includes(Number(c.id))).length,
    [overseasAgents, selectedIds]
  );
  const selectedLinesCount = useMemo(
    () => shippingLines.filter((c) => selectedIds.includes(Number(c.id))).length,
    [shippingLines, selectedIds]
  );
  const totalSelectedCount = selectedIds.length;

  // Toggle single carrier
  const handleToggleSingle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChangeSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      onChangeSelectedIds([...selectedIds, id]);
    }
  };

  // Toggle all agents
  const handleToggleAllAgents = (e: React.MouseEvent) => {
    e.stopPropagation();
    const agentIds = overseasAgents.map((c) => Number(c.id));
    const allSelected = agentIds.length > 0 && agentIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onChangeSelectedIds(selectedIds.filter((id) => !agentIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...agentIds]));
      onChangeSelectedIds(merged);
    }
  };

  // Toggle all shipping lines
  const handleToggleAllLines = (e: React.MouseEvent) => {
    e.stopPropagation();
    const lineIds = shippingLines.map((c) => Number(c.id));
    const allSelected = lineIds.length > 0 && lineIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onChangeSelectedIds(selectedIds.filter((id) => !lineIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...lineIds]));
      onChangeSelectedIds(merged);
    }
  };

  // Toggle all (lines and agents together)
  const handleToggleAllTotal = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = carriers.map((c) => Number(c.id));
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onChangeSelectedIds([]);
    } else {
      onChangeSelectedIds(allIds);
    }
  };

  // Toggle all carriers in a specific regional trade lane (within active category)
  const handleToggleTradeLane = (laneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const regionCarriers = activePool.filter((c) => carrierMatchesTradeLane(c, laneId));
    const regionIds = regionCarriers.map((c) => Number(c.id));
    if (regionIds.length === 0) return;

    const allRegionSelected = regionIds.every((id) => selectedIds.includes(id));
    if (allRegionSelected) {
      onChangeSelectedIds(selectedIds.filter((id) => !regionIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...regionIds]));
      onChangeSelectedIds(merged);
    }
  };

  // Select / Deselect currently displayed only
  const handleSelectDisplayed = () => {
    const displayedIds = displayedCarriers.map((c) => Number(c.id));
    const allDisplayedSelected = displayedIds.every((id) => selectedIds.includes(id));
    if (allDisplayedSelected) {
      onChangeSelectedIds(selectedIds.filter((id) => !displayedIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...displayedIds]));
      onChangeSelectedIds(merged);
    }
  };

  const areAllAgentsSelected = overseasAgents.length > 0 && overseasAgents.every((c) => selectedIds.includes(Number(c.id)));
  const areAllLinesSelected = shippingLines.length > 0 && shippingLines.every((c) => selectedIds.includes(Number(c.id)));
  const areAllTotalSelected = carriers.length > 0 && carriers.every((c) => selectedIds.includes(Number(c.id)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">
      {/* 1. الشريط العلوي: الفلاتر الرئيسية الثلاثة مع شيك بوكس مستقل لكل فئة */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* زر 1: وكلاء الشحن الدوليين */}
        <div
          onClick={() => {
            setCategoryFilter('overseas_agent');
            setTradeLaneFilter('all');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            border: categoryFilter === 'overseas_agent' ? '1.5px solid #059669' : '1px solid #cbd5e1',
            background: categoryFilter === 'overseas_agent' ? '#ecfdf5' : '#ffffff',
            color: categoryFilter === 'overseas_agent' ? '#065f46' : '#334155',
            boxShadow: categoryFilter === 'overseas_agent' ? '0 1px 3px rgba(5, 150, 105, 0.15)' : 'none',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={areAllAgentsSelected}
            onClick={handleToggleAllAgents}
            onChange={() => {}}
            title="تحديد أو إلغاء تحديد كافة وكلاء الشحن الدوليين"
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#059669' }}
          />
          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>
            وكلاء الشحن الدوليين بالخارج
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '10px',
              background: categoryFilter === 'overseas_agent' ? '#d1fae5' : '#f1f5f9',
              color: categoryFilter === 'overseas_agent' ? '#047857' : '#64748b',
            }}
          >
            {selectedAgentsCount} / {overseasAgents.length}
          </span>
        </div>

        {/* زر 2: الخطوط والتوكيلات الملاحية */}
        <div
          onClick={() => {
            setCategoryFilter('shipping_line');
            setTradeLaneFilter('all');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            border: categoryFilter === 'shipping_line' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
            background: categoryFilter === 'shipping_line' ? '#eff6ff' : '#ffffff',
            color: categoryFilter === 'shipping_line' ? '#170e5e' : '#334155',
            boxShadow: categoryFilter === 'shipping_line' ? '0 1px 3px rgba(23, 14, 94, 0.15)' : 'none',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={areAllLinesSelected}
            onClick={handleToggleAllLines}
            onChange={() => {}}
            title="تحديد أو إلغاء تحديد كافة الخطوط الملاحية"
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#170e5e' }}
          />
          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>
            الخطوط والتوكيلات الملاحية
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '10px',
              background: categoryFilter === 'shipping_line' ? '#dbeafe' : '#f1f5f9',
              color: categoryFilter === 'shipping_line' ? '#1e40af' : '#64748b',
            }}
          >
            {selectedLinesCount} / {shippingLines.length}
          </span>
        </div>

        {/* زر 3: الكل (الخطوط والوكلاء معاً) */}
        <div
          onClick={() => {
            setCategoryFilter('all');
            setTradeLaneFilter('all');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            border: categoryFilter === 'all' ? '1.5px solid #475569' : '1px solid #cbd5e1',
            background: categoryFilter === 'all' ? '#f8fafc' : '#ffffff',
            color: categoryFilter === 'all' ? '#0f172a' : '#334155',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={areAllTotalSelected}
            onClick={handleToggleAllTotal}
            onChange={() => {}}
            title="تحديد أو إلغاء تحديد كافة الجهات (خطوط ووكلاء)"
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#170e5e' }}
          />
          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>
            الكل (خطوط ووكلاء)
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '10px',
              background: categoryFilter === 'all' ? '#e2e8f0' : '#f1f5f9',
              color: categoryFilter === 'all' ? '#0f172a' : '#64748b',
            }}
          >
            {totalSelectedCount} / {carriers.length}
          </span>
        </div>
      </div>

      {/* 2. الشريط الفرعي (المستوى الثاني): الفلاتر الإقليمية مع شيك بوكس لكل إقليم */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 10px',
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginLeft: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AppIcons.Globe size={14} />
          <span>الأقاليم والممرات:</span>
        </div>

        {TRADE_LANES.map((lane) => {
          const regionCarriers = activePool.filter((c) => carrierMatchesTradeLane(c, lane.id));
          if (lane.id !== 'all' && regionCarriers.length === 0) return null;

          const regionIds = regionCarriers.map((c) => Number(c.id));
          const selectedInRegion = regionIds.filter((id) => selectedIds.includes(id)).length;
          const isAllRegionSelected = regionIds.length > 0 && selectedInRegion === regionIds.length;
          const isCurrentActiveLane = tradeLaneFilter === lane.id;

          return (
            <div
              key={lane.id}
              onClick={() => setTradeLaneFilter(lane.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: isCurrentActiveLane ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                background: isCurrentActiveLane ? '#170e5e' : '#f8fafc',
                color: isCurrentActiveLane ? '#ffffff' : '#334155',
                fontSize: '0.72rem',
                fontWeight: 600,
                userSelect: 'none',
                transition: 'all 0.12s ease',
              }}
            >
              {lane.id !== 'all' && (
                <input
                  type="checkbox"
                  checked={isAllRegionSelected}
                  onClick={(e) => handleToggleTradeLane(lane.id, e)}
                  onChange={() => {}}
                  title={`تحديد أو إلغاء تحديد كافة جهات ${lane.label}`}
                  style={{
                    width: '13px',
                    height: '13px',
                    cursor: 'pointer',
                    accentColor: isCurrentActiveLane ? '#ffffff' : '#170e5e',
                  }}
                />
              )}
              <span>{lane.label}</span>
              <span
                style={{
                  fontSize: '0.66rem',
                  opacity: 0.85,
                  padding: '1px 4px',
                  borderRadius: '6px',
                  background: isCurrentActiveLane ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  color: isCurrentActiveLane ? '#ffffff' : '#475569',
                }}
              >
                {lane.id === 'all' ? activePool.length : `${selectedInRegion}/${regionCarriers.length}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. شريط البحث السريع والإجراءات اللحظية */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', minWidth: '200px', position: 'relative' }}>
          <input
            type="text"
            role="searchbox"
            name="search_carrier_selection"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-form-type="other"
            data-lpignore="true"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الخط، الوكيل، الكود، أو الدولة..."
            style={{
              width: '100%',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              padding: searchQuery ? '0 28px 0 24px' : '0 28px 0 10px',
              fontSize: '0.78rem',
              background: '#ffffff',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex' }}>
            <AppIcons.Search size={13} />
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              title="مسح البحث"
              style={{
                position: 'absolute',
                left: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                borderRadius: '50%',
              }}
            >
              <XIcon size={13} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleSelectDisplayed}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontWeight: 700,
              textDecoration: 'underline',
            }}
          >
            تحديد / إلغاء المعروض ({displayedCarriers.length})
          </button>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#170e5e' }}>
            {totalSelectedCount} محدد من {carriers.length}
          </span>
        </div>
      </div>

      {/* 4. شبكة كروت الجهات التفاعلية */}
      <div
        style={{
          maxHeight,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '8px',
          background: '#ffffff',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        {displayedCarriers.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', gridColumn: '1 / -1' }}>
            لا توجد جهات مطابقة للفلتر أو البحث الحالي
          </div>
        ) : (
          displayedCarriers.map((carrier) => {
            const isSelected = selectedIds.includes(Number(carrier.id));
            const isAgent = carrier.carrier_type === 'overseas_agent';

            return (
              <div
                key={carrier.id}
                onClick={() => handleToggleSingle(Number(carrier.id))}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: isSelected
                    ? isAgent ? '1.5px solid #059669' : '1.5px solid #170e5e'
                    : '1px solid #e2e8f0',
                  background: isSelected
                    ? isAgent ? '#f0fdf4' : '#f8fafc'
                    : '#ffffff',
                  boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
                  transition: 'border-color 0.12s ease',
                  userSelect: 'none',
                }}
              >
                {/* الصف الأول: شيك بوكس + الكود + شارة النوع */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        cursor: 'pointer',
                        width: '15px',
                        height: '15px',
                        accentColor: isAgent ? '#059669' : '#170e5e',
                      }}
                    />
                    <span style={{ fontWeight: 800, fontSize: '0.78rem', color: isAgent ? '#065f46' : '#170e5e' }}>
                      {carrier.code}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '8px',
                      background: isAgent ? '#dcfce7' : '#dbeafe',
                      color: isAgent ? '#15803d' : '#1e40af',
                    }}
                  >
                    {isAgent ? 'وكيل شحن بالخارج' : 'خط ملاحي رسمي'}
                  </span>
                </div>

                {/* الصف الثاني: الاسم العربي */}
                <div
                  style={{
                    fontSize: '0.77rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={carrier.name_ar}
                >
                  {carrier.name_ar}
                </div>

                {/* الصف الثالث: الدولة والمدينة + الإيميل */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {carrier.country_name || carrier.country_code || 'دولي'}
                    {carrier.city_name ? ` - ${carrier.city_name}` : ''}
                  </span>

                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: isSelected ? '#170e5e' : '#0284c7',
                      direction: 'ltr',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '130px',
                    }}
                    title={carrier.rfq_email || carrier.email || ''}
                  >
                    {carrier.rfq_email || carrier.email || '—'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
