type ZeroStateProps = {
  title?: string;
  note?: string;
};

export default function ZeroState({
  title = "歸零",
  note = "All website content has been removed.",
}: ZeroStateProps) {
  return (
    <main className="flex min-h-[calc(100vh-96px)] items-center justify-center px-6 py-16">
      <section className="w-full max-w-3xl rounded-[8px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.03)] px-8 py-12 text-center">
        <p className="brand-panel-label">Reset State</p>
        <h1 className="mt-4 text-5xl font-light tracking-[0.14em] text-white">{title}</h1>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--brand-text-muted)]">
          {note}
        </p>
      </section>
    </main>
  );
}
