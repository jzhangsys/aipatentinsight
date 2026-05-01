/**
 * insightsData.ts — 公司專利圖譜資料層
 *
 * 對應 public/data/insights-2025-02-15.json (3.3 MB),含 719 家公司 / 3550 筆專利。
 * 用 fetch 按需載入,避免 3.3 MB 進 JS bundle。第一次呼叫後 Promise 快取,
 * 之後重複呼叫共用同一個請求結果。
 */

// ============== Types (對齊 JSON schema) ==============

/** 一家公司在這個快照裡的概況 */
export type InsightsCompany = {
  /** 公司中文名 */
  name: string;
  /** 此公司在這個 snapshot 內的專利總數 */
  totalPatents: number;
  /** 主要技術分類(以該公司專利數最多的 category 為準) */
  mainCategory: string;
  /** 此公司各 category 的分布(category → 該 category 的專利數) */
  categoryDist: Record<string, number>;
  /** 產業別,可能為 null(未上市/未分類) */
  industry: string | null;
  /** 股票代號(僅上市櫃)或 null */
  stockCode: string | null;
  /** 是否上市櫃 */
  isPublic: boolean;
  /** 此公司有專利紀錄的月份(YYYY-MM 格式) */
  monthsActive: string[];
  /** 此公司所有專利的 ID 清單(對應 patents[].id) */
  patentIds: string[];
};

/** 一筆專利紀錄 */
export type InsightsPatent = {
  /** 專利 ID(如 TWI848541B) */
  id: string;
  /** 申請公司中文名(對應 InsightsCompany.name) */
  company: string;
  /** 公開日(YYYY-MM-DD) */
  date: string;
  /** 公開月份(YYYY-MM) */
  month: string;
  /** 專利標題 */
  title: string;
  /** 專利摘要(中文) */
  abstract: string;
  /** 技術分類 */
  category: string;
  /** PR 值(percentile rank,0-100,越高越重要)— 可能為 null */
  pr: number | null;
  /** 主流 / 分支 / 衰退 三狀態 */
  branch: "main" | "branch" | "decline";
  /** 申請公司產業別 */
  industry: string | null;
  /** 申請公司股票代號 */
  stockCode: string | null;
  /** 申請公司是否上市櫃 */
  isPublic: boolean;
};

/** 整個 insights snapshot 的頂層結構 */
export type InsightsDataset = {
  /** 快照產生日期(YYYY-MM-DD) */
  snapshotDate: string;
  /** 區域(目前固定為「台灣」) */
  region: string;
  /** 此快照涵蓋的所有月份(已排序,YYYY-MM) */
  months: string[];
  /** 此快照出現的所有 category */
  categories: string[];
  /** 公司總數 */
  totalCompanies: number;
  /** 專利總數 */
  totalPatents: number;
  /** 公司清單 */
  companies: InsightsCompany[];
  /** 專利清單 */
  patents: InsightsPatent[];
};

// ============== Multi-snapshot Index ==============

/** snapshot 索引條目(由 prebuild 腳本產出) */
export type SnapshotEntry = {
  /** 日期(YYYY-MM-DD) */
  date: string;
  /** 顯示用 label(YYYY/MM) */
  label: string;
  /** placeholder 為 true 時表示「預期會有但還沒實際存在」,以下欄位都是 undefined */
  placeholder: boolean;
  /** -light 版 URL(無 abstract,主要使用) */
  url?: string;
  /** 完整 URL(含 abstract,目前不主動載) */
  urlFull?: string;
  /** abstracts only URL({ id: abstract } map),lazy load 用 */
  urlAbstracts?: string;
  region?: string | null;
  totalCompanies?: number;
  totalPatents?: number;
  /** 該 snapshot 包含的公司名清單(用於不載完整 JSON 就判斷公司在不在) */
  companyNames?: string[];
};

export type SnapshotIndex = {
  generatedAt: string;
  totalActual: number;
  totalExpected: number;
  timeline: SnapshotEntry[];
};

const SNAPSHOT_INDEX_URL = "/data/snapshots.json";
let cachedIndex: Promise<SnapshotIndex> | null = null;

/** 載入 snapshot 索引(prebuild 產生)。Promise cached。 */
export function loadSnapshotIndex(): Promise<SnapshotIndex> {
  if (!cachedIndex) {
    cachedIndex = fetch(SNAPSHOT_INDEX_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load snapshot index: HTTP " + res.status);
        return res.json() as Promise<SnapshotIndex>;
      })
      .catch((err) => {
        cachedIndex = null;
        throw err;
      });
  }
  return cachedIndex;
}

/**
 * 給定一個公司名,從索引判斷它在哪些 snapshot 出現。
 * 不需要實際載入 3.3MB 的 JSON — 只看 companyNames 清單即可。
 */
export type CompanyAppearance = {
  /** snapshot 條目 */
  snapshot: SnapshotEntry;
  /** 是否在該 snapshot 出現(placeholder 永遠 false) */
  present: boolean;
};

export async function findCompanyAppearances(
  companyName: string
): Promise<CompanyAppearance[]> {
  const index = await loadSnapshotIndex();
  return index.timeline.map((snap) => ({
    snapshot: snap,
    present: !snap.placeholder && (snap.companyNames || []).includes(companyName),
  }));
}

/** 載入指定日期的 snapshot,沒對到回 null。 */
export async function loadSnapshotByDate(
  date: string
): Promise<InsightsDataset | null> {
  const index = await loadSnapshotIndex();
  const entry = index.timeline.find((s) => s.date === date && !s.placeholder);
  if (!entry || !entry.url) return null;
  return loadInsights(entry.url);
}

// ============== Loader (fetch + Promise cache) ==============

/**
 * 預設 snapshot 路徑 — 用 -light 版本(無 abstract,~1.16MB → gzip ~250KB)。
 * abstract 透過 getPatentAbstract(id) lazy load,只在 patent modal 開啟時才需要。
 */
const DEFAULT_INSIGHTS_URL = "/data/insights-2025-02-15-light.json";

// ============== Abstract lazy loader ==============

const ABSTRACTS_URL = "/data/insights-2025-02-15-abstracts.json";
let abstractsCache: Promise<Record<string, string>> | null = null;

/**
 * 取得某 patent 的 abstract(lazy)。
 * 第一次呼叫會 fetch ~1.7MB 的 abstracts 檔(整批快取);之後 O(1) 查表。
 */
export async function getPatentAbstract(patentId: string): Promise<string> {
  if (!abstractsCache) {
    abstractsCache = fetch(ABSTRACTS_URL)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load abstracts: HTTP " + r.status);
        return r.json() as Promise<Record<string, string>>;
      })
      .catch((err) => {
        abstractsCache = null;
        throw err;
      });
  }
  const map = await abstractsCache;
  return map[patentId] || "";
}

/** 預先 prefetch abstracts,讓使用者一進站就在背景下載(可選) */
export function prefetchAbstracts(): void {
  if (!abstractsCache) {
    abstractsCache = fetch(ABSTRACTS_URL)
      .then((r) => r.json() as Promise<Record<string, string>>)
      .catch((err) => {
        abstractsCache = null;
        throw err;
      });
  }
}

let cachedPromise: Promise<InsightsDataset> | null = null;

/**
 * 載入 insights 資料集(用 fetch,有 Promise 快取)。
 * 第一次呼叫會發 HTTP 請求;之後呼叫直接回傳同一個 Promise(資料不重抓)。
 *
 * @param url 自訂的 JSON 路徑(預設 /data/insights-2025-02-15.json)
 */
export function loadInsights(
  url: string = DEFAULT_INSIGHTS_URL
): Promise<InsightsDataset> {
  // 自訂 URL 時不走快取,避免不同 snapshot 互相覆蓋
  if (url !== DEFAULT_INSIGHTS_URL) {
    return fetchInsights(url);
  }

  if (!cachedPromise) {
    cachedPromise = fetchInsights(url);
    // 失敗時清掉快取,讓使用者下次有機會重試
    cachedPromise.catch(() => {
      cachedPromise = null;
    });
  }
  return cachedPromise;
}

async function fetchInsights(url: string): Promise<InsightsDataset> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load insights: HTTP ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as InsightsDataset;
  return data;
}

// ============== Helper: filter to public companies ==============

/**
 * 只保留有 stockCode 的公司(上市櫃),patents 同步過濾。
 * 用於 Patent Map / Industry Trends / Market Signals 全站列表。
 * 不影響 CompanyTimelineClient(走 URL 直連可訪問任何公司)。
 */
export function filterInsightsToPublic(ds: InsightsDataset): InsightsDataset {
  const publicNames = new Set(
    ds.companies.filter((c) => c.stockCode != null && c.stockCode !== "").map((c) => c.name)
  );
  const companies = ds.companies.filter((c) => publicNames.has(c.name));
  const patents = ds.patents.filter((p) => publicNames.has(p.company));
  return {
    ...ds,
    companies,
    patents,
    totalCompanies: companies.length,
    totalPatents: patents.length,
  };
}

// ============== Helper: patent lookup ==============

/**
 * 由 patentId 快速查找對應的 patent 物件。
 * 第一次呼叫會建索引(O(N)),之後 O(1)。
 *
 * 用 WeakMap 把索引綁在 dataset instance 上,dataset 被 GC 時索引也跟著釋放。
 */
const patentIndexCache = new WeakMap<InsightsDataset, Map<string, InsightsPatent>>();

export function getPatentById(
  dataset: InsightsDataset,
  patentId: string
): InsightsPatent | undefined {
  let idx = patentIndexCache.get(dataset);
  if (!idx) {
    idx = new Map();
    for (const p of dataset.patents) {
      idx.set(p.id, p);
    }
    patentIndexCache.set(dataset, idx);
  }
  return idx.get(patentId);
}

/**
 * 由公司名快速查找對應的 company 物件。
 */
const companyIndexCache = new WeakMap<InsightsDataset, Map<string, InsightsCompany>>();

export function getCompanyByName(
  dataset: InsightsDataset,
  name: string
): InsightsCompany | undefined {
  let idx = companyIndexCache.get(dataset);
  if (!idx) {
    idx = new Map();
    for (const c of dataset.companies) {
      idx.set(c.name, c);
    }
    companyIndexCache.set(dataset, idx);
  }
  return idx.get(name);
}
