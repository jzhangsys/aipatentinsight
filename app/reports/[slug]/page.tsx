import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SchemaScript from "@/components/SchemaScript";
import { getFAQSchema } from "@/lib/faqSchema";
import Disclaimer from "@/components/content/Disclaimer";
import ResearchScope from "@/components/content/ResearchScope";
import FAQSection from "@/components/content/FAQSection";
import AISummary from "@/components/content/AISummary";
import TerminalPage from "@/components/terminal/TerminalPage";
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

export default async function ReportDetailPage({ params }: ReportPageProps) {
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
  const factCards = [
    { label: "Category", value: report.category },
    { label: "Status", value: report.status === "custom-only" ? "Custom only" : "Published" },
    { label: "Published", value: report.publishedAt },
    { label: "Sections", value: String(report.sections.length).padStart(2, "0") },
  ];

  return (
    <TerminalPage
      eyebrow={report.category}
      title={report.title}
      description={report.summary}
      stats={factCards}
    >
      <SchemaScript data={schemaData} />
      {faqSchema ? <SchemaScript data={faqSchema} /> : null}

      <div className="mb-6">
        <Link href="/reports" className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--brand-text-soft)] hover:text-white">
          ← 返回報告列表
        </Link>
      </div>

      <article>
        {report.coverImage ? (
          <section className="mb-10 overflow-hidden rounded-[8px] border border-[var(--brand-line)]">
            <img src={report.coverImage} alt={report.title} className="max-h-[520px] w-full object-cover" />
          </section>
        ) : null}

        {report.aiSummary?.length ? <AISummary summary={report.aiSummary} /> : null}

        <section className="mt-10 grid gap-6 xl:grid-cols-[0.3fr_0.7fr]">
          <aside className="h-fit rounded-[8px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.03)] p-5 xl:sticky xl:top-32">
            <p className="brand-panel-label">Reading Map</p>
            <div className="mt-5 space-y-3">
              {report.sections.map((section, index) => (
                <a
                  key={section.heading}
                  href={`#section-${index + 1}`}
                  className="block rounded-[6px] border border-[var(--brand-line)] bg-[rgba(3,5,15,0.66)] px-4 py-3 text-sm text-[var(--brand-text-soft)] transition hover:border-[var(--brand-line-strong)] hover:text-white"
                >
                  <span className="brand-data mr-2 text-[var(--brand-blue)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </a>
              ))}
            </div>
          </aside>

          <div className="space-y-6">
            {report.sections.map((section, index) => (
              <section
                id={`section-${index + 1}`}
                key={section.heading}
                className="rounded-[8px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.03)] p-6"
              >
                <div className="flex items-start gap-4">
                  <span className="brand-data rounded-[4px] border border-[var(--brand-line)] bg-[rgba(3,5,15,0.72)] px-3 py-1 text-sm text-[var(--brand-blue)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-light tracking-[0.06em] text-white">{section.heading}</h2>
                    <div className="mt-5 space-y-5">
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p
                          key={`${section.heading}-${paragraphIndex}`}
                          className="text-base leading-8 text-[var(--brand-text-soft)]"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {section.image ? (
                  <div className="mt-8 overflow-hidden rounded-[6px] border border-[var(--brand-line)]">
                    <img
                      src={section.image}
                      alt={section.imageAlt ?? section.heading}
                      className="w-full object-cover"
                    />
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </section>

        {report.faqs?.length ? <FAQSection items={report.faqs} /> : null}
        <ResearchScope />
        <Disclaimer />
      </article>
    </TerminalPage>
  );
}
