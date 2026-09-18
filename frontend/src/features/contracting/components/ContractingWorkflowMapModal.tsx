import { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface ContractingWorkflowMapModalProps {
  open: boolean;
  onClose: () => void;
}

type ScenarioTab = 'all' | 'negotiation' | 'lost' | 'award' | 'execution';

export function ContractingWorkflowMapModal({ open, onClose }: ContractingWorkflowMapModalProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioTab>('all');

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="خريطة مسار دورة حياة المشروع والعطاءات الهندسية (Contracting Lifecycle Blueprint)"
      subtitle="الدستور الهندسي والتشغيلي المعتمد: من استلام المقايسة حتى التسليم النهائي والإغلاق"
      width="min(1240px, 96vw)"
      compact
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '520px', minHeight: '520px', maxHeight: '520px', boxSizing: 'border-box' }} dir="rtl">
        {/* Scenario Switcher Tabs - Fixed font weight & 0ms transition */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e', marginLeft: '6px' }}>
            مسارات وسيناريوهات العمل:
          </span>
          {[
            { id: 'all', label: 'المسار الشامل المتكامل (End-to-End)', icon: 'Sliders' },
            { id: 'negotiation', label: 'السيناريو 1: تفاوض وتعديل سعر (Rev+)', icon: 'RefreshCw' },
            { id: 'lost', label: 'السيناريو 2: رفض العميل والأرشفة التاريخية', icon: 'Archive' },
            { id: 'award', label: 'السيناريو 3: الموافقة والترسية والتحويل لمشروع', icon: 'CheckShield' },
            { id: 'execution', label: 'مراحل التنفيذ الميداني والمستخلصات والإغلاق', icon: 'Tool' },
          ].map((tab) => {
            const isSelected = activeScenario === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveScenario(tab.id as ScenarioTab)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: 'var(--font-body)',
                  fontWeight: 600, // Uniform font weight prevents tab shifting
                  background: isSelected ? '#170e5e' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#334155',
                  border: isSelected ? '1px solid #170e5e' : '1px solid #cbd5e1',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxSizing: 'border-box',
                }}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Content Container - Fixed height prevents vertical jumping */}
        <div
          style={{
            flex: '1 1 430px',
            height: '430px',
            minHeight: '430px',
            maxHeight: '430px',
            overflowY: 'auto',
            padding: '2px 4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxSizing: 'border-box',
          }}
          className="thin-scrollbar"
        >
          {/* Phase 1 to 4: Pre-Award Pipeline */}
          {(activeScenario === 'all' || activeScenario === 'award' || activeScenario === 'negotiation' || activeScenario === 'lost') && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, color: '#170e5e', fontSize: 'var(--font-section-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AppIcons.FileText size={18} />
                  <span>المرحلة الأولى: الاستلام والتسعير والدراسة (Tender Preparation & Pricing)</span>
                </div>
                <span style={{ fontSize: 'var(--font-micro)', background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  الشاشة: /contracting/tender
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                {/* Step 1 */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: 'var(--font-badge)', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>الخطوة 1</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 'var(--font-body)', marginBottom: '4px' }}>استلام المقايسة وحصر المخططات</div>
                  <div style={{ fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.5 }}>
                    سحب ملف Excel أو PDF العميل، أو إدخال حصر لوحات CAD (طول × ارتفاع × عدد) مع تفريغ الحوائط والفتحات.
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: 'var(--font-badge)', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>الخطوة 2</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 'var(--font-body)', marginBottom: '4px' }}>تفكيك الكود (BOM) والتسعير الآلي</div>
                  <div style={{ fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.5 }}>
                    تفكيك البند لخامات ومصنعيات ومعدات، وتطبيق نسب الهالك (5%)، المصاريف الإدارية (7%)، وهامش الربح (15%).
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: 'var(--font-badge)', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>الخطوة 3</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 'var(--font-body)', marginBottom: '4px' }}>حفظ كعطاء قيد الدراسة (Planning)</div>
                  <div style={{ fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.5 }}>
                    حفظ العطاء برقم كود فريد وقيمة تقديرية. يبقى في مسار العطاءات دون التأثير على الحسابات أو تقارير المشاريع المنفذة.
                  </div>
                </div>

                {/* Step 4 */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: 'var(--font-badge)', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>الخطوة 4</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 'var(--font-body)', marginBottom: '4px' }}>تقديم العرض للعميل (Submitted)</div>
                  <div style={{ fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.5 }}>
                    تصدير شيت العميل الأصلي المسعر أو طباعة عرض السعر المعتمد، وتحويل الحالة لـ (بانتظار رد العميل) وتوثيق تاريخ الإرسال.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phase 5: The 3 Scenarios Breakdown */}
          {(activeScenario === 'all' || activeScenario === 'negotiation') && (
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: 800, color: '#170e5e', fontSize: 'var(--font-section-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AppIcons.RefreshCw size={17} />
                  <span>السيناريو الأول: طلب العميل تعديل السعر أو الشروط (Negotiation & Revision Rev+)</span>
                </div>
                <span style={{ fontSize: 'var(--font-badge)', background: '#f1f5f9', color: '#170e5e', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  الإجراء: إنشاء مراجعة تفاوض (Rev+)
                </span>
              </div>
              <div style={{ fontSize: 'var(--font-body)', color: '#334155', lineHeight: 1.6 }}>
                <strong>ماذا يحدث في النظام هندسياً وبرمجياً:</strong>
                <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
                  <li>عند الضغط على <code>إنشاء مراجعة تفاوض (Rev+)</code>، يقوم النظام باستنساخ العطاء الأصلي بكامل بنود مقايسته ومكوناته.</li>
                  <li>يتم توليد كود مراجعة جديد متسلسل تلقائياً (مثال: <code>PRJ-001-R1</code> ثم <code>PRJ-001-R2</code>).</li>
                  <li>يتم تجميد النسخة السابقة وحفظها في الأرشيف المرجعي كـ Snapshot لمنع ضياع أسعار التفاوض الأولى.</li>
                  <li>يفتح النظام شاشة التسعير للمراجعة الجديدة لتعديل هوامش الربح أو الخصومات، وإعادة استخراج عرض السعر المحدث للعميل.</li>
                </ul>
              </div>
            </div>
          )}

          {(activeScenario === 'all' || activeScenario === 'lost') && (
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: 800, color: '#475569', fontSize: 'var(--font-section-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AppIcons.Archive size={17} />
                  <span>السيناريو الثاني: الاعتذار أو عدم الترسية (Rejection & Historical Pricing Archive)</span>
                </div>
                <span style={{ fontSize: 'var(--font-badge)', background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  الإجراء: أرشفة العطاء (لم يُرسَ)
                </span>
              </div>
              <div style={{ fontSize: 'var(--font-body)', color: '#334155', lineHeight: 1.6 }}>
                <strong>ماذا يحدث في النظام هندسياً وبرمجياً:</strong>
                <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
                  <li><strong>حظر الحذف النهائي:</strong> يُمنع مسح أي عطاء تم تسعيره حتى لا يضيع المجهود الفني وبيانات التسعير.</li>
                  <li>تفتح نافذة الأرشفة لتوثيق سبب عدم الترسية (السعر أعلى من المنافس، إلغاء المالك للمشروع، شروط الدفع، مواصفات فنية).</li>
                  <li>تسجيل سعر المنافس الفائز (إن وُجد) ليكون مرجعاً استرشادياً ومؤشراً تسعيرياً للمكتب الفني مستقبلاً.</li>
                  <li>ينتقل العطاء إلى <code>أرشيف العطاءات غير المرسّاة</code> في تبويب المشاريع مع إمكانية <strong>إعادة التفعيل والإحياء (Revive)</strong> بضغطة زر إذا عاد العميل للتفاوض.</li>
                </ul>
              </div>
            </div>
          )}

          {(activeScenario === 'all' || activeScenario === 'award') && (
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: 800, color: '#170e5e', fontSize: 'var(--font-section-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AppIcons.CheckShield size={17} />
                  <span>السيناريو الثالث: قبول العرض والترسية الرسمية (Award & Baseline Contract Conversion)</span>
                </div>
                <span style={{ fontSize: 'var(--font-badge)', background: '#f1f5f9', color: '#170e5e', border: '1px solid #170e5e', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  الإجراء: اعتماد وترسية العطاء
                </span>
              </div>
              <div style={{ fontSize: 'var(--font-body)', color: '#334155', lineHeight: 1.6 }}>
                <strong>ماذا يحدث في النظام هندسياً وبرمجياً:</strong>
                <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
                  <li>تفتح نافذة الترسية لتوثيق رقم العقد التعاقدي، الاستشاري، مدير المشروع، الدفعة المقدمة، ونسبة ضمان الأعمال (Retention %).</li>
                  <li>يتحول العطاء فورياً من مسار التقديرات إلى <strong>مشروع تنفيذي ساري (Active Project)</strong> في قاعدة البيانات.</li>
                  <li><strong>قفل المقايسة كـ Baseline SOV:</strong> تصبح بنود المقايسة هي جدول القيم التعاقدي المعتمد غير القابل للتلاعب، والذي سيتم احتساب المستخلصات عليه.</li>
                  <li>فتح مركز التكلفة المستقل وربطه بالدليل المحاسبي لبدء حركات المشتريات ومقاولي الباطن.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Phase 6: Post-Award Execution Pipeline */}
          {(activeScenario === 'all' || activeScenario === 'execution') && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, color: '#170e5e', fontSize: 'var(--font-section-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AppIcons.Layers size={18} />
                  <span>المرحلة الثانية: دورة التنفيذ والميدان والمالية (Execution, Operations & Invoicing)</span>
                </div>
                <span style={{ fontSize: 'var(--font-micro)', background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  المسارات: /contracting/boq, /planning, /procurement, /field, /financials, /closeout
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)', marginBottom: '3px' }}>1. التجهيز وجانت (Planning)</div>
                  <div style={{ fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.4 }}>
                    إصدار التراخيص الحكومية وتوليد الجدول الزمني الإنشائي ومخطط جانت وتتبع المسار الحرج (CPM).
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)', marginBottom: '3px' }}>2. التوريدات والباطن (Procurement)</div>
                  <div style={{ fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.4 }}>
                    طلبات الشراء MRP لخامات المقايسة، واعتمادات المواد، وعقود مقاولي الباطن وخصومات Back-charges.
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)', marginBottom: '3px' }}>3. الميدان واليوميات (Field)</div>
                  <div style={{ fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.4 }}>
                    تسجيل اليوميات، طقس الموقع، العمالة، استلام الأعمال الهندسية WIR، وطلبات الاستفسار RFI.
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)', marginBottom: '3px' }}>4. المستخلصات (Financials)</div>
                  <div style={{ fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.4 }}>
                    إصدار مستخلصات المالك وفق AIA G702/G703، تسوية الدفعة المقدمة، حجز ضمان الأعمال، والأوامر التغييرية.
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)', marginBottom: '3px' }}>5. التسليم والإغلاق (Closeout)</div>
                  <div style={{ fontSize: 'var(--font-subtitle)', color: '#475569', lineHeight: 1.4 }}>
                    قائمة الملاحظات Snag List، التسليم الابتدائي، حساب الختامي النهائي، وإفراج محجوز الضمان بعد فترة الصيانة.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
          <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
            المنظومة مصممة لتضمن الربط الكامل بين التقديرات الأولية والتشغيل الميداني دون أي فقدان للبيانات.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 20px',
              borderRadius: '8px',
              background: '#170e5e',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            فهمت المسار وإغلاق
          </button>
        </div>
      </div>
    </StandardDialog>
  );
}
