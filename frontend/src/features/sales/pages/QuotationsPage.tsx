import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationsApi, QuotationRecord, CreateQuotationPayload, QuotationItem } from '../api/quotations.api';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { useAuthStore } from '@/stores/auth-store';
import { Trash2Icon } from '@/shared/components/icons/AppIcons';

export function QuotationsPage() {
  const queryClient = useQueryClient();
  const tenant = useAuthStore((state) => state.tenant);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state for creating quotation
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('الأسعار سارية لمدة 15 يوماً من تاريخ هذا العرض.\nطريقة الدفع: نقداً عند الاستلام أو حسب الاتفاق.');
  const [items, setItems] = useState<QuotationItem[]>([
    { productId: 1, productName: '', unitName: 'قطعة', quantity: 1, unitPrice: 0, discount: 0, total: 0 },
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations-list', statusFilter, search],
    queryFn: () => quotationsApi.list({ status: statusFilter !== 'all' ? statusFilter : undefined, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateQuotationPayload) => quotationsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'فشل حفظ عرض السعر');
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => quotationsApi.convertToSale(id),
    onSuccess: (res) => {
      alert(`تم تحويل عرض السعر إلى فاتورة بيع رقم #${res.saleId} بنجاح!`);
      queryClient.invalidateQueries({ queryKey: ['quotations-list'] });
    },
    onError: (err: any) => {
      alert(err.message || 'فشل تحويل عرض السعر لفاتورة');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => quotationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list'] });
    },
    onError: (err: any) => {
      alert(err.message || 'فشل حذف عرض السعر');
    },
  });

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setValidUntil('');
    setNotes('');
    setItems([{ productId: 1, productName: '', unitName: 'قطعة', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
    const price = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
    const discount = Number(field === 'discount' ? value : item.discount) || 0;
    item.total = Math.max(0, qty * price - discount);
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { productId: items.length + 1, productName: '', unitName: 'قطعة', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);
  const totalDiscount = items.reduce((sum, it) => sum + (Number(it.discount || 0)), 0);
  const totalAmount = Math.max(0, subtotal - totalDiscount);

  const handleSubmitQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('يرجى كتابة اسم العميل');
      return;
    }
    const validItems = items.filter((it) => it.productName.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل مع اسم وكمية صحيحة');
      return;
    }

    createMutation.mutate({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      validUntil: validUntil || undefined,
      notes: notes.trim() || undefined,
      termsConditions: termsConditions.trim() || undefined,
      subtotal,
      discountAmount: totalDiscount,
      totalAmount,
      items: validItems,
    });
  };

  const handlePrintQuotation = async (quotation: QuotationRecord) => {
    // If items are not loaded, fetch details
    let fullQuotation = quotation;
    if (!quotation.items) {
      try {
        fullQuotation = await quotationsApi.getById(quotation.id);
      } catch {
        // fallback
      }
    }

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;

    const businessName = tenant?.businessName || 'Z-Systems';

    printWin.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>عرض سعر - ${fullQuotation.quotation_number}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; margin: 0; background: #fff; }
            .quotation-card { border: 2px solid #0f172a; border-radius: 12px; padding: 25px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .title-box h1 { margin: 0 0 5px 0; font-size: 24px; color: #0f172a; }
            .title-box p { margin: 0; color: #64748b; font-size: 13px; }
            .meta-box { text-align: left; }
            .meta-item { font-size: 13px; margin-bottom: 4px; }
            .meta-item strong { color: #0f172a; }
            .customer-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 15px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 9px 12px; text-align: center; font-size: 13px; }
            th { background: #f1f5f9; font-weight: 800; color: #1e293b; }
            .totals-box { width: 280px; margin-right: auto; margin-bottom: 20px; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .grand-total { font-size: 17px; font-weight: 900; color: #1e1b4b; border-bottom: 2px solid #1e1b4b; }
            .terms { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; font-size: 12px; color: #92400e; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; font-size: 11.5px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="quotation-card">
            <div class="header">
              <div class="title-box">
                <h1>${businessName}</h1>
                <p>عرض سعر رسمي / Price Quotation</p>
              </div>
              <div class="meta-box">
                <div class="meta-item">رقم العرض: <strong>#${fullQuotation.quotation_number}</strong></div>
                <div class="meta-item">التاريخ: <strong>${new Date(fullQuotation.created_at).toLocaleDateString('ar-EG')}</strong></div>
                ${fullQuotation.valid_until ? `<div class="meta-item">ساري حتى: <strong>${new Date(fullQuotation.valid_until).toLocaleDateString('ar-EG')}</strong></div>` : ''}
              </div>
            </div>

            <div class="customer-section">
              <div style="font-weight: 800; margin-bottom: 4px; font-size: 14px;">بيانات العميل:</div>
              <div style="font-size: 13px;"><strong>الاسم:</strong> ${fullQuotation.customer_name} ${fullQuotation.customer_phone ? `| <strong>الهاتف:</strong> ${fullQuotation.customer_phone}` : ''}</div>
              ${fullQuotation.customer_address ? `<div style="font-size: 13px; margin-top: 3px;"><strong>العنوان:</strong> ${fullQuotation.customer_address}</div>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th style="text-align: right;">الصنف / البيان</th>
                  <th style="width: 80px;">الوحدة</th>
                  <th style="width: 70px;">الكمية</th>
                  <th style="width: 100px;">سعر الوحدة</th>
                  <th style="width: 90px;">الخصم</th>
                  <th style="width: 110px;">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${(fullQuotation.items || []).map((it, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td style="text-align: right; font-weight: 700;">${it.productName || (it as any).product_name}</td>
                    <td>${it.unitName || (it as any).unit_name || '-'}</td>
                    <td>${Number(it.quantity)}</td>
                    <td>${Number(it.unitPrice || (it as any).unit_price).toLocaleString('ar-EG')}</td>
                    <td>${Number(it.discount || 0).toLocaleString('ar-EG')}</td>
                    <td style="font-weight: 800;">${Number(it.total).toLocaleString('ar-EG')} ج.م</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-box">
              <div class="totals-row"><span>المجموع الفرعي:</span> <span>${Number(fullQuotation.subtotal).toLocaleString('ar-EG')} ج.م</span></div>
              ${Number(fullQuotation.discount_amount) > 0 ? `<div class="totals-row"><span>إجمالي الخصم:</span> <span>-${Number(fullQuotation.discount_amount).toLocaleString('ar-EG')} ج.م</span></div>` : ''}
              <div class="totals-row grand-total"><span>الإجمالي النهائي:</span> <span>${Number(fullQuotation.total_amount).toLocaleString('ar-EG')} ج.م</span></div>
            </div>

            ${fullQuotation.terms_conditions ? `
              <div class="terms">
                <strong>الشروط والأحكام:</strong><br />
                ${fullQuotation.terms_conditions.replace(/\\n/g, '<br />')}
              </div>
            ` : ''}

            <div class="footer">
              تم إصدار هذا العرض بواسطة منظومة ${businessName} — شاكرين لثقتكم الكريمة
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const getStatusBadge = (status: string, saleId?: number | null) => {
    switch (status) {
      case 'draft':
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>مسودة</span>;
      case 'sent':
        return <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>مرسل للعميل</span>;
      case 'accepted':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>مقبول</span>;
      case 'rejected':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>مرفوض</span>;
      case 'converted':
        return (
          <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            فاتورة بيع #{saleId || ''}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const quotations = data?.quotations || [];
  const stats = [
    { key: 'total', label: 'إجمالي عروض الأسعار', value: `${quotations.length} عرض` },
    { key: 'sent', label: 'عروض مرسلة للعملاء', value: `${quotations.filter((q) => q.status === 'sent').length} عرض` },
    { key: 'converted', label: 'تم تحويلها لفواتير مبيعات', value: `${quotations.filter((q) => q.status === 'converted').length} فاتورة` },
    { key: 'amount', label: 'إجمالي مبالغ العروض', value: `${quotations.reduce((sum, q) => sum + Number(q.total_amount || 0), 0).toLocaleString('ar-EG')} ج.م` },
  ] as const;

  return (
    <div className="page-stack page-shell quotations-workspace" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title="عروض الأسعار والطلبيات (Quotations)"
          description="إنشاء عروض أسعار رسمية للعملاء، طباعتها ومشاركتها، وتحويلها إلى فواتير بيع بضغطة زر واحدة."
          badge={<span className="nav-pill">{quotations.length} عرض سعر</span>}
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

        <StatsGrid items={stats} />

        <section className="document-prototype-section">
          {/* Filter and Search Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم العرض أو اسم العميل أو الهاتف..."
              style={{ flex: 1, minWidth: '220px', padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
            />

            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'draft', label: 'مسودة' },
                { id: 'sent', label: 'مرسل' },
                { id: 'accepted', label: 'مقبول' },
                { id: 'converted', label: 'تم تحويله لفاتورة' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: statusFilter === f.id ? '#170e5e' : '#f1f5f9',
                    color: statusFilter === f.id ? '#ffffff' : '#475569',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quotations Table */}
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>جاري تحميل عروض الأسعار...</div>
          ) : !data?.quotations || data.quotations.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              لا توجد عروض أسعار مسجلة حتى الآن. انقر على "+ إنشاء عرض سعر جديد" للبدء.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>رقم العرض</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>العميل</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>الهاتف</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>الإجمالي</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>الحالة</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>التاريخ</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.quotations.map((q) => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#170e5e' }}>#{q.quotation_number}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{q.customer_name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{q.customer_phone || '-'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>
                      {Number(q.total_amount).toLocaleString('ar-EG')} ج.م
                    </td>
                    <td style={{ padding: '12px 16px' }}>{getStatusBadge(q.status, q.sale_id)}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                      {new Date(q.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Print Button */}
                        <button
                          type="button"
                          onClick={() => handlePrintQuotation(q)}
                          title="طباعة / تصدير PDF"
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#0f172a',
                          }}
                        >
                          طباعة
                        </button>

                        {/* Convert to Sale */}
                        {q.status !== 'converted' && (
                          <button
                            type="button"
                            disabled={convertMutation.isPending}
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من تحويل عرض السعر #${q.quotation_number} إلى فاتورة بيع نهائية؟`)) {
                                convertMutation.mutate(q.id);
                              }
                            }}
                            title="تحويل إلى فاتورة بيع"
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              color: '#1d4ed8',
                            }}
                          >
                            تحويل لفاتورة
                          </button>
                        )}

                        {/* Delete Button */}
                        {q.status !== 'converted' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('هل تريد حذف عرض السعر؟')) {
                                deleteMutation.mutate(q.id);
                              }
                            }}
                            title="حذف"
                            style={{
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Trash2Icon size={14} color="#e11d48" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </section>
      </main>

      {/* Create Quotation Modal */}
      {isCreateModalOpen && (
        <DialogShell
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          ariaLabel="إنشاء عرض سعر جديد"
          width="800px"
        >
          <form onSubmit={handleSubmitQuotation} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px' }} dir="rtl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                إنشاء عرض سعر جديد
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Customer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  اسم العميل *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: شركة الأمل للمقاولات"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  صالح حتى تاريخ
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Items Table Builder */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>الأصناف والبنود</span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + إضافة بند
                </button>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <tr>
                      <th style={{ padding: '8px 10px', width: '40%' }}>اسم الصنف</th>
                      <th style={{ padding: '8px 10px', width: '15%' }}>الوحدة</th>
                      <th style={{ padding: '8px 10px', width: '15%' }}>الكمية</th>
                      <th style={{ padding: '8px 10px', width: '15%' }}>سعر الوحدة</th>
                      <th style={{ padding: '8px 10px', width: '15%' }}>الإجمالي</th>
                      <th style={{ padding: '8px 10px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="text"
                            required
                            placeholder="وصف أو اسم المنتج..."
                            value={item.productName}
                            onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="text"
                            value={item.unitName || ''}
                            onChange={(e) => handleItemChange(idx, 'unitName', e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', fontWeight: 800 }}>
                          {item.total.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>
                الإجمالي الإجمالي: <span style={{ color: '#170e5e', fontSize: '16px' }}>{totalAmount.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                الشروط والأحكام وملاحظات العرض
              </label>
              <textarea
                rows={2}
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" disabled={createMutation.isPending} style={{ background: '#170e5e' }}>
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ عرض السعر'}
              </Button>
            </div>
          </form>
        </DialogShell>
      )}

    </div>
  );
}
