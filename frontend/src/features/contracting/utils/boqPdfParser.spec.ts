import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import {
  fixVisualArabicIfNeeded,
  clusterItemsIntoLines,
  detectPdfTableHeaders,
  assemblePdfBoqRows,
  parseBoqPdf,
  reExtractBoqPdfWithCustomMapping,
  PdfTextItem,
  PdfLine,
} from './boqPdfParser';

describe('Universal Smart BOQ PDF Parser Engine', () => {
  describe('fixVisualArabicIfNeeded', () => {
    it('preserves normally formatted Arabic strings', () => {
      const input = 'خرسانة مسلحة للأساسات والقواعد';
      expect(fixVisualArabicIfNeeded(input)).toBe(input);
    });

    it('corrects reversed visual Arabic text from legacy PDF engines', () => {
      // In reversed visual Arabic: "خرسانة" appears with terminal 'ة' first or words reversed
      const reversed = 'تاساسلال ةيداع ةناسرخ';
      const fixed = fixVisualArabicIfNeeded(reversed);
      expect(fixed).toContain('خرسانة');
      expect(fixed).toContain('عادية');
    });

    it('normalizes Eastern Arabic numerals to Western digits', () => {
      const input = 'بند رقم ١٢٣ بكمية ٤٥٠ م٣';
      const fixed = fixVisualArabicIfNeeded(input);
      expect(fixed).toContain('123');
      expect(fixed).toContain('450');
    });
  });

  describe('clusterItemsIntoLines', () => {
    it('groups text items with similar Y coordinates into single lines and sorts by X', () => {
      const items: PdfTextItem[] = [
        { str: 'Qty', x: 200, y: 50.2, width: 30, height: 10, page: 1 },
        { str: 'Item', x: 20, y: 49.8, width: 25, height: 10, page: 1 },
        { str: 'Description', x: 60, y: 50.0, width: 80, height: 10, page: 1 },
        { str: 'Concrete works', x: 60, y: 80.0, width: 80, height: 10, page: 1 },
        { str: '1', x: 20, y: 80.1, width: 10, height: 10, page: 1 },
      ];

      const lines = clusterItemsIntoLines(items);
      expect(lines.length).toBe(2);

      // First line should be header sorted left to right
      expect(lines[0].items.map((i) => i.str)).toEqual(['Item', 'Description', 'Qty']);
      // Second line should be data row
      expect(lines[1].items.map((i) => i.str)).toEqual(['1', 'Concrete works']);
    });
  });

  describe('detectPdfTableHeaders & Boundary Slicing', () => {
    it('detects bilingual header columns and calculates contiguous intervals', () => {
      const lines: PdfLine[] = [
        {
          page: 1,
          y: 20,
          items: [{ str: 'Project BOQ Summary', x: 100, y: 20, width: 150, height: 12, page: 1 }],
        },
        {
          page: 1,
          y: 50,
          items: [
            { str: 'Item Code', x: 30, y: 50, width: 40, height: 10, page: 1 },
            { str: 'Description', x: 100, y: 50, width: 80, height: 10, page: 1 },
            { str: 'Unit', x: 220, y: 50, width: 30, height: 10, page: 1 },
            { str: 'Qty', x: 270, y: 50, width: 30, height: 10, page: 1 },
            { str: 'Unit Price', x: 320, y: 50, width: 45, height: 10, page: 1 },
            { str: 'Total Amount', x: 390, y: 50, width: 50, height: 10, page: 1 },
          ],
        },
      ];

      const result = detectPdfTableHeaders(lines);
      expect(result.headerLineIdx).toBe(1);
      expect(result.mapping.itemCodeCol).toBe(0);
      expect(result.mapping.descriptionCol).toBe(1);
      expect(result.mapping.unitCol).toBe(2);
      expect(result.mapping.qtyCol).toBe(3);
      expect(result.mapping.unitPriceCol).toBe(4);
      expect(result.mapping.totalPriceCol).toBe(5);

      // Boundaries must be non-overlapping and contiguous
      for (let i = 0; i < result.columnBoundaries.length - 1; i++) {
        expect(result.columnBoundaries[i].maxX).toBe(result.columnBoundaries[i + 1].minX);
      }
    });
  });

  describe('assemblePdfBoqRows (Multi-line Stitching)', () => {
    it('stitches multi-line wrapped descriptions into a single item', () => {
      const lines: PdfLine[] = [
        // Header
        {
          page: 1,
          y: 30,
          items: [
            { str: 'No', x: 20, y: 30, width: 20, height: 10, page: 1 },
            { str: 'Description', x: 80, y: 30, width: 60, height: 10, page: 1 },
            { str: 'Unit', x: 200, y: 30, width: 25, height: 10, page: 1 },
            { str: 'Qty', x: 250, y: 30, width: 25, height: 10, page: 1 },
          ],
        },
        // Item 1 Line 1
        {
          page: 1,
          y: 60,
          items: [
            { str: '1.01', x: 20, y: 60, width: 20, height: 10, page: 1 },
            { str: 'Excavation in open soil', x: 80, y: 60, width: 80, height: 10, page: 1 },
            { str: 'm3', x: 200, y: 60, width: 20, height: 10, page: 1 },
            { str: '500', x: 250, y: 60, width: 20, height: 10, page: 1 },
          ],
        },
        // Item 1 Line 2 (Continuation)
        {
          page: 1,
          y: 75,
          items: [
            { str: 'including dewatering and cart away', x: 80, y: 75, width: 90, height: 10, page: 1 },
          ],
        },
        // Item 1 Line 3 (Continuation)
        {
          page: 1,
          y: 90,
          items: [
            { str: 'to approved public dump site', x: 80, y: 90, width: 80, height: 10, page: 1 },
          ],
        },
        // Item 2
        {
          page: 1,
          y: 110,
          items: [
            { str: '1.02', x: 20, y: 110, width: 20, height: 10, page: 1 },
            { str: 'Plain concrete footings', x: 80, y: 110, width: 80, height: 10, page: 1 },
            { str: 'm3', x: 200, y: 110, width: 20, height: 10, page: 1 },
            { str: '120', x: 250, y: 110, width: 20, height: 10, page: 1 },
          ],
        },
      ];

      const { headerLineIdx, columnBoundaries } = detectPdfTableHeaders(lines);
      const rows = assemblePdfBoqRows(lines, headerLineIdx, columnBoundaries);

      expect(rows.length).toBe(2);
      expect(rows[0].itemCode).toBe('1.01');
      expect(rows[0].description).toBe(
        'Excavation in open soil including dewatering and cart away to approved public dump site'
      );
      expect(rows[0].unit).toBe('m3');
      expect(rows[0].quantity).toBe('500');

      expect(rows[1].itemCode).toBe('1.02');
      expect(rows[1].description).toBe('Plain concrete footings');
    });
  });

  describe('End-to-End parseBoqPdf with Real Synthetic PDF', () => {
    it('generates a digital BOQ PDF with jsPDF and parses it with 100% fidelity', async () => {
      const doc = new jsPDF();

      // Header row
      doc.text('No.', 15, 20);
      doc.text('Description of Works', 40, 20);
      doc.text('Unit', 120, 20);
      doc.text('Qty', 140, 20);
      doc.text('Rate', 160, 20);
      doc.text('Total', 185, 20);

      // Item 1: Multi-line
      doc.text('CIV-01', 15, 30);
      doc.text('Excavation in all types of soil', 40, 30);
      doc.text('m3', 120, 30);
      doc.text('450', 140, 30);
      doc.text('55', 160, 30);
      doc.text('24750', 185, 30);

      doc.text('including disposal to approved dump site', 40, 40);

      // Item 2: Concrete
      doc.text('CIV-02', 15, 50);
      doc.text('Plain concrete footings 250 kg/cm2', 40, 50);
      doc.text('m3', 120, 50);
      doc.text('80', 140, 50);
      doc.text('1200', 160, 50);
      doc.text('96000', 185, 50);

      // Summary Row (should be automatically filtered)
      doc.text('Total Summary', 40, 65);
      doc.text('120750', 185, 65);

      const arrayBuffer = doc.output('arraybuffer');
      const result = await parseBoqPdf(arrayBuffer);

      expect(result.rows.length).toBe(2);
      expect(result.validCount).toBe(2);

      // First item
      const item1 = result.rows[0];
      expect(item1.itemCode).toBe('CIV-01');
      expect(item1.description).toContain('Excavation in all types of soil');
      expect(item1.description).toContain('including disposal to approved dump site');
      expect(item1.unit).toBe('m3');
      expect(item1.contractQty).toBe(450);
      expect(item1.unitPrice).toBe(55);
      expect(item1.totalPrice).toBe(24750);
      expect(item1.category).toBe('civil_concrete');
      expect(item1.status).toBe('ready');

      // Second item
      const item2 = result.rows[1];
      expect(item2.itemCode).toBe('CIV-02');
      expect(item2.description).toBe('Plain concrete footings 250 kg/cm2');
      expect(item2.unit).toBe('m3');
      expect(item2.contractQty).toBe(80);
      expect(item2.unitPrice).toBe(1200);
      expect(item2.totalPrice).toBe(96000);
      expect(item2.category).toBe('civil_concrete');
      expect(item2.status).toBe('ready');

      // Financials
      expect(result.totalContractValue).toBe(24750 + 96000);

      // Re-extraction with custom mapping
      const reExtracted = reExtractBoqPdfWithCustomMapping(result.rawMatrix, result.columnMapping);
      expect(reExtracted.rows.length).toBe(2);
      expect(reExtracted.validCount).toBe(2);
    });
  });
});
