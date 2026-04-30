"use client";

/**
 * PatentMapCompanyPanel — 公司清單面板(右側)
 *
 * - Header:標題 + 計數 + 收合/展開 toggle
 * - Search:debounced 200ms
 * - 三個 sort tab:By Patents / By Name / By Category
 * - 清單:目前一次最多顯示 300 筆,溢出顯示「+ N more · 請搜尋縮小範圍」
 *
 * 點擊某公司觸發 onSelectCompany(name),由 parent 處理鏡頭聚焦 + 開 detail panel。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayoutCompany } from "@/lib/aipatentinsight/patentMapLayout";

type SortKey = "patents" | "name" | "category";

type Props = {
  /** 當前 visible 的公司清單(已套用月份/branch/category 篩選) */
  companies: LayoutCompany[];
  /** category → hex 色 */
  palette: Record<string, string>;
  /** 從 dataset 取出的公司原始資料(取 stockCode / isPublic 用) */
  getMeta: (name: string) => { stockCode: string | null; isPublic: boolean } | null;
  /** 當前高亮的公司名(由 parent 決定,可能是 null) */
  highlightedName: string | null;
  /** 點擊公司觸發 */
  onSelectCompany: (name: string) => void;
};

const MAX_DISPLAY = 300;

export default function PatentMapCompanyPanel({
  companies,
  palette,
  getMeta,
  highlightedName,
  onSelectCompany,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("patents");

  // === Search debounce(200ms) ===
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // === 篩選 + 排序 ===
  const filtered = useMemo(() => {
    let list = companies;
    if (searchQuery) {
      list = list.filter((c) => c.name.toLowerCase().includes(searchQuery));
    }
    const sorted = [...list];
    if (sortBy === "patents") {
      sorted.sort((a, b) => b.displayPatents - a.displayPatents);
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
    } else if (sortBy === "category") {
      sorted.sort((a, b) => {
        const ca = a.mainCategory || "";
        const cb = b.mainCategory || "";
        if (ca !== cb) return ca.localeCompare(cb, "zh-Hant");
        return b.displayPatents - a.displayPatents;
      });
    }
    return sorted;
  }, [companies, searchQuery, sortBy]);

  const displayList = filtered.slice(0, MAX_DISPLAY);
  const overflow = filtered.length - displayList.length;

  return (
    <aside
      className={"ai-map-company-panel" + (collapsed ? " collapsed" : "")}
      aria-label="Company list"
    >
      <div className="ai-map-company-header">
        <div className="ai-map-company-title">
          <span>Companies</span>
          <span className="ai-map-company-count">{filtered.length}</span>
        </div>
        <button
          type="button"
          className="ai-map-company-toggle"
          aria-label={collapsed ? "展開公司清單" : "收合公司清單"}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? "‹" : "›"}
        </button>
      </div>

      <div className="ai-map-company-search">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜尋公司名稱..."
          autoComplete="off"
        />
      </div>

      <div className="ai-map-company-sort">
        {(["patents", "name", "category"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={"ai-map-company-sort-tab" + (sortBy === key ? " active" : "")}
            onClick={() => setSortBy(key)}
          >
            {key === "patents" ? "By Patents" : key === "name" ? "By Name" : "By Category"}
          </button>
        ))}
      </div>

      <div className="ai-map-company-list">
        {displayList.length === 0 ? (
          <div className="ai-map-company-empty">No Companies</div>
        ) : (
          displayList.map((c) => {
            const isHighlighted = highlightedName === c.name;
            const hex = palette[c.mainCategory] || "#999";
            const meta = getMeta(c.name);
            const stockTag = meta?.stockCode ? ` · ${meta.stockCode}` : "";
            const publicTag = meta?.isPublic ? " · 上市" : "";
            return (
              <button
                key={c.name}
                type="button"
                className={"ai-map-company-item" + (isHighlighted ? " highlighted" : "")}
                onClick={() => onSelectCompany(c.name)}
              >
                <span
                  className="ai-map-company-dot"
                  style={{ background: hex, color: hex }}
                />
                <span className="ai-map-company-info">
                  <span className="ai-map-company-name">{c.name}</span>
                  <span className="ai-map-company-meta">
                    {c.mainCategory || "--"}
                    {publicTag}
                    {stockTag}
                  </span>
                </span>
                <span className="ai-map-company-patents">{c.displayPatents}</span>
              </button>
            );
          })
        )}
        {overflow > 0 && (
          <div className="ai-map-company-empty">
            + {overflow} more · 請搜尋縮小範圍
          </div>
        )}
      </div>
    </aside>
  );
}
