import { useState, useMemo } from 'react';
import { MaritimeInquiry } from '../maritime-freight.types';
import { AppIcons, SearchIcon, ArrowLeftIcon, FileTextIcon, CheckCircleIcon, XIcon } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useMaritime } from '../context/MaritimeContext';

interface MaritimeInquiriesTabProps {
  inquiries: MaritimeInquiry[];
  loading: boolean;
  onOpenCreate?: () => void;
  onConvertToRfq: (inquiryId: string) => Promise<any>;
  onNavigateToRfq?: (rfqId: string) => void;
}

export function MaritimeInquiriesTab({
  inquiries,
  loading,
  onConvertToRfq,
  onNavigateToRfq,
}: MaritimeInquiriesTabProps) {
  const { pipelineConfig } = useMaritime();
  const enableSeaFreight = pipelineConfig?.enableSeaFreight !== false;
  const enableAirFreight = pipelineConfig?.enableAirFreight !== false;
  const enableRoadFreight = pipelineConfig?.enableRoadFreight !== false;
  const activeModesCount = (enableSeaFreight ? 1 : 0) + (enableAirFreight ? 1 : 0) + (enableRoadFreight ? 1 : 0);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const modeOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'كافة الوسائط' }];
    if (enableSeaFreight) opts.push({ value: 'sea', label: 'شحن بحري' });
    if (enableAirFreight) opts.push({ value: 'air', label: 'شحن جوي' });
    if (enableRoadFreight) opts.push({ value: 'road', label: 'شحن بري' });
    return opts;
  }, [enableSeaFreight, enableAirFreight, enableRoadFreight]);

  const getModeBadge = (mode?: string) => {
    switch (mode) {
      case 'air':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', fontWeight: 700 }}>
            <AppIcons.Plane size={12} />
            <span>شحن جوي</span>
          </span>
        );
      case 'road':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontSize: '0.72rem', fontWeight: 700 }}>
            <AppIcons.Truck size={12} />
            <span>شحن بري</span>
          </span>
        );
      case 'sea':
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>
            <AppIcons.Ship size={12} />
            <span>شحن بحري</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#e0e7ff', color: '#3730a3', fontSize: '0.70rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            طلب جديد
          </span>
        );
      case 'rfq_created':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#fef3c7', color: '#92400e', fontSize: '0.70rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            تم إنشاء RFQ
          </span>
        );
      case 'quoted':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#dbeafe', color: '#1e40af', fontSize: '0.70rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            تم التسعير
          </span>
        );
      case 'converted_to_job':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontSize: '0.70rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            معمد (أمر تشغيل)
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.70rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            ملغي
          </span>
        );
      default:
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontSize: '0.70rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {status}
          </span>
        );
    }
  };

  const getDirectionBadge = (direction: string) => {
    switch (direction) {
      case 'import':
        return <span style={{ color: '#0369a1', fontWeight: 700, fontSize: '0.70rem' }}>وارد (Import)</span>;
      case 'export':
        return <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.70rem' }}>صادر (Export)</span>;
      case 'cross_trade':
        return <span style={{ color: '#b45309', fontWeight: 700, fontSize: '0.70rem' }}>ترانزيت</span>;
      default:
        return <span style={{ fontSize: '0.70rem' }}>{direction}</span>;
    }
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const matchSearch =
        !searchTerm.trim() ||
        inq.inquiry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inq.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inq.pol_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inq.pod_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inq.commodity_description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || inq.status === statusFilter;
      const matchMode =
        modeFilter === 'all' ||
        inq.transport_mode === modeFilter ||
        (!inq.transport_mode && modeFilter === 'sea');

      return matchSearch && matchStatus && matchMode;
    });
  }, [inquiries, searchTerm, statusFilter, modeFilter]);

  const handleConvertClick = async (inquiryId: string) => {
    try {
      setConvertingId(inquiryId);
      await onConvertToRfq(inquiryId);
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      {/* Header الكارت الموحد */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
            <span className="desktop-only-inline">استفسارات وطلبات شحن العملاء (Client Freight Inquiries)</span>
            <span className="mobile-only-inline">استفسارات وطلبات شحن العملاء</span>
          </h3>
          <p className="desktop-only" style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            نقطة انطلاق دورة الشحن متعدد الوسائط (بحري، جوي، بري) لتسجيل طلبات العملاء وتوليد طلبات تسعير الخطوط فورياً بنقرة زر واحدة
          </p>
          <p className="mobile-only" style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
            تسجيل طلبات الشحن وتوليد عروض التسعير فورياً
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '8px' }}>
            {filteredInquiries.length} طلب
          </span>
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <style>{`
        .inquiries-filter-bar {
          padding: 12px 18px;
          border-bottom: 1px solid #f1f5f9;
          background: #ffffff;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .inquiries-search-input-wrap {
          position: relative;
          flex: 1 1 240px;
          max-width: 400px;
        }
        .inquiries-dropdowns-group {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        @media (max-width: 768px) {
          .inquiries-filter-bar {
            padding: 10px 12px !important;
            gap: 8px !important;
          }
          .inquiries-search-input-wrap {
            flex: 1 1 100% !important;
            max-width: 100% !important;
          }
          .inquiries-dropdowns-group {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .inquiries-dropdown-item {
            width: 100% !important;
          }
          .inquiries-dropdown-item > div {
            width: 100% !important;
          }
        }
      `}</style>
      <div className="inquiries-filter-bar">
        <div className="inquiries-search-input-wrap">
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
            <SearchIcon size={15} />
          </span>
          <input
            type="text"
            role="searchbox"
            name="search_maritime_inquiries"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-form-type="other"
            data-lpignore="true"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الطلب، اسم العميل، الميناء، أو البضاعة..."
            style={{
              width: '100%',
              padding: searchTerm ? '7px 32px 7px 28px' : '7px 32px 7px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.78rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              title="مسح البحث"
              style={{
                position: 'absolute',
                left: '8px',
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
              <XIcon size={14} />
            </button>
          )}
        </div>

        <div className="inquiries-dropdowns-group">
          {activeModesCount > 1 && (
            <div className="inquiries-dropdown-item" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span className="desktop-only-inline" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>الوسيلة:</span>
              <div style={{ width: 140 }}>
                <CustomSelect
                  value={modeFilter}
                  onChange={(val) => setModeFilter(val || 'all')}
                  options={modeOptions}
                />
              </div>
            </div>
          )}

          <div className="inquiries-dropdown-item" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span className="desktop-only-inline" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>الحالة:</span>
            <div style={{ width: 170 }}>
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val || 'all')}
                options={[
                  { value: 'all', label: 'كافة الحالات' },
                  { value: 'received', label: 'طلبات مستلمة جديدة' },
                  { value: 'rfq_created', label: 'تم تحويلها لـ RFQ' },
                  { value: 'quoted', label: 'تم تسعيرها للعميل' },
                  { value: 'converted_to_job', label: 'تم التعميد (أمر تشغيل)' },
                  { value: 'cancelled', label: 'ملغية' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* جدول الاستفسارات أو حالة التحميل أو الحالة الفارغة النظيفة */}
      {loading ? (
        <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
          جاري تحميل طلبات واستفسارات الشحن...
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '10px' }}>
            <FileTextIcon size={24} />
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
            {inquiries.length === 0 ? 'لا توجد طلبات شحن مسجلة حتى الآن' : 'لا توجد نتائج مطابقة لبحثك الحالي'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', maxWidth: '340px' }}>
            {inquiries.length === 0 ? 'انقر على "طلب شحن عميل" في الأعلى لبدء دورة شحن جديدة.' : 'جرّب تعديل كلمة البحث أو فلترة الحالات.'}
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }} className="thin-scrollbar">
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.80rem' }}>
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>رقم الطلب والوسيلة</th>
                <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>العميل والاتصال</th>
                <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>مسار الشحنة</th>
                <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>الشحنة والمعدات / الأوزان</th>
                <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>الشرط والسداد</th>
                <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>جاهزية البضاعة</th>
                <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>الإجراء المتسلسل</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((inq) => (
                <tr key={inq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: '#170e5e', fontSize: '0.78rem' }}>{inq.inquiry_number}</span>
                      {getModeBadge(inq.transport_mode)}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>
                      {new Date(inq.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </td>
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 650, color: '#0f172a', fontSize: '0.69rem', lineHeight: 1.35, wordBreak: 'break-word' }}>
                      {inq.customer_name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                      {inq.customer_phone ? <div style={{ direction: 'ltr', textAlign: 'right' }}>{inq.customer_phone}</div> : null}
                      {inq.customer_email ? (
                        <div
                          style={{ direction: 'ltr', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={inq.customer_email}
                        >
                          {inq.customer_email}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {inq.pol_code} ➔ {inq.pod_code}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>
                      {getDirectionBadge(inq.direction)}
                    </div>
                  </td>
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                    {inq.transport_mode === 'air' ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.78rem' }}>
                          {Number(inq.chargeable_weight_kg || inq.gross_weight_kg || 0).toLocaleString()} كجم (محاسبي)
                        </div>
                        {(inq.cbm || inq.package_count) && (
                          <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '1px' }}>
                            {inq.package_count ? `${inq.package_count} طرد` : ''}{inq.package_count && inq.cbm ? ' • ' : ''}{inq.cbm ? `${inq.cbm} CBM` : ''}
                          </div>
                        )}
                        <div style={{ fontSize: '0.70rem', color: '#475569', lineHeight: 1.35, wordBreak: 'break-word', whiteSpace: 'normal', marginTop: '1px' }}>
                          {inq.commodity_description || 'بضاعة عامة'}
                        </div>
                      </div>
                    ) : inq.transport_mode === 'road' ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#c2410c', fontSize: '0.78rem' }}>
                          {inq.container_type || 'شاحنة'} ({inq.cargo_mode || 'FTL'})
                        </div>
                        {(inq.gross_weight_kg || inq.cbm) && (
                          <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '1px' }}>
                            {inq.gross_weight_kg ? `${Number(inq.gross_weight_kg).toLocaleString()} كجم` : ''}{inq.gross_weight_kg && inq.cbm ? ' • ' : ''}{inq.cbm ? `${inq.cbm} CBM` : ''}
                          </div>
                        )}
                        <div style={{ fontSize: '0.70rem', color: '#475569', lineHeight: 1.35, wordBreak: 'break-word', whiteSpace: 'normal', marginTop: '1px' }}>
                          {inq.commodity_description || 'بضاعة عامة'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem' }}>
                          {inq.container_count}x {inq.container_type}{' '}
                          <span style={{ fontSize: '0.70rem', fontWeight: 500, color: '#64748b' }}>({inq.cargo_mode})</span>
                        </div>
                        {(inq.gross_weight_kg || inq.cbm) && (
                          <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '1px' }}>
                            {inq.gross_weight_kg ? `${Number(inq.gross_weight_kg).toLocaleString()} كجم` : ''}{inq.gross_weight_kg && inq.cbm ? ' • ' : ''}{inq.cbm ? `${inq.cbm} CBM` : ''}
                          </div>
                        )}
                        <div style={{ fontSize: '0.70rem', color: '#475569', lineHeight: 1.35, wordBreak: 'break-word', whiteSpace: 'normal', marginTop: '1px' }}>
                          {inq.commodity_description || 'بضاعة عامة'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem' }}>{inq.incoterm}</div>
                    <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>
                      {inq.payment_term === 'prepaid' ? 'مدفوع مقدماً' : 'دفع بالوصول'}
                    </div>
                  </td>
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.74rem' }}>
                      {inq.cargo_ready_date ? new Date(inq.cargo_ready_date).toLocaleDateString('ar-EG') : 'جاهز فوراً'}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>
                      سماح: {inq.target_free_days || 14} يوم
                    </div>
                  </td>
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', textAlign: 'center' }}>
                    {getStatusBadge(inq.status)}
                  </td>
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', textAlign: 'center' }}>
                    {inq.status === 'received' ? (
                      <button
                        type="button"
                        disabled={convertingId === inq.id}
                        onClick={() => handleConvertClick(inq.id)}
                        style={{
                          padding: '4px 6px',
                          background: '#170e5e',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          width: '100%',
                          maxWidth: '96px',
                          whiteSpace: 'nowrap',
                          boxSizing: 'border-box',
                        }}
                      >
                        <FileTextIcon size={12} />
                        <span>{convertingId === inq.id ? 'تحويل...' : 'تحويل لـ RFQ'}</span>
                      </button>
                    ) : inq.rfq_id ? (
                      <button
                        type="button"
                        onClick={() => onNavigateToRfq && onNavigateToRfq(inq.rfq_id!)}
                        style={{
                          padding: '4px 6px',
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          borderRadius: '6px',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          width: '100%',
                          maxWidth: '96px',
                          whiteSpace: 'nowrap',
                          boxSizing: 'border-box',
                        }}
                      >
                        <CheckCircleIcon size={12} color="#16a34a" />
                        <span>فتح الـ RFQ</span>
                        <ArrowLeftIcon size={11} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>مكتمل</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
