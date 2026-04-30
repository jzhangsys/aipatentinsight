"use client";

/**
 * CompanyTimelineClient — 公司頁主體
 *
 * 流程:
 *   1. mount 時 loadSnapshotIndex + findCompanyAppearances(name)
 *   2. 自動選中最新有資料的節點(timeline 最右邊的紅點)
 *   3. 載該 snapshot,filter 該公司的所有 patents
 *   4. 點其他紅點 → 重複 step 3
 *   5. 點 patent → 用 PatentMapPatentModal 顯示摘要
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CompanyTimeline from "./CompanyTimeline";
import PatentMapPatentModal from "./PatentMapPatentModal";
import {
  findCompanyAppearances,
  loadSnapshotByDate,
  getCompanyByName,
  type CompanyAppearance,
  type InsightsCompany,
  type InsightsPatent,
  type InsightsDataset,
} from "@/lib/aipatentinsight/insightsData";

type Props = {
  /** URL decode 後的公司名 */
  companyName: string;
};

type SortKey = "date" | "category" | "pr";

export default function CompanyTimelineClient({ companyName }: Props) {
  const [appearances, setAppearances] = useState<CompanyAppearance[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<InsightsDataset | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [selectedPatent, setSelectedPatent] = useState<InsightsPatent | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("date");

  // === 載 appearances + 預設選中最新有資料的節點 ===
  useEffect(() => {
    let cancelled = false;
    findCompanyAppearances(companyName)
      .then((apps) => {
        if (cancelled) return;
        setAppearances(apps);
        // 預設選中最新一個 present 的(timeline 從早到晚排,所以是最後一個 present)
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
    } else if (sortBy === "pr") {
      result.sort((a, b) => (b.pr ?? -1) - (a.pr ?? -1));
    }
    return result;
  }, [activeDataset, company, sortBy]);

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
      {/* Header */}
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

      {/* Timeline */}
      <CompanyTimeline
        entries={appearances}
        activeDate={selectedDate}
        onSelect={setSelectedDate}
      />

      {/* 當前節點 patent 列表 */}
      <section className="ai-company-snapshot">
        {selectedDate && (
          <div className="ai-company-snapshot-meta">
            <span className="ai-company-snapshot-date">
              {selectedDate.replace(/-/g, ".")}
            </span>
            <span className="ai-company-snapshot-count">
              {datasetLoading ? "Loading…" : `${patents.length} patents`}
            </span>
            <div className="ai-company-sort">
              {(["date", "category", "pr"] as const).map((key) => (
                <button
                  key={key}
                  className={"ai-pill" + (sortBy === key ? " active" : "")}
                  onClick={() => setSortBy(key)}
                >
                  {key === "date"
                    ? "By Date"
                    : key === "category"
                    ? "By Category"
                    : "By PR"}
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
            patents.map((p) => (
              <button
                key={p.id}
                type="button"
                className="ai-company-patent-row"
                onClick={() => setSelectedPatent(p)}
              >
                <span className="ai-company-patent-id">{p.id}</span>
                <span className="ai-company-patent-title">
                  {p.title || "(無標題)"}
                </span>
                <span className="ai-company-patent-cat">{p.category}</span>
                <span className="ai-company-patent-date">{p.date}</span>
                {p.pr !== null && (
                  <span className="ai-company-patent-pr">PR {p.pr}</span>
                )}
                <span className="ai-company-patent-arrow">→</span>
              </button>
            ))
          )}
        </div>
      </section>

      <PatentMapPatentModal
        patent={selectedPatent}
        onClose={() => setSelectedPatent(null)}
      />
    </main>
  );
}
