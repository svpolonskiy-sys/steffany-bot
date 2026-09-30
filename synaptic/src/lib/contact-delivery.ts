import type { ContactInput } from "./contact-schema";

export const deliveryConfigured = () => Boolean(process.env.CONTACT_WEBHOOK_URL);

/** Доставляє звернення у налаштований канал. Не логує персональні дані. */
export async function deliverContact(input: ContactInput): Promise<boolean> {
  const url = process.env.CONTACT_WEBHOOK_URL;
  if (!url) return false;
  const secret = process.env.CONTACT_WEBHOOK_SECRET;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      body: JSON.stringify({
        source: "synaptic-landing",
        name: input.name,
        email: input.email,
        company: input.company,
        message: input.message,
        topic: input.topic,
        receivedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
