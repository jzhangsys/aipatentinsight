import "./globals.css";
import "./aipatentinsight.css";
import type { Metadata, Viewport } from "next";

// === SEO / Social metadata ===
// 正式網域為 www.aipatentinsight.com(Vercel 已設 aipatentinsight.com 307 → www)。
// 若有需要在 staging / preview 用其他網域,可在 Vercel 設 NEXT_PUBLIC_SITE_URL 覆蓋。
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.aipatentinsight.com";

const SITE_NAME = "AIPatentInsight";
const SITE_TITLE = "AIPatentInsight — 專利情報視覺化平台";
const SITE_DESCRIPTION =
  "從專利技術佈局，看見產業題材如何生成、擴散與演化。Mapping patent intelligence across market signals, companies and technology trajectories.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    template: "%s | " + SITE_NAME,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "patent intelligence",
    "patent map",
    "AI patent",
    "semiconductor",
    "technology trends",
    "industry analysis",
    "專利情報",
    "專利圖譜",
    "技術趨勢",
    "產業分析",
    "半導體",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo-icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/favicon-180.png", sizes: "180x180" },
    shortcut: "/favicon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "zh_TW",
    alternateLocale: ["en_US"],
    url: siteUrl,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#02040C",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
