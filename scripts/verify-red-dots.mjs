#!/usr/bin/env node
/**
 * verify-red-dots.mjs
 *
 * 驗證每個公司頁面上的「紅燈」(該 snapshot 中該公司有資料)是否
 * 真的對應到該日期的原始 CSV 輸入。
 *
 * 紅燈邏輯(insightsData.ts findCompanyAppearances):
 *   present = snapshot.companyNames.includes(companyName)
 *   companyNames 來自 ETL 後的 insights-YYYY-MM-DD.json 的 companies[].name
 *   ETL 過濾條件:只保留 stockCode != null && trim() !== ""
 *
 * 驗證方向:
 *   (a) False positive: insights 有但 CSV 沒有 → ETL 產生幻影公司(嚴重)
 *   (b) Filtered out: CSV 有但無 stockCode → 被 ETL 正確過濾(預期行為,非錯誤)
 *   (c) Missing: CSV 有 stockCode 但 insights 沒有 → ETL 漏抓(嚴重)
 *
 * Usage:  node scripts/verify-red-dots.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV_DIR = join(ROOT, "data_update");
const DATA_DIR = join(ROOT, "public", "data");

// CSV YYYYMMDD → snapshot date YYYY-MM-DD
function csvDateToSnapshot(name) {
  const m = name.match(/^(\d{4})(\d{2})(\d{2})\.csv$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

// 簡單 CSV parser(處理引號包字串內含逗號 + 跨行)
function parseCSV(text) {
  const rows = [];
  let cur = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (field !== "" || cur.length > 0) { cur.push(field); rows.push(cur); cur = []; field = ""; }
        if (ch === "\r" && text[i + 1] === "\n") i++;
      } else field += ch;
    }
  }
  if (field !== "" || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}

// 從 header 對到對應 column 索引(支援多種 alias)
function findCol(header, ...aliases) {
  for (let i = 0; i < header.length; i++) {
    const h = (header[i] || "").trim();
    for (const a of aliases) if (h === a) return i;
  }
  return -1;
}

function loadCsvCompanies(csvPath) {
  const text = readFileSync(csvPath, "utf8");
  const rows = parseCSV(text);
  if (rows.length < 2) return { withCode: new Map(), withoutCode: new Set() };
  const header = rows[0];
  const colCompany = findCol(header, "公司全名", "申請人");
  const colStock = findCol(header, "股票代碼");
  if (colCompany < 0) return { withCode: new Map(), withoutCode: new Set() };

  // company → set of stockCodes seen across rows
  // ETL nullIfEmpty 會把 "NA" 也當空,這邊照做
  const isValidCode = (c) => c && c.trim() !== "" && c.trim() !== "NA";
  const map = new Map();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[colCompany] || "").trim();
    if (!name) continue;
    const code = colStock >= 0 ? (row[colStock] || "").trim() : "";
    if (!map.has(name)) map.set(name, new Set());
    if (isValidCode(code)) map.get(name).add(code);
  }
  // 切成兩組:有 stockCode 的 / 完全沒 stockCode 的
  const withCode = new Map();
  const withoutCode = new Set();
  for (const [name, codes] of map.entries()) {
    if (codes.size > 0) withCode.set(name, [...codes]);
    else withoutCode.add(name);
  }
  return { withCode, withoutCode };
}

// === 主流程 ===
const snapshotsIdx = JSON.parse(
  readFileSync(join(DATA_DIR, "snapshots.json"), "utf8")
);
const csvFiles = readdirSync(CSV_DIR).filter((f) => f.endsWith(".csv")).sort();

let totalFalsePositive = 0;
let totalFalseNegative = 0;
let totalCorrectFiltered = 0;

console.log("=".repeat(80));
console.log("紅燈一致性驗證:每個 snapshot 比對 insights vs 原始 CSV");
console.log("=".repeat(80));
console.log("");

const perSnapshotReport = [];

for (const csvFile of csvFiles) {
  const date = csvDateToSnapshot(csvFile);
  if (!date) continue;

  // 找對應的 insights JSON
  const snapEntry = snapshotsIdx.timeline.find((s) => s.date === date);
  if (!snapEntry || snapEntry.placeholder) {
    console.log(`[${date}] ⚠ snapshot 不存在或為 placeholder,略過`);
    continue;
  }

  // 載 CSV
  const { withCode: csvWithCode, withoutCode: csvWithoutCode } = loadCsvCompanies(
    join(CSV_DIR, csvFile)
  );
  // 載 insights JSON(用 -light)
  const insightsName = snapEntry.url.replace(/^\/data\//, "");
  const insightsJson = JSON.parse(
    readFileSync(join(DATA_DIR, insightsName), "utf8")
  );
  const insightsCompanies = new Map();
  for (const c of insightsJson.companies || []) {
    insightsCompanies.set(c.name, c.stockCode);
  }

  // (a) False positive: insights 有但 CSV 完全沒有(連 withoutCode 也找不到)
  const falsePos = [];
  for (const [name] of insightsCompanies.entries()) {
    if (!csvWithCode.has(name) && !csvWithoutCode.has(name)) {
      falsePos.push(name);
    }
  }
  // (b) Correctly filtered: CSV 有但無 stockCode → 不該在 insights(預期被擋)
  const correctlyFiltered = [];
  for (const name of csvWithoutCode) {
    if (!insightsCompanies.has(name)) correctlyFiltered.push(name);
  }
  // (c) False negative: CSV 有 stockCode 但 insights 沒抓到
  const falseNeg = [];
  for (const [name, codes] of csvWithCode.entries()) {
    if (!insightsCompanies.has(name)) falseNeg.push({ name, codes });
  }

  totalFalsePositive += falsePos.length;
  totalFalseNegative += falseNeg.length;
  totalCorrectFiltered += correctlyFiltered.length;

  const csvUniqueAppl = csvWithCode.size + csvWithoutCode.size;
  const insightsCount = insightsCompanies.size;

  perSnapshotReport.push({
    date,
    csvUnique: csvUniqueAppl,
    csvWithCode: csvWithCode.size,
    csvWithoutCode: csvWithoutCode.size,
    insightsCount,
    falsePos: falsePos.length,
    falseNeg: falseNeg.length,
    correctFiltered: correctlyFiltered.length,
  });

  console.log(
    `[${date}]  CSV: ${csvUniqueAppl} unique applicants ` +
      `(${csvWithCode.size} 有 stockCode / ${csvWithoutCode.size} 無)  ` +
      `Insights: ${insightsCount}  ` +
      `FP=${falsePos.length}  FN=${falseNeg.length}  Filtered(預期)=${correctlyFiltered.length}`
  );
  if (falsePos.length > 0) {
    console.log(`  ❌ FALSE POSITIVE (insights 有但 CSV 找不到):`);
    falsePos.slice(0, 10).forEach((n) => console.log(`     - ${n}`));
    if (falsePos.length > 10) console.log(`     ...還有 ${falsePos.length - 10} 筆`);
  }
  if (falseNeg.length > 0) {
    console.log(`  ❌ FALSE NEGATIVE (CSV 有 stockCode 但 insights 漏掉):`);
    falseNeg.slice(0, 10).forEach((x) =>
      console.log(`     - ${x.name}  [stockCode: ${x.codes.join(", ")}]`)
    );
    if (falseNeg.length > 10) console.log(`     ...還有 ${falseNeg.length - 10} 筆`);
  }
}

console.log("");
console.log("=".repeat(80));
console.log("彙總");
console.log("=".repeat(80));
console.log(`False Positive (紅燈但 CSV 找不到):       ${totalFalsePositive}`);
console.log(`False Negative (CSV 有股號但 insights 漏抓): ${totalFalseNegative}`);
console.log(`Correctly Filtered (CSV 無股號被擋掉,正確): ${totalCorrectFiltered}`);
console.log("");
if (totalFalsePositive === 0 && totalFalseNegative === 0) {
  console.log("✅ 全部紅燈時間點都對應到原始 CSV,沒有幻影公司也沒有漏抓");
} else {
  console.log("⚠️ 有不一致,請看上面 FP / FN 列表");
}
