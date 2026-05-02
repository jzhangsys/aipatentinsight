#!/usr/bin/env node
/**
 * build-trends-aggregate.mjs
 *
 * 從 16 個 insights snapshot 抽出跨期時間序列,輸出 public/data/trends-aggregate.json,
 * 供 IndustryTrendsClient 各 concept 使用。
 *
 * 為什麼預先聚合:client 端載 16 個 ~200KB JSON 太慢(共 ~3MB),
 * 預聚合成單一 ~50KB 檔即可。
 *
 * 輸出 schema:
 *   {
 *     generatedAt,
 *     dates: ["2024-07-29", ..., "2026-02-01"],   16 個
 *     categories: ["AI晶片", ..., "其他"],          所有期 union,~30 個
 *     companies: [{name, stockCode}],              所有期 union,~300 家
 *     catMatrix: number[16][N_cats]                 每期每 cat 的 patent 數
 *     companyMatrix: number[16][N_companies]        每期每公司的 patent 數
 *     metrics: {
 *       cat: { [name]: { persistence, slope, flash, total } },
 *       company: { [name]: { persistence, slope, flash, total, stockCode } },
 *     }
 *   }
 *
 * 指標定義(每個 entity):
 *   - persistence: 出現期數 / 16 (0..1)
 *   - slope:      linear regression(date_idx, count) 斜率,正=成長
 *   - flash:      max(per-snapshot count) / total (0..1, 1 = 全集中一期)
 *   - total:      累計專利數
 *
 * Usage: node scripts/build-trends-aggregate.mjs
 *        (也會被 prebuild 自動觸發)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DATA = join(ROOT, "public", "data");
const OUT_PATH = join(PUBLIC_DATA, "trends-aggregate.json");

// === 載 snapshots index ===
const snapshotsIdx = JSON.parse(
  readFileSync(join(PUBLIC_DATA, "snapshots.json"), "utf8")
);
const actualSnapshots = snapshotsIdx.timeline.filter((s) => !s.placeholder);
const dates = actualSnapshots.map((s) => s.date);
console.log(`[trends-aggregate] 處理 ${dates.length} 期 snapshot`);

// === 載每期 -light JSON,聚合 cat / company 矩陣 ===
const allCats = new Map();    // catName → unique
const allCompanies = new Map(); // stockCode → { name, stockCode }
const perSnapshot = []; // 每期的 { catCount: Map, companyCount: Map, mainCatByCode: Map }

for (const snap of actualSnapshots) {
  const fileName = snap.url.replace(/^\/data\//, "");
  const json = JSON.parse(readFileSync(join(PUBLIC_DATA, fileName), "utf8"));

  const catCount = new Map();
  const companyCount = new Map();
  const mainCatByCode = new Map();   // stockCode → main cat name(該期)

  for (const c of json.companies || []) {
    if (!c.stockCode) continue;
    const code = String(c.stockCode).trim();
    if (!code) continue;
    allCompanies.set(code, { name: c.name, stockCode: code });
    companyCount.set(code, c.totalPatents || 0);
    if (c.mainCategory) mainCatByCode.set(code, c.mainCategory);
  }

  // 用 categoryDist 加總(更準),fallback 到 patents 數
  for (const c of json.companies || []) {
    if (!c.stockCode) continue;
    const dist = c.categoryDist || {};
    for (const [cat, n] of Object.entries(dist)) {
      if (!cat) continue;
      allCats.set(cat, true);
      catCount.set(cat, (catCount.get(cat) || 0) + n);
    }
  }

  perSnapshot.push({ date: snap.date, catCount, companyCount, mainCatByCode });
}

const categories = [...allCats.keys()].sort();
const companies = [...allCompanies.values()].sort((a, b) =>
  a.stockCode.localeCompare(b.stockCode)
);

// === 矩陣 ===
const catMatrix = perSnapshot.map((s) =>
  categories.map((cat) => s.catCount.get(cat) || 0)
);
const companyMatrix = perSnapshot.map((s) =>
  companies.map((c) => s.companyCount.get(c.stockCode) || 0)
);

// === 指標計算 ===
function computeMetrics(matrix, names) {
  // matrix: number[T][N]; T = 期數, N = entity 數
  // 對 entity j 算 timeseries: matrix[0..T-1][j]
  const T = matrix.length;
  const result = {};
  for (let j = 0; j < names.length; j++) {
    const series = matrix.map((row) => row[j]);
    const total = series.reduce((s, x) => s + x, 0);
    if (total === 0) {
      result[names[j]] = { persistence: 0, slope: 0, flash: 0, total: 0 };
      continue;
    }
    const presentCount = series.filter((x) => x > 0).length;
    const persistence = presentCount / T;
    const max = Math.max(...series);
    const flash = max / total;
    // linear regression: y = mx + b, m = slope
    // x = idx (0..T-1), y = series[i]
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < T; i++) {
      sumX += i;
      sumY += series[i];
      sumXY += i * series[i];
      sumX2 += i * i;
    }
    const denom = T * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (T * sumXY - sumX * sumY) / denom : 0;
    result[names[j]] = {
      persistence: +persistence.toFixed(3),
      slope: +slope.toFixed(3),
      flash: +flash.toFixed(3),
      total,
    };
  }
  return result;
}

const catNames = categories;
const companyKeys = companies.map((c) => c.stockCode); // 用 stockCode 作 metric key

const catMetrics = computeMetrics(catMatrix, catNames);
const companyMetricsBase = computeMetrics(companyMatrix, companyKeys);
// 公司 metrics 補上 name + stockCode
const companyMetrics = {};
for (const c of companies) {
  companyMetrics[c.stockCode] = {
    name: c.name,
    stockCode: c.stockCode,
    ...companyMetricsBase[c.stockCode],
  };
}

// 公司在每期的主類別:companyMainCatMatrix[T][N_companies] = catName 或 null
const companyMainCatMatrix = perSnapshot.map((s) =>
  companies.map((c) => s.mainCatByCode.get(c.stockCode) || null)
);

const out = {
  generatedAt: new Date().toISOString(),
  dates,
  categories,
  companies,
  catMatrix,
  companyMatrix,
  companyMainCatMatrix,
  metrics: { cat: catMetrics, company: companyMetrics },
};

writeFileSync(OUT_PATH, JSON.stringify(out));
const sizeKb = (JSON.stringify(out).length / 1024).toFixed(1);
console.log(
  `[trends-aggregate] ✓ ${OUT_PATH} (${sizeKb}KB)\n` +
    `  ${dates.length} dates × ${categories.length} cats × ${companies.length} companies`
);
