"use client";

/**
 * CompanyTimelineClient — 公司頁主體 (v2.1)
 *
 * 流程:
 *   1. mount 時 loadSnapshotIndex + findCompanyAppearances(name)
 *   2. 自動選中最新有資料的節點(timeline 最右邊的紅點)
 *   3. 載該 snapshot,filter 該公司的所有 patents
 *   4. 點其他紅點 → 重複 step 3
 *   5. 點 patent → 該行下方 inline 展開 abstract;再點別的會自動收合舊的
 *   6. 每頁最多 10 筆,翻頁不重設展開的 patent(若該 patent 在新頁也存在)
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CompanyTimeline from "./CompanyTimeline";
import {
  findCompanyAppearances,
  loadSnapshotByDate,
  getCompanyByName,
  getPatentAbstract,
  type CompanyAppearance,
  type InsightsCompany,
  type InsightsPatent,
  type InsightsDataset,
} from "@/lib/aipatentinsight/insightsData";

type Props = {
  /** URL decode 後的公司名 */
  companyName: string;
};

type SortKey = "date" | "category";

const PAGE_SIZE = 10;

export default function CompanyTimelineClient({ companyName }: Props) {
  const [appearances, setAppearances] = useState<CompanyAppearance[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<InsightsDataset | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedPatentId, setExpandedPatentId] = useState<string | null>(null);

  // === 載 appearances + 預設選中最新有資料的節點 ===
  useEffect(() => {
    let cancelled = false;
    findCompanyAppearances(companyName)
      .then((apps) => {
        if (cancelled) return;
        setAppearances(apps);
        const lastPresent = [...apps].reverse().find((a) => a.present);
        if (lastPresent) setSelectedDate(lastPresent.snapshot.date);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => { cancelled = true; };
  }, [companyName]);

  // === selectedDate 變化時載入該 snapshot ===
  useEffect(() => {
    if (!selectedDate) {
      setActiveDataset(null);
      return;
    }
    let cancelled = false;
    setDatasetLoading(true);
    loadSnapshotByDate(selectedDate)
      .then((ds) => {
        if (!cancelled) {
          setActiveDataset(ds);
          setDatasetLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message);
          setDatasetLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [selectedDate]);

  // 換 snapshot 或換排序 → 重置分頁 + 收合
  useEffect(() => {
    setCurrentPage(0);
    setExpandedPatentId(null);
  }, [selectedDate, sortBy]);

  // === 衍生:當前 snapshot 中該公司的物件 + 專利清單 ===
  const company: InsightsCompany | null = useMemo(() => {
    if (!activeDataset) return null;
    return getCompanyByName(activeDataset, companyName) || null;
  }, [activeDataset, companyName]);

  const patents = useMemo<InsightsPatent[]>(() => {
    if (!activeDataset || !company) return [];
    const myIds = new Set(company.patentIds);
    const seen = new Set<string>();
    const result: InsightsPatent[] = [];
    for (const p of activeDataset.patents) {
      if (myIds.has(p.id) && !seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
    }
    if (sortBy === "date") {
      result.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    } else if (sortBy === "category") {
      result.sort((a, b) => a.category.localeCompare(b.category, "zh-Hant"));
    }
    return result;
  }, [activeDataset, company, sortBy]);

  // 分頁
  const totalPages = Math.max(1, Math.ceil(patents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pagePatents = patents.slice(pageStart, pageStart + PAGE_SIZE);

  // 翻頁時若 expanded patent 不在新頁,自動收合
  useEffect(() => {
    if (!expandedPatentId) return;
    if (!pagePatents.some((p) => p.id === expandedPatentId)) {
      setExpandedPatentId(null);
    }
  }, [pagePatents, expandedPatentId]);

  const togglePatent = (id: string) => {
    setExpandedPatentId((prev) => (prev === id ? null : id));
  };

  // === Render ===
  if (loadError) {
    return (
      <main className="ai-page ai-company-page">
        <div className="ai-company-error">
          <strong>ERROR</strong>
          <p>{loadError}</p>
        </div>
      </main>
    );
  }
  if (!appearances) {
    return (
      <main className="ai-page ai-company-page">
        <div className="ai-company-loading">
          <div className="ai-company-loading-text">Loading Timeline</div>
          <div className="ai-company-loading-bar" />
        </div>
      </main>
    );
  }

  const anyPresent = appearances.some((a) => a.present);

  return (
    <main className="ai-page ai-company-page">
      <header className="ai-company-header">
        <Link href="/patent-map" className="ai-company-back">
          ← Back to Patent Map
        </Link>
        <h1 className="ai-company-name">{companyName}</h1>
        {company && (
          <div className="ai-company-tags">
            <span className="ai-map-tag">{company.mainCategory}</span>
            {company.industry && (
              <span className="ai-map-tag industry">{company.industry}</span>
            )}
            {company.stockCode && (
              <span className="ai-map-tag stock">{company.stockCode}</span>
            )}
            {company.isPublic && <span className="ai-map-tag public">PUBLIC</span>}
          </div>
        )}
        {!anyPresent && (
          <div className="ai-company-no-data">
            ⚠️ 此公司在所有現有 snapshot 中都不存在(可能是命名差異或還沒被收錄)
          </div>
        )}
      </header>

      <CompanyTimeline
        entries={appearances}
        activeDate={selectedDate}
        onSelect={setSelectedDate}
      />

      <section className="ai-company-snapshot">
        {selectedDate && (
          <div className="ai-company-snapshot-meta">
            <span className="ai-company-snapshot-date">
              {selectedDate.replace(/-/g, ".")}
            </span>
            <span className="ai-company-snapshot-count">
              {datasetLoading
                ? "Loading…"
                : `${patents.length} patents${
                    patents.length > PAGE_SIZE
                      ? ` · 第 ${safePage + 1} / ${totalPages} 頁`
                      : ""
                  }`}
            </span>
            <div className="ai-company-sort">
              {(["date", "category"] as const).map((key) => (
                <button
                  key={key}
                  className={"ai-pill" + (sortBy === key ? " active" : "")}
                  onClick={() => setSortBy(key)}
                >
                  {key === "date" ? "By Date" : "By Category"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ai-company-patents">
          {datasetLoading ? (
            <div className="ai-company-empty">載入中…</div>
          ) : patents.length === 0 ? (
            <div className="ai-company-empty">
              {selectedDate
                ? "此 snapshot 內該公司無專利紀錄"
                : "請從上方時間軸選擇一個節點"}
            </div>
          ) : (
            pagePatents.map((p) => {
              const isExpanded = expandedPatentId === p.id;
              return (
                <div
                  key={p.id}
                  className={"ai-company-patent-block" + (isExpanded ? " expanded" : "")}
                >
                  <button
                    type="button"
                    className={
                      "ai-company-patent-row" + (isExpanded ? " expanded" : "")
                    }
                    onClick={() => togglePatent(p.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="ai-company-patent-id">{p.id}</span>
                    <span className="ai-company-patent-title">
                      {p.title || "(無標題)"}
                    </span>
                    <span className="ai-company-patent-cat">{p.category}</span>
                    <span className="ai-company-patent-date">{p.date}</span>
                    <span className="ai-company-patent-arrow">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                  </button>
                  {isExpanded && <PatentInlineDetail patent={p} />}
                </div>
              );
            })
          )}
        </div>

        {/* 分頁控制(只在 > PAGE_SIZE 才顯示) */}
        {patents.length > PAGE_SIZE && (
          <div className="ai-company-pagination" role="navigation" aria-label="分頁">
            <button
              type="button"
              className="ai-company-page-btn"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              ← Prev
            </button>
            <div className="ai-company-page-numbers">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={"ai-company-page-num" + (i === safePage ? " active" : "")}
                  onClick={() => setCurrentPage(i)}
                  aria-current={i === safePage ? "page" : undefined}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ai-company-page-btn"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={safePage === totalPages - 1}
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

// =============================================================
// PatentInlineDetail — patent row 下方的展開內容
// =============================================================
function PatentInlineDetail({ patent }: { patent: InsightsPatent }) {
  const [abstract, setAbstract] = useState<string>(patent.abstract || "");
  const [loading, setLoading] = useState(!patent.abstract);

  useEffect(() => {
    if (patent.abstract && patent.abstract.length > 0) {
      setAbstract(patent.abstract);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setAbstract("");
    getPatentAbstract(patent.id)
      .then((text) => {
        if (cancelled) return;
        setAbstract(text);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAbstract("");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [patent.id, patent.abstract]);

  return (
    <div className="ai-company-patent-detail">
      <div className="ai-company-patent-detail-meta">
        <span className="ai-map-tag">{patent.category}</span>
        <span className="ai-map-tag">{patent.date}</span>
        {patent.branch !== "main" && (
          <span className={"ai-map-tag branch-" + patent.branch}>
            {patent.branch.toUpperCase()}
          </span>
        )}
      </div>
      {patent.title && (
        <div className="ai-company-patent-detail-title">{patent.title}</div>
      )}
      <div className="ai-company-patent-detail-label">// Abstract</div>
      <div className="ai-company-patent-abstract">
        {loading ? (
          "載入摘要中…"
        ) : abstract.length > 0 ? (
          abstract
        ) : (
          <span className="ai-company-patent-no-abstract">
            <span>此 snapshot 來源資料未含專利摘要。</span>
            <a
              href={
                "https://www.google.com/search?q=" +
                encodeURIComponent(`專利 ${patent.id} ${patent.title || ""}`)
              }
              target="_blank"
              rel="noopener noreferrer"
              className="ai-company-patent-search-link"
            >
              於 Google 查詢 →
            </a>
          </span>
        )}
      </div>
    </div>
  );
}
