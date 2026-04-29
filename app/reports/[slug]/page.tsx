import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SchemaScript from "@/components/SchemaScript";
import { getFAQSchema } from "@/lib/faqSchema";
import ReportDetailTerminal from "@/components/reports/ReportDetailTerminal";
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

  return (
    <>
      <SchemaScript data={schemaData} />
      {faqSchema ? <SchemaScript data={faqSchema} /> : null}
      <ReportDetailTerminal report={report} />
    </>
  );
}
