"use client";

/**
 * PatentMapGlobalSearch — Patent Map 右上方全域搜尋
 *
 * 支援:
 *   - 公司名稱搜尋(部分比對)
 *   - 股票代號搜尋(數字字串)
 *   - 下拉建議清單(最多 8 筆)
 *   - 點選或按 Enter → 直接導向公司頁面
 */

import { useEffect, useMemo, useRef, useState } from "react";

export type GlobalSearchCompany = {
  name: string;
  stockCode: string | null;
  mainCategory: string | null;
};

type Props = {
  companies: GlobalSearchCompany[];
  onSelect: (name: string) => void;
};

const MAX_SUGGESTIONS = 8;

export default function PatentMapGlobalSearch({ companies, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return companies
      .filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.stockCode && c.stockCode.toLowerCase().includes(q)) return true;
        return false;
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [companies, query]);

  // 點外面關閉 dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleSelect(name: string) {
    setOpen(false);
    setQuery("");
    onSelect(name);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (matches[activeIdx]) handleSelect(matches[activeIdx].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="ai-map-global-search" ref={wrapRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => query && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="搜尋公司名稱或股票代號..."
        autoComplete="off"
        spellCheck={false}
      />
      {open && matches.length > 0 && (
        <ul className="ai-map-global-search-results" role="listbox">
          {matches.map((c, i) => (
            <li
              key={c.name}
              role="option"
              aria-selected={i === activeIdx}
              className={"ai-map-global-search-item" + (i === activeIdx ? " active" : "")}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                // 用 mousedown 避免 input blur 提前觸發
                e.preventDefault();
                handleSelect(c.name);
              }}
            >
              <span className="gs-name">{c.name}</span>
              <span className="gs-meta">
                {c.stockCode ? <span className="gs-code">{c.stockCode}</span> : null}
                {c.mainCategory ? <span className="gs-cat">{c.mainCategory}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && query && matches.length === 0 && (
        <ul className="ai-map-global-search-results">
          <li className="ai-map-global-search-empty">無符合公司</li>
        </ul>
      )}
    </div>
  );
}
