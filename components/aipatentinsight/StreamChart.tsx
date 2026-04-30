"use client";

/**
 * StreamChart — D3 stream graph(SVG)
 *
 * 用 d3.stack + d3.stackOffsetSilhouette 把 17 個 category 在每月的專利數
 * 堆疊成「河道」式的雙向對稱圖,中央排排當期主題、兩側依序排衰退/新興。
 * d3.curveBasis 讓邊緣平滑,呼應「洋流」主題。
 *
 * Hover 任一 stream:該 cat 不變,其他降到 0.15 透明度;tooltip 顯示 cat + 累計數。
 * 點 stream:觸發 onCategoryClick(cat)。
 */

import { useMemo, useState } from "react";
import * as d3 from "d3";

type DataRow = Record<string, number | string>;

type Props = {
  months: string[];
  /** stream 排序順序 — 中央 = 第一個,所以建議依「當期主流」排前 */
  categories: string[];
  /** matrix[i] = { _month: months[i], [cat]: count, ... } */
  data: DataRow[];
  /** category → hex */
  palette: Record<string, string>;
  /** 點 stream 時觸發 */
  onCategoryClick?: (cat: string) => void;
};

const W = 1200;
const H = 480;
const PAD_X = 60;
const PAD_Y = 24;

export default function StreamChart({
  months,
  categories,
  data,
  palette,
  onCategoryClick,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  // === Build stack ===
  const series = useMemo(() => {
    if (data.length === 0 || categories.length === 0) return [];
    const stack = d3
      .stack<DataRow, string>()
      .keys(categories)
      .value((d, key) => Number(d[key]) || 0)
      .offset(d3.stackOffsetSilhouette)
      .order(d3.stackOrderInsideOut);
    return stack(data);
  }, [data, categories]);

  // === Y scale 範圍 ===
  const { yMin, yMax } = useMemo(() => {
    let mn = Infinity;
    let mx = -Infinity;
    for (const layer of series) {
      for (const point of layer) {
        if (point[0] < mn) mn = point[0];
        if (point[1] > mx) mx = point[1];
      }
    }
    if (mn === Infinity) {
      mn = -1;
      mx = 1;
    }
    return { yMin: mn, yMax: mx };
  }, [series]);

  const xScale = (i: number) => {
    if (months.length <= 1) return W / 2;
    return PAD_X + (i / (months.length - 1)) * (W - 2 * PAD_X);
  };
  const yScale = (v: number) => {
    if (yMax === yMin) return H / 2;
    return PAD_Y + ((yMax - v) / (yMax - yMin)) * (H - 2 * PAD_Y);
  };

  // d3.area generator
  const areaGen = useMemo(
    () =>
      d3
        .area<d3.SeriesPoint<DataRow>>()
        .x((_d, i) => xScale(i))
        .y0((d) => yScale(d[0]))
        .y1((d) => yScale(d[1]))
        .curve(d3.curveBasis),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [months, yMin, yMax]
  );

  // 月份 X 軸標籤(只顯示 ~8 個避免擁擠)
  const labelStep = Math.max(1, Math.floor(months.length / 8));

  // 累計總和 — 給 tooltip 用
  const catTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const cat of categories) totals[cat] = 0;
    for (const row of data) {
      for (const cat of categories) {
        totals[cat] += Number(row[cat]) || 0;
      }
    }
    return totals;
  }, [data, categories]);

  return (
    <div
      className="ai-trends-stream-wrapper"
      onMouseLeave={() => setHovered(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="ai-trends-stream-svg"
        role="img"
        aria-label="Industry trend river chart"
      >
        {/* 中軸基準線(silhouette 對稱) */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={H / 2}
          y2={H / 2}
          stroke="rgba(125,249,255,0.06)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />

        {/* Streams */}
        {series.map((layer) => {
          const cat = layer.key as string;
          const isHovered = hovered === cat;
          const isDim = hovered !== null && !isHovered;
          const color = palette[cat] || "#7DF9FF";
          const d = areaGen(layer) || "";

          return (
            <path
              key={cat}
              d={d}
              fill={color}
              opacity={isDim ? 0.12 : isHovered ? 0.95 : 0.7}
              stroke={isHovered ? "rgba(255,255,255,0.4)" : "none"}
              strokeWidth={isHovered ? 1.5 : 0}
              onMouseEnter={() => setHovered(cat)}
              onClick={() => onCategoryClick?.(cat)}
              style={{
                cursor: "pointer",
                transition: "opacity 0.18s ease, stroke-width 0.18s ease",
              }}
            />
          );
        })}

        {/* X axis labels */}
        {months.map((m, i) => {
          if (i % labelStep !== 0 && i !== months.length - 1) return null;
          return (
            <text
              key={m}
              x={xScale(i)}
              y={H - 6}
              fill="rgba(255,255,255,0.4)"
              fontSize={10}
              fontFamily="JetBrains Mono, Courier New, monospace"
              textAnchor="middle"
              style={{ letterSpacing: "0.05em" }}
            >
              {m.replace("-", "/")}
            </text>
          );
        })}
      </svg>

      {/* Hover tooltip(SVG 旁邊絕對定位) */}
      {hovered && (
        <div className="ai-trends-stream-tooltip">
          <div className="ai-trends-stream-tooltip-dot" style={{ background: palette[hovered] }} />
          <div className="ai-trends-stream-tooltip-text">
            <div className="ai-trends-stream-tooltip-cat">{hovered}</div>
            <div className="ai-trends-stream-tooltip-total">
              {catTotals[hovered] || 0} patents · cumulative
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
