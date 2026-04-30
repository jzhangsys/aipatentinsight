"use client";

/**
 * PatentMapLegend — 17 色 category 對照表
 *
 * 點選某個 category 後:該 cat 高亮、其他變暗、Canvas 鏡頭聚焦到該 cat 質心。
 * 再點一次同一個取消聚焦。
 */

import { useMemo } from "react";

export type LegendCategoryRow = {
  /** category 名稱 */
  category: string;
  /** 該 category 的公司數(在當前篩選範圍內) */
  count: number;
  /** 對應顏色 hex */
  color: string;
};

type Props = {
  categories: LegendCategoryRow[];
  /** 當前聚焦的 category(null 表示無聚焦) */
  activeCategory: string | null;
  /** 點選某 category 觸發,點同一個傳 null(toggle off) */
  onSelectCategory: (category: string | null) => void;
};

export default function PatentMapLegend({
  categories,
  activeCategory,
  onSelectCategory,
}: Props) {
  // 把 0 個公司的 cat 排到最後,避免空項目
  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => b.count - a.count);
  }, [categories]);

  return (
    <aside className="ai-map-legend" aria-label="Tech Categories">
      <div className="ai-map-legend-title">Tech Categories · 點選聚焦</div>
      <div className="ai-map-legend-list">
        {sorted.map((row) => {
          const isActive = activeCategory === row.category;
          const isDimmed = activeCategory !== null && !isActive;
          return (
            <button
              key={row.category}
              type="button"
              className={
                "ai-map-legend-item" +
                (isActive ? " active" : "") +
                (isDimmed ? " dim" : "")
              }
              onClick={() => onSelectCategory(isActive ? null : row.category)}
            >
              <span
                className="ai-map-legend-dot"
                style={{ background: row.color, color: row.color }}
              />
              <span className="ai-map-legend-label">{row.category}</span>
              <span className="ai-map-legend-count">{row.count}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
