import React from 'react';
import { CheckIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import type { CustomerDisplayPayload } from '@/features/pos/types/pos-customer-display.types';

interface CfdCompletedViewProps {
  payload: CustomerDisplayPayload;
}

export const CfdCompletedView: React.FC<CfdCompletedViewProps> = ({ payload }) => {
  return (
    <div className="cfd-completed-view">
      <div className="cfd-completed-card">
        <div className="cfd-success-icon-wrap" aria-hidden="true">
          <CheckIcon size={40} color="#16a34a" strokeWidth={2.5} />
        </div>

        <div className="cfd-completed-title">تمت عملية الشراء بنجاح!</div>
        <div className="cfd-completed-subtitle">
          شكراً لتسوقكم معنا في {payload.storeName}. نسعد دائماً بخدمتكم ونتطلع لرؤيتكم قريباً!
        </div>

        {payload.completedSale && (
          <div className="cfd-sale-meta-grid">
            <div className="cfd-sale-meta-box">
              <div className="cfd-sale-meta-label">رقم الفاتورة</div>
              <div className="cfd-sale-meta-val">#{payload.completedSale.docNo}</div>
            </div>

            <div className="cfd-sale-meta-box">
              <div className="cfd-sale-meta-label">المبلغ الإجمالي</div>
              <div className="cfd-sale-meta-val">{formatCurrency(payload.completedSale.total)}</div>
            </div>

            <div className="cfd-sale-meta-box">
              <div className="cfd-sale-meta-label">المبلغ المدفوع</div>
              <div className="cfd-sale-meta-val">{formatCurrency(payload.completedSale.paidAmount)}</div>
            </div>

            <div className="cfd-sale-meta-box">
              <div className="cfd-sale-meta-label">طريقة السداد</div>
              <div className="cfd-sale-meta-val" style={{ fontSize: '15px' }}>نقداً / إلكتروني</div>
            </div>

            {payload.completedSale.change > 0 && (
              <div className="cfd-sale-change-box">
                <div className="cfd-sale-meta-label" style={{ color: '#166534', fontSize: '14px' }}>
                  المتبقي المسترد للعميل
                </div>
                <div className="cfd-sale-meta-val">
                  {formatCurrency(payload.completedSale.change)}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '14px' }}>
          سيتم العودة للشاشة الرئيسية تلقائياً خلال ثوانٍ...
        </div>
      </div>
    </div>
  );
};
