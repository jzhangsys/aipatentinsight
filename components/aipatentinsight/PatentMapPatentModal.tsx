"use client";

/**
 * PatentMapPatentModal — 第二層專利摘要 modal
 *
 * 顯示資料:
 * - Header:專利 ID、標題、標籤(分類 / 日期 / PR / branch)
 * - Body:abstract(中文摘要)
 *
 * abstract 是 lazy loaded(從 -abstracts.json):
 * - 開啟時若 patent.abstract 已有(舊資料)直接顯示
 * - 若空,呼叫 getPatentAbstract(id) → loading state → 拿到後填入
 *
 * 關閉:點 X、點 backdrop、按 ESC(由 parent 處理)。
 */

import { useEffect, useState } from "react";
import {
  getPatentAbstract,
  type InsightsPatent,
} from "@/lib/aipatentinsight/insightsData";

type Props = {
  patent: InsightsPatent | null;
  onClose: () => void;
};

export default function PatentMapPatentModal({ patent, onClose }: Props) {
  // patent 變化時重設 lazy loaded abstract state
  const [lazyAbstract, setLazyAbstract] = useState<string | null>(null);
  const [loadingAbstract, setLoadingAbstract] = useState(false);

  useEffect(() => {
    if (!patent) {
      setLazyAbstract(null);
      setLoadingAbstract(false);
      return;
    }
    // 若 patent 物件已帶 abstract(舊資料相容)就直接用
    if (patent.abstract && patent.abstract.length > 0) {
      setLazyAbstract(patent.abstract);
      setLoadingAbstract(false);
      return;
    }
    // 否則 lazy load
    let cancelled = false;
    setLoadingAbstract(true);
    setLazyAbstract(null);
    getPatentAbstract(patent.id)
      .then((text) => {
        if (cancelled) return;
        setLazyAbstract(text);
        setLoadingAbstract(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLazyAbstract("");
        setLoadingAbstract(false);
      });
    return () => { cancelled = true; };
  }, [patent]);

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
            {loadingAbstract
              ? "載入摘要中…"
              : lazyAbstract && lazyAbstract.length > 0
              ? lazyAbstract
              : "此專利尚無摘要資料。"}
          </div>
        </div>
      </div>
    </div>
  );
}
