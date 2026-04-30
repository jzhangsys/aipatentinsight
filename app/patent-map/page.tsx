import type { Metadata } from "next";
import { Suspense } from "react";
import AINavbar from "@/components/aipatentinsight/AINavbar";
import PatentMapClient from "@/components/aipatentinsight/PatentMapClient";

export const metadata: Metadata = {
  title: "Patent Map",
  description:
    "公司專利視覺化圖譜:依時間點、技術分類映射 719 家公司、3550 筆專利。每一個節點代表一間公司,節點大小反應趨勢上的專利數量。",
  openGraph: {
    title: "Patent Map | AIPatentInsight",
    description:
      "公司專利視覺化圖譜:依時間點、技術分類映射 719 家公司、3550 筆專利。",
  },
};

export default function PatentMapPage() {
  return (
    <div className="ai-shell">
      <AINavbar />
      {/* Suspense 必要:PatentMapClient 用 useSearchParams,Next 16 需要 boundary */}
      <Suspense fallback={null}>
        <PatentMapClient />
      </Suspense>
    </div>
  );
}
