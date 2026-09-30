import { z } from "zod";

export const topics = ["process", "demo", "security"] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Вкажіть ім’я").max(100, "Ім’я задовге"),
  email: z.string().trim().min(1, "Вкажіть email").max(200, "Email задовгий").email("Перевірте формат email"),
  company: z.string().trim().min(1, "Вкажіть компанію").max(150, "Назва задовга"),
  message: z.string().trim().max(1500, "Не більше 1500 символів").optional().default(""),
  topic: z.enum(topics).default("process"),
  website: z.string().max(0).optional().default(""), // honeypot
});

export type ContactInput = z.infer<typeof contactSchema>;
