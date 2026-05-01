#!/usr/bin/env node
/**
 * scrape-news.mjs
 *
 * 對 data/market-signals/companies.json 內每家公司,從 3 個來源爬最近 ~2 年的新聞,
 * cache 到 data/market-signals/news-cache/{stockCode}.json:
 *   {
 *     stockCode, name, scrapedAt,
 *     news: [
 *       { title, url, source: "yahoo"|"ltn"|"mops", date: "YYYY-MM-DD", snippet }
 *     ]
 *   }
 *
 * 來源(共 2 個 — debug 後留下真正能爬到 keyword-relevant 結果的):
 *  1. Yahoo 股市新聞       https://tw.stock.yahoo.com/quote/{code}.TW/news
 *  2. 自由時報財經 search   https://search.ltn.com.tw/list?keyword={name}&type=business
 *
 * 砍掉的源(各自原因):
 *  - iThome:search 是 JS render,拿到的是 SPA shell 沒有實際結果
 *  - DIGITIMES:search 端點 HTTP 404(已下架)
 *  - Anue 鉅亨:search JS render,curl 只拿到側邊欄「熱門新聞」(跟搜尋無關)
 *  - MOPS 公開資訊觀測站:bot 防護擋 direct POST(連 cookie session 也擋)
 *  - TechNews 科技新報:bot 偵測命中後直接回 404 "no-results" 模板
 * 上面 5 個若要爬,需要 Playwright/Puppeteer 等 browser-based 方案,先不上。
 *
 * 設計:
 *  - 已 cache 且 24h 內的不重抓(--force 強制全抓)
 *  - 每家之間 sleep 800ms(rate limit 友善)
 *  - 失敗 retry 2 次
 *  - 並發限 2(同時最多兩家在抓)
 *  - 全程進度 log + 摘要報告
 *
 * Usage:
 *   node scripts/market-signals/scrape-news.mjs           # 抓全部 unique 公司
 *   node scripts/market-signals/scrape-news.mjs --code 2330 # 抓單一公司
 *   node scripts/market-signals/scrape-news.mjs --force   # 不管 cache 全部重抓
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const COMPANIES_PATH = join(ROOT, "data", "market-signals", "companies.json");
const CACHE_DIR = join(ROOT, "data", "market-signals", "news-cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const FORCE = process.argv.includes("--force");
const SINGLE_CODE = (() => {
  const i = process.argv.indexOf("--code");
  return i >= 0 ? process.argv[i + 1] : null;
})();
const CACHE_TTL_MS = 24 * 3600 * 1000; // 24h

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

// =====================================================
// 共用工具
// =====================================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, opts = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { "User-Agent": UA, ...(opts.headers || {}) },
      });
      // 404 通常代表「搜尋無結果」(尤其 DIGITIMES),不該當錯誤,回空字串讓 regex 跑空
      if (res.status === 404) return "";
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000 * (attempt + 1));
    }
  }
}

// 把各源的「相對日期」(如 "3 小時前")盡量轉成 YYYY-MM-DD
function normalizeDate(raw, fallback = new Date()) {
  if (!raw) return null;
  const txt = raw.trim();
  // YYYY/MM/DD or YYYY-MM-DD
  const ymd = txt.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }
  // MM/DD(年用 fallback)
  const md = txt.match(/(\d{1,2})\/(\d{1,2})/);
  if (md) {
    const y = fallback.getFullYear();
    return `${y}-${md[1].padStart(2, "0")}-${md[2].padStart(2, "0")}`;
  }
  // n 小時前 / n 分鐘前
  if (/小時前|分鐘前|剛剛|hours? ago|minutes? ago/.test(txt)) {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  if (/(\d+)\s*天前/.test(txt)) {
    const days = parseInt(txt.match(/(\d+)\s*天前/)[1], 10);
    const d = new Date(Date.now() - days * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

// 把 HTML 內<...>標籤剝掉,留純文字
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// 1. Yahoo 股市新聞
// =====================================================
async function scrapeYahoo(stockCode) {
  const url = `https://tw.stock.yahoo.com/quote/${stockCode}.TW/news`;
  let html;
  try {
    html = await fetchWithRetry(url);
  } catch (e) {
    console.log(`    [yahoo] ${stockCode} fetch failed: ${e.message}`);
    return [];
  }
  // Yahoo Finance Taiwan 新聞文章 URL pattern:
  //   https://tw.stock.yahoo.com/news/{slug}-{timestamp}.html
  // 或相對路徑 /news/{slug}-{timestamp}.html
  // 不要抓 /news/ 結尾的(那是分類列表頁,不是文章)
  const news = [];
  const linkRegex = /<a[^>]+href="(?:https:\/\/tw\.stock\.yahoo\.com)?(\/news\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/g;
  const seen = new Set();
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const path = m[1];
    if (seen.has(path)) continue;
    seen.add(path);
    const inner = stripHtml(m[2]);
    if (!inner || inner.length < 6) continue;
    news.push({
      title: inner.split("·")[0].trim(),
      url: "https://tw.stock.yahoo.com" + path,
      source: "yahoo",
      date: null,  // Yahoo 列表頁不一定有日期,設為 null
      snippet: "",
    });
  }
  return news.slice(0, 50);
}

// =====================================================
// 2. 自由時報財經 search
// =====================================================
async function scrapeLtn(name) {
  const url = `https://search.ltn.com.tw/list?keyword=${encodeURIComponent(name)}&type=business`;
  let html;
  try {
    html = await fetchWithRetry(url);
  } catch (e) {
    console.log(`    [ltn] ${name} fetch failed: ${e.message}`);
    return [];
  }
  // 自由時報 search 結果實際結構(從 debug-sources 看到):
  //   <a href="https://ec.ltn.com.tw/article/breakingnews/5422287"
  //      class="tit" data-desc="..." title="台積電要小心?...">台積電要小心?...</a>
  // href 在前 class 在後;標題在 title 屬性 + 內文。
  const news = [];
  const seen = new Set();
  // 抓 href + title 屬性(title 屬性裡是完整標題)
  const re = /<a[^>]+href="(https?:\/\/[^"]+ltn\.com\.tw\/[^"]+)"[^>]+class="tit"[^>]+title="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const link = m[1];
    const title = m[2];
    if (!title || title.length < 5) continue;
    if (seen.has(link)) continue;
    seen.add(link);
    news.push({
      title,
      url: link,
      source: "ltn",
      date: nearbyDate(html, m.index, m[0].length),
      snippet: "",
    });
  }
  return news.slice(0, 30);
}

// =====================================================
// 共用:從 article link 旁邊嘗試抓日期
// =====================================================
function nearbyDate(html, idx, matchLen, windowBefore = 200, windowAfter = 800) {
  const start = Math.max(0, idx - windowBefore);
  const end = Math.min(html.length, idx + matchLen + windowAfter);
  const ctx = html.slice(start, end);
  // 1. <time datetime="2026-01-15">
  const timeMatch = ctx.match(/<time[^>]+datetime="([\d-]{10})/);
  if (timeMatch) return timeMatch[1];
  // 2. 純文字 YYYY-MM-DD / YYYY/MM/DD / YYYY年MM月DD日
  const ymd = ctx.match(/(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }
  return null;
}

// =====================================================
// 主流程
// =====================================================
async function scrapeOne({ name, stockCode }) {
  const cachePath = join(CACHE_DIR, `${stockCode}.json`);
  if (!FORCE && existsSync(cachePath)) {
    const stat = statSync(cachePath);
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
      const cached = JSON.parse(readFileSync(cachePath, "utf8"));
      console.log(`  [cache] ${stockCode} ${name} (${cached.news.length} news, age ${Math.round((Date.now() - stat.mtimeMs) / 3600000)}h)`);
      return cached;
    }
  }
  console.log(`  [scrape] ${stockCode} ${name} ...`);
  const [yahoo, ltn] = await Promise.all([
    scrapeYahoo(stockCode),
    scrapeLtn(name),
  ]);
  // 合併 + 依 url dedupe
  const merged = [...yahoo, ...ltn];
  const seen = new Set();
  const news = [];
  for (const n of merged) {
    if (seen.has(n.url)) continue;
    seen.add(n.url);
    news.push(n);
  }
  news.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
  const result = {
    stockCode,
    name,
    scrapedAt: new Date().toISOString(),
    sourceCounts: {
      yahoo: yahoo.length,
      ltn: ltn.length,
    },
    news,
  };
  writeFileSync(cachePath, JSON.stringify(result, null, 2));
  console.log(
    `    → 共 ${news.length} 則 (yahoo=${yahoo.length}, ltn=${ltn.length})`
  );
  return result;
}

// 並發限制
async function runConcurrent(tasks, limit = 2) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
      await sleep(800);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

// === main ===
const companies = JSON.parse(readFileSync(COMPANIES_PATH, "utf8")).allCompanies;
const targets = SINGLE_CODE
  ? companies.filter((c) => c.stockCode === SINGLE_CODE)
  : companies;

console.log(`[scrape-news] 開抓 ${targets.length} 家公司 ${FORCE ? "(--force)" : ""}\n`);
const startTime = Date.now();

const tasks = targets.map((c) => () => scrapeOne(c));
const results = await runConcurrent(tasks, 2);

const elapsed = Math.round((Date.now() - startTime) / 1000);
const totalNews = results.reduce((s, r) => s + (r?.news.length || 0), 0);
console.log(`\n[scrape-news] 完成,共 ${totalNews} 則新聞,耗時 ${elapsed}s`);
