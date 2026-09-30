"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { scenarios } from "@/content/site.uk";
import { track } from "@/lib/analytics";

export function ScenarioTabs() {
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const items = scenarios.items;

  const select = (n: number, focus = false) => {
    setI(n);
    track("scenario_select", { scenario: items[n].id });
    if (focus) refs.current[n]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const last = items.length - 1;
    const map: Record<string, number> = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last };
    if (e.key in map) { e.preventDefault(); select(map[e.key], true); }
  };
  const cur = items[i];

  return (
    <div>
      <div role="tablist" aria-label="Сценарії для різних команд" className="tabs" onKeyDown={onKey}>
        {items.map((s, n) => (
          <button
            key={s.id} ref={(el) => { refs.current[n] = el; }} role="tab" type="button" className="tab"
            id={`tab-${s.id}`} aria-selected={i === n} aria-controls={`panel-${s.id}`} tabIndex={i === n ? 0 : -1}
            onClick={() => select(n)}
          >{s.tab}</button>
        ))}
      </div>
      <div key={cur.id} role="tabpanel" id={`panel-${cur.id}`} aria-labelledby={`tab-${cur.id}`} tabIndex={0} className="tab-panel">
        <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
          <p className="tab-question">{cur.question}</p>
          <p className="value">{cur.value}</p>
        </div>
        <div className="example">
          <h3 className="h3">{cur.panelTitle}</h3>
          {cur.rows.map((r) => (
            <div key={r.k} className="ex-row"><b>{r.k}</b><span>{r.v}</span><span className="s">{r.s}</span></div>
          ))}
          <p className="small" style={{ marginTop: 8 }}>{scenarios.caption}</p>
        </div>
      </div>
    </div>
  );
}
