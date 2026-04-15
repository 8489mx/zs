import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { PosItem } from '@/features/pos/types/pos.types';
import type { Sale, AppSettings } from '@/types/domain';
import { buildReceiptDocument, getInvoiceStyles } from '@/lib/pos-printing/template';
import {
  defaultInvoiceFooter,
  formatDateTime,
  getPrintOption,
  paymentLabel,
  type PosPrintPageSize,
} from '@/lib/pos-printing/shared';

interface PrintReceiptOptions {
  pageSize?: PosPrintPageSize;
  settings?: Partial<AppSettings> | null;
}

function openReceiptDocument(
  title: string,
  documentHtml: string,
  compact: boolean,
  options: PrintReceiptOptions,
  subtitle = '',
) {
  printHtmlDocument(title, documentHtml, {
    subtitle,
    footerHtml: getPrintOption(options.settings, 'printShowFooter', true) ? escapeHtml(defaultInvoiceFooter(options.settings)) : '',
    pageSize: options.pageSize === 'receipt' ? 'receipt' : 'A4',
    extraStyles: getInvoiceStyles(compact),
  });
}

export function printPosDraftPreview(options: {
  title?: string;
  customerName?: string;
  paymentLabel?: string;
  branchName?: string;
  locationName?: string;
  items: PosItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  note?: string;
  pageSize?: PosPrintPageSize;
  settings?: Partial<AppSettings> | null;
}) {
  const document = buildReceiptDocument({
    pageSize: options.pageSize,
    settings: options.settings,
    documentLabel: options.pageSize === 'receipt' ? 'إيصال بيع' : 'فاتورة بيع',
    documentNumber: 'مسودة',
    dateText: formatDateTime(),
    customerName: options.customerName || 'عميل نقدي',
    paymentText: paymentLabel(options.paymentLabel),
    branchName: options.branchName || 'المتجر الرئيسي',
    locationName: options.locationName || 'المخزن الأساسي',
    note: options.note,
    items: (options.items || []).map((item) => ({
      name: item.name,
      unitName: item.unitName,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      total: Number(item.qty || 0) * Number(item.price || 0),
    })),
    subtotal: Number(options.subtotal || 0),
    discount: Number(options.discount || 0),
    taxAmount: Number(options.taxAmount || 0),
    total: Number(options.total || 0),
    paidAmount: Number(options.total || 0),
  });

  openReceiptDocument(
    options.title || (options.pageSize === 'receipt' ? 'معاينة إيصال البيع' : 'معاينة فاتورة الكاشير'),
    document.html,
    document.compact,
    { pageSize: options.pageSize === 'receipt' ? 'receipt' : 'a4', settings: options.settings || null },
    options.pageSize === 'receipt' ? '' : 'معاينة جاهزة للطباعة',
  );
}

function buildPostedSaleDocument(sale: Sale, options: PrintReceiptOptions) {
  return buildReceiptDocument({
    pageSize: options.pageSize,
    settings: options.settings,
    documentLabel: options.pageSize === 'receipt' ? 'إيصال بيع' : 'فاتورة بيع',
    documentNumber: sale.docNo || sale.id,
    dateText: formatDateTime(sale.date),
    customerName: sale.customerName || 'عميل نقدي',
    paymentText: paymentLabel(sale.paymentChannel || sale.paymentType),
    cashierName: sale.createdBy || '—',
    branchName: sale.branchName || 'المتجر الرئيسي',
    locationName: sale.locationName || 'المخزن الأساسي',
    note: sale.note || '',
    items: (sale.items || []).map((item) => ({
      name: item.name,
      unitName: item.unitName,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      total: Number(item.total || 0),
    })),
    subtotal: Number(sale.subTotal || 0),
    discount: Number(sale.discount || 0),
    taxAmount: Number(sale.taxAmount || 0),
    total: Number(sale.total || 0),
    paidAmount: Number(sale.paidAmount || 0),
    payments: sale.payments,
  });
}

export function printPostedSaleReceipt(sale: Sale, options: PrintReceiptOptions = {}) {
  const document = buildPostedSaleDocument(sale, options);
  openReceiptDocument(`${options.pageSize === 'receipt' ? 'إيصال بيع' : 'فاتورة'} ${sale.docNo || sale.id}`, document.html, document.compact, options);
}

export { exportPostedSalePdf } from '@/lib/pos-printing/pdf';
