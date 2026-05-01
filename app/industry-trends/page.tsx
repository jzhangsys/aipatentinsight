import type { Metadata } from "next";
import AINavbar from "@/components/aipatentinsight/AINavbar";
import IndustryTrendsClient from "@/components/aipatentinsight/IndustryTrendsClient";
import AIFooter from "@/components/aipatentinsight/AIFooter";

export const metadata: Metadata = {
  title: "Industry Trends",
  description:
    "產業技術趨勢分析:從專利申請動向看見技術主題的興起、擴散與衰退。",
  openGraph: {
    title: "Industry Trends | AIPatentInsight",
    description: "產業技術趨勢分析:從專利申請動向看見技術主題的興起、擴散與衰退。",
  },
};

export default function IndustryTrendsPage() {
  return (
    <div className="ai-shell">
      <AINavbar />
      <IndustryTrendsClient />
      <AIFooter />
    </div>
  );
}
