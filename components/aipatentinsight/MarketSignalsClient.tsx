"use client";

/**
 * MarketSignalsClient — 市場訊號 (重寫於 v3.0)
 *
 * 跟 patent map 完全不同:這頁面**不基於專利**,而是基於對每家公司的:
 *  - Yahoo 股市新聞
 *  - 自由時報財經 search
 *  - 公開資訊觀測站重大訊息
 * 資料,套題材關鍵字字典分類後,per-snapshot 算出市場聲量 top 20 題材。
 *
 * 流程:
 *  1. mount:loadSnapshotIndex 拿 16 期日期清單
 *  2. 預設選最新一期
 *  3. selectedDate 變化 → fetch /data/market-signals-{date}.json
 *  4. 顯示 top 20 themes(聲量 bar + 公司展開)
 *
 * 互動:
 *  - 切時間軸 → 重新載該期 signals
 *  - 點題材 row → 展開該題材下所有公司 + 樣本新聞連結
 *  - 點公司 → 跳去 /company/{name}(走專利分頁那邊看互補資訊)
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PatentMapTimeline from "./PatentMapTimeline";
import { loadSnapshotIndex } from "@/lib/aipatentinsight/insightsData";

// ===== Types(對齊 build-market-signals.mjs 輸出 schema) =====
type SampleNews = {
  title: string;
  url: string;
  source: "yahoo" | "ltn" | string;
  date: string | null;
};

type ThemeCompany = {
  name: string;
  stockCode: string;
  newsHits: number;
  isPrimary: boolean;
  sampleNews: SampleNews[];
};

type ThemeEntry = {
  rank: number;
  name: string;
  volume: number;
  primaryCompanyCount: number;
  totalCompanyCount: number;
  companies: ThemeCompany[];
};

type MarketSignalsData = {
  date: string;
  generatedAt?: string;
  totalCompanies: number;
  totalCompaniesWithNews: number;
  totalNewsAnalyzed: number;
  themes: ThemeEntry[];
};

function formatGeneratedAt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // 2026-02-01 14:32(取本機時區)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

const SOURCE_LABEL: Record<string, string> = {
  yahoo: "Yahoo 股市",
  ltn: "自由財經",
};

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

  // === 載 snapshot index 取所有日期 ===
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

  // === selectedDate 變化:fetch market-signals-{date}.json ===
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
        // 該期 market-signals 還沒產出 → 顯示說明,不算 fatal
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

  // === URL sync ===
  useEffect(() => {
    if (!selectedDate) return;
    const params = new URLSearchParams();
    params.set("date", selectedDate);
    const qs = params.toString();
    if (window.location.search.replace(/^\?/, "") !== qs) {
      window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
    }
  }, [selectedDate]);

  // === Render ===
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
          <p className="ai-signals-empty-hint">
            本機跑 <code>node scripts/market-signals/scrape-news.mjs</code> 後,
            再跑 <code>node scripts/market-signals/build-market-signals.mjs --date {selectedDate}</code> 即可產出。
          </p>
        </div>
      )}

      {!loading && data && (
        <>
          <div className="ai-signals-meta">
            <span>
              <strong>{data.totalCompaniesWithNews}</strong> / {data.totalCompanies} 家公司有新聞被分析
            </span>
            <span>
              <strong>{data.totalNewsAnalyzed}</strong> 則新聞
            </span>
            <span>
              <strong>{data.themes.length}</strong> 個 top 題材
            </span>
          </div>

          {data.themes.length === 0 && (
            <div className="ai-signals-empty">
              <p>該期 market signals 尚無題材命中(可能 news cache 不足)。</p>
            </div>
          )}

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
                          <div className="ai-signals-company-head">
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
                            <span className="ai-signals-company-hits">
                              {c.newsHits} 則
                            </span>
                          </div>
                          {c.sampleNews.length > 0 && (
                            <ul className="ai-signals-news-list">
                              {c.sampleNews.map((n, i) => (
                                <li key={i} className="ai-signals-news-item">
                                  <a
                                    href={n.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ai-signals-news-link"
                                  >
                                    {n.title}
                                  </a>
                                  <span className="ai-signals-news-meta">
                                    <span className={"ai-signals-news-source src-" + n.source}>
                                      {SOURCE_LABEL[n.source] || n.source}
                                    </span>
                                    {n.date && (
                                      <span className="ai-signals-news-date">{n.date}</span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
