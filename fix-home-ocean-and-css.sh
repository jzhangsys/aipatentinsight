#!/usr/bin/env bash
set -euo pipefail

echo "==> Backup files"
mkdir -p backups
cp app/page.tsx "backups/page.tsx.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/layout.tsx "backups/layout.tsx.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/aipatentinsight.css "backups/aipatentinsight.css.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/patent-map/page.tsx "backups/patent-map-page.tsx.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/market-signals/page.tsx "backups/market-signals-page.tsx.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/industry-trends/page.tsx "backups/industry-trends-page.tsx.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

echo "==> Create ocean canvas component"

cat > components/aipatentinsight/AIHeroOcean.tsx <<'TSX'
"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  depth: number;
  alpha: number;
};

type StreamLine = {
  points: { x: number; y: number }[];
  speed: number;
  phase: number;
  alpha: number;
  width: number;
};

export default function AIHeroOcean() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const streamsRef = useRef<StreamLine[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let time = 0;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const particleCount = Math.floor(Math.min(360, Math.max(160, width * height / 5200)));
      particlesRef.current = Array.from({ length: particleCount }, () => {
        const y = rand(height * 0.18, height * 0.9);
        const depth = rand(0.25, 1);

        return {
          x: rand(-width * 0.1, width * 1.1),
          y,
          baseY: y,
          vx: rand(0.06, 0.42) * depth,
          vy: rand(-0.08, 0.08),
          size: rand(0.7, 2.6) * depth,
          phase: rand(0, Math.PI * 2),
          depth,
          alpha: rand(0.16, 0.75) * depth
        };
      });

      const streamCount = Math.floor(Math.min(34, Math.max(18, width / 58)));
      streamsRef.current = Array.from({ length: streamCount }, (_, index) => {
        const yBase = height * (0.18 + (index / streamCount) * 0.72) + rand(-40, 40);
        const pointCount = 16;
        const points = Array.from({ length: pointCount }, (_, pointIndex) => ({
          x: (pointIndex / (pointCount - 1)) * width,
          y: yBase + Math.sin(pointIndex * 0.8 + index) * rand(10, 42)
        }));

        return {
          points,
          speed: rand(0.004, 0.014),
          phase: rand(0, Math.PI * 2),
          alpha: rand(0.045, 0.16),
          width: rand(0.6, 1.8)
        };
      });
    }

    function drawBackground() {
      const gradient = context.createRadialGradient(
        width * 0.5,
        height * 0.52,
        0,
        width * 0.5,
        height * 0.55,
        Math.max(width, height) * 0.72
      );

      gradient.addColorStop(0, "#071437");
      gradient.addColorStop(0.35, "#041028");
      gradient.addColorStop(0.72, "#020711");
      gradient.addColorStop(1, "#01030a");

      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const vertical = context.createLinearGradient(0, 0, 0, height);
      vertical.addColorStop(0, "rgba(2,4,12,0.78)");
      vertical.addColorStop(0.22, "rgba(2,4,12,0.08)");
      vertical.addColorStop(0.72, "rgba(2,4,12,0.08)");
      vertical.addColorStop(1, "rgba(2,4,12,0.9)");
      context.fillStyle = vertical;
      context.fillRect(0, 0, width, height);
    }

    function drawStreams() {
      const streams = streamsRef.current;

      streams.forEach((stream, streamIndex) => {
        const offset = time * stream.speed * width;
        const mousePull = mouseRef.current.active ? (mouseRef.current.y - 0.5) * 42 : 0;

        context.beginPath();

        stream.points.forEach((point, pointIndex) => {
          const wave =
            Math.sin(pointIndex * 0.92 + stream.phase + time * 0.018 + streamIndex * 0.2) * 24 +
            Math.sin(pointIndex * 0.36 + stream.phase * 0.7 + time * 0.011) * 14;

          const x = ((point.x + offset) % (width + 160)) - 80;
          const y = point.y + wave + mousePull;

          if (pointIndex === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        });

        const lineGradient = context.createLinearGradient(0, 0, width, 0);
        lineGradient.addColorStop(0, "rgba(125,249,255,0)");
        lineGradient.addColorStop(0.25, `rgba(125,249,255,${stream.alpha})`);
        lineGradient.addColorStop(0.55, `rgba(180,220,255,${stream.alpha * 0.8})`);
        lineGradient.addColorStop(1, "rgba(125,249,255,0)");

        context.strokeStyle = lineGradient;
        context.lineWidth = stream.width;
        context.shadowColor = "rgba(125,249,255,0.22)";
        context.shadowBlur = 10;
        context.stroke();
        context.shadowBlur = 0;
      });
    }

    function drawParticles() {
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y =
          particle.baseY +
          Math.sin(time * 0.015 + particle.phase) * 18 * particle.depth +
          Math.sin(time * 0.006 + particle.phase * 1.7) * 34 * particle.depth;

        if (mouse.active) {
          const mx = mouse.x * width;
          const my = mouse.y * height;
          const dx = particle.x - mx;
          const dy = particle.y - my;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - distance / 260);

          particle.x += dx * influence * 0.006;
          particle.y += dy * influence * 0.006;
        }

        if (particle.x > width + 40) {
          particle.x = -40;
          particle.baseY = rand(height * 0.18, height * 0.9);
        }

        const pulse = 0.65 + Math.sin(time * 0.025 + particle.phase) * 0.35;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * pulse, 0, Math.PI * 2);
        context.fillStyle = `rgba(125,249,255,${particle.alpha * pulse})`;
        context.shadowColor = "rgba(125,249,255,0.55)";
        context.shadowBlur = 10 * particle.depth;
        context.fill();
        context.shadowBlur = 0;
      });
    }

    function drawConstellationLinks() {
      const particles = particlesRef.current;
      const maxLinks = Math.min(particles.length, 120);

      for (let i = 0; i < maxLinks; i += 1) {
        const a = particles[i];

        for (let j = i + 1; j < Math.min(i + 7, particles.length); j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 118) {
            const alpha = (1 - distance / 118) * 0.12;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.strokeStyle = `rgba(125,249,255,${alpha})`;
            context.lineWidth = 0.6;
            context.stroke();
          }
        }
      }
    }

    function drawRings() {
      const cx = width * (0.5 + (mouseRef.current.x - 0.5) * 0.035);
      const cy = height * (0.52 + (mouseRef.current.y - 0.5) * 0.025);

      for (let i = 0; i < 5; i += 1) {
        const radius = 150 + i * 72 + Math.sin(time * 0.01 + i) * 12;
        context.beginPath();
        context.ellipse(cx, cy, radius * 1.45, radius * 0.42, -0.08, 0, Math.PI * 2);
        context.strokeStyle = `rgba(125,249,255,${0.06 - i * 0.008})`;
        context.lineWidth = 1;
        context.stroke();
      }
    }

    function draw() {
      time += 1;

      drawBackground();
      drawStreams();
      drawConstellationLinks();
      drawParticles();
      drawRings();

      rafRef.current = window.requestAnimationFrame(draw);
    }

    function onPointerMove(event: PointerEvent) {
      mouseRef.current = {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
        active: true
      };
    }

    function onPointerLeave() {
      mouseRef.current.active = false;
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="ai-ocean-canvas" aria-hidden="true" />;
}
TSX

echo "==> Patch CSS"

cat >> app/aipatentinsight.css <<'CSS'

/* ===== Ocean hero refinement ===== */

.ai-ocean-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: block;
  z-index: 0;
  background: #02040c;
}

.ai-shell {
  position: relative;
  isolation: isolate;
}

.ai-nav {
  z-index: 20;
}

.ai-hero-page.ocean {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #02040c;
}

.ai-hero-page.ocean::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(2,4,12,0.72) 0%, rgba(2,4,12,0.08) 22%, rgba(2,4,12,0.08) 72%, rgba(2,4,12,0.82) 100%),
    linear-gradient(90deg, rgba(2,4,12,0.65) 0%, transparent 14%, transparent 86%, rgba(2,4,12,0.65) 100%);
}

.ai-hero-page.ocean::after {
  content: "";
  position: fixed;
  inset: 32px;
  z-index: 2;
  pointer-events: none;
  border: 1px solid rgba(125,249,255,0.08);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.02),
    0 0 80px rgba(125,249,255,0.03);
}

.ai-hud-corner {
  position: fixed;
  z-index: 3;
  width: 18px;
  height: 18px;
  pointer-events: none;
  border-color: rgba(125,249,255,0.35);
}

.ai-hud-corner.tl {
  top: 32px;
  left: 32px;
  border-top: 1px solid;
  border-left: 1px solid;
}

.ai-hud-corner.tr {
  top: 32px;
  right: 32px;
  border-top: 1px solid;
  border-right: 1px solid;
}

.ai-hud-corner.bl {
  bottom: 32px;
  left: 32px;
  border-bottom: 1px solid;
  border-left: 1px solid;
}

.ai-hud-corner.br {
  bottom: 32px;
  right: 32px;
  border-bottom: 1px solid;
  border-right: 1px solid;
}

.ai-hud-label {
  position: fixed;
  z-index: 3;
  pointer-events: none;
  font-size: 9px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(125,249,255,0.42);
}

.ai-hud-label.top-left {
  top: 42px;
  left: 62px;
}

.ai-hud-label.top-right {
  top: 42px;
  right: 62px;
}

.ai-hud-label.bottom-left {
  bottom: 42px;
  left: 62px;
}

.ai-hud-label.bottom-right {
  bottom: 42px;
  right: 62px;
}

.ai-hero-content.ocean-content {
  position: relative;
  z-index: 4;
  max-width: 980px;
  padding: 0 24px;
}

.ai-hero-title.ocean-title {
  color: rgba(255,255,255,0.94);
  text-shadow:
    0 0 28px rgba(125,249,255,0.16),
    0 0 72px rgba(125,249,255,0.08);
}

.ai-hero-title .ai-accent {
  color: rgba(125,249,255,0.92);
}

.ai-eyebrow.ocean-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 14px;
}

.ai-eyebrow.ocean-eyebrow::before,
.ai-eyebrow.ocean-eyebrow::after {
  content: "";
  width: 30px;
  height: 1px;
  background: rgba(125,249,255,0.28);
}

.ai-trend-line {
  margin: 24px auto 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  min-height: 22px;
  color: rgba(255,255,255,0.92);
  font-size: 12px;
  letter-spacing: 0.38em;
  text-transform: uppercase;
}

.ai-trend-line::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(125,249,255,0.9);
  box-shadow: 0 0 12px rgba(125,249,255,0.9);
}

.ai-ruler {
  margin: 56px auto 0;
  width: min(760px, 88vw);
  position: relative;
  z-index: 4;
}

.ai-ruler-date {
  font-family: var(--ai-font-futura);
  font-size: 42px;
  font-weight: 300;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.96);
  margin-bottom: 20px;
}

.ai-ruler-track {
  position: relative;
  height: 44px;
}

.ai-ruler-track::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 22px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(125,249,255,0.42), transparent);
}

.ai-ruler-points {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.ai-ruler-point {
  position: relative;
  width: 1px;
  height: 34px;
  border: 0;
  padding: 0;
  cursor: pointer;
  background: rgba(125,249,255,0.4);
}

.ai-ruler-point::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 17px;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(125,249,255,0.44);
  box-shadow: 0 0 10px rgba(125,249,255,0.36);
}

.ai-ruler-point.active {
  height: 42px;
  background: rgba(125,249,255,0.9);
}

.ai-ruler-point.active::before {
  width: 13px;
  height: 13px;
  background: rgba(125,249,255,0.95);
  box-shadow: 0 0 18px rgba(125,249,255,0.92);
}

.ai-ruler-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: rgba(255,255,255,0.35);
  font-size: 9px;
  letter-spacing: 0.14em;
}

.ai-hero-orb {
  display: none;
}

@media (max-width: 760px) {
  .ai-hud-label {
    display: none;
  }

  .ai-hero-title {
    letter-spacing: 0.12em;
  }

  .ai-ruler-date {
    font-size: 32px;
  }

  .ai-ruler-labels {
    font-size: 8px;
  }
}
CSS

echo "==> Rewrite homepage"

cat > app/page.tsx <<'TSX'
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AINavbar from "@/components/aipatentinsight/AINavbar";
import AIHeroOcean from "@/components/aipatentinsight/AIHeroOcean";

const timeline = [
  {
    date: "2023/04",
    label: "23.04",
    trend: "Generative AI Infrastructure"
  },
  {
    date: "2023/09",
    label: "23.09",
    trend: "Edge AI Deployment"
  },
  {
    date: "2024/03",
    label: "24.03",
    trend: "Advanced Packaging"
  },
  {
    date: "2024/10",
    label: "24.10",
    trend: "AI Server Supply Chain"
  },
  {
    date: "2025/03",
    label: "25.03",
    trend: "Agentic AI Applications"
  }
];

export default function HomePage() {
  const [activeIndex, setActiveIndex] = useState(2);
  const active = useMemo(() => timeline[activeIndex], [activeIndex]);

  return (
    <div className="ai-shell">
      <AIHeroOcean />
      <AINavbar />

      <main className="ai-hero-page ocean">
        <span className="ai-hud-corner tl" />
        <span className="ai-hud-corner tr" />
        <span className="ai-hud-corner bl" />
        <span className="ai-hud-corner br" />

        <span className="ai-hud-label top-left">Patent Ocean</span>
        <span className="ai-hud-label top-right">Market Signal</span>
        <span className="ai-hud-label bottom-left">2023—2025</span>
        <span className="ai-hud-label bottom-right">Insight Map</span>

        <section className="ai-hero-content ocean-content">
          <div className="ai-eyebrow ocean-eyebrow">Patent Intelligence System</div>

          <h1 className="ai-hero-title ocean-title">
            AI<span className="ai-accent">Patent</span>Insight
          </h1>

          <p className="ai-hero-subtitle">
            從專利技術佈局，看見產業題材如何生成、擴散與演化。Mapping patent intelligence across market signals,
            companies and technology trajectories.
          </p>

          <div className="ai-trend-line">{active.trend}</div>

          <section className="ai-ruler" aria-label="Industry evolution timeline">
            <div className="ai-ruler-date">{active.date}</div>
            <div className="ai-ruler-track">
              <div className="ai-ruler-points">
                {timeline.map((item, index) => (
                  <button
                    key={item.date}
                    className={`ai-ruler-point ${index === activeIndex ? "active" : ""}`}
                    aria-label={item.date}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>
            </div>
            <div className="ai-ruler-labels">
              {timeline.map((item) => (
                <span key={item.date}>{item.label}</span>
              ))}
            </div>
          </section>

          <Link href="/patent-map" className="ai-primary-button">
            Enter Insight Map
          </Link>
        </section>
      </main>
    </div>
  );
}
TSX

echo "==> Ensure CSS is globally imported in layout"

if [ ! -f app/layout.tsx ]; then
  cat > app/layout.tsx <<'TSX'
import type { Metadata } from "next";
import "./globals.css";
import "./aipatentinsight.css";

export const metadata: Metadata = {
  title: "AIPatentInsight",
  description: "Patent intelligence across market signals."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
TSX
else
  if ! grep -q './aipatentinsight.css' app/layout.tsx; then
    python3 - <<'PY'
from pathlib import Path

path = Path("app/layout.tsx")
text = path.read_text()

insert = 'import "./aipatentinsight.css";\n'

# Put it after globals.css import if present, otherwise after the last leading import.
if 'import "./globals.css";' in text:
    text = text.replace('import "./globals.css";\n', 'import "./globals.css";\n' + insert, 1)
else:
    lines = text.splitlines(True)
    idx = 0
    for i, line in enumerate(lines):
        if line.startswith("import "):
            idx = i + 1
    lines.insert(idx, insert)
    text = "".join(lines)

path.write_text(text)
PY
  fi
fi

echo "==> Remove duplicated per-page CSS imports if present"
python3 - <<'PY'
from pathlib import Path

for p in [
    Path("app/patent-map/page.tsx"),
    Path("app/market-signals/page.tsx"),
    Path("app/industry-trends/page.tsx"),
]:
    if p.exists():
        text = p.read_text()
        text = text.replace('import "../aipatentinsight.css";\n', "")
        text = text.replace('import "./aipatentinsight.css";\n', "")
        p.write_text(text)
PY

echo "==> Build check"
npm run build

echo ""
echo "Done."
echo "Next:"
echo "  npm run dev"
