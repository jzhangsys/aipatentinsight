import { NextResponse } from "next/server";
import { getAllReports, upsertReport } from "@/lib/reports-admin";
import { ReportSchema } from "@/lib/report-schema";

export async function GET() {
  const reports = await getAllReports();
  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ReportSchema.parse(body);
    const saved = await upsertReport(parsed);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 400 }
    );
  }
}
