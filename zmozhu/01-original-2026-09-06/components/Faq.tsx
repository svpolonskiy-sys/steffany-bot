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
        <a href="/privacy" className="underline hover:text-terracotta-deep">
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

function AccordionRow({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const answerId = useId();
  return (
    <div className="border-b border-line">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={answerId}
          className="flex w-full items-center justify-between gap-4 py-5 text-left"
        >
          <span className="text-lg font-medium text-deep">{item.q}</span>
          <span
            className={`shrink-0 text-terracotta-deep transition-transform duration-200 ${
              open ? "rotate-45" : ""
            }`}
            aria-hidden="true"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M11 4v14M4 11h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </button>
      </h3>
      <div
        id={answerId}
        aria-hidden={!open}
        hidden={!open}
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="max-w-[620px] pr-8 text-[16px] leading-[1.7] text-ink-soft">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Faq() {
  return (
    <div className="mx-auto max-w-2xl">
      {items.map((item) => (
        <AccordionRow key={item.q} item={item} />
      ))}
    </div>
  );
}
