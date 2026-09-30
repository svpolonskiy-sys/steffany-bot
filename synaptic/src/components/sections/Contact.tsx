"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { contact } from "@/content/site.uk";
import { validateContact, type FieldErrors } from "@/lib/contact-validate";
import { track } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error" | "unavailable";
const order = ["name", "email", "company", "message"] as const;

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [topic, setTopic] = useState("process");
  const [len, setLen] = useState(0);
  const started = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = (e: Event) => setTopic(String((e as CustomEvent).detail));
    window.addEventListener("synaptic:topic", on);
    return () => window.removeEventListener("synaptic:topic", on);
  }, []);

  const focusFirst = (errs: FieldErrors) => {
    const first = order.find((k) => errs[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const fd = new FormData(e.currentTarget);
    const raw = {
      name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? ""), company: String(fd.get("company") ?? ""),
      message: String(fd.get("message") ?? ""), topic, website: String(fd.get("website") ?? ""),
    };
    const errs = validateContact(raw);
    if (Object.keys(errs).length) { setErrors(errs); setStatus("idle"); focusFirst(errs); return; }
    setErrors({}); setStatus("submitting");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...raw, name: raw.name.trim(), email: raw.email.trim(), company: raw.company.trim(), message: raw.message.trim() }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.code === "ok") {
        setStatus("success"); formRef.current?.reset(); setLen(0); track("contact_submit_success");
        requestAnimationFrame(() => statusRef.current?.focus());
      } else if (res.status === 503 || res.status === 404) {
        setStatus("unavailable");
      } else if (res.status === 422 && body.fields) {
        setErrors(body.fields); setStatus("idle"); focusFirst(body.fields); track("contact_submit_error", { category: "validation" });
      } else {
        setStatus("error"); track("contact_submit_error", { category: String(body.code ?? res.status) });
      }
    } catch {
      setStatus("error"); track("contact_submit_error", { category: "network" });
    }
  }

  const fieldProps = (k: keyof FieldErrors) => ({
    "aria-invalid": errors[k] ? (true as const) : undefined,
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
  });
  const err = (k: keyof FieldErrors) => (errors[k] ? <p id={`${k}-err`} className="field-err">{errors[k]}</p> : null);
  const start = () => { if (!started.current) { started.current = true; track("contact_start"); } };

  return (
    <form ref={formRef} className="form" onSubmit={onSubmit} onFocus={start} noValidate aria-label="Запит на розмову">
      <div className="field">
        <label htmlFor="f-name">Ім’я</label>
        <input id="f-name" name="name" className="input" autoComplete="given-name" required maxLength={100} {...fieldProps("name")} />
        {err("name")}
      </div>
      <div className="field">
        <label htmlFor="f-email">Email для зв’язку</label>
        <input id="f-email" name="email" type="email" className="input" autoComplete="email" required maxLength={200} {...fieldProps("email")} />
        {err("email")}
      </div>
      <div className="field">
        <label htmlFor="f-company">Компанія</label>
        <input id="f-company" name="company" className="input" autoComplete="organization" required maxLength={150} {...fieldProps("company")} />
        {err("company")}
      </div>
      <div className="field">
        <label htmlFor="f-message">Що хочете спростити? <span className="opt">(необов’язково)</span></label>
        <textarea id="f-message" name="message" className="input" maxLength={1500} onChange={(e) => setLen(e.target.value.length)} {...fieldProps("message")} />
        <p className="counter">{len} / 1500</p>
        {err("message")}
      </div>
      <fieldset className="field radio-row" style={{ display: "grid" }}>
        <legend>Тема запиту <span className="opt">(необов’язково)</span></legend>
        <div className="radio-row">
          {contact.topics.map((t) => (
            <label key={t.value}>
              <input type="radio" name="topic" value={t.value} checked={topic === t.value} onChange={() => setTopic(t.value)} />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="hp" aria-hidden="true">
        <label>Не заповнюйте це поле<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <button type="submit" className="btn btn-primary" disabled={status === "submitting"} aria-disabled={status === "submitting"}>
        {status === "submitting" ? "Надсилаємо…" : contact.submit}
      </button>
      <div ref={statusRef} tabIndex={-1} role="status" aria-live="polite">
        {status === "success" && <p className="status ok">{contact.success}</p>}
        {status === "unavailable" && <p className="status info">{contact.unavailable}</p>}
        {status === "error" && <p className="status err" role="alert">{contact.error}</p>}
      </div>
    </form>
  );
}
