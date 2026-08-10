import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { PosItem } from '@/features/pos/types/pos.types';
import type { Sale, AppSettings } from '@/types/domain';
import { buildReceiptDocument, getInvoiceStyles } from '@/lib/pos-printing/template';
import {
  defaultInvoiceFooter,
  formatDateTime,
  getPrintOption,
  paymentLabel,
  getReceiptTheme,
  type PosPrintPageSize,
} from '@/lib/pos-printing/shared';

interface PrintReceiptOptions {
  pageSize?: PosPrintPageSize;
  settings?: Partial<AppSettings> | null;
  cashierName?: string;
}

function openReceiptDocument(
  title: string,
  documentHtml: string,
  compact: boolean,
  options: PrintReceiptOptions,
  subtitle = '',
) {
  const theme = getReceiptTheme(options.pageSize, options.settings);
  printHtmlDocument(title, documentHtml, {
    subtitle,
    footerHtml: getPrintOption(options.settings, 'printShowFooter', true) ? escapeHtml(defaultInvoiceFooter(options.settings)) : '',
    pageSize: options.pageSize === 'receipt' ? 'receipt' : 'A4',
    extraStyles: getInvoiceStyles(compact),
    deviceName: options.settings?.posElectronCashierPrinter || undefined,
  });
}

export function printPosDraftPreview(options: {
  title?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentLabel?: string;
  branchName?: string;
  locationName?: string;
  items: PosItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  note?: string;
  tableNumber?: string | null;
  orderType?: string | null;
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
    customerPhone: options.customerPhone,
    customerAddress: options.customerAddress,
    paymentText: paymentLabel(options.paymentLabel),
    branchName: options.branchName || 'المتجر الرئيسي',
    locationName: options.locationName || 'المخزن الأساسي',
    note: options.note,
    tableNumber: options.tableNumber,
    orderType: options.orderType,
    deliveryRepName: (options as any).deliveryRepName,
    items: (options.items || []).map((item) => ({
      name: item.name,
      unitName: item.unitName,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      total: Number(item.qty || 0) * (Number(item.price || 0) + (item.modifiers || []).reduce((sum: number, mod: any) => sum + Number(mod.price || 0), 0)),
      modifiers: item.modifiers,
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
  const isOffline = (sale as any).offline === true;
  return buildReceiptDocument({
    pageSize: options.pageSize,
    settings: options.settings,
    documentLabel: options.pageSize === 'receipt' ? 'إيصال بيع' : 'فاتورة بيع',
    documentNumber: isOffline ? 'فاتورة قيد المزامنة' : (sale.docNo || sale.id),
    dateText: formatDateTime(sale.date),
    customerName: sale.customerName || 'عميل نقدي',
    customerPhone: sale.customerPhone,
    customerAddress: sale.customerAddress,
    paymentText: paymentLabel(sale.paymentChannel || sale.paymentType),
    cashierName: sale.createdBy || options.cashierName || '—',
    branchName: sale.branchName || 'المتجر الرئيسي',
    locationName: sale.locationName || 'المخزن الأساسي',
    note: sale.note || '',
    tableNumber: (sale as any).tableNumber || (sale as any).table_number || null,
    orderType: (sale as any).orderType || (sale as any).order_type || null,
    deliveryRepName: (sale as any).deliveryRepName || (sale as any).delivery_rep_name || null,
    items: ((sale as any).cart || sale.items || []).map((item: any) => ({
      name: item.name,
      unitName: item.unitName,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      total: Number(item.total || (Number(item.qty || 0) * (Number(item.price || 0) + (item.modifiers || []).reduce((sum: number, mod: any) => sum + Number(mod.price || 0), 0)))),
      modifiers: item.modifiers,
    })),
    subtotal: Number(sale.subTotal || (sale as any).expectedTotal || 0),
    discount: Number(sale.discount || 0),
    taxAmount: Number(sale.taxAmount || 0),
    total: Number(sale.total || 0),
    paidAmount: Number(sale.paidAmount || 0),
    tenderedAmount: Number((sale as any).tenderedAmount || 0),
    changeAmount: Number((sale as any).changeAmount || 0),
    payments: sale.payments,
  });
}

export function printPostedSaleReceipt(sale: Sale, options: PrintReceiptOptions = {}) {
  const document = buildPostedSaleDocument(sale, options);
  openReceiptDocument(`${options.pageSize === 'receipt' ? 'إيصال بيع' : 'فاتورة'} ${sale.docNo || sale.id}`, document.html, document.compact, options);
}

export { exportPostedSalePdf } from '@/lib/pos-printing/pdf';
export { printKitchenTicket } from '@/lib/pos-printing/kitchen';
