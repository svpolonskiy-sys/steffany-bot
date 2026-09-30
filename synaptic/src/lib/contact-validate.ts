// Легка клієнтська валідація (без zod, щоб не збільшувати початковий JS). Сервер перевіряє повторно через contact-schema.
export type FieldErrors = Partial<Record<"name" | "email" | "company" | "message", string>>;
export type ContactRaw = { name: string; email: string; company: string; message: string; topic: string; website: string };

export function validateContact(v: ContactRaw): FieldErrors {
  const e: FieldErrors = {};
  const name = v.name.trim(), email = v.email.trim(), company = v.company.trim();
  if (!name) e.name = "Вкажіть ім’я"; else if (name.length > 100) e.name = "Ім’я задовге";
  if (!email) e.email = "Вкажіть email";
  else if (email.length > 200) e.email = "Email задовгий";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Перевірте формат email";
  if (!company) e.company = "Вкажіть компанію"; else if (company.length > 150) e.company = "Назва задовга";
  if (v.message.trim().length > 1500) e.message = "Не більше 1500 символів";
  return e;
}
