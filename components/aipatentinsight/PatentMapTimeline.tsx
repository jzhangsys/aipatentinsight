"use client";

/**
 * PatentMapTimeline — 中央時間軸 toolbar
 *
 * 顯示所有實際存在的 snapshot 日期(由 prebuild 從 public/data 自動偵測產生),
 * 點任一個 → 切到該 snapshot 的全資料。
 *
 * - 每個 snapshot 一個 tick
 * - 年份分隔下方標籤(2024 / 2025 / 2026)
 * - cursor 顯示當前選中的 snapshot
 * - 手機版:水平捲動
 */

import { useMemo } from "react";

type Props = {
  /** 所有 snapshot 日期(YYYY-MM-DD,已排序) */
  dates: string[];
  /** 當前選中(YYYY-MM-DD,nullable when 載入中) */
  selected: string | null;
  onChange: (date: string) => void;
};

function formatLabel(date: string): string {
  // 2025-02-15 → 02/15
  return date.slice(5).replace("-", "/");
}

export default function PatentMapTimeline({ dates, selected, onChange }: Props) {
  // 計算年份範圍(下方分隔標籤用)
  const yearRanges = useMemo(() => {
    if (dates.length === 0) return [];
    const map: Record<string, { firstIdx: number; lastIdx: number }> = {};
    dates.forEach((d, i) => {
      const y = d.slice(0, 4);
      if (!map[y]) map[y] = { firstIdx: i, lastIdx: i };
      else map[y].lastIdx = i;
    });
    return Object.entries(map).map(([year, range]) => ({
      year,
      midIdx: (range.firstIdx + range.lastIdx) / 2,
    }));
  }, [dates]);

  const total = dates.length;
  const pctOf = (i: number) => (total <= 1 ? 50 : (i / (total - 1)) * 100);
  const selectedIdx = selected ? dates.indexOf(selected) : -1;
  const cursorPct = selectedIdx >= 0 ? pctOf(selectedIdx) : 0;

  return (
    <div className="ai-map-timeline" role="navigation" aria-label="Snapshot dates">
      <div className="ai-map-timeline-track-wrap">
        <div className="ai-map-timeline-track">
          <div className="ai-map-timeline-baseline" />
          {selectedIdx >= 0 && (
            <div
              className="ai-map-timeline-fill"
              style={{ width: cursorPct + "%" }}
            />
          )}
          {dates.map((d, i) => {
            const isActive = selected === d;
            return (
              <button
                key={d}
                type="button"
                className={"ai-map-timeline-tick" + (isActive ? " active" : "")}
                style={{ left: pctOf(i) + "%" }}
                onClick={() => onChange(d)}
                title={d.replace(/-/g, ".")}
                aria-label={d + (isActive ? " (selected)" : "")}
              >
                <span className="ai-map-timeline-dot" />
                <span className="ai-map-timeline-month-label">
                  {formatLabel(d)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="ai-map-timeline-years">
          {yearRanges.map((y) => (
            <span
              key={y.year}
              className="ai-map-timeline-year"
              style={{ left: pctOf(y.midIdx) + "%" }}
            >
              {y.year}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
