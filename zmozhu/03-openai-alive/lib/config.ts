// Всі CTA ведуть на один Telegram-бот. Значення береться зі змінної оточення,
// з фолбеком на тимчасовий лінк.
export const TELEGRAM_BOT_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "https://t.me/zmozhu_bot";

// Реквізити ФОП — використовуються у футері та на юридичних сторінках.
export const LEGAL = {
  entity: "Фізична особа-підприємець Полонський Сергій Васильович",
  ipn: "2903322431",
  iban: "UA173052990000026007036407640",
  bank: "АТ КБ «ПриватБанк»",
  address: "Україна, м. Житомир, вул. БОС, 1/602, кв. 103",
  phone: "+380677162224",
  phoneHref: "+380677162224",
  email: "sv.polonskiy@gmail.com",
} as const;
