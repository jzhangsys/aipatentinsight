"use client";

import { useMemo, useState } from "react";
import type { ReportItem } from "@/content/reports/reports";

type ReportDetailTerminalProps = {
  report: ReportItem;
};

type ContentMode = "all" | "text" | "visual";
type LayoutMode = "grid" | "focus";
type SortMode = "default" | "length" | "media";

type SectionNode = {
  heading: string;
  x: number;
  y: number;
  radius: number;
  paragraphs: string[];
  image?: string;
  imageAlt?: string;
  wordCount: number;
};

function buildNodes(report: ReportItem, layout: LayoutMode, sortMode: SortMode): SectionNode[] {
  const sections = [...report.sections];

  if (sortMode === "length") {
    sections.sort((a, b) => b.paragraphs.join("").length - a.paragraphs.join("").length);
  } else if (sortMode === "media") {
    sections.sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)));
  }

  const columns = layout === "grid" ? 3 : 2;
  const xPositions = layout === "grid" ? [160, 420, 680] : [240, 600];
  const nodes = sections.map((section, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const baseX = xPositions[column] ?? 420;
    const baseY = 160 + row * (layout === "grid" ? 120 : 146);
    const radius = Math.min(30, 14 + Math.sqrt(section.paragraphs.join("").length / 18));
    return {
      heading: section.heading,
      x: baseX + (layout === "focus" && column === 1 ? 48 : 0),
      y: baseY + (layout === "focus" ? (column % 2 === 0 ? -18 : 18) : 0),
      radius,
      paragraphs: section.paragraphs,
      image: section.image,
      imageAlt: section.imageAlt,
      wordCount: section.paragraphs.join(" ").length,
    };
  });

  return nodes;
}

export default function ReportDetailTerminal({ report }: ReportDetailTerminalProps) {
  const [contentMode, setContentMode] = useState<ContentMode>("all");
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [activeHeading, setActiveHeading] = useState<string | null>(report.sections[0]?.heading ?? null);
  const [search, setSearch] = useState("");
  const [modalSectionHeading, setModalSectionHeading] = useState<string | null>(null);
  const [modalParagraph, setModalParagraph] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return report.sections.filter((section) => {
      if (contentMode === "text" && section.image) return false;
      if (contentMode === "visual" && !section.image) return false;
      if (!keyword) return true;
      return (
        section.heading.toLowerCase().includes(keyword) ||
        section.paragraphs.some((paragraph) => paragraph.toLowerCase().includes(keyword))
      );
    });
  }, [contentMode, report.sections, search]);

  const nodes = useMemo(() => {
    const subset: ReportItem = { ...report, sections: filteredSections };
    return buildNodes(subset, layout, sortMode);
  }, [filteredSections, layout, report, sortMode]);

  const visibleNodes = nodes.length ? nodes : buildNodes(report, layout, sortMode);
  const activeNode =
    visibleNodes.find((node) => node.heading === activeHeading) ?? visibleNodes[0] ?? null;
  const modalSection =
    visibleNodes.find((node) => node.heading === modalSectionHeading) ??
    report.sections.find((section) => section.heading === modalSectionHeading) ??
    null;
  const modalWordCount = modalSection ? modalSection.paragraphs.join(" ").length : 0;

  return (
    <main className="px-0 pb-0 pt-0">
      <section className="brand-vignette relative min-h-[calc(100vh-84px)] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,rgba(6,10,28,0.88)_0%,rgba(3,5,15,0.96)_58%,rgba(1,3,10,1)_100%)]" />
          <div className="brand-grid absolute inset-x-[10%] top-[16%] h-[62%] rounded-[18px] border border-[rgba(125,249,255,0.05)] opacity-40" />
        </div>

        <div className="relative mx-auto max-w-[1600px] px-6 pb-8 pt-8 md:px-8">
          <div className="flex justify-center">
            <div className="brand-card brand-glow inline-flex flex-wrap items-end gap-5 rounded-[8px] px-5 py-4">
              <div className="flex flex-col gap-2">
                <span className="brand-panel-label">Content</span>
                <div className="flex gap-2">
                  {(["all", "text", "visual"] as ContentMode[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setContentMode(value)}
                      className={`px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
                        contentMode === value
                          ? "border border-[var(--brand-line-strong)] bg-[rgba(125,249,255,0.08)] text-[var(--brand-blue)]"
                          : "border border-[var(--brand-line)] text-[var(--brand-text-muted)]"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="brand-panel-label">Layout</span>
                <div className="flex gap-2">
                  {(["grid", "focus"] as LayoutMode[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLayout(value)}
                      className={`px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
                        layout === value
                          ? "border border-[var(--brand-line-strong)] bg-[rgba(125,249,255,0.08)] text-[var(--brand-blue)]"
                          : "border border-[var(--brand-line)] text-[var(--brand-text-muted)]"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="brand-panel-label">Sort</span>
                <div className="flex gap-2">
                  {(["default", "length", "media"] as SortMode[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSortMode(value)}
                      className={`px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
                        sortMode === value
                          ? "border border-[var(--brand-line-strong)] bg-[rgba(125,249,255,0.08)] text-[var(--brand-blue)]"
                          : "border border-[var(--brand-line)] text-[var(--brand-text-muted)]"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute right-8 top-10 hidden text-right lg:block">
            <h1 className="text-[28px] font-light tracking-[0.16em] text-white">REPORT</h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-text-muted)]">
              {report.category} · {report.publishedAt}
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[300px_1fr_340px]">
            <aside className="brand-card h-fit rounded-[8px] p-4">
              <p className="brand-panel-label">Sections · 點選聚焦</p>
              <div className="mt-4 space-y-2">
                {visibleNodes.map((node, index) => {
                  const isActive = node.heading === activeNode?.heading;
                  return (
                    <button
                      key={node.heading}
                      type="button"
                      onClick={() => setActiveHeading(node.heading)}
                      className={`flex w-full items-center gap-3 rounded-[4px] border px-2 py-2 text-left transition ${
                        isActive
                          ? "border-[var(--brand-line-strong)] bg-[rgba(125,249,255,0.1)]"
                          : "border-transparent hover:border-[var(--brand-line)] hover:bg-[rgba(125,249,255,0.04)]"
                      }`}
                    >
                      <span className="brand-data text-[10px] text-[var(--brand-blue)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.74)]">
                        {node.heading}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="brand-card relative overflow-hidden rounded-[8px] p-4">
              <div className="mb-4 border-b border-[var(--brand-line)] pb-4">
                <p className="brand-panel-label">Analysis Field</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-light tracking-[0.08em] text-white md:text-5xl">
                  {report.title}
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--brand-text-soft)]">
                  {report.summary}
                </p>
              </div>

              <svg viewBox="0 0 840 560" className="h-[520px] w-full" role="img" aria-label="Report section map">
                {visibleNodes.map((node, index) => {
                  const next = visibleNodes[index + 1];
                  if (!next) return null;
                  return (
                    <line
                      key={`${node.heading}-${next.heading}`}
                      x1={node.x}
                      y1={node.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="rgba(125,249,255,0.16)"
                      strokeWidth="1"
                    />
                  );
                })}

                {visibleNodes.map((node, index) => {
                  const isActive = node.heading === activeNode?.heading;
                  return (
                    <g key={node.heading}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius + (isActive ? 10 : 0)}
                        fill="transparent"
                        stroke={isActive ? "rgba(125,249,255,0.36)" : "transparent"}
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius}
                        fill={node.image ? "rgba(125,249,255,0.9)" : "rgba(138,180,255,0.86)"}
                        onClick={() => setActiveHeading(node.heading)}
                        style={{ cursor: "pointer" }}
                      />
                      <text
                        x={node.x}
                        y={node.y - node.radius - 16}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.92)"
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.12em",
                        }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + node.radius + 20}
                        textAnchor="middle"
                        fill={isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.62)"}
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {node.heading.length > 18 ? `${node.heading.slice(0, 18)}…` : node.heading}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <aside className="brand-card flex max-h-[calc(100vh-220px)] flex-col rounded-[8px] p-0">
              <div className="flex items-center justify-between border-b border-[var(--brand-line)] px-4 py-3">
                <p className="brand-panel-label">Report Modules</p>
                <span className="font-mono text-[9px] text-[var(--brand-text-muted)]">
                  {visibleNodes.length}
                </span>
              </div>
              <div className="border-b border-[var(--brand-line)] px-4 py-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜尋章節..."
                  className="w-full rounded-[4px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.04)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--brand-text-muted)]"
                />
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {visibleNodes.map((node) => {
                  const isActive = node.heading === activeNode?.heading;
                  return (
                    <button
                      key={node.heading}
                      type="button"
                      onClick={() => setActiveHeading(node.heading)}
                      className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition ${
                        isActive
                          ? "border-[var(--brand-blue)] bg-[rgba(125,249,255,0.08)]"
                          : "border-transparent hover:border-[var(--brand-blue)] hover:bg-[rgba(125,249,255,0.05)]"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-[var(--brand-blue)] shadow-[0_0_8px_rgba(125,249,255,0.82)]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{node.heading}</p>
                        <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[var(--brand-text-muted)]">
                          {node.paragraphs.length} paragraphs · {node.image ? "visual" : "text"}
                        </p>
                      </div>
                      <span className="brand-data text-[10px] text-[var(--brand-blue)]">
                        {node.wordCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.76fr_0.24fr]">
            <section className="brand-card rounded-[8px] p-6">
              <p className="brand-panel-label">Section Focus</p>
              {activeNode ? (
                <>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <h3 className="text-2xl font-light tracking-[0.06em] text-white">
                      {activeNode.heading}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setModalSectionHeading(activeNode.heading)}
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--brand-blue)]"
                    >
                      Open Detail →
                    </button>
                  </div>
                  <div className="mt-5 space-y-4">
                    {activeNode.paragraphs.slice(0, 2).map((paragraph, index) => (
                      <p key={index} className="text-base leading-8 text-[var(--brand-text-soft)]">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--brand-text-soft)]">No section available.</p>
              )}
            </section>

            <div className="brand-card flex gap-6 rounded-[8px] px-5 py-4">
              <div>
                <p className="brand-panel-label">Sections</p>
                <p className="mt-2 text-xl font-light text-white brand-data">{report.sections.length}</p>
              </div>
              <div>
                <p className="brand-panel-label">FAQ</p>
                <p className="mt-2 text-xl font-light text-white brand-data">{report.faqs?.length ?? 0}</p>
              </div>
              <div>
                <p className="brand-panel-label">Status</p>
                <p className="mt-2 text-xl font-light text-white brand-data">
                  {report.status === "custom-only" ? "Custom" : "Live"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {modalSection ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,4,12,0.72)] px-5 py-10 backdrop-blur-sm"
          onClick={() => {
            setModalSectionHeading(null);
            setModalParagraph(null);
          }}
        >
          <div
            className="max-h-[82vh] w-full max-w-4xl overflow-hidden rounded-[8px] border border-[rgba(125,249,255,0.25)] bg-[linear-gradient(145deg,#060A1C_0%,#03050F_100%)] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-6 border-b border-[var(--brand-line)] px-7 py-6">
              <div className="min-w-0">
                <h2 className="text-3xl font-light tracking-[0.04em] text-white">{modalSection.heading}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-[3px] border border-[var(--brand-line)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--brand-blue)]">
                    {report.category}
                  </span>
                  <span className="rounded-[3px] border border-[var(--brand-line)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--brand-text-soft)]">
                    {modalSection.paragraphs.length} paragraphs
                  </span>
                  {modalSection.image ? (
                    <span className="rounded-[3px] border border-[var(--brand-line)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--brand-text-soft)]">
                      visual attached
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalSectionHeading(null);
                  setModalParagraph(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(82vh-100px)] overflow-y-auto px-7 py-6">
              <div className="brand-panel-label">// Overview</div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">
                    Word Count
                  </p>
                  <p className="mt-2 text-lg font-light text-white brand-data">{modalWordCount}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">
                    Published
                  </p>
                  <p className="mt-2 text-lg font-light text-white brand-data">{report.publishedAt}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">
                    Visual
                  </p>
                  <p className="mt-2 text-lg font-light text-white brand-data">{modalSection.image ? "Yes" : "No"}</p>
                </div>
              </div>

              <div className="mt-8 brand-panel-label">// Paragraphs</div>
              <div className="mt-4 flex flex-col gap-3">
                {modalSection.paragraphs.map((paragraph, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setModalParagraph(paragraph)}
                    className="flex items-start gap-3 rounded-[4px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.03)] px-4 py-4 text-left transition hover:border-[var(--brand-line-strong)] hover:bg-[rgba(125,249,255,0.08)]"
                  >
                    <span className="brand-data mt-0.5 text-[11px] text-[var(--brand-blue)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="line-clamp-2 text-sm leading-7 text-[var(--brand-text-soft)]">
                      {paragraph}
                    </span>
                  </button>
                ))}
              </div>

              {modalSection.image ? (
                <div className="mt-8">
                  <div className="brand-panel-label">// Visual</div>
                  <div className="mt-4 overflow-hidden rounded-[6px] border border-[var(--brand-line)]">
                    <img
                      src={modalSection.image}
                      alt={modalSection.imageAlt ?? modalSection.heading}
                      className="w-full object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {modalParagraph ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(2,4,12,0.78)] px-5 py-10 backdrop-blur-sm"
          onClick={() => setModalParagraph(null)}
        >
          <div
            className="w-full max-w-3xl rounded-[8px] border border-[rgba(125,249,255,0.25)] bg-[linear-gradient(145deg,#060A1C_0%,#03050F_100%)] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-6 border-b border-[var(--brand-line)] px-7 py-6">
              <div className="min-w-0">
                <h2 className="font-mono text-2xl tracking-[0.06em] text-[var(--brand-blue)]">
                  PARAGRAPH
                </h2>
                <p className="mt-3 text-base font-light leading-7 text-white">{modalSectionHeading}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalParagraph(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="px-7 py-6">
              <div className="brand-panel-label">// Detail</div>
              <div className="mt-4 rounded-r-[4px] border-l-2 border-[var(--brand-line-strong)] bg-[rgba(125,249,255,0.04)] px-5 py-5 text-sm leading-8 text-[var(--brand-text-soft)]">
                {modalParagraph}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
