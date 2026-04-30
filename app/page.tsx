"use client";

/**
 * 首頁 — 產業演化趨勢(對齊靜態原型 hero_8/12)
 *
 * 構成:
 *   - 背景:8 條洋流動畫(AIHeroOcean,monthProgress 受 page 控制 → 跟尺規同步)
 *   - HUD 角框 + 四角小標籤
 *   - 中央:標題「產業演化趨勢」+ 趨勢標記(色點 + 名稱) + 36 個月尺規 + 年份標籤
 *   - 自動循環:60 秒走完 36 個月
 *   - 點尺規 → 跳到該時間 + 暫停 3 秒,之後恢復自動循環
 */

import { useEffect, useRef, useState } from "react";
import AINavbar from "@/components/aipatentinsight/AINavbar";
import AIHeroOcean from "@/components/aipatentinsight/AIHeroOcean";

// 對齊 AIHeroOcean 的 8 條洋流(色 + 名)
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

// 36 個月對應(每 3 個月切一次主導,8 循環 + 取前 4 復出)
const MONTH_TO_DOMAIN: number[] = [];
for (let m = 0; m < 36; m++) {
  MONTH_TO_DOMAIN.push(Math.floor(m / 3) % 8);
}

const SECONDS_PER_MONTH = 60 / 36;

function formatDate(monthIdx: number): string {
  const year = 2023 + Math.floor(monthIdx / 12);
  const month = (monthIdx % 12) + 1;
  return `${year}.${String(month).padStart(2, "0")}`;
}

function colorToHex(c: number): string {
  return "#" + c.toString(16).padStart(6, "0").toUpperCase();
}

export default function HomePage() {
  const [monthProgress, setMonthProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rulerTrackRef = useRef<HTMLDivElement | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // === 自動循環(rAF,60 秒一輪)===
  useEffect(() => {
    if (paused) return;
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setMonthProgress((p) => {
        let next = p + dt / SECONDS_PER_MONTH;
        if (next >= 36) next = 0;
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [paused]);

  // === 衍生資料 ===
  const monthIdx = Math.min(35, Math.floor(monthProgress));
  const dominantIdx = MONTH_TO_DOMAIN[monthIdx];
  const dominant = CURRENTS[dominantIdx];
  const dateStr = formatDate(monthIdx);
  const progressPct = (monthProgress / 36) * 100;
  const trendHex = colorToHex(dominant.color);

  // === 點尺規:跳轉 + 暫停 3 秒 ===
  const onRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerTrackRef.current) return;
    const rect = rulerTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setMonthProgress(ratio * 36);
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), 3000);
  };

  // unmount 時清 timer
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

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

          <div className="ai-hero-trend" key={dominantIdx}>
            <span
              className="ai-hero-trend-marker"
              style={{ background: trendHex, color: trendHex }}
            />
            <span className="ai-hero-trend-text">{dominant.name}</span>
          </div>

          <section className="ai-hero-ruler-section" aria-label="Industry evolution timeline">
            <div className="ai-hero-ruler-date">{dateStr}</div>

            <div
              className="ai-hero-ruler-track"
              ref={rulerTrackRef}
              onClick={onRulerClick}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={36}
              aria-valuenow={monthProgress}
            >
              <div className="ai-hero-ruler-baseline" />
              <div
                className="ai-hero-ruler-fill"
                style={{ width: progressPct + "%" }}
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
                style={{ left: progressPct + "%" }}
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
