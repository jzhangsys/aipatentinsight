import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SchemaScript from "@/components/SchemaScript";
import { getFAQSchema } from "@/lib/faqSchema";
import Disclaimer from "@/components/content/Disclaimer";
import ResearchScope from "@/components/content/ResearchScope";
import FAQSection from "@/components/content/FAQSection";
import AISummary from "@/components/content/AISummary";
import { reports } from "@/content/reports/reports";
import { getArticleSchema, siteUrl } from "@/lib/schema";

type ReportPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return reports.map((report) => ({
    slug: report.slug,
  }));
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = reports.find((item) => item.slug === slug);

  if (!report) {
    return {
      title: "報告不存在",
    };
  }

  const canonicalUrl = `${siteUrl}/reports/${report.slug}`;
  const ogImage = report.coverImage
    ? `${siteUrl}${report.coverImage}`
    : `${siteUrl}/images/reports/ai-server-cover.jpg`;

  return {
    title: report.title,
    description: report.summary,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: report.title,
      description: report.summary,
      url: canonicalUrl,
      siteName: "AI Patent Insight",
      locale: "zh_TW",
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: report.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: report.title,
      description: report.summary,
      images: [ogImage],
    },
  };
}

export default async function ReportDetailPage({
  params,
}: ReportPageProps) {
  const { slug } = await params;
  const report = reports.find((item) => item.slug === slug);

  if (!report) {
    notFound();
  }

  const schemaData = getArticleSchema({
    title: report.title,
    description: report.summary,
    url: `${siteUrl}/reports/${report.slug}`,
    datePublished: report.publishedAt,
    image: report.coverImage ? `${siteUrl}${report.coverImage}` : undefined,
  });

  const faqSchema = report.faqs?.length ? getFAQSchema(report.faqs) : null;


  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <>
      <>
      <SchemaScript data={schemaData} />
      {faqSchema ? <SchemaScript data={faqSchema} /> : null}
      </>
      {faqSchema ? <SchemaScript data={faqSchema} /> : null}
      </>

      <div className="mb-8">
        <Link
          href="/reports"
          className="text-sm font-medium text-neutral-900 underline underline-offset-4"
        >
          返回報告列表
        </Link>
      </div>

      <article>
        {report.aiSummary?.length ? <AISummary summary={report.aiSummary} /> : null}
        <header className="max-w-3xl">
          <p className="text-sm font-medium text-[var(--brand-text-muted)]">
            {report.category}
          </p>

          <h1 className="mt-3 text-4xl font-bold leading-tight brand-title">
            {report.title}
          </h1>

          <p className="mt-6 text-lg leading-8 text-[var(--brand-text-soft)]">
            {report.summary}
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-[var(--brand-text-muted)]">
            <span>發布日期：{report.publishedAt}</span>
            <span>
              狀態：
              {report.status === "custom-only"
                ? " 目前僅接受客製預定"
                : " 已發布"}
            </span>
          </div>

          {report.coverImage ? (
            <div className="mt-8 overflow-hidden rounded-[28px] border border-[var(--brand-line)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm">
              <div className="flex items-center gap-3 border-b border-[var(--brand-line)] px-5 py-4">
                <img
                  src="/brand/logo-panda.png"
                  alt="熊貓看產業"
                  className="h-10 w-10 rounded-full border border-[var(--brand-line)] bg-white p-1"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-blue)]">
                    Panda Industry Watch
                  </p>
                  <p className="text-sm text-[var(--brand-text-muted)]">
                    AI Patent Insight 研究報告封面
                  </p>
                </div>
              </div>
              <img
                src={report.coverImage}
                alt={report.title}
                className="w-full object-cover"
              />
            </div>
          ) : null}
        </header>

        <section className="mt-12 space-y-12 border-t border-[var(--brand-line)] pt-12">
          {report.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-semibold brand-title">{section.heading}</h2>

              <div className="mt-5 space-y-5">
                {section.paragraphs.map((paragraph, index) => (
                  <p
                    key={`${section.heading}-${index}`}
                    className="text-base leading-8 text-[var(--brand-text-soft)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {section.image ? (
                <div className="mt-8 overflow-hidden rounded-[28px] border border-[var(--brand-line)] shadow-sm">
                  <img
                    src={section.image}
                    alt={section.imageAlt ?? section.heading}
                    className="w-full object-cover"
                  />
                </div>
              ) : null}
            </section>
          ))}
        </section>

        {report.faqs?.length ? <FAQSection items={report.faqs} /> : null}
        <ResearchScope />
        <Disclaimer />

      </article>
    </main>
  );
}
