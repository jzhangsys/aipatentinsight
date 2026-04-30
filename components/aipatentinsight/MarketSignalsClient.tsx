"use client";

/**
 * MarketSignalsClient — 市場訊號 dashboard
 *
 * 從 insights 計算 4 種訊號:
 *   1. Hot Categories — 當期(reference month)該技術 cat 的專利數,top 6
 *   2. New Entrants — monthsActive[0] 落在最近 N 個月的公司(首次出現)
 *   3. Velocity Leaders — 最近 N 個月貢獻佔該公司總量比例最高的公司(高速增長)
 *   4. High-PR Recent — 最近 N 個月內 PR ≥ 80 的專利,top 10
 *
 * Reference month 預設為 dataset.months 最後一個。可用 dropdown 切換,
 * 切了會重新算所有 4 種訊號。
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PatentMapPatentModal from "./PatentMapPatentModal";
import {
  loadInsights,
  type InsightsDataset,
  type InsightsPatent,
} from "@/lib/aipatentinsight/insightsData";
import { buildCategoryPalette } from "@/lib/aipatentinsight/patentMapLayout";

const RECENT_WINDOW = 3; // 「最近」N 個月

export default function MarketSignalsClient() {
  const router = useRouter();
  const [dataset, setDataset] = useState<InsightsDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refMonth, setRefMonth] = useState<string | null>(null);
  const [selectedPatent, setSelectedPatent] = useState<InsightsPatent | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadInsights()
      .then((d) => {
        if (cancelled) return;
        setDataset(d);
        // 預設 ref month = 最新月份
        if (d.months.length > 0) {
          setRefMonth(d.months[d.months.length - 1]);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const palette = useMemo(
    () => (dataset ? buildCategoryPalette(dataset.categories) : {}),
    [dataset]
  );

  // 取最近 N 個月的月份字串集合
  const recentMonths = useMemo<string[]>(() => {
    if (!dataset || !refMonth) return [];
    const idx = dataset.months.indexOf(refMonth);
    if (idx < 0) return [];
    return dataset.months.slice(Math.max(0, idx - RECENT_WINDOW + 1), idx + 1);
  }, [dataset, refMonth]);

  // === Signal 1:Hot Categories(reference month 該 cat 的專利數) ===
  const hotCategories = useMemo(() => {
    if (!dataset || !refMonth) return [];
    const counts = new Map<string, number>();
    for (const p of dataset.patents) {
      if (p.month === refMonth) {
        counts.set(p.category, (counts.get(p.category) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, count]) => ({ cat, count, color: palette[cat] || "#7DF9FF" }));
  }, [dataset, refMonth, palette]);

  // === Signal 2:New Entrants(monthsActive[0] 在 recentMonths 內) ===
  const newEntrants = useMemo(() => {
    if (!dataset || recentMonths.length === 0) return [];
    const recentSet = new Set(recentMonths);
    return dataset.companies
      .filter((c) => c.monthsActive.length > 0 && recentSet.has(c.monthsActive[0]))
      .sort((a, b) => b.totalPatents - a.totalPatents)
      .slice(0, 8);
  }, [dataset, recentMonths]);

  // === Signal 3:Velocity Leaders(最近 N 月貢獻 / 總量,比例越高越「最近活躍」) ===
  const velocityLeaders = useMemo(() => {
    if (!dataset || recentMonths.length === 0) return [];
    const recentSet = new Set(recentMonths);

    // 統計每公司的「最近 N 月」專利數
    const recentByCompany = new Map<string, number>();
    for (const p of dataset.patents) {
      if (recentSet.has(p.month)) {
        recentByCompany.set(p.company, (recentByCompany.get(p.company) || 0) + 1);
      }
    }

    return dataset.companies
      .map((c) => {
        const recent = recentByCompany.get(c.name) || 0;
        const ratio = c.totalPatents > 0 ? recent / c.totalPatents : 0;
        return { company: c, recent, ratio };
      })
      .filter((x) => x.recent >= 2) // 至少要有 2 件在最近,避免單筆造成 100% 假象
      .sort((a, b) => b.ratio - a.ratio || b.recent - a.recent)
      .slice(0, 8);
  }, [dataset, recentMonths]);

  // === Signal 4:High-PR Recent(最近 N 月,PR ≥ 80,top 10) ===
  const highPrRecent = useMemo<InsightsPatent[]>(() => {
    if (!dataset || recentMonths.length === 0) return [];
    const recentSet = new Set(recentMonths);
    return dataset.patents
      .filter((p) => recentSet.has(p.month) && p.pr !== null && p.pr >= 80)
      .sort((a, b) => (b.pr || 0) - (a.pr || 0) || (a.date < b.date ? 1 : -1))
      .slice(0, 10);
  }, [dataset, recentMonths]);

  // === Render ===
  if (error) {
    return (
      <main className="ai-page ai-signals-page">
        <div className="ai-signals-error">
          <strong>ERROR</strong>
          <p>{error}</p>
        </div>
      </main>
    );
  }
  if (!dataset || !refMonth) {
    return (
      <main className="ai-page ai-signals-page">
        <div className="ai-signals-loading">
          <div className="ai-signals-loading-text">Loading Signals</div>
          <div className="ai-signals-loading-bar" />
        </div>
      </main>
    );
  }

  const refLabel = refMonth.replace("-", "/");
  const recentLabel =
    recentMonths.length > 0
      ? `${recentMonths[0].replace("-", "/")} – ${recentMonths[recentMonths.length - 1].replace("-", "/")}`
      : "—";

  return (
    <main className="ai-page ai-signals-page">
      <header className="ai-signals-header">
        <div className="ai-signals-titles">
          <h1 className="ai-signals-title">Market Signals</h1>
          <p className="ai-signals-description">
            從專利資料中萃取的市場訊號 — 哪些技術領域當期最熱、哪些公司剛進場、誰在加速、
            最近哪幾筆專利評價最高。Reference 月份為 {refLabel},Recent 範圍為最近 {RECENT_WINDOW} 個月 ({recentLabel})。
          </p>
        </div>

        <div className="ai-signals-controls">
          <label className="ai-control-group">
            <span className="ai-control-label">Reference Month</span>
            <select
              className="ai-control-select"
              value={refMonth}
              onChange={(e) => setRefMonth(e.target.value)}
            >
              {dataset.months.map((m) => (
                <option key={m} value={m}>{m.replace("-", ".")}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="ai-signals-grid">
        {/* Card 1:Hot Categories */}
        <article className="ai-signal-card">
          <header className="ai-signal-card-header">
            <span className="ai-signal-card-tag">// Hot Categories</span>
            <h2 className="ai-signal-card-title">{refLabel} 當期熱門技術</h2>
            <p className="ai-signal-card-meta">{hotCategories.length} categories with patent activity</p>
          </header>
          <ul className="ai-signal-list">
            {hotCategories.length === 0 ? (
              <li className="ai-signal-empty">No data this month</li>
            ) : (
              hotCategories.map((row) => (
                <li
                  key={row.cat}
                  className="ai-signal-row"
                  onClick={() =>
                    router.push("/patent-map?category=" + encodeURIComponent(row.cat))
                  }
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className="ai-signal-dot"
                    style={{ background: row.color, color: row.color }}
                  />
                  <span className="ai-signal-row-label">{row.cat}</span>
                  <span className="ai-signal-row-value">{row.count}</span>
                </li>
              ))
            )}
          </ul>
        </article>

        {/* Card 2:New Entrants */}
        <article className="ai-signal-card">
          <header className="ai-signal-card-header">
            <span className="ai-signal-card-tag">// New Entrants</span>
            <h2 className="ai-signal-card-title">最近 {RECENT_WINDOW} 個月首次出現的公司</h2>
            <p className="ai-signal-card-meta">{newEntrants.length} companies in {recentLabel}</p>
          </header>
          <ul className="ai-signal-list">
            {newEntrants.length === 0 ? (
              <li className="ai-signal-empty">No new entrants in this window</li>
            ) : (
              newEntrants.map((c) => (
                <li
                  key={c.name}
                  className="ai-signal-row"
                  onClick={() => window.open("/company/" + encodeURIComponent(c.name), "_blank")}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className="ai-signal-dot"
                    style={{
                      background: palette[c.mainCategory] || "#7DF9FF",
                      color: palette[c.mainCategory] || "#7DF9FF",
                    }}
                  />
                  <span className="ai-signal-row-label">
                    {c.name}
                    {c.isPublic && <span className="ai-signal-row-tag">PUBLIC</span>}
                  </span>
                  <span className="ai-signal-row-value">{c.totalPatents}</span>
                </li>
              ))
            )}
          </ul>
        </article>

        {/* Card 3:Velocity Leaders */}
        <article className="ai-signal-card">
          <header className="ai-signal-card-header">
            <span className="ai-signal-card-tag">// Velocity Leaders</span>
            <h2 className="ai-signal-card-title">最近 {RECENT_WINDOW} 個月加速最快的公司</h2>
            <p className="ai-signal-card-meta">recent / total ratio,top 8</p>
          </header>
          <ul className="ai-signal-list">
            {velocityLeaders.length === 0 ? (
              <li className="ai-signal-empty">No velocity data</li>
            ) : (
              velocityLeaders.map(({ company, recent, ratio }) => (
                <li
                  key={company.name}
                  className="ai-signal-row"
                  onClick={() => window.open("/company/" + encodeURIComponent(company.name), "_blank")}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className="ai-signal-dot"
                    style={{
                      background: palette[company.mainCategory] || "#7DF9FF",
                      color: palette[company.mainCategory] || "#7DF9FF",
                    }}
                  />
                  <span className="ai-signal-row-label">{company.name}</span>
                  <span className="ai-signal-row-value">
                    {Math.round(ratio * 100)}%
                    <span className="ai-signal-row-sub">{recent}/{company.totalPatents}</span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>

        {/* Card 4:High-PR Recent */}
        <article className="ai-signal-card">
          <header className="ai-signal-card-header">
            <span className="ai-signal-card-tag">// High-PR Recent</span>
            <h2 className="ai-signal-card-title">最近 {RECENT_WINDOW} 個月高評價專利</h2>
            <p className="ai-signal-card-meta">PR ≥ 80,top 10</p>
          </header>
          <ul className="ai-signal-list">
            {highPrRecent.length === 0 ? (
              <li className="ai-signal-empty">No high-PR patents in this window</li>
            ) : (
              highPrRecent.map((p) => (
                <li
                  key={p.id}
                  className="ai-signal-row patent"
                  onClick={() => setSelectedPatent(p)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="ai-signal-row-id">{p.id}</span>
                  <span className="ai-signal-row-label">{p.title || "(無標題)"}</span>
                  <span className="ai-signal-row-pr">PR {p.pr}</span>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <PatentMapPatentModal
        patent={selectedPatent}
        onClose={() => setSelectedPatent(null)}
      />
    </main>
  );
}
