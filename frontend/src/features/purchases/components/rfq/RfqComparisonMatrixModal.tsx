import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { PlusIcon } from '@/shared/components/icons/AppIcons';
import type { PurchaseRfq } from '../../api/purchase-rfqs.api';

interface RfqComparisonMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRfq: PurchaseRfq | null;
  onOpenAddBid: () => void;
  onSelectWinner: (supplierId: number) => void;
  submitting: boolean;
}

export function RfqComparisonMatrixModal({
  isOpen,
  onClose,
  activeRfq,
  onOpenAddBid,
  onSelectWinner,
  submitting,
}: RfqComparisonMatrixModalProps) {
  if (!isOpen || !activeRfq) return null;

  const isConverted = activeRfq.status === 'converted_to_po';
  const bids: any[] = activeRfq.bids || [];

  // Find lowest total bid for recommendation highlight
  const lowestTotalBid = bids.reduce(
    (min: any, b: any) => (b.total_amount < min.total_amount ? b : min),
    bids[0] || null
  );

  return (
    <StandardDialog
      isOpen={true}
      onClose={onClose}
      title={`مصفوفة المقارنة والمفاضلة: ${activeRfq.title} (${activeRfq.rfq_number})`}
      subtitle="المقارنة التفصيلية لأسعار وشروط الموردين واختيار العرض الفائز"
      width="min(1200px, 95vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header summary and add bid button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <span style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
              عدد الموردين المتنافسين: <strong>{activeRfq.bids?.length || 0}</strong> | الأصناف: <strong>{activeRfq.items?.length || 0}</strong>
            </span>
          </div>

          {!isConverted && (
            <Button
              variant="primary"
              onClick={onOpenAddBid}
              style={{
                backgroundColor: '#170e5e',
                borderColor: '#170e5e',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-table-head)',
              }}
            >
              <PlusIcon size={14} />
              تسجيل عرض سعر مورد
            </Button>
          )}
        </div>

        {/* Matrix comparison table */}
        {(bids.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            لم يتم تسجيل أي عروض أسعار من الموردين لهذا الطلب حتى الآن.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 'var(--font-body)' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', borderInlineEnd: '1px solid #e2e8f0' }}>الصنف / الكمية المطلوبة</th>
                  {bids.map((bid: any) => {
                    const isWinner = isConverted && bid.supplier_id === activeRfq.awarded_supplier_id;
                    const isBestPrice = !isConverted && lowestTotalBid && bid.id === lowestTotalBid.id;

                    return (
                      <th
                        key={bid.id}
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          borderInlineEnd: '1px solid #e2e8f0',
                          backgroundColor: isWinner ? '#f0fdf4' : isBestPrice ? '#eff6ff' : '#f8fafc',
                          minWidth: '180px',
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{bid.supplier_name}</div>
                        <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px' }}>
                          مدة التوريد: {bid.delivery_lead_days} أيام | {bid.payment_terms}
                        </div>
                        {isWinner && (
                          <div style={{ color: '#166534', fontWeight: 700, fontSize: 'var(--font-micro)', marginTop: '4px' }}>
                            العرض الفائز المعتمد
                          </div>
                        )}
                        {isBestPrice && (
                          <div style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 'var(--font-micro)', marginTop: '4px' }}>
                            أفضل سعر إجمالي
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activeRfq.items?.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, backgroundColor: '#fdfdfd', borderInlineEnd: '1px solid #e2e8f0' }}>
                      <div>{item.product_name}</div>
                      <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                        الكمية: {item.target_quantity} {item.unit_name}
                      </div>
                    </td>

                    {bids.map((bid: any) => {
                      const itemBid = bid.item_bids?.find((ib: any) => ib.rfq_item_id === item.id);
                      return (
                        <td
                          key={bid.id}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'center',
                            borderInlineEnd: '1px solid #e2e8f0',
                            fontFamily: 'monospace',
                          }}
                        >
                          {itemBid ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {itemBid.quoted_unit_cost.toLocaleString()} ج.م
                              </div>
                              <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                                الإجمالي: {(itemBid.quoted_unit_cost * item.target_quantity).toLocaleString()} ج.م
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>غير مسعر</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Total Row */}
                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                  <td style={{ padding: '14px 12px', borderInlineEnd: '1px solid #e2e8f0' }}>
                    إجمالي قيمة العرض (شامل الضريبة)
                  </td>
                  {bids.map((bid: any) => (
                    <td
                      key={bid.id}
                      style={{
                        padding: '14px 12px',
                        textAlign: 'center',
                        borderInlineEnd: '1px solid #e2e8f0',
                        fontSize: '15px',
                        color: '#170e5e',
                        fontFamily: 'monospace',
                      }}
                    >
                      {bid.total_amount.toLocaleString()} ج.م
                    </td>
                  ))}
                </tr>

                {/* Award Action Row */}
                {!isConverted && (
                  <tr style={{ backgroundColor: '#ffffff' }}>
                    <td style={{ padding: '14px 12px', borderInlineEnd: '1px solid #e2e8f0', fontWeight: 700 }}>
                      قرار الترسية والتحويل لأمر شراء
                    </td>
                    {bids.map((bid: any) => (
                      <td key={bid.id} style={{ padding: '14px 12px', textAlign: 'center', borderInlineEnd: '1px solid #e2e8f0' }}>
                        <Button
                          variant="primary"
                          disabled={submitting}
                          onClick={() => onSelectWinner(bid.supplier_id)}
                          style={{
                            backgroundColor: '#059669',
                            borderColor: '#059669',
                            fontSize: 'var(--font-table-head)',
                            fontWeight: 700,
                            padding: '6px 12px',
                          }}
                        >
                          اعتماد العرض وتوليد PO
                        </Button>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </StandardDialog>
  );
}
