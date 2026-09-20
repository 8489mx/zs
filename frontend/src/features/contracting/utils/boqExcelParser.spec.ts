import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import {
  detectHeaderRow,
  extractBoqRows,
  normalizeUnit,
  classifyTradeFromDescription,
  isSummaryOrTotalRow,
  parseBoqWorkbook,
} from './boqExcelParser';

describe('Universal Smart BOQ Excel Parser Engine', () => {
  it('should normalize units correctly in Arabic and English', () => {
    expect(normalizeUnit('m3')).toBe('m3');
    expect(normalizeUnit('cum')).toBe('m3');
    expect(normalizeUnit('متر مكعب')).toBe('m3');
    expect(normalizeUnit('sqm')).toBe('m2');
    expect(normalizeUnit('m2')).toBe('m2');
    expect(normalizeUnit('متر مربع')).toBe('m2');
    expect(normalizeUnit('lm')).toBe('m');
    expect(normalizeUnit('linear meter')).toBe('m');
    expect(normalizeUnit('متر طولي')).toBe('m');
    expect(normalizeUnit('pcs')).toBe('item');
    expect(normalizeUnit('each')).toBe('item');
    expect(normalizeUnit('ea')).toBe('item');
    expect(normalizeUnit('حبه')).toBe('item');
    expect(normalizeUnit('lump sum')).toBe('ls');
    expect(normalizeUnit('ls')).toBe('ls');
    expect(normalizeUnit('مقطوعية')).toBe('ls');
  });

  it('should classify engineering trades automatically from description', () => {
    expect(classifyTradeFromDescription('أعمال حفر وردم للأساسات بالموقع')).toBe('civil_concrete');
    expect(classifyTradeFromDescription('Reinforced concrete for foundations and columns')).toBe('civil_concrete');
    expect(classifyTradeFromDescription('توريد وتركيب بلاط سيراميك للأرضيات')).toBe('architecture_finishes');
    expect(classifyTradeFromDescription('Internal wall painting and plastering works')).toBe('architecture_finishes');
    expect(classifyTradeFromDescription('شبكة تغذية مياه ومواسير صرف صحي')).toBe('plumbing_sanitary');
    expect(classifyTradeFromDescription('Sanitary pipes and valves installation')).toBe('plumbing_sanitary');
    expect(classifyTradeFromDescription('لوحات توزيع كهربائية وكابلات إنارة')).toBe('electrical_power');
    expect(classifyTradeFromDescription('توريد وتركيب دكت التكييف المركزي ومراوح التهوية')).toBe('hvac');
    expect(classifyTradeFromDescription('Fire fighting sprinkler network and pump system')).toBe('fire_fighting');
  });

  it('should detect grand total / summary rows correctly', () => {
    expect(isSummaryOrTotalRow('Total')).toBe(true);
    expect(isSummaryOrTotalRow('Grand Total')).toBe(true);
    expect(isSummaryOrTotalRow('Sub Total')).toBe(true);
    expect(isSummaryOrTotalRow('إجمالي المقايسة')).toBe(true);
    expect(isSummaryOrTotalRow('المجموع')).toBe(true);
    expect(isSummaryOrTotalRow('مجموع البنود')).toBe(true);
    expect(isSummaryOrTotalRow('حفر في تربة رملية')).toBe(false);
  });

  it('should detect headers on Row 3 (index 2) when top rows contain metadata', () => {
    const mockMatrix = [
      ['شركة المقاولات المتحدة - مشروع إنشاء برج الرياض'],
      ['استشاري المشروع: دار الهندسة', '', 'تاريخ الطرح: 2026-09-11'],
      ['Item No', 'Description of Works', 'Unit', 'Qty', 'Unit Rate', 'Total Amount'],
      ['1.1', 'Excavation in all types of soil', 'm3', '1500', '45', '67500'],
      ['1.2', 'Plain concrete blinding 10cm', 'm3', '250', '850', '212500'],
      ['1.3', 'Unpriced tender item for variation', 'm2', '100', '0', '0'],
      ['', 'Total Amount', '', '', '', '280000'],
    ];

    const { headerRowIdx, mapping } = detectHeaderRow(mockMatrix);
    expect(headerRowIdx).toBe(2);
    expect(mapping.itemCodeCol).toBe(0);
    expect(mapping.descriptionCol).toBe(1);
    expect(mapping.unitCol).toBe(2);
    expect(mapping.qtyCol).toBe(3);
    expect(mapping.unitPriceCol).toBe(4);
    expect(mapping.totalPriceCol).toBe(5);

    const rows = extractBoqRows(mockMatrix, headerRowIdx, mapping);
    // Should extract 3 data rows and ignore the total row
    expect(rows.length).toBe(3);

    // Row 1
    expect(rows[0].itemCode).toBe('1.1');
    expect(rows[0].description).toBe('Excavation in all types of soil');
    expect(rows[0].unit).toBe('m3');
    expect(rows[0].contractQty).toBe(1500);
    expect(rows[0].unitPrice).toBe(45);
    expect(rows[0].status).toBe('ready');
    expect(rows[0].isValid).toBe(true);

    // Row 3 (Unpriced tender item)
    expect(rows[2].description).toBe('Unpriced tender item for variation');
    expect(rows[2].unitPrice).toBe(0);
    expect(rows[2].status).toBe('unpriced');
    expect(rows[2].isValid).toBe(true); // Must NOT be blocked!
  });

  it('should parse real boq.hvac.xlsx project accurately', () => {
    const filePath = 'D:/BOQ/boq.hvac.xlsx';
    if (!fs.existsSync(filePath)) return;
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const { headerRowIdx, mapping } = detectHeaderRow(matrix);
    console.log('boq.hvac.xlsx HeaderRowIdx:', headerRowIdx, 'Mapping:', mapping);
    const rows = extractBoqRows(matrix, headerRowIdx, mapping);
    console.log('boq.hvac.xlsx Extracted Rows count:', rows.length);
    rows.forEach((r, idx) => {
      console.log(`Row ${idx + 1}: Code=[${r.itemCode}], Qty=[${r.contractQty}], Unit=[${r.unit}], Price=[${r.unitPrice}], Total=[${r.totalPrice}], Category=[${r.category}], Status=[${r.status}], isHeader=[${r.isSectionHeader}], isPreamble=[${r.isPreamble}], Desc=[${r.description.slice(0, 50)}]`);
    });
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should handle Arabic sheets with colloquial headers and Hindi numerals', () => {
    const mockMatrix = [
      ['مشروع فيلا سكنية - جدة'],
      ['رقم', 'بيان الأعمال والمواصفات', 'وحدة القياس', 'الكمية', 'سعر الفئة'],
      ['١', 'أعمال خرسانة مسلحة للأسقف', 'متر مكعب', '١٢٠', '٣٥٠٠'],
      ['٢', 'توريد وتركيب رخام تريستا', 'متر مربع', '٢٥٠', '٤٥٠'],
      ['', 'الإجمالي العام', '', '', '٥٣٢٥٠٠'],
    ];

    const { headerRowIdx, mapping } = detectHeaderRow(mockMatrix);
    expect(headerRowIdx).toBe(1);

    const rows = extractBoqRows(mockMatrix, headerRowIdx, mapping);
    expect(rows.length).toBe(2);
    expect(rows[0].contractQty).toBe(120);
    expect(rows[0].unitPrice).toBe(3500);
    expect(rows[0].unit).toBe('m3');
    expect(rows[0].category).toBe('civil_concrete');

    expect(rows[1].contractQty).toBe(250);
    expect(rows[1].unitPrice).toBe(450);
    expect(rows[1].unit).toBe('m2');
    expect(rows[1].category).toBe('architecture_finishes');
  });

  it('should parse an actual Excel workbook buffer successfully', async () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Cover
    const wsCover = XLSX.utils.aoa_to_sheet([['غلاف المشروع والمواصفات العامة']]);
    XLSX.utils.book_append_sheet(wb, wsCover, 'Cover');

    // Sheet 2: BOQ
    const wsBoq = XLSX.utils.aoa_to_sheet([
      ['بيانات مقايسة الأعمال'],
      ['كود البند', 'بيان الأعمال', 'الوحدة', 'الكمية', 'سعر الوحدة'],
      ['CIV-01', 'أعمال خرسانة مسلحة للأعمدة', 'م3', 50, 4200],
      ['ARC-01', 'دهانات بلاستيك جوتن داخلية', 'م2', 800, 75],
    ]);
    XLSX.utils.book_append_sheet(wb, wsBoq, 'BOQ');

    const wbBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const file = new File([wbBuffer], 'Tender_BOQ.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const result = await parseBoqWorkbook(file);
    // Should auto-select sheet 'BOQ' because of score
    expect(result.selectedSheet).toBe('BOQ');
    expect(result.rows.length).toBe(2);
    expect(result.validCount).toBe(2);
    expect(result.totalContractValue).toBe(50 * 4200 + 800 * 75);
  });

  it('should identify CSI Division and Section headers with 0 quantity and price', () => {
    const mockMatrix = [
      ['Item', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
      ['', 'DIVISION 07 THERMAL AND MOISTURE PROTECTION', '', '', '', ''],
      ['', 'Section 075213 "App-Modified Bituminous Membrane Roofing"', '', '0', '0', '0'],
      ['1.1', '4mm Waterproofing membrane for roof', 'm2', '1250', '85', '106250'],
    ];

    const { headerRowIdx, mapping } = detectHeaderRow(mockMatrix);
    const rows = extractBoqRows(mockMatrix, headerRowIdx, mapping);

    expect(rows.length).toBe(3);
    // Division header
    expect(rows[0].isSectionHeader).toBe(true);
    expect(rows[0].isValid).toBe(false);

    // Section header
    expect(rows[1].isSectionHeader).toBe(true);
    expect(rows[1].isValid).toBe(false);

    // Real work item
    expect(rows[2].isSectionHeader).toBe(false);
    expect(rows[2].isValid).toBe(true);
    expect(rows[2].contractQty).toBe(1250);
    expect(rows[2].unitPrice).toBe(85);
  });

  it('should detect preamble and note rows without quantity, price, or unit', () => {
    const mockMatrix = [
      ['Item', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
      ['', 'Supply and apply 50mm thick extruded polystyrene thermal insulation', '', '', '', ''],
      ['NOTE', 'Owner will supply all ceramic tiles directly', '', '0', '0', '0'],
      ['8/1/1', 'CW type (01); size (2000x2650)mm', 'No.', '2', '0', '0'],
    ];

    const { headerRowIdx, mapping } = detectHeaderRow(mockMatrix);
    const rows = extractBoqRows(mockMatrix, headerRowIdx, mapping);

    expect(rows.length).toBe(3);
    // Row 0: General specification preamble
    expect(rows[0].isPreamble).toBe(true);
    expect(rows[0].isSectionHeader).toBe(false);

    // Row 1: Note preamble
    expect(rows[1].isPreamble).toBe(true);

    // Row 2: Physical item with quantity and unit (even if unpriced)
    expect(rows[2].isPreamble).toBe(false);
    expect(rows[2].contractQty).toBe(2);
    expect(rows[2].unit).toBe('item');
    expect(rows[2].status).toBe('unpriced');
  });

  it('should parse 1.xls (Fire Fighting project) and auto-price 100% of physical items', () => {
    const filePath = 'D:/BOQ/1.xls';
    if (!fs.existsSync(filePath)) return;
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const { headerRowIdx, mapping } = detectHeaderRow(matrix);
    const rows = extractBoqRows(matrix, headerRowIdx, mapping);
    const validWorkRows = rows.filter((r) => r.isValid && !r.isPreamble && !r.isSectionHeader);
    
    console.log('1.xls valid items count:', validWorkRows.length);
    validWorkRows.forEach((r, idx) => {
      console.log(`1.xls [${idx + 1}] Code=[${r.itemCode}], Price=[${r.unitPrice}], Cat=[${r.category}], Status=[${r.status}], Desc=[${r.description.slice(0, 45)}]`);
      expect(r.unitPrice).toBeGreaterThan(0);
      expect(r.category).toBe('fire_fighting');
      expect(r.status).toBe('ready');
    });
  });

  it('should parse 2.xls (Electrical 24kV Infrastructure) accurately', () => {
    const filePath = 'D:/BOQ/2.xls';
    if (!fs.existsSync(filePath)) return;
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const { headerRowIdx, mapping } = detectHeaderRow(matrix);
    const rows = extractBoqRows(matrix, headerRowIdx, mapping);
    const validWorkRows = rows.filter((r) => r.isValid && !r.isPreamble && !r.isSectionHeader);
    
    console.log('2.xls valid items count:', validWorkRows.length);
    validWorkRows.forEach((r, idx) => {
      console.log(`2.xls [${idx + 1}] Code=[${r.itemCode}], Price=[${r.unitPrice}], Cat=[${r.category}], Desc=[${r.description.slice(0, 45)}]`);
      expect(r.category).toBe('electrical_power');
      expect(r.contractQty).toBeGreaterThan(0);
      expect(r.unitPrice).toBeGreaterThan(0);
    });
  });

  it('should parse ELEC BOQ - Resedential building (RM).xlsx accurately', () => {
    const filePath = 'D:/BOQ/ELEC BOQ - Resedential building (RM).xlsx';
    if (!fs.existsSync(filePath)) return;
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const { headerRowIdx, mapping } = detectHeaderRow(matrix);
    const rows = extractBoqRows(matrix, headerRowIdx, mapping);
    const validWorkRows = rows.filter((r) => r.isValid && !r.isPreamble && !r.isSectionHeader);
    
    expect(validWorkRows.length).toBeGreaterThan(0);
    const readyOrPriced = validWorkRows.filter((r) => r.unitPrice > 0 || r.status === 'ready' || r.status === 'unpriced');
    expect(readyOrPriced.length).toBe(validWorkRows.length);
  });

  it('should parse PL - BOQ - RM.xlsx (Residential Plumbing) accurately', () => {
    const filePath = 'D:/BOQ/PL - BOQ - RM.xlsx';
    if (!fs.existsSync(filePath)) return;
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const { headerRowIdx, mapping } = detectHeaderRow(matrix);
    const rows = extractBoqRows(matrix, headerRowIdx, mapping);
    const validWorkRows = rows.filter((r) => r.isValid && !r.isPreamble && !r.isSectionHeader);
    
    console.log('PL - BOQ - RM.xlsx valid items count:', validWorkRows.length);
    validWorkRows.forEach((r, idx) => {
      console.log(`PL [${idx + 1}] Code=[${r.itemCode}], Price=[${r.unitPrice}], Cat=[${r.category}], Desc=[${r.description.slice(0, 45)}]`);
    });
    expect(validWorkRows.length).toBeGreaterThan(0);
  });

  it('should parse Residentioal Building BoQ.xlsx (Light Current LC BOQ) and auto-price items including call station and modules', () => {
    const filePath = 'D:/BOQ/Residentioal Building BoQ.xlsx';
    if (!fs.existsSync(filePath)) return;
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets['LC BOQ'];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const { headerRowIdx, mapping } = detectHeaderRow(matrix);
    const rows = extractBoqRows(matrix, headerRowIdx, mapping);
    const validWorkRows = rows.filter((r) => r.isValid && !r.isPreamble && !r.isSectionHeader);
    
    console.log('Residentioal Building BoQ.xlsx valid items count:', validWorkRows.length);
    validWorkRows.forEach((r, idx) => {
      console.log(`LC [${idx + 1}] Code=[${r.itemCode}], Price=[${r.unitPrice}], Cat=[${r.category}], Status=[${r.status}], Desc=[${r.description.slice(0, 50)}]`);
    });
    
    const callStationItem = validWorkRows.find((r) => r.description.toLowerCase().includes('manual call station'));
    expect(callStationItem).toBeDefined();
    expect(callStationItem?.unitPrice).toBeGreaterThan(0);
    expect(callStationItem?.category).toBe('low_current');

    const controlModuleItem = validWorkRows.find((r) => r.description.toLowerCase().includes('control modules for evacuation'));
    expect(controlModuleItem).toBeDefined();
    expect(controlModuleItem?.unitPrice).toBeGreaterThan(0);
    expect(controlModuleItem?.category).toBe('low_current');
  });
});


