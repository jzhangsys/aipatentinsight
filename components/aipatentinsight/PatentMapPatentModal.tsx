"use client";

/**
 * PatentMapPatentModal — 第二層專利摘要 modal
 *
 * 顯示資料:
 * - Header:專利 ID(monospace,大字)、專利標題、標籤(分類 / 日期 / PR 值)
 * - Body:abstract(中文摘要)
 *
 * 關閉:點 X、點 backdrop、按 ESC(由 parent 處理)。
 */

import type { InsightsPatent } from "@/lib/aipatentinsight/insightsData";

type Props = {
  patent: InsightsPatent | null;
  onClose: () => void;
};

export default function PatentMapPatentModal({ patent, onClose }: Props) {
  if (!patent) return null;

  return (
    <div
      className="ai-map-modal-backdrop show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-label="Patent detail"
    >
      <div className="ai-map-modal">
        <div className="ai-map-modal-header">
          <div className="ai-map-modal-titles">
            <h2 className="ai-map-modal-id">{patent.id}</h2>
            <div className="ai-map-modal-title">{patent.title || "(無標題)"}</div>
            <div className="ai-map-modal-tags">
              <span className="ai-map-tag">{patent.category}</span>
              <span className="ai-map-tag">{patent.date}</span>
              {patent.pr !== null && (
                <span className="ai-map-tag">PR {patent.pr}</span>
              )}
              {patent.branch !== "main" && (
                <span className={"ai-map-tag branch-" + patent.branch}>
                  {patent.branch.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="ai-map-modal-close"
            aria-label="關閉"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="ai-map-modal-body">
          <div className="ai-map-detail-section-label">// Abstract</div>
          <div className="ai-map-abstract-box">
            {patent.abstract || "此專利尚無摘要資料。"}
          </div>
        </div>
      </div>
    </div>
  );
}
