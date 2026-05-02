"use client";

/**
 * IndustryTrendsClient — Industry Trends 頁面殼
 *
 * 主視覺:Patent Currents 海洋粒子流(IndustryConceptA)
 */

import { useEffect, useState } from "react";
import IndustryConceptA from "./IndustryConceptA";

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

export default function IndustryTrendsClient() {
  const [data, setData] = useState<AggregateData | null>(null);
  const [domains, setDomains] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="ai-page ai-trends-page">
      <header className="ai-page-header">
        <div>
          <h1 className="ai-page-title">Industry Trends</h1>
        </div>
      </header>

      <section className="ai-trends-concept-stage">
        <IndustryConceptA data={data} domains={domains} />
      </section>
    </main>
  );
}
