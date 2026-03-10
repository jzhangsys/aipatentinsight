import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "linear-gradient(135deg, #ffffff 0%, #eef4ff 55%, #ede9fe 100%)",
          color: "#0f172a",
          fontFamily: "sans-serif",
          padding: "56px 64px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 48,
            top: 48,
            width: 220,
            height: 220,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.85)",
            border: "2px solid #dbe3ef",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src="https://www.aipatentinsight.com/brand/logo-panda.png"
            width="180"
            height="180"
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#1d4ed8",
                letterSpacing: "0.08em",
              }}
            >
              PANDA INDUSTRY WATCH
            </div>

            <div
              style={{
                marginTop: 24,
                fontSize: 66,
                lineHeight: 1.08,
                fontWeight: 800,
                maxWidth: 760,
              }}
            >
              AI Patent Insight
            </div>

            <div
              style={{
                marginTop: 18,
                fontSize: 34,
                lineHeight: 1.3,
                color: "#334155",
                maxWidth: 820,
              }}
            >
              熊貓看產業｜技術演化研究平台
            </div>

            <div
              style={{
                marginTop: 28,
                fontSize: 24,
                lineHeight: 1.5,
                color: "#475569",
                maxWidth: 860,
              }}
            >
              從專利、產業訊號與技術結構，看見主流技術、分支路徑與企業位置。
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}
          >
            {["技術演化地圖", "專利研究", "產業觀察", "熊貓看產業"].map((item) => (
              <div
                key={item}
                style={{
                  border: "1px solid #dbe3ef",
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 9999,
                  padding: "10px 18px",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
