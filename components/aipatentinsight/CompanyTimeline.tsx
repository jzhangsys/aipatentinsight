"use client";

/**
 * CompanyTimeline — 公司頁的時間軸視覺
 *
 * 一條水平線,上面分布 N 個節點(由 props.entries 控制)。
 * 每個節點:
 *   - present=true:紅點、可點 → 觸發 onSelect(date)
 *   - present=false:灰點、不可點(placeholder 或該 snapshot 內無此公司)
 *   - 被選中(activeDate):額外 highlight 邊框
 */

import type { CompanyAppearance } from "@/lib/aipatentinsight/insightsData";

type Props = {
  entries: CompanyAppearance[];
  activeDate: string | null;
  onSelect: (date: string) => void;
};

export default function CompanyTimeline({ entries, activeDate, onSelect }: Props) {
  if (entries.length === 0) {
    return (
      <div className="ai-company-timeline-empty">
        No timeline data
      </div>
    );
  }

  const total = entries.length;

  return (
    <div className="ai-company-timeline" role="navigation" aria-label="Snapshot timeline">
      <div className="ai-company-timeline-track">
        <div className="ai-company-timeline-line" />
        {entries.map((e, i) => {
          const leftPct = total === 1 ? 50 : (i / (total - 1)) * 100;
          const isActive = activeDate === e.snapshot.date;
          const isClickable = e.present;

          const className =
            "ai-company-timeline-node" +
            (isClickable ? " present" : " absent") +
            (isActive ? " active" : "");

          return (
            <button
              key={e.snapshot.date}
              type="button"
              className={className}
              style={{ left: `${leftPct}%` }}
              disabled={!isClickable}
              onClick={() => isClickable && onSelect(e.snapshot.date)}
              aria-label={
                e.snapshot.label +
                (isClickable ? " (有資料)" : " (無資料)") +
                (isActive ? " (目前選中)" : "")
              }
              title={
                e.snapshot.label +
                (isClickable
                  ? `\n${e.snapshot.totalCompanies ?? "?"} 公司 / ${e.snapshot.totalPatents ?? "?"} 專利`
                  : "\n(尚無資料)")
              }
            >
              <span className="ai-company-timeline-dot" />
              <span className="ai-company-timeline-label">{e.snapshot.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
