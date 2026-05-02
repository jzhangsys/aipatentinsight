"use client";

/**
 * IndustryConceptC — Tide Pool(潮間帶)
 *
 * 上層:類別洋流(同 Concept A 但 dim 一些當背景)
 * 中層:每個 snapshot 浮 N 個公司「泡泡」,大小 = totalPatents,
 *       穩健公司 = 大且不透明,曇花 = 小或半透明
 * 下層:衰退 cat 沉澱到底
 *
 * 多層次資訊密度高,適合「全貌一眼看」。
 */

import { useEffect, useMemo, useRef, useState } from "react";

type AggregateData = {
  dates: string[];
  categories: string[];
  companies: { name: string; stockCode: string }[];
  catMatrix: number[][];
  companyMatrix: number[][];
  metrics: {
    cat: Record<string, { persistence: number; slope: number; flash: number; total: number }>;
    company: Record<string, { name: string; stockCode: string; persistence: number; slope: number; flash: number; total: number }>;
  };
};

type Props = { data: AggregateData };

const MARGIN = { top: 30, right: 80, bottom: 40, left: 8 };
const HEIGHT = 540;

export default function IndustryConceptC({ data }: Props) {
  const [range, setRange] = useState<[number, number]>([0, data.dates.length - 1]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const onResize = () => {
      if (svgRef.current?.parentElement) {
        setWidth(svgRef.current.parentElement.clientWidth);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [start, end] = range;
  const segLen = end - start + 1;
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  // === 上層:cat 洋流(top 12)===
  const topCats = useMemo(() => {
    const arr = data.categories.map((c) => ({
      key: c,
      total: data.metrics.cat[c]?.total || 0,
      slope: data.metrics.cat[c]?.slope || 0,
      persistence: data.metrics.cat[c]?.persistence || 0,
    }));
    return arr.sort((a, b) => b.total - a.total).slice(0, 12);
  }, [data]);

  const catStreams = useMemo(() => {
    const N = topCats.length;
    const bandH = (innerH * 0.65) / N; // 上 65% 給 cat streams
    return topCats.map((c, i) => {
      const yCenter = i * bandH + bandH / 2;
      const idx = data.categories.indexOf(c.key);
      const seg = data.catMatrix.slice(start, end + 1).map((row) => row[idx] || 0);
      const maxV = Math.max(...seg, 1);
      const xStep = innerW / Math.max(1, segLen - 1);
      const points = seg.map((v, j) => ({
        x: j * xStep,
        halfW: (v / maxV) * (bandH * 0.42),
      }));
      const top = points.map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${yCenter - p.halfW}`).join(" ");
      const bot = points.slice().reverse().map((p) => `L ${p.x} ${yCenter + p.halfW}`).join(" ");
      const color = c.slope > 0 ? "#4ade80" : c.slope < 0 ? "#fb7185" : "#94a3b8";
      const opacity = 0.18 + c.persistence * 0.32; // 較淡(背景層)
      return {
        key: c.key,
        path: top + " " + bot + " Z",
        color,
        opacity,
        labelY: yCenter,
        label: c.key,
      };
    });
  }, [topCats, data, start, end, innerH, innerW, segLen]);

  // === 中層:每期 top company 泡泡 ===
  const TOP_COMPANIES_PER_SNAPSHOT = 6;
  const bubbles = useMemo(() => {
    const result: {
      x: number;
      y: number;
      r: number;
      label: string;
      stockCode: string;
      persistence: number;
      flash: number;
    }[] = [];
    const xStep = innerW / Math.max(1, segLen - 1);
    const yBase = innerH * 0.78; // 泡泡帶在中下
    const yJitterRange = innerH * 0.15;

    for (let i = 0; i < segLen; i++) {
      const t = start + i;
      const row = data.companyMatrix[t];
      // 找該期 top N 公司
      const topIdx = row
        .map((v, j) => ({ v, j }))
        .filter((x) => x.v > 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, TOP_COMPANIES_PER_SNAPSHOT);

      const maxV = topIdx[0]?.v || 1;
      topIdx.forEach((entry, k) => {
        const c = data.companies[entry.j];
        const m = data.metrics.company[c.stockCode];
        const r = 4 + Math.sqrt(entry.v / maxV) * 14;
        // y 偏移:穩健的浮上(高 persistence → y 小,接近泡泡帶上方);曇花的偏下
        const yOffset = -m.persistence * yJitterRange + (1 - m.persistence) * yJitterRange * 0.3;
        // 同一期多家公司用 k 微微錯開避免重疊
        const xOffset = (k - (topIdx.length - 1) / 2) * (xStep * 0.05);
        result.push({
          x: i * xStep + xOffset,
          y: yBase + yOffset + (k % 2 === 0 ? -3 : 3),
          r,
          label: c.name,
          stockCode: c.stockCode,
          persistence: m.persistence,
          flash: m.flash,
        });
      });
    }
    return result;
  }, [start, end, segLen, innerW, innerH, data]);

  return (
    <div className="ai-concept-c">
      <div className="ai-concept-toolbar">
        <span className="ai-concept-title-inline">類別洋流(上)+ 公司泡泡(下)</span>
        <div className="ai-concept-range">
          <span className="ai-concept-range-label">範圍</span>
          <span className="ai-concept-range-date">{data.dates[start]}</span>
          <input
            type="range"
            min={0}
            max={data.dates.length - 1}
            value={start}
            onChange={(e) => {
              const v = +e.target.value;
              setRange(([, e2]) => [Math.min(v, e2), e2]);
            }}
          />
          <input
            type="range"
            min={0}
            max={data.dates.length - 1}
            value={end}
            onChange={(e) => {
              const v = +e.target.value;
              setRange(([s]) => [s, Math.max(v, s)]);
            }}
          />
          <span className="ai-concept-range-date">{data.dates[end]}</span>
        </div>
      </div>

      <div className="ai-concept-chart">
        <svg ref={svgRef} width={width} height={HEIGHT}>
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            {/* time grid */}
            {Array.from({ length: segLen }, (_, j) => {
              const x = (j * innerW) / Math.max(1, segLen - 1);
              return (
                <g key={j}>
                  <line x1={x} y1={0} x2={x} y2={innerH} stroke="rgba(125,249,255,0.04)" />
                  <text
                    x={x}
                    y={-8}
                    fontSize={9}
                    fill="rgba(125,249,255,0.5)"
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {data.dates[start + j].slice(2).replace(/-/g, "/")}
                  </text>
                </g>
              );
            })}
            {/* 上層:cat 洋流 */}
            {catStreams.map((s) => (
              <g key={s.key}>
                <path d={s.path} fill={s.color} opacity={s.opacity} />
                <text
                  x={innerW + 4}
                  y={s.labelY + 3}
                  fontSize={9}
                  fill="rgba(255,255,255,0.5)"
                  fontFamily="Manrope, system-ui"
                >
                  {s.label.length > 8 ? s.label.slice(0, 8) + "…" : s.label}
                </text>
              </g>
            ))}
            {/* 中層:公司泡泡 */}
            {bubbles.map((b, i) => (
              <g key={i}>
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.r}
                  fill={b.flash > 0.6 ? "rgba(252,165,165,0.55)" : "rgba(125,249,255,0.65)"}
                  stroke={b.flash > 0.6 ? "rgba(252,165,165,0.9)" : "rgba(125,249,255,0.9)"}
                  strokeWidth={1}
                  opacity={0.35 + b.persistence * 0.5}
                />
                {b.r > 8 && (
                  <text
                    x={b.x}
                    y={b.y + b.r + 9}
                    fontSize={8}
                    fill="rgba(255,255,255,0.7)"
                    textAnchor="middle"
                    fontFamily="Manrope, system-ui"
                  >
                    {b.label.length > 5 ? b.label.slice(0, 5) + "…" : b.label}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>

      <div className="ai-concept-legend">
        <span className="legend-item">上層 = 類別洋流</span>
        <span className="legend-item">下層 = 公司泡泡(大小=該期 patent)</span>
        <span className="legend-item">青 = 穩健 / 粉 = 曇花</span>
        <span className="legend-item">愈不透明 = 持續性愈高</span>
      </div>
    </div>
  );
}
