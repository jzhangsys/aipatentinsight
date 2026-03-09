import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SchemaScript from "@/components/SchemaScript";
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

  return {
    title: report.title,
    description: report.summary,
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

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <SchemaScript data={schemaData} />

      <div className="mb-8">
        <Link
          href="/reports"
          className="text-sm font-medium text-neutral-900 underline underline-offset-4"
        >
          返回報告列表
        </Link>
      </div>

      <article>
        <header className="max-w-3xl">
          <p className="text-sm font-medium text-neutral-500">
            {report.category}
          </p>

          <h1 className="mt-3 text-4xl font-bold leading-tight">
            {report.title}
          </h1>

          <p className="mt-6 text-lg leading-8 text-neutral-600">
            {report.summary}
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-neutral-500">
            <span>發布日期：{report.publishedAt}</span>
            <span>
              狀態：
              {report.status === "custom-only"
                ? " 目前僅接受客製預定"
                : " 已發布"}
            </span>
          </div>

          {report.coverImage ? (
            <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200">
              <img
                src={report.coverImage}
                alt={report.title}
                className="w-full object-cover"
              />
            </div>
          ) : null}
        </header>

        <section className="mt-12 space-y-12 border-t border-neutral-200 pt-12">
          {report.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-semibold">{section.heading}</h2>

              <div className="mt-5 space-y-5">
                {section.paragraphs.map((paragraph, index) => (
                  <p
                    key={`${section.heading}-${index}`}
                    className="text-base leading-8 text-neutral-700"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {section.image ? (
                <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200">
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
      </article>
    </main>
  );
}
