#!/usr/bin/env bash
set -euo pipefail

echo "==> Backup current ocean component and css"
mkdir -p backups
cp components/aipatentinsight/AIHeroOcean.tsx "backups/AIHeroOcean.tsx.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/aipatentinsight.css "backups/aipatentinsight.css.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

echo "==> Replace AIHeroOcean with stable CSS-only layers"

cat > components/aipatentinsight/AIHeroOcean.tsx <<'TSX'
export default function AIHeroOcean() {
  return (
    <div className="ai-ocean-static" aria-hidden="true">
      <div className="ai-ocean-flow flow-a" />
      <div className="ai-ocean-flow flow-b" />
      <div className="ai-ocean-flow flow-c" />
      <div className="ai-ocean-particles" />
      <div className="ai-ocean-rings" />
    </div>
  );
}
TSX

echo "==> Append stable ocean CSS override"

cat >> app/aipatentinsight.css <<'CSS'

/* ===== Stable non-canvas ocean override ===== */

.ai-ocean-canvas {
  display: none !important;
}

.ai-ocean-static {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 58%, rgba(12, 32, 82, 0.96) 0%, rgba(4, 13, 35, 0.92) 36%, rgba(2, 5, 16, 0.98) 72%, #01030a 100%),
    linear-gradient(180deg, #02040c 0%, #06102c 45%, #01030a 100%);
}

.ai-ocean-static::before {
  content: "";
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle at 35% 42%, rgba(125,249,255,0.13), transparent 24%),
    radial-gradient(circle at 68% 55%, rgba(120,150,255,0.09), transparent 28%),
    radial-gradient(circle at 50% 80%, rgba(125,249,255,0.08), transparent 30%);
  filter: blur(8px);
}

.ai-ocean-flow {
  position: absolute;
  left: -12%;
  right: -12%;
  height: 36%;
  opacity: 0.85;
  background-repeat: repeat-x;
  background-size: 820px 100%;
  mask-image: linear-gradient(90deg, transparent, black 16%, black 84%, transparent);
}

.ai-ocean-flow::before,
.ai-ocean-flow::after {
  content: "";
  position: absolute;
  inset: 0;
  background-repeat: repeat-x;
  background-size: 820px 100%;
}

.ai-ocean-flow::before {
  background-image:
    radial-gradient(ellipse at 8% 48%, rgba(125,249,255,0.00) 0 22%, rgba(125,249,255,0.16) 23%, rgba(125,249,255,0.00) 28%),
    radial-gradient(ellipse at 24% 52%, rgba(125,249,255,0.00) 0 22%, rgba(125,249,255,0.13) 23%, rgba(125,249,255,0.00) 28%),
    radial-gradient(ellipse at 41% 46%, rgba(125,249,255,0.00) 0 22%, rgba(180,220,255,0.11) 23%, rgba(125,249,255,0.00) 28%),
    radial-gradient(ellipse at 58% 54%, rgba(125,249,255,0.00) 0 22%, rgba(125,249,255,0.14) 23%, rgba(125,249,255,0.00) 28%),
    radial-gradient(ellipse at 76% 48%, rgba(125,249,255,0.00) 0 22%, rgba(125,249,255,0.12) 23%, rgba(125,249,255,0.00) 28%);
  filter: blur(0.2px);
}

.ai-ocean-flow::after {
  background-image:
    linear-gradient(100deg, transparent 0%, rgba(125,249,255,0.00) 18%, rgba(125,249,255,0.18) 19%, transparent 21%, transparent 100%),
    linear-gradient(96deg, transparent 0%, rgba(125,249,255,0.00) 34%, rgba(180,220,255,0.15) 35%, transparent 37%, transparent 100%),
    linear-gradient(102deg, transparent 0%, rgba(125,249,255,0.00) 54%, rgba(125,249,255,0.13) 55%, transparent 58%, transparent 100%),
    linear-gradient(98deg, transparent 0%, rgba(125,249,255,0.00) 73%, rgba(125,249,255,0.12) 74%, transparent 77%, transparent 100%);
  filter: blur(0.4px);
}

.flow-a {
  top: 18%;
  transform: rotate(-4deg);
  opacity: 0.65;
}

.flow-b {
  top: 34%;
  transform: rotate(2deg) scaleY(0.88);
  opacity: 0.78;
}

.flow-c {
  top: 55%;
  transform: rotate(-2deg) scaleY(1.06);
  opacity: 0.55;
}

.ai-ocean-particles {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(125,249,255,0.72) 0 1px, transparent 1.6px),
    radial-gradient(circle, rgba(255,255,255,0.38) 0 1px, transparent 1.4px),
    radial-gradient(circle, rgba(125,249,255,0.30) 0 1px, transparent 1.5px);
  background-size: 120px 90px, 170px 130px, 230px 180px;
  background-position: 0 0, 38px 42px, 90px 60px;
  opacity: 0.58;
  mask-image: radial-gradient(ellipse at 50% 54%, black 0%, black 54%, transparent 88%);
}

.ai-ocean-rings {
  position: absolute;
  left: 50%;
  top: 55%;
  width: min(86vw, 980px);
  height: min(44vw, 420px);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(125,249,255,0.12);
  box-shadow:
    0 0 0 72px rgba(125,249,255,0.035),
    0 0 0 144px rgba(125,249,255,0.024),
    0 0 0 216px rgba(125,249,255,0.014),
    inset 0 0 80px rgba(125,249,255,0.045);
  opacity: 0.9;
}

/* 停止可能造成閃爍的動畫 */
.ai-hero-orb,
.ai-ocean-flow,
.ai-ocean-flow::before,
.ai-ocean-flow::after,
.ai-ocean-particles,
.ai-ocean-rings {
  animation: none !important;
}

CSS

echo "==> Build check"
npm run build

echo ""
echo "Done."
echo "Next:"
echo "  rm -rf .next"
echo "  npm run dev"
