export type BranchMode = "all" | "main" | "branch";
export type ViewMode = "cumulative" | "monthly";
export type LayoutMode = "grid" | "force";
export type SortMode = "patents" | "name" | "category";

export type MonthlyCounts = Record<string, Record<BranchMode, number>>;

export type InsightsCompany = {
  name: string;
  mainCategory: string;
  totalPatents: number;
  industry: string | null;
  stockCode: string | null;
  isPublic: boolean;
  monthsActive: string[];
  categoryDist: Record<string, number>;
  branchCounts: Record<BranchMode, number>;
  monthlyBranchCounts: MonthlyCounts;
};

export type InsightsDataset = {
  snapshotDate: string;
  region: string;
  months: string[];
  categories: string[];
  totalCompanies: number;
  totalPatents: number;
  companies: InsightsCompany[];
};
