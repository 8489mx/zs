/**
 * Adaptive Studio Gradient Matting Engine (Z-Studio Matting v2.2)
 * 100% Client-side HTML5 Canvas execution (0ms Server Overhead / Zero VPS Load / 0MB Bundle Addition).
 *
 * Capabilities:
 * 1. Bilinear Studio Gradient Modeling: Outlier-resistant ambient illumination gradient interpolation
 *    (pure white #FFF fading down to subtle table tone #F0F0F0).
 * 2. Perceptual Weighted Delta-E: respects human optical color sensitivity
 *    sqrt(2*ΔR² + 4*ΔG² + 3*ΔB²) to protect glass reflections, gold foil, and metallic edges.
 * 3. Directional Floor Contact Shadow Annihilation: Confined strictly to the horizontal ground plane
 *    (y > height * 0.82), permitting neutral contact shadows (lum >= 115, dist <= 240) to be swallowed
 *    without penetrating transparent glass bottles, perfume labels, or clear liquids from the sides.
 * 4. Ambient Drop Shadow & Margin Cleanliness: Removes soft floating studio drop shadows on white box borders.
 * 5. Sub-pixel Alpha Decontamination (Defringing): Un-premultiplies edge pixels against the ambient
 *    backdrop model, removing the 1-pixel white halo when placed on dark or saturated storefront cards.
 * 6. Isolated Stray Island Pruning: Cleans up floating 1-2 pixel noise artifacts.
 */

export interface BackgroundKnockoutOptions {
  /** Maximum color distance to be considered pure background (default: 28) */
  pureThreshold?: number;
  /** Maximum color distance for smooth feathering transition (default: 55) */
  featherThreshold?: number;
  /** Maximum color distance for neutral studio ambient & drop shadow suppression (default: 85) */
  shadowThreshold?: number;
  /** Maximum allowed delta between R, G, B for a color to be considered neutral studio backdrop (default: 18) */
  neutralTolerance?: number;
  /** Vertical boundary factor where floor contact shadow suppression begins (default: 0.82 = last 18% of image) */
  floorContactDepth?: number;
  /** Minimum luminance allowed for floor contact shadows in the floor plane (default: 115) */
  minFloorLum?: number;
  /** Maximum color distance allowed for floor contact shadows (default: 240) */
  maxFloorDist?: number;
  /** Whether to decontaminate (un-premultiply) semi-transparent edge pixels to eliminate white halo (default: true) */
  decontaminateEdges?: boolean;
}

export interface LccFilterOptions {
  /** Minimum alpha to consider a pixel as foreground (default: 30) */
  minAlpha?: number;
  /** Minimum ratio of largest component size to retain secondary components (default: 0.12 = 12%) */
  minSecondaryRatio?: number;
  /** Minimum absolute pixel count for a secondary component (default: 500) */
  minSecondaryPixels?: number;
  /** Minimum average alpha for a component to be considered a solid subject (default: 160) */
  minSecondaryAvgAlpha?: number;
  /** Prune secondary components that touch the canvas border (default: true) */
  pruneBorderTouchingSecondary?: boolean;
}

export interface DefringeOptions {
  sampledBgColor?: { r: number; g: number; b: number };
  minFringeAlpha?: number;
  maxFringeAlpha?: number;
  tightenAlpha?: boolean;
}

/**
 * Sever faint alpha dust (< 35) and semi-transparent neutral studio haze bridges.
 * This disconnects false-positive glare/mist clusters from the main product body before CCA.
 */
export function severHazeBridgesAndFaintDust(
  data: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const totalPixels = width * height;
  for (let i = 0; i < totalPixels; i++) {
    const p = i * 4;
    const a = data[p + 3];
    if (a === 0) continue;

    // Faint alpha dust: clear immediately
    if (a < 35) {
      data[p + 3] = 0;
      continue;
    }

    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const chroma = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    const lum = (r * 2 + g * 3 + b) / 6;

    // Neutral studio background haze / glare bridge:
    // Bright neutral white/grey (lum >= 185, chroma <= 16) and semi-transparent (a < 140)
    if (a < 140 && lum >= 185 && chroma <= 16) {
      data[p + 3] = 0;
    }
  }
}

/**
 * Largest Connected Component (LCC) / Subject Isolation Filter
 * Identifies all connected components of foreground pixels via 4-way BFS.
 * Retains the largest component (the main product) and any substantial, solid secondary components
 * (e.g. pair of shoes, bottle cap), while wiping out any floating mist, clouds, or corner glare.
 */
export function filterLargestConnectedComponents(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: LccFilterOptions = {}
): { componentsFound: number; componentsKept: number; largestSize: number } {
  const {
    minAlpha = 30,
    minSecondaryRatio = 0.12,
    minSecondaryPixels = 500,
    minSecondaryAvgAlpha = 160,
    pruneBorderTouchingSecondary = true,
  } = options;

  const totalPixels = width * height;
  if (totalPixels <= 0) return { componentsFound: 0, componentsKept: 0, largestSize: 0 };

  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  const compLabels = new Int32Array(totalPixels);

  interface ComponentMeta {
    id: number;
    count: number;
    touchesBorder: boolean;
    sumAlpha: number;
  }

  const components: ComponentMeta[] = [];
  let nextCompId = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || data[idx * 4 + 3] < minAlpha) continue;

      let qHead = 0;
      let qTail = 0;
      queue[qTail++] = idx;
      visited[idx] = 1;
      compLabels[idx] = nextCompId;

      let count = 0;
      let touchesBorder = (x === 0 || x === width - 1 || y === 0 || y === height - 1);
      let sumAlpha = 0;

      while (qHead < qTail) {
        const curr = queue[qHead++];
        count++;
        const cx = curr % width;
        const cy = (curr / width) | 0;

        sumAlpha += data[curr * 4 + 3];

        if (cx === 0 || cx === width - 1 || cy === 0 || cy === height - 1) {
          touchesBorder = true;
        }

        const n1 = cx > 0 ? curr - 1 : -1;
        const n2 = cx < width - 1 ? curr + 1 : -1;
        const n3 = cy > 0 ? curr - width : -1;
        const n4 = cy < height - 1 ? curr + width : -1;

        if (n1 !== -1 && !visited[n1] && data[n1 * 4 + 3] >= minAlpha) {
          visited[n1] = 1;
          compLabels[n1] = nextCompId;
          queue[qTail++] = n1;
        }
        if (n2 !== -1 && !visited[n2] && data[n2 * 4 + 3] >= minAlpha) {
          visited[n2] = 1;
          compLabels[n2] = nextCompId;
          queue[qTail++] = n2;
        }
        if (n3 !== -1 && !visited[n3] && data[n3 * 4 + 3] >= minAlpha) {
          visited[n3] = 1;
          compLabels[n3] = nextCompId;
          queue[qTail++] = n3;
        }
        if (n4 !== -1 && !visited[n4] && data[n4 * 4 + 3] >= minAlpha) {
          visited[n4] = 1;
          compLabels[n4] = nextCompId;
          queue[qTail++] = n4;
        }
      }

      components.push({
        id: nextCompId,
        count,
        touchesBorder,
        sumAlpha,
      });

      nextCompId++;
    }
  }

  if (components.length === 0) {
    return { componentsFound: 0, componentsKept: 0, largestSize: 0 };
  }

  let largest = components[0];
  for (let i = 1; i < components.length; i++) {
    if (components[i].count > largest.count) {
      largest = components[i];
    }
  }

  const keepSet = new Set<number>();
  keepSet.add(largest.id);

  const dynamicMinPixels = Math.min(minSecondaryPixels, Math.round(largest.count * 0.10));
  const minCountToKeep = Math.max(dynamicMinPixels, Math.round(largest.count * minSecondaryRatio));

  for (const comp of components) {
    if (comp.id === largest.id) continue;

    const avgAlpha = comp.count > 0 ? comp.sumAlpha / comp.count : 0;
    const isSolid = avgAlpha >= minSecondaryAvgAlpha;
    const isBigEnough = comp.count >= minCountToKeep;
    const borderOk = !pruneBorderTouchingSecondary || !comp.touchesBorder || comp.count >= largest.count * 0.45;

    if (isSolid && isBigEnough && borderOk) {
      keepSet.add(comp.id);
    }
  }

  // Clear unkept component pixels
  for (let i = 0; i < totalPixels; i++) {
    const compId = compLabels[i];
    if (compId > 0 && !keepSet.has(compId)) {
      data[i * 4 + 3] = 0;
    }
  }

  return {
    componentsFound: components.length,
    componentsKept: keepSet.size,
    largestSize: largest.count,
  };
}

/**
 * Sub-pixel Alpha Decontamination & Defringing (Anti-Halo Engine)
 * Un-premultiplies edge pixels against the backdrop illumination model and
 * inpaints high-luminance neutral spill using nearest solid product pixels.
 */
export function decontaminateAndDefringeEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: DefringeOptions = {}
): number {
  const {
    sampledBgColor = { r: 255, g: 255, b: 255 },
    minFringeAlpha = 15,
    maxFringeAlpha = 245,
    tightenAlpha = true,
  } = options;

  const totalPixels = width * height;
  if (totalPixels <= 0) return 0;

  const originalAlpha = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    originalAlpha[i] = data[i * 4 + 3];
  }

  let defringedCount = 0;
  const bgR = sampledBgColor.r;
  const bgG = sampledBgColor.g;
  const bgB = sampledBgColor.b;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const a = originalAlpha[idx];
      if (a < minFringeAlpha || a > maxFringeAlpha) continue;

      let hasTransparentNeighbor = false;
      let solidNeighborIdx = -1;
      let minSolidDist = 999;

      // Scan 5x5 neighborhood (radius 2)
      for (let dy = -2; dy <= 2; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;

          const nIdx = ny * width + nx;
          const na = originalAlpha[nIdx];
          const distSq = dx * dx + dy * dy;

          if (na < minFringeAlpha && distSq <= 2) {
            hasTransparentNeighbor = true;
          }

          if (na >= 248 && distSq < minSolidDist) {
            minSolidDist = distSq;
            solidNeighborIdx = nIdx;
          }
        }
      }

      if (!hasTransparentNeighbor) continue;

      const p = idx * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const aNorm = a / 255;
      const bgWeight = 1 - aNorm;

      // 1. Un-premultiply against the background model
      const unmixedR = Math.max(0, Math.min(255, (r - bgWeight * bgR) / aNorm));
      const unmixedG = Math.max(0, Math.min(255, (g - bgWeight * bgG) / aNorm));
      const unmixedB = Math.max(0, Math.min(255, (b - bgWeight * bgB) / aNorm));

      // 2. Solid inner neighbor color inpainting for high-luminance neutral spill
      const lum = (r * 2 + g * 3 + b) / 6;
      const chroma = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));

      if (solidNeighborIdx !== -1 && lum >= 165 && chroma <= 25) {
        const sp = solidNeighborIdx * 4;
        const sR = data[sp];
        const sG = data[sp + 1];
        const sB = data[sp + 2];
        const sLum = (sR * 2 + sG * 3 + sB) / 6;

        if (lum > sLum + 15) {
          const spillWeight = Math.min(1, Math.max(0, (lum - sLum) / 75));
          data[p] = Math.round(unmixedR * (1 - spillWeight) + sR * spillWeight);
          data[p + 1] = Math.round(unmixedG * (1 - spillWeight) + sG * spillWeight);
          data[p + 2] = Math.round(unmixedB * (1 - spillWeight) + sB * spillWeight);
        } else {
          data[p] = Math.round(unmixedR);
          data[p + 1] = Math.round(unmixedG);
          data[p + 2] = Math.round(unmixedB);
        }
      } else {
        data[p] = Math.round(unmixedR);
        data[p + 1] = Math.round(unmixedG);
        data[p + 2] = Math.round(unmixedB);
      }

      // 3. Alpha tightening
      if (tightenAlpha) {
        if (a < 38) {
          data[p + 3] = 0;
        } else {
          const norm = (a - 38) / 217;
          data[p + 3] = Math.max(0, Math.min(255, Math.round(255 * Math.pow(norm, 1.1))));
        }
      }

      defringedCount++;
    }
  }

  return defringedCount;
}

export function knockoutWhiteStudioBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: BackgroundKnockoutOptions = {}
): boolean {
  if (width <= 0 || height <= 0) return false;

  const {
    pureThreshold = 25,
    featherThreshold = 45,
    shadowThreshold = 48,
    neutralTolerance = 12,
    floorContactDepth = 0.88,
    minFloorLum = 165,
    maxFloorDist = 85,
    decontaminateEdges = true,
  } = options;

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, width, height);
  } catch {
    return false;
  }

  const data = imgData.data;
  const totalPixels = width * height;

  // 1. Perimeter Anchor Check: Verify image sits on a studio backdrop
  const samplePoints: [number, number][] = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];

  let lightNeutralAnchors = 0;
  for (const [cx, cy] of samplePoints) {
    const p = (cy * width + cx) * 4;
    const a = data[p + 3];
    if (a < 10) {
      lightNeutralAnchors++;
      continue;
    }
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const chroma = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    const lum = (r * 2 + g * 3 + b) / 6;
    if (lum >= 195 && chroma <= neutralTolerance) {
      lightNeutralAnchors++;
    }
  }

  // If anchors are not predominantly studio white/light, preserve photo untouched
  if (lightNeutralAnchors < 4) {
    return false;
  }

  // 2. Bilinear Surface Illumination Profiling (Outlier-resistant)
  let topR = 0, topG = 0, topB = 0, topCount = 0;
  let btmR = 0, btmG = 0, btmB = 0, btmCount = 0;

  for (let x = 0; x < width; x++) {
    // Top border
    const t = x * 4;
    const tr = data[t];
    const tg = data[t + 1];
    const tb = data[t + 2];
    const tChroma = Math.max(Math.abs(tr - tg), Math.abs(tr - tb), Math.abs(tg - tb));
    if (tChroma <= neutralTolerance && (tr + tg + tb) / 3 >= 180) {
      topR += tr;
      topG += tg;
      topB += tb;
      topCount++;
    }

    // Bottom border
    const b = ((height - 1) * width + x) * 4;
    const br = data[b];
    const bg = data[b + 1];
    const bb = data[b + 2];
    const bChroma = Math.max(Math.abs(br - bg), Math.abs(br - bb), Math.abs(bg - bb));
    if (bChroma <= neutralTolerance && (br + bg + bb) / 3 >= 150) {
      btmR += br;
      btmG += bg;
      btmB += bb;
      btmCount++;
    }
  }

  topR = topCount > 0 ? topR / topCount : 255;
  topG = topCount > 0 ? topG / topCount : 255;
  topB = topCount > 0 ? topB / topCount : 255;

  btmR = btmCount > 0 ? btmR / btmCount : topR;
  btmG = btmCount > 0 ? btmG / btmCount : topG;
  btmB = btmCount > 0 ? btmB / btmCount : topB;

  // Bilinear model of expected background at row Y
  const getExpectedBg = (y: number) => {
    const factor = height > 1 ? y / (height - 1) : 0;
    return {
      r: topR + (btmR - topR) * factor,
      g: topG + (btmG - topG) * factor,
      b: topB + (btmB - topB) * factor,
    };
  };

  // Perceptual Euclidean distance between pixel and expected studio background
  const computeColorDist = (idx: number, bg: { r: number; g: number; b: number }) => {
    const p = idx * 4;
    const a = data[p + 3];
    if (a < 10) return 0; // Already transparent

    const dr = data[p] - bg.r;
    const dg = data[p + 1] - bg.g;
    const db = data[p + 2] - bg.b;
    return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
  };

  // Helper: check if a pixel is neutral studio backdrop or floor shadow
  const isBackdropOrShadow = (idx: number, dist: number, y: number) => {
    if (dist <= featherThreshold) return true;

    const p = idx * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const chroma = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    const lum = (r * 2 + g * 3 + b) / 6;

    if (chroma <= neutralTolerance) {
      // 1. General ambient body shadow (strict 48 to protect white boxes & glass)
      if (dist <= shadowThreshold && lum >= 175) {
        return true;
      }
      // 2. Ground contact floor shadow (relaxed to 85 at bottom 12% to eliminate white floor shelf)
      if (y > height * floorContactDepth && chroma <= 10 && dist <= maxFloorDist && lum >= minFloorLum) {
        return true;
      }
    }
    return false;
  };

  // 3. Multi-pass Boundary-Connected Flood Fill
  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let qHead = 0;
  let qTail = 0;

  const topBg = getExpectedBg(0);
  const btmBg = getExpectedBg(height - 1);

  // Push matching top & bottom perimeter pixels
  for (let x = 0; x < width; x++) {
    const tIdx = x;
    if (isBackdropOrShadow(tIdx, computeColorDist(tIdx, topBg), 0)) {
      visited[tIdx] = 1;
      queue[qTail++] = tIdx;
    }
    const bIdx = (height - 1) * width + x;
    if (!visited[bIdx] && isBackdropOrShadow(bIdx, computeColorDist(bIdx, btmBg), height - 1)) {
      visited[bIdx] = 1;
      queue[qTail++] = bIdx;
    }
  }

  // Push matching left & right perimeter pixels
  for (let y = 0; y < height; y++) {
    const bg = getExpectedBg(y);
    const lIdx = y * width;
    if (!visited[lIdx] && isBackdropOrShadow(lIdx, computeColorDist(lIdx, bg), y)) {
      visited[lIdx] = 1;
      queue[qTail++] = lIdx;
    }
    const rIdx = y * width + (width - 1);
    if (!visited[rIdx] && isBackdropOrShadow(rIdx, computeColorDist(rIdx, bg), y)) {
      visited[rIdx] = 1;
      queue[qTail++] = rIdx;
    }
  }

  // BFS Flood Fill with Floor Contact Shadow Annihilation & Defringing
  const tDiff = Math.max(1, featherThreshold - pureThreshold);

  while (qHead < qTail) {
    const curr = queue[qHead++];
    const p = curr * 4;
    const cy = (curr / width) | 0;
    const cx = curr % width;
    const bg = getExpectedBg(cy);
    const dist = computeColorDist(curr, bg);

    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const chroma = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    const lum = (r * 2 + g * 3 + b) / 6;

    const isContactShadow =
      chroma <= neutralTolerance &&
      ((dist <= shadowThreshold && lum >= 175) ||
       (cy > height * floorContactDepth && chroma <= 10 && dist <= maxFloorDist && lum >= minFloorLum));

    if (dist <= pureThreshold || isContactShadow) {
      // 100% Pure background or neutral floor shadow -> clear to alpha 0
      data[p + 3] = 0;
    } else {
      // Feathering boundary contour on product edges -> smooth cosine ramp
      const norm = Math.max(0, Math.min(1, (dist - pureThreshold) / tDiff));
      const cosineAlpha = 0.5 * (1 - Math.cos(norm * Math.PI));
      const newAlpha = Math.round(data[p + 3] * cosineAlpha);
      data[p + 3] = newAlpha;

      // Color Decontamination (Defringing / Un-premultiplying):
      // Removes white backdrop bleed from semi-transparent edges
      if (decontaminateEdges && newAlpha > 0 && newAlpha < 255) {
        const aNorm = newAlpha / 255;
        const bgWeight = 1 - aNorm;
        data[p] = Math.max(0, Math.min(255, Math.round((r - bgWeight * bg.r) / aNorm)));
        data[p + 1] = Math.max(0, Math.min(255, Math.round((g - bgWeight * bg.g) / aNorm)));
        data[p + 2] = Math.max(0, Math.min(255, Math.round((b - bgWeight * bg.b) / aNorm)));
      }
    }

    // 4 Adjacent neighbors
    const n1 = cx > 0 ? curr - 1 : -1;
    const n2 = cx < width - 1 ? curr + 1 : -1;
    const n3 = cy > 0 ? curr - width : -1;
    const n4 = cy < height - 1 ? curr + width : -1;

    for (let i = 0; i < 4; i++) {
      const n = i === 0 ? n1 : i === 1 ? n2 : i === 2 ? n3 : n4;
      if (n !== -1 && !visited[n]) {
        const ny = (n / width) | 0;
        const nBg = getExpectedBg(ny);
        const nDist = computeColorDist(n, nBg);

        if (isBackdropOrShadow(n, nDist, ny)) {
          visited[n] = 1;
          queue[qTail++] = n;
        }
      }
    }
  }

  // 4. Stray Island / Isolated Noise Pruning Pass
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const p = idx * 4;
      if (data[p + 3] > 0) {
        let transNeighbors = 0;
        if (data[((y - 1) * width + x) * 4 + 3] === 0) transNeighbors++;
        if (data[((y + 1) * width + x) * 4 + 3] === 0) transNeighbors++;
        if (data[(y * width + x - 1) * 4 + 3] === 0) transNeighbors++;
        if (data[(y * width + x + 1) * 4 + 3] === 0) transNeighbors++;
        if (transNeighbors === 4) {
          data[p + 3] = 0;
        } else if (transNeighbors >= 3 && data[p + 3] < 160) {
          data[p + 3] = 0;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return true;
}

/**
 * Auto-Trim Bounding Box: Crops away empty transparent borders around the product,
 * adding a balanced breathing padding so the product fills 88-92% of the card.
 */
export function trimCanvasTransparentBounds(
  canvas: HTMLCanvasElement,
  alphaThreshold = 25,
  paddingRatio = 0.04
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width <= 0 || canvas.height <= 0) return canvas;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const width = canvas.width;
  const height = canvas.height;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a >= alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no content found or invalid
  if (maxX < minX || maxY < minY) return canvas;

  const prodW = maxX - minX + 1;
  const prodH = maxY - minY + 1;

  // Add symmetrical breathing padding
  const pad = Math.max(6, Math.round(Math.max(prodW, prodH) * paddingRatio));
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width - cropX, prodW + pad * 2);
  const cropH = Math.min(height - cropY, prodH + pad * 2);

  // If already fills 95%+ of canvas, keep as is
  if (cropW >= width * 0.95 && cropH >= height * 0.95) {
    return canvas;
  }

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = cropW;
  trimmedCanvas.height = cropH;
  const trimmedCtx = trimmedCanvas.getContext('2d');
  if (!trimmedCtx) return canvas;

  trimmedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return trimmedCanvas;
}
