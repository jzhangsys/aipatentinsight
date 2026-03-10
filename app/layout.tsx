import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import SchemaScript from "@/components/SchemaScript";
import { siteConfig } from "@/lib/site";
import { getOrganizationSchema, getWebSiteSchema } from "@/lib/siteSchema";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "AI Patent Insight｜技術演化研究平台",
    template: "%s｜AI Patent Insight",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "AI Patent Insight",
    "技術演化",
    "專利分析",
    "產業研究",
    "技術地圖",
    "半導體",
    "AI晶片",
    "產業趨勢",
    "專利研究",
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
    title: "AI Patent Insight｜技術演化研究平台",
    description: siteConfig.description,
    locale: siteConfig.locale,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "AI Patent Insight 技術演化研究平台",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Patent Insight｜技術演化研究平台",
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
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
      <body className="bg-white text-neutral-900 antialiased">
        <SchemaScript data={organizationSchema} />
        <SchemaScript data={websiteSchema} />

        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              AI Patent Insight
            </Link>

            <nav className="hidden gap-6 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-neutral-600 transition hover:text-neutral-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {children}

        <footer className="mt-20 border-t border-neutral-200">
          <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-neutral-500">
            © AI Patent Insight. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
