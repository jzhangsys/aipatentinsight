#!/usr/bin/env node
/**
 * enrich-patent-abstracts.mjs
 *
 * 補齊 insights JSON 中缺漏 / 過短的專利摘要。
 *
 * 來源:Google Patents(https://patents.google.com/patent/{patentId})
 *  - Schema 穩定:每個專利頁有 <meta name="DC.description"> 跟 <section itemprop="abstract">
 *  - TW 專利號(TWI***、TWM***、TWD***)可以直接吃,無需 prefix 變換
 *
 * 處理流程:
 *  1. 掃 public/data/insights-*-abstracts.json
 *  2. 對每個 patent ID,若 abstract 為空 / 太短(< 30 字)/ 純標題複製(Schema D fallback):
 *     - GET https://patents.google.com/patent/{id}
 *     - 從 meta tag 抽 abstract
 *     - 持久化到 enrich-cache.json(避免下次重抓)
 *  3. 把抓到的 abstract 寫回 -abstracts.json
 *  4. -light.json 不動(client 端 lazy load 還是讀 -abstracts)
 *
 * Usage:
 *   node scripts/enrich-patent-abstracts.mjs           # 跑全部缺漏的
 *   node scripts/enrich-patent-abstracts.mjs --force   # 連已有的也重抓
 *   node scripts/enrich-patent-abstracts.mjs --id TWI831658B  # 只跑單一專利
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DATA = join(ROOT, "public", "data");
const CACHE_DIR = join(ROOT, "data", "patent-abstract-cache");
const CACHE_PATH = join(CACHE_DIR, "abstracts.json");

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const FORCE = process.argv.includes("--force");
const SINGLE_ID = (() => {
  const i = process.argv.indexOf("--id");
  return i >= 0 ? process.argv[i + 1] : null;
})();

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const HEADERS = {
  "User-Agent": UA,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// === 載 cache ===
let cache = {};
if (existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {}
}
const cacheStartSize = Object.keys(cache).length;
console.log(`[enrich-abstracts] 載入 cache: ${cacheStartSize} 筆已抓過的 abstract`);

function saveCache() {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

// === 從 HTML 抽 abstract ===
function extractAbstract(html) {
  // 1. <meta name="DC.description" content="...">
  let m = html.match(/<meta[^>]+name="DC\.description"[^>]+content="([^"]+)"/i);
  if (m) return decodeHtml(m[1]);
  // 2. <meta name="description">(fallback)
  m = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
  if (m) {
    const v = decodeHtml(m[1]);
    // 排除「Patent xxx — Google」這種沒實際 abstract 的
    if (v.length > 30 && !/—\s*Google\s*Patents/.test(v)) return v;
  }
  // 3. <section itemprop="abstract">…</section>
  m = html.match(/<section[^>]+itemprop="abstract"[^>]*>([\s\S]*?)<\/section>/);
  if (m) {
    const text = stripHtml(m[1]).trim();
    if (text.length > 30) return text;
  }
  // 4. <abstract>...</abstract>(舊版)
  m = html.match(/<abstract[^>]*>([\s\S]*?)<\/abstract>/);
  if (m) {
    const text = stripHtml(m[1]).trim();
    if (text.length > 30) return text;
  }
  return null;
}

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .trim();
}
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPatentAbstract(patentId, retries = 2) {
  const url = `https://patents.google.com/patent/${patentId}/zh`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.status === 404) {
        // 404 → 試英文版
        const enRes = await fetch(`https://patents.google.com/patent/${patentId}`, { headers: HEADERS });
        if (!enRes.ok) return null;
        const html = await enRes.text();
        return extractAbstract(html);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      return extractAbstract(html);
    } catch (err) {
      if (attempt === retries) {
        console.log(`    [fail] ${patentId}: ${err.message}`);
        return null;
      }
      await sleep(1000);
    }
  }
  return null;
}

// === 找出所有需要補的 patent IDs ===
const abstractsFiles = readdirSync(PUBLIC_DATA).filter((f) =>
  /^insights-\d{4}-\d{2}-\d{2}-abstracts\.json$/.test(f)
);
console.log(`[enrich-abstracts] 掃描 ${abstractsFiles.length} 個 -abstracts.json 檔`);

const allFiles = abstractsFiles.map((f) => ({
  path: join(PUBLIC_DATA, f),
  data: JSON.parse(readFileSync(join(PUBLIC_DATA, f), "utf8")),
}));

function isLowQuality(abstract) {
  if (!abstract) return true;
  if (abstract.length < 30) return true;
  // Schema D fallback 把 title 當 abstract — 跟 title 完全一樣或只差幾字 → 視為低品質
  // 這個判斷需要 title,但這邊只有 abstract,先不做精細判斷
  return false;
}

// 收集需要補的 patent IDs
const needFetch = new Map();   // patentId → true
for (const { data } of allFiles) {
  for (const [pid, abstract] of Object.entries(data)) {
    if (SINGLE_ID && pid !== SINGLE_ID) continue;
    if (cache[pid]) continue;
    if (FORCE || isLowQuality(abstract)) {
      needFetch.set(pid, true);
    }
  }
}

const targets = [...needFetch.keys()];
console.log(`[enrich-abstracts] 需要從 Google Patents 抓 ${targets.length} 筆\n`);

if (targets.length === 0) {
  console.log("沒有需要補的 abstract — 全部已有資料或在 cache 中。");
  process.exit(0);
}

// === 並發 5 抓取,每篇 sleep 200ms 避免被 rate-limit ===
let i = 0;
let success = 0;
let failed = 0;
const startTime = Date.now();

async function worker() {
  while (i < targets.length) {
    const idx = i++;
    const pid = targets[idx];
    process.stdout.write(`  [${idx + 1}/${targets.length}] ${pid} ... `);
    const abstract = await fetchPatentAbstract(pid);
    if (abstract && abstract.length > 30) {
      cache[pid] = abstract;
      success++;
      process.stdout.write(`✓ (${abstract.length} 字)\n`);
      // 每 50 筆存一次 cache,防止中斷時資料遺失
      if (success % 50 === 0) saveCache();
    } else {
      failed++;
      process.stdout.write(`✗\n`);
    }
    await sleep(200);
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
saveCache();

console.log(`\n[enrich-abstracts] 抓取完成 — 成功 ${success},失敗 ${failed},耗時 ${Math.round((Date.now() - startTime) / 1000)}s`);

// === 把 cache 內容寫回各個 -abstracts.json ===
let writtenFiles = 0;
let writtenAbstracts = 0;
for (const { path, data } of allFiles) {
  let modified = false;
  for (const pid of Object.keys(data)) {
    if (cache[pid] && (FORCE || isLowQuality(data[pid]))) {
      data[pid] = cache[pid];
      modified = true;
      writtenAbstracts++;
    }
  }
  if (modified) {
    writeFileSync(path, JSON.stringify(data));
    writtenFiles++;
  }
}
console.log(`[enrich-abstracts] 寫回 ${writtenFiles} 個 -abstracts.json,共更新 ${writtenAbstracts} 筆 abstract`);
console.log(`Cache: ${CACHE_PATH}(${Object.keys(cache).length} 筆)`);
