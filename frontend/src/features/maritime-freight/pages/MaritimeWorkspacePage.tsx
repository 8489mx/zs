import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  RefreshCwIcon,
  FileTextIcon,
  ReceiptIcon,
  ShipIcon,
} from '@/shared/components/icons/AppIcons';
import { PageHeader } from '@/shared/components/page-header';
import { useAppToolbar } from '@/stores/toolbar-store';
import {
  maritimeApi,
  MaritimeRfq,
  MaritimeRfqBid,
  MaritimeQuotation,
  MaritimeJob,
  MaritimeContainer,
  ShippingPort,
  ShippingLine,
} from '../api/maritime-freight.api';
import { CreateRfqModal } from '../components/CreateRfqModal';
import { ApplyMarginModal } from '../components/ApplyMarginModal';
import { CarrierBidEntryModal } from '../components/CarrierBidEntryModal';
import { JobDetailsModal } from '../components/JobDetailsModal';
import { ContainerReturnModal } from '../components/ContainerReturnModal';
import { MaritimeRfqTab } from '../components/MaritimeRfqTab';
import { MaritimeMatrixTab } from '../components/MaritimeMatrixTab';
import { MaritimeQuotationsTab } from '../components/MaritimeQuotationsTab';
import { MaritimeJobsTab } from '../components/MaritimeJobsTab';
import { MaritimeContainersTab } from '../components/MaritimeContainersTab';
import { MaritimeMasterDataTab } from '../components/MaritimeMasterDataTab';

const VALID_TABS = ['rfqs', 'matrix', 'quotations', 'jobs', 'containers', 'master'] as const;
type MaritimeTabKey = typeof VALID_TABS[number];

export function MaritimeWorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as MaritimeTabKey;
  const activeTab: MaritimeTabKey = VALID_TABS.includes(tabParam) ? tabParam : 'rfqs';

  const switchTab = (tab: MaritimeTabKey) => {
    if (tab === activeTab) return;
    setSearchParams({ tab }, { replace: true });
  };

  useAppToolbar([
    { label: 'الرئيسية', to: '/dashboard' },
    { label: 'الشحن البحري واللوجستيات', to: '/maritime' },
  ]);

  const [rfqs, setRfqs] = useState<MaritimeRfq[]>([]);
  const [quotations, setQuotations] = useState<MaritimeQuotation[]>([]);
  const [jobs, setJobs] = useState<MaritimeJob[]>([]);
  const [containers, setContainers] = useState<MaritimeContainer[]>([]);
  const [ports, setPorts] = useState<ShippingPort[]>([]);
  const [lines, setLines] = useState<ShippingLine[]>([]);

  const [loading, setLoading] = useState(false);

  // Modals state
  const [isCreateRfqOpen, setIsCreateRfqOpen] = useState(false);
  const [isApplyMarginOpen, setIsApplyMarginOpen] = useState(false);
  const [selectedBidForMargin, setSelectedBidForMargin] = useState<{ rfq: MaritimeRfq; bid: MaritimeRfqBid } | null>(null);
  const [isAddBidOpen, setIsAddBidOpen] = useState(false);
  const [selectedRfqForBid, setSelectedRfqForBid] = useState<MaritimeRfq | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<MaritimeContainer | null>(null);
  const [matrixRfqId, setMatrixRfqId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rfqsData, quotesData, jobsData, containersData, portsData, linesData] = await Promise.all([
        maritimeApi.getRfqs(),
        maritimeApi.getQuotations(),
        maritimeApi.getJobs(),
        maritimeApi.getContainers(),
        maritimeApi.getPorts(),
        maritimeApi.getShippingLines(),
      ]);

      setRfqs(rfqsData);
      setQuotations(quotesData);
      setJobs(jobsData);
      setContainers(containersData);
      setPorts(portsData);
      setLines(linesData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectRfqForMatrix = (rfq: MaritimeRfq) => {
    setMatrixRfqId(rfq.id);
    switchTab('matrix');
  };

  const handleOpenAddBid = (rfq: MaritimeRfq) => {
    setSelectedRfqForBid(rfq);
    setIsAddBidOpen(true);
  };

  const handleApproveBid = (rfq: MaritimeRfq, bid: MaritimeRfqBid) => {
    setSelectedBidForMargin({ rfq, bid });
    setIsApplyMarginOpen(true);
  };

  const handleDispatchEmails = async (rfqId: string) => {
    try {
      const res = await maritimeApi.dispatchRfqEmails(rfqId);
      alert(res.message);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'فشل إرسال الإيميلات');
    }
  };

  const handleConvertToJob = async (quote: MaritimeQuotation) => {
    if (!confirm(`هل ترغب في تحويل عرض السعر ${quote.quotation_number} مباشرة إلى أمر تشغيل ملاحي؟`)) return;
    try {
      await maritimeApi.createJob({
        quotationId: quote.id,
        rfqId: quote.rfq_id || undefined,
        customerId: quote.customer_id || undefined,
        customerName: quote.customer_name,
        shippingLineName: 'الخط المعتمد',
        polCode: 'POL',
        polName: 'ميناء الشحن',
        podCode: 'POD',
        podName: 'ميناء التفريغ',
        notes: `تحويل آلي من عرض السعر ${quote.quotation_number}`,
      });
      await loadData();
      switchTab('jobs');
    } catch (err: any) {
      alert(err?.message || 'فشل تحويل أمر التشغيل');
    }
  };

  const handleUpdateQuotationStatus = async (id: string, status: 'approved' | 'rejected' | 'sent') => {
    try {
      await maritimeApi.updateQuotationStatus(id, status);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'فشل تحديث حالة العرض');
    }
  };

  return (
    <div className="page-stack page-shell maritime-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* هيدر الصفحة القياسي الموحد */}
        <PageHeader
          title="الشحن البحري واللوجستيات"
          description="منظومة إدارة الشحن البحري، طلبات التسعير المؤتمتة (RFQ)، مصفوفة المفاضلة، ومعيار DCSA."
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsCreateRfqOpen(true)}
                style={{
                  height: '38px',
                  padding: '0 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
                  fontSize: '0.8125rem',
                }}
              >
                <PlusIcon size={16} />
                <span>طلب تسعير جديد</span>
              </button>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                <RefreshCwIcon size={15} />
                <span>تحديث</span>
              </button>
            </div>
          }
        />

        {/* بطاقات المؤشرات الرئيسية (KPIs) المتطابقة مع معيار المنظومة */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>طلبات التسعير (RFQs)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {rfqs.length} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>طلب</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
              <FileTextIcon size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>عروض أسعار العملاء</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {quotations.length} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>عرض</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a16207' }}>
              <ReceiptIcon size={20} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أوامر التشغيل والعمليات</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {jobs.length} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أمر</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <ShipIcon size={20} />
            </div>
          </div>
        </div>

        {/* شريط التبويبات القياسي الثابت بدون أي اهتزاز أو تغير في الأبعاد */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: '#ffffff',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflowX: 'auto',
            marginBottom: '14px',
          }}
        >
          {[
            { key: 'rfqs', label: 'طلبات التسعير (RFQs)', count: rfqs.length },
            { key: 'matrix', label: 'مصفوفة مقارنة العروض', count: rfqs.reduce((acc, r) => acc + (r.bidsCount || 0), 0) },
            { key: 'quotations', label: 'عروض أسعار العملاء', count: quotations.length },
            { key: 'jobs', label: 'أوامر التشغيل والعمليات', count: jobs.length },
            { key: 'containers', label: 'الحاويات وفترة السماح', count: containers.length },
            { key: 'master', label: 'دليل الخطوط والموانئ', count: ports.length + lines.length },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchTab(tab.key as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: '1px solid transparent',
                  background: isActive ? '#170e5e' : 'transparent',
                  color: isActive ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease, color 0.12s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '18px',
                    padding: '0 6px',
                    borderRadius: '999px',
                    background: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* محتوى التبويب النشط بحاوية ذات ارتفاع أدنى مستقر لمنع أي انكماش أو قفز للصفحة */}
        <div style={{ width: '100%', minHeight: '480px' }}>
          {activeTab === 'rfqs' && (
            <MaritimeRfqTab
              rfqs={rfqs}
              loading={loading}
              onOpenCreate={() => setIsCreateRfqOpen(true)}
              onSelectRfqForMatrix={handleSelectRfqForMatrix}
              onOpenAddBid={handleOpenAddBid}
              onDispatchEmails={handleDispatchEmails}
            />
          )}

          {activeTab === 'matrix' && (
            <MaritimeMatrixTab
              rfqs={rfqs}
              selectedRfqId={matrixRfqId}
              onSelectRfqId={(id) => setMatrixRfqId(id)}
              onApproveBid={handleApproveBid}
              onOpenAddBid={handleOpenAddBid}
            />
          )}

          {activeTab === 'quotations' && (
            <MaritimeQuotationsTab
              quotations={quotations}
              loading={loading}
              onConvertToJob={handleConvertToJob}
              onUpdateStatus={handleUpdateQuotationStatus}
            />
          )}

          {activeTab === 'jobs' && (
            <MaritimeJobsTab
              jobs={jobs}
              loading={loading}
              onSelectJob={(j) => setSelectedJobId(j.id)}
              onOpenCreateJob={() => setIsCreateRfqOpen(true)}
            />
          )}

          {activeTab === 'containers' && (
            <MaritimeContainersTab
              containers={containers}
              loading={loading}
              onOpenReturnModal={(c) => {
                setSelectedContainer(c);
                setIsReturnModalOpen(true);
              }}
            />
          )}

          {activeTab === 'master' && (
            <MaritimeMasterDataTab
              ports={ports}
              lines={lines}
              onRefresh={loadData}
            />
          )}
        </div>
      </main>

      {/* النوافذ المنبثقة */}
      <CreateRfqModal
        open={isCreateRfqOpen}
        onClose={() => setIsCreateRfqOpen(false)}
        onCreated={loadData}
      />

      <ApplyMarginModal
        open={isApplyMarginOpen}
        rfq={selectedBidForMargin?.rfq || null}
        bid={selectedBidForMargin?.bid || null}
        onClose={() => {
          setIsApplyMarginOpen(false);
          setSelectedBidForMargin(null);
        }}
        onSuccess={() => {
          loadData();
          switchTab('quotations');
        }}
      />

      <CarrierBidEntryModal
        open={isAddBidOpen}
        rfq={selectedRfqForBid}
        onClose={() => {
          setIsAddBidOpen(false);
          setSelectedRfqForBid(null);
        }}
        onSaved={loadData}
      />

      <JobDetailsModal
        open={Boolean(selectedJobId)}
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onUpdated={loadData}
      />

      <ContainerReturnModal
        open={isReturnModalOpen}
        container={selectedContainer}
        onClose={() => {
          setIsReturnModalOpen(false);
          setSelectedContainer(null);
        }}
        onUpdated={loadData}
      />
    </div>
  );
}

export default MaritimeWorkspacePage;


