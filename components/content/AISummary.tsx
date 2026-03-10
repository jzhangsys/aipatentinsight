type AISummaryProps = {
  summary: string[];
};

export default function AISummary({ summary }: AISummaryProps) {
  if (!summary?.length) return null;

  return (
    <section className="mt-10 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-neutral-500">
          AI Summary
        </p>
        <h2 className="mt-2 text-2xl font-semibold">重點摘要</h2>
        <div className="mt-4 space-y-4">
          {summary.map((item, index) => (
            <p key={index} className="text-base leading-8 text-neutral-700">
              {item}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
