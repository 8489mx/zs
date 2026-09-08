import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  ClockIcon,
  PackageIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';
import {
  ReorderItemSuggestion,
  SupplierReorderGroup,
} from '@/features/purchases/api/purchases.api';

interface SmartReorderSupplierGroupCardProps {
  group: SupplierReorderGroup;
  isItemSelected: (item: ReorderItemSuggestion) => boolean;
  getEffectiveQty: (item: ReorderItemSuggestion) => number;
  handleToggleSupplier: (group: SupplierReorderGroup, currentAllSelected: boolean) => void;
  handleToggleItem: (productId: number, currentSelected: boolean) => void;
  handleQuantityChange: (productId: number, val: string) => void;
  handleOpenSupplierConfirm: (group: SupplierReorderGroup) => void;
  isGeneratePending: boolean;
}

export function SmartReorderSupplierGroupCard({
  group,
  isItemSelected,
  getEffectiveQty,
  handleToggleSupplier,
  handleToggleItem,
  handleQuantityChange,
  handleOpenSupplierConfirm,
  isGeneratePending,
}: SmartReorderSupplierGroupCardProps) {
  const allSupplierItemsSelected = group.items.every((item) => isItemSelected(item));
  const selectedItemsInGroup = group.items.filter((item) => isItemSelected(item));
  const supplierSelectedTotalCost = selectedItemsInGroup.reduce(
    (sum, item) => sum + getEffectiveQty(item) * item.costPrice,
    0
  );

  return (
    <section
      className="workspace-panel"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
      }}
    >
      <div
        style={{
          background: '#f8fafc',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <input
            type="checkbox"
            checked={allSupplierItemsSelected}
            onChange={() => handleToggleSupplier(group, allSupplierItemsSelected)}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#170e5e' }}
            title="تحديد أو إلغاء تحديد كافة أصناف هذا المورد"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                {group.supplierName}
              </h4>
              {group.supplierPhone ? (
                <span style={{ fontSize: '12px', color: '#64748b' }}>({group.supplierPhone})</span>
              ) : null}
              {!group.supplierId ? (
                <span
                  style={{
                    fontSize: '11px',
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  يحتاج تعيين مورد في شاشة الأصناف
                </span>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '4px', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ClockIcon size={13} color="#64748b" />
                <span>فترة التوريد: <strong>{group.leadTimeDays} أيام</strong></span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <PackageIcon size={13} color="#64748b" />
                <span>الأصناف المطلوبة: <strong>{group.itemsCount} صنف</strong></span>
              </span>
              {group.criticalCount > 0 ? (
                <span style={{ color: '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangleIcon size={13} color="#dc2626" />
                  <span>{group.criticalCount} أصناف حرجة/نافدة</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>التكلفة التقديرية للمحدد:</div>
            <strong style={{ fontSize: '16px', color: '#170e5e' }}>{formatCurrency(supplierSelectedTotalCost)}</strong>
          </div>
          {group.supplierId ? (
            <Button
              variant="secondary"
              style={{
                borderColor: '#170e5e',
                color: '#170e5e',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 14px',
              }}
              disabled={selectedItemsInGroup.length === 0 || isGeneratePending}
              onClick={() => handleOpenSupplierConfirm(group)}
            >
              إنشاء مسودة أمر شراء لهذا المورد ({selectedItemsInGroup.length})
            </Button>
          ) : null}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
              <th style={{ padding: '12px 16px', width: '40px' }}>اختيار</th>
              <th style={{ padding: '12px 16px' }}>الصنف</th>
              <th style={{ padding: '12px 16px' }}>المخزون الحالي</th>
              <th style={{ padding: '12px 16px' }}>معدل الاستهلاك (يومياً)</th>
              <th style={{ padding: '12px 16px' }}>الأيام المتبقية</th>
              <th style={{ padding: '12px 16px' }}>حد الطلب (ROP)</th>
              <th style={{ padding: '12px 16px' }}>الحالة</th>
              <th style={{ padding: '12px 16px', minWidth: '130px' }}>الكمية المقترحة</th>
              <th style={{ padding: '12px 16px' }}>سعر الشراء</th>
              <th style={{ padding: '12px 16px' }}>الإجمالي التقديري</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((item) => {
              const isSelected = isItemSelected(item);
              const qty = getEffectiveQty(item);
              const itemTotal = qty * item.costPrice;

              let urgencyBadge = { label: 'آمن', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
              if (item.urgency === 'out_of_stock') {
                urgencyBadge = { label: 'نفد المخزون', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
              } else if (item.urgency === 'critical') {
                urgencyBadge = { label: 'حرج جداً', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
              } else if (item.urgency === 'warning') {
                urgencyBadge = { label: 'يلزم الطلب', bg: '#fefce8', color: '#a16207', border: '#fef08a' };
              } else if (item.urgency === 'overstocked') {
                urgencyBadge = { label: 'فائض', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
              }

              return (
                <tr
                  key={item.productId}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: isSelected ? '#ffffff' : '#fafafa',
                    opacity: isSelected ? 1 : 0.6,
                    transition: 'background-color 0.15s',
                  }}
                >
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleItem(item.productId, isSelected)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#170e5e' }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {item.barcode ? `باركود: ${item.barcode}` : `كود #${item.productId}`}
                      {item.categoryName ? ` · ${item.categoryName}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: item.currentStock <= 0 ? '#dc2626' : item.currentStock <= item.minStock ? '#d97706' : '#1e293b',
                      }}
                    >
                      {item.currentStock}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div><strong>{item.dailyRunRate}</strong> <span style={{ fontSize: '11px', color: '#64748b' }}>وحدة/يوم</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>مبيعات الفترة: {item.qtySoldPeriod}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: item.daysRemaining <= item.leadTimeDays ? '#dc2626' : '#475569',
                      }}
                    >
                      {item.daysRemaining === 999 ? '—' : `${item.daysRemaining} يوم`}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    <div>نقطة الطلب: <strong>{item.reorderPoint}</strong></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>الحد الأدنى: {item.minStock}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: urgencyBadge.bg,
                        color: urgencyBadge.color,
                        border: `1px solid ${urgencyBadge.border}`,
                      }}
                    >
                      {urgencyBadge.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                        style={{
                          width: '80px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#1e293b',
                          backgroundColor: '#ffffff',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>وحدة</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {formatCurrency(item.costPrice)}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#170e5e' }}>
                    {formatCurrency(itemTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
