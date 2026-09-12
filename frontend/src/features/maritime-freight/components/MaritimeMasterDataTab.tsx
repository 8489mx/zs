import { useState, useMemo, useEffect } from 'react';
import {
  ShippingPort,
  ShippingLine,
  ReferenceDataResponse,
  maritimeApi,
} from '../api/maritime-freight.api';
import { Field } from '@/shared/ui/field';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { PartnerFormModal } from './PartnerFormModal';
import { ImportCarriersModal } from './ImportCarriersModal';
import { toast, systemConfirm } from '@/shared/components/system-alert';

interface MaritimeMasterDataTabProps {
  ports: ShippingPort[];
  lines: ShippingLine[];
  onRefresh: () => void;
}

const TRADE_LANE_LABELS: Record<string, string> = {
  far_east: 'الصين والشرق الأقصى',
  europe_med: 'أوروبا والمتوسط',
  arabian_gulf: 'الخليج والبحر الأحمر',
  americas: 'الأمريكتين',
  africa: 'أفريقيا',
  indian_sub: 'الهند وجنوب آسيا',
  middle_east: 'الشرق الأوسط',
  black_sea: 'البحر الأسود',
};

const COUNTRY_OPTIONS = [
  { code: 'all', name: 'كافة الدول والمناطق' },
  { code: 'CN', name: 'الصين وشرق آسيا' },
  { code: 'DE', name: 'ألمانيا وأوروبا' },
  { code: 'FR', name: 'فرنسا وأوروبا' },
  { code: 'TR', name: 'تركيا والمتوسط' },
  { code: 'AE', name: 'الإمارات والخليج العربي' },
  { code: 'US', name: 'الولايات المتحدة الأمريكية' },
  { code: 'IN', name: 'الهند وشبه القارة الهندية' },
  { code: 'JP', name: 'اليابان وآسيا' },
  { code: 'SG', name: 'سنغافورة والآسيان' },
];

export function MaritimeMasterDataTab({
  ports,
  lines,
  onRefresh,
}: MaritimeMasterDataTabProps) {
  const [subTab, setSubTab] = useState<'lines' | 'agents' | 'ports' | 'standards'>('agents');
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLane, setSelectedLane] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'shipping_line' | 'overseas_agent'>('shipping_line');
  const [editingPartner, setEditingPartner] = useState<ShippingLine | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Standards & Reference Data States
  const [referenceData, setReferenceData] = useState<ReferenceDataResponse | null>(null);
  const [isLoadingRefData, setIsLoadingRefData] = useState(false);
  const [standardsSubCategory, setStandardsSubCategory] = useState<'containers' | 'incoterms' | 'terminals'>('containers');
  const [containerCategoryFilter, setContainerCategoryFilter] = useState<'all' | 'dry' | 'reefer' | 'special'>('all');

  useEffect(() => {
    if (subTab === 'standards' && !referenceData && !isLoadingRefData) {
      setIsLoadingRefData(true);
      maritimeApi
        .getReferenceData()
        .then((data) => setReferenceData(data))
        .catch((err) => console.error('Failed to load reference data:', err))
        .finally(() => setIsLoadingRefData(false));
    }
  }, [subTab, referenceData, isLoadingRefData]);

  // New Port Form States
  const [showAddPortForm, setShowAddPortForm] = useState(false);
  const [newPortCode, setNewPortCode] = useState('');
  const [newPortNameAr, setNewPortNameAr] = useState('');
  const [newPortNameEn, setNewPortNameEn] = useState('');
  const [newPortCountryName, setNewPortCountryName] = useState('مصر');
  const [isAddingPort, setIsAddingPort] = useState(false);

  // Separate shipping lines vs overseas agents
  const shippingLinesList = useMemo(() => {
    return lines.filter((l) => !l.carrier_type || l.carrier_type === 'shipping_line');
  }, [lines]);

  const overseasAgentsList = useMemo(() => {
    return lines.filter((l) => l.carrier_type === 'overseas_agent');
  }, [lines]);

  // Filtered Shipping Lines
  const filteredLines = useMemo(() => {
    return shippingLinesList.filter((line) => {
      const matchQuery =
        !searchQuery ||
        line.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        line.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (line.name_en && line.name_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (line.rfq_email && line.rfq_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (line.contact_person && line.contact_person.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchLane =
        selectedLane === 'all' ||
        (line.trade_lanes && line.trade_lanes.includes(selectedLane));

      return matchQuery && matchLane;
    });
  }, [shippingLinesList, searchQuery, selectedLane]);

  // Filtered Overseas Agents
  const filteredAgents = useMemo(() => {
    return overseasAgentsList.filter((agent) => {
      const matchQuery =
        !searchQuery ||
        agent.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (agent.name_en && agent.name_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (agent.country_name && agent.country_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (agent.city_name && agent.city_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (agent.contact_person && agent.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (agent.rfq_email && agent.rfq_email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCountry =
        selectedCountry === 'all' ||
        agent.country_code === selectedCountry ||
        agent.country_name === selectedCountry;

      return matchQuery && matchCountry;
    });
  }, [overseasAgentsList, searchQuery, selectedCountry]);

  // Filtered Ports
  const filteredPorts = useMemo(() => {
    return ports.filter((port) => {
      return (
        !searchQuery ||
        port.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        port.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (port.name_en && port.name_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (port.country_name && port.country_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [ports, searchQuery]);

  // Filtered Containers
  const filteredContainers = useMemo(() => {
    if (!referenceData?.containerTypes) return [];
    return referenceData.containerTypes.filter((c) => {
      const matchCategory =
        containerCategoryFilter === 'all' || c.category === containerCategoryFilter;
      const matchQuery =
        !searchQuery ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description_ar.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [referenceData?.containerTypes, containerCategoryFilter, searchQuery]);

  // Filtered Incoterms
  const filteredIncoterms = useMemo(() => {
    if (!referenceData?.incoterms) return [];
    return referenceData.incoterms.filter((inc) => {
      return (
        !searchQuery ||
        inc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.description_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.risk_transfer_point_ar.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [referenceData?.incoterms, searchQuery]);

  // Filtered Port Terminals
  const filteredTerminals = useMemo(() => {
    if (!referenceData?.portTerminals) return [];
    return referenceData.portTerminals.filter((term) => {
      return (
        !searchQuery ||
        term.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.terminal_operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.port_code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [referenceData?.portTerminals, searchQuery]);

  const handleOpenAdd = (type: 'shipping_line' | 'overseas_agent') => {
    setEditingPartner(null);
    setModalType(type);
    setModalOpen(true);
  };

  const handleOpenEdit = (partner: ShippingLine) => {
    setEditingPartner(partner);
    setModalType(partner.carrier_type || 'shipping_line');
    setModalOpen(true);
  };

  const handleDeletePartner = async (partner: ShippingLine) => {
    const confirmed = await systemConfirm({
      title: 'حذف شريك من الدليل الملاحي',
      badge: partner.code || partner.name_ar,
      message: `هل أنت متأكد من حذف الشريك "${partner.name_ar}" من الدليل القياسي؟`,
      impactItems: [
        'سيتم استبعاد الخط/الوكيل من قائمة الاختيار السريع في طلبات عروض الأسعار.',
        'يمكنك استعادة الشركاء الافتراضيين في أي وقت عبر زر "استعادة الدليل القياسي".',
      ],
      confirmText: 'حذف الشريك',
      cancelText: 'تراجع',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await maritimeApi.deleteShippingLine(partner.id);
      toast.success(`تم حذف الشريك "${partner.name_ar}" بنجاح`, 'حذف شريك');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حذف الشريك', 'خطأ');
    }
  };

  const handleAddPort = async () => {
    if (!newPortCode.trim() || !newPortNameAr.trim()) return;
    try {
      setIsAddingPort(true);
      await maritimeApi.createPort({
        code: newPortCode.trim().toUpperCase(),
        nameAr: newPortNameAr.trim(),
        nameEn: newPortNameEn.trim() || newPortNameAr.trim(),
        countryCode: newPortCode.trim().slice(0, 2).toUpperCase() || 'EG',
        countryName: newPortCountryName.trim(),
      });
      setNewPortCode('');
      setNewPortNameAr('');
      setNewPortNameEn('');
      setShowAddPortForm(false);
      toast.success('تمت إضافة الميناء بنجاح', 'إضافة ميناء');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'فشل إضافة الميناء', 'خطأ');
    } finally {
      setIsAddingPort(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success(`تم نسخ البريد الإلكتروني: ${email}`);
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* الكارت المؤسسي الموحد المتطابق مع باقي صفحات الموديول */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* 1. هيدر الكارت الموحد القياسي */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              دليل الخطوط والوكلاء والموانئ (Shipping Lines, Agents & Ports)
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              إدارة شاملة لخطوط الملاحة البحرية، شبكة وكلاء الشحن المعتمدين حول العالم، ودليل الموانئ الدولية
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              title="استيراد جهات الاتصال وخطوط الشحن من ملف Excel أو CSV"
              style={{
                height: '36px',
                padding: '0 12px',
                background: '#ffffff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <AppIcons.FileSpreadsheet size={15} />
              <span>استيراد من Excel / CSV</span>
            </button>

            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #e2e8f0',
                padding: '4px 10px',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
                minWidth: '95px',
                textAlign: 'center',
                display: 'inline-block',
              }}
            >
              {subTab === 'lines' && `${shippingLinesList.length} خط ملاحي`}
              {subTab === 'agents' && `${overseasAgentsList.length} وكيل شحن`}
              {subTab === 'ports' && `${ports.length} ميناء بحري`}
              {subTab === 'standards' && 'المواصفات القياسية'}
            </span>

            {subTab === 'lines' && (
              <button
                type="button"
                onClick={() => handleOpenAdd('shipping_line')}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
                }}
              >
                <AppIcons.Plus size={15} />
                <span>+ إضافة خط ملاحي</span>
              </button>
            )}

            {subTab === 'agents' && (
              <button
                type="button"
                onClick={() => handleOpenAdd('overseas_agent')}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
                }}
              >
                <AppIcons.Plus size={15} />
                <span>+ إضافة وكيل خارجي</span>
              </button>
            )}

            {subTab === 'ports' && (
              <button
                type="button"
                onClick={() => setShowAddPortForm(!showAddPortForm)}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
                }}
              >
                <AppIcons.Plus size={15} />
                <span>{showAddPortForm ? 'إخفاء نموذج الإضافة' : '+ إضافة ميناء جديد'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. شريط التبويبات المتكامل داخل الكارت */}
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '8px 16px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            minHeight: '52px',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSubTab('lines');
              setSearchQuery('');
              setSelectedLane('all');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: subTab === 'lines' ? '1.5px solid #170e5e' : '1.5px solid #cbd5e1',
              background: subTab === 'lines' ? '#170e5e' : '#ffffff',
              color: subTab === 'lines' ? '#ffffff' : '#334155',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <AppIcons.Ship size={15} />
            <span>الخطوط والتوكيلات الملاحية ({shippingLinesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('agents');
              setSearchQuery('');
              setSelectedCountry('all');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: subTab === 'agents' ? '1.5px solid #170e5e' : '1.5px solid #cbd5e1',
              background: subTab === 'agents' ? '#170e5e' : '#ffffff',
              color: subTab === 'agents' ? '#ffffff' : '#334155',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <AppIcons.Users size={15} />
            <span>وكلاء الشحن الدوليين بالخارج ({overseasAgentsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('ports');
              setSearchQuery('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: subTab === 'ports' ? '1.5px solid #170e5e' : '1.5px solid #cbd5e1',
              background: subTab === 'ports' ? '#170e5e' : '#ffffff',
              color: subTab === 'ports' ? '#ffffff' : '#334155',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <AppIcons.Globe size={15} />
            <span>دليل الموانئ البحرية الدولية ({ports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('standards');
              setSearchQuery('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: subTab === 'standards' ? '1.5px solid #170e5e' : '1.5px solid #cbd5e1',
              background: subTab === 'standards' ? '#170e5e' : '#ffffff',
              color: subTab === 'standards' ? '#ffffff' : '#334155',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <AppIcons.Container size={15} />
            <span>المواصفات القياسية و Incoterms 2020</span>
          </button>
        </div>

        {/* 3. شريط البحث والتصفية المتجاوب بدون تمدد خارجي */}
        {subTab === 'lines' && (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              minHeight: '58px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الخطوط الملاحية والتوكيلات..."
                style={{
                  width: '100%',
                  height: '34px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 32px 0 10px',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ position: 'absolute', right: '10px', top: '8px', color: '#94a3b8' }}>
                <AppIcons.Search size={15} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>المسار:</span>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'far_east', label: 'الصين والشرق الأقصى' },
                { id: 'europe_med', label: 'أوروبا والمتوسط' },
                { id: 'arabian_gulf', label: 'الخليج والبحر الأحمر' },
                { id: 'americas', label: 'الأمريكتين' },
              ].map((lane) => (
                <button
                  key={lane.id}
                  type="button"
                  onClick={() => setSelectedLane(lane.id)}
                  style={{
                    height: '28px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: selectedLane === lane.id ? '1px solid #170e5e' : '1px solid #e2e8f0',
                    background: selectedLane === lane.id ? '#170e5e' : '#f8fafc',
                    color: selectedLane === lane.id ? '#ffffff' : '#475569',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {lane.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {subTab === 'agents' && (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              minHeight: '58px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم الوكيل، الدولة، أو الإيميل..."
                style={{
                  width: '100%',
                  height: '34px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 32px 0 10px',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ position: 'absolute', right: '10px', top: '8px', color: '#94a3b8' }}>
                <AppIcons.Search size={15} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>دولة ومقر الوكيل:</span>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '200px',
                }}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {subTab === 'ports' && (
          <>
            {showAddPortForm && (
              <div
                style={{
                  padding: '16px 20px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <h4 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 700, color: '#170e5e' }}>
                  بيانات الميناء الجديد (UN/LOCODE Seaport)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
                  <Field label="كود الميناء (UN/LOCODE) *">
                    <input
                      type="text"
                      value={newPortCode}
                      onChange={(e) => setNewPortCode(e.target.value.toUpperCase())}
                      placeholder="مثال: EGALY, CNSHA"
                      style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.8125rem' }}
                    />
                  </Field>
                  <Field label="اسم الميناء بالعربية *">
                    <input
                      type="text"
                      value={newPortNameAr}
                      onChange={(e) => setNewPortNameAr(e.target.value)}
                      placeholder="ميناء الإسكندرية"
                      style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.8125rem' }}
                    />
                  </Field>
                  <Field label="اسم الميناء بالإنجليزية">
                    <input
                      type="text"
                      value={newPortNameEn}
                      onChange={(e) => setNewPortNameEn(e.target.value)}
                      placeholder="Alexandria Port"
                      style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.8125rem' }}
                    />
                  </Field>
                  <Field label="الدولة">
                    <input
                      type="text"
                      value={newPortCountryName}
                      onChange={(e) => setNewPortCountryName(e.target.value)}
                      placeholder="مصر، الصين..."
                      style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.8125rem' }}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={handleAddPort}
                    disabled={isAddingPort}
                    style={{
                      height: '34px',
                      padding: '0 16px',
                      background: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    حفظ الميناء
                  </button>
                </div>
              </div>
            )}

            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', minHeight: '58px', boxSizing: 'border-box', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في الموانئ بالكود أو الاسم..."
                  style={{
                    width: '100%',
                    height: '34px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 32px 0 10px',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ position: 'absolute', right: '10px', top: '8px', color: '#94a3b8' }}>
                  <AppIcons.Search size={15} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* شريط البحث وتصنيفات المواصفات القياسية */}
        {subTab === 'standards' && (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              minHeight: '58px',
              boxSizing: 'border-box',
            }}
          >
            {/* أزرار التنقل بين الفئات القياسية */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setStandardsSubCategory('containers');
                  setSearchQuery('');
                }}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: standardsSubCategory === 'containers' ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  background: standardsSubCategory === 'containers' ? '#170e5e' : '#f8fafc',
                  color: standardsSubCategory === 'containers' ? '#ffffff' : '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Container size={14} />
                <span>مواصفات الحاويات (ISO Containers)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStandardsSubCategory('incoterms');
                  setSearchQuery('');
                }}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: standardsSubCategory === 'incoterms' ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  background: standardsSubCategory === 'incoterms' ? '#170e5e' : '#f8fafc',
                  color: standardsSubCategory === 'incoterms' ? '#ffffff' : '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.FileCheck size={14} />
                <span>شروط التجارة الدولية (Incoterms 2020)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStandardsSubCategory('terminals');
                  setSearchQuery('');
                }}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: standardsSubCategory === 'terminals' ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  background: standardsSubCategory === 'terminals' ? '#170e5e' : '#f8fafc',
                  color: standardsSubCategory === 'terminals' ? '#ffffff' : '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Building size={14} />
                <span>محطات الحاويات بالموانئ (Terminals)</span>
              </button>
            </div>

            {/* البحث وفلاتر الحاويات */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {standardsSubCategory === 'containers' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'dry', label: 'جافة (Dry)' },
                    { id: 'reefer', label: 'مبردة (Reefer)' },
                    { id: 'special', label: 'خاصة (Special)' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setContainerCategoryFilter(cat.id as any)}
                      style={{
                        height: '28px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: containerCategoryFilter === cat.id ? '1px solid #170e5e' : '1px solid #e2e8f0',
                        background: containerCategoryFilter === cat.id ? '#170e5e' : '#f8fafc',
                        color: containerCategoryFilter === cat.id ? '#ffffff' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ position: 'relative', width: '240px', maxWidth: '100%' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    standardsSubCategory === 'containers'
                      ? 'بحث في الحاويات...'
                      : standardsSubCategory === 'incoterms'
                      ? 'بحث في الـ Incoterms...'
                      : 'بحث في محطات الموانئ...'
                  }
                  style={{
                    width: '100%',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 30px 0 8px',
                    fontSize: '0.78rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ position: 'absolute', right: '8px', top: '7px', color: '#94a3b8' }}>
                  <AppIcons.Search size={14} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. جداول البيانات المتطابقة بنسبة 100% مع معيار جداول رادار الحاويات والـ RFQ */}

        {/* أ. جدول الخطوط الملاحية */}
        {subTab === 'lines' && (
          <div style={{ width: '100%', overflowX: 'auto', minHeight: '480px' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.8125rem' }}>
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '23%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>كود الخط</th>
                  <th style={{ padding: '12px 14px' }}>اسم الخط الملاحي</th>
                  <th style={{ padding: '12px 14px' }}>مسارات الإبحار</th>
                  <th style={{ padding: '12px 14px' }}>إيميل التسعير والحجز</th>
                  <th style={{ padding: '12px 14px' }}>الهاتف والتواصل</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد خطوط ملاحية مطابقة لمعايير البحث
                    </td>
                  </tr>
                ) : (
                  filteredLines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e', whiteSpace: 'nowrap' }}>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                          {line.code}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={line.name_ar}>
                          {line.name_ar}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={line.name_en || ''}>
                          {line.name_en}
                        </div>
                        {(line.notes || line.services_offered) && (
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }} title={line.notes || line.services_offered || undefined}>
                            {line.notes || line.services_offered}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {!line.trade_lanes ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>عالمي</span>
                          ) : (
                            line.trade_lanes.split(',').slice(0, 3).map((l) => (
                              <span
                                key={l}
                                style={{
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {TRADE_LANE_LABELS[l.trim()] || l}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        {line.rfq_email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: '#1d4ed8',
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                direction: 'ltr',
                                textAlign: 'left',
                              }}
                              title={line.rfq_email}
                            >
                              {line.rfq_email}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(line.rfq_email!)}
                              title="نسخ الإيميل"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px', flexShrink: 0 }}
                            >
                              <AppIcons.Copy size={13} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>غير مسجل</span>
                        )}
                        {line.booking_email && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#64748b',
                              direction: 'ltr',
                              textAlign: 'left',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: '2px',
                            }}
                            title={`حجز: ${line.booking_email}`}
                          >
                            حجز: {line.booking_email}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.76rem', color: '#334155', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {line.phone || '-'}
                        </div>
                        {line.contact_person && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {line.contact_person}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(line)}
                          style={{
                            padding: '4px 10px',
                            background: '#f1f5f9',
                            color: '#170e5e',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                          }}
                        >
                          تعديل
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ب. جدول وكلاء الشحن الدوليين بالخارج */}
        {subTab === 'agents' && (
          <div style={{ width: '100%', overflowX: 'auto', minHeight: '480px' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.8125rem' }}>
              <colgroup>
                <col style={{ width: '11%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>كود الوكيل</th>
                  <th style={{ padding: '12px 14px' }}>اسم الشركة الوكيلة</th>
                  <th style={{ padding: '12px 14px' }}>الدولة والمدينة</th>
                  <th style={{ padding: '12px 14px' }}>مسؤول التسعير والتواصل</th>
                  <th style={{ padding: '12px 14px' }}>البريد الإلكتروني (RFQ)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      لا يوجد وكلاء شحن مسجلون في هذه الدولة حالياً
                    </td>
                  </tr>
                ) : (
                  filteredAgents.map((agent) => (
                    <tr key={agent.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e', whiteSpace: 'nowrap' }}>
                        <span style={{ background: '#f0fdf4', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                          {agent.code}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={agent.name_ar}>
                          {agent.name_ar}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={agent.name_en || ''}>
                          {agent.name_en}
                        </div>
                        {agent.services_offered && (
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }} title={agent.services_offered}>
                            {agent.services_offered}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {agent.country_name || 'غير محدد'}
                        </div>
                        {agent.city_name && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            مدينة: {agent.city_name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        <div style={{ color: '#0369a1', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={agent.contact_person || ''}>
                          {agent.contact_person || '-'}
                        </div>
                        {agent.whatsapp && (
                          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'ltr', textAlign: 'right' }}>
                            WA: {agent.whatsapp}
                          </div>
                        )}
                        {agent.wechat && !agent.whatsapp && (
                          <div style={{ fontSize: '0.72rem', color: '#0284c7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            WeChat: {agent.wechat}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        {agent.rfq_email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: '#1d4ed8',
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                direction: 'ltr',
                                textAlign: 'left',
                              }}
                              title={agent.rfq_email}
                            >
                              {agent.rfq_email}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(agent.rfq_email!)}
                              title="نسخ الإيميل"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px', flexShrink: 0 }}
                            >
                              <AppIcons.Copy size={13} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(agent)}
                            style={{
                              padding: '4px 8px',
                              background: '#f1f5f9',
                              color: '#170e5e',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                            }}
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePartner(agent)}
                            style={{
                              padding: '4px 8px',
                              background: '#fff1f2',
                              color: '#be123c',
                              border: '1px solid #fecdd3',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ج. جدول الموانئ البحرية */}
        {subTab === 'ports' && (
          <div style={{ width: '100%', overflowX: 'auto', minHeight: '480px' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.8125rem' }}>
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>كود UN/LOCODE</th>
                  <th style={{ padding: '12px 14px' }}>الاسم بالعربية</th>
                  <th style={{ padding: '12px 14px' }}>الاسم بالإنجليزية</th>
                  <th style={{ padding: '12px 14px' }}>الدولة والرمز</th>
                </tr>
              </thead>
              <tbody>
                {filteredPorts.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد موانئ مطابقة لبحثك
                    </td>
                  </tr>
                ) : (
                  filteredPorts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e', whiteSpace: 'nowrap' }}>
                        <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '4px' }}>
                          {p.code}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name_ar}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name_en}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{p.country_name}</span>
                        <span style={{ color: '#64748b', fontSize: '0.74rem', marginInlineStart: '6px' }}>({p.country_code})</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* د. قسم المواصفات القياسية و Incoterms 2020 */}
        {subTab === 'standards' && (
          <div style={{ padding: '16px', minHeight: '480px', boxSizing: 'border-box' }}>
            {isLoadingRefData ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
                جاري تحميل المراجع القياسية ومواصفات الحاويات...
              </div>
            ) : standardsSubCategory === 'containers' ? (
              <div>
                <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      المواصفات الهندسية للحاويات القياسية (ISO 6346 Container Specifications)
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      الأوزان القصوى، السعات الحجمية بالمتر المكعب (CBM)، والأبعاد الداخلية والخارجية المعتمدة دولياً
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#170e5e', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
                    {filteredContainers.length} نوع حاوية
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {filteredContainers.map((c) => (
                    <div
                      key={c.code}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* هيدر كارت الحاوية */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                color: '#170e5e',
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {c.code}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>
                              {c.name_ar}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            {c.name_en} ({c.length_feet} ft)
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background:
                              c.category === 'dry'
                                ? '#f1f5f9'
                                : c.category === 'reefer'
                                ? '#eff6ff'
                                : '#fef3c7',
                            color:
                              c.category === 'dry'
                                ? '#334155'
                                : c.category === 'reefer'
                                ? '#1d4ed8'
                                : '#b45309',
                            border: `1px solid ${
                              c.category === 'dry'
                                ? '#cbd5e1'
                                : c.category === 'reefer'
                                ? '#bfdbfe'
                                : '#fde68a'
                            }`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.category === 'dry'
                            ? 'بضائع عامة جافة'
                            : c.category === 'reefer'
                            ? 'مبردة ومجمدة'
                            : 'تجهيز وتداول خاص'}
                        </span>
                      </div>

                      {/* مؤشرات السعة والأوزان */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '6px',
                          background: '#f8fafc',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>السعة (CBM)</div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0369a1', marginTop: '2px' }}>
                            {c.max_cbm} م³
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>أقصى حمولة</div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                            {c.max_payload_kg.toLocaleString()} كجم
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>الوزن فارغ</div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
                            {c.tare_weight_kg.toLocaleString()} كجم
                          </div>
                        </div>
                      </div>

                      {/* الأبعاد الهندسية */}
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: '#334155',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>الأبعاد الداخلية (ط × ع × ع):</span>
                          <span style={{ fontWeight: 600, direction: 'ltr' }}>
                            {c.internal_length_m} × {c.internal_width_m} × {c.internal_height_m} m
                          </span>
                        </div>
                        {c.door_width_m > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>أبعاد فتحة الباب (ع × ع):</span>
                            <span style={{ fontWeight: 600, direction: 'ltr' }}>
                              {c.door_width_m} × {c.door_height_m} m
                            </span>
                          </div>
                        )}
                      </div>

                      {/* الوصف الفني للضبط المتوازي */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.75rem',
                          color: '#64748b',
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          textAlignLast: 'start',
                          lineHeight: 1.5,
                        }}
                      >
                        {c.description_ar}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : standardsSubCategory === 'incoterms' ? (
              <div>
                <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      قواعد التجارة الدولية (Incoterms 2020 Rules)
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      توزيع التكاليف ومسؤوليات الشحن والتأمين ونقاط انتقال المخاطر القانونية بين البائع والمشتري
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#170e5e', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
                    {filteredIncoterms.length} قاعدة تجارية
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {filteredIncoterms.map((inc) => (
                    <div
                      key={inc.code}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* هيدر القاعدة */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                color: '#170e5e',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {inc.code}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>
                              {inc.name_ar}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            {inc.name_en}
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: inc.rule_type === 'sea_inland_waterway' ? '#f0fdf4' : '#f8fafc',
                            color: inc.rule_type === 'sea_inland_waterway' ? '#166534' : '#475569',
                            border: `1px solid ${inc.rule_type === 'sea_inland_waterway' ? '#bbf7d0' : '#e2e8f0'}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {inc.rule_type === 'sea_inland_waterway' ? 'بحري ونهري فقط' : 'متعدد الوسائط'}
                        </span>
                      </div>

                      {/* نقطة انتقال المخاطر */}
                      <div
                        style={{
                          background: '#f8fafc',
                          borderInlineStart: '3px solid #170e5e',
                          padding: '6px 10px',
                          borderRadius: '0 4px 4px 0',
                          fontSize: '0.74rem',
                          color: '#1e293b',
                        }}
                      >
                        <strong style={{ color: '#170e5e' }}>نقطة انتقال المسؤولية: </strong>
                        <span>{inc.risk_transfer_point_ar}</span>
                      </div>

                      {/* جدول المسؤوليات والتكاليف */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '6px',
                          fontSize: '0.72rem',
                        }}
                      >
                        <div
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: inc.seller_pays_export_customs ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${inc.seller_pays_export_customs ? '#bbf7d0' : '#e2e8f0'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: '#475569' }}>جمارك التصدير:</span>
                          <strong style={{ color: inc.seller_pays_export_customs ? '#166534' : '#64748b' }}>
                            {inc.seller_pays_export_customs ? 'البائع' : 'المشتري'}
                          </strong>
                        </div>

                        <div
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: inc.seller_pays_origin_thc ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${inc.seller_pays_origin_thc ? '#bbf7d0' : '#e2e8f0'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: '#475569' }}>شحن المغادرة THC:</span>
                          <strong style={{ color: inc.seller_pays_origin_thc ? '#166534' : '#64748b' }}>
                            {inc.seller_pays_origin_thc ? 'البائع' : 'المشتري'}
                          </strong>
                        </div>

                        <div
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: inc.seller_pays_ocean_freight ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${inc.seller_pays_ocean_freight ? '#bbf7d0' : '#e2e8f0'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: '#475569' }}>نولون الشحن البحري:</span>
                          <strong style={{ color: inc.seller_pays_ocean_freight ? '#166534' : '#64748b' }}>
                            {inc.seller_pays_ocean_freight ? 'البائع' : 'المشتري'}
                          </strong>
                        </div>

                        <div
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: inc.seller_pays_destination_thc ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${inc.seller_pays_destination_thc ? '#bbf7d0' : '#e2e8f0'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: '#475569' }}>شحن الوصول THC:</span>
                          <strong style={{ color: inc.seller_pays_destination_thc ? '#166534' : '#64748b' }}>
                            {inc.seller_pays_destination_thc ? 'البائع' : 'المشتري'}
                          </strong>
                        </div>

                        <div
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: inc.seller_pays_insurance ? '#eff6ff' : '#f8fafc',
                            border: `1px solid ${inc.seller_pays_insurance ? '#bfdbfe' : '#e2e8f0'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: '#475569' }}>التأمين البحري:</span>
                          <strong style={{ color: inc.seller_pays_insurance ? '#1d4ed8' : '#64748b' }}>
                            {inc.seller_pays_insurance ? 'البائع' : 'المشتري'}
                          </strong>
                        </div>

                        <div
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: inc.seller_pays_import_customs ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${inc.seller_pays_import_customs ? '#bbf7d0' : '#e2e8f0'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: '#475569' }}>جمارك الاستيراد:</span>
                          <strong style={{ color: inc.seller_pays_import_customs ? '#166534' : '#64748b' }}>
                            {inc.seller_pays_import_customs ? 'البائع' : 'المشتري'}
                          </strong>
                        </div>
                      </div>

                      {/* الوصف */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.74rem',
                          color: '#64748b',
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          textAlignLast: 'start',
                          lineHeight: 1.5,
                        }}
                      >
                        {inc.description_ar}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      محطات الحاويات واللوجستيات بالموانئ (Port Terminals)
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      دليل محطات تداول الحاويات والبضائع بالموانئ المصرية والدولية والربط مع منظومة نافذة
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#170e5e', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
                    {filteredTerminals.length} محطة
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {filteredTerminals.map((t) => (
                    <div
                      key={t.code}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              color: '#170e5e',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {t.code}
                          </span>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', marginTop: '6px' }}>
                            {t.name_ar}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.name_en}</div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          {t.port_code}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                        <span style={{ color: '#64748b' }}>المشغل: </span>
                        <strong>{t.terminal_operator}</strong>
                      </div>

                      {t.notes && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.74rem',
                            color: '#64748b',
                            background: '#f8fafc',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #f1f5f9',
                            lineHeight: 1.45,
                          }}
                        >
                          {t.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* النافذة المنبثقة الموحدة لإضافة وتعديل الشركاء */}
      <PartnerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
        partner={editingPartner}
        defaultType={modalType}
      />

      {/* النافذة المنبثقة لاستيراد البيانات من Excel / CSV */}
      <ImportCarriersModal
        open={importModalOpen}
        defaultType={subTab === 'lines' ? 'shipping_line' : 'overseas_agent'}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false);
          onRefresh();
        }}
      />
    </div>
  );
}
