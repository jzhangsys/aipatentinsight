import type { Metadata } from "next";
import AINavbar from "@/components/aipatentinsight/AINavbar";
import CompanyTimelineClient from "@/components/aipatentinsight/CompanyTimelineClient";
import AIFooter from "@/components/aipatentinsight/AIFooter";

type Params = { name: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { name } = await props.params;
  const decoded = decodeURIComponent(name);
  return {
    title: decoded,
    description: `${decoded} 的歷年專利時間軸 — 跨 snapshot 追蹤該公司的專利布局演化。`,
    openGraph: {
      title: `${decoded} | AIPatentInsight`,
      description: `${decoded} 的歷年專利時間軸`,
    },
  };
}

export default async function CompanyPage(props: {
  params: Promise<Params>;
}) {
  const { name } = await props.params;
  const decoded = decodeURIComponent(name);
  return (
    <div className="ai-shell">
      <AINavbar />
      <CompanyTimelineClient companyName={decoded} />
      <AIFooter />
    </div>
  );
}
