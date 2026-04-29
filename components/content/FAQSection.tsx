type FAQItem = {
  question: string;
  answer: string;
};

type FAQSectionProps = {
  items: FAQItem[];
};

export default function FAQSection({ items }: FAQSectionProps) {
  if (!items?.length) return null;

  return (
    <section className="mt-14 border-t border-[var(--brand-line)] pt-12">
      <p className="brand-kicker">FAQ</p>
      <h2 className="mt-2 text-2xl font-semibold brand-title">常見問題</h2>
      <div className="mt-6 space-y-4">
        {items.map((item, index) => (
          <details
            key={index}
            className="rounded-[24px] border border-[var(--brand-line)] bg-[rgba(19,28,46,0.82)] p-5"
          >
            <summary className="cursor-pointer text-base font-semibold text-[var(--brand-ink)]">
              {item.question}
            </summary>
            <p className="mt-4 text-base leading-8 text-[var(--brand-text-soft)]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
