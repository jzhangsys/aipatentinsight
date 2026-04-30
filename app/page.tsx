"use client";

/**
 * 首頁 — 產業演化趨勢(對齊靜態原型 hero_8/12)
 *
 * 動畫策略(避免 60fps re-render 導致閃退):
 *   - monthProgressRef:RAF 內以 ref 累積真實進度,不觸發 React re-render
 *   - cursor / fill 的 DOM 透過 ref 直接 .style 更新 → 60fps 視覺絲滑
 *   - state(monthProgress)只在每 100ms 同步一次(10fps) → 文字 / 趨勢標記 / AIHeroOcean prop 更新
 *   - AIHeroOcean 內部用 ref 接 prop,所以 10fps 就足夠驅動洋流主導切換
 */

import { useEffect, useRef, useState } from "react";
import AINavbar from "@/components/aipatentinsight/AINavbar";
import AIHeroOcean from "@/components/aipatentinsight/AIHeroOcean";

const CURRENTS: { name: string; color: number }[] = [
  { name: "矽光子",     color: 0x9DEBFF },
  { name: "AI 晶片",    color: 0x7DDFFF },
  { name: "AI Server",  color: 0x6EC4F5 },
  { name: "先進封裝",   color: 0x5FA8E8 },
  { name: "散熱模組",   color: 0x6E8FE6 },
  { name: "光學元件",   color: 0x8E7FE0 },
  { name: "半導體製程", color: 0x7FA0F0 },
  { name: "特級化學品", color: 0xA08FE5 },
];

// 36 個月 → 8 條洋流(每 3 個月切一次,8 循環 + 取前 4 復出)
const MONTH_TO_DOMAIN: number[] = [];
for (let m = 0; m < 36; m++) {
  MONTH_TO_DOMAIN.push(Math.floor(m / 3) % 8);
}

const SECONDS_PER_MONTH = 60 / 36;
const STATE_UPDATE_MS = 100; // 10 fps

function formatDate(monthIdx: number): string {
  const year = 2023 + Math.floor(monthIdx / 12);
  const month = (monthIdx % 12) + 1;
  return `${year}.${String(month).padStart(2, "0")}`;
}

function colorToHex(c: number): string {
  return "#" + c.toString(16).padStart(6, "0").toUpperCase();
}

export default function HomePage() {
  // 真實進度(0..36)放在 ref,不觸發 re-render
  const monthProgressRef = useRef(0);
  // state 只用來驅動需要 React 重繪的部分(文字、趨勢標記、AIHeroOcean prop)
  const [monthProgress, setMonthProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  // DOM refs 給 RAF 直接 style.left/width(避免 React re-render)
  const rulerTrackRef = useRef<HTMLDivElement | null>(null);
  const rulerCursorRef = useRef<HTMLDivElement | null>(null);
  const rulerFillRef = useRef<HTMLDivElement | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // === RAF 自動循環 ===
  useEffect(() => {
    if (paused) return;
    let rafId = 0;
    let last = performance.now();
    let lastStateAt = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let next = monthProgressRef.current + dt / SECONDS_PER_MONTH;
      if (next >= 36) next = 0;
      monthProgressRef.current = next;

      // DOM 直接更新游標跟填充(60fps 絲滑)
      const pct = (next / 36) * 100;
      if (rulerCursorRef.current) {
        rulerCursorRef.current.style.left = pct + "%";
      }
      if (rulerFillRef.current) {
        rulerFillRef.current.style.width = pct + "%";
      }

      // state 限頻 100ms 同步一次(讓文字 / AIHeroOcean prop 更新)
      if (now - lastStateAt > STATE_UPDATE_MS) {
        lastStateAt = now;
        setMonthProgress(next);
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [paused]);

  // unmount 時清 timer
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // === 衍生資料(基於 state,~10fps 重算) ===
  // 防禦式處理:確保 monthProgress 是有限數字,不然 fallback 0
  const safeProgress =
    typeof monthProgress === "number" && isFinite(monthProgress)
      ? monthProgress
      : 0;
  const monthIdx = Math.min(35, Math.max(0, Math.floor(safeProgress)));
  // CURRENTS / MONTH_TO_DOMAIN 是 module 常數,理論上 index 永遠 in-bounds,
  // 但用顯式 if 保證 dominant 永遠是合法物件,避免任何邊角情況
  let dominant: { name: string; color: number } = CURRENTS[0];
  const dIdx = MONTH_TO_DOMAIN[monthIdx];
  if (typeof dIdx === "number" && CURRENTS[dIdx]) {
    dominant = CURRENTS[dIdx];
  }
  const dateStr = formatDate(monthIdx);
  const trendHex = colorToHex(dominant.color);
  const initialPct = (safeProgress / 36) * 100;

  // === 點尺規:跳轉 + 暫停 3 秒 ===
  const onRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerTrackRef.current) return;
    const rect = rulerTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = ratio * 36;
    monthProgressRef.current = target;
    setMonthProgress(target);

    // 立即更新 DOM(暫停期間 RAF 不跑)
    const pct = ratio * 100;
    if (rulerCursorRef.current) rulerCursorRef.current.style.left = pct + "%";
    if (rulerFillRef.current) rulerFillRef.current.style.width = pct + "%";

    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), 3000);
  };

  return (
    <div className="ai-shell">
      <AIHeroOcean monthProgress={monthProgress} />
      <AINavbar />

      <main className="ai-hero-page ocean">
        <span className="ai-hud-corner tl" />
        <span className="ai-hud-corner tr" />
        <span className="ai-hud-corner bl" />
        <span className="ai-hud-corner br" />

        <span className="ai-hud-label top-left">Patent Ocean</span>
        <span className="ai-hud-label top-right">Industry Evolution</span>
        <span className="ai-hud-label bottom-left">2023—2025</span>
        <span className="ai-hud-label bottom-right">Insight Map</span>

        <div className="ai-hero-narrative">
          <h1 className="ai-hero-narrative-title">
            產業<span className="ai-hero-accent">演化</span>趨勢
          </h1>

          <div className="ai-hero-trend" key={dominant.name}>
            <span
              className="ai-hero-trend-marker"
              style={{ background: trendHex, color: trendHex }}
            />
            <span className="ai-hero-trend-text">{dominant.name}</span>
          </div>

          <section
            className="ai-hero-ruler-section"
            aria-label="Industry evolution timeline"
          >
            <div className="ai-hero-ruler-date">{dateStr}</div>

            <div
              className="ai-hero-ruler-track"
              ref={rulerTrackRef}
              onClick={onRulerClick}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={36}
              aria-valuenow={Math.round(monthProgress)}
            >
              <div className="ai-hero-ruler-baseline" />
              <div
                className="ai-hero-ruler-fill"
                ref={rulerFillRef}
                style={{ width: initialPct + "%" }}
              />
              <div className="ai-hero-ruler-ticks">
                {Array.from({ length: 37 }, (_, m) => {
                  const cls =
                    m % 12 === 0 ? "year" : m % 3 === 0 ? "major" : "minor";
                  return (
                    <div
                      key={m}
                      className={"ai-hero-ruler-tick " + cls}
                      style={{ left: ((m / 36) * 100) + "%" }}
                    />
                  );
                })}
              </div>
              <div
                className="ai-hero-ruler-cursor"
                ref={rulerCursorRef}
                style={{ left: initialPct + "%" }}
              />
            </div>

            <div className="ai-hero-ruler-years">
              <span>2023</span>
              <span>2024</span>
              <span>2025</span>
              <span>2026</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
