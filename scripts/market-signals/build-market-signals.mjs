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
 * 判斷新聞是否落在「上一期 snapshot ~ 本期 snapshot」的時間窗口。
 * 第一期 snapshot 沒有「上一期」,fallback 用 (D - N 天) 當起點。
 */
function inWindow(newsDate, snapshotDate, prevSnapshotDate) {
  if (!newsDate) return true; // 沒日期 → 視為近期,算進來
  const snapTs = new Date(snapshotDate + "T23:59:59").getTime();
  const newsTs = new Date(newsDate + "T00:00:00").getTime();
  if (Number.isNaN(newsTs)) return true;
  if (newsTs > snapTs) return false; // 新聞晚於 snapshot 不算
  let startTs;
  if (prevSnapshotDate) {
    // 起點 = 上一期 snapshot 之後(>),所以 newsTs 必須嚴格大於 prev
    startTs = new Date(prevSnapshotDate + "T23:59:59").getTime();
    return newsTs > startTs;
  } else {
    // 第一期沒有 prev → 用 D - N 天 fallback
    startTs = snapTs - FIRST_SNAPSHOT_FALLBACK_DAYS * 86400 * 1000;
    return newsTs >= startTs;
  }
}

function buildOne(snapshotDate, prevSnapshotDate) {
  const companies = companiesData.bySnapshot[snapshotDate];
  if (!companies) {
    console.log(`  [skip] ${snapshotDate}:companies.json 沒這期`);
    return null;
  }

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
    const inwin = news.filter((n) => inWindow(n.date, snapshotDate, prevSnapshotDate));
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

  // 對外公布窗口邊界(沒有曝露新聞,只是時間範圍)
  const windowStart = prevSnapshotDate
    ? prevSnapshotDate
    : new Date(
        new Date(snapshotDate).getTime() -
          FIRST_SNAPSHOT_FALLBACK_DAYS * 86400 * 1000
      )
        .toISOString()
        .slice(0, 10);

  return {
    date: snapshotDate,
    generatedAt: new Date().toISOString(),
    newsWindow: { start: windowStart, end: snapshotDate },
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

for (const d of targetDates) {
  const out = buildOne(d, prevDateMap.get(d) || null);
  if (!out) continue;
  const outPath = join(PUBLIC_DATA, `market-signals-${d}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(
    `  ✓ ${d} [window ${out.newsWindow.start}~${out.newsWindow.end}]: ` +
      `${out.themes.length} themes, ` +
      `${out.totalCompaniesAnalyzed}/${out.totalCompanies} companies classified`
  );
}

console.log(`\n[build-market-signals] 完成 ${targetDates.length} 期`);
