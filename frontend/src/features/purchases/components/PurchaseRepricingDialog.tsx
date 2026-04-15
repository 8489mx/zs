import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { formatCurrency } from '@/lib/format';
import type { PurchaseRepricingInsights } from '@/features/purchases/api/purchases.api';
import {
  pricingCenterApi,
  type PricingPreviewPayload,
  type PricingPreviewResponse,
  type PricingRule,
} from '@/shared/api/pricing.api';
import { useAuthStore } from '@/stores/auth-store';

interface PurchaseRepricingDialogProps {
  open: boolean;
  insights: PurchaseRepricingInsights | null;
  onClose: () => void;
}

function summarizeRule(rule: PricingRule | null) {
  if (!rule) return 'لا توجد قاعدة مطابقة.';
  const scope = [
    rule.filters.supplierId ? `مورد #${rule.filters.supplierId}` : '',
    rule.filters.categoryId ? `قسم #${rule.filters.categoryId}` : '',
    rule.filters.itemKind === 'fashion' ? 'ملابس' : rule.filters.itemKind === 'standard' ? 'عادي' : '',
    rule.filters.styleCode ? `موديل ${rule.filters.styleCode}` : '',
  ].filter(Boolean).join(' / ');
  return `${scope || 'نطاق عام'} — ${rule.operation.type} (${rule.operation.value})`;
}

function buildPayloadFromRule(insights: PurchaseRepricingInsights, rule: PricingRule): PricingPreviewPayload {
  return {
    ...rule.payload,
    filters: {
      ...rule.payload.filters,
      supplierId: rule.payload.filters.supplierId || insights.supplierId,
      productIds: insights.productIds,
      activeOnly: true,
      inStockOnly: false,
    },
  };
}

export function PurchaseRepricingDialog({ open, insights, onClose }: PurchaseRepricingDialogProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canEditPrice = user?.role === 'super_admin' || Boolean(user?.permissions?.includes('canEditPrice'));
  const limitedRows = useMemo(() => (insights?.rows ?? []).slice(0, 20), [insights?.rows]);
  const totalRows = insights?.rows?.length ?? 0;
  const [matchedRule, setMatchedRule] = useState<PricingRule | null>(null);
  const [preparedPayload, setPreparedPayload] = useState<PricingPreviewPayload | null>(null);
  const [pricingPreview, setPricingPreview] = useState<PricingPreviewResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const matchRuleMutation = useMutation({ mutationFn: pricingCenterApi.matchRule });
  const previewMutation = useMutation({
    mutationFn: pricingCenterApi.preview,
    onSuccess: (result) => setPricingPreview(result),
  });
  const applyMutation = useMutation({
    mutationFn: pricingCenterApi.apply,
    onSuccess: (result) => {
      setPricingPreview(result.preview);
      setStatusMessage(`تم تنفيذ موجة التسعير رقم ${result.runId} من نفس مسار الشراء.`);
    },
  });
  const { mutateAsync: matchRuleAsync, reset: resetMatchedRule } = matchRuleMutation;
  const { mutateAsync: previewAsync, reset: resetPreview } = previewMutation;
  const { reset: resetApply } = applyMutation;

  useEffect(() => {
    let cancelled = false;

    if (!open || !insights?.productIds?.length) {
      setMatchedRule(null);
      setPreparedPayload(null);
      setPricingPreview(null);
      setStatusMessage('');
      resetMatchedRule();
      resetPreview();
      resetApply();
      return;
    }

    setStatusMessage('');
    setPricingPreview(null);
    resetPreview();
    resetApply();

    void matchRuleAsync({ supplierId: insights.supplierId }).then(async (result) => {
      if (cancelled) return;
      const rule = result.rule;
      setMatchedRule(rule);
      if (!rule) {
        setPreparedPayload(null);
        return;
      }
      const payload = buildPayloadFromRule(insights, rule);
      setPreparedPayload(payload);
      const preview = await previewAsync(payload);
      if (!cancelled) {
        setPricingPreview(preview);
      }
    }).catch(() => {
      if (!cancelled) {
        setMatchedRule(null);
        setPreparedPayload(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [insights, matchRuleAsync, resetMatchedRule, open, previewAsync, resetPreview, resetApply]);

  const openPricingCenter = () => {
    if (!insights?.productIds?.length) {
      onClose();
      return;
    }
    const params = new URLSearchParams();
    params.set('sourcePurchaseId', String(insights.purchaseId));
    params.set('supplierId', String(insights.supplierId));
    params.set('productIds', insights.productIds.join(','));
    params.set('autoPreview', '1');
    params.set('autoRuleMatch', '1');
    params.set('activeOnly', '1');
    params.set('skipActiveOffers', '1');
    params.set('skipCustomerPrices', '1');
    params.set('skipManualExceptions', '1');
    navigate(`/pricing-center?${params.toString()}`);
    onClose();
  };

  const applyDirectly = async () => {
    if (!preparedPayload) return;
    await applyMutation.mutateAsync(preparedPayload);
  };

  const previewSummary = pricingPreview?.summary;
  const hasAutoPreview = Boolean(pricingPreview);
  const matchedRuleSummary = summarizeRule(matchedRule);

  return (
    <DialogShell open={open} onClose={onClose} width="min(1180px, 100%)" zIndex={90} ariaLabel="مراجعة إعادة التسعير بعد الشراء">
      <div className="dialog-shell-header">
        <div>
          <h2 style={{ margin: 0 }}>مراجعة إعادة التسعير بعد الشراء</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            تم رصد تغيّر في تكلفة {insights?.affectedCount || 0} صنف من المورد {insights?.supplierName || '—'}.
            النافذة الآن تحاول مطابقة قاعدة التسعير المناسبة، وتجهيز معاينة جاهزة، مع إمكانية تنفيذ الموجة مباشرة من هنا.
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <article className="stat-card"><span>أصناف متأثرة</span><strong>{insights?.affectedCount || 0}</strong></article>
        <article className="stat-card"><span>تكلفة زادت</span><strong>{insights?.increasedCount || 0}</strong></article>
        <article className="stat-card"><span>تكلفة انخفضت</span><strong>{insights?.decreasedCount || 0}</strong></article>
        <article className="stat-card"><span>بدون تغيّر تكلفة</span><strong>{insights?.unchangedCount || 0}</strong></article>
      </div>

      <div className="two-column-grid panel-grid" style={{ marginBottom: 16 }}>
        <Card title="القاعدة المطابقة" description="يتم اختيار أفضل قاعدة نشطة مطابقة للمورد والسياق الحالي.">
          {matchRuleMutation.isPending ? <p className="muted">جارٍ مطابقة قاعدة التسعير…</p> : (
            <div className="stack gap-sm">
              <div><strong>{matchedRule?.name || 'لا توجد قاعدة مطابقة'}</strong></div>
              <div className="muted small">{matchedRuleSummary}</div>
              {matchedRule?.notes ? <div className="muted small">{matchedRule.notes}</div> : null}
              {!matchedRule ? <div className="muted small">يمكنك فتح مركز التسعير لحفظ قاعدة جديدة لهذا المورد ثم إعادة استخدامها لاحقًا.</div> : null}
            </div>
          )}
        </Card>

        <Card title="المعاينة الجاهزة" description="هذه هي المعاينة الفعلية التي ستُستخدم لو تم تنفيذ الموجة الآن.">
          {!matchedRule && !matchRuleMutation.isPending ? <p className="muted">لا توجد معاينة تلقائية لأن النظام لم يجد قاعدة مناسبة بعد.</p> : null}
          {matchedRule && !hasAutoPreview && !previewMutation.isPending ? <p className="muted">لم تُجهّز المعاينة بعد.</p> : null}
          {previewMutation.isPending ? <p className="muted">جارٍ تجهيز المعاينة…</p> : null}
          {hasAutoPreview ? (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <article className="stat-card"><span>مطابقون</span><strong>{previewSummary?.matchedCount || 0}</strong></article>
              <article className="stat-card"><span>سيتأثرون فعليًا</span><strong>{previewSummary?.affectedCount || 0}</strong></article>
              <article className="stat-card"><span>تخطّي عروض</span><strong>{previewSummary?.skippedOfferCount || 0}</strong></article>
              <article className="stat-card"><span>تخطّي أسعار خاصة</span><strong>{previewSummary?.skippedCustomerPriceCount || 0}</strong></article>
              <article className="stat-card"><span>تخطّي استثناءات يدوية</span><strong>{previewSummary?.skippedManualExceptionCount || 0}</strong></article>
              <article className="stat-card"><span>أقل من الشراء</span><strong>{previewSummary?.belowCostCount || 0}</strong></article>
            </div>
          ) : null}
        </Card>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color, #ddd)', borderRadius: 12 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right', padding: 10 }}>الصنف</th>
              <th style={{ textAlign: 'right', padding: 10 }}>الشراء قبل/بعد</th>
              <th style={{ textAlign: 'right', padding: 10 }}>تغير %</th>
              <th style={{ textAlign: 'right', padding: 10 }}>قطاعي حالي/مقترح</th>
              <th style={{ textAlign: 'right', padding: 10 }}>جملة حالي/مقترح</th>
            </tr>
          </thead>
          <tbody>
            {limitedRows.map((row) => (
              <tr key={row.productId}>
                <td style={{ padding: 10, borderTop: '1px solid var(--border-color, #eee)' }}>
                  <strong>{row.name}</strong>
                  <div className="muted small">{row.itemKind === 'fashion' ? `ملابس${row.styleCode ? ` / ${row.styleCode}` : ''}` : 'عادي'}</div>
                </td>
                <td style={{ padding: 10, borderTop: '1px solid var(--border-color, #eee)' }}>{formatCurrency(row.previousCost)} → {formatCurrency(row.newCost)}</td>
                <td style={{ padding: 10, borderTop: '1px solid var(--border-color, #eee)' }}>{row.costChangePercent}%</td>
                <td style={{ padding: 10, borderTop: '1px solid var(--border-color, #eee)' }}>{formatCurrency(row.retailPrice)} → {formatCurrency(row.recommendedRetailPrice)}</td>
                <td style={{ padding: 10, borderTop: '1px solid var(--border-color, #eee)' }}>{formatCurrency(row.wholesalePrice)} → {formatCurrency(row.recommendedWholesalePrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalRows > limitedRows.length ? <p className="muted small" style={{ marginTop: 10 }}>يتم عرض أول {limitedRows.length} صنف فقط داخل النافذة. افتح مركز التسعير لرؤية كل الأصناف المتأثرة.</p> : null}
      {statusMessage ? <p className="muted" style={{ marginTop: 12 }}>{statusMessage}</p> : null}

      <div className="actions" style={{ justifyContent: 'space-between', marginTop: 18 }}>
        <div className="muted small">
          {matchedRule
            ? 'القاعدة المطابقة جاهزة. يمكنك تنفيذ موجة التسعير مباشرة من هنا أو فتح مركز التسعير لمراجعة أوسع.'
            : 'لا توجد قاعدة مطابقة حاليًا. افتح مركز التسعير لحفظ قاعدة جديدة أو نفّذ يدويًا من هناك.'}
        </div>
        <div className="actions compact-actions">
          <Button variant="secondary" type="button" onClick={onClose}>إغلاق</Button>
          <Button type="button" onClick={openPricingCenter}>فتح مركز التسعير</Button>
          <Button type="button" onClick={applyDirectly} disabled={!canEditPrice || !preparedPayload || !previewSummary?.affectedCount || applyMutation.isPending}>
            {applyMutation.isPending ? 'جارٍ التنفيذ...' : 'تنفيذ الموجة الآن'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
