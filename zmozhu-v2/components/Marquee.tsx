// Стрічка-роздільник під першим екраном. Повторює ключові тези сторінки.
const items = [
  "30 днів",
  "щоденна підтримка",
  "−4% ваги",
  "усе в Telegram",
  "без жорстких дієт і заборон",
  "виконала умови — 2000 грн назад",
  "жива людина поруч",
  "один день за раз",
];

export default function Marquee({ dark = false }: { dark?: boolean }) {
  const row = [...items, ...items];
  return (
    <div
      className={`marquee border-y py-4 ${
        dark ? "border-white/10 bg-teal-deep text-apricot" : "border-line bg-sand text-teal-deep"
      }`}
      aria-hidden="true"
    >
      <div className="marquee__track animate-marquee">
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex shrink-0 items-center gap-6 pr-6 font-display text-[22px] font-medium italic tracking-[-0.01em] sm:text-[26px]"
          >
            {item}
            <span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-coral" : "bg-coral"}`} />
          </span>
        ))}
      </div>
    </div>
  );
}
