import type { ReactNode } from "react";

type TerminalStat = {
  label: string;
  value: string;
};

type TerminalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats?: TerminalStat[];
  children: ReactNode;
};

export default function TerminalPage({
  eyebrow,
  title,
  description,
  stats = [],
  children,
}: TerminalPageProps) {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <section className="brand-card brand-glow overflow-hidden rounded-[10px] p-6 md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-4xl">
            <p className="brand-panel-label">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-light tracking-[0.12em] text-white md:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-base font-light leading-8 text-[var(--brand-text-soft)] md:text-lg">
              {description}
            </p>
          </div>

          {stats.length ? (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[6px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.03)] px-5 py-4"
                >
                  <p className="brand-panel-label">{stat.label}</p>
                  <p className="brand-data mt-3 text-3xl font-light text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8">{children}</section>
    </main>
  );
}
