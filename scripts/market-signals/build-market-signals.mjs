#!/usr/bin/env node
/**
 * build-market-signals.mjs
 *
 * 讀 data/market-signals/news-cache/*.json,套題材字典,
 * per snapshot 聚合 → 輸出 public/data/market-signals-{date}.json
 *
 * 對每個 snapshot date D:
 *  1. 抓該期 stockCode 公司清單(從 companies.json bySnapshot[D])
 *  2. 對每家公司,從 news-cache 撈該公司「最近 60 天」(D-60d ~ D)的新聞
 *     沒有日期的新聞 → 全部視為「最新」(算進該期)
 *  3. 對每則新聞跑 classifyText(title + snippet)→ 命中題材 + 1 聲量
 *  4. 公司主題 = 該公司命中最多次的題材(若有並列,取字典定義順序在前者)
 *  5. 題材聲量 = 全部公司在該題材的新聞命中總數
 *  6. 排序聲量,取 top 20
 *
 * 輸出 schema:
 *  {
 *    "date": "2026-02-01",
 *    "totalCompanies": 73,
 *    "totalNewsAnalyzed": 487,
 *    "themes": [
 *      {
 *        "rank": 1,
 *        "name": "AI 伺服器",
 *        "volume": 142,
 *        "primaryCompanyCount": 8,
 *        "companies": [
 *          {
 *            "name": "廣達",
 *            "stockCode": "2382",
 *            "newsHits": 18,
 *            "isPrimary": true,
 *            "sampleNews": [{ title, url, source, date }]
 *          }, ...
 *        ]
 *      }, ...
 *    ]
 *  }
 *
 * Usage:
 *   node scripts/market-signals/build-market-signals.mjs                # 全 16 期
 *   node scripts/market-signals/build-market-signals.mjs --date 2026-02-01
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compileThemesRegex, classifyText } from "./themes-dictionary.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const COMPANIES_PATH = join(ROOT, "data", "market-signals", "companies.json");
const CACHE_DIR = join(ROOT, "data", "market-signals", "news-cache");
const PUBLIC_DATA = join(ROOT, "public", "data");

const ARG_DATE = (() => {
  const i = process.argv.indexOf("--date");
  return i >= 0 ? process.argv[i + 1] : null;
})();
const TOP_N_THEMES = 20;
// 第一期 snapshot 沒有「上一期」的 fallback 窗口(往前推 N 天)
const FIRST_SNAPSHOT_FALLBACK_DAYS = 60;

const compiled = compileThemesRegex();
const companiesData = JSON.parse(readFileSync(COMPANIES_PATH, "utf8"));

// 載 news cache 進記憶體 (一次)
const newsByCode = new Map();
if (existsSync(CACHE_DIR)) {
  for (const f of readdirSync(CACHE_DIR)) {
    if (!f.endsWith(".json")) continue;
    const code = f.replace(/\.json$/, "");
    try {
      const cache = JSON.parse(readFileSync(join(CACHE_DIR, f), "utf8"));
      newsByCode.set(code, cache.news || []);
    } catch (e) {
      console.warn(`  [warn] 讀 ${f} 失敗:${e.message}`);
    }
  }
}
console.log(`[build-market-signals] 載入 ${newsByCode.size} 家公司 news cache`);

/**
 * 給定明確的 (windowStart, windowEnd) — 日期都是 YYYY-MM-DD —
 * 判斷新聞是否落在窗口內。
 *
 * Strict 時間對齊:沒日期的新聞**直接拒絕**,避免「現在爬到的新聞」
 * 被誤分配到任何 snapshot。
 */
function inWindow(newsDate, windowStart, windowEnd) {
  if (!newsDate) return false;
  const startTs = new Date(windowStart + "T00:00:00").getTime();
  const endTs = new Date(windowEnd + "T23:59:59").getTime();
  const newsTs = new Date(newsDate + "T00:00:00").getTime();
  if (Number.isNaN(newsTs)) return false;
  return newsTs >= startTs && newsTs <= endTs;
}

/**
 * 計算某 snapshot 的 news window:
 *  - isLatest: latest snapshot 用 [today-90d, today],反映「現在市場在講什麼」
 *  - 有 prevSnapshotDate: [prev+1, current] 嚴格 inter-snapshot
 *  - 沒 prev(第一期): [current - FIRST_SNAPSHOT_FALLBACK_DAYS, current]
 */
function computeWindow(snapshotDate, prevSnapshotDate, isLatest) {
  if (isLatest) {
    const today = new Date();
    const back = new Date(today.getTime() - 90 * 86400 * 1000);
    return {
      start: back.toISOString().slice(0, 10),
      end: today.toISOString().slice(0, 10),
      label: "latest_fresh_90d",
    };
  }
  if (prevSnapshotDate) {
    // 起點:prev snapshot 之後的第一天
    const prevDate = new Date(prevSnapshotDate + "T00:00:00");
    const dayAfterPrev = new Date(prevDate.getTime() + 86400 * 1000);
    return {
      start: dayAfterPrev.toISOString().slice(0, 10),
      end: snapshotDate,
      label: "inter_snapshot",
    };
  }
  const snap = new Date(snapshotDate + "T00:00:00");
  const fallback = new Date(snap.getTime() - FIRST_SNAPSHOT_FALLBACK_DAYS * 86400 * 1000);
  return {
    start: fallback.toISOString().slice(0, 10),
    end: snapshotDate,
    label: "first_fallback_60d",
  };
}

/**
 * 抽取的 aggregation helper:對給定 companies + window,
 * 回傳 { themeAggregate: Map<theme, {volume, companyHits}>, totalAnalyzed }
 *
 * 同時被 buildOne(主分析)跟 pass 3(180d backfill)共用。
 */
function aggregateThemesInWindow(companies, winStart, winEnd) {
  const themeAggregate = new Map();
  let totalAnalyzed = 0;
  for (const co of companies) {
    const news = newsByCode.get(co.stockCode) || [];
    const inwin = news.filter((n) => inWindow(n.date, winStart, winEnd));
    if (inwin.length === 0) continue;
    for (const n of inwin) {
      totalAnalyzed++;
      const text = (n.title || "") + " " + (n.snippet || "");
      const hits = classifyText(text, compiled);
      if (hits.length === 0) continue;
      for (const theme of hits) {
        if (!themeAggregate.has(theme)) {
          themeAggregate.set(theme, { volume: 0, companyHits: new Map() });
        }
        const tagg = themeAggregate.get(theme);
        tagg.volume++;
        if (!tagg.companyHits.has(co.stockCode)) {
          tagg.companyHits.set(co.stockCode, {
            name: co.name,
            stockCode: co.stockCode,
            count: 0,
          });
        }
        tagg.companyHits.get(co.stockCode).count++;
      }
    }
  }
  return { themeAggregate, totalAnalyzed };
}

function buildOne(snapshotDate, prevSnapshotDate, isLatest) {
  const companies = companiesData.bySnapshot[snapshotDate];
  if (!companies) {
    console.log(`  [skip] ${snapshotDate}:companies.json 沒這期`);
    return null;
  }
  const win = computeWindow(snapshotDate, prevSnapshotDate, isLatest);

  /**
   * 著作權保護:本 build 階段只產出「彙總指標」,不輸出任何新聞標題 / URL / 來源,
   * 也不輸出樣本內容。新聞原始檔留在本地 data/market-signals/news-cache/(.gitignore),
   * 只用來做 in-memory 分析。
   *
   * 結構:
   *   theme → { volume, companyHits: Map<stockCode, { name, count }> }
   */
  const themeAggregate = new Map();
  /** company → { code, name, themeHits: Map<theme, count>, totalHits } */
  const companyThemes = new Map();
  let totalAnalyzed = 0;

  for (const co of companies) {
    const news = newsByCode.get(co.stockCode) || [];
    const inwin = news.filter((n) => inWindow(n.date, win.start, win.end));
    if (inwin.length === 0) continue;

    const cthemes = new Map();
    for (const n of inwin) {
      totalAnalyzed++;
      const text = (n.title || "") + " " + (n.snippet || "");
      const hits = classifyText(text, compiled);
      if (hits.length === 0) continue;
      for (const theme of hits) {
        // 公司層級
        cthemes.set(theme, (cthemes.get(theme) || 0) + 1);
        // 題材層級
        if (!themeAggregate.has(theme)) {
          themeAggregate.set(theme, { volume: 0, companyHits: new Map() });
        }
        const tagg = themeAggregate.get(theme);
        tagg.volume++;
        if (!tagg.companyHits.has(co.stockCode)) {
          tagg.companyHits.set(co.stockCode, {
            name: co.name,
            stockCode: co.stockCode,
            count: 0,
          });
        }
        tagg.companyHits.get(co.stockCode).count++;
      }
    }
    if (cthemes.size > 0) {
      let totalHits = 0;
      for (const v of cthemes.values()) totalHits += v;
      companyThemes.set(co.stockCode, { ...co, themeHits: cthemes, totalHits });
    }
  }

  // 公司主題 = 該公司命中最多次的題材
  const primaryByTheme = new Map();
  for (const [code, info] of companyThemes.entries()) {
    let best = null;
    let bestCount = 0;
    for (const [th, c] of info.themeHits.entries()) {
      if (c > bestCount) {
        bestCount = c;
        best = th;
      }
    }
    if (!best) continue;
    if (!primaryByTheme.has(best)) primaryByTheme.set(best, new Set());
    primaryByTheme.get(best).add(code);
  }

  // 排序聲量,取 top 20
  const themesSorted = [...themeAggregate.entries()]
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, TOP_N_THEMES);

  const themes = themesSorted.map(([name, agg], i) => {
    const primarySet = primaryByTheme.get(name) || new Set();
    const companies = [...agg.companyHits.values()]
      .sort((a, b) => b.count - a.count)
      .map((ch) => ({
        name: ch.name,
        stockCode: ch.stockCode,
        // 注意:此處的 hits 是聚合指標(分析結果),非原始新聞內容。
        hits: ch.count,
        isPrimary: primarySet.has(ch.stockCode),
      }));
    return {
      rank: i + 1,
      name,
      volume: agg.volume,
      totalCompanyCount: companies.length,
      companies,
    };
  });

  return {
    date: snapshotDate,
    generatedAt: new Date().toISOString(),
    newsWindow: { start: win.start, end: win.end, mode: win.label },
    totalCompanies: companies.length,
    totalCompaniesAnalyzed: companyThemes.size,
    themes,
  };
}

// === 跑 ===
const snapshotsIdx = JSON.parse(readFileSync(join(PUBLIC_DATA, "snapshots.json"), "utf8"));
const allActualDates = snapshotsIdx.timeline
  .filter((s) => !s.placeholder)
  .map((s) => s.date)
  .sort(); // 確保升序;可建 prev map

// 建 prevDate map: D → 在 allActualDates 中前一個 actual snapshot
const prevDateMap = new Map();
for (let i = 0; i < allActualDates.length; i++) {
  prevDateMap.set(allActualDates[i], i > 0 ? allActualDates[i - 1] : null);
}

const targetDates = ARG_DATE ? [ARG_DATE] : allActualDates;
const latestDate = allActualDates[allActualDates.length - 1];

// === Pass 1:每期各自從自己窗口算 themes ===
const allBuilt = [];
for (const d of allActualDates) {
  const isLatest = d === latestDate;
  const out = buildOne(d, prevDateMap.get(d) || null, isLatest);
  allBuilt.push({ date: d, out });
}

// === Pass 2:延續性 — 當期 themes < MIN 時,從上一期 top themes 補入 ===
//
// 邏輯:股市題材本來就有延續性,熱題材不會一個窗口就突然消失。
// 如果當期 themes < 10(可能因為窗口短、新聞少、爬蟲漏抓),
// 從上一期 themes 由高到低順序,把當期沒有的 theme 補進來,
// 標 carriedFromPrev: true + carriedFromDate,直到湊滿 10 個。
//
// Carried theme 用上期的 volume,跟當期 volume 一起排序。
// 不做 chain inheritance(每期最多只繼承「直接上一期」的)。
const MIN_THEMES = 10;
for (let i = 1; i < allBuilt.length; i++) {
  const cur = allBuilt[i].out;
  const prev = allBuilt[i - 1].out;
  if (!cur || !prev) continue;
  if (cur.themes.length >= MIN_THEMES) continue;

  const existingNames = new Set(cur.themes.map((t) => t.name));
  for (const pt of prev.themes) {
    if (existingNames.has(pt.name)) continue;
    cur.themes.push({
      ...pt,
      carriedFromPrev: true,
      carriedFromDate: prev.date,
    });
    existingNames.add(pt.name);
    if (cur.themes.length >= MIN_THEMES) break;
  }
  // Re-sort + re-rank + cap at top 20
  cur.themes.sort((a, b) => b.volume - a.volume);
  cur.themes = cur.themes.slice(0, TOP_N_THEMES);
  cur.themes.forEach((t, idx) => (t.rank = idx + 1));
}

// === Pass 3:180 天 backfill — pass 2 後仍 < MIN 的期別,擴大窗口重新分析 ===
//
// 順序設計理由:
//   1. 先嘗試延續性(pass 2)— 上期的熱題材通常還是當期關注焦點,語意最對齊
//   2. 仍不夠才擴窗口(pass 3)— 用「snapshot 前 180 天」廣度撈,可能撈到
//      季度級的長期結構性題材,標 extendedWindow=true 讓前端標示
//
// 不重做 carriedFromPrev,只追加新的 native-like themes(來自延伸窗口的本地分析)
const EXTENDED_WINDOW_DAYS = 180;
for (let i = 0; i < allBuilt.length; i++) {
  const cur = allBuilt[i].out;
  if (!cur) continue;
  if (cur.themes.length >= MIN_THEMES) continue;

  const companies = companiesData.bySnapshot[cur.date];
  if (!companies) continue;

  // 計算延伸窗口
  const snapEnd = new Date(cur.date + "T23:59:59");
  const back = new Date(snapEnd.getTime() - EXTENDED_WINDOW_DAYS * 86400 * 1000);
  const extStart = back.toISOString().slice(0, 10);
  const extEnd = cur.date;

  // 若原窗口已比 180 天還寬(latest_fresh_90d 是 90 天 < 180,也適用),
  // 仍跑一次 — 但若延伸窗口跟原窗口完全相同,會重複命中已有 theme,自動 dedup
  const { themeAggregate: extAgg } = aggregateThemesInWindow(
    companies,
    extStart,
    extEnd
  );

  const existingNames = new Set(cur.themes.map((t) => t.name));
  const candidates = [...extAgg.entries()]
    .filter(([name]) => !existingNames.has(name))
    .sort((a, b) => b[1].volume - a[1].volume);

  for (const [name, agg] of candidates) {
    if (cur.themes.length >= MIN_THEMES) break;
    const cos = [...agg.companyHits.values()]
      .sort((a, b) => b.count - a.count)
      .map((ch) => ({
        name: ch.name,
        stockCode: ch.stockCode,
        hits: ch.count,
        isPrimary: false,
      }));
    cur.themes.push({
      name,
      volume: agg.volume,
      totalCompanyCount: cos.length,
      companies: cos,
      extendedWindow: true,
      extendedWindowDays: EXTENDED_WINDOW_DAYS,
    });
    existingNames.add(name);
  }
  // Re-sort + re-rank + cap at top 20
  cur.themes.sort((a, b) => b.volume - a.volume);
  cur.themes = cur.themes.slice(0, TOP_N_THEMES);
  cur.themes.forEach((t, idx) => (t.rank = idx + 1));
}

// === Pass 4:寫檔 + log ===
const targetSet = new Set(targetDates);
for (const { date: d, out } of allBuilt) {
  if (!targetSet.has(d)) continue;
  if (!out) continue;
  const outPath = join(PUBLIC_DATA, `market-signals-${d}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  const carriedCount = out.themes.filter((t) => t.carriedFromPrev).length;
  const extendedCount = out.themes.filter((t) => t.extendedWindow).length;
  const nativeCount = out.themes.length - carriedCount - extendedCount;
  console.log(
    `  ✓ ${d} [window ${out.newsWindow.start}~${out.newsWindow.end}]: ` +
      `${out.themes.length} themes (native=${nativeCount}, carried=${carriedCount}, extended=${extendedCount}), ` +
      `${out.totalCompaniesAnalyzed}/${out.totalCompanies} companies classified`
  );
}

console.log(`\n[build-market-signals] 完成 ${targetDates.length} 期`);
