"use client";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

export function PrimaryCta({ href = "#contact", placement, children, variant = "primary", small }: { href?: string; placement: string; children: ReactNode; variant?: "primary" | "mint"; small?: boolean }) {
  return (
    <a href={href} className={`btn btn-${variant}${small ? " btn-sm" : ""}`} onClick={() => track("primary_cta_click", { placement })}>
      {children}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="arrow"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </a>
  );
}

/** Веде до форми з попередньо обраною темою, яку можна змінити. */
export function TopicLink({ topic, children }: { topic: string; children: ReactNode }) {
  return (
    <a
      href="#contact"
      className="link-arrow"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("synaptic:topic", { detail: topic }));
        track("primary_cta_click", { placement: "control_topic" });
      }}
    >
      {children}
    </a>
  );
}
