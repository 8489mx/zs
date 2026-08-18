/**
 * Standalone pure-TypeScript QR Code Generator (SVG output)
 * Zero external dependencies, offline-first.
 */

// Galois field tables for GF(256)
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11d;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

function gfPolyMul(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return result;
}

function getGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    poly = gfPolyMul(poly, [1, GF256_EXP[i]]);
  }
  return poly;
}

function calculateEcc(data: number[], eccLength: number): number[] {
  const genPoly = getGeneratorPoly(eccLength);
  const infoPoly = [...data, ...new Array(eccLength).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const factor = infoPoly[i];
    if (factor !== 0) {
      for (let j = 0; j < genPoly.length; j++) {
        infoPoly[i + j] ^= gfMul(genPoly[j], factor);
      }
    }
  }
  return infoPoly.slice(data.length);
}

// Version table capacities (Byte mode, Level M)
// [version, totalDataCodewords, eccCodewordsPerBlock, numBlocks]
const QR_TABLE_M: [number, number, number, number][] = [
  [1, 16, 10, 1],
  [2, 28, 16, 1],
  [3, 44, 26, 1],
  [4, 64, 18, 2],
  [5, 86, 24, 2],
  [6, 108, 16, 4],
  [7, 124, 18, 4],
  [8, 154, 22, 4],
  [9, 180, 22, 5],
  [10, 216, 26, 5],
];

// Alignment pattern positions for versions 1..10
const ALIGNMENT_PATTERN_POS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function encodeUtf8(str: string): number[] {
  const codePoints: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let cp = str.charCodeAt(i);
    if (cp < 0x80) {
      codePoints.push(cp);
    } else if (cp < 0x800) {
      codePoints.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (next - 0xdc00);
        i++;
        codePoints.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f)
        );
      }
    } else {
      codePoints.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    }
  }
  return codePoints;
}

class BitBuffer {
  private buffer: number[] = [];
  private length = 0;

  put(num: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.putBit(((num >>> i) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }

  getBuffer(): number[] {
    return this.buffer;
  }

  getLength(): number {
    return this.length;
  }
}

export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes = encodeUtf8(text);
  const dataLen = utf8Bytes.length;

  let chosenTable = QR_TABLE_M[0];
  for (const row of QR_TABLE_M) {
    const [ver, totalData] = row;
    const countBits = ver <= 9 ? 8 : 16;
    const requiredBits = 4 + countBits + dataLen * 8;
    if (requiredBits <= totalData * 8) {
      chosenTable = row;
      break;
    }
  }

  const [version, totalDataBytes, eccPerBlock, numBlocks] = chosenTable;
  const size = 17 + version * 4;

  const bb = new BitBuffer();
  // Byte mode indicator: 0100
  bb.put(4, 4);
  // Character count
  const countBits = version <= 9 ? 8 : 16;
  bb.put(dataLen, countBits);
  // Data
  for (const b of utf8Bytes) {
    bb.put(b, 8);
  }

  // Terminator (up to 4 bits)
  const maxBits = totalDataBytes * 8;
  const termBits = Math.min(4, maxBits - bb.getLength());
  bb.put(0, termBits);

  // Align to byte boundary
  while (bb.getLength() % 8 !== 0) {
    bb.putBit(false);
  }

  // Pad bytes 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bb.getLength() < maxBits) {
    bb.put(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const rawData = bb.getBuffer().slice(0, totalDataBytes);

  // Block splitting and ECC
  const blockSize = Math.floor(totalDataBytes / numBlocks);
  const blocks: number[][] = [];
  const eccBlocks: number[][] = [];

  let offset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const isLarger = b >= numBlocks - (totalDataBytes % numBlocks);
    const curBlockLen = isLarger ? blockSize + 1 : blockSize;
    const chunk = rawData.slice(offset, offset + curBlockLen);
    offset += curBlockLen;
    blocks.push(chunk);
    eccBlocks.push(calculateEcc(chunk, eccPerBlock));
  }

  // Interleave data codewords
  const interleaved: number[] = [];
  const maxBlockLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < blocks[b].length) {
        interleaved.push(blocks[b][i]);
      }
    }
  }

  // Interleave ECC codewords
  for (let i = 0; i < eccPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      interleaved.push(eccBlocks[b][i]);
    }
  }

  // Initialize Matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null)
  );

  function setFinderPattern(r: number, c: number) {
    for (let row = -1; row <= 7; row++) {
      for (let col = -1; col <= 7; col++) {
        const nr = r + row;
        const nc = c + col;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (
          (row >= 0 && row <= 6 && (col === 0 || col === 6)) ||
          (col >= 0 && col <= 6 && (row === 0 || row === 6)) ||
          (row >= 2 && row <= 4 && col >= 2 && col <= 4)
        ) {
          matrix[nr][nc] = true;
        } else {
          matrix[nr][nc] = false;
        }
      }
    }
  }

  // Place finder patterns
  setFinderPattern(0, 0);
  setFinderPattern(0, size - 7);
  setFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Alignment patterns
  const alignCoords = ALIGNMENT_PATTERN_POS[version] || [];
  for (const r of alignCoords) {
    for (const c of alignCoords) {
      if (matrix[r][c] !== null) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (
            Math.abs(dr) === 2 ||
            Math.abs(dc) === 2 ||
            (dr === 0 && dc === 0)
          ) {
            matrix[r + dr][c + dc] = true;
          } else {
            matrix[r + dr][c + dc] = false;
          }
        }
      }
    }
  }

  // Dark module
  matrix[4 * version + 9][8] = true;

  // Format info area reservation
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false;
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false;
  }

  // Place data bits with Mask 0 ( (row + col) % 2 == 0 )
  let bitIdx = 0;
  const bitArray: boolean[] = [];
  for (const byte of interleaved) {
    for (let b = 7; b >= 0; b--) {
      bitArray.push(((byte >>> b) & 1) === 1);
    }
  }

  let inc = -1;
  let col = size - 1;
  while (col > 0) {
    if (col === 6) col--;
    let row = inc < 0 ? size - 1 : 0;
    while (row >= 0 && row < size) {
      for (let c = 0; c < 2; c++) {
        const curCol = col - c;
        if (matrix[row][curCol] === null) {
          let bit = bitIdx < bitArray.length ? bitArray[bitIdx++] : false;
          // Apply mask 0: (row + curCol) % 2 === 0
          if ((row + curCol) % 2 === 0) {
            bit = !bit;
          }
          matrix[row][curCol] = bit;
        }
      }
      row += inc;
    }
    inc = -inc;
    col -= 2;
  }

  // Format bits for Level M (00) and Mask 0 (000) -> 00 000 -> with BCH -> 0x5412 ^ 0x4a43
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  // Write format info
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

  return matrix.map((row) => row.map((cell) => cell === true));
}

/**
 * Builds an SVG string representing a crisp QR code.
 */
export function buildQrSvg(text: string, options: { size?: number; quietZone?: number; color?: string; bgColor?: string } = {}): string {
  const { size = 120, quietZone = 2, color = '#000000', bgColor = '#ffffff' } = options;
  if (!text || !text.trim()) return '';

  try {
    const matrix = generateQrMatrix(text);
    const count = matrix.length;
    const totalCount = count + quietZone * 2;
    const cellSize = size / totalCount;

    const rects: string[] = [];
    if (bgColor && bgColor !== 'transparent') {
      rects.push(`<rect width="${size}" height="${size}" fill="${bgColor}" />`);
    }

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (matrix[r][c]) {
          const x = (c + quietZone) * cellSize;
          const y = (r + quietZone) * cellSize;
          rects.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${color}" />`);
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-label="QR Code">${rects.join('')}</svg>`;
  } catch (error) {
    console.error('QR code generation failed:', error);
    return '';
  }
}
