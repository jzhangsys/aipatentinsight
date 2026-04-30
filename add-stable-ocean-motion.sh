#!/usr/bin/env bash
set -euo pipefail

echo "==> Backup CSS"
mkdir -p backups
cp app/aipatentinsight.css "backups/aipatentinsight.css.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

echo "==> Append stable slow-motion ocean CSS"

cat >> app/aipatentinsight.css <<'CSS'

/* ===== Stable slow ocean motion ===== */

@keyframes aiOceanDriftA {
  0% {
    transform: translate3d(-2%, 0, 0) rotate(-4deg);
    opacity: 0.52;
  }
  50% {
    transform: translate3d(3%, 8px, 0) rotate(-3.2deg);
    opacity: 0.72;
  }
  100% {
    transform: translate3d(-2%, 0, 0) rotate(-4deg);
    opacity: 0.52;
  }
}

@keyframes aiOceanDriftB {
  0% {
    transform: translate3d(3%, 0, 0) rotate(2deg) scaleY(0.88);
    opacity: 0.62;
  }
  50% {
    transform: translate3d(-3%, -10px, 0) rotate(1.2deg) scaleY(0.92);
    opacity: 0.82;
  }
  100% {
    transform: translate3d(3%, 0, 0) rotate(2deg) scaleY(0.88);
    opacity: 0.62;
  }
}

@keyframes aiOceanDriftC {
  0% {
    transform: translate3d(-1%, 0, 0) rotate(-2deg) scaleY(1.06);
    opacity: 0.44;
  }
  50% {
    transform: translate3d(4%, 12px, 0) rotate(-1.3deg) scaleY(1);
    opacity: 0.64;
  }
  100% {
    transform: translate3d(-1%, 0, 0) rotate(-2deg) scaleY(1.06);
    opacity: 0.44;
  }
}

@keyframes aiOceanTextureSlide {
  0% {
    background-position: 0 0, 38px 42px, 90px 60px;
    opacity: 0.46;
  }
  50% {
    background-position: 32px 10px, 12px 56px, 128px 40px;
    opacity: 0.62;
  }
  100% {
    background-position: 0 0, 38px 42px, 90px 60px;
    opacity: 0.46;
  }
}

@keyframes aiOceanRingPulse {
  0% {
    transform: translate(-50%, -50%) scale(0.985);
    opacity: 0.62;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.025);
    opacity: 0.92;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.985);
    opacity: 0.62;
  }
}

@keyframes aiHeroGlowBreath {
  0% {
    text-shadow:
      0 0 22px rgba(125,249,255,0.12),
      0 0 64px rgba(125,249,255,0.06);
  }
  50% {
    text-shadow:
      0 0 36px rgba(125,249,255,0.24),
      0 0 96px rgba(125,249,255,0.11);
  }
  100% {
    text-shadow:
      0 0 22px rgba(125,249,255,0.12),
      0 0 64px rgba(125,249,255,0.06);
  }
}

@keyframes aiRulerActivePulse {
  0% {
    box-shadow:
      0 0 14px rgba(125,249,255,0.55),
      0 0 36px rgba(125,249,255,0.18);
  }
  50% {
    box-shadow:
      0 0 22px rgba(125,249,255,0.86),
      0 0 58px rgba(125,249,255,0.28);
  }
  100% {
    box-shadow:
      0 0 14px rgba(125,249,255,0.55),
      0 0 36px rgba(125,249,255,0.18);
  }
}

/* override previous animation:none safely */
.flow-a {
  animation: aiOceanDriftA 18s ease-in-out infinite !important;
  will-change: transform, opacity;
}

.flow-b {
  animation: aiOceanDriftB 24s ease-in-out infinite !important;
  will-change: transform, opacity;
}

.flow-c {
  animation: aiOceanDriftC 30s ease-in-out infinite !important;
  will-change: transform, opacity;
}

.ai-ocean-particles {
  animation: aiOceanTextureSlide 28s ease-in-out infinite !important;
  will-change: background-position, opacity;
}

.ai-ocean-rings {
  animation: aiOceanRingPulse 16s ease-in-out infinite !important;
  will-change: transform, opacity;
}

.ai-hero-title.ocean-title {
  animation: aiHeroGlowBreath 8s ease-in-out infinite;
}

.ai-ruler-point.active::before {
  animation: aiRulerActivePulse 2.8s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .flow-a,
  .flow-b,
  .flow-c,
  .ai-ocean-particles,
  .ai-ocean-rings,
  .ai-hero-title.ocean-title,
  .ai-ruler-point.active::before {
    animation: none !important;
  }
}

CSS

echo "==> Build check"
npm run build

echo ""
echo "Done."
echo "Next:"
echo "  rm -rf .next"
echo "  npm run dev"
