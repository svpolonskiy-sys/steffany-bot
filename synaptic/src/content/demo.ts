export type DemoState = "signal" | "evidence" | "proposal" | "completed";

export const demoSteps: { id: DemoState; phase: "Бачить" | "Радить" | "Робить"; title: string; action: string }[] = [
  { id: "signal", phase: "Бачить", title: "Сигнал", action: "Переглянути підстави" },
  { id: "evidence", phase: "Бачить", title: "Підстави", action: "Переглянути пропозицію" },
  { id: "proposal", phase: "Радить", title: "Пропозиція", action: "Погодити демонстраційну дію" },
  { id: "completed", phase: "Робить", title: "Результат", action: "Повторити сценарій" },
];

export const sources = [
  { id: "orders", name: "Замовлення", fragment: "Товар А, напрям А: у замовленнях 120 од.; потрібно виконати до кінця тижня." },
  { id: "stock", name: "Облік запасів", fragment: "Товар А: склад 1 — 35 од., склад 2 — 140 од. (вигадані дані)." },
] as const;

export const conflictSources = [
  { id: "stock1", name: "Облік запасів", fragment: "Склад 1: 35 од. на кінець дня." },
  { id: "stock2", name: "Таблиця залишків", fragment: "Склад 1: 90 од. — інша дата оновлення." },
] as const;
