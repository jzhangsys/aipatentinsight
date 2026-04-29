"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  BranchMode,
  InsightsCompany,
  InsightsDataset,
  LayoutMode,
  SortMode,
  ViewMode,
} from "@/lib/insights";

type InsightsTerminalProps = {
  dataset: InsightsDataset;
};

type VisibleCompany = InsightsCompany & {
  visiblePatents: number;
};

type NodePosition = {
  x: number;
  y: number;
};

const GRAPH_WIDTH = 960;
const GRAPH_HEIGHT = 620;
const GRAPH_PADDING_X = 84;
const GRAPH_PADDING_Y = 78;

const PALETTE = [
  "#7DF9FF",
  "#8AB4FF",
  "#C7A6FF",
  "#FFD166",
  "#7CFFB2",
  "#FF9CEE",
  "#FF8A8A",
  "#7FE7CC",
  "#C9F27B",
  "#9AD5FF",
  "#FFB86B",
  "#A8A1FF",
  "#6FFFE9",
  "#F7A6FF",
  "#7DD3FC",
  "#B8F28F",
  "#F9A8D4",
];

const routeItems = [
  { href: "/insights/industry-evolution", label: "Industry Evolution" },
  { href: "/insights/company-briefs", label: "Company Briefs" },
  { href: "/insights/patent-highlights", label: "Patent Highlights" },
];

function getColorMap(categories: string[]) {
  return Object.fromEntries(categories.map((category, index) => [category, PALETTE[index % PALETTE.length]]));
}

function getPatentCount(
  company: InsightsCompany,
  branch: BranchMode,
  mode: ViewMode,
  selectedMonth: string,
  months: string[],
) {
  if (selectedMonth === "all") {
    return mode === "cumulative" ? company.branchCounts[branch] : 0;
  }

  if (mode === "monthly") {
    return company.monthlyBranchCounts[selectedMonth]?.[branch] ?? 0;
  }

  const monthIndex = months.indexOf(selectedMonth);
  if (monthIndex === -1) {
    return 0;
  }

  return months.slice(0, monthIndex + 1).reduce((sum, month) => {
    return sum + (company.monthlyBranchCounts[month]?.[branch] ?? 0);
  }, 0);
}

function getCategoryPositions(categories: string[]) {
  const usableWidth = GRAPH_WIDTH - GRAPH_PADDING_X * 2;
  return Object.fromEntries(
    categories.map((category, index) => {
      const x =
        categories.length === 1
          ? GRAPH_WIDTH / 2
          : GRAPH_PADDING_X + (usableWidth * index) / (categories.length - 1);
      return [category, x];
    }),
  );
}

function getGridPositions(companies: VisibleCompany[], categories: string[]) {
  const categoryX = getCategoryPositions(categories);
  const grouped = new Map<string, VisibleCompany[]>();

  for (const company of companies) {
    if (!grouped.has(company.mainCategory)) {
      grouped.set(company.mainCategory, []);
    }
    grouped.get(company.mainCategory)!.push(company);
  }

  const positions = new Map<string, NodePosition>();
  const rowGap = 68;
  const columnGap = 18;

  for (const category of categories) {
    const items = grouped.get(category) ?? [];
    const xCenter = categoryX[category] ?? GRAPH_WIDTH / 2;
    items.forEach((company, index) => {
      const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(items.length / 1.8))));
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = xCenter - ((columns - 1) * columnGap) / 2 + column * columnGap;
      const y = GRAPH_PADDING_Y + row * rowGap + ((column % 2) * 8);
      positions.set(company.name, { x, y });
    });
  }

  return positions;
}

function getForcePositions(companies: VisibleCompany[], categories: string[]) {
  const categoryX = getCategoryPositions(categories);
  const grouped = new Map<string, VisibleCompany[]>();

  for (const company of companies) {
    if (!grouped.has(company.mainCategory)) {
      grouped.set(company.mainCategory, []);
    }
    grouped.get(company.mainCategory)!.push(company);
  }

  const positions = new Map<string, NodePosition>();
  const centerY = GRAPH_HEIGHT / 2;

  for (const category of categories) {
    const items = grouped.get(category) ?? [];
    const anchorX = categoryX[category] ?? GRAPH_WIDTH / 2;

    items.forEach((company, index) => {
      const ring = Math.floor(index / 8);
      const angle = ((index % 8) / 8) * Math.PI * 2 + ring * 0.42;
      const radiusX = 22 + ring * 18;
      const radiusY = 16 + ring * 15;
      const x = anchorX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY + (ring % 2 === 0 ? -24 : 24);
      positions.set(company.name, { x, y });
    });
  }

  return positions;
}

export default function InsightsTerminal({ dataset }: InsightsTerminalProps) {
  const [mode, setMode] = useState<ViewMode>("cumulative");
  const [branch, setBranch] = useState<BranchMode>("all");
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [sortBy, setSortBy] = useState<SortMode>("patents");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null);
  const [hoveredCompanyName, setHoveredCompanyName] = useState<string | null>(null);

  const colorMap = useMemo(() => getColorMap(dataset.categories), [dataset.categories]);
  const effectiveMonth =
    mode === "monthly" && selectedMonth === "all"
      ? dataset.months[dataset.months.length - 1]
      : selectedMonth;

  const visibleCompanies = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return dataset.companies
      .map((company) => ({
        ...company,
        visiblePatents: getPatentCount(company, branch, mode, effectiveMonth, dataset.months),
      }))
      .filter((company) => company.visiblePatents > 0)
      .filter((company) => (activeCategory ? company.mainCategory === activeCategory : true))
      .filter((company) => (keyword ? company.name.toLowerCase().includes(keyword) : true));
  }, [activeCategory, branch, dataset.companies, dataset.months, effectiveMonth, mode, search]);

  const sortedCompanies = useMemo(() => {
    const items = [...visibleCompanies];
    items.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "zh-Hant");
      }
      if (sortBy === "category") {
        return a.mainCategory.localeCompare(b.mainCategory, "zh-Hant") || b.visiblePatents - a.visiblePatents;
      }
      return b.visiblePatents - a.visiblePatents;
    });
    return items;
  }, [sortBy, visibleCompanies]);

  const visiblePatents = useMemo(
    () => visibleCompanies.reduce((sum, company) => sum + company.visiblePatents, 0),
    [visibleCompanies],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const company of visibleCompanies) {
      counts.set(company.mainCategory, (counts.get(company.mainCategory) ?? 0) + 1);
    }
    return counts;
  }, [visibleCompanies]);

  const activeCategories = useMemo(
    () => dataset.categories.filter((category) => (categoryCounts.get(category) ?? 0) > 0),
    [categoryCounts, dataset.categories],
  );

  const nodePositions = useMemo(() => {
    return layout === "grid"
      ? getGridPositions(sortedCompanies, activeCategories)
      : getForcePositions(sortedCompanies, activeCategories);
  }, [activeCategories, layout, sortedCompanies]);

  const selectedCompany =
    sortedCompanies.find((company) => company.name === selectedCompanyName) ?? sortedCompanies[0] ?? null;

  const hoveredCompany =
    sortedCompanies.find((company) => company.name === hoveredCompanyName) ?? null;

  return (
    <section className="brand-vignette relative min-h-[calc(100vh-84px)] overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,rgba(6,10,28,0.86)_0%,rgba(3,5,15,0.95)_58%,rgba(1,3,10,1)_100%)]" />
        <div className="absolute inset-x-[8%] top-[18%] h-[58%] rounded-[24px] border border-[rgba(125,249,255,0.05)]" />
        <div className="brand-grid absolute inset-x-[8%] top-[18%] h-[58%] rounded-[24px] opacity-40" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-6 pb-6 pt-8 md:px-8">
        <div className="flex justify-center">
          <div className="brand-card brand-glow inline-flex flex-wrap items-end gap-5 rounded-[8px] px-5 py-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="month-select" className="brand-panel-label">
                Time Range
              </label>
              <select
                id="month-select"
                value={effectiveMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="border-b border-[var(--brand-line)] bg-transparent pb-1 text-sm text-white outline-none"
              >
                <option value="all">All (累積)</option>
                {dataset.months.map((month) => (
                  <option key={month} value={month} className="bg-[#03050F]">
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="brand-panel-label">Mode</span>
              <div className="flex gap-2">
                {(["cumulative", "monthly"] as ViewMode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      if (value === "monthly" && selectedMonth === "all") {
                        setSelectedMonth(dataset.months[dataset.months.length - 1]);
                      }
                    }}
                    className={`px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
                      mode === value
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
              <span className="brand-panel-label">Branch</span>
              <div className="flex gap-2">
                {(["all", "main", "branch"] as BranchMode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBranch(value)}
                    className={`px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
                      branch === value
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
                {(["grid", "force"] as LayoutMode[]).map((value) => (
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
          </div>
        </div>

        <div className="pointer-events-none absolute right-8 top-10 hidden text-right lg:block">
          <h1 className="text-[32px] font-light tracking-[0.16em] text-white">INSIGHTS</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-text-muted)]">
            公司專利圖譜 · Company Patent Map
          </p>
        </div>

        <div className="pt-20">
          <div className="max-w-3xl">
            <p className="brand-panel-label">Graph View</p>
            <h2 className="mt-4 text-4xl font-light tracking-[0.14em] text-white md:text-6xl">
              沉浸式洞察介面
            </h2>
            <p className="mt-6 max-w-2xl text-base font-light leading-8 text-[var(--brand-text-soft)]">
              已接上真資料與互動：月份切換、branch 篩選、公司搜尋、category 聚焦，以及可切換
              grid / force 的圖譜舞台。
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr_340px]">
          <aside className="brand-card h-fit rounded-[8px] p-4">
            <p className="brand-panel-label">Tech Categories · 點選聚焦</p>
            <div className="mt-4 space-y-2">
              {activeCategories.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(isActive ? null : category)}
                    className={`flex w-full items-center gap-3 rounded-[4px] border px-2 py-2 text-left transition ${
                      isActive
                        ? "border-[var(--brand-line-strong)] bg-[rgba(125,249,255,0.1)]"
                        : "border-transparent hover:border-[var(--brand-line)] hover:bg-[rgba(125,249,255,0.04)]"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]"
                      style={{ backgroundColor: colorMap[category], color: colorMap[category] }}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.74)]">
                      {category}
                    </span>
                    <span className="ml-auto font-mono text-[9px] text-[var(--brand-text-muted)]">
                      {categoryCounts.get(category) ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex flex-col gap-4">
            <div className="brand-card relative overflow-hidden rounded-[8px] p-4">
              <svg
                viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                className="h-[520px] w-full"
                role="img"
                aria-label="Company patent graph"
              >
                {activeCategories.map((category) => {
                  const x = getCategoryPositions(activeCategories)[category];
                  return (
                    <g key={category}>
                      <text
                        x={x}
                        y={48}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.52)"
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.22em",
                        }}
                      >
                        {category}
                      </text>
                    </g>
                  );
                })}

                {sortedCompanies.map((company) => {
                  const position = nodePositions.get(company.name);
                  if (!position) {
                    return null;
                  }

                  const isSelected = selectedCompany?.name === company.name;
                  const isHovered = hoveredCompany?.name === company.name;
                  const radius = Math.max(4, Math.min(14, 4 + Math.sqrt(company.visiblePatents) * 0.5));

                  return (
                    <g key={company.name}>
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={radius + (isSelected ? 8 : isHovered ? 4 : 0)}
                        fill="transparent"
                        stroke={isSelected ? "rgba(125,249,255,0.35)" : "transparent"}
                      />
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={radius}
                        fill={colorMap[company.mainCategory]}
                        opacity={isSelected || isHovered ? 1 : 0.86}
                        onMouseEnter={() => setHoveredCompanyName(company.name)}
                        onMouseLeave={() => setHoveredCompanyName(null)}
                        onClick={() => setSelectedCompanyName(company.name)}
                        style={{ cursor: "pointer" }}
                      />
                      {(isSelected || isHovered) && (
                        <text
                          x={position.x}
                          y={position.y - radius - 10}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.92)"
                          style={{
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {company.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {hoveredCompany ? (
                <div className="pointer-events-none absolute left-5 top-5 max-w-[280px] rounded-[4px] border border-[var(--brand-line-strong)] bg-[rgba(3,5,15,0.96)] px-3 py-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--brand-blue)]">
                    {hoveredCompany.mainCategory}
                  </p>
                  <p className="mt-1 text-sm text-white">{hoveredCompany.name}</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--brand-text-muted)]">
                    {hoveredCompany.visiblePatents} patents · {hoveredCompany.industry ?? "未分類"}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="brand-card w-full rounded-[8px] p-5">
              <div className="grid gap-4 md:grid-cols-3">
                {routeItems.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className="rounded-[4px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.03)] px-4 py-4 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--brand-text-soft)] transition hover:border-[var(--brand-line-strong)] hover:text-[var(--brand-blue)]"
                  >
                    {route.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <aside className="brand-card flex min-h-[640px] flex-col rounded-[8px] p-0">
            <div className="flex items-center justify-between border-b border-[var(--brand-line)] px-4 py-3">
              <p className="brand-panel-label">Companies</p>
              <span className="font-mono text-[9px] text-[var(--brand-text-muted)]">
                {sortedCompanies.length}
              </span>
            </div>

            <div className="border-b border-[var(--brand-line)] px-4 py-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search company..."
                className="w-full rounded-[4px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.04)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--brand-text-muted)]"
              />
            </div>

            <div className="flex gap-2 border-b border-[var(--brand-line)] px-4 py-3">
              {(["patents", "name", "category"] as SortMode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortBy(value)}
                  className={`flex-1 rounded-[2px] border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${
                    sortBy === value
                      ? "border-[var(--brand-line-strong)] bg-[rgba(125,249,255,0.06)] text-[var(--brand-blue)]"
                      : "border-[var(--brand-line)] text-[var(--brand-text-muted)]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            {selectedCompany ? (
              <div className="border-b border-[var(--brand-line)] px-4 py-4">
                <p className="text-sm text-white">{selectedCompany.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="brand-panel-label">Patents</p>
                    <p className="mt-1 text-lg font-light text-white brand-data">
                      {selectedCompany.visiblePatents}
                    </p>
                  </div>
                  <div>
                    <p className="brand-panel-label">Stock</p>
                    <p className="mt-1 text-lg font-light text-white brand-data">
                      {selectedCompany.stockCode ?? "--"}
                    </p>
                  </div>
                  <div>
                    <p className="brand-panel-label">Industry</p>
                    <p className="mt-1 text-sm text-[var(--brand-text-soft)]">
                      {selectedCompany.industry ?? "未分類"}
                    </p>
                  </div>
                  <div>
                    <p className="brand-panel-label">Category</p>
                    <p className="mt-1 text-sm text-[var(--brand-text-soft)]">
                      {selectedCompany.mainCategory}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto py-2">
              {sortedCompanies.length ? (
                sortedCompanies.map((company) => (
                  <button
                    key={company.name}
                    type="button"
                    onClick={() => setSelectedCompanyName(company.name)}
                    onMouseEnter={() => setHoveredCompanyName(company.name)}
                    onMouseLeave={() => setHoveredCompanyName(null)}
                    className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition ${
                      selectedCompany?.name === company.name
                        ? "border-[var(--brand-blue)] bg-[rgba(125,249,255,0.08)]"
                        : "border-transparent hover:border-[var(--brand-blue)] hover:bg-[rgba(125,249,255,0.05)]"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{
                        backgroundColor: colorMap[company.mainCategory],
                        color: colorMap[company.mainCategory],
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{company.name}</p>
                      <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[var(--brand-text-muted)]">
                        {company.mainCategory}
                      </p>
                    </div>
                    <span className="text-sm font-light text-[var(--brand-blue)] brand-data">
                      {company.visiblePatents}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-12 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">
                  no companies
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="brand-card flex gap-6 rounded-[8px] px-5 py-3">
            <div>
              <p className="brand-panel-label">Companies</p>
              <p className="mt-1 text-xl font-light text-white brand-data">{sortedCompanies.length}</p>
            </div>
            <div>
              <p className="brand-panel-label">Patents</p>
              <p className="mt-1 text-xl font-light text-white brand-data">{visiblePatents}</p>
            </div>
            <div>
              <p className="brand-panel-label">Region</p>
              <p className="mt-1 text-xl font-light text-white brand-data">{dataset.region}</p>
            </div>
            <div>
              <p className="brand-panel-label">Snapshot</p>
              <p className="mt-1 text-xl font-light text-white brand-data">{dataset.snapshotDate}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
