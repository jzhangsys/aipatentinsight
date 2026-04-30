#!/usr/bin/env bash
set -euo pipefail

echo "==> Confirm current project"
pwd

if [ ! -f package.json ] || [ ! -f next.config.ts ]; then
  echo "ERROR: 目前看起來不是 Next.js 專案根目錄。"
  exit 1
fi

echo "==> Installing dependencies"
npm install papaparse d3

echo "==> Creating folders"
mkdir -p app/patent-map app/market-signals app/industry-trends components/aipatentinsight lib/aipatentinsight

echo "==> Writing data"

cat > lib/aipatentinsight/patentData.ts <<'TS'
export type PatentRow = {
  date: string;
  company: string;
  stockCode?: string;
  topic: string;
  category: string;
  patentNo: string;
  patentTitle?: string;
  abstract: string;
  importanceScore?: number;
};

export const patentData: PatentRow[] = [
  {
    date: "2023/04",
    company: "TSMC",
    stockCode: "2330",
    topic: "Advanced Packaging",
    category: "Semiconductor",
    patentNo: "US12345678B2",
    patentTitle: "Semiconductor package structure",
    abstract:
      "A semiconductor package structure improves interconnect density and thermal dissipation for high-performance computing applications.",
    importanceScore: 92
  },
  {
    date: "2023/04",
    company: "TSMC",
    stockCode: "2330",
    topic: "Advanced Packaging",
    category: "Semiconductor",
    patentNo: "US23456789B2",
    patentTitle: "Chiplet integration method",
    abstract:
      "A chiplet integration method enables heterogeneous dies to be connected with reduced signal loss and improved packaging yield.",
    importanceScore: 88
  },
  {
    date: "2023/09",
    company: "NVIDIA",
    stockCode: "NVDA",
    topic: "AI Infrastructure",
    category: "AI",
    patentNo: "US34567890B2",
    patentTitle: "Accelerated neural network processing",
    abstract:
      "A processor architecture accelerates neural network training and inference by optimizing memory access and parallel execution.",
    importanceScore: 95
  },
  {
    date: "2024/06",
    company: "Foxconn",
    stockCode: "2317",
    topic: "AI Server Supply Chain",
    category: "AI Infrastructure",
    patentNo: "US45678901B2",
    patentTitle: "Modular server thermal management",
    abstract:
      "A modular server architecture improves thermal management for dense AI server deployments.",
    importanceScore: 84
  },
  {
    date: "2025/03",
    company: "Quanta",
    stockCode: "2382",
    topic: "Cloud AI Hardware",
    category: "Cloud",
    patentNo: "US56789012B2",
    patentTitle: "Cloud workload acceleration system",
    abstract:
      "A hardware acceleration system dynamically allocates compute resources for cloud-based AI workloads.",
    importanceScore: 81
  }
];
TS

cat > lib/aipatentinsight/marketSignalData.ts <<'TS'
export type MarketPatent = {
  patentNo: string;
  abstract: string;
};

export type MarketCompany = {
  company: string;
  stockCode?: string;
  patents: MarketPatent[];
};

export type MarketSignal = {
  date: string;
  theme: string;
  category: string;
  heatScore: number;
  sentimentScore: number;
  companies: MarketCompany[];
};

export const marketSignalData: MarketSignal[] = [
  {
    date: "2023/04",
    theme: "Generative AI Infrastructure",
    category: "AI",
    heatScore: 88,
    sentimentScore: 0.72,
    companies: [
      {
        company: "NVIDIA",
        stockCode: "NVDA",
        patents: [
          {
            patentNo: "US34567890B2",
            abstract:
              "A processor architecture accelerates neural network training and inference by optimizing memory access and parallel execution."
          }
        ]
      }
    ]
  },
  {
    date: "2023/09",
    theme: "Edge AI Deployment",
    category: "AI",
    heatScore: 76,
    sentimentScore: 0.64,
    companies: [
      {
        company: "Qualcomm",
        stockCode: "QCOM",
        patents: [
          {
            patentNo: "US67890123B2",
            abstract:
              "An edge device inference system reduces power consumption while maintaining real-time AI processing capability."
          }
        ]
      }
    ]
  },
  {
    date: "2024/06",
    theme: "AI Server Supply Chain",
    category: "AI Infrastructure",
    heatScore: 94,
    sentimentScore: 0.81,
    companies: [
      {
        company: "Foxconn",
        stockCode: "2317",
        patents: [
          {
            patentNo: "US45678901B2",
            abstract:
              "A modular server architecture improves thermal management for dense AI server deployments."
          }
        ]
      },
      {
        company: "Quanta",
        stockCode: "2382",
        patents: [
          {
            patentNo: "US56789012B2",
            abstract:
              "A hardware acceleration system dynamically allocates compute resources for cloud-based AI workloads."
          }
        ]
      }
    ]
  }
];
TS

cat > lib/aipatentinsight/articleData.ts <<'TS'
export type Article = {
  id: string;
  title: string;
  date: string;
  category: string;
  readingTime: string;
  summary: string;
  tags: string[];
  content: {
    executiveSummary: string;
    keySignals: string[];
    patentEvidence: string[];
    marketContext: string;
    implications: string;
  };
  relatedCompanies: string[];
  relatedTopics: string[];
};

export const articleData: Article[] = [
  {
    id: "advanced-packaging-ai-hardware",
    title: "Advanced Packaging Becomes the Strategic Bottleneck of AI Hardware",
    date: "2024/06",
    category: "Semiconductor",
    readingTime: "8 min",
    summary:
      "AI hardware competition is increasingly shaped by packaging density, thermal control, and supply chain constraints.",
    tags: ["Advanced Packaging", "AI Server", "Semiconductor"],
    content: {
      executiveSummary:
        "Advanced packaging is becoming a strategic control point for AI hardware. Patent filings increasingly focus on interconnect density, chiplet integration, substrate design, and thermal management.",
      keySignals: [
        "Growth in chiplet-related patent filings",
        "Increasing overlap between AI server companies and semiconductor packaging suppliers",
        "More patent activity around thermal and power delivery constraints"
      ],
      patentEvidence: [
        "Packaging patents emphasize heterogeneous integration.",
        "Thermal patents indicate increasing density pressure in AI server systems."
      ],
      marketContext:
        "Demand for AI accelerators has pushed the supply chain toward specialized packaging capacity and high-bandwidth memory integration.",
      implications:
        "Companies controlling advanced packaging know-how may gain leverage beyond conventional foundry or server assembly roles."
    },
    relatedCompanies: ["TSMC", "NVIDIA", "Foxconn", "Quanta"],
    relatedTopics: ["CoWoS", "HBM", "Chiplet", "AI Server"]
  },
  {
    id: "edge-ai-deployment",
    title: "Patent Signals Behind Edge AI Deployment",
    date: "2023/09",
    category: "AI",
    readingTime: "6 min",
    summary:
      "Edge AI patent activity reveals a shift from model capability toward deployment efficiency.",
    tags: ["Edge AI", "Inference", "Low Power"],
    content: {
      executiveSummary:
        "Edge AI patents increasingly emphasize low-power inference, on-device scheduling, compression, and latency reduction.",
      keySignals: [
        "More filings around quantized inference",
        "Growth in device-level AI acceleration",
        "Integration with camera, sensor, and automotive systems"
      ],
      patentEvidence: [
        "Inference patents focus on memory bandwidth and power consumption.",
        "Deployment patents increasingly reference heterogeneous device environments."
      ],
      marketContext:
        "As AI moves from cloud training to real-world deployment, edge devices become a key battleground.",
      implications:
        "Edge AI winners may be those with both model optimization and hardware-software integration patents."
    },
    relatedCompanies: ["Qualcomm", "MediaTek", "Apple"],
    relatedTopics: ["Inference", "NPU", "Sensor Fusion"]
  }
];
TS

cat > lib/aipatentinsight/grouping.ts <<'TS'
import type { PatentRow } from "./patentData";

export function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

export type CompanyNode = {
  id: string;
  company: string;
  stockCode?: string;
  date: string;
  topic: string;
  category: string;
  patentCount: number;
  patents: {
    patentNo: string;
    title?: string;
    abstract: string;
    importanceScore?: number;
  }[];
};

export function groupPatentsByCompany(rows: PatentRow[]): CompanyNode[] {
  const map = new Map<string, CompanyNode>();

  rows.forEach((row) => {
    const key = row.company;

    if (!map.has(key)) {
      map.set(key, {
        id: key.toLowerCase().replaceAll(" ", "-"),
        company: row.company,
        stockCode: row.stockCode,
        date: row.date,
        topic: row.topic,
        category: row.category,
        patentCount: 0,
        patents: []
      });
    }

    const item = map.get(key);

    if (!item) return;

    item.patents.push({
      patentNo: row.patentNo,
      title: row.patentTitle,
      abstract: row.abstract,
      importanceScore: row.importanceScore
    });

    item.patentCount = item.patents.length;
  });

  return [...map.values()];
}
TS

echo "==> Writing global CSS"

cat > app/aipatentinsight.css <<'CSS'
:root {
  --ai-bg-main: #02040c;
  --ai-bg-panel: rgba(3, 5, 15, 0.82);
  --ai-cyan: #7df9ff;
  --ai-cyan-soft: rgba(125, 249, 255, 0.65);
  --ai-cyan-border: rgba(125, 249, 255, 0.22);
  --ai-text-main: rgba(255, 255, 255, 0.94);
  --ai-text-muted: rgba(255, 255, 255, 0.55);
  --ai-font-futura: Futura, "Futura PT", "Century Gothic", "Jost", "Avenir Next", sans-serif;
  --ai-font-body: "Noto Sans TC", "Jost", system-ui, sans-serif;
}

.ai-shell {
  min-height: 100vh;
  background:
    radial-gradient(ellipse at 50% 45%, rgba(10, 24, 64, 0.9) 0%, rgba(3, 5, 15, 0.96) 50%, #01030a 100%);
  color: var(--ai-text-main);
  font-family: var(--ai-font-body);
  overflow-x: hidden;
}

.ai-nav {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 50;
  height: 86px;
  padding: 22px 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(2,4,12,0.78), rgba(2,4,12,0.22));
  backdrop-filter: blur(10px);
}

.ai-logo {
  font-family: var(--ai-font-futura);
  letter-spacing: 0.18em;
  font-size: 15px;
  color: var(--ai-text-main);
  text-decoration: none;
}

.ai-nav-menu {
  display: flex;
  align-items: center;
  gap: 28px;
}

.ai-nav-link {
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.62);
  padding: 8px 0;
  border-bottom: 1px solid transparent;
  text-decoration: none;
}

.ai-nav-link:hover {
  color: var(--ai-cyan);
  border-bottom-color: rgba(125,249,255,0.7);
}

.ai-nav-cta {
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  background: rgba(125,249,255,0.9);
  color: #02040c;
  padding: 10px 18px;
  text-decoration: none;
}

.ai-page {
  min-height: 100vh;
  padding: 120px 48px 48px;
}

.ai-hero-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  padding: 120px 24px 48px;
}

.ai-hero-orb {
  position: absolute;
  width: 780px;
  height: 780px;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(125,249,255,0.16), transparent 62%),
    conic-gradient(from 90deg, transparent, rgba(125,249,255,0.16), transparent);
  filter: blur(2px);
  animation: aiSpin 18s linear infinite;
}

@keyframes aiSpin {
  to { transform: rotate(360deg); }
}

.ai-hero-content {
  position: relative;
  z-index: 2;
  max-width: 900px;
}

.ai-eyebrow {
  font-size: 10px;
  letter-spacing: 0.5em;
  text-transform: uppercase;
  color: var(--ai-cyan-soft);
  margin-bottom: 22px;
}

.ai-hero-title {
  font-family: var(--ai-font-futura);
  font-weight: 300;
  font-size: clamp(40px, 7vw, 86px);
  letter-spacing: 0.22em;
  margin: 0;
}

.ai-hero-subtitle {
  margin: 26px auto 0;
  max-width: 740px;
  color: var(--ai-text-muted);
  font-size: 18px;
  line-height: 1.9;
  letter-spacing: 0.06em;
}

.ai-primary-button {
  display: inline-flex;
  margin-top: 42px;
  padding: 14px 28px;
  border: 1px solid rgba(125,249,255,0.6);
  background: rgba(125,249,255,0.1);
  color: var(--ai-cyan);
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  text-decoration: none;
}

.ai-page-header {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  align-items: flex-end;
  margin-bottom: 24px;
}

.ai-page-title {
  font-family: var(--ai-font-futura);
  font-size: 38px;
  font-weight: 300;
  letter-spacing: 0.18em;
  margin: 0 0 10px;
}

.ai-page-description {
  color: var(--ai-text-muted);
  max-width: 760px;
  line-height: 1.8;
  margin: 0;
}

.ai-controls {
  display: flex;
  gap: 18px;
  align-items: flex-end;
  padding: 14px 18px;
  border: 1px solid var(--ai-cyan-border);
  background: var(--ai-bg-panel);
  backdrop-filter: blur(12px);
  border-radius: 10px;
}

.ai-control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-control-label {
  font-size: 9px;
  color: var(--ai-cyan-soft);
  letter-spacing: 0.25em;
  text-transform: uppercase;
}

.ai-control-select {
  min-width: 140px;
  background: transparent;
  color: var(--ai-text-main);
  border: none;
  border-bottom: 1px solid rgba(125,249,255,0.35);
  outline: none;
  padding: 4px 0;
}

.ai-control-select option {
  background: #03050f;
  color: white;
}

.ai-map-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: stretch;
}

.ai-graph-panel {
  min-height: calc(100vh - 230px);
  border: 1px solid var(--ai-cyan-border);
  background:
    radial-gradient(circle at 50% 45%, rgba(125,249,255,0.08), transparent 36%),
    rgba(3,5,15,0.76);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.ai-graph-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(125,249,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125,249,255,0.05) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(circle, black 55%, transparent 100%);
}

.ai-node {
  position: absolute;
  width: var(--size);
  height: var(--size);
  left: var(--x);
  top: var(--y);
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: currentColor;
  color: var(--color);
  box-shadow: 0 0 16px currentColor;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.75);
}

.ai-node::after {
  content: attr(data-label);
  position: absolute;
  left: 50%;
  top: calc(100% + 10px);
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  color: rgba(255,255,255,0.72);
  letter-spacing: 0.08em;
}

.ai-side-panel {
  border: 1px solid var(--ai-cyan-border);
  background: var(--ai-bg-panel);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  overflow: hidden;
  min-height: calc(100vh - 230px);
}

.ai-side-panel-header {
  padding: 16px 18px;
  border-bottom: 1px solid rgba(125,249,255,0.14);
}

.ai-side-panel-title {
  font-size: 11px;
  color: var(--ai-cyan-soft);
  letter-spacing: 0.3em;
  text-transform: uppercase;
}

.ai-side-list {
  padding: 8px 0;
}

.ai-side-item {
  width: 100%;
  background: transparent;
  border: none;
  color: inherit;
  text-align: left;
  padding: 12px 18px;
  display: grid;
  gap: 4px;
  cursor: pointer;
  border-left: 2px solid transparent;
}

.ai-side-item:hover {
  background: rgba(125,249,255,0.06);
  border-left-color: rgba(125,249,255,0.8);
}

.ai-side-item-title {
  font-size: 14px;
}

.ai-side-item-meta {
  font-size: 10px;
  color: var(--ai-text-muted);
  letter-spacing: 0.08em;
}

.ai-stats-bar {
  position: absolute;
  right: 18px;
  bottom: 18px;
  display: flex;
  gap: 18px;
  padding: 12px 16px;
  border: 1px solid rgba(125,249,255,0.16);
  background: rgba(3,5,15,0.82);
  border-radius: 10px;
}

.ai-stat-label {
  font-size: 8px;
  color: var(--ai-cyan-soft);
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.ai-stat-value {
  font-family: var(--ai-font-futura);
  font-size: 22px;
  color: white;
}

.ai-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(2,4,12,0.72);
  backdrop-filter: blur(5px);
  display: grid;
  place-items: center;
  padding: 30px;
}

.ai-modal {
  width: min(720px, 96vw);
  max-height: 82vh;
  overflow: auto;
  background: linear-gradient(145deg, #060a1c, #03050f);
  border: 1px solid rgba(125,249,255,0.28);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.65), 0 0 80px rgba(125,249,255,0.08);
}

.ai-modal-header {
  padding: 22px 26px;
  border-bottom: 1px solid rgba(125,249,255,0.12);
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.ai-modal-title {
  margin: 0;
  font-family: var(--ai-font-futura);
  font-size: 26px;
  font-weight: 300;
  letter-spacing: 0.08em;
}

.ai-modal-meta {
  margin-top: 8px;
  color: var(--ai-text-muted);
  font-size: 12px;
}

.ai-modal-close {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
  cursor: pointer;
}

.ai-modal-body {
  padding: 22px 26px 28px;
}

.ai-section-label {
  font-size: 10px;
  color: var(--ai-cyan-soft);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  margin: 0 0 12px;
}

.ai-row-button {
  width: 100%;
  border: 1px solid rgba(125,249,255,0.12);
  background: rgba(125,249,255,0.035);
  color: white;
  padding: 12px 14px;
  margin-bottom: 8px;
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
}

.ai-row-button:hover {
  border-color: rgba(125,249,255,0.48);
  background: rgba(125,249,255,0.08);
}

.ai-abstract-box {
  line-height: 1.9;
  color: rgba(255,255,255,0.82);
  border: 1px solid rgba(125,249,255,0.14);
  background: rgba(125,249,255,0.04);
  padding: 18px;
  border-radius: 10px;
}

.ai-article-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  gap: 20px;
}

.ai-article-card {
  border: 1px solid var(--ai-cyan-border);
  background: var(--ai-bg-panel);
  border-radius: 16px;
  padding: 22px;
  min-height: 260px;
  cursor: pointer;
  backdrop-filter: blur(12px);
}

.ai-article-card.featured {
  grid-row: span 2;
  min-height: 540px;
}

.ai-article-card:hover {
  border-color: rgba(125,249,255,0.55);
  transform: translateY(-2px);
}

.ai-article-category {
  color: var(--ai-cyan-soft);
  font-size: 10px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
}

.ai-article-title {
  margin: 16px 0 12px;
  font-family: var(--ai-font-futura);
  font-size: 24px;
  font-weight: 300;
  line-height: 1.3;
}

.ai-article-summary {
  color: var(--ai-text-muted);
  line-height: 1.75;
}

.ai-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.ai-tag {
  border: 1px solid rgba(125,249,255,0.18);
  color: rgba(125,249,255,0.8);
  padding: 4px 8px;
  font-size: 10px;
  border-radius: 999px;
}

@media (max-width: 980px) {
  .ai-nav {
    padding: 18px 22px;
  }

  .ai-nav-menu {
    gap: 14px;
  }

  .ai-page {
    padding: 110px 22px 32px;
  }

  .ai-page-header {
    display: block;
  }

  .ai-controls {
    margin-top: 18px;
    flex-wrap: wrap;
  }

  .ai-map-layout {
    grid-template-columns: 1fr;
  }

  .ai-article-grid {
    grid-template-columns: 1fr;
  }

  .ai-article-card.featured {
    grid-row: auto;
    min-height: 320px;
  }
}
CSS

echo "==> Writing components"

cat > components/aipatentinsight/AINavbar.tsx <<'TSX'
import Link from "next/link";

export default function AINavbar() {
  return (
    <nav className="ai-nav">
      <Link href="/" className="ai-logo">
        AIPatentInsight
      </Link>

      <div className="ai-nav-menu">
        <Link href="/" className="ai-nav-link">Home</Link>
        <Link href="/patent-map" className="ai-nav-link">Patent Map</Link>
        <Link href="/market-signals" className="ai-nav-link">Market Signals</Link>
        <Link href="/industry-trends" className="ai-nav-link">Industry Trends</Link>
      </div>

      <Link href="/patent-map" className="ai-nav-cta">
        Enter Map
      </Link>
    </nav>
  );
}
TSX

cat > components/aipatentinsight/AIModal.tsx <<'TSX'
"use client";

import type { ReactNode } from "react";

type AIModalProps = {
  title: string;
  meta?: string;
  children: ReactNode;
  onClose: () => void;
};

export default function AIModal({ title, meta, children, onClose }: AIModalProps) {
  return (
    <div className="ai-modal-backdrop" onMouseDown={onClose}>
      <div className="ai-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ai-modal-header">
          <div>
            <h2 className="ai-modal-title">{title}</h2>
            {meta ? <div className="ai-modal-meta">{meta}</div> : null}
          </div>
          <button className="ai-modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <div className="ai-modal-body">{children}</div>
      </div>
    </div>
  );
}
TSX

cat > components/aipatentinsight/AIGraphPanel.tsx <<'TSX'
"use client";

type Stat = {
  label: string;
  value: number | string;
};

type AIGraphPanelProps<T extends Record<string, any>> = {
  nodes: T[];
  labelKey: keyof T;
  sizeKey: keyof T;
  categoryKey: keyof T;
  onNodeClick: (node: T) => void;
  stats?: Stat[];
};

const categoryColors: Record<string, string> = {
  Semiconductor: "#7DF9FF",
  AI: "#B388FF",
  "AI Infrastructure": "#64FFDA",
  Cloud: "#89CFF0",
  Robotics: "#FFB86C",
  Battery: "#A3FF8F",
  Biotech: "#FF8FD1"
};

function getPosition(index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  const radius = total <= 3 ? 25 : 34;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  return { x: `${x}%`, y: `${y}%` };
}

export default function AIGraphPanel<T extends Record<string, any>>({
  nodes,
  labelKey,
  sizeKey,
  categoryKey,
  onNodeClick,
  stats = []
}: AIGraphPanelProps<T>) {
  return (
    <section className="ai-graph-panel">
      <div className="ai-graph-grid" />

      {nodes.map((node, index) => {
        const pos = getPosition(index, nodes.length);
        const baseSize = Number(node[sizeKey] || 1);
        const size = Math.max(16, Math.min(54, 14 + baseSize * 4));
        const category = String(node[categoryKey] || "");
        const label = String(node[labelKey] || "");
        const color = categoryColors[category] || "#7DF9FF";

        return (
          <button
            key={node.id || label}
            className="ai-node"
            data-label={label}
            title={label}
            style={{
              "--x": pos.x,
              "--y": pos.y,
              "--size": `${size}px`,
              "--color": color
            } as React.CSSProperties}
            onClick={() => onNodeClick(node)}
          />
        );
      })}

      <div className="ai-stats-bar">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="ai-stat-label">{stat.label}</div>
            <div className="ai-stat-value">{stat.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
TSX

echo "==> Writing client pages"

cat > components/aipatentinsight/PatentMapClient.tsx <<'TSX'
"use client";

import { useMemo, useState } from "react";
import AIGraphPanel from "./AIGraphPanel";
import AIModal from "./AIModal";
import { patentData } from "@/lib/aipatentinsight/patentData";
import { groupPatentsByCompany, uniqueSorted, type CompanyNode } from "@/lib/aipatentinsight/grouping";

type PatentItem = CompanyNode["patents"][number];

export default function PatentMapClient() {
  const availableDates = useMemo(() => uniqueSorted(patentData.map((row) => row.date)), []);
  const [selectedDate, setSelectedDate] = useState(availableDates[0]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyNode | null>(null);
  const [selectedPatent, setSelectedPatent] = useState<PatentItem | null>(null);

  const rows = useMemo(
    () => patentData.filter((row) => row.date === selectedDate),
    [selectedDate]
  );

  const companies = useMemo(() => groupPatentsByCompany(rows), [rows]);

  return (
    <main className="ai-page">
      <header className="ai-page-header">
        <div>
          <h1 className="ai-page-title">Patent Intelligence Map</h1>
          <p className="ai-page-description">
            依據指定時間點，將公司專利資料映射為技術圖譜。每一個節點代表一間公司，節點大小反映專利數量。
          </p>
        </div>

        <div className="ai-controls">
          <label className="ai-control-group">
            <span className="ai-control-label">Time Point</span>
            <select
              className="ai-control-select"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            >
              {availableDates.map((date) => (
                <option key={date}>{date}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="ai-map-layout">
        <AIGraphPanel
          nodes={companies}
          labelKey="company"
          sizeKey="patentCount"
          categoryKey="category"
          onNodeClick={(company) => {
            setSelectedPatent(null);
            setSelectedCompany(company);
          }}
          stats={[
            { label: "Companies", value: companies.length },
            { label: "Patents", value: rows.length }
          ]}
        />

        <aside className="ai-side-panel">
          <div className="ai-side-panel-header">
            <div className="ai-side-panel-title">Company List</div>
          </div>
          <div className="ai-side-list">
            {companies.map((company) => (
              <button
                key={company.company}
                className="ai-side-item"
                onClick={() => {
                  setSelectedPatent(null);
                  setSelectedCompany(company);
                }}
              >
                <span className="ai-side-item-title">{company.company}</span>
                <span className="ai-side-item-meta">
                  {company.category} / {company.topic} / {company.patentCount} patents
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {selectedCompany && !selectedPatent && (
        <AIModal
          title={selectedCompany.company}
          meta={`${selectedCompany.date} / ${selectedCompany.category} / ${selectedCompany.topic}`}
          onClose={() => setSelectedCompany(null)}
        >
          <p className="ai-section-label">Key Patents</p>
          {selectedCompany.patents.map((patent) => (
            <button
              key={patent.patentNo}
              className="ai-row-button"
              onClick={() => setSelectedPatent(patent)}
            >
              {patent.patentNo} →
            </button>
          ))}
        </AIModal>
      )}

      {selectedCompany && selectedPatent && (
        <AIModal
          title={selectedPatent.patentNo}
          meta={selectedCompany.company}
          onClose={() => setSelectedPatent(null)}
        >
          <p className="ai-section-label">Abstract</p>
          <div className="ai-abstract-box">{selectedPatent.abstract}</div>
        </AIModal>
      )}
    </main>
  );
}
TSX

cat > components/aipatentinsight/MarketSignalsClient.tsx <<'TSX'
"use client";

import { useMemo, useState } from "react";
import AIGraphPanel from "./AIGraphPanel";
import AIModal from "./AIModal";
import { marketSignalData, type MarketCompany, type MarketPatent, type MarketSignal } from "@/lib/aipatentinsight/marketSignalData";
import { uniqueSorted } from "@/lib/aipatentinsight/grouping";

type ThemeNode = MarketSignal & {
  id: string;
  companyCount: number;
};

export default function MarketSignalsClient() {
  const availableDates = useMemo(() => uniqueSorted(marketSignalData.map((row) => row.date)), []);
  const [selectedDate, setSelectedDate] = useState(availableDates[0]);
  const [selectedTheme, setSelectedTheme] = useState<ThemeNode | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<MarketCompany | null>(null);
  const [selectedPatent, setSelectedPatent] = useState<MarketPatent | null>(null);

  const themes = useMemo<ThemeNode[]>(
    () =>
      marketSignalData
        .filter((row) => row.date === selectedDate)
        .map((row) => ({
          ...row,
          id: row.theme.toLowerCase().replaceAll(" ", "-"),
          companyCount: row.companies.length
        })),
    [selectedDate]
  );

  return (
    <main className="ai-page">
      <header className="ai-page-header">
        <div>
          <h1 className="ai-page-title">Market Signal Map</h1>
          <p className="ai-page-description">
            依據指定時間點，從新聞與市場輿情中抽取高熱度題材，並連結至相關公司與其專利布局。
          </p>
        </div>

        <div className="ai-controls">
          <label className="ai-control-group">
            <span className="ai-control-label">Time Point</span>
            <select
              className="ai-control-select"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            >
              {availableDates.map((date) => (
                <option key={date}>{date}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="ai-map-layout">
        <AIGraphPanel
          nodes={themes}
          labelKey="theme"
          sizeKey="heatScore"
          categoryKey="category"
          onNodeClick={(theme) => {
            setSelectedCompany(null);
            setSelectedPatent(null);
            setSelectedTheme(theme);
          }}
          stats={[
            { label: "Themes", value: themes.length },
            {
              label: "Companies",
              value: themes.reduce((sum, theme) => sum + theme.companyCount, 0)
            }
          ]}
        />

        <aside className="ai-side-panel">
          <div className="ai-side-panel-header">
            <div className="ai-side-panel-title">Hot Themes</div>
          </div>
          <div className="ai-side-list">
            {themes.map((theme) => (
              <button
                key={theme.theme}
                className="ai-side-item"
                onClick={() => {
                  setSelectedCompany(null);
                  setSelectedPatent(null);
                  setSelectedTheme(theme);
                }}
              >
                <span className="ai-side-item-title">{theme.theme}</span>
                <span className="ai-side-item-meta">
                  Heat {theme.heatScore} / Sentiment {theme.sentimentScore}
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {selectedTheme && !selectedCompany && !selectedPatent && (
        <AIModal
          title={selectedTheme.theme}
          meta={`${selectedTheme.date} / Heat Score ${selectedTheme.heatScore} / Sentiment ${selectedTheme.sentimentScore}`}
          onClose={() => setSelectedTheme(null)}
        >
          <p className="ai-section-label">Related Companies</p>
          {selectedTheme.companies.map((company) => (
            <button
              key={company.company}
              className="ai-row-button"
              onClick={() => setSelectedCompany(company)}
            >
              {company.company} →
            </button>
          ))}
        </AIModal>
      )}

      {selectedTheme && selectedCompany && !selectedPatent && (
        <AIModal
          title={selectedCompany.company}
          meta={`Related to: ${selectedTheme.theme}`}
          onClose={() => setSelectedCompany(null)}
        >
          <p className="ai-section-label">Related Patents</p>
          {selectedCompany.patents.map((patent) => (
            <button
              key={patent.patentNo}
              className="ai-row-button"
              onClick={() => setSelectedPatent(patent)}
            >
              {patent.patentNo} →
            </button>
          ))}
        </AIModal>
      )}

      {selectedTheme && selectedCompany && selectedPatent && (
        <AIModal
          title={selectedPatent.patentNo}
          meta={`${selectedCompany.company} / ${selectedTheme.theme}`}
          onClose={() => setSelectedPatent(null)}
        >
          <p className="ai-section-label">Abstract</p>
          <div className="ai-abstract-box">{selectedPatent.abstract}</div>
        </AIModal>
      )}
    </main>
  );
}
TSX

cat > components/aipatentinsight/IndustryTrendsClient.tsx <<'TSX'
"use client";

import { useState } from "react";
import AIModal from "./AIModal";
import { articleData, type Article } from "@/lib/aipatentinsight/articleData";

export default function IndustryTrendsClient() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [featured, ...rest] = articleData;

  return (
    <main className="ai-page">
      <header className="ai-page-header">
        <div>
          <h1 className="ai-page-title">Industry Trend Briefs</h1>
          <p className="ai-page-description">
            整合專利資料、新聞題材與產業訊號，形成可閱讀的產業趨勢分析文章。
          </p>
        </div>
      </header>

      <section className="ai-article-grid">
        {[featured, ...rest].filter(Boolean).map((article, index) => (
          <article
            key={article.id}
            className={`ai-article-card ${index === 0 ? "featured" : ""}`}
            onClick={() => setSelectedArticle(article)}
          >
            <div className="ai-article-category">
              {index === 0 ? "Featured Brief" : article.category} / {article.date}
            </div>
            <h2 className="ai-article-title">{article.title}</h2>
            <p className="ai-article-summary">{article.summary}</p>
            <div className="ai-tag-row">
              {article.tags.map((tag) => (
                <span className="ai-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      {selectedArticle && (
        <AIModal
          title={selectedArticle.title}
          meta={`${selectedArticle.date} / ${selectedArticle.category} / ${selectedArticle.readingTime}`}
          onClose={() => setSelectedArticle(null)}
        >
          <p className="ai-section-label">Executive Summary</p>
          <div className="ai-abstract-box">{selectedArticle.content.executiveSummary}</div>

          <p className="ai-section-label" style={{ marginTop: 24 }}>Key Signals</p>
          {selectedArticle.content.keySignals.map((item) => (
            <div className="ai-row-button" key={item}>{item}</div>
          ))}

          <p className="ai-section-label" style={{ marginTop: 24 }}>Patent Evidence</p>
          {selectedArticle.content.patentEvidence.map((item) => (
            <div className="ai-row-button" key={item}>{item}</div>
          ))}

          <p className="ai-section-label" style={{ marginTop: 24 }}>Market Context</p>
          <div className="ai-abstract-box">{selectedArticle.content.marketContext}</div>

          <p className="ai-section-label" style={{ marginTop: 24 }}>Implications</p>
          <div className="ai-abstract-box">{selectedArticle.content.implications}</div>

          <p className="ai-section-label" style={{ marginTop: 24 }}>Related</p>
          <div className="ai-tag-row">
            {[...selectedArticle.relatedCompanies, ...selectedArticle.relatedTopics].map((item) => (
              <span className="ai-tag" key={item}>{item}</span>
            ))}
          </div>
        </AIModal>
      )}
    </main>
  );
}
TSX

echo "==> Writing App Router pages"

cat > app/page.tsx <<'TSX'
import Link from "next/link";
import AINavbar from "@/components/aipatentinsight/AINavbar";
import "./aipatentinsight.css";

export default function HomePage() {
  return (
    <div className="ai-shell">
      <AINavbar />
      <main className="ai-hero-page">
        <div className="ai-hero-orb" />
        <section className="ai-hero-content">
          <div className="ai-eyebrow">Patent Intelligence System</div>
          <h1 className="ai-hero-title">AIPatentInsight</h1>
          <p className="ai-hero-subtitle">
            從專利技術佈局，看見產業題材如何生成、擴散與演化。Mapping patent intelligence across market signals,
            companies and technology trajectories.
          </p>
          <Link href="/patent-map" className="ai-primary-button">
            Enter Insight Map
          </Link>
        </section>
      </main>
    </div>
  );
}
TSX

cat > app/patent-map/page.tsx <<'TSX'
import AINavbar from "@/components/aipatentinsight/AINavbar";
import PatentMapClient from "@/components/aipatentinsight/PatentMapClient";
import "../aipatentinsight.css";

export default function PatentMapPage() {
  return (
    <div className="ai-shell">
      <AINavbar />
      <PatentMapClient />
    </div>
  );
}
TSX

cat > app/market-signals/page.tsx <<'TSX'
import AINavbar from "@/components/aipatentinsight/AINavbar";
import MarketSignalsClient from "@/components/aipatentinsight/MarketSignalsClient";
import "../aipatentinsight.css";

export default function MarketSignalsPage() {
  return (
    <div className="ai-shell">
      <AINavbar />
      <MarketSignalsClient />
    </div>
  );
}
TSX

cat > app/industry-trends/page.tsx <<'TSX'
import AINavbar from "@/components/aipatentinsight/AINavbar";
import IndustryTrendsClient from "@/components/aipatentinsight/IndustryTrendsClient";
import "../aipatentinsight.css";

export default function IndustryTrendsPage() {
  return (
    <div className="ai-shell">
      <AINavbar />
      <IndustryTrendsClient />
    </div>
  );
}
TSX

echo "==> Build check"
npm run build

echo ""
echo "Done."
echo "Run:"
echo "  npm run dev"
