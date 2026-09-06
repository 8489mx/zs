import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { dailyDigestApi, DailyDigestConfig } from '@/features/settings/api/daily-digest.api';
import { ClockIcon, SmartphoneIcon, XIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';

export const SettingsDailyDigestSection: React.FC = () => {
  const [config, setConfig] = useState<DailyDigestConfig>({
    enabled: true,
    phone: '',
    timeOfDay: '23:30',
    includeSales: true,
    includeTransfers: true,
    includeShortages: true,
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; text?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const query = useQuery({
    queryKey: ['daily-digest-config'],
    queryFn: dailyDigestApi.getConfig,
  });

  useEffect(() => {
    if (query.data) {
      setConfig(query.data);
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: dailyDigestApi.saveConfig,
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const testMutation = useMutation({
    mutationFn: (phone?: string) => dailyDigestApi.sendTest(phone),
    onSuccess: (res) => {
      setTestResult(res);
    },
    onError: (err: any) => {
      setTestResult({ success: false, message: err?.message || 'فشل إرسال التقرير التجريبي' });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleSendTest = () => {
    setTestResult(null);
    testMutation.mutate(config.phone);
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs">
              <ClockIcon size={24} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <span>الملخص التنفيذي واللوجستي اليومي للمدير</span>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  واتساب مجدول
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                إرسال تقرير ليلي تلقائي يجمع بين مبيعات اليوم، تفاصيل أذون الصرف المنقولة للمحل، ونواقص المستودع الرئيسي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleSendTest}
              disabled={testMutation.isPending}
              className="font-bold text-xs flex items-center gap-1.5 px-4 h-9"
            >
              <SmartphoneIcon size={14} />
              <span>{testMutation.isPending ? 'جاري الإرسال...' : 'إرسال ملخص تجريبي الآن'}</span>
            </Button>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-[#170e5e] hover:bg-[#120b4c] text-white font-bold text-xs px-6 h-9 flex items-center gap-1.5"
            >
              {saveSuccess && <CheckCircleIcon size={14} />}
              <span>{saveMutation.isPending ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ بنجاح' : 'حفظ الإعدادات'}</span>
            </Button>
          </div>
        </div>

        {testResult && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {testResult.success && <CheckCircleIcon size={14} />}
              <span>{testResult.success ? 'تم إرسال رسالة الملخص اليومي التجريبية بنجاح إلى رقم الواتساب!' : testResult.message}</span>
            </div>
            <button type="button" onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-600 p-1">
              <XIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settings Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <span>خيارات الجدولة والإرسال</span>
            </h3>

            {/* Toggle Enable */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="font-bold text-slate-800 text-xs">تفعيل التقرير الليلي المجدول</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  إرسال الرسالة آلياً في الوقت المحدد دون تدخل بشري
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#170e5e]"></div>
              </label>
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم هاتف الواتساب للمدير / المالك:
              </label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="010XXXXXXXX أو 201XXXXXXXXX"
                className="w-full h-10 rounded-xl border border-slate-300 px-3.5 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                يُترك فارغاً لاستخدام رقم هاتف المالك المسجل في بيانات المنشأة تلقائياً.
              </p>
            </div>

            {/* Time of Day */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                موعد الإرسال اليومي (توقيت محلي):
              </label>
              <input
                type="time"
                value={config.timeOfDay}
                onChange={(e) => setConfig((prev) => ({ ...prev, timeOfDay: e.target.value }))}
                className="w-full h-10 rounded-xl border border-slate-300 px-3.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                التوقيت الموصى به: 11:30 مساءً أو 12:00 منتصف الليل بعد إغلاق كافة الورديات.
              </p>
            </div>

            {/* Section Checkboxes */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 mb-2.5">
                محتويات وأقسام التقرير المطلوب تضمينها:
              </label>
              <div className="space-y-2.5">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeSales}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeSales: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-[#170e5e] focus:ring-[#170e5e]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">بلوك المبيعات والنشاط اليومي</span>
                    <span className="text-[11px] text-slate-500">
                      إجمالي المبيعات، عدد الفواتير، السيولة النقدية والشبكة، والأصناف الأكثر رواجاً.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeTransfers}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeTransfers: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-[#170e5e] focus:ring-[#170e5e]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">بلوك أذون الصرف والإمداد التفصيلية للمحل</span>
                    <span className="text-[11px] text-slate-500">
                      كشف تفصيلي بكل صنف تم صرفه ونقله من المستودع للمحل وكميته الدقيقة واسم المشرف المعتمد.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeShortages}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeShortages: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-[#170e5e] focus:ring-[#170e5e]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">بلوك نواقص المستودع الحرج</span>
                    <span className="text-[11px] text-slate-500">
                      قائمة بالأصناف التي نفدت أو أوشكت على النفاد في المستودع لإصدار أمر شراء للموردين.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live WhatsApp Message Simulator (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-[#efeae2] rounded-2xl border border-slate-300 p-4 shadow-sm relative overflow-hidden">
            <div className="bg-[#075e54] text-white p-3 rounded-xl mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  Z
                </div>
                <div>
                  <div className="text-xs font-bold">بوت الإدارة والملخص اليومي</div>
                  <div className="text-[10px] text-emerald-200">متصل الآن عبر واتساب</div>
                </div>
              </div>
              <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded font-mono">23:30</span>
            </div>

            {/* WhatsApp Bubble */}
            <div className="bg-white rounded-xl rounded-tr-none p-3.5 shadow-xs border border-slate-200 text-slate-800 text-xs leading-relaxed space-y-2.5">
              <div className="font-bold text-[#075e54] border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>الملخص التنفيذي واللوجستي اليومي</span>
                <span className="text-[10px] text-slate-400 font-mono">اليوم</span>
              </div>

              {config.includeSales && (
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">المبيعات والإيرادات:</div>
                  <div className="text-[11px] text-slate-600 space-y-0.5 pr-2">
                    <div>• إجمالي المبيعات: <b>42,850 ج.م</b> (58 فاتورة)</div>
                    <div>• نقدية بالصندوق (كاش): 28,150 ج.م</div>
                    <div>• شبكة وماكينات دفع: 11,500 ج.م</div>
                    <div>• إنستاباي ومحافظ: 3,200 ج.م</div>
                    <div>الأكثر مبيعاً: زيت عافية (36 ق)، شاي (24 ق)</div>
                  </div>
                </div>
              )}

              {config.includeTransfers && (
                <div className="space-y-1 pt-1.5 border-t border-slate-100">
                  <div className="font-bold text-slate-900">أذون الصرف والإمداد للمحل:</div>
                  <div className="text-[11px] text-slate-600 space-y-0.5 pr-2">
                    <div className="font-semibold text-indigo-900">إذن رقم #TR-882 إلى صالة المحل:</div>
                    <div className="pr-2 text-slate-700">
                      <div>• زيت عافية ذرة: <b>24 قطعة</b> (2 كرتونة)</div>
                      <div>• شاي العروسة 250جم: <b>15 قطعة</b></div>
                      <div>• سكر الأسرة: <b>25 قطعة</b></div>
                      <div className="text-slate-400 text-[10px]">_إجمالي إذن الصرف: 64 قطعة_</div>
                    </div>
                  </div>
                </div>
              )}

              {config.includeShortages && (
                <div className="space-y-1 pt-1.5 border-t border-slate-100">
                  <div className="font-bold text-slate-900">نواقص المستودع التي تحتاج شراء:</div>
                  <div className="text-[11px] text-slate-600 space-y-0.5 pr-2">
                    <div>• سكر الأسرة: <span className="text-red-600 font-bold">نفد تماماً (0)</span></div>
                    <div>• أرز الضحى: <span className="text-amber-600 font-bold">متبقي 5 أكياس</span></div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span>نظام Z-Systems المؤتمت</span>
                <span className="text-emerald-700 font-medium">تمت القراءة</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
