import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Patent Insight",
    short_name: "AI Patent Insight",
    description:
      "以技術演化為核心的研究平台，透過專利、產業訊號與技術結構分析，辨識主流技術、分支路徑與企業在技術地圖中的位置。",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/brand/logo-panda.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/logo-panda.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
