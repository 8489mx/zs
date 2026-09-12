import { useState, useMemo } from 'react';
import { MaritimeInquiry } from '../maritime-freight.types';
import { SearchIcon, ArrowLeftIcon, FileTextIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';

interface MaritimeInquiriesTabProps {
  inquiries: MaritimeInquiry[];
  loading: boolean;
  onOpenCreate?: () => void;
  onConvertToRfq: (inquiryId: string) => void;
  onNavigateToRfq?: (rfqId: string) => void;
}

export function MaritimeInquiriesTab({
  inquiries,
  loading,
  onOpenCreate,
  onConvertToRfq,
  onNavigateToRfq,
}: MaritimeInquiriesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>
            طلب مستلم جديد
          </span>
        );
      case 'rfq_created':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontSize: '0.72rem', fontWeight: 700 }}>
            تم استقصاء الخطوط (RFQ)
          </span>
        );
      case 'quoted':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#e0e7ff', color: '#4338ca', fontSize: '0.72rem', fontWeight: 700 }}>
            تم تقديم عرض سعر للعميل
          </span>
        );
      case 'converted_to_job':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 700 }}>
            تم التعميد (أمر تشغيل)
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700 }}>
            ملغي
          </span>
        );
      default:
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
            {status}
          </span>
        );
    }
  };

  const getDirectionBadge = (direction: string) => {
    switch (direction) {
      case 'import':
        return <span style={{ color: '#0369a1', fontWeight: 700 }}>استيراد (Import)</span>;
      case 'export':
        return <span style={{ color: '#15803d', fontWeight: 700 }}>تصدير (Export)</span>;
      case 'cross_trade':
        return <span style={{ color: '#b45309', fontWeight: 700 }}>تجارة ترانزيت (Cross-Trade)</span>;
      default:
        return <span>{direction}</span>;
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
      return matchSearch && matchStatus;
    });
  }, [inquiries, searchTerm, statusFilter]);

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
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
            استفسارات وطلبات شحن العملاء (Client Freight Inquiries)
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            نقطة انطلاق دورة الشحن البحري لتسجيل طلبات العملاء وتوليد طلبات تسعير الخطوط فورياً بنقرة زر واحدة
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '12px' }}>
            {filteredInquiries.length} طلب
          </span>
          {onOpenCreate && (
            <button
              type="button"
              onClick={onOpenCreate}
              style={{
                padding: '7px 14px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
              }}
            >
              + تسجيل استفسار جديد
            </button>
          )}
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <SearchIcon size={15} />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الطلب، اسم العميل، الميناء، أو البضاعة..."
            style={{
              width: '100%',
              padding: '7px 32px 7px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.78rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>الحالة:</span>
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

      {/* جدول الاستفسارات */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '12px 14px' }}>رقم الطلب والتاريخ</th>
              <th style={{ padding: '12px 14px' }}>العميل وبيانات الاتصال</th>
              <th style={{ padding: '12px 14px' }}>مسار الشحنة</th>
              <th style={{ padding: '12px 14px' }}>الحاويات والبضاعة</th>
              <th style={{ padding: '12px 14px' }}>الشرط والسداد</th>
              <th style={{ padding: '12px 14px' }}>جاهزية البضاعة</th>
              <th style={{ padding: '12px 14px' }}>الحالة</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراء المتسلسل</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل طلبات واستفسارات الشحن...
                </td>
              </tr>
            ) : filteredInquiries.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  {inquiries.length === 0
                    ? 'لا توجد طلبات شحن واستفسارات مسجلة حتى الآن. انقر على "+ تسجيل استفسار جديد" لبدء دورة شحن.'
                    : 'لا توجد نتائج مطابقة لبحثك الحالي.'}
                </td>
              </tr>
            ) : (
              filteredInquiries.map((inq) => (
                <tr key={inq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 800, color: '#170e5e' }}>{inq.inquiry_number}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      {new Date(inq.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{inq.customer_name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {inq.customer_phone ? <span>{inq.customer_phone}</span> : null}
                      {inq.customer_email ? <span style={{ marginRight: '6px' }}>| {inq.customer_email}</span> : null}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {inq.pol_code} ➔ {inq.pod_code}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {getDirectionBadge(inq.direction)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div>
                      <strong>{inq.container_count}x {inq.container_type}</strong> ({inq.cargo_mode})
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {inq.commodity_description}
                      {inq.gross_weight_kg ? ` | ${inq.gross_weight_kg} كجم` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div>{inq.incoterm}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {inq.payment_term === 'prepaid' ? 'مدفوع مقدماً' : 'دفع عند الوصول'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#334155' }}>
                      {inq.cargo_ready_date ? new Date(inq.cargo_ready_date).toLocaleDateString('ar-EG') : 'فوراً'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      سماح مطلوب: {inq.target_free_days || 14} يوم
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {getStatusBadge(inq.status)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {inq.status === 'received' ? (
                      <button
                        type="button"
                        disabled={convertingId === inq.id}
                        onClick={() => handleConvertClick(inq.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#170e5e',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <FileTextIcon size={14} />
                        <span>{convertingId === inq.id ? 'جاري التحويل...' : 'تحويل لـ RFQ خطوط'}</span>
                      </button>
                    ) : inq.rfq_id ? (
                      <button
                        type="button"
                        onClick={() => onNavigateToRfq && onNavigateToRfq(inq.rfq_id!)}
                        style={{
                          padding: '5px 10px',
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <CheckCircleIcon size={14} color="#16a34a" />
                        <span>طلب التسعير جاهز</span>
                        <ArrowLeftIcon size={13} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>مكتمل</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
