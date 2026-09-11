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
};

export function MaritimeMasterDataTab({
  ports,
  lines,
  onRefresh,
}: MaritimeMasterDataTabProps) {
  const [subTab, setSubTab] = useState<'lines' | 'agents' | 'ports'>('lines');
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLane, setSelectedLane] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'shipping_line' | 'overseas_agent'>('shipping_line');
  const [editingPartner, setEditingPartner] = useState<ShippingLine | null>(null);

  // New Port Form States
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
        port.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        port.country_name.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setSubTab('lines');
              setSearchQuery('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              background: subTab === 'lines' ? '#170e5e' : '#f1f5f9',
              color: subTab === 'lines' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease, color 0.12s ease',
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
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              background: subTab === 'agents' ? '#170e5e' : '#f1f5f9',
              color: subTab === 'agents' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease, color 0.12s ease',
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
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              background: subTab === 'ports' ? '#170e5e' : '#f1f5f9',
              color: subTab === 'ports' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease, color 0.12s ease',
            }}
          >
            <AppIcons.Globe size={15} />
            <span>دليل الموانئ البحرية الدولية ({ports.length})</span>
          </button>
        </div>

        <div>
          {subTab === 'lines' && (
            <button
              type="button"
              onClick={() => handleOpenAdd('shipping_line')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '36px',
                padding: '0 16px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <AppIcons.Plus size={15} />
              <span>إضافة خط ملاحي / توكيل</span>
            </button>
          )}

          {subTab === 'agents' && (
            <button
              type="button"
              onClick={() => handleOpenAdd('overseas_agent')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '36px',
                padding: '0 16px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <AppIcons.Plus size={15} />
              <span>إضافة وكيل شحن خارجي</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. SHIPPING LINES SUBTAB                                       */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'lines' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Controls Bar: Search + Trade Lane Filter */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بكود الخط، الاسم، التوكيل، أو الإيميل..."
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 32px 0 10px',
                    fontSize: '0.82rem',
                  }}
                />
                <div style={{ position: 'absolute', right: '10px', top: '9px', color: '#94a3b8' }}>
                  <AppIcons.Search size={16} />
                </div>
              </div>
            </div>

            {/* Trade Lane Pills Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>الممر الملاحي:</span>
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
                  }}
                >
                  {lane.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shipping Lines Table */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>كود SCAC</th>
                  <th style={{ padding: '10px 14px' }}>الخط الملاحي والتوكيل</th>
                  <th style={{ padding: '10px 14px' }}>الممرات الملاحية (Trade Lanes)</th>
                  <th style={{ padding: '10px 14px' }}>إيميل طلبات التسعير (RFQ Email)</th>
                  <th style={{ padding: '10px 14px' }}>إيميل الحجوزات (Booking)</th>
                  <th style={{ padding: '10px 14px' }}>الهاتف والتواصل</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredLines.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد خطوط ملاحية مطابقة لمعايير البحث
                    </td>
                  </tr>
                ) : (
                  filteredLines.map((line) => {
                    const lanes = line.trade_lanes ? line.trade_lanes.split(',') : [];
                    return (
                      <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e' }}>
                          <span style={{ background: '#eef2ff', padding: '3px 8px', borderRadius: '4px' }}>
                            {line.code}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{line.name_ar}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{line.name_en}</div>
                          {line.contact_person && (
                            <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: '2px' }}>
                              مسؤول الاتصال: {line.contact_person}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {lanes.length === 0 ? (
                              <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>ممر عام</span>
                            ) : (
                              lanes.map((l) => (
                                <span
                                  key={l}
                                  style={{
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  {TRADE_LANE_LABELS[l.trim()] || l}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {line.rfq_email ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{line.rfq_email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyEmail(line.rfq_email!)}
                                title="نسخ الإيميل"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                              >
                                <AppIcons.Copy size={13} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>غير مسجل</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>
                          {line.booking_email || '-'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: '0.76rem', color: '#334155' }}>{line.phone || '-'}</div>
                          {line.whatsapp && (
                            <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>واتساب: {line.whatsapp}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(line)}
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
                              onClick={() => handleDeletePartner(line)}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. OVERSEAS FORWARDING AGENTS SUBTAB                           */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Controls Bar: Search + Country Filter */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الوكيل، الدولة، المدينة، أو الإيميل..."
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 32px 0 10px',
                    fontSize: '0.82rem',
                  }}
                />
                <div style={{ position: 'absolute', right: '10px', top: '9px', color: '#94a3b8' }}>
                  <AppIcons.Search size={16} />
                </div>
              </div>
            </div>

            {/* Country Pills Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>دولة الوكيل:</span>
              {[
                { code: 'all', name: 'الكل' },
                { code: 'CN', name: 'الصين' },
                { code: 'TR', name: 'تركيا' },
                { code: 'DE', name: 'ألمانيا' },
                { code: 'IT', name: 'إيطاليا' },
                { code: 'IN', name: 'الهند' },
                { code: 'AE', name: 'الإمارات' },
                { code: 'US', name: 'أمريكا' },
              ].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCountry(c.code)}
                  style={{
                    height: '28px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: selectedCountry === c.code ? '1px solid #170e5e' : '1px solid #e2e8f0',
                    background: selectedCountry === c.code ? '#170e5e' : '#f8fafc',
                    color: selectedCountry === c.code ? '#ffffff' : '#475569',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Overseas Agents Table */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>كود الوكيل</th>
                  <th style={{ padding: '10px 14px' }}>اسم الشركة الوكيلة</th>
                  <th style={{ padding: '10px 14px' }}>الدولة والمدينة</th>
                  <th style={{ padding: '10px 14px' }}>مسؤول التسعير (Contact)</th>
                  <th style={{ padding: '10px 14px' }}>البريد الإلكتروني (RFQ Email)</th>
                  <th style={{ padding: '10px 14px' }}>واتساب / WeChat</th>
                  <th style={{ padding: '10px 14px' }}>الخدمات اللوجستية</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      لا يوجد وكلاء شحن مسجلون في هذه الدولة حالياً
                    </td>
                  </tr>
                ) : (
                  filteredAgents.map((agent) => (
                    <tr key={agent.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e' }}>
                        <span style={{ background: '#f0fdf4', color: '#166534', padding: '3px 8px', borderRadius: '4px' }}>
                          {agent.code}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{agent.name_ar}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{agent.name_en}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{agent.country_name || 'غير محدد'}</span>
                        {agent.city_name && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>مدينة: {agent.city_name}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#0369a1', fontWeight: 600 }}>
                        {agent.contact_person || '-'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {agent.rfq_email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{agent.rfq_email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(agent.rfq_email!)}
                              title="نسخ الإيميل"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                              <AppIcons.Copy size={13} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {agent.whatsapp && (
                          <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>
                            واتساب: {agent.whatsapp}
                          </div>
                        )}
                        {agent.wechat && (
                          <div style={{ fontSize: '0.72rem', color: '#0284c7' }}>
                            WeChat: {agent.wechat}
                          </div>
                        )}
                        {!agent.whatsapp && !agent.wechat && <span style={{ color: '#94a3b8' }}>-</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.74rem', color: '#475569' }}>
                        {agent.services_offered || 'FCL, FOB, EXW'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
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
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. PORTS SUBTAB                                               */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'ports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* إضافة ميناء جديد */}
          <div
            style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#170e5e' }}>
              إضافة ميناء بحري جديد (UN/LOCODE Seaport)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
              <Field label="كود الميناء (UN/LOCODE) *">
                <input
                  type="text"
                  value={newPortCode}
                  onChange={(e) => setNewPortCode(e.target.value.toUpperCase())}
                  placeholder="مثال: EGALY, CNSHA"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <Field label="اسم الميناء بالعربية *">
                <input
                  type="text"
                  value={newPortNameAr}
                  onChange={(e) => setNewPortNameAr(e.target.value)}
                  placeholder="ميناء الإسكندرية / ميناء شنغهاي"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <Field label="اسم الميناء بالإنجليزية">
                <input
                  type="text"
                  value={newPortNameEn}
                  onChange={(e) => setNewPortNameEn(e.target.value)}
                  placeholder="Alexandria Port / Shanghai Port"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <Field label="الدولة">
                <input
                  type="text"
                  value={newPortCountryName}
                  onChange={(e) => setNewPortCountryName(e.target.value)}
                  placeholder="مصر، الصين، تركيا..."
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <button
                type="button"
                onClick={handleAddPort}
                disabled={isAddingPort}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                + إضافة الميناء
              </button>
            </div>
          </div>

          {/* Search bar for ports */}
          <div style={{ maxWidth: '380px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الموانئ بالكود أو الاسم..."
              style={{
                width: '100%',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.82rem',
                background: '#ffffff',
              }}
            />
          </div>

          {/* جدول الموانئ */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>كود UN/LOCODE</th>
                  <th style={{ padding: '10px 14px' }}>الاسم بالعربية</th>
                  <th style={{ padding: '10px 14px' }}>الاسم بالإنجليزية</th>
                  <th style={{ padding: '10px 14px' }}>الدولة</th>
                </tr>
              </thead>
              <tbody>
                {filteredPorts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e' }}>{p.code}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.name_ar}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{p.name_en}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.country_name} ({p.country_code})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unified Partner Add/Edit Modal */}
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
