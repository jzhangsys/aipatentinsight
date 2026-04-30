#!/usr/bin/env bash
set -euo pipefail

echo "==> Backup files"
mkdir -p backups
cp components/aipatentinsight/AINavbar.tsx "backups/AINavbar.tsx.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/page.tsx "backups/page.tsx.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp app/aipatentinsight.css "backups/aipatentinsight.css.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

echo "==> Checking public logo files"
mkdir -p public

LOGO_PATH=""

for f in \
  public/logo-icon.jpeg \
  public/logo-icon.jpg \
  public/logo-icon.png \
  public/logo-icon.svg \
  public/logo.jpeg \
  public/logo.jpg \
  public/logo.png \
  public/icon.jpeg \
  public/icon.jpg \
  public/icon.png
do
  if [ -f "$f" ]; then
    LOGO_PATH="$f"
    break
  fi
done

if [ -z "$LOGO_PATH" ]; then
  echo ""
  echo "WARNING: 沒有在 public/ 找到 logo 檔。"
  echo "請先把你上傳的 icon 放到："
  echo "  public/logo-icon.jpeg"
  echo ""
  echo "如果你的 icon 在 Downloads，例如 logo-icon_1.jpeg，請執行："
  echo "  cp ~/Downloads/logo-icon_1.jpeg public/logo-icon.jpeg"
  echo ""
  echo "這次會先假設路徑為 /logo-icon.jpeg。"
  LOGO_SRC="/logo-icon.jpeg"
else
  LOGO_SRC="/${LOGO_PATH#public/}"
  echo "Found logo: $LOGO_PATH"
fi

echo "Using logo src: $LOGO_SRC"

echo "==> Rewrite navbar with logo"

cat > components/aipatentinsight/AINavbar.tsx <<TSX
import Image from "next/image";
import Link from "next/link";

export default function AINavbar() {
  return (
    <nav className="ai-nav">
      <Link href="/" className="ai-logo">
        <span className="ai-logo-mark">
          <Image
            src="${LOGO_SRC}"
            alt="AIPatentInsight logo"
            width={34}
            height={34}
            priority
          />
        </span>
        <span className="ai-logo-text">AIPatentInsight</span>
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

echo "==> Add hero logo to homepage"

python3 - <<PY
from pathlib import Path

p = Path("app/page.tsx")
text = p.read_text()

# Add Image import if missing
if 'import Image from "next/image";' not in text:
    text = text.replace('import Link from "next/link";\\n', 'import Image from "next/image";\\nimport Link from "next/link";\\n')

old = '''          <div className="ai-eyebrow ocean-eyebrow">Patent Intelligence System</div>

          <h1 className="ai-hero-title ocean-title">
            AI<span className="ai-accent">Patent</span>Insight
          </h1>'''

new = '''          <div className="ai-hero-logo">
            <Image
              src="${LOGO_SRC}"
              alt="AIPatentInsight logo"
              width={88}
              height={88}
              priority
            />
          </div>

          <div className="ai-eyebrow ocean-eyebrow">Patent Intelligence System</div>

          <h1 className="ai-hero-title ocean-title">
            AI<span className="ai-accent">Patent</span>Insight
          </h1>'''

if old not in text:
    print("WARNING: 找不到預期首頁片段，可能你已經改過 page.tsx。略過 hero logo 插入。")
else:
    text = text.replace(old, new)

p.write_text(text)
PY

echo "==> Append logo CSS"

cat >> app/aipatentinsight.css <<'CSS'

/* ===== Logo integration ===== */

.ai-logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.ai-logo-mark {
  position: relative;
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgba(125,249,255,0.28);
  background:
    radial-gradient(circle at 50% 50%, rgba(125,249,255,0.18), rgba(2,4,12,0.2) 62%, rgba(2,4,12,0.72));
  box-shadow:
    0 0 18px rgba(125,249,255,0.22),
    inset 0 0 16px rgba(125,249,255,0.08);
  overflow: hidden;
}

.ai-logo-mark img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 999px;
}

.ai-logo-text {
  font-family: var(--ai-font-futura);
  letter-spacing: 0.18em;
  font-size: 15px;
  color: var(--ai-text-main);
}

.ai-hero-logo {
  width: 104px;
  height: 104px;
  margin: 0 auto 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgba(125,249,255,0.28);
  background:
    radial-gradient(circle at 50% 45%, rgba(125,249,255,0.18), rgba(2,4,12,0.16) 56%, rgba(2,4,12,0.72)),
    linear-gradient(145deg, rgba(255,255,255,0.08), rgba(125,249,255,0.03));
  box-shadow:
    0 0 28px rgba(125,249,255,0.22),
    0 0 88px rgba(125,249,255,0.10),
    inset 0 0 28px rgba(125,249,255,0.08);
  position: relative;
}

.ai-hero-logo::before {
  content: "";
  position: absolute;
  inset: -12px;
  border-radius: inherit;
  border: 1px solid rgba(125,249,255,0.12);
  box-shadow: 0 0 34px rgba(125,249,255,0.08);
}

.ai-hero-logo img {
  width: 74px;
  height: 74px;
  object-fit: contain;
  border-radius: 999px;
  filter:
    drop-shadow(0 0 10px rgba(125,249,255,0.34))
    drop-shadow(0 0 24px rgba(125,249,255,0.12));
}

@keyframes aiLogoPulse {
  0% {
    box-shadow:
      0 0 24px rgba(125,249,255,0.18),
      0 0 72px rgba(125,249,255,0.08),
      inset 0 0 24px rgba(125,249,255,0.06);
  }
  50% {
    box-shadow:
      0 0 34px rgba(125,249,255,0.32),
      0 0 104px rgba(125,249,255,0.14),
      inset 0 0 32px rgba(125,249,255,0.10);
  }
  100% {
    box-shadow:
      0 0 24px rgba(125,249,255,0.18),
      0 0 72px rgba(125,249,255,0.08),
      inset 0 0 24px rgba(125,249,255,0.06);
  }
}

.ai-hero-logo {
  animation: aiLogoPulse 7s ease-in-out infinite;
}

@media (max-width: 760px) {
  .ai-logo-text {
    display: none;
  }

  .ai-hero-logo {
    width: 88px;
    height: 88px;
    margin-bottom: 20px;
  }

  .ai-hero-logo img {
    width: 62px;
    height: 62px;
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
