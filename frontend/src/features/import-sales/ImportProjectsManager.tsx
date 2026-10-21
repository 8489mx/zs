import React, { useState } from 'react';
import {
  useImportProjectsQuery,
  useCreateImportProjectMutation,
  useCalculateFeasibilityMutation,
} from './api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import {
  PlusCircleIcon,
  RefreshCwIcon,
  XIcon,
  SlidersIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

export default function ImportProjectsManager() {
  const { data: projects = [], refetch } = useImportProjectsQuery();
  const createProjectMutation = useCreateImportProjectMutation();
  const calculateFeasibilityMutation = useCalculateFeasibilityMutation();

  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isFeasibilityOpen, setIsFeasibilityOpen] = useState(false);

  // New Project Form State
  const [projectTitle, setProjectTitle] = useState('');
  const [targetMarket, setTargetMarket] = useState('Egypt');
  const [countryOrigin, setCountryOrigin] = useState('China');
  const [allocatedCapital, setAllocatedCapital] = useState<number>(100000);
  const [targetRoi, setTargetRoi] = useState<number>(25);
  const [projectNotes, setProjectNotes] = useState('');

  // Feasibility Study State
  const [commRate, setCommRate] = useState<number>(50);
  const [custRate, setCustRate] = useState<number>(50);
  const [shippingUsd, setShippingUsd] = useState<number>(3500);
  const [insuranceUsd, setInsuranceUsd] = useState<number>(200);
  const [customsDutyPercent, setCustomsDutyPercent] = useState<number>(5);
  const [vatPercent, setVatPercent] = useState<number>(14);
  const [clearanceEgp, setClearanceEgp] = useState<number>(25000);
  const [transportEgp, setTransportEgp] = useState<number>(12000);
  const [travelEgp, setTravelEgp] = useState<number>(15000);
  const [targetMarkup, setTargetMarkup] = useState<number>(30);

  const [items, setItems] = useState<Array<{ name: string; hsCode: string; qty: number; factoryPriceUsd: number }>>([
    { name: 'منتج أ (نموذج)', hsCode: '8471.30', qty: 1000, factoryPriceUsd: 25 },
  ]);

  const [feasibilityResult, setFeasibilityResult] = useState<any>(null);

  const handleAddItem = () => {
    setItems([...items, { name: '', hsCode: '', qty: 100, factoryPriceUsd: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleRunFeasibility = async () => {
    try {
      const res = await calculateFeasibilityMutation.mutateAsync({
        items,
        exchangeRateCommercial: Number(commRate),
        exchangeRateCustoms: Number(custRate),
        internationalShippingUsd: Number(shippingUsd),
        insuranceUsd: Number(insuranceUsd),
        customsDutyRatePercent: Number(customsDutyPercent),
        vatRatePercent: Number(vatPercent),
        clearanceAndPortFeesEgp: Number(clearanceEgp),
        internalTransportEgp: Number(transportEgp),
        travelAndSourcingCostEgp: Number(travelEgp),
        targetMarkupPercent: Number(targetMarkup),
      });
      setFeasibilityResult(res);
      toast.success('تم احتساب دراسة الجدوى والسيناريوهات بنجاح');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء احتساب الجدوى: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) {
      toast.error('يرجى إدخال اسم المشروع');
      return;
    }

    try {
      await createProjectMutation.mutateAsync({
        title: projectTitle.trim(),
        targetMarket,
        countryOrigin,
        allocatedCapital: Number(allocatedCapital),
        targetRoiPercentage: Number(targetRoi),
        notes: projectNotes,
        feasibilityData: feasibilityResult || {},
      });
      toast.success('تم إنشاء مشروع الاستيراد بنجاح');
      setIsNewProjectOpen(false);
      setProjectTitle('');
      setProjectNotes('');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء إنشاء المشروع: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  return (
    <div dir="rtl" style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 4, height: 22, backgroundColor: '#170e5e', borderRadius: 2, display: 'inline-block' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              مشاريع الاستيراد ودراسات الجدوى (Import Projects & Feasibility)
            </h1>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '4px 14px 0 0' }}>
            إدارة فرص الصفقات التجارية من لحظة دراسة الجدوى ونقطة التعادل حتى التعاقد والشحن والإقفال
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setIsFeasibilityOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#170e5e',
              cursor: 'pointer',
            }}
          >
            <SlidersIcon size={14} />
            محرك دراسة الجدوى والسيناريوهات
          </button>

          <button
            onClick={() => setIsNewProjectOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              backgroundColor: '#170e5e',
              border: 'none',
              borderRadius: 8,
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <PlusCircleIcon size={15} />
            إنشاء مشروع استيراد جديد
          </button>
        </div>
      </div>

      {/* 2. Projects Table Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            قائمة مشاريع وصفقات الاستيراد ({projects.length})
          </h2>
          <button
            onClick={() => refetch()}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px' }}
          >
            <RefreshCwIcon size={13} />
            تحديث
          </button>
        </div>

        {projects.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
              لا توجد مشاريع استيراد مسجلة
            </div>
            <div style={{ fontSize: '12px' }}>
              ابدأ بإنشاء دراسة جدوى مبدئية أو مشروع استيراد جديد لتنظيم التعاقد والشحن
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>رقم المشروع</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>اسم الصفقة والمشروع</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>بلد الشراء والوجهة</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>الميزانية المرصودة</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>العائد المستهدف (ROI)</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>الحاويات المرتبطة</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>حالة المشروع</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#170e5e' }}>
                      {p.project_no}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                      {p.title}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>
                      {p.country_origin} &larr; {p.country_destination}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                      ${Number(p.allocated_capital || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                      {p.target_roi_percentage}%
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>
                      {p.shipmentCount || 0} حاوية
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor:
                            p.status === 'closed'
                              ? '#f1f5f9'
                              : p.status === 'warehousing' || p.status === 'selling'
                              ? '#dcfce7'
                              : '#e0e7ff',
                          color:
                            p.status === 'closed'
                              ? '#64748b'
                              : p.status === 'warehousing' || p.status === 'selling'
                              ? '#166534'
                              : '#3730a3',
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Feasibility Study Engine Dialog */}
      <StandardDialog
        open={isFeasibilityOpen}
        onClose={() => setIsFeasibilityOpen(false)}
        title="محرك دراسة الجدوى الاستيرادية والسيناريوهات الثلاثة (Feasibility Engine)"
        subtitle="حساب تكلفة الوحدة المتوقعة بالجنيه، الجمارك، الشحن، نقطة التعادل، ومقارنة السيناريوهات"
        width="1180px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Global Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, backgroundColor: '#f8fafc', padding: 12, borderRadius: 10 }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>سعر صرف الدولار التجاري (ج.م)</label>
              <input
                type="number"
                value={commRate}
                onChange={(e) => setCommRate(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>سعر الدولار الجمركي (ج.م)</label>
              <input
                type="number"
                value={custRate}
                onChange={(e) => setCustRate(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>الشحن الدولي ($)</label>
              <input
                type="number"
                value={shippingUsd}
                onChange={(e) => setShippingUsd(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>التأمين البحري ($)</label>
              <input
                type="number"
                value={insuranceUsd}
                onChange={(e) => setInsuranceUsd(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>الرسوم الجمركية (%)</label>
              <input
                type="number"
                value={customsDutyPercent}
                onChange={(e) => setCustomsDutyPercent(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>ضريبة القيمة المضافة (%)</label>
              <input
                type="number"
                value={vatPercent}
                onChange={(e) => setVatPercent(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>أرضيات وتخليص (ج.م)</label>
              <input
                type="number"
                value={clearanceEgp}
                onChange={(e) => setClearanceEgp(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>نقل داخلي للمخزن (ج.م)</label>
              <input
                type="number"
                value={transportEgp}
                onChange={(e) => setTransportEgp(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>مصاريف سفر ومعاينات (ج.م)</label>
              <input
                type="number"
                value={travelEgp}
                onChange={(e) => setTravelEgp(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>هامش الربح المطلوب (%)</label>
              <input
                type="number"
                value={targetMarkup}
                onChange={(e) => setTargetMarkup(Number(e.target.value))}
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>أصناف الشحنة المستهدفة</span>
              <button
                type="button"
                onClick={handleAddItem}
                style={{ background: 'none', border: 'none', color: '#170e5e', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                + إضافة صنف آخر
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>اسم الصنف</th>
                  <th style={{ padding: '8px 10px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>البند الجمركي HS Code</th>
                  <th style={{ padding: '8px 10px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>الكمية المستهدفة</th>
                  <th style={{ padding: '8px 10px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>سعر المصنع ($)</th>
                  <th style={{ padding: '8px 10px', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                        style={{ width: '100%', height: 30, padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '12px' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="text"
                        value={it.hsCode}
                        onChange={(e) => handleUpdateItem(idx, 'hsCode', e.target.value)}
                        style={{ width: '100%', height: 30, padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '12px' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="number"
                        value={it.qty}
                        onChange={(e) => handleUpdateItem(idx, 'qty', Number(e.target.value))}
                        style={{ width: '100%', height: 30, padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '12px' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="number"
                        value={it.factoryPriceUsd}
                        onChange={(e) => handleUpdateItem(idx, 'factoryPriceUsd', Number(e.target.value))}
                        style={{ width: '100%', height: 30, padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '12px' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <XIcon size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'left' }}>
            <button
              type="button"
              onClick={handleRunFeasibility}
              disabled={calculateFeasibilityMutation.isPending}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {calculateFeasibilityMutation.isPending ? 'جاري الحساب...' : 'حساب الجدوى والسيناريوهات الثلاثة'}
            </button>
          </div>

          {/* Results View */}
          {feasibilityResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
              {/* Three Scenarios */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {/* Base Scenario */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', marginBottom: 6 }}>1. السيناريو الأساسي (Base)</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>رأس المال: {feasibilityResult.scenarios.base.totalInvestmentEgp.toLocaleString()} ج.م</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>المبيعات المتوقعة: {feasibilityResult.scenarios.base.expectedRevenueEgp.toLocaleString()} ج.م</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#059669', marginTop: 4 }}>
                    صافي الربح: {feasibilityResult.scenarios.base.expectedNetProfitEgp.toLocaleString()} ج.م ({feasibilityResult.scenarios.base.roiPercentage}%)
                  </div>
                </div>

                {/* Best Scenario */}
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#047857', marginBottom: 6 }}>2. السيناريو المتفائل (Best)</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>رأس المال: {feasibilityResult.scenarios.best.totalInvestmentEgp.toLocaleString()} ج.م</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>المبيعات المتوقعة: {feasibilityResult.scenarios.best.expectedRevenueEgp.toLocaleString()} ج.م</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#047857', marginTop: 4 }}>
                    صافي الربح: {feasibilityResult.scenarios.best.expectedNetProfitEgp.toLocaleString()} ج.م ({feasibilityResult.scenarios.best.roiPercentage}%)
                  </div>
                </div>

                {/* Worst Scenario */}
                <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#be123c', marginBottom: 6 }}>3. السيناريو المتحفظ (Worst)</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>رأس المال: {feasibilityResult.scenarios.worst.totalInvestmentEgp.toLocaleString()} ج.م</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>المبيعات المتوقعة: {feasibilityResult.scenarios.worst.expectedRevenueEgp.toLocaleString()} ج.م</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#be123c', marginTop: 4 }}>
                    صافي الربح: {feasibilityResult.scenarios.worst.expectedNetProfitEgp.toLocaleString()} ج.م ({feasibilityResult.scenarios.worst.roiPercentage}%)
                  </div>
                </div>
              </div>

              {/* Items Landed Cost Output */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                  التكلفة المتوقعة للوحدة بالجنيه المصري وسعر البيع المقترح
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '6px 8px', fontSize: '11px', color: '#475569' }}>الصنف</th>
                      <th style={{ padding: '6px 8px', fontSize: '11px', color: '#475569' }}>الكمية</th>
                      <th style={{ padding: '6px 8px', fontSize: '11px', color: '#475569' }}>تكلفة الشراء (ج.م)</th>
                      <th style={{ padding: '6px 8px', fontSize: '11px', color: '#475569' }}>الأعباء المحملة (ج.م)</th>
                      <th style={{ padding: '6px 8px', fontSize: '11px', color: '#475569' }}>تكلفة القطعة الواصلة (ج.م)</th>
                      <th style={{ padding: '6px 8px', fontSize: '11px', color: '#475569' }}>سعر الجملة المقترح</th>
                      <th style={{ padding: '6px 8px', fontSize: '11px', color: '#475569' }}>سعر القطاعي المقترح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feasibilityResult.items.map((it: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', fontSize: '11.5px', fontWeight: 700 }}>{it.name}</td>
                        <td style={{ padding: '6px 8px', fontSize: '11.5px' }}>{it.qty}</td>
                        <td style={{ padding: '6px 8px', fontSize: '11.5px' }}>{it.factoryCostEgp.toLocaleString()}</td>
                        <td style={{ padding: '6px 8px', fontSize: '11.5px' }}>{it.allocatedOverheadEgp.toLocaleString()}</td>
                        <td style={{ padding: '6px 8px', fontSize: '11.5px', fontWeight: 800, color: '#170e5e' }}>{it.unitLandedCostEgp} ج.م</td>
                        <td style={{ padding: '6px 8px', fontSize: '11.5px', fontWeight: 700, color: '#0284c7' }}>{it.suggestedWholesalePriceEgp} ج.م</td>
                        <td style={{ padding: '6px 8px', fontSize: '11.5px', fontWeight: 700, color: '#059669' }}>{it.suggestedRetailPriceEgp} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </StandardDialog>

      {/* 4. New Project Dialog */}
      <StandardDialog
        open={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        title="إنشاء مشروع استيراد جديد (New Import Project)"
        subtitle="تسجيل تفاصيل المشروع، الميزانية المستهدفة، السوق والشركاء"
        width="650px"
      >
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
              اسم المشروع والصفقة المستهدفة *
            </label>
            <input
              type="text"
              required
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="مثال: استيراد حاوية هواتف ذكية وإكسسوارات كوانزو 2026"
              style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                بلد الشراء
              </label>
              <input
                type="text"
                value={countryOrigin}
                onChange={(e) => setCountryOrigin(e.target.value)}
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                سوق الوصول
              </label>
              <input
                type="text"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                رأس المال المرصود ($)
              </label>
              <input
                type="number"
                value={allocatedCapital}
                onChange={(e) => setAllocatedCapital(Number(e.target.value))}
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                العائد المستهدف ROI (%)
              </label>
              <input
                type="number"
                value={targetRoi}
                onChange={(e) => setTargetRoi(Number(e.target.value))}
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
              ملاحظات وشروط المشروع
            </label>
            <textarea
              rows={3}
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              placeholder="شروط تعاقد المورد، نسب التمويل والشراكة، مواعيد التسليم المتوقعة..."
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsNewProjectOpen(false)}
              style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: '12.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createProjectMutation.isPending}
              style={{ padding: '8px 20px', backgroundColor: '#170e5e', border: 'none', borderRadius: 6, fontSize: '12.5px', fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
            >
              {createProjectMutation.isPending ? 'جاري الحفظ...' : 'إنشاء المشروع'}
            </button>
          </div>
        </form>
      </StandardDialog>
    </div>
  );
}
