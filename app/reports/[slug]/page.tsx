import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { reports } from "@/content/reports/reports";

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

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "報告不存在",
  };
}

export default async function ReportDetailPage(_: ReportPageProps) {
  notFound();
}
