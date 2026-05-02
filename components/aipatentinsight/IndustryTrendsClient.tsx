"use client";

/**
 * IndustryTrendsClient — Industry Trends 頁面殼
 *
 * 三個 concept 的視覺 prototype 可切換比較:
 *   A. Patent Currents — 2D 洋流條(跟首頁洋流呼應)
 *   B. Patent Ocean — 3D 海床地形(Three.js,跟 Patent Map 點雲呼應)
 *   C. Tide Pool — 上 cat 洋流 + 下 公司泡泡疊層
 *
 * 預設 A;URL ?concept=B 或 ?concept=C 切換。
 */

import { useEffect, useState } from "react";
import IndustryConceptA from "./IndustryConceptA";
import IndustryConceptB from "./IndustryConceptB";
import IndustryConceptC from "./IndustryConceptC";

type AggregateData = {
  generatedAt: string;
  dates: string[];
  categories: string[];
  companies: { name: string; stockCode: string }[];
  catMatrix: number[][];
  companyMatrix: number[][];
  companyMainCatMatrix: (string | null)[][];
  metrics: any;
};

type Concept = "A" | "B" | "C";

export default function IndustryTrendsClient() {
  const [data, setData] = useState<AggregateData | null>(null);
  const [domains, setDomains] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState<Concept>(() => {
    if (typeof window === "undefined") return "A";
    const p = new URLSearchParams(window.location.search).get("concept");
    return p === "B" || p === "C" ? p : "A";
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/data/trends-aggregate.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    // domains map(失敗無妨,fallback 為純文字)
    fetch("/data/company-domains.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((m) => {
        if (cancelled) return;
        // 過濾掉 _comment 等非 stockCode key
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(m)) {
          if (typeof v === "string" && !k.startsWith("_")) out[k] = v;
        }
        setDomains(out);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // URL 同步
  useEffect(() => {
    const params = new URLSearchParams();
    if (concept !== "A") params.set("concept", concept);
    const qs = params.toString();
    if (window.location.search.replace(/^\?/, "") !== qs) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? "?" + qs : "")
      );
    }
  }, [concept]);

  if (error) {
    return (
      <main className="ai-page ai-trends-page">
        <div className="ai-trends-error">
          <strong>ERROR</strong>
          <p>{error}</p>
        </div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="ai-page ai-trends-page">
        <div className="ai-trends-loading">Loading aggregate…</div>
      </main>
    );
  }

  const conceptLabels: Record<Concept, string> = {
    A: "Patent Currents（2D 洋流）",
    B: "Patent Ocean（3D 海床）",
    C: "Tide Pool（潮間帶）",
  };

  return (
    <main className="ai-page ai-trends-page">
      <header className="ai-page-header">
        <div>
          <h1 className="ai-page-title">Industry Trends</h1>
          <p className="ai-page-description">
            16 期 snapshot 跨期分析 · 找出穩健核心 vs 曇花一現
          </p>
        </div>
      </header>

      <div className="ai-trends-concept-tabs" role="tablist">
        {(["A", "B", "C"] as const).map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={concept === c}
            type="button"
            className={"ai-pill" + (concept === c ? " active" : "")}
            onClick={() => setConcept(c)}
          >
            {conceptLabels[c]}
          </button>
        ))}
      </div>

      <section className="ai-trends-concept-stage">
        {concept === "A" && <IndustryConceptA data={data} domains={domains} />}
        {concept === "B" && <IndustryConceptB data={data} />}
        {concept === "C" && <IndustryConceptC data={data} />}
      </section>
    </main>
  );
}
