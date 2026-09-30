import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { contactSchema } from "@/lib/contact-schema";
import { deliverContact, deliveryConfigured } from "@/lib/contact-delivery";
import { siteConfig } from "@/lib/site-config";

export const runtime = "nodejs";

const MAX_BODY = 8 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.CONTACT_RATE_LIMIT ?? 5);
const hits = new Map<string, number[]>();
const recent = new Map<string, number>();

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function originAllowed(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    if (siteConfig.url) return o.origin === new URL(siteConfig.url).origin;
    const host = req.headers.get("host");
    return o.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!originAllowed(req)) return json({ code: "forbidden" }, 403);

  const now = Date.now();
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) return json({ code: "rate_limited" }, 429);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();

  const text = await req.text();
  if (text.length > MAX_BODY) return json({ code: "too_large" }, 413);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return json({ code: "invalid" }, 400);
  }

  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fields[key]) fields[key] = issue.message;
    }
    if (fields.website) return json({ code: "ok" }, 200); // бот: мовчки ігноруємо
    return json({ code: "validation", fields }, 422);
  }

  if (!deliveryConfigured()) return json({ code: "unavailable" }, 503);

  const fp = createHash("sha256").update(`${parsed.data.email}|${parsed.data.message}`).digest("hex");
  const last = recent.get(fp);
  if (last && now - last < 60_000) return json({ code: "ok" }, 200); // повторне надсилання
  const ok = await deliverContact(parsed.data);
  if (!ok) return json({ code: "delivery_failed" }, 502);
  recent.set(fp, now);
  if (recent.size > 5000) recent.clear();
  return json({ code: "ok" }, 200);
}
