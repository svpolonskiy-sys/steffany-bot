const raw = process.env.SITE_URL?.trim().replace(/\/+$/, "");

export const siteConfig = {
  name: "Synaptic",
  title: "Synaptic — від бізнес-даних до зрозумілих дій",
  description:
    "Об’єднайте контекст із робочих систем, готуйте команду до зустрічей і переходьте до погоджених дій. Дізнайтеся, як почати із Synaptic.",
  /** Абсолютна адреса лише з реального SITE_URL; без неї — preview із noindex. */
  url: raw && /^https?:\/\//.test(raw) ? raw : undefined,
  privacyUrl: process.env.NEXT_PUBLIC_PRIVACY_URL?.trim() || undefined,
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || undefined,
};
