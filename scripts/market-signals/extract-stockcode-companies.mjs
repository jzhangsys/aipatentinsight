#!/usr/bin/env node
/**
 * extract-stockcode-companies.mjs
 *
 * 從 16 個 insights snapshot 抽出所有有 stockCode 的公司,
 * 輸出 data/market-signals/companies.json:
 *   {
 *     allCompanies: [{ name, stockCode }, ...],   // 跨期 unique
 *     bySnapshot: {
 *       "2026-02-01": [{ name, stockCode }, ...],
 *       ...
 *     }
 *   }
 *
 * 用途:
 *  - allCompanies 給 scrape-news.mjs 用(每個公司只爬一次)
 *  - bySnapshot 給 build-market-signals.mjs 用(該期要顯示哪些公司)
 *
 * Usage: node scripts/market-signals/extract-stockcode-companies.mjs
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const PUBLIC_DATA = join(ROOT, "public", "data");
const OUT_DIR = join(ROOT, "data", "market-signals");
const OUT_PATH = join(OUT_DIR, "companies.json");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const snapshotsIdx = JSON.parse(readFileSync(join(PUBLIC_DATA, "snapshots.json"), "utf8"));

const allMap = new Map(); // stockCode → { name, stockCode } (最新一期出現的 name 為準)
const bySnapshot = {};

for (const snap of snapshotsIdx.timeline) {
  if (snap.placeholder) continue;
  const fileName = snap.url.replace(/^\/data\//, "");  // -light.json
  const json = JSON.parse(readFileSync(join(PUBLIC_DATA, fileName), "utf8"));
  const list = [];
  for (const c of json.companies || []) {
    if (!c.stockCode) continue;
    const code = String(c.stockCode).trim();
    if (!code) continue;
    list.push({ name: c.name, stockCode: code });
    allMap.set(code, { name: c.name, stockCode: code });
  }
  bySnapshot[snap.date] = list;
  console.log(`  ${snap.date}: ${list.length} stockCode 公司`);
}

const allCompanies = [...allMap.values()].sort((a, b) =>
  a.stockCode.localeCompare(b.stockCode)
);

const out = {
  generatedAt: new Date().toISOString(),
  totalUniqueCompanies: allCompanies.length,
  totalSnapshots: Object.keys(bySnapshot).length,
  allCompanies,
  bySnapshot,
};

writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
console.log(
  `\n[extract-companies] ✓ ${OUT_PATH}\n` +
    `  跨期 unique stockCode 公司: ${allCompanies.length}\n` +
    `  涵蓋 ${Object.keys(bySnapshot).length} 個 snapshot`
);
