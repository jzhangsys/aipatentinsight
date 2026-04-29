import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Jost } from "next/font/google";
import SchemaScript from "@/components/SchemaScript";
import { siteConfig } from "@/lib/site";
import { getOrganizationSchema, getWebSiteSchema } from "@/lib/siteSchema";

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "AI Patent Insight｜熊貓看產業",
    template: "%s｜AI Patent Insight",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "AI Patent Insight",
    "熊貓看產業",
    "技術演化",
    "專利分析",
    "產業研究",
    "技術地圖",
    "半導體",
    "AI晶片",
    "產業趨勢",
  ],
  authors: [{ name: "AI Patent Insight" }],
  creator: "AI Patent Insight",
  publisher: "AI Patent Insight",
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "AI Patent Insight｜熊貓看產業",
    description: siteConfig.description,
    locale: siteConfig.locale,
    images: [
      {
        url: siteConfig.url + "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI Patent Insight 熊貓看產業",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Patent Insight｜熊貓看產業",
    description: siteConfig.description,
    images: [siteConfig.url + "/twitter-image"],
    creator: "AI Patent Insight",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/brand/logo-panda.png",
    shortcut: "/brand/logo-panda.png",
    apple: "/brand/logo-panda.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = getOrganizationSchema();
  const websiteSchema = getWebSiteSchema();

  return (
    <html
      lang="zh-Hant"
      className={`${jost.variable} ${ibmPlexMono.variable}`}
    >
      <body className="brand-shell text-[var(--brand-ink)] antialiased">
        <SchemaScript data={organizationSchema} />
        <SchemaScript data={websiteSchema} />

        <header className="sticky top-0 z-40 bg-[linear-gradient(180deg,rgba(2,4,12,0.82)_0%,rgba(2,4,12,0.34)_100%)] backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/brand/logo-panda.png"
                alt="AI Patent Insight 熊貓看產業"
                className="h-10 w-10 rounded-full border border-[var(--brand-line)] bg-[var(--brand-surface)] p-1"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-normal tracking-[0.08em] text-[var(--brand-ink)]">
                  AI Patent Insight
                </p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-text-muted)]">
                  Patent Intelligence Terminal
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-text-muted)]">
              Reset State
            </span>
          </div>
        </header>

        {children}

        <footer className="border-t border-[var(--brand-line)] bg-[rgba(2,4,12,0.82)]">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex items-center justify-between gap-6 text-sm text-[var(--brand-text-muted)]">
              <span>© AI Patent Insight</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em]">All content removed</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
