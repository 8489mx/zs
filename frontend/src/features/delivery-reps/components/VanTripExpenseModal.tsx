import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import {
  CheckCircleIcon,
  CameraIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';
import { vanSalesApi } from '../api/van-sales.api';
import { toast } from '@/shared/components/system-alert';

interface VanTripExpenseModalProps {
  open: boolean;
  onClose: () => void;
  tripId: number;
  onSuccess: () => void;
}

export const VanTripExpenseModal: React.FC<VanTripExpenseModalProps> = ({
  open,
  onClose,
  tripId,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [expenseType, setExpenseType] = useState<string>('fuel');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [supervisorPin, setSupervisorPin] = useState<string>('');
  const [receiptPhoto, setReceiptPhoto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const parsedAmount = parseFloat(amount) || 0;
  const requiresPinByRule =
    (expenseType !== 'fuel' && expenseType !== 'toll') || parsedAmount > 250;

  const expenseTypes = [
    { value: 'fuel', label: 'وقود وبنزين' },
    { value: 'toll', label: 'كارتات وبوابات رسوم' },
    { value: 'maintenance', label: 'صيانة وإصلاح طارئ' },
    { value: 'food_allowance', label: 'بدل وجبة وإكراميات' },
    { value: 'other', label: 'مصروفات نثرية أخرى' },
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (description.trim().length < 3) {
      setError('يرجى تدوين البيان التفصيلي أو رقم الفاتورة/الإيصال (3 أحرف على الأقل)');
      return;
    }
    if (requiresPinByRule && !supervisorPin.trim()) {
      setError('هذا المصروف يتطلب إدخال الرمز السري للمشرف (Supervisor PIN) لاعتماد خصمه من العهدة النقدية');
      return;
    }

    setIsSubmitting(true);
    try {
      await vanSalesApi.recordTripExpense(tripId, {
        expenseType,
        amount: amt,
        description: description.trim(),
        receiptPhoto: receiptPhoto || undefined,
        supervisorOverridePin: supervisorPin.trim() || undefined,
      });
      toast.success('تم تسجيل مصروف الرحلة وخصمه من العهدة النقدية بنجاح');
      setAmount('');
      setDescription('');
      setSupervisorPin('');
      setReceiptPhoto('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل المصروف');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={t('delivery_reps.van_trip_expense_modal.s0', "تسجيل مصروف رحلة ميداني")}
      subtitle={t('delivery_reps.van_trip_expense_modal.s1', "يتم خصم المصروف تلقائياً من الكاش المطلوب توريده وترحيله محاسبياً")}
      badge={t('delivery_reps.van_trip_expense_modal.s2', "مصروفات الرحلة")}
      width="min(500px, 95vw)"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '10px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ minHeight: '38px', fontSize: '12.5px', padding: '0 16px' }}
          >
            {t('delivery_reps.van_trip_expense_modal.s3', "إلغاء")}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              minHeight: '38px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              padding: '0 20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircleIcon size={15} color="#ffffff" />
            <span>{isSubmitting ? t('delivery_reps.van_trip_expense_modal.s4', "جاري الحفظ...") : t('delivery_reps.van_trip_expense_modal.s5', "حفظ وخصم المصروف")}</span>
          </Button>
        </div>
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangleIcon size={16} color="#dc2626" />
            <span>{error}</span>
          </div>
        )}

        {/* Expense Category */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            {t('delivery_reps.van_trip_expense_modal.s6', "نوع المصروف:")}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {expenseTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setExpenseType(type.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: expenseType === type.value ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: expenseType === type.value ? '#eef2ff' : '#ffffff',
                  color: expenseType === type.value ? '#170e5e' : '#334155',
                  fontWeight: 600,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            {t('delivery_reps.van_trip_expense_modal.s7', "المبلغ المصروف (")}<CurrencySymbol />):
          </label>
          <input
            type="number"
            step="0.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '16px',
              fontWeight: 800,
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Description / Reason (Mandatory) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            {t('delivery_reps.van_trip_expense_modal.s8', "البيان التفصيلي ورقم الإيصال (إلزامي):")}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('delivery_reps.van_trip_expense_modal.s9', "مثال: بنزين 92 محطة وطنية إيصال #412 / كارتة الطريق الدائري")}
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              padding: '0 10px',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Supervisor PIN for non-routine or >250 expenses (or optional if cumulative >400) */}
        <div
          style={{
            backgroundColor: requiresPinByRule ? '#fff7ed' : '#f8fafc',
            border: `1px solid ${requiresPinByRule ? '#fdba74' : '#e2e8f0'}`,
            borderRadius: '8px',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: requiresPinByRule ? '#c2410c' : '#334155' }}>
              {requiresPinByRule
                ? t('delivery_reps.van_trip_expense_modal.s10', "رمز اعتماد المشرف (PIN) إلزامي لهذا المصروف:")
                : t('delivery_reps.van_trip_expense_modal.s11', "رمز اعتماد المشرف (عند تجاوز السقف التراكمي 400):")}
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
              {t('delivery_reps.van_trip_expense_modal.s12', "المصروفات غير الوقود/الكارتات أو التي تتجاوز 250 تتطلب موافقة المشرف")}
            </div>
          </div>
          <input
            type="password"
            maxLength={6}
            value={supervisorPin}
            onChange={(e) => setSupervisorPin(e.target.value)}
            placeholder={t('delivery_reps.van_trip_expense_modal.s13', "PIN المشرف")}
            style={{
              width: '110px',
              height: '34px',
              borderRadius: '6px',
              border: `1px solid ${requiresPinByRule ? '#f97316' : '#cbd5e1'}`,
              fontSize: '12.5px',
              fontWeight: 800,
              textAlign: 'center',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Receipt Photo Attachment */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            {t('delivery_reps.van_trip_expense_modal.s14', "صورة إيصال المصروف / الفاتورة (اختياري):")}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#1e293b',
              }}
            >
              <CameraIcon size={14} color="#170e5e" />
              <span>{receiptPhoto ? t('delivery_reps.van_trip_expense_modal.s15', "تغيير صورة الإيصال") : t('delivery_reps.van_trip_expense_modal.s16', "تصوير أو إرفاق إيصال")}</span>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
            {receiptPhoto && (
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                {t('delivery_reps.van_trip_expense_modal.s17', "تم إرفاق الصورة بنجاح")}
              </span>
            )}
          </div>
        </div>
      </div>
    </StandardDialog>
  );
};
