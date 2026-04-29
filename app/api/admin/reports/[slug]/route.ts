import { NextResponse } from "next/server";
import { getReportBySlug, upsertReport } from "@/lib/reports-admin";
import { ReportSchema } from "@/lib/report-schema";

type Params = Promise<{ slug: string }>;

export async function GET(_: Request, context: { params: Params }) {
  const { slug } = await context.params;
  const report = await getReportBySlug(slug);

  if (!report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}

export async function PUT(req: Request, context: { params: Params }) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const parsed = ReportSchema.parse({ ...body, slug });
    const saved = await upsertReport(parsed);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 400 }
    );
  }
}
