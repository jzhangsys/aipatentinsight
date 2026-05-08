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
  /** 當前聚焦的 categories(空陣列表示無聚焦,多選支援) */
  activeCategories: string[];
  /** 點某 category 觸發 toggle(已選 → 移除、未選 → 加入) */
  onToggleCategory: (category: string) => void;
  /** 清空所有選擇 */
  onClearAll?: () => void;
};

export default function PatentMapLegend({
  categories,
  activeCategories,
  onToggleCategory,
  onClearAll,
}: Props) {
  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => b.count - a.count);
  }, [categories]);
  const activeSet = useMemo(() => new Set(activeCategories), [activeCategories]);
  const hasSelection = activeCategories.length > 0;

  return (
    <aside className="ai-map-legend" aria-label="Tech Categories">
      <div className="ai-map-legend-title">
        Tech Categories · 點選 / 多選
        {hasSelection && onClearAll && (
          <button
            type="button"
            className="ai-map-legend-clear"
            onClick={onClearAll}
            aria-label="Clear selection"
          >
            清除({activeCategories.length})
          </button>
        )}
      </div>
      <div className="ai-map-legend-list">
        {sorted.map((row) => {
          const isActive = activeSet.has(row.category);
          const isDimmed = hasSelection && !isActive;
          return (
            <button
              key={row.category}
              type="button"
              className={
                "ai-map-legend-item" +
                (isActive ? " active" : "") +
                (isDimmed ? " dim" : "")
              }
              onClick={() => onToggleCategory(row.category)}
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
