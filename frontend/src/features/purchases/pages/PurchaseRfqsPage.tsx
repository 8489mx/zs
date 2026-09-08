import { useState, useEffect, type FC } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { AppIcons, PlusIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import {
  purchaseRfqsApi,
  PurchaseRfq,
  CreateRfqPayload,
  SubmitSupplierBidPayload,
} from '../api/purchase-rfqs.api';

export const PurchaseRfqsPage: FC = () => {
  const [rfqs, setRfqs] = useState<PurchaseRfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeRfq, setActiveRfq] = useState<PurchaseRfq | null>(null);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [isAddBidOpen, setIsAddBidOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New RFQ Form
  const [newRfq, setNewRfq] = useState<CreateRfqPayload>({
    title: '',
    deadline_date: '',
    expected_delivery_date: '',
    notes: '',
    items: [],
  });

  const [newItem, setNewItem] = useState({
    product_id: 1,
    product_name: '',
    unit_name: 'قطعة',
    target_quantity: 1,
    specifications: '',
  });

  // Supplier Bid Form
  const [bidForm, setBidForm] = useState<SubmitSupplierBidPayload>({
    supplier_id: 1,
    supplier_name: '',
    supplier_phone: '',
    payment_terms: 'آجل 30 يوم',
    delivery_lead_days: 3,
    notes: '',
    item_bids: [],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await purchaseRfqsApi.list();
      setRfqs(data);
    } catch (err) {
      console.error('Failed to load RFQs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setNewRfq({
      title: '',
      deadline_date: '',
      expected_delivery_date: '',
      notes: '',
      items: [],
    });
    setNewItem({ product_id: 1, product_name: '', unit_name: 'قطعة', target_quantity: 1, specifications: '' });
    setIsCreateOpen(true);
  };

  const addItemToRfq = () => {
    if (!newItem.product_name.trim()) return;
    setNewRfq((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...newItem,
          product_id: Date.now(), // Unique temporary id
          target_quantity: Number(newItem.target_quantity) || 1,
        },
      ],
    }));
    setNewItem({ product_id: 1, product_name: '', unit_name: 'قطعة', target_quantity: 1, specifications: '' });
  };

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRfq.title.trim() || newRfq.items.length === 0) return;

    try {
      setSubmitting(true);
      await purchaseRfqsApi.create(newRfq);
      setIsCreateOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create RFQ', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openComparisonMatrix = async (rfqId: number) => {
    try {
      setLoading(true);
      const full = await purchaseRfqsApi.getOne(rfqId);
      setActiveRfq(full);
      setIsMatrixOpen(true);
    } catch (err) {
      console.error('Failed to load RFQ comparison matrix', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddBidModal = () => {
    if (!activeRfq || !activeRfq.items) return;
    setBidForm({
      supplier_id: Date.now(),
      supplier_name: '',
      supplier_phone: '',
      payment_terms: 'آجل 30 يوم',
      delivery_lead_days: 3,
      notes: '',
      item_bids: activeRfq.items.map((it) => ({
        rfq_item_id: Number(it.id),
        quoted_unit_cost: 0,
        tax_rate: 14,
      })),
    });
    setIsAddBidOpen(true);
  };

  const handleSaveBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRfq || !bidForm.supplier_name.trim()) return;

    try {
      setSubmitting(true);
      await purchaseRfqsApi.submitBid(activeRfq.id, bidForm);
      setIsAddBidOpen(false);
      // Reload active RFQ
      const updated = await purchaseRfqsApi.getOne(activeRfq.id);
      setActiveRfq(updated);
      await loadData();
    } catch (err) {
      console.error('Failed to submit bid', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectWinner = async (supplierId: number) => {
    if (!activeRfq) return;
    if (!window.confirm('هل أنت متأكد من اعتماد هذا المورد وتحويل العرض تلقائياً لأمر شراء رسمي (PO)؟')) return;

    try {
      setSubmitting(true);
      const res = await purchaseRfqsApi.selectWinner(activeRfq.id, supplierId);
      alert(`تم بنجاح اعتماد العرض وتوليد أمر الشراء رقم: ${res.orderNumber}`);
      setIsMatrixOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to select winner', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف طلب عرض السعر؟')) return;
    try {
      await purchaseRfqsApi.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete RFQ', err);
    }
  };

  const filteredRfqs = rfqs.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.rfq_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'مسودة أولية', bg: '#f1f5f9', color: '#475569' };
      case 'sent':
        return { label: 'تم الإرسال للموردين', bg: '#e0e7ff', color: '#170e5e' };
      case 'bids_received':
        return { label: 'تم استلام عروض أسعار', bg: '#fef3c7', color: '#92400e' };
      case 'converted_to_po':
        return { label: 'معتمد ومحول لأمر شراء', bg: '#dcfce7', color: '#166534' };
      case 'cancelled':
        return { label: 'ملغي', bg: '#fee2e2', color: '#991b1b' };
      default:
        return { label: status, bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div className="page-stack page-shell purchase-rfqs-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader
          title="طلبات عروض أسعار الموردين (Vendor RFQs)"
          description="دورة استدراج عروض الأسعار من الموردين، المفاضلة التلقائية، واعتماد العرض الفائز بنقرة واحدة لأمر شراء (PO)"
          badge={<span className="nav-pill">المشتريات والتوريد</span>}
          actions={
            <Button
              variant="primary"
              onClick={openCreateModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#170e5e',
                borderColor: '#170e5e',
                fontWeight: 700,
              }}
            >
              <PlusIcon size={16} />
              طلب عرض سعر جديد
            </Button>
          }
        />

      {/* Filter and stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="بحث بالرقم أو العنوان..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                paddingInlineStart: '36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: 'var(--font-body)',
              }}
            />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <AppIcons.Search size={16} />
            </span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: 'var(--font-table-head)',
              fontWeight: 600,
              color: '#334155',
            }}
          >
            <option value="all">كافة الحالات</option>
            <option value="draft">مسودة</option>
            <option value="bids_received">تم استلام عروض</option>
            <option value="converted_to_po">تم التحويل لأمر شراء (PO)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: 'var(--font-table-head)', color: '#64748b' }}>
          <span>إجمالي الطلبات: <strong>{rfqs.length}</strong></span>
        </div>
      </div>

      {/* RFQ List Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          جاري تحميل طلبات عروض الأسعار...
        </div>
      ) : filteredRfqs.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#170e5e', marginBottom: '16px' }}>
            <AppIcons.FileText size={32} />
          </div>
          <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            لا توجد طلبات عروض أسعار مسجلة
          </h3>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '480px', margin: '0 auto 20px' }}>
            أنشئ طلب تسعير للموردين لمقارنة أسعار البضائع والمفاضلة بين أفضل عروض الشراء قبل إصدار أمر الشراء الرسمي.
          </p>
          <button
            onClick={openCreateModal}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + إنشاء أول طلب تسعير (RFQ)
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>رقم الطلب</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>العنوان / الغرض</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>عدد الأصناف</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>العروض المستلمة</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الحالة</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المورد الفائز</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredRfqs.map((rfq) => {
                const badge = getStatusBadge(rfq.status);
                return (
                  <tr key={rfq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e', fontFamily: 'monospace' }}>
                      {rfq.rfq_number}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', color: '#0f172a', fontWeight: 600 }}>
                      {rfq.title}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', color: '#334155' }}>
                      {rfq.items_count || 0} صنف
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', color: '#334155' }}>
                      <span style={{ fontWeight: 700, color: (rfq.suppliers_count || 0) > 0 ? '#166534' : '#64748b' }}>
                        {rfq.suppliers_count || 0} مورد
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 'var(--font-badge)',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', color: '#0f172a' }}>
                      {rfq.winning_supplier_name ? (
                        <span style={{ fontWeight: 600, color: '#166534' }}>
                          ✓ {rfq.winning_supplier_name}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => openComparisonMatrix(rfq.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#eef2ff',
                            border: '1px solid #c7d2fe',
                            color: '#170e5e',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 'var(--font-table-head)',
                          }}
                        >
                          <AppIcons.Eye size={14} /> مصفوفة المفاضلة
                        </button>

                        <button
                          onClick={() => handleDelete(rfq.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#fff1f2',
                            border: '1px solid #fecdd3',
                            color: '#e11d48',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 'var(--font-table-head)',
                          }}
                        >
                          <AppIcons.Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Comparison Matrix Modal */}
      {isMatrixOpen && activeRfq && (
        <StandardDialog
          isOpen={isMatrixOpen}
          onClose={() => setIsMatrixOpen(false)}
          title={`مصفوفة مقارنة ومفاضلة عروض الأسعار: ${activeRfq.rfq_number}`}
          maxWidth="980px"
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {activeRfq.title}
                </h4>
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                  عدد البنود المطلوبة: {activeRfq.items?.length || 0} | العروض المستلمة: {activeRfq.comparison_matrix?.length || 0} مورد
                </span>
              </div>

              {activeRfq.status !== 'converted_to_po' && (
                <button
                  type="button"
                  onClick={openAddBidModal}
                  style={{
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 'var(--font-table-head)',
                  }}
                >
                  + تسجيل عرض مورد جديد
                </button>
              )}
            </div>

            {(!activeRfq.comparison_matrix || activeRfq.comparison_matrix.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: 'var(--font-body)', color: '#64748b', marginBottom: '12px' }}>
                  لم يتم تسجيل أي عروض أسعار من الموردين لهذا الطلب حتى الآن.
                </p>
                <button
                  onClick={openAddBidModal}
                  style={{
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + إدخال أول عرض سعر
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#334155' }}>المورد</th>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#334155' }}>مدة التوريد</th>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#334155' }}>شروط السداد</th>
                      {activeRfq.items?.map((it) => (
                        <th key={it.id} style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#334155' }}>
                          {it.product_name} ({it.target_quantity} {it.unit_name})
                        </th>
                      ))}
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#0f172a', fontWeight: 700 }}>
                        الإجمالي المقدر
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#334155', textAlign: 'center' }}>
                        القرار
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Find lowest total quote */}
                    {(() => {
                      const minTotal = Math.min(...activeRfq.comparison_matrix.map((c) => c.total_quote));
                      return activeRfq.comparison_matrix.map((bid) => {
                        const isLowest = bid.total_quote === minTotal && activeRfq.comparison_matrix!.length > 1;
                        return (
                          <tr
                            key={bid.supplier_id}
                            style={{
                              borderBottom: '1px solid #e2e8f0',
                              backgroundColor: bid.is_winner ? '#f0fdf4' : isLowest ? '#f8fafc' : '#ffffff',
                            }}
                          >
                            <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                              {bid.supplier_name}
                              {bid.is_winner && (
                                <span style={{ display: 'block', fontSize: '10px', color: '#166534', fontWeight: 800 }}>
                                  ✓ تم التعاقد معه
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', color: '#475569' }}>
                              {bid.delivery_lead_days > 0 ? `${bid.delivery_lead_days} أيام` : 'فوري'}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', color: '#475569' }}>
                              {bid.payment_terms || 'نقدي'}
                            </td>
                            {activeRfq.items?.map((it) => {
                              const itemQuote = bid.item_quotes[Number(it.id)];
                              return (
                                <td key={it.id} style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#0f172a' }}>
                                  {itemQuote ? `${itemQuote.quoted_unit_cost} ج.م` : '-'}
                                </td>
                              );
                            })}
                            <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 800, color: isLowest ? '#166534' : '#0f172a' }}>
                              {bid.total_quote.toLocaleString()} ج.م
                              {isLowest && (
                                <span style={{ display: 'block', fontSize: '10px', color: '#166534', fontWeight: 600 }}>
                                  أفضل سعر إجمالي
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              {activeRfq.status !== 'converted_to_po' ? (
                                <button
                                  type="button"
                                  onClick={() => handleSelectWinner(bid.supplier_id)}
                                  disabled={submitting}
                                  style={{
                                    backgroundColor: isLowest ? '#166534' : '#170e5e',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: 'var(--font-table-head)',
                                  }}
                                >
                                  اعتماد وتوليد PO
                                </button>
                              ) : bid.is_winner ? (
                                <span style={{ color: '#166534', fontWeight: 700, fontSize: 'var(--font-table-head)' }}>
                                  العرض المعتمد
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: 'var(--font-table-head)' }}>لم يُعتمد</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setIsMatrixOpen(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Add Supplier Bid Modal */}
      {isAddBidOpen && activeRfq && (
        <StandardDialog
          isOpen={isAddBidOpen}
          onClose={() => setIsAddBidOpen(false)}
          title={`تسجيل عرض مورد جديد: ${activeRfq.rfq_number}`}
          maxWidth="640px"
        >
          <form onSubmit={handleSaveBid}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  اسم المورد أو الشركة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة النيل للتوريدات"
                  value={bidForm.supplier_name}
                  onChange={(e) => setBidForm({ ...bidForm, supplier_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  هاتف المورد
                </label>
                <input
                  type="text"
                  placeholder="010..."
                  value={bidForm.supplier_phone || ''}
                  onChange={(e) => setBidForm({ ...bidForm, supplier_phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  مدة التوريد والتسليم (بالأيام)
                </label>
                <input
                  type="number"
                  min="0"
                  value={bidForm.delivery_lead_days}
                  onChange={(e) => setBidForm({ ...bidForm, delivery_lead_days: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  شروط السداد والدفع
                </label>
                <input
                  type="text"
                  placeholder="مثال: 50% مقدم و 50% عند الاستلام"
                  value={bidForm.payment_terms || ''}
                  onChange={(e) => setBidForm({ ...bidForm, payment_terms: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
                />
              </div>
            </div>

            {/* Quoted Prices per Item */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                الأسعار المعروضة لكل صنف
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeRfq.items?.map((it, idx) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>{it.product_name}</div>
                      <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>الكمية المطلوبة: {it.target_quantity} {it.unit_name}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#475569', display: 'block' }}>سعر الوحدة المعروض</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        required
                        placeholder="ج.م"
                        value={bidForm.item_bids[idx]?.quoted_unit_cost || ''}
                        onChange={(e) => {
                          const cost = Number(e.target.value);
                          setBidForm((prev) => {
                            const newBids = [...prev.item_bids];
                            newBids[idx] = { ...newBids[idx], quoted_unit_cost: cost };
                            return { ...prev, item_bids: newBids };
                          });
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#475569', display: 'block' }}>نسبة الضريبة %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bidForm.item_bids[idx]?.tax_rate || 0}
                        onChange={(e) => {
                          const tax = Number(e.target.value);
                          setBidForm((prev) => {
                            const newBids = [...prev.item_bids];
                            newBids[idx] = { ...newBids[idx], tax_rate: tax };
                            return { ...prev, item_bids: newBids };
                          });
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsAddBidOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ عرض السعر'}
              </button>
            </div>
          </form>
        </StandardDialog>
      )}

      {/* Create New RFQ Modal */}
      {isCreateOpen && (
        <StandardDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="إنشاء طلب عرض سعر جديد (New Vendor RFQ)"
          maxWidth="700px"
        >
          <form onSubmit={handleCreateRfq}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                عنوان الطلب / الغرض *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: توريد مواد غذائية للربع الثالث 2026"
                value={newRfq.title}
                onChange={(e) => setNewRfq({ ...newRfq, title: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  الموعد النهائي لاستلام العروض
                </label>
                <input
                  type="date"
                  value={newRfq.deadline_date || ''}
                  onChange={(e) => setNewRfq({ ...newRfq, deadline_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  تاريخ التوريد المتوقع المطلوب
                </label>
                <input
                  type="date"
                  value={newRfq.expected_delivery_date || ''}
                  onChange={(e) => setNewRfq({ ...newRfq, expected_delivery_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
                />
              </div>
            </div>

            {/* Items row */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                الأصناف والكميات المطلوبة للتسعير
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#475569', display: 'block', marginBottom: '2px' }}>اسم الصنف</label>
                  <input
                    type="text"
                    placeholder="مثال: زيت ذرة عافية 1 لتر"
                    value={newItem.product_name}
                    onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#475569', display: 'block', marginBottom: '2px' }}>الكمية المطلوبة</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.target_quantity}
                    onChange={(e) => setNewItem({ ...newItem, target_quantity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#475569', display: 'block', marginBottom: '2px' }}>الوحدة</label>
                  <input
                    type="text"
                    value={newItem.unit_name}
                    onChange={(e) => setNewItem({ ...newItem, unit_name: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={addItemToRfq}
                  style={{
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + إضافة
                </button>
              </div>

              {/* Items List */}
              {newRfq.items.length > 0 && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '6px 10px', fontSize: 'var(--font-micro)', color: '#475569' }}>الصنف</th>
                        <th style={{ padding: '6px 10px', fontSize: 'var(--font-micro)', color: '#475569' }}>الكمية</th>
                        <th style={{ padding: '6px 10px', fontSize: 'var(--font-micro)', color: '#475569' }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newRfq.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontSize: 'var(--font-table-head)' }}>{it.product_name}</td>
                          <td style={{ padding: '6px 10px', fontSize: 'var(--font-table-head)' }}>{it.target_quantity} {it.unit_name}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <button
                              type="button"
                              onClick={() => setNewRfq({ ...newRfq, items: newRfq.items.filter((_, i) => i !== idx) })}
                              style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer' }}
                            >
                              <AppIcons.Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                {submitting ? 'جاري الحفظ...' : 'إنشاء طلب عرض السعر'}
              </button>
            </div>
          </form>
        </StandardDialog>
      )}
      </main>
    </div>
  );
};
