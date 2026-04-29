import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "聯絡我們｜AI Patent Insight",
  description:
    "與 AI Patent Insight 聯絡，洽詢 API 服務、深度解析報告與研究合作需求。",
};

const contactCards = [
  {
    title: "API 客製",
    body: "研究資料欄位、內部系統串接、策略分析桌面整合。",
  },
  {
    title: "報告合作",
    body: "深度報告採購、客製白皮書與產業主題研究。",
  },
  {
    title: "研究聯繫",
    body: "針對內容授權、策略合作與方法論交流的正式接洽。",
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <section className="brand-card rounded-[36px] p-6 md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="max-w-4xl">
            <p className="brand-kicker">Contact Desk</p>
            <h1 className="mt-2 text-4xl font-semibold brand-title md:text-5xl">合作與聯繫入口</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--brand-text-soft)]">
              我把聯絡頁也改成 desk 風格，不再只是單一 email 區塊。
              你可以把它當成報告採購、API 導入與研究合作的統一入口。
            </p>
          </div>

          <div className="rounded-[30px] border border-[var(--brand-line)] bg-[rgba(9,17,29,0.82)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-text-muted)]">
              Primary channel
            </p>
            <p className="mt-5 text-2xl font-semibold text-white">hello@aipatentinsight.com</p>
            <p className="mt-3 text-sm leading-7 text-[var(--brand-text-soft)]">
              來信時可直接註明需求類型、產業主題與預計交付形式。
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {contactCards.map((card) => (
          <article key={card.title} className="brand-card-soft rounded-[30px] p-6">
            <h2 className="text-2xl font-semibold text-white brand-title">{card.title}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">{card.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
