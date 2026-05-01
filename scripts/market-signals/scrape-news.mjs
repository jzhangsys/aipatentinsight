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
 * 來源(共 6 個):
 *  1. Yahoo 股市新聞       https://tw.stock.yahoo.com/quote/{code}.TW/news
 *  2. 自由時報財經 search   https://search.ltn.com.tw/list?keyword={name}&type=ec
 *  3. 公開資訊觀測站重大訊息 https://mops.twse.com.tw/mops/web/t05st02
 *     (POST form 取得 last 2 years)
 *  4. TechNews 科技新報    https://technews.tw/?s={name}
 *  5. DIGITIMES           https://www.digitimes.com.tw/search/result.asp?keyword={name}
 *  6. 鉅亨網 Anue          https://news.cnyes.com/search/?keyword={name}
 *
 * (iThome search 是 JS render,curl 拿不到結果,先不接;
 *  6 個源已經涵蓋夠多角度。)
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
  // Yahoo 新聞 list 在 <li class="js-stream-content"> 或 <a href="/news/...">
  // 結構偶爾會變,用兩種解析法 fallback
  const news = [];
  const linkRegex = /<a[^>]+href="(\/news\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
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
      date: null,  // Yahoo 列表頁不一定有日期,設為 null,後續 build 時用 fallback
      snippet: "",
    });
  }
  return news.slice(0, 50); // 取前 50 則
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
  // 自由時報 search 結果結構:<a class="tit"...>標題</a> + <span>YYYY/MM/DD</span>
  const news = [];
  // 用正規表達式抓每一則 article block
  const blockRegex = /<a[^>]+class="tit"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]*>([\d/]+)<\/span>/g;
  let m;
  while ((m = blockRegex.exec(html)) !== null) {
    const link = m[1].startsWith("http") ? m[1] : "https:" + m[1];
    const title = stripHtml(m[2]);
    const dateRaw = m[3];
    const date = normalizeDate(dateRaw);
    if (!title) continue;
    news.push({
      title,
      url: link,
      source: "ltn",
      date,
      snippet: "",
    });
  }
  return news.slice(0, 30);
}

// =====================================================
// 3. 公開資訊觀測站 重大訊息(POST form)
// =====================================================
async function scrapeMops(stockCode) {
  const today = new Date();
  const startDate = new Date(today.getTime() - 730 * 86400 * 1000);
  const startROC = `${startDate.getFullYear() - 1911}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${String(startDate.getDate()).padStart(2, "0")}`;
  const endROC = `${today.getFullYear() - 1911}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

  const url = "https://mops.twse.com.tw/mops/web/ajax_t05st02";
  const formData = new URLSearchParams({
    encodeURIComponent: "1",
    step: "1",
    firstin: "1",
    off: "1",
    keyword4: "",
    code1: "",
    TYPEK2: "",
    checkbtn: "",
    queryName: "co_id",
    inpuType: "co_id",
    TYPEK: "all",
    co_id: stockCode,
    year: "",
    month: "",
    b_date: startROC,
    e_date: endROC,
  }).toString();

  let html;
  try {
    html = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://mops.twse.com.tw/mops/web/t05st02",
      },
      body: formData,
    });
  } catch (e) {
    console.log(`    [mops] ${stockCode} fetch failed: ${e.message}`);
    return [];
  }
  // MOPS 重大訊息 table:每 <tr> 包含日期 + 主旨
  const news = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRegex.exec(html)) !== null) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => stripHtml(x[1]));
    if (cells.length < 4) continue;
    // 結構大致是:[發言日期, 發言時間, 主旨, ...]
    const dateRaw = cells[0]; // 民國年/月/日 e.g. "115/01/24"
    const subject = cells[2] || cells[3] || "";
    if (!dateRaw || !subject || subject.length < 5) continue;
    const ymd = dateRaw.match(/(\d{2,3})\/(\d{1,2})\/(\d{1,2})/);
    if (!ymd) continue;
    const ad = parseInt(ymd[1], 10) + 1911;
    const date = `${ad}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
    news.push({
      title: subject,
      url: "https://mops.twse.com.tw/mops/web/t05st02",
      source: "mops",
      date,
      snippet: "",
    });
  }
  return news;
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
// 4. TechNews 科技新報(WordPress)
// =====================================================
async function scrapeTechnews(name) {
  const url = `https://technews.tw/?s=${encodeURIComponent(name)}`;
  let html;
  try {
    html = await fetchWithRetry(url);
  } catch (e) {
    console.log(`    [technews] ${name} fetch failed: ${e.message}`);
    return [];
  }
  const news = [];
  const seen = new Set();
  // WordPress 標題:<h2/h3 class="...title..."><a href="...">title</a></h2>
  const re = /<h[23][^>]*class="[^"]*(?:entry-title|post-title|h-title)[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const link = m[1];
    const title = stripHtml(m[2]);
    if (!title || title.length < 5) continue;
    const fullUrl = link.startsWith("http") ? link : "https://technews.tw" + link;
    if (seen.has(fullUrl)) continue;
    seen.add(fullUrl);
    news.push({
      title,
      url: fullUrl,
      source: "technews",
      date: nearbyDate(html, m.index, m[0].length),
      snippet: "",
    });
  }
  return news.slice(0, 25);
}

// =====================================================
// 5. DIGITIMES 搜尋
// =====================================================
async function scrapeDigitimes(name) {
  const url = `https://www.digitimes.com.tw/search/result.asp?keyword=${encodeURIComponent(name)}`;
  let html;
  try {
    html = await fetchWithRetry(url);
  } catch (e) {
    console.log(`    [digitimes] ${name} fetch failed: ${e.message}`);
    return [];
  }
  // DIGITIMES 文章 URL pattern:
  //   /tech/dt/n/shwnws.asp?CnlID=...&id=...
  //   /iot/dt/n/shwnws.asp?... (其他 channel 同模式)
  //   舊格式:/article.asp?cat=...&id=...
  const news = [];
  const seen = new Set();
  const re = /<a[^>]+href="(\/[a-z]+\/(?:dt\/n\/)?shwnws\.asp\?[^"]+)"[^>]*>([^<]{8,})<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const link = m[1];
    const title = stripHtml(m[2]);
    if (!title || title.length < 5) continue;
    const fullUrl = "https://www.digitimes.com.tw" + link;
    if (seen.has(fullUrl)) continue;
    seen.add(fullUrl);
    news.push({
      title,
      url: fullUrl,
      source: "digitimes",
      date: nearbyDate(html, m.index, m[0].length),
      snippet: "",
    });
  }
  return news.slice(0, 25);
}

// =====================================================
// 6. 鉅亨網 Anue 搜尋
// =====================================================
async function scrapeAnue(name) {
  const url = `https://news.cnyes.com/search/?keyword=${encodeURIComponent(name)}`;
  let html;
  try {
    html = await fetchWithRetry(url);
  } catch (e) {
    console.log(`    [anue] ${name} fetch failed: ${e.message}`);
    return [];
  }
  const news = [];
  const seen = new Set();
  // Anue:標題在 a tag 的 title="..." 屬性,href="/news/id/數字"。
  // 屬性順序不固定,所以兩種方向都掃。
  const reTitleFirst = /<a[^>]+title="([^"]+)"[^>]*href="(\/news\/id\/\d+[^"]*)"/g;
  const reHrefFirst = /<a[^>]+href="(\/news\/id\/\d+[^"]*)"[^>]*title="([^"]+)"/g;
  let m;
  while ((m = reTitleFirst.exec(html)) !== null) {
    const title = m[1];
    const link = m[2];
    if (!title || title.length < 5) continue;
    const fullUrl = "https://news.cnyes.com" + link;
    if (seen.has(fullUrl)) continue;
    seen.add(fullUrl);
    news.push({
      title,
      url: fullUrl,
      source: "anue",
      date: nearbyDate(html, m.index, m[0].length),
      snippet: "",
    });
  }
  while ((m = reHrefFirst.exec(html)) !== null) {
    const link = m[1];
    const title = m[2];
    if (!title || title.length < 5) continue;
    const fullUrl = "https://news.cnyes.com" + link;
    if (seen.has(fullUrl)) continue;
    seen.add(fullUrl);
    news.push({
      title,
      url: fullUrl,
      source: "anue",
      date: nearbyDate(html, m.index, m[0].length),
      snippet: "",
    });
  }
  return news.slice(0, 25);
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
  const [yahoo, ltn, mops, technews, digitimes, anue] = await Promise.all([
    scrapeYahoo(stockCode),
    scrapeLtn(name),
    scrapeMops(stockCode),
    scrapeTechnews(name),
    scrapeDigitimes(name),
    scrapeAnue(name),
  ]);
  // 合併 + 依 url dedupe
  const merged = [...yahoo, ...ltn, ...mops, ...technews, ...digitimes, ...anue];
  const seen = new Set();
  const news = [];
  for (const n of merged) {
    if (seen.has(n.url)) continue;
    seen.add(n.url);
    news.push(n);
  }
  // 排序:有日期的在前 + 新→舊
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
      mops: mops.length,
      technews: technews.length,
      digitimes: digitimes.length,
      anue: anue.length,
    },
    news,
  };
  writeFileSync(cachePath, JSON.stringify(result, null, 2));
  console.log(
    `    → 共 ${news.length} 則 ` +
      `(yahoo=${yahoo.length}, ltn=${ltn.length}, mops=${mops.length}, ` +
      `tech=${technews.length}, digi=${digitimes.length}, anue=${anue.length})`
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
