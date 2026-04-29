type AISummaryProps = {
  summary: string[];
};

export default function AISummary({ summary }: AISummaryProps) {
  if (!summary?.length) return null;

  return (
    <section className="mt-10 rounded-[8px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.03)] p-6">
      <div className="max-w-3xl">
        <p className="brand-panel-label">AI Summary</p>
        <h2 className="mt-3 text-2xl font-light tracking-[0.08em] text-white">重點摘要</h2>
        <div className="mt-4 space-y-4">
          {summary.map((item, index) => (
            <div
              key={index}
              className="rounded-[6px] border border-[var(--brand-line)] bg-[rgba(3,5,15,0.72)] px-4 py-4"
            >
              <p className="text-base leading-8 text-[var(--brand-text-soft)]">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
