"use client";

/**
 * PatentMapClient — Patent Map 頁面 orchestrator (R3a + R3b + R6 URL sync)
 *
 * 控制:Time Range / Mode / Branch / Layout / Legend / 公司清單 / detail panel / patent modal
 * 把 dataset 跟篩選傳給 <PatentMapCanvas>;狀態同步散播到各 UI 面板。
 *
 * URL 雙向綁:
 *   - mount 時讀 ?month=&mode=&branch=&layout=&category=&company= 初始化 state
 *   - state 變化時用 history.replaceState 更新 URL(不觸發 Next.js 導航,不滾動)
 *   - 預設值不寫進 URL,保持 URL 簡潔
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PatentMapCanvas, { type PatentMapLayout } from "./PatentMapCanvas";
import PatentMapLegend, { type LegendCategoryRow } from "./PatentMapLegend";
import PatentMapCompanyPanel from "./PatentMapCompanyPanel";
import PatentMapDetailPanel from "./PatentMapDetailPanel";
import PatentMapPatentModal from "./PatentMapPatentModal";
import {
  loadInsights,
  type InsightsDataset,
  type InsightsCompany,
  type InsightsPatent,
  getCompanyByName,
} from "@/lib/aipatentinsight/insightsData";
import {
  buildCategoryPalette,
  type LayoutCompany,
} from "@/lib/aipatentinsight/patentMapLayout";

type Mode = "cumulative" | "monthly";
type Branch = "all" | "main" | "branch" | "decline";

// === URL 解析 helpers ===
function parseMode(v: string | null): Mode {
  return v === "monthly" ? "monthly" : "cumulative";
}
function parseBranch(v: string | null): Branch {
  return v === "main" || v === "branch" || v === "decline" ? v : "all";
}
function parseLayout(v: string | null): PatentMapLayout {
  return v === "force" ? "force" : "random";
}

export default function PatentMapClient() {
  const searchParams = useSearchParams();

  // ===== 資料載入 =====
  const [dataset, setDataset] = useState<InsightsDataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadInsights()
      .then((d) => { if (!cancelled) setDataset(d); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, []);

  // ===== UI 狀態(從 URL 初始化) =====
  // 注意:這裡用 lazy initializer + useState 讀一次 URL,之後 URL 變化由 state 控制,
  // 不會 re-init(避免 ?company= 切換時 state 被重置)
  const [selectedMonth, setSelectedMonth] = useState<string | "all">(() => {
    return searchParams.get("month") || "all";
  });
  const [mode, setMode] = useState<Mode>(() => parseMode(searchParams.get("mode")));
  const [branch, setBranch] = useState<Branch>(() => parseBranch(searchParams.get("branch")));
  const [layout, setLayout] = useState<PatentMapLayout>(() => parseLayout(searchParams.get("layout")));
  const [activeCategory, setActiveCategory] = useState<string | null>(() => searchParams.get("category"));
  const [visibleCompanies, setVisibleCompanies] = useState<LayoutCompany[]>([]);

  // ===== 詳情面板 / patent modal 狀態(從 URL 初始化) =====
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(
    () => searchParams.get("company")
  );
  const [selectedPatent, setSelectedPatent] = useState<InsightsPatent | null>(null);

  // ===== URL 同步:state 變化時更新 ?query 字串(history.replaceState 不滾動) =====
  // 用 ref 標記 first render 跳過,避免初始載入立刻 push 一次無意義的 URL 更新
  const urlInitialized = useRef(false);
  useEffect(() => {
    if (!urlInitialized.current) {
      urlInitialized.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (selectedMonth !== "all") params.set("month", selectedMonth);
    if (mode !== "cumulative") params.set("mode", mode);
    if (branch !== "all") params.set("branch", branch);
    if (layout !== "random") params.set("layout", layout);
    if (activeCategory) params.set("category", activeCategory);
    if (selectedCompanyName) params.set("company", selectedCompanyName);
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? "?" + qs : "");
    if (window.location.search.replace(/^\?/, "") !== qs) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [selectedMonth, mode, branch, layout, activeCategory, selectedCompanyName]);

  // 取對應的 InsightsCompany 物件(完整資料,給 detail panel 用)
  const selectedCompany: InsightsCompany | null = useMemo(() => {
    if (!dataset || !selectedCompanyName) return null;
    return getCompanyByName(dataset, selectedCompanyName) || null;
  }, [dataset, selectedCompanyName]);

  // ===== ESC 鍵:patent modal 優先,然後 detail panel =====
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedPatent) setSelectedPatent(null);
        else if (selectedCompanyName) setSelectedCompanyName(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPatent, selectedCompanyName]);

  // ===== detail-open class:讓 CSS 控制其他 UI 元素 =====
  useEffect(() => {
    const root = document.querySelector(".ai-patent-map");
    if (!root) return;
    if (selectedCompanyName) root.classList.add("detail-open");
    else root.classList.remove("detail-open");
  }, [selectedCompanyName]);

  // ===== 衍生資料 =====
  const palette = useMemo(
    () => (dataset ? buildCategoryPalette(dataset.categories) : {}),
    [dataset]
  );

  const legendRows = useMemo<LegendCategoryRow[]>(() => {
    if (!dataset) return [];
    const counts = new Map<string, number>();
    for (const c of visibleCompanies) {
      counts.set(c.mainCategory, (counts.get(c.mainCategory) || 0) + 1);
    }
    return dataset.categories.map((cat) => ({
      category: cat,
      count: counts.get(cat) || 0,
      color: palette[cat] || "#CCCCCC",
    }));
  }, [dataset, visibleCompanies, palette]);

  // 給 detail panel 用的:當前篩選範圍內的 patent IDs
  const filteredPatentIds = useMemo(() => {
    if (!dataset) return new Set<string>();
    let list = dataset.patents;
    if (selectedMonth !== "all") {
      if (mode === "monthly") list = list.filter((p) => p.month === selectedMonth);
      else list = list.filter((p) => p.month <= selectedMonth);
    }
    if (branch !== "all") list = list.filter((p) => p.branch === branch);
    return new Set(list.map((p) => p.id));
  }, [dataset, selectedMonth, mode, branch]);

  const totalPatentsInView = useMemo(
    () => visibleCompanies.reduce((sum, c) => sum + c.displayPatents, 0),
    [visibleCompanies]
  );

  const periodText = useMemo(() => {
    if (selectedMonth === "all") return "All";
    const prefix = mode === "monthly" ? "" : "≤ ";
    return prefix + selectedMonth.replace("-", ".");
  }, [selectedMonth, mode]);

  const filteredCompanies = activeCategory
    ? visibleCompanies.filter((c) => c.mainCategory === activeCategory)
    : visibleCompanies;

  // 公司清單面板用的 meta lookup
  const getCompanyMeta = useMemo(() => {
    return (name: string) => {
      if (!dataset) return null;
      const c = getCompanyByName(dataset, name);
      if (!c) return null;
      return { stockCode: c.stockCode, isPublic: c.isPublic };
    };
  }, [dataset]);

  // ===== Render =====
  if (loadError) {
    return (
      <main className="ai-page ai-patent-map">
        <div className="ai-map-error">
          <strong>ERROR</strong>
          <p>資料載入失敗:{loadError}</p>
        </div>
      </main>
    );
  }
  if (!dataset) {
    return (
      <main className="ai-page ai-patent-map">
        {/* 結構骨架:暗示 header + canvas + legend + stats 位置,讓使用者第一秒就看到「框」 */}
        <header className="ai-page-header">
          <div>
            <h1 className="ai-page-title">Patent Intelligence Map</h1>
            <p className="ai-page-description">載入專利資料中…</p>
          </div>
          <div className="ai-controls ai-skeleton-controls" aria-hidden="true">
            <span className="ai-skeleton-block" style={{ width: 110, height: 28 }} />
            <span className="ai-skeleton-block" style={{ width: 140, height: 28 }} />
            <span className="ai-skeleton-block" style={{ width: 180, height: 28 }} />
            <span className="ai-skeleton-block" style={{ width: 100, height: 28 }} />
          </div>
        </header>
        <div className="ai-map-skeleton-canvas" aria-hidden="true" />
        <aside className="ai-map-legend ai-skeleton-legend" aria-hidden="true">
          <div className="ai-skeleton-block" style={{ width: 120, height: 10, marginBottom: 12 }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ai-skeleton-row">
              <span className="ai-skeleton-dot" />
              <span className="ai-skeleton-block" style={{ flex: 1, height: 10 }} />
            </div>
          ))}
        </aside>
        <div className="ai-map-stats ai-skeleton-stats" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ai-map-stat">
              <span className="ai-skeleton-block" style={{ width: 60, height: 8, marginBottom: 4 }} />
              <span className="ai-skeleton-block" style={{ width: 50, height: 18 }} />
            </div>
          ))}
        </div>
        <div className="ai-map-loading-pill" aria-live="polite">
          <span className="ai-map-loading-spinner" />
          Loading Patent Graph
        </div>
      </main>
    );
  }

  return (
    <main className="ai-page ai-patent-map">
      <header className="ai-page-header">
        <div>
          <h1 className="ai-page-title">Patent Intelligence Map</h1>
          <p className="ai-page-description">
            依據指定時間點，將公司專利資料映射為技術圖譜。每一個節點代表一間公司，節點大小反應趨勢上的專利數量。
          </p>
        </div>

        <div className="ai-controls">
          <label className="ai-control-group">
            <span className="ai-control-label">Time Range</span>
            <select
              className="ai-control-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">All (累積)</option>
              {dataset.months.map((m) => (
                <option key={m} value={m}>{m.replace("-", ".")}</option>
              ))}
            </select>
          </label>

          <div className="ai-control-group">
            <span className="ai-control-label">Mode</span>
            <div className="ai-pill-group">
              {(["cumulative", "monthly"] as const).map((m) => (
                <button
                  key={m}
                  className={"ai-pill" + (mode === m ? " active" : "")}
                  onClick={() => setMode(m)}
                >
                  {m === "cumulative" ? "Cumulative" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-control-group">
            <span className="ai-control-label">Branch</span>
            <div className="ai-pill-group">
              {(["all", "main", "branch", "decline"] as const).map((b) => (
                <button
                  key={b}
                  className={"ai-pill" + (branch === b ? " active" : "")}
                  onClick={() => setBranch(b)}
                >
                  {b === "all" ? "All" : b[0].toUpperCase() + b.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-control-group">
            <span className="ai-control-label">Layout</span>
            <div className="ai-pill-group">
              {(["random", "force"] as const).map((l) => (
                <button
                  key={l}
                  className={"ai-pill" + (layout === l ? " active" : "")}
                  onClick={() => setLayout(l)}
                >
                  {l === "random" ? "Random" : "Force"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <PatentMapCanvas
        dataset={dataset}
        selectedMonth={selectedMonth}
        mode={mode}
        branch={branch}
        layout={layout}
        activeCategory={activeCategory}
        palette={palette}
        highlightedCompanyName={selectedCompanyName}
        onCompanyClick={(p) => setSelectedCompanyName(p.name)}
        onVisibleCompaniesChange={setVisibleCompanies}
      />

      <PatentMapLegend
        categories={legendRows}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      <PatentMapCompanyPanel
        companies={filteredCompanies}
        palette={palette}
        getMeta={getCompanyMeta}
        highlightedName={selectedCompanyName}
        onSelectCompany={setSelectedCompanyName}
      />

      <div className="ai-map-stats">
        <div className="ai-map-stat">
          <span className="ai-map-stat-label">Companies</span>
          <span className="ai-map-stat-value">{filteredCompanies.length}</span>
        </div>
        <div className="ai-map-stat">
          <span className="ai-map-stat-label">Patents</span>
          <span className="ai-map-stat-value">{totalPatentsInView}</span>
        </div>
        <div className="ai-map-stat">
          <span className="ai-map-stat-label">Period</span>
          <span className="ai-map-stat-value ai-map-stat-period">{periodText}</span>
        </div>
      </div>

      <PatentMapDetailPanel
        company={selectedCompany}
        dataset={dataset}
        filteredPatentIds={filteredPatentIds}
        onSelectPatent={setSelectedPatent}
        onClose={() => setSelectedCompanyName(null)}
      />

      <PatentMapPatentModal
        patent={selectedPatent}
        onClose={() => setSelectedPatent(null)}
      />
    </main>
  );
}
