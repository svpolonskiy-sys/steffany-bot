"use client";

import { useId, useState, type ReactNode } from "react";

type Item = { q: string; a: ReactNode };

const items: Item[] = [
  {
    q: "А якщо я не досягну цілі у −4%?",
    a: "Тоді внесок не повертається. Але Ти залишаєшся в програмі до кінця 30 днів і продовжуєш отримувати підтримку Міри, відео Тетяни та весь щоденний супровід.",
  },
  {
    q: "Це безпечний темп схуднення?",
    a: "Ми обрали −4% за 30 днів як чітку й помірну ціль без гонки за екстремальними цифрами. ZMOZHU не підтримує голодування, різке схуднення чи інші небезпечні способи зниження ваги.",
  },
  {
    q: "Мені дадуть готове меню і план харчування?",
    a: "Ні. ZMOZHU не дає жорсткого меню. Ти отримуєш прості принципи й пояснення, які допомагають краще розуміти своє тіло, апетит і звички — та самостійно приймати рішення у звичайному житті.",
  },
  {
    q: "Що як я пропущу день?",
    a: "Життя буває різним, тому в програмі є запас. За 30 днів можна пропустити до 3 зважувань, до 3 ранкових і до 3 вечірніх чекінів. Якщо пропусків більше, умови повернення внеску вважаються невиконаними, але участь у програмі продовжується.",
  },
  {
    q: "Мої дані в безпеці?",
    a: (
      <>
        Так. Дані про вагу, сон, чекіни та самопочуття використовуються лише для
        роботи програми й персоналізації підтримки. Ми не використовуємо їх для
        сторонньої реклами. Детальні умови зберігання й обробки даних описані в{" "}
        <a href="/privacy" className="font-semibold text-forest underline decoration-lime decoration-2 underline-offset-4">
          Політиці конфіденційності
        </a>
        .
      </>
    ),
  },
  {
    q: "Як повернути гроші?",
    a: "Якщо Ти виконала всі три умови, повернення запускається автоматично. 2000 грн повертаються на ту саму картку, з якої була оплата, протягом кількох робочих днів.",
  },
];

function Row({ item, open, onToggle }: { item: Item; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className={`rounded-[24px] transition-colors duration-300 ${open ? "bg-white shadow-soft" : "bg-white/50 hover:bg-white"}`}>
      <h3>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left">
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-forest sm:text-[19px]">{item.q}</span>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${open ? "rotate-45 bg-forest text-lime" : "bg-lime text-forest"}`} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </span>
        </button>
      </h3>
      {/* Відповідь завжди в HTML (для пошуку), висота анімується через grid-rows */}
      <div id={id} role="region" aria-hidden={!open} className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.2,.7,.2,1)] ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="max-w-[660px] px-6 pb-6 text-[16px] leading-[1.7] text-ink">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <Row key={item.q} item={item} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} />
      ))}
    </div>
  );
}
