"use client";

/**
 * PatentMapClient — Patent Map 頁面 orchestrator (v2.2)
 *
 * v2.2 變更:
 *  - 中央時間軸的 ticks 從「月份」改為「實際 snapshot 日期」(16 個)
 *  - 點某 snapshot 日期 → loadSnapshotByDate 載該份完整資料,整頁更新
 *  - 移除月份篩選邏輯(canvas 永遠拿整份 snapshot 的全 patent)
 *  - URL 從 ?month= 改成 ?date=YYYY-MM-DD
 *  - ETL 已過濾為 stockCode-only,client 端 filterInsightsToPublic 變 no-op,移除
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PatentMapCanvas, { type PatentMapLayout } from "./PatentMapCanvas";
import PatentMapLegend, { type LegendCategoryRow } from "./PatentMapLegend";
import PatentMapCompanyPanel from "./PatentMapCompanyPanel";
import PatentMapTimeline from "./PatentMapTimeline";
import {
  loadSnapshotIndex,
  loadSnapshotByDate,
  type InsightsDataset,
  type SnapshotEntry,
  getCompanyByName,
} from "@/lib/aipatentinsight/insightsData";
import {
  buildCategoryPalette,
  type LayoutCompany,
} from "@/lib/aipatentinsight/patentMapLayout";

function parseLayout(v: string | null): PatentMapLayout {
  return v === "random" ? "random" : "force";
}

export default function PatentMapClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ===== Snapshot index 載入(在 mount 時一次取所有可用日期) =====
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => searchParams.get("date") || null
  );

  useEffect(() => {
    let cancelled = false;
    loadSnapshotIndex()
      .then((idx) => {
        if (cancelled) return;
        const actuals = idx.timeline.filter((s) => !s.placeholder);
        setSnapshots(actuals);
        // 若 URL 沒指定 date,預設選最新一個 actual snapshot
        if (!selectedDate && actuals.length > 0) {
          setSelectedDate(actuals[actuals.length - 1].date);
        }
      })
      .catch((err) => setLoadError(err.message));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 當前 snapshot 的資料(隨 selectedDate 切換 fetch) =====
  const [dataset, setDataset] = useState<InsightsDataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    setDataset(null); // 觸發 loading skeleton
    loadSnapshotByDate(selectedDate)
      .then((d) => {
        if (cancelled) return;
        if (d) setDataset(d);
        else setLoadError(`Snapshot ${selectedDate} 載入失敗`);
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  // ===== UI 狀態(URL 同步) =====
  const [layout, setLayout] = useState<PatentMapLayout>(
    () => parseLayout(searchParams.get("layout"))
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(
    () => searchParams.get("category")
  );
  const [visibleCompanies, setVisibleCompanies] = useState<LayoutCompany[]>([]);

  const urlInitialized = useRef(false);
  useEffect(() => {
    if (!urlInitialized.current) {
      urlInitialized.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (selectedDate) params.set("date", selectedDate);
    if (layout !== "force") params.set("layout", layout);
    if (activeCategory) params.set("category", activeCategory);
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? "?" + qs : "");
    if (window.location.search.replace(/^\?/, "") !== qs) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [selectedDate, layout, activeCategory]);

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

  const totalPatentsInView = useMemo(
    () => visibleCompanies.reduce((sum, c) => sum + c.displayPatents, 0),
    [visibleCompanies]
  );

  const periodText = useMemo(() => {
    return selectedDate ? selectedDate.replace(/-/g, ".") : "—";
  }, [selectedDate]);

  const filteredCompanies = activeCategory
    ? visibleCompanies.filter((c) => c.mainCategory === activeCategory)
    : visibleCompanies;

  const getCompanyMeta = useMemo(() => {
    return (name: string) => {
      if (!dataset) return null;
      const c = getCompanyByName(dataset, name);
      if (!c) return null;
      return { stockCode: c.stockCode, isPublic: c.isPublic };
    };
  }, [dataset]);

  // 點公司 → 直接進公司頁
  const goToCompany = (name: string) => {
    router.push("/company/" + encodeURIComponent(name));
  };

  // 從 snapshots 抽出純日期陣列給 timeline 用
  const snapshotDates = useMemo(() => snapshots.map((s) => s.date), [snapshots]);

  // ===== Render =====
  if (loadError) {
    return (
      <main className="ai-page ai-patent-map">
        <div className="ai-map-error">
          <strong>ERROR</strong>
          <p>{loadError}</p>
        </div>
      </main>
    );
  }

  // 還沒拿到 snapshot index 或第一份資料 → 顯示 skeleton
  if (snapshots.length === 0 || !dataset) {
    return (
      <main className="ai-page ai-patent-map">
        <header className="ai-page-header">
          <div>
            <h1 className="ai-page-title">Patent Intelligence Map</h1>
            <p className="ai-page-description">載入中…</p>
          </div>
          {/* timeline 即使在 loading 階段也先顯示(如果已拿到 snapshot index) */}
          {snapshots.length > 0 && (
            <PatentMapTimeline
              dates={snapshotDates}
              selected={selectedDate}
              onChange={setSelectedDate}
            />
          )}
        </header>
        <div className="ai-map-skeleton-canvas" aria-hidden="true" />
        <div className="ai-map-loading-pill" aria-live="polite">
          <span className="ai-map-loading-spinner" />
          {snapshots.length === 0 ? "Loading Index" : "Loading Snapshot"}
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
            上市櫃公司專利視覺化圖譜。點任一節點直接進入該公司頁面;移動下方時間軸切換不同 snapshot 的資料。
          </p>
        </div>

        <PatentMapTimeline
          dates={snapshotDates}
          selected={selectedDate}
          onChange={setSelectedDate}
        />

        <div className="ai-map-layout-pills">
          <span className="ai-map-layout-label">Layout</span>
          {(["force", "random"] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={"ai-pill" + (layout === l ? " active" : "")}
              onClick={() => setLayout(l)}
            >
              {l === "force" ? "Force" : "Random"}
            </button>
          ))}
        </div>
      </header>

      <PatentMapCanvas
        dataset={dataset}
        selectedMonth="all"
        mode="cumulative"
        branch="all"
        layout={layout}
        activeCategory={activeCategory}
        palette={palette}
        highlightedCompanyName={null}
        onCompanyClick={(p) => goToCompany(p.name)}
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
        highlightedName={null}
        onSelectCompany={goToCompany}
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
          <span className="ai-map-stat-label">Snapshot</span>
          <span className="ai-map-stat-value ai-map-stat-period">{periodText}</span>
        </div>
      </div>
    </main>
  );
}
