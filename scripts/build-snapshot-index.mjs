#!/usr/bin/env node
/**
 * build-snapshot-index.mjs
 *
 * Build 時跑(由 package.json prebuild 觸發):
 *   1. 掃描 public/data/insights-*.json
 *   2. 從每份 JSON 抽出 metadata(snapshotDate / totalCompanies / totalPatents / 公司名單)
 *   3. 產出 public/data/snapshots.json,提供給 client 端 fetch
 *
 * 公司名單(companyNames)的用途:
 *   公司頁要快速判斷「該公司在哪些 snapshot 出現」,逐個 snapshot 載入 3.3MB JSON
 *   太貴。把公司名抽出來放索引裡 → 每個 snapshot 多 ~50KB 就夠判斷。
 *
 * 注意:這個檔案是 .mjs 純 Node.js,不能 import TS 檔(會被 import())失敗。
 *       EXPECTED_SNAPSHOT_DATES 透過讀 source 檔解析得到。
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");
const OUT_PATH = join(DATA_DIR, "snapshots.json");
const CONFIG_PATH = join(
  PROJECT_ROOT,
  "lib",
  "aipatentinsight",
  "snapshotsConfig.ts"
);

// === 解析 EXPECTED_SNAPSHOT_DATES from snapshotsConfig.ts ===
function readExpectedDates() {
  if (!existsSync(CONFIG_PATH)) return [];
  const src = readFileSync(CONFIG_PATH, "utf8");
  // 簡單 regex 抓陣列內所有 "YYYY-MM-DD" 字串
  const dates = [...src.matchAll(/"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
  return dates;
}

// === 掃 public/data/insights-*.json ===
function scanActualSnapshots() {
  if (!existsSync(DATA_DIR)) return [];
  const files = readdirSync(DATA_DIR).filter(
    (f) => /^insights-\d{4}-\d{2}-\d{2}\.json$/.test(f)
  );
  return files.map((file) => {
    const fullPath = join(DATA_DIR, file);
    const json = JSON.parse(readFileSync(fullPath, "utf8"));
    return {
      date: json.snapshotDate,
      url: `/data/${file}`,
      label: formatLabel(json.snapshotDate),
      region: json.region || null,
      totalCompanies: json.totalCompanies,
      totalPatents: json.totalPatents,
      // 抽公司名清單,讓 client 不用 fetch 整份 JSON 就能判斷有無此公司
      companyNames: (json.companies || []).map((c) => c.name),
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function formatLabel(date) {
  // "2025-02-15" → "2025/02"
  if (!date) return "";
  const [y, m] = date.split("-");
  return `${y}/${m}`;
}

// === 主流程 ===
const actual = scanActualSnapshots();
const actualDates = new Set(actual.map((s) => s.date));
const expected = readExpectedDates();

// expected 裡有但 actual 沒有的:placeholder
const placeholders = expected
  .filter((d) => !actualDates.has(d))
  .map((d) => ({
    date: d,
    label: formatLabel(d),
    placeholder: true,
  }));

// 合併 + 排序
const timeline = [
  ...actual.map((s) => ({ ...s, placeholder: false })),
  ...placeholders,
].sort((a, b) => a.date.localeCompare(b.date));

const output = {
  generatedAt: new Date().toISOString(),
  totalActual: actual.length,
  totalExpected: expected.length,
  timeline,
};

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(
  `[snapshot-index] ✓ Generated ${OUT_PATH} — ` +
    `${actual.length} actual, ${placeholders.length} placeholders, ${timeline.length} total`
);
