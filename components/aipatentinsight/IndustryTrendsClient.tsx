"use client";

/**
 * IndustryTrendsClient — 產業趨勢河流圖
 *
 * 把 insights 中所有 patent 按 month × category 聚合,用 StreamChart 畫成河道。
 * 每條 stream = 一個技術 cat,寬度 = 該月該 cat 的專利數。
 * 中央排當期主流,兩側依序排衰退/新興(d3.stackOrderInsideOut)。
 *
 * 上方控制列:
 *   - Branch filter:all / main / branch / decline,過濾要算進河道的 patent
 *   - 點 stream:跳到 /patent-map(未來可加 ?category= 帶參進去)
 *
 * 右側 Legend:列 cat 名 + 累計 patent 數,點 cat 也跳。
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StreamChart from "./StreamChart";
import {
  loadInsights,
  filterInsightsToPublic,
  type InsightsDataset,
} from "@/lib/aipatentinsight/insightsData";
import { buildCategoryPalette } from "@/lib/aipatentinsight/patentMapLayout";

type Branch = "all" | "main" | "branch" | "decline";

export default function IndustryTrendsClient() {
  const router = useRouter();
  const [dataset, setDataset] = useState<InsightsDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState<Branch>("all");

  useEffect(() => {
    let cancelled = false;
    loadInsights()
      .then((d) => { if (!cancelled) setDataset(filterInsightsToPublic(d)); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const palette = useMemo(
    () => (dataset ? buildCategoryPalette(dataset.categories) : {}),
    [dataset]
  );

  // === month × category 矩陣 ===
  const matrix = useMemo(() => {
    if (!dataset) return [];
    const filtered =
      branch === "all"
        ? dataset.patents
        : dataset.patents.filter((p) => p.branch === branch);
    return dataset.months.map((m) => {
      const row: Record<string, number | string> = { _month: m };
      for (const cat of dataset.categories) row[cat] = 0;
      for (const p of filtered) {
        if (p.month === m) {
          row[p.category] = (Number(row[p.category]) || 0) + 1;
        }
      }
      return row;
    });
  }, [dataset, branch]);

  // === 統計每 cat 累計數,排序由大到小(中央 = 主流) ===
  const sortedCategories = useMemo(() => {
    if (!dataset) return [];
    const totals: Record<string, number> = {};
    for (const cat of dataset.categories) totals[cat] = 0;
    for (const row of matrix) {
      for (const cat of dataset.categories) {
        totals[cat] += Number(row[cat]) || 0;
      }
    }
    return [...dataset.categories].sort(
      (a, b) => (totals[b] || 0) - (totals[a] || 0)
    );
  }, [dataset, matrix]);

  // === 每 cat 累計總數(legend 用) ===
  const catTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const cat of sortedCategories) totals[cat] = 0;
    for (const row of matrix) {
      for (const cat of sortedCategories) {
        totals[cat] += Number(row[cat]) || 0;
      }
    }
    return totals;
  }, [sortedCategories, matrix]);

  const totalPatentsInView = useMemo(
    () => Object.values(catTotals).reduce((s, v) => s + v, 0),
    [catTotals]
  );

  // 點 stream / legend → 跳到 patent map 並自動 Legend 高亮該 cat
  const handleCategoryClick = (cat: string) => {
    router.push("/patent-map?category=" + encodeURIComponent(cat));
  };

  // === Render ===
  if (error) {
    return (
      <main className="ai-page ai-trends-page">
        <div className="ai-trends-error">
          <strong>ERROR</strong>
          <p>{error}</p>
        </div>
      </main>
    );
  }
  if (!dataset) {
    return (
      <main className="ai-page ai-trends-page">
        <div className="ai-trends-loading">
          <div className="ai-trends-loading-text">Loading Trend River</div>
          <div className="ai-trends-loading-bar" />
        </div>
      </main>
    );
  }

  return (
    <main className="ai-page ai-trends-page">
      <header className="ai-trends-header">
        <div className="ai-trends-titles">
          <h1 className="ai-trends-title">Industry Trend River</h1>
          <p className="ai-trends-description">
            17 個技術領域在每月專利量的相對變化。河道寬度 = 當月該領域專利數;
            中央 = 當期主流,兩側依序排衰退中與新興中的分支。
          </p>
        </div>

        <div className="ai-trends-controls">
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
          <div className="ai-trends-summary">
            <span className="ai-trends-summary-label">Patents in view</span>
            <span className="ai-trends-summary-value">{totalPatentsInView}</span>
          </div>
        </div>
      </header>

      <section className="ai-trends-stream-section">
        <StreamChart
          months={dataset.months}
          categories={sortedCategories}
          data={matrix}
          palette={palette}
          onCategoryClick={handleCategoryClick}
        />
      </section>

      <aside className="ai-trends-legend">
        <div className="ai-trends-legend-title">Tech Categories · 累計</div>
        <div className="ai-trends-legend-list">
          {sortedCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className="ai-trends-legend-item"
              onClick={() => handleCategoryClick(cat)}
            >
              <span
                className="ai-trends-legend-dot"
                style={{ background: palette[cat], color: palette[cat] }}
              />
              <span className="ai-trends-legend-name">{cat}</span>
              <span className="ai-trends-legend-count">{catTotals[cat] || 0}</span>
            </button>
          ))}
        </div>
      </aside>
    </main>
  );
}
