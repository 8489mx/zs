import { useState, useEffect, type FC } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { AppIcons, PlusIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';
import {
  purchaseRfqsApi,
  PurchaseRfq,
  CreateRfqPayload,
  SubmitSupplierBidPayload,
} from '../api/purchase-rfqs.api';
import { PurchaseRfqsTable } from '../components/rfq/PurchaseRfqsTable';
import { CreateRfqModal } from '../components/rfq/CreateRfqModal';
import { RfqComparisonMatrixModal } from '../components/rfq/RfqComparisonMatrixModal';
import { SubmitSupplierBidModal } from '../components/rfq/SubmitSupplierBidModal';

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
          product_id: Date.now(),
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
        <PurchaseRfqsTable
          rfqs={filteredRfqs}
          loading={loading}
          onOpenMatrix={openComparisonMatrix}
          onDelete={handleDelete}
        />
      </main>

      {/* Create RFQ Modal */}
      <CreateRfqModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        newRfq={newRfq}
        onRfqChange={setNewRfq}
        newItem={newItem}
        onNewItemChange={setNewItem}
        onAddItem={addItemToRfq}
        onRemoveItem={(index) => {
          setNewRfq((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
          }));
        }}
        onSubmit={handleCreateRfq}
        submitting={submitting}
      />

      {/* Comparison Matrix Modal */}
      <RfqComparisonMatrixModal
        isOpen={isMatrixOpen}
        onClose={() => setIsMatrixOpen(false)}
        activeRfq={activeRfq}
        onOpenAddBid={openAddBidModal}
        onSelectWinner={handleSelectWinner}
        submitting={submitting}
      />

      {/* Add Supplier Bid Modal */}
      <SubmitSupplierBidModal
        isOpen={isAddBidOpen}
        onClose={() => setIsAddBidOpen(false)}
        activeRfq={activeRfq}
        bidForm={bidForm}
        onBidFormChange={setBidForm}
        onSubmit={handleSaveBid}
        submitting={submitting}
      />
    </div>
  );
};
