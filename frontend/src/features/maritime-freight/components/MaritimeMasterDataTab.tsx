import { useState, useMemo } from 'react';
import { ShippingPort, ShippingLine, maritimeApi } from '../api/maritime-freight.api';
import { Field } from '@/shared/ui/field';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { PartnerFormModal } from './PartnerFormModal';

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
  const [subTab, setSubTab] = useState<'lines' | 'agents' | 'ports'>('agents');
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLane, setSelectedLane] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'shipping_line' | 'overseas_agent'>('shipping_line');
  const [editingPartner, setEditingPartner] = useState<ShippingLine | null>(null);

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
    if (!window.confirm(`هل أنت متأكد من حذف الشريك "${partner.name_ar}" من الدليل؟`)) {
      return;
    }
    try {
      await maritimeApi.deleteShippingLine(partner.id);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'فشل حذف الشريك');
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
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'فشل إضافة الميناء');
    } finally {
      setIsAddingPort(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    alert(`تم نسخ الإيميل: ${email}`);
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
      </div>

      {/* النافذة المنبثقة الموحدة لإضافة وتعديل الشركاء */}
      <PartnerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
        partner={editingPartner}
        defaultType={modalType}
      />
    </div>
  );
}
