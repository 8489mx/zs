import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { quotationsApi, QuotationItem } from '@/features/sales/api/quotations.api';
import { CreateQuotationModal } from '../components/quotations/CreateQuotationModal';
import { QuotationsTable } from '../components/quotations/QuotationsTable';
import { printQuotation } from '../components/quotations/printQuotation';

export function QuotationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('عرض السعر ساري لمدة 15 يوماً من تاريخ الإصدار.');
  const [items, setItems] = useState<QuotationItem[]>([
    { product_name: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 },
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', statusFilter, search],
    queryFn: () => quotationsApi.getQuotations({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => quotationsApi.createQuotation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
  });

  const convertMutation = useMutation({
    mutationFn: quotationsApi.convertToSale,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      alert(`تم تحويل عرض السعر بنجاح إلى فاتورة بيع رقم #${(res as any).saleId || (res as any).sale_id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => quotationsApi.deleteQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setValidUntil('');
    setNotes('');
    setItems([{ product_name: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }]);
  };

  const addItem = () => {
    setItems((prev) => [...prev, { product_name: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuotationItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      const qty = Number(next[index].quantity) || 0;
      const price = Number(next[index].unit_price) || 0;
      const taxRate = Number(next[index].tax_rate) || 0;
      const lineSubtotal = qty * price;
      const lineTax = lineSubtotal * (taxRate / 100);
      next[index].tax_amount = lineTax;
      next[index].total = lineSubtotal + lineTax;
      return next;
    });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const lineSubtotal = qty * price;
      const lineTax = lineSubtotal * ((Number(item.tax_rate) || 0) / 100);
      subtotal += lineSubtotal;
      taxTotal += lineTax;
    });
    return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
  };

  const handleSubmitQuotation = () => {
    if (!customerName.trim()) return;
    const totals = calculateTotals();
    createMutation.mutate({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      valid_until: validUntil || undefined,
      notes,
      terms_conditions: termsConditions,
      subtotal: totals.subtotal,
      tax_amount: totals.taxTotal,
      total_amount: totals.grandTotal,
      items,
    });
  };

  const getStatusBadge = (status: string, saleId?: number) => {
    switch (status) {
      case 'converted':
        return (
          <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
            تم التحويل لفاتورة #{saleId}
          </span>
        );
      case 'accepted':
        return (
          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
            مقبول
          </span>
        );
      case 'rejected':
        return (
          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
            مرفوض
          </span>
        );
      case 'sent':
        return (
          <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
            مرسل للعميل
          </span>
        );
      default:
        return (
          <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
            مسودة
          </span>
        );
    }
  };

  return (
    <div className="page-stack page-shell quotations-workspace" dir="rtl">
      <div className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title="عروض الأسعار (Quotations)"
          description="إنشاء وإدارة عروض الأسعار الرسمية للعملاء، طباعتها أو تحويلها مباشرة إلى فواتير مبيعات نهائية."
          badge={<span className="nav-pill">{data?.quotations?.length || 0} عرض سعر</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
              >
                + إنشاء عرض سعر جديد
              </Button>
            </div>
          }
        />

        {/* Quotations Content Section */}
        <section className="document-prototype-section">
          <div className="section-header-compact-row" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { key: 'all', label: 'الكل' },
                { key: 'draft', label: 'مسودات' },
                { key: 'sent', label: 'مرسلة' },
                { key: 'accepted', label: 'مقبولة' },
                { key: 'converted', label: 'محولة لفواتير' },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  variant={statusFilter === tab.key ? 'primary' : 'secondary'}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <input
              type="text"
              placeholder="بحث برقم العرض أو اسم العميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                minWidth: '260px',
                outline: 'none',
              }}
            />
          </div>

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>جاري تحميل عروض الأسعار...</div>
          ) : !data?.quotations || data.quotations.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              لا توجد عروض أسعار مسجلة حتى الآن. انقر على "+ إنشاء عرض سعر جديد" للبدء.
            </div>
          ) : (
            <QuotationsTable
              quotations={data.quotations}
              getStatusBadge={getStatusBadge}
              onPrint={printQuotation}
              onConvert={(id) => convertMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isConvertPending={convertMutation.isPending}
            />
          )}
        </section>

        {/* Create Quotation Modal */}
        <CreateQuotationModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          customerAddress={customerAddress}
          setCustomerAddress={setCustomerAddress}
          validUntil={validUntil}
          setValidUntil={setValidUntil}
          notes={notes}
          setNotes={setNotes}
          termsConditions={termsConditions}
          setTermsConditions={setTermsConditions}
          items={items}
          addItem={addItem}
          updateItem={updateItem}
          removeItem={removeItem}
          calculateTotals={calculateTotals}
          onSubmit={handleSubmitQuotation}
          isPending={createMutation.isPending}
        />
      </div>
    </div>
  );
}

export default QuotationsPage;
