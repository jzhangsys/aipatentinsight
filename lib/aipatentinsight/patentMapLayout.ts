/**
 * patentMapLayout.ts — Patent Map 點位佈局演算法
 *
 * 兩種模式:
 * - random: 同 category 公司在同一個角度區域內隨機散落,適合快速展示
 * - force:  從 random 起跑物理 simulation(斥力 + 同 cat 群聚 + 中心拉力)
 *           跑成知識圖譜風格,點位有自然聚簇
 *
 * 用 chunked async 跑 force,每 BATCH_SIZE iter 讓出一次主執行緒,
 * UI 不會凍 + toast 可顯示進度。
 */

import type { InsightsCompany } from "./insightsData";

export type LayoutCompany = Pick<
  InsightsCompany,
  "name" | "mainCategory" | "totalPatents" | "categoryDist"
> & {
  /** 該公司在當前篩選條件下顯示的專利數 */
  displayPatents: number;
};

// =====================================================
// Ring slices — 給 Patent Map 點點外圍彩環(跨域視覺化)用
// =====================================================
export type RingSlice = {
  /** 從 angle 0(右側 3 點鐘)起算累加到此 slice 結束的比例 (0..1) */
  cumFraction: number;
  r: number;
  g: number;
  b: number;
};

/** 把 #RRGGBB 轉成 normalized rgb (0..1) */
function hexToRgbNorm(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "");
  if (c.length !== 6) return { r: 0.5, g: 0.5, b: 0.5 };
  return {
    r: parseInt(c.slice(0, 2), 16) / 255,
    g: parseInt(c.slice(2, 4), 16) / 255,
    b: parseInt(c.slice(4, 6), 16) / 255,
  };
}

/**
 * 由 categoryDist 計算 ring slices(取 top N-1 + 其他合一,固定 N=6)。
 * 不足 6 個時用最後一個 slice 填到 cumFraction=1(shader 不會渲染那段空段)。
 * 第一個 slice 比例最大 → 視覺上「主流區域」較大。
 */
export function computeRingSlices(
  categoryDist: Record<string, number>,
  palette: Record<string, string>,
  maxSlices: number = 6
): RingSlice[] {
  const total = Object.values(categoryDist).reduce((s, n) => s + n, 0);
  if (total === 0) {
    // 無 data,全 slot 一個灰色
    const fallback: RingSlice = { cumFraction: 1, r: 0.5, g: 0.5, b: 0.5 };
    return Array(maxSlices).fill(fallback);
  }

  // 排序 by count desc
  const entries = Object.entries(categoryDist)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a);

  // top (maxSlices - 1) + 其餘合併成最後一個 slice
  let topEntries: [string, number][];
  if (entries.length <= maxSlices) {
    topEntries = entries;
  } else {
    const head = entries.slice(0, maxSlices - 1);
    const tailCount = entries
      .slice(maxSlices - 1)
      .reduce((s, [, n]) => s + n, 0);
    topEntries = [...head, ["其他", tailCount]];
  }

  const slices: RingSlice[] = [];
  let cum = 0;
  for (const [cat, count] of topEntries) {
    cum += count / total;
    const hex = palette[cat] || "#888888";
    const { r, g, b } = hexToRgbNorm(hex);
    slices.push({ cumFraction: cum, r, g, b });
  }

  // 補滿到 maxSlices(填末尾,cumFraction=1 跟最後實際 slice 同色,不會顯示新 slice)
  while (slices.length < maxSlices) {
    const last = slices[slices.length - 1];
    slices.push({ cumFraction: 1, r: last.r, g: last.g, b: last.b });
  }

  return slices;
}

export type Vec3 = { x: number; y: number; z: number };

export type LayoutResult = {
  /** 點位陣列(順序對齊 orderedCompanies) */
  positions: Vec3[];
  /** 排序後的公司清單(同 category 集中) */
  orderedCompanies: LayoutCompany[];
};

/**
 * 簡單的 string → 偽隨機整數 hash,讓相同公司名得到一致的初始位置。
 */
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Random 分群佈局(v3:按 cat 大小比例分弧段)。
 *
 * 動機:當資料有 dominant cat(如「其他」佔 60%+ 公司)時,等距分弧會讓它擠在
 * 跟 1 家公司 cat 一樣大的圓內,視覺擠壓看似無分群。
 *
 * 新策略:
 * - 每個 cat 在大圓周占的弧段大小 ∝ 公司數
 * - 給最小 fraction(1/(2N))避免單一公司 cat 弧太瘦
 * - 歸一化讓所有 cat 弧段加總 = 2π(完整一圈)
 * - 每 cat anchor 在自己弧段中央
 * - local 圓半徑限制 ≤ 弧弦長 × 0.42(避免相鄰 cat 圓重疊)
 *
 * 結果:每 cat 圓內公司密度大致一致,大 cat 圓大、小 cat 圓小,色彩分群清楚。
 */
export function computeRandomLayout(
  companies: LayoutCompany[],
  sortedCategories: string[]
): LayoutResult {
  // 按 category 分組
  const byCat: Record<string, LayoutCompany[]> = {};
  sortedCategories.forEach((c) => { byCat[c] = []; });
  companies.forEach((c) => {
    if (byCat[c.mainCategory]) byCat[c.mainCategory].push(c);
  });
  Object.values(byCat).forEach((arr) =>
    arr.sort((a, b) => b.displayPatents - a.displayPatents)
  );

  const positions: Vec3[] = [];
  const orderedCompanies: LayoutCompany[] = [];

  // 只考慮實際有公司的 cat
  const activeCats = sortedCategories.filter(
    (c) => (byCat[c] || []).length > 0
  );
  const totalCompanies = companies.length;
  if (activeCats.length === 0 || totalCompanies === 0) {
    return { positions, orderedCompanies };
  }

  // 算每 cat 弧段比例(原始):依公司數
  const minFraction = 1 / (activeCats.length * 2); // 至少 0.5/N 避免太瘦
  const rawSpans = activeCats.map((cat) =>
    Math.max(minFraction, byCat[cat].length / totalCompanies)
  );
  const sumSpans = rawSpans.reduce((s, x) => s + x, 0);
  const fractions = rawSpans.map((s) => s / sumSpans);

  // 大圓周半徑:總公司數越多就推遠
  const masterRadius = Math.max(30, Math.sqrt(totalCompanies) * 3.5);

  let cumAngle = 0;
  activeCats.forEach((cat, ci) => {
    const list = byCat[cat];
    const angleSpan = fractions[ci] * Math.PI * 2;
    const anchorAngle = cumAngle + angleSpan / 2;
    cumAngle += angleSpan;

    const anchorX = Math.cos(anchorAngle) * masterRadius;
    const anchorY = Math.sin(anchorAngle) * masterRadius * 0.7;

    // localRadius:不超過該 cat 弧弦的 42%(留 16% 間距防鄰圓 overlap)
    // 也不小於能容納所有公司的最小半徑
    const arcChord = masterRadius * Math.sin(angleSpan / 2) * 2;
    const minLocalForAll = Math.sqrt(list.length) * 1.6;
    const maxLocalNoOverlap = arcChord * 0.42;
    const localRadius = Math.max(
      2.5,
      Math.min(minLocalForAll, maxLocalNoOverlap)
    );

    list.forEach((company, i) => {
      const seed = hashString(company.name + i);
      const localAngle = ((seed % 1000) / 1000) * Math.PI * 2;
      const localR = Math.sqrt(((seed / 1000) % 1000) / 1000) * localRadius;
      const x = anchorX + Math.cos(localAngle) * localR;
      const y = anchorY + Math.sin(localAngle) * localR;
      const z = (((seed / 100) % 100) / 100 - 0.5) * 6;
      positions.push({ x, y, z });
      orderedCompanies.push(company);
    });
  });

  return { positions, orderedCompanies };
}

/** await 一次 raf — chunked simulation 用 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export type ForceProgressFn = (step: number, total: number) => void;

/**
 * Force-directed 佈局(知識圖譜風格,async chunked)。
 *
 * 從 random 起步,跑物理 simulation:
 * - 兩兩斥力(O(N²),N>800 時略過)
 * - 同 category 互相吸引(動態質心)
 * - 整體向中心(0,0)輕微回拉
 *
 * 每 BATCH_SIZE iter 讓出主執行緒。對 N=719 約 200ms 完成。
 */
export async function computeForceLayout(
  companies: LayoutCompany[],
  sortedCategories: string[],
  options: {
    iterations?: number;
    onProgress?: ForceProgressFn;
    /** 取消信號:若 isCancelled() 回 true 則中斷,回傳當下進度 */
    isCancelled?: () => boolean;
  } = {}
): Promise<LayoutResult> {
  const { iterations = 120, onProgress, isCancelled } = options;
  const { positions, orderedCompanies } = computeRandomLayout(companies, sortedCategories);
  if (positions.length === 0) return { positions, orderedCompanies };

  const N = positions.length;

  // 跳過 force,直接回 random
  if (N > 800) {
    console.warn("[patentMapLayout] Skipping force simulation for N=", N);
    return { positions, orderedCompanies };
  }

  const vx = new Float32Array(N);
  const vy = new Float32Array(N);
  const cats = orderedCompanies.map((c) => c.mainCategory);

  // 從新 random(已分群)起步,簡化參數強化群聚:
  //   - REPEL_DIST 降低:同 cat 點之間不會互推太開
  //   - CLUSTER 提高:同 cat 質心吸引更強,鞏固分群
  //   - CENTER 降低:整體向中心拉力減弱,讓 cat 群保持在 anchor 附近
  const REPEL = 1.4;
  const REPEL_DIST = 3.5;
  const REPEL_DIST_SQ = REPEL_DIST * REPEL_DIST;
  const CLUSTER = 0.04;
  const CENTER = 0.003;
  const DAMPING = 0.78;
  const BATCH_SIZE = 10;
  const MAX_R = 90;

  for (let step = 0; step < iterations; step++) {
    if (isCancelled?.()) break;

    const fx = new Float32Array(N);
    const fy = new Float32Array(N);

    // 計算每個 category 的質心(動態,每步都重算)
    const catCentroid: Record<string, { x: number; y: number; n: number }> = {};
    for (let i = 0; i < N; i++) {
      const c = cats[i];
      if (!catCentroid[c]) catCentroid[c] = { x: 0, y: 0, n: 0 };
      catCentroid[c].x += positions[i].x;
      catCentroid[c].y += positions[i].y;
      catCentroid[c].n++;
    }
    for (const c in catCentroid) {
      catCentroid[c].x /= catCentroid[c].n;
      catCentroid[c].y /= catCentroid[c].n;
    }

    // 兩兩斥力
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist2 = dx * dx + dy * dy + 0.001;
        if (dist2 < REPEL_DIST_SQ) {
          const dist = Math.sqrt(dist2);
          const force = (REPEL * (REPEL_DIST - dist)) / Math.max(0.5, dist);
          if (force > 0) {
            const fxi = (dx / dist) * force;
            const fyi = (dy / dist) * force;
            fx[i] -= fxi; fy[i] -= fyi;
            fx[j] += fxi; fy[j] += fyi;
          }
        }
      }
    }

    // 拉向自己 cat 的質心 + 整體回拉中心
    for (let i = 0; i < N; i++) {
      const cn = catCentroid[cats[i]];
      fx[i] += (cn.x - positions[i].x) * CLUSTER;
      fy[i] += (cn.y - positions[i].y) * CLUSTER;
      fx[i] += -positions[i].x * CENTER;
      fy[i] += -positions[i].y * CENTER;
    }

    // 套用速度 + damping + 邊界限制
    for (let i = 0; i < N; i++) {
      vx[i] = (vx[i] + fx[i]) * DAMPING;
      vy[i] = (vy[i] + fy[i]) * DAMPING;
      positions[i].x += vx[i];
      positions[i].y += vy[i];
      const r2 = positions[i].x * positions[i].x + positions[i].y * positions[i].y;
      if (r2 > MAX_R * MAX_R) {
        const r = Math.sqrt(r2);
        positions[i].x = (positions[i].x / r) * MAX_R;
        positions[i].y = (positions[i].y / r) * MAX_R;
      }
    }

    // 每 BATCH_SIZE 讓出一次,並回報進度
    if ((step + 1) % BATCH_SIZE === 0 && step + 1 < iterations) {
      onProgress?.(step + 1, iterations);
      await nextFrame();
    }
  }
  onProgress?.(iterations, iterations);

  return { positions, orderedCompanies };
}

/**
 * Category 配色:雙重對比策略
 * - hue 用黃金角(137.508°)分布 → 相鄰色相差最大
 * - 每 3 個 cat 切換 saturation/lightness 三段 → 相鄰 cat 不只 hue 不同連明度也不同
 *   tier 0:亮飽和(saturated)
 *   tier 1:深濃(deep)
 *   tier 2:淺亮(pale)
 *
 * 回傳 category → hex 字串(如 "#7DF9FF")的對照表。
 */
/**
 * 程式產 30 色 palette,專為「同 snapshot 內每個 cat 都需要明顯不同顏色」設計。
 *
 * 邏輯:30 個 index 配對成 15 個 hue group(每組 24° 間距),
 *      每組內第一個 index 用「深飽和」tier(深色背景上很搶眼),
 *      第二個 index 用「明亮淡彩」tier,且 hue 偏移半步 12°。
 *
 * 結果:
 *  - 任何相鄰 index 都同時在 hue + sat + light 三軸上拉開
 *  - 30 色裡任兩色 RGB 歐式距離最小 26.9,平均 ~120
 *  - 暖/冷/中性色在 index 順序上自然交錯,圖譜不會出現「一片紅」「一片藍」的色塊
 *
 * 為什麼不全部用「深飽和」tier?同明度下 30 色擠不下,hue 必須 < 12° 才能容納,
 * 結果相鄰 cat 看起來像漸變。tier 交錯讓相鄰 hue 至少在 saturation/lightness 上明顯區分。
 */
function buildStarPalette(N: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < N; i++) {
    const half = Math.floor(i / 2); // 同組兩個 index 共用 hue base
    const tier = i % 2;             // 0 = 深飽和, 1 = 明亮淡彩
    const hue = (tier === 0 ? half * 24 : half * 24 + 12) % 360;
    const sat = tier === 0 ? 88 : 72;
    const light = tier === 0 ? 56 : 75;
    colors.push(hslToHex(hue, sat, light));
  }
  return colors;
}

const STAR_PALETTE_30 = buildStarPalette(30);

export function buildCategoryPalette(categories: string[]): Record<string, string> {
  // 同 snapshot 內每個 cat 拿到 STAR_PALETTE_30 對應 index 的唯一色。
  // 實際 snapshot 最多 28 個 cat,30 色足夠;>30 的兜底仍走演算法不會 crash。
  const palette: Record<string, string> = {};
  categories.forEach((cat, i) => {
    if (i < STAR_PALETTE_30.length) {
      palette[cat] = STAR_PALETTE_30[i];
    } else {
      const hue = (i * 137.508) % 360;
      const sat = i % 2 === 0 ? 92 : 65;
      palette[cat] = hslToHex(hue, sat, 64);
    }
  });
  return palette;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const v = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}
