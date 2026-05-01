"use client";

/**
 * PatentMapPatentModal — Patent 摘要 modal(目前只給 MarketSignalsClient 用)
 *
 * Lazy load abstract:patent 物件若已帶 abstract 直接顯示;
 * 否則用 getPatentAbstract(id) 從 -abstracts.json 抓。
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
  const [abstract, setAbstract] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patent) {
      setAbstract("");
      setLoading(false);
      return;
    }
    if (patent.abstract && patent.abstract.length > 0) {
      setAbstract(patent.abstract);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setAbstract("");
    getPatentAbstract(patent.id)
      .then((text) => {
        if (cancelled) return;
        setAbstract(text);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAbstract("");
        setLoading(false);
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
            {loading ? (
              "載入摘要中…"
            ) : abstract.length > 0 ? (
              abstract
            ) : (
              <span style={{ fontStyle: "italic", opacity: 0.7 }}>
                此 snapshot 來源資料未含專利摘要。{" "}
                <a
                  href={
                    "https://www.google.com/search?q=" +
                    encodeURIComponent(`專利 ${patent.id} ${patent.title || ""}`)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "rgba(125, 249, 255, 0.85)",
                    textDecoration: "underline",
                  }}
                >
                  於 Google 查詢 →
                </a>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
