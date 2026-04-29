import fs from "fs/promises";
import path from "path";
import { ReportItem, ReportSchema } from "./report-schema";

const REPORTS_FILE = path.join(process.cwd(), "content", "reports", "reports.ts");

function escapeString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

function renderStringArray(items: string[], indent = 6): string {
  const pad = " ".repeat(indent);
  if (!items.length) return "[]";
  return `[\n${items.map((item) => `${pad}"${escapeString(item)}"`).join(",\n")}\n${" ".repeat(indent - 2)}]`;
}

function renderFAQs(faqs: ReportItem["faqs"]): string {
  if (!faqs.length) return "[]";
  return `[
${faqs
  .map(
    (faq) => `      {
        question: "${escapeString(faq.question)}",
        answer: "${escapeString(faq.answer)}"
      }`
  )
  .join(",\n")}
    ]`;
}

function renderSections(sections: ReportItem["sections"]): string {
  if (!sections.length) return "[]";
  return `[
${sections
  .map(
    (section) => `      {
        heading: "${escapeString(section.heading)}",
        paragraphs: ${renderStringArray(section.paragraphs, 10)}
      }`
  )
  .join(",\n")}
    ]`;
}

function renderReport(report: ReportItem): string {
  return `  {
    slug: "${escapeString(report.slug)}",
    title: "${escapeString(report.title)}",
    summary:
      "${escapeString(report.summary)}",
    category: "${escapeString(report.category)}",
    status: "${escapeString(report.status)}",
    coverImage: "${escapeString(report.coverImage)}",
    publishedAt: "${escapeString(report.publishedAt)}",
    aiSummary: ${renderStringArray(report.aiSummary)},
    faqs: ${renderFAQs(report.faqs)},
    sections: ${renderSections(report.sections)}
  }`;
}

function renderReportsFile(reports: ReportItem[]): string {
  return `import type { ReportItem } from "@/lib/report-schema";

export const reports: ReportItem[] = [
${reports.map(renderReport).join(",\n\n")}
];
`;
}

async function importReportsModule() {
  const source = await fs.readFile(REPORTS_FILE, "utf8");
  const reportArrayLiteral = source
    .replace(/^import type[\s\S]*?;\s*/, "")
    .replace(/export const reports: ReportItem\[] = /, "")
    .replace(/;\s*$/, "");
  const reports = Function(`"use strict"; return (${reportArrayLiteral});`)();
  return reports as ReportItem[];
}

export async function getAllReports(): Promise<ReportItem[]> {
  const reports = await importReportsModule();
  return reports.map((item) => ReportSchema.parse(item));
}

export async function getReportBySlug(slug: string): Promise<ReportItem | null> {
  const reports = await getAllReports();
  return reports.find((r) => r.slug === slug) ?? null;
}

export async function upsertReport(input: ReportItem): Promise<ReportItem> {
  const report = ReportSchema.parse(input);
  const reports = await getAllReports();
  const index = reports.findIndex((r) => r.slug === report.slug);

  if (index >= 0) {
    reports[index] = report;
  } else {
    reports.push(report);
  }

  const nextFile = renderReportsFile(reports);
  await fs.writeFile(REPORTS_FILE, nextFile, "utf8");
  return report;
}
