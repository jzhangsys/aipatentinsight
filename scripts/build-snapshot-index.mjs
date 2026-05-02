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

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
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
  // 只認原檔(non-derivative);跳過 -light / -abstracts 衍生檔
  const files = readdirSync(DATA_DIR).filter(
    (f) =>
      /^insights-\d{4}-\d{2}-\d{2}\.json$/.test(f) &&
      !f.includes("-light") &&
      !f.includes("-abstracts")
  );
  return files
    .map((file) => {
      const fullPath = join(DATA_DIR, file);
      const json = JSON.parse(readFileSync(fullPath, "utf8"));
      const date = json.snapshotDate;
      const baseName = file.replace(/\.json$/, "");

      // 衍生 light + abstracts(每個原檔產一對)
      generateDerivatives(fullPath, baseName, json);

      return {
        date,
        // 預設用 -light(快),client 端 lazy load -abstracts
        url: `/data/${baseName}-light.json`,
        urlFull: `/data/${file}`,
        urlAbstracts: `/data/${baseName}-abstracts.json`,
        label: formatLabel(date),
        region: json.region || null,
        totalCompanies: json.totalCompanies,
        totalPatents: json.totalPatents,
        companyNames: (json.companies || []).map((c) => c.name),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// === 衍生兩份檔:light(無 abstract) + abstracts(只 abstract map) ===
function generateDerivatives(srcPath, baseName, json) {
  const lightPath = join(DATA_DIR, `${baseName}-light.json`);
  const abstractsPath = join(DATA_DIR, `${baseName}-abstracts.json`);

  // -light:同 schema,但 abstract 全部清空
  const light = {
    ...json,
    patents: (json.patents || []).map((p) => ({ ...p, abstract: "" })),
  };
  writeFileSync(lightPath, JSON.stringify(light));

  // -abstracts:單純 { patentId: abstract } 對映,壓到最小
  // 重要:既有 -abstracts.json 視為 ground truth(被 enrich 過,通常比 source 完整)。
  //   merge 策略:source 跟既有版本逐一比長度,取較長的。
  //   這樣 enrich 補進去的長 abstract 不會被 build 蓋回 16 字 fallback 標題。
  const existingAbstracts = (() => {
    try {
      if (existsSync(abstractsPath)) {
        return JSON.parse(readFileSync(abstractsPath, "utf8"));
      }
    } catch {}
    return {};
  })();

  const abstracts = { ...existingAbstracts };
  for (const p of json.patents || []) {
    const fromSource = p.abstract || "";
    if (!fromSource) continue;
    const existing = abstracts[p.id] || "";
    // 取較長者(代表更完整),且至少 30 字才視為「真 abstract」
    if (fromSource.length > existing.length) {
      abstracts[p.id] = fromSource;
    }
  }
  writeFileSync(abstractsPath, JSON.stringify(abstracts));

  console.log(
    `  [derive] ${baseName} → light(${formatBytes(JSON.stringify(light).length)}) + abstracts(${formatBytes(JSON.stringify(abstracts).length)}, ${Object.keys(abstracts).length} patents)`
  );
}

function formatBytes(n) {
  if (n < 1024) return n + "B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + "KB";
  return (n / 1024 / 1024).toFixed(2) + "MB";
}

function formatLabel(date) {
  // "2025-02-15" → "2025/02"
  if (!date) return "";
  const [y, m] = date.split("-");
  return `${y}/${m}`;
}

// === 把所有 snapshot 的 -abstracts 合併成一份 master ===
//   原本 lazy loader 寫死指向某一份 -abstracts.json,跨 snapshot 的 patent 會查不到。
//   改成 build-time 合併,client 一次拿,O(1) 查表。
function buildMasterAbstracts() {
  const abstractsFiles = readdirSync(DATA_DIR).filter(
    (f) => /^insights-\d{4}-\d{2}-\d{2}-abstracts\.json$/.test(f)
  );
  const master = {};
  for (const file of abstractsFiles) {
    const data = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
    for (const [pid, abst] of Object.entries(data)) {
      if (!abst) continue;
      // 同 patent 出現在多個 snapshot — 取最長的(品質代理:抓比 fallback 完整)
      if (!master[pid] || abst.length > master[pid].length) {
        master[pid] = abst;
      }
    }
  }
  const masterPath = join(DATA_DIR, "abstracts-master.json");
  const masterJson = JSON.stringify(master);
  writeFileSync(masterPath, masterJson);
  console.log(
    `  [master] ${abstractsFiles.length} 份 -abstracts → master(${Object.keys(master).length} unique patents, ${formatBytes(masterJson.length)})`
  );
  return Object.keys(master).length;
}

// === 主流程 ===
const actual = scanActualSnapshots();
const masterCount = buildMasterAbstracts();
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
