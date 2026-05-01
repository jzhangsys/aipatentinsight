#!/usr/bin/env node
/**
 * import-csv-snapshots.mjs
 *
 * 從 data_update/*.csv 讀入(支援 4 種 schema 變體),輸出標準 InsightsDataset
 * JSON 到 public/data/insights-YYYY-MM-DD.json。
 *
 * 欄位映射(by name,不靠 column index):
 *   公司:    公司全名 / 申請人
 *   專利 ID: 專利號 / 公開公告號
 *   申請日:  申請日
 *   PR:      PR
 *   標題:    標題
 *   摘要:    專利摘要(Schema D 沒有 → 空字串)
 *   分支:    主分支 / 演化階段 (main/branch/decline)
 *   分類:    技術分類 / AI分類
 *   股票代碼: 股票代碼
 *   產業別:  產業別 (Schema D 沒有 → null)
 *   公開:    台灣上市櫃 / 台灣公開發行 / 公開發行 (Schema D 從 stockCode 推)
 *
 * 用法:  node scripts/import-csv-snapshots.mjs
 */

import Papa from "papaparse";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "data_update");
const OUT_DIR = join(ROOT, "public", "data");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ===== 欄位別名表(標準 key → 各 schema 可能名稱) =====
const FIELD_ALIASES = {
  company:        ["公司全名", "申請人"],
  patentId:       ["專利號", "公開公告號"],
  appDate:        ["申請日"],
  pr:             ["PR"],
  title:          ["標題"],
  abstract:       ["專利摘要"],
  branch:         ["主分支", "演化階段"],
  isPublicRaw:    ["台灣上市櫃", "台灣公開發行", "公開發行"],
  category:       ["技術分類", "AI分類", "技術大類"],
  stockCode:      ["股票代碼"],
  industry:       ["產業別"],
};

function findFieldIdx(headers, aliases) {
  for (const a of aliases) {
    const idx = headers.indexOf(a);
    if (idx >= 0) return idx;
  }
  return -1;
}

// ===== 「其他」cat 救援:用標題 / 摘要關鍵字重新歸類 =====
// 順序很重要:具體放前、通用放後;第一個命中就用
const KEYWORD_FALLBACK = [
  { kw: ["晶圓封裝", "覆晶", "wire bond", "打線", "凸塊", "重佈線", "RDL"], cat: "晶圓封裝與測試" },
  { kw: ["蝕刻", "光罩", "微影", "曝光", "化學機械", "離子佈植", "薄膜沉積", "CVD", "PVD"], cat: "半導體製程" },
  { kw: ["半導體", "晶圓", "電晶體", "MOSFET", "FinFET", "CMOS", "GaN", "SiC"], cat: "半導體結構" },
  { kw: ["MicroLED", "miniLED", "OLED", "LCD", "TFT", "面板", "顯示器", "顯示裝置", "背光"], cat: "顯示技術" },
  { kw: ["觸控"], cat: "觸控技術" },
  { kw: ["影像感測", "感光", "CIS", "感測元件", "感測器"], cat: "影像感測" },
  { kw: ["影像處理", "圖像處理", "視覺辨識", "目標檢測", "識別"], cat: "影像/視覺處理" },
  { kw: ["鏡頭", "光學成像", "光纖", "雷射", "光通訊", "光學系統"], cat: "光學元件" },
  { kw: ["DRAM", "SRAM", "NAND", "MRAM", "FLASH", "記憶體", "儲存"], cat: "記憶體與儲存" },
  { kw: ["散熱", "熱管理", "冷卻", "冷凝", "熱循環", "熱交換", "溫度預測"], cat: "散熱管理" },
  { kw: ["鋰電池", "電池", "充電", "電源管理", "供電", "電壓", "穩壓"], cat: "電源管理" },
  { kw: ["5G", "WiFi", "無線通訊", "天線", "射頻", "RF", "蜂巢", "基站"], cat: "通訊技術" },
  { kw: ["微控制器", "處理器", "MCU", "SoC", "AP", "邏輯分析"], cat: "處理器與控制器" },
  { kw: ["連接器", "接頭", "端子"], cat: "連接器" },
  { kw: ["印刷電路", "PCB", "電路板", "FPCB"], cat: "印刷電路板" },
  { kw: ["馬達", "齒輪", "軸承", "機械結構", "傳動"], cat: "電機機械" },
  { kw: ["加密", "資安", "認證", "簽章", "金鑰", "區塊鏈", "防偽"], cat: "資訊安全與加密" },
  { kw: ["神經網路", "深度學習", "機器學習", "人工智慧", "AI 模型", "演算法"], cat: "AI 演算法" },
  { kw: ["雲端", "資料中心", "邊緣運算", "edge computing"], cat: "雲端與邊緣運算" },
  { kw: ["生物辨識", "虹膜", "指紋", "人臉辨識"], cat: "生物辨識" },
  { kw: ["電動車", "車輛", "自駕"], cat: "車輛與電動車" },
  { kw: ["醫療", "醫學", "病患", "診斷", "治療"], cat: "醫療技術" },
  { kw: ["檢測", "量測", "測試"], cat: "檢測與量測" },
  { kw: ["3D 列印", "增材製造"], cat: "3D 列印" },
];

function reclassifyOther(title, abstract) {
  const text = ((title || "") + " " + (abstract || "")).toLowerCase();
  for (const { kw, cat } of KEYWORD_FALLBACK) {
    for (const k of kw) {
      if (text.includes(k.toLowerCase())) return cat;
    }
  }
  return "其他";
}

function parseDate(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === "NA") return null;
  // 接受 YYYY-MM-DD / YYYY/MM/DD,只取前 10
  return s.replace(/\//g, "-").slice(0, 10);
}

function fileNameToDate(name) {
  // 20240729 → 2024-07-29
  const m = name.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function normalizeBranch(s) {
  const v = String(s || "").toLowerCase().trim();
  if (v === "branch" || v === "分支") return "branch";
  if (v === "decline" || v === "衰退") return "decline";
  return "main"; // 預設 / "main" / 空字串
}

function normalizeIsPublic(rawVal) {
  if (rawVal == null) return false;
  const v = String(rawVal).trim().toLowerCase();
  return v === "yes" || v === "1" || v === "true" || v === "是" || v === "y";
}

function trimOrEmpty(v) {
  if (v == null) return "";
  return String(v).trim();
}

function nullIfEmpty(v) {
  const s = trimOrEmpty(v);
  if (!s || s === "NA") return null;
  return s;
}

function processCsv(filePath, srcName) {
  const text = readFileSync(filePath, "utf8");
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  /** @type {string[][]} */
  const rows = parsed.data;
  if (!rows || rows.length < 2) return null;

  const headers = rows[0].map((h) => String(h ?? "").trim());
  const records = rows.slice(1);

  // 找各欄位 column index
  const idx = {};
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    idx[key] = findFieldIdx(headers, aliases);
  }

  const snapshotDate = fileNameToDate(srcName);
  if (!snapshotDate) {
    console.warn(`  ⚠️  Skipping ${srcName} — invalid date filename`);
    return null;
  }

  // ===== Process patents =====
  // 同個 patent ID 在 CSV 中可能被多家共同申請人各列一 row(共同申請),
  // 早期版本 dedupe 用 seen.has(id) 會把後面的申請人吃掉 —
  // 結果有股號的台灣公司可能因為被前一行的無股號陸商/外商「先佔走」而完全消失。
  //
  // 修法:同 patent ID 多 row 時,優先保留有 stockCode 的那筆(因為我們最終
  // 只保留有股號的公司,有股號的版本能避免該專利完全被丟掉)。
  // 註:這仍是 whole-counting-style dedupe(每個 patent 只算一家),不是替每家
  // 共同申請人都記一筆。如未來想做 fractional/whole counting 再調。
  const patents = [];
  const patentIdxById = new Map(); // patent id → patents[] index

  function buildPatentRow(row) {
    const company = trimOrEmpty(idx.company >= 0 ? row[idx.company] : "");
    const id = trimOrEmpty(idx.patentId >= 0 ? row[idx.patentId] : "");
    if (!company || !id) return null;

    const date =
      parseDate(idx.appDate >= 0 ? row[idx.appDate] : null) || snapshotDate;
    const month = date.slice(0, 7);
    const stockCode = nullIfEmpty(idx.stockCode >= 0 ? row[idx.stockCode] : "");

    // isPublic:有 isPublicRaw 欄就讀,否則由 stockCode 推
    let isPublic;
    if (idx.isPublicRaw >= 0) {
      isPublic = normalizeIsPublic(row[idx.isPublicRaw]);
    } else {
      isPublic = stockCode != null;
    }

    // PR
    let pr = null;
    if (idx.pr >= 0) {
      const raw = trimOrEmpty(row[idx.pr]);
      if (raw && raw !== "NA") {
        const n = parseFloat(raw);
        if (Number.isFinite(n)) pr = n;
      }
    }

    const titleVal = trimOrEmpty(idx.title >= 0 ? row[idx.title] : "");
    const abstractVal =
      idx.abstract >= 0
        ? trimOrEmpty(row[idx.abstract])
        : titleVal;

    let categoryVal =
      trimOrEmpty(idx.category >= 0 ? row[idx.category] : "") || "其他";
    if (categoryVal === "其他") {
      categoryVal = reclassifyOther(titleVal, abstractVal);
    }

    return {
      id,
      company,
      date,
      month,
      title: titleVal,
      abstract: abstractVal,
      category: categoryVal,
      pr,
      branch: normalizeBranch(idx.branch >= 0 ? row[idx.branch] : "main"),
      industry: nullIfEmpty(idx.industry >= 0 ? row[idx.industry] : ""),
      stockCode,
      isPublic,
    };
  }

  for (const row of records) {
    if (!row || row.length === 0) continue;
    const newPatent = buildPatentRow(row);
    if (!newPatent) continue;

    const existingIdx = patentIdxById.get(newPatent.id);
    if (existingIdx !== undefined) {
      const existing = patents[existingIdx];
      // 已存在同 patent ID。新的有股號 / 舊的沒有 → 用新的取代
      if (!existing.stockCode && newPatent.stockCode) {
        patents[existingIdx] = newPatent;
      }
      // 否則維持原狀(舊的有股號或兩者都沒有)
      continue;
    }
    patentIdxById.set(newPatent.id, patents.length);
    patents.push(newPatent);
  }

  if (patents.length === 0) {
    console.warn(`  ⚠️  ${srcName} 解析後無 patent rows`);
    return null;
  }

  // ===== Aggregate companies =====
  /** @type {Map<string, any>} */
  const compMap = new Map();
  for (const p of patents) {
    let c = compMap.get(p.company);
    if (!c) {
      c = {
        name: p.company,
        totalPatents: 0,
        mainCategory: "",
        categoryDist: {},
        industry: p.industry,
        stockCode: p.stockCode,
        isPublic: p.isPublic,
        monthsActive: new Set(),
        patentIds: [],
      };
      compMap.set(p.company, c);
    }
    c.totalPatents++;
    c.categoryDist[p.category] = (c.categoryDist[p.category] || 0) + 1;
    c.monthsActive.add(p.month);
    c.patentIds.push(p.id);
    if (!c.industry && p.industry) c.industry = p.industry;
    if (!c.stockCode && p.stockCode) c.stockCode = p.stockCode;
    if (!c.isPublic && p.isPublic) c.isPublic = true;
  }

  const companies = [...compMap.values()].map((c) => {
    let max = 0;
    let main = "";
    for (const [cat, cnt] of Object.entries(c.categoryDist)) {
      if (cnt > max) {
        max = cnt;
        main = cat;
      }
    }
    return {
      name: c.name,
      totalPatents: c.totalPatents,
      mainCategory: main,
      categoryDist: c.categoryDist,
      industry: c.industry,
      stockCode: c.stockCode,
      isPublic: c.isPublic,
      monthsActive: [...c.monthsActive].sort(),
      patentIds: c.patentIds,
    };
  });

  // ===== 過濾:只保留有 stockCode 的公司,patents 同步篩 =====
  const publicNames = new Set(
    companies
      .filter((c) => c.stockCode != null && String(c.stockCode).trim() !== "")
      .map((c) => c.name)
  );
  const filteredCompanies = companies.filter((c) => publicNames.has(c.name));
  const filteredPatents = patents.filter((p) => publicNames.has(p.company));

  const months = [...new Set(filteredPatents.map((p) => p.month))].sort();
  const categories = [
    ...new Set(filteredPatents.map((p) => p.category)),
  ].sort();

  return {
    snapshotDate,
    region: "台灣",
    months,
    categories,
    totalCompanies: filteredCompanies.length,
    totalPatents: filteredPatents.length,
    companies: filteredCompanies,
    patents: filteredPatents,
  };
}

// ===== 主流程 =====
const csvFiles = readdirSync(SRC_DIR)
  .filter((f) => /^\d{8}\.csv$/.test(f))
  .sort();

console.log(`Found ${csvFiles.length} CSVs in ${SRC_DIR}\n`);

let okCount = 0;
const summary = [];
for (const file of csvFiles) {
  try {
    const result = processCsv(join(SRC_DIR, file), file);
    if (!result) continue;
    const outFile = `insights-${result.snapshotDate}.json`;
    const outPath = join(OUT_DIR, outFile);
    writeFileSync(outPath, JSON.stringify(result));
    const monthRange =
      result.months.length > 0
        ? `${result.months[0]}~${result.months[result.months.length - 1]}`
        : "—";
    console.log(
      `  ✓ ${file} → ${outFile}  (${String(result.totalCompanies).padStart(4)} 公司 / ${String(result.totalPatents).padStart(5)} 專利, ${result.categories.length} 分類, 月份範圍 ${monthRange})`
    );
    summary.push({ file, ...result, _monthRange: monthRange });
    okCount++;
  } catch (err) {
    console.error(`  ✗ ${file} → ERROR:`, err.message);
  }
}

console.log(`\nDone: ${okCount}/${csvFiles.length} 成功匯入`);

// 印 summary table
if (summary.length > 0) {
  console.log("\n=== 摘要 ===");
  for (const s of summary) {
    console.log(
      `  ${s.snapshotDate}  公司=${String(s.totalCompanies).padStart(4)}  ` +
        `專利=${String(s.totalPatents).padStart(5)}  ` +
        `cat=${String(s.categories.length).padStart(2)}  ` +
        `月份=${s._monthRange}`
    );
  }
}
