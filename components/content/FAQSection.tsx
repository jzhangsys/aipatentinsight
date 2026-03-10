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
    <section className="mt-14 border-t border-neutral-200 pt-12">
      <h2 className="text-2xl font-semibold">常見問題</h2>
      <div className="mt-6 space-y-4">
        {items.map((item, index) => (
          <details
            key={index}
            className="rounded-2xl border border-neutral-200 bg-white p-5"
          >
            <summary className="cursor-pointer text-base font-semibold text-neutral-900">
              {item.question}
            </summary>
            <p className="mt-4 text-base leading-8 text-neutral-700">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
