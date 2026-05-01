"use client";

/**
 * MarketSignalsClient — 市場訊號 (重寫於 v3.1)
 *
 * 著作權保護:本頁僅曝露分析結果(題材排行 + 公司分類),
 * 不曝露原始新聞標題、URL、來源。原始爬取的新聞用於本地分析,
 * 不會輸出到 public/data 也不會 commit 進 git
 * (data/market-signals/news-cache/ 已加進 .gitignore)。
 *
 * 流程:
 *  1. mount:loadSnapshotIndex 拿 16 期日期清單
 *  2. 預設選最新一期
 *  3. selectedDate 變化 → fetch /data/market-signals-{date}.json
 *  4. 顯示 top 20 themes(聲量 bar + 公司展開)
 *
 * 互動:
 *  - 切時間軸 → 重新載該期 signals
 *  - 點題材 row → 展開該題材下所有公司(只顯示公司名 + 股號 + 命中數)
 *  - 點公司 → 跳去 /company/{name}
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PatentMapTimeline from "./PatentMapTimeline";
import { loadSnapshotIndex } from "@/lib/aipatentinsight/insightsData";

// ===== Types(對齊 build-market-signals.mjs 輸出 schema) =====
type ThemeCompany = {
  name: string;
  stockCode: string;
  hits: number;          // 該公司在該題材命中的新聞數(分析指標,非原始新聞)
  isPrimary: boolean;
};

type ThemeEntry = {
  rank: number;
  name: string;
  volume: number;        // 該題材整體聲量
  totalCompanyCount: number;
  companies: ThemeCompany[];
};

type MarketSignalsData = {
  date: string;
  generatedAt?: string;
  totalCompanies: number;
  totalCompaniesAnalyzed: number;
  themes: ThemeEntry[];
};

function formatGeneratedAt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function MarketSignalsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [snapshotDates, setSnapshotDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => searchParams.get("date") || null
  );
  const [data, setData] = useState<MarketSignalsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSnapshotIndex()
      .then((idx) => {
        if (cancelled) return;
        const actuals = idx.timeline.filter((s) => !s.placeholder).map((s) => s.date);
        setSnapshotDates(actuals);
        if (!selectedDate && actuals.length > 0) {
          setSelectedDate(actuals[actuals.length - 1]);
        }
      })
      .catch((err) => setLoadError(err.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setExpandedTheme(null);
    fetch(`/data/market-signals-${selectedDate}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: MarketSignalsData) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        if (err.message?.includes("404") || err.message?.includes("HTTP 4")) {
          setData(null);
        } else {
          setLoadError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    const params = new URLSearchParams();
    params.set("date", selectedDate);
    const qs = params.toString();
    if (window.location.search.replace(/^\?/, "") !== qs) {
      window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
    }
  }, [selectedDate]);

  if (loadError) {
    return (
      <main className="ai-page ai-signals-page">
        <div className="ai-signals-error">
          <strong>ERROR</strong>
          <p>{loadError}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="ai-page ai-signals-page">
      <header className="ai-page-header">
        <div>
          <h1 className="ai-page-title">Market Signals</h1>
          {data?.generatedAt && (
            <p className="ai-page-description ai-signals-updated">
              資料更新時間:{formatGeneratedAt(data.generatedAt)}
            </p>
          )}
        </div>
        <PatentMapTimeline
          dates={snapshotDates}
          selected={selectedDate}
          onChange={setSelectedDate}
        />
      </header>

      {loading && <div className="ai-signals-loading">Loading {selectedDate} signals…</div>}

      {!loading && !data && selectedDate && (
        <div className="ai-signals-empty">
          <p>
            尚未產出 <strong>{selectedDate}</strong> 的 market signals。
          </p>
        </div>
      )}

      {!loading && data && data.themes.length === 0 && (
        <div className="ai-signals-empty">
          <p>該期市場訊號分析後無題材命中。</p>
        </div>
      )}

      {!loading && data && data.themes.length > 0 && (
        <div className="ai-signals-themes">
          {data.themes.map((theme) => {
            const maxVolume = data.themes[0]?.volume || 1;
            const widthPct = (theme.volume / maxVolume) * 100;
            const isOpen = expandedTheme === theme.name;
            return (
              <div
                key={theme.name}
                className={"ai-signals-theme" + (isOpen ? " expanded" : "")}
              >
                <button
                  type="button"
                  className="ai-signals-theme-row"
                  onClick={() => setExpandedTheme(isOpen ? null : theme.name)}
                  aria-expanded={isOpen}
                >
                  <span className="ai-signals-theme-rank">#{theme.rank}</span>
                  <span className="ai-signals-theme-name">{theme.name}</span>
                  <span className="ai-signals-theme-bar">
                    <span
                      className="ai-signals-theme-bar-fill"
                      style={{ width: widthPct + "%" }}
                    />
                  </span>
                  <span className="ai-signals-theme-volume">{theme.volume}</span>
                  <span className="ai-signals-theme-arrow">{isOpen ? "▾" : "▸"}</span>
                </button>

                {isOpen && (
                  <div className="ai-signals-theme-detail">
                    {theme.companies.map((c) => (
                      <div key={c.stockCode} className="ai-signals-company">
                        <button
                          type="button"
                          className="ai-signals-company-name"
                          onClick={() =>
                            router.push("/company/" + encodeURIComponent(c.name))
                          }
                          title="開啟公司頁面"
                        >
                          {c.name}
                        </button>
                        <span className="ai-signals-company-code">{c.stockCode}</span>
                        <span className="ai-signals-company-hits">{c.hits}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
