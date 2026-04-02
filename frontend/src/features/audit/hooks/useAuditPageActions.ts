import { useCallback, useState } from 'react';
import { auditApi } from '@/features/audit/api/audit.api';
import { formatDate } from '@/lib/format';
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { AuditLog } from '@/types/domain';

interface Params {
  search: string;
  mode: 'all' | 'today' | 'withDetails';
  totalRows: number;
  summary: { distinctUsers: number; todayCount: number };
  rangeStart: number;
  rangeEnd: number;
}

export function useAuditPageActions({ search, mode, totalRows, summary, rangeStart, rangeEnd }: Params) {
  const [copyFeedback, setCopyFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const copyAuditSummary = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const lines = [
      'ملخص سجل النشاط',
      `إجمالي السجلات المطابقة: ${totalRows}`,
      `عدد المنفذين: ${summary.distinctUsers}`,
      `سجلات اليوم: ${summary.todayCount}`,
      `النطاق المعروض الآن: ${rangeStart}-${rangeEnd}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyFeedback({ kind: 'success', text: 'تم نسخ ملخص سجل النشاط.' });
    } catch {
      setCopyFeedback({ kind: 'error', text: 'تعذر نسخ ملخص سجل النشاط.' });
    }
  }, [rangeEnd, rangeStart, summary.distinctUsers, summary.todayCount, totalRows]);

  const exportAuditRows = useCallback(async () => {
    if (!totalRows) return;
    setIsExporting(true);
    try {
      const payload = await auditApi.listAll({ search, mode });
      downloadCsvFile(
        'audit-log-results.csv',
        ['action', 'details', 'createdBy', 'date'],
        payload.rows.map((row: AuditLog) => [row.action || '', row.detailsSummary || row.details || '', row.createdByName || '', row.createdAt || ''])
      );
      setCopyFeedback({ kind: 'success', text: 'تم تجهيز تصدير كامل للسجلات المطابقة.' });
    } catch {
      setCopyFeedback({ kind: 'error', text: 'تعذر تصدير السجلات المطابقة.' });
    } finally {
      setIsExporting(false);
    }
  }, [mode, search, totalRows]);

  const printAuditRows = useCallback(async () => {
    if (!totalRows) return;
    setIsExporting(true);
    try {
      const payload = await auditApi.listAll({ search, mode });
      printHtmlDocument(
        'سجل النشاط',
        `
        <h1>سجل النشاط</h1>
        <div class="meta">إجمالي السجلات المطابقة: ${payload.rows.length} · عدد المنفذين: ${summary.distinctUsers} · سجلات اليوم: ${summary.todayCount}</div>
        <table>
          <thead><tr><th>الإجراء</th><th>التفاصيل</th><th>المنفذ</th><th>التاريخ</th></tr></thead>
          <tbody>${payload.rows
            .map(
              (row) =>
                `<tr><td>${escapeHtml(row.action || '—')}</td><td>${escapeHtml(row.detailsSummary || row.details || '—')}</td><td>${escapeHtml(
                  row.createdByName || '—'
                )}</td><td>${escapeHtml(formatDate(row.createdAt))}</td></tr>`
            )
            .join('')}</tbody>
        </table>
      `
      );
    } catch {
      setCopyFeedback({ kind: 'error', text: 'تعذر طباعة السجلات المطابقة.' });
    } finally {
      setIsExporting(false);
    }
  }, [mode, search, summary.distinctUsers, summary.todayCount, totalRows]);

  return { copyFeedback, isExporting, copyAuditSummary, exportAuditRows, printAuditRows };
}
