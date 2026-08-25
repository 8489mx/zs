/**
 * Arabic to English Keyboard Remapper & Invoice Barcode Normalizer
 * Translates scanner keystrokes entered while the OS keyboard layout is set to Arabic.
 */

const ARABIC_TO_ENGLISH_MAP: Record<string, string> = {
  // Arabic Letters
  'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p', 'ج': '[', 'د': ']',
  'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k', 'م': 'l', 'ك': ';', 'ط': '\'',
  'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm', 'و': ',', 'ز': '.', 'ظ': '/',
  // Capital / Shift letters on Arabic keyboard
  'َ': 'Q', 'ً': 'W', 'ُ': 'E', 'ٌ': 'R', 'لإ': 'T', 'إ': 'Y', '‘': 'U', '÷': 'I', '×': 'O', '؛': 'P',
  'ِ': 'A', 'ٍ': 'S', 'لأ': 'G', 'أ': 'H', 'ـ': 'J', '،': 'K',
  '~': 'Z', 'ْ': 'X', 'لآ': 'B', 'آ': 'N', '؟': '?',
  // Arabic digits
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function remapArabicKeyboardToEnglish(input: string): string {
  if (!input) return '';
  let result = '';
  for (let i = 0; i < input.length; i++) {
    // Check for two-character ligature 'لا' or 'لأ' or 'لإ' or 'لآ'
    if (i + 1 < input.length) {
      const pair = input.substring(i, i + 2);
      if (ARABIC_TO_ENGLISH_MAP[pair]) {
        result += ARABIC_TO_ENGLISH_MAP[pair];
        i++;
        continue;
      }
    }
    const char = input[i];
    result += ARABIC_TO_ENGLISH_MAP[char] !== undefined ? ARABIC_TO_ENGLISH_MAP[char] : char;
  }
  return result;
}

export function stripSeparators(input: string): string {
  return String(input || '')
    .replace(/[\/\-_.\s\\]/g, '')
    .trim()
    .toLowerCase();
}

export function isInvoiceBarcodeQuery(raw: string): boolean {
  const query = String(raw || '').trim();
  if (!query) return false;
  const remapped = remapArabicKeyboardToEnglish(query).trim().toUpperCase();

  // Matches invoice patterns like Z-260825-0011, Z/260825/0011, INV-1234, 260825-0011, Z2608250011
  if (/^Z[-/_.]?\d+/i.test(remapped) || /^INV[-/_.]?\d+/i.test(remapped)) return true;
  if (/^\d{6,}[-/_.]\d+/.test(remapped)) return true;
  if (/^[A-Za-z]+[-/_]\d+/.test(remapped)) return true;
  if (/^Z/i.test(remapped) && remapped.length >= 6) return true;
  if (/^ZL\d+/i.test(remapped) && remapped.length >= 6) return true;
  // Also check if raw contained Arabic 'ئ' or 'ظ' (mapped to Z)
  if (/^[ئظ][-/_.]?\d+/i.test(query)) return true;

  return false;
}

export function getNormalizedInvoiceSearchTerms(raw: string): string[] {
  const original = String(raw || '').trim();
  if (!original) return [];
  const remapped = remapArabicKeyboardToEnglish(original).trim();
  const strippedRemapped = stripSeparators(remapped);
  const strippedOriginal = stripSeparators(original);

  const terms = new Set<string>();
  if (original) terms.add(original);
  if (remapped) terms.add(remapped);
  if (strippedRemapped) terms.add(strippedRemapped);
  if (strippedOriginal) terms.add(strippedOriginal);

  // If query contains date pattern YYMMDD and sequence number (e.g. 260825 and 0011)
  const numbersMatch = remapped.match(/(\d{6})[^\d]*(\d{3,})/);
  if (numbersMatch) {
    const [, datePart, seqPart] = numbersMatch;
    terms.add(`Z-${datePart}-${seqPart}`);
    terms.add(`Z/${datePart}/${seqPart}`);
    terms.add(`${datePart}-${seqPart}`);
    terms.add(`${datePart}${seqPart}`);
    terms.add(seqPart);
  }

  // If starts with Z or Z- or Z/, extract the numeric tail
  const numericTail = remapped.replace(/^Z[-/_.]?/i, '').trim();
  if (numericTail && numericTail.length >= 3) {
    terms.add(numericTail);
  }

  return Array.from(terms).filter(Boolean);
}

export function matchesSaleDocNo(saleDocNo: string | undefined | null, query: string): boolean {
  const target = String(saleDocNo || '').trim().toLowerCase();
  const search = String(query || '').trim().toLowerCase();
  if (!target || !search) return false;

  if (target === search) return true;
  if (stripSeparators(target) === stripSeparators(search)) return true;

  const remappedSearch = remapArabicKeyboardToEnglish(search).toLowerCase();
  if (target === remappedSearch) return true;
  if (stripSeparators(target) === stripSeparators(remappedSearch)) return true;

  // Check if both contain the same numeric sequence
  const targetNums = target.replace(/\D/g, '');
  const searchNums = search.replace(/\D/g, '');
  if (targetNums && searchNums && (targetNums === searchNums || (targetNums.length >= 6 && searchNums.includes(targetNums)) || (searchNums.length >= 6 && targetNums.includes(searchNums)))) {
    return true;
  }

  return false;
}

/**
 * Live sanitizer for search input:
 * If the user/scanner enters an invoice barcode with Arabic keyboard layout
 * (e.g. starting with 'ئ' or 'ظ' or containing barcode sequences),
 * it converts it live to clean English (e.g. 'Z-260825-0011').
 */
export function sanitizeSearchInputLive(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^[ئظ][\/\-_.\s\d]/i.test(trimmed) || /^[ئظ]\d/i.test(trimmed)) {
    const remapped = remapArabicKeyboardToEnglish(input);
    if (/^z[-/_.]?\d+/i.test(remapped)) {
      return remapped.replace(/^z/i, 'Z').replace(/[\/]/g, '-');
    }
    return remapped;
  }
  if (/^z[\/\-_.]\d+[\/\-_.]\d+/i.test(trimmed)) {
    return trimmed.replace(/^z/i, 'Z').replace(/[\/]/g, '-');
  }
  return input;
}
