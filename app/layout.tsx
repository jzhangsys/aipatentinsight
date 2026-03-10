import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import SchemaScript from "@/components/SchemaScript";
import { siteConfig } from "@/lib/site";
import { getOrganizationSchema, getWebSiteSchema } from "@/lib/siteSchema";

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
        url: siteConfig.ogImage,
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
    images: [siteConfig.ogImage],
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
};

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/insights", label: "洞察 Insights" },
  { href: "/reports", label: "深度報告" },
  { href: "/api-services", label: "API 服務" },
  { href: "/about", label: "關於我們" },
  { href: "/contact", label: "聯絡我們" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = getOrganizationSchema();
  const websiteSchema = getWebSiteSchema();

  return (
    <html lang="zh-Hant">
      <body className="brand-shell text-[var(--brand-ink)] antialiased">
        <SchemaScript data={organizationSchema} />
        <SchemaScript data={websiteSchema} />

        <header className="sticky top-0 z-40 border-b border-[var(--brand-line)] bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="/brand/logo-panda.png"
                alt="AI Patent Insight 熊貓看產業"
                className="h-12 w-12 rounded-full border border-[var(--brand-line)] bg-white p-1"
              />
              <div>
                <p className="text-lg font-semibold tracking-tight text-[var(--brand-ink)]">
                  AI Patent Insight
                </p>
                <p className="text-xs font-medium text-[var(--brand-text-muted)]">
                  熊貓看產業
                </p>
              </div>
            </Link>

            <nav className="hidden gap-6 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-[var(--brand-text-soft)] transition hover:text-[var(--brand-blue)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {children}

        <footer className="mt-20 border-t border-[var(--brand-line)] bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src="/brand/logo-panda.png"
                  alt="AI Patent Insight 熊貓看產業"
                  className="h-14 w-14 rounded-full border border-[var(--brand-line)] bg-white p-1"
                />
                <div>
                  <p className="text-base font-semibold text-[var(--brand-ink)]">
                    AI Patent Insight
                  </p>
                  <p className="text-sm text-[var(--brand-text-muted)]">
                    熊貓看產業｜技術演化研究平台
                  </p>
                </div>
              </div>

              <p className="max-w-xl text-sm leading-7 text-[var(--brand-text-muted)]">
                以技術演化為核心，透過專利、產業訊號與技術結構分析，
                協助理解主流技術、分支路徑與企業在技術地圖中的位置。
              </p>
            </div>

            <div className="mt-8 border-t border-[var(--brand-line)] pt-6 text-sm text-[var(--brand-text-muted)]">
              © AI Patent Insight. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
