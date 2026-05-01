import type { Metadata } from "next";
import { Suspense } from "react";
import AINavbar from "@/components/aipatentinsight/AINavbar";
import MarketSignalsClient from "@/components/aipatentinsight/MarketSignalsClient";
import AIFooter from "@/components/aipatentinsight/AIFooter";

export const metadata: Metadata = {
  title: "Market Signals",
  description:
    "市場訊號儀表板:整合產業新聞、公司動態與專利情報,捕捉題材生成的早期訊號。",
  openGraph: {
    title: "Market Signals | AIPatentInsight",
    description: "市場訊號儀表板:整合產業新聞、公司動態與專利情報,捕捉題材生成的早期訊號。",
  },
};

export default function MarketSignalsPage() {
  return (
    <div className="ai-shell">
      <AINavbar />
      {/* Suspense 必要:MarketSignalsClient 用 useSearchParams,Next 16 需要 boundary */}
      <Suspense fallback={null}>
        <MarketSignalsClient />
      </Suspense>
      <AIFooter />
    </div>
  );
}
