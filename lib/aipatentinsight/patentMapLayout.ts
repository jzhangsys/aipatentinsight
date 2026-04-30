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
  "name" | "mainCategory" | "totalPatents"
> & {
  /** 該公司在當前篩選條件下顯示的專利數 */
  displayPatents: number;
};

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
 * Random 散落佈局。
 * 同 category 公司分配到同一個「種子角度」,在 ±60° 內隨機散落。
 * y 軸壓扁 0.65 倍讓圖譜偏橫向,z 軸 ±8 給 3D 立體感。
 */
export function computeRandomLayout(
  companies: LayoutCompany[],
  sortedCategories: string[]
): LayoutResult {
  // 按 category 分組,讓相同 cat 集中
  const byCat: Record<string, LayoutCompany[]> = {};
  sortedCategories.forEach((c) => { byCat[c] = []; });
  companies.forEach((c) => {
    if (byCat[c.mainCategory]) byCat[c.mainCategory].push(c);
  });
  // 每個 cat 內按 displayPatents 由大到小
  Object.values(byCat).forEach((arr) => arr.sort((a, b) => b.displayPatents - a.displayPatents));

  const positions: Vec3[] = [];
  const orderedCompanies: LayoutCompany[] = [];

  const totalN = companies.length;
  const radius = Math.max(20, Math.sqrt(totalN) * 1.6);

  sortedCategories.forEach((cat, ci) => {
    const list = byCat[cat];
    if (!list || list.length === 0) return;
    const seedAngle = (ci / sortedCategories.length) * Math.PI * 2;
    const angleSpread = Math.PI / 3; // ±60°

    list.forEach((company, i) => {
      const seed = hashString(company.name + i);
      const angle = seedAngle + ((seed % 1000) / 1000 - 0.5) * angleSpread * 2;
      const r = Math.sqrt(((seed / 1000) % 1000) / 1000) * radius;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.65;
      const z = (((seed / 100) % 100) / 100 - 0.5) * 16;
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

  const REPEL = 1.5;
  const REPEL_DIST = 5.0;
  const REPEL_DIST_SQ = REPEL_DIST * REPEL_DIST;
  const CLUSTER = 0.025;
  const CENTER = 0.008;
  const DAMPING = 0.78;
  const BATCH_SIZE = 10;
  const MAX_R = 60;

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
 * 17 色 category 配色:用黃金角(137.5°)分布讓相鄰色相差最大。
 * 飽和度 78%、明度 66% — 在黑底上飽滿明亮。
 *
 * 回傳 category → hex 字串(如 "#7DF9FF")的對照表。
 */
export function buildCategoryPalette(categories: string[]): Record<string, string> {
  const palette: Record<string, string> = {};
  categories.forEach((cat, i) => {
    const hue = (i * 137.5) % 360;
    palette[cat] = hslToHex(hue, 78, 66);
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
