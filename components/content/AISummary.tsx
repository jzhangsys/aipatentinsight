type AISummaryProps = {
  summary: string[];
};

export default function AISummary({ summary }: AISummaryProps) {
  if (!summary?.length) return null;

  return (
    <section className="mt-10 rounded-[28px] border border-[var(--brand-line)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-sm">
      <div className="max-w-3xl">
        <p className="brand-kicker">AI Summary</p>
        <h2 className="mt-2 text-2xl font-semibold brand-title">重點摘要</h2>
        <div className="mt-4 space-y-4">
          {summary.map((item, index) => (
            <p key={index} className="text-base leading-8 text-[var(--brand-text-soft)]">
              {item}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
