"use client";

/**
 * PatentMapDetailPanel — 公司詳情側邊面板(從右滑入)
 *
 * 顯示資料:
 * - Header:公司名 + 標籤(主分類 / 產業 / 股票代號 / PUBLIC)
 * - Overview info-grid:Total Patents / Main Category / Active Months
 * - Patents 清單:依日期 desc,點擊某筆 → 開第二層 patent modal
 *
 * 關閉:點 X 鈕、點外部 backdrop、按 ESC(由 parent 處理)。
 */

import { useMemo } from "react";
import type {
  InsightsCompany,
  InsightsDataset,
  InsightsPatent,
} from "@/lib/aipatentinsight/insightsData";

type Props = {
  /** 開啟的公司物件;null 代表面板關閉 */
  company: InsightsCompany | null;
  /** 用來查 company 對應的所有 patents */
  dataset: InsightsDataset;
  /** 顯示專利時用哪個篩選範圍(配合 client 端的 month/branch 篩選) */
  filteredPatentIds: Set<string>;
  /** 點擊某 patent 觸發 */
  onSelectPatent: (patent: InsightsPatent) => void;
  /** 關閉面板 */
  onClose: () => void;
};

export default function PatentMapDetailPanel({
  company,
  dataset,
  filteredPatentIds,
  onSelectPatent,
  onClose,
}: Props) {
  // 此公司在當前篩選下的所有專利,依日期 desc 排。
  // 注意:dataset.patents 內可能有同一 id 多筆紀錄(不同 month / branch),
  // 所以這裡 dedupe by id,避免 React key 衝突。
  const patents = useMemo(() => {
    if (!company) return [];
    const myIds = new Set(company.patentIds);
    const seen = new Set<string>();
    const result: InsightsPatent[] = [];
    for (const p of dataset.patents) {
      if (
        myIds.has(p.id) &&
        filteredPatentIds.has(p.id) &&
        !seen.has(p.id)
      ) {
        seen.add(p.id);
        result.push(p);
      }
    }
    return result.sort((a, b) =>
      a.date > b.date ? -1 : a.date < b.date ? 1 : 0
    );
  }, [company, dataset, filteredPatentIds]);

  const monthsActiveCount = useMemo(() => {
    if (patents.length === 0) return 0;
    return new Set(patents.map((p) => p.month)).size;
  }, [patents]);

  const open = company !== null;

  return (
    <div
      className={"ai-map-detail-panel" + (open ? " open" : "")}
      role="dialog"
      aria-hidden={!open}
      aria-label="Company detail"
    >
      {company && (
        <>
          <div className="ai-map-detail-header">
            <div className="ai-map-detail-titles">
              <h2 className="ai-map-detail-name">{company.name}</h2>
              <div className="ai-map-detail-tags">
                <span className="ai-map-tag">{company.mainCategory}</span>
                {company.industry && (
                  <span className="ai-map-tag industry">{company.industry}</span>
                )}
                {company.stockCode && (
                  <span className="ai-map-tag stock">{company.stockCode}</span>
                )}
                {company.isPublic && <span className="ai-map-tag public">PUBLIC</span>}
              </div>
            </div>
            <div className="ai-map-detail-actions">
              <a
                className="ai-map-detail-external"
                href={"/company/" + encodeURIComponent(company.name)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="開啟公司完整頁面 (新分頁)"
                title="View Company Page (open in new tab)"
              >
                ↗
              </a>
              <button
                type="button"
                className="ai-map-detail-close"
                aria-label="關閉"
                onClick={onClose}
              >
                ×
              </button>
            </div>
          </div>

          <div className="ai-map-detail-body">
            <div className="ai-map-detail-section-label">// Overview</div>
            <div className="ai-map-detail-grid">
              <div className="ai-map-detail-cell">
                <div className="ai-map-detail-cell-label">Patents (in view)</div>
                <div className="ai-map-detail-cell-value">{patents.length}</div>
              </div>
              <div className="ai-map-detail-cell">
                <div className="ai-map-detail-cell-label">Main Category</div>
                <div className="ai-map-detail-cell-value text-sm">
                  {company.mainCategory || "--"}
                </div>
              </div>
              <div className="ai-map-detail-cell">
                <div className="ai-map-detail-cell-label">Active Months</div>
                <div className="ai-map-detail-cell-value">{monthsActiveCount}</div>
              </div>
            </div>

            <div className="ai-map-detail-section-label">
              // Patents (<span>{patents.length}</span>)
            </div>
            <div className="ai-map-detail-patents">
              {patents.length === 0 ? (
                <div className="ai-map-detail-empty">本範圍內無專利</div>
              ) : (
                patents.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="ai-map-patent-row"
                    onClick={() => onSelectPatent(p)}
                  >
                    <span className="ai-map-patent-id">{p.id}</span>
                    <span className="ai-map-patent-title">{p.title || "(無標題)"}</span>
                    <span className="ai-map-patent-date">{p.date}</span>
                    <span className="ai-map-patent-arrow">→</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
