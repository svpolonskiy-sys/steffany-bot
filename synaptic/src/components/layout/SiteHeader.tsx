"use client";
import { useEffect, useRef, useState } from "react";
import { nav, cta } from "@/content/site.uk";
import { Logo, Menu, Close } from "../ui/icons";
import { PrimaryCta } from "../ui/TrackedLink";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Керований фокус після переходу за якорем.
  useEffect(() => {
    const focusTarget = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el) el.focus({ preventScroll: true });
    };
    window.addEventListener("hashchange", focusTarget);
    return () => window.removeEventListener("hashchange", focusTarget);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); btn.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="header" data-scrolled={scrolled} data-open={open}>
      <div className="container header-in">
        <a href="#top" className="brand" aria-label="Synaptic — на початок сторінки" onClick={close}>
          <Logo /> <span>Synaptic</span>
        </a>
        <nav className="nav-desktop" aria-label="Основна навігація">
          {nav.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
        </nav>
        <div className="header-cta"><PrimaryCta placement="header" small>{cta.primary}</PrimaryCta></div>
        <button ref={btn} type="button" className="menu-btn" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
          {open ? <Close /> : <Menu />}
          <span>{open ? "Закрити" : "Меню"}</span>
        </button>
      </div>
      {open && (
        <div id="mobile-menu" ref={menu} className="mobile-menu">
          <nav aria-label="Мобільна навігація" style={{ display: "grid" }}>
            {nav.map((n) => <a key={n.href} href={n.href} onClick={close}>{n.label}</a>)}
          </nav>
          <a href="#contact" className="btn btn-primary" onClick={close}>{cta.primary}</a>
        </div>
      )}
    </header>
  );
}
