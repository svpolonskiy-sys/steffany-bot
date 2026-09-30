"use client";
import { useState } from "react";
import { demoIntro, cta } from "@/content/site.uk";
import { demoSteps, sources, conflictSources, type DemoState } from "@/content/demo";
import { SourcePreview } from "../ui/SourcePreview";
import { PrimaryCta } from "../ui/TrackedLink";
import { track } from "@/lib/analytics";

const order: DemoState[] = ["signal", "evidence", "proposal", "completed"];

export function DecisionDemo() {
  const [idx, setIdx] = useState(0);
  const [reached, setReached] = useState(0);
  const [conflict, setConflict] = useState(false);
  const step = demoSteps[idx];

  const go = (n: number) => {
    setIdx(n);
    setReached((r) => Math.max(r, n));
    track("demo_step_view", { step: order[n] });
    if (order[n] === "completed") track("demo_complete");
  };
  const reset = () => { setIdx(0); setReached(0); setConflict(false); track("demo_step_view", { step: "signal" }); };
  const toggleConflict = () => {
    const next = !conflict;
    setConflict(next);
    if (next && idx === 3) { setIdx(2); setReached(2); }
  };

  const blocked = conflict && step.id === "proposal";
  const cards = conflict ? conflictSources : sources;

  return (
    <div className="demo-shell">
      <ol className="demo-steps" aria-label="Кроки сценарію">
        {demoSteps.map((s, n) => (
          <li key={s.id}>
            <button type="button" aria-current={idx === n ? "step" : undefined} disabled={n > reached} onClick={() => go(n)}>
              <span className="n" aria-hidden="true">{n + 1}</span>
              <span><span className="ph">{s.phase}</span><span className="tt">{s.title}</span></span>
            </button>
          </li>
        ))}
      </ol>

      <div className="demo-stage">
        <div className="demo-toolbar">
          <span className="demo-label">{demoIntro.story}</span>
          <button type="button" className="toggle" aria-pressed={conflict} onClick={toggleConflict}>
            <span className="sw" aria-hidden="true" />
            Показати розбіжність у даних
          </button>
        </div>

        <div key={`${step.id}-${conflict}`} className="demo-panel">
          {step.id === "signal" && (
            <>
              <span className="badge warn">Ризик</span>
              <p className="big">Частину замовлень неможливо виконати за поточними залишками.</p>
              <p className="small">Напрям А · Товар А. Джерела: «Замовлення», «Облік запасів».</p>
            </>
          )}
          {step.id === "evidence" && (
            <>
              <span className={`badge ${conflict ? "warn" : "info"}`}>{conflict ? "Розбіжність" : "Підстави"}</span>
              <p className="big">
                {conflict
                  ? "Джерела містять різні залишки. Потрібне уточнення відповідального."
                  : "Можлива причина: товару недостатньо на одному складі, хоча він є на іншому."}
              </p>
              <div className="src-list">
                {cards.map((s) => <SourcePreview key={s.id} name={s.name} fragment={s.fragment} />)}
              </div>
            </>
          )}
          {step.id === "proposal" && (
            <>
              <span className="badge warn">Очікує погодження</span>
              <p className="big">Перевірити можливість перерозподілу запасів.</p>
              <div className="task">
                <b>Підготовлене завдання</b>
                <dl>
                  <dt>Виконавець</dt><dd>Відповідальний менеджер</dd>
                  <dt>Дія</dt><dd>Перевірити перерозподіл Товару А між складами</dd>
                  <dt>Джерела</dt><dd>Замовлення, облік запасів</dd>
                </dl>
              </div>
              <p className="small">{demoIntro.approvalNote}</p>
            </>
          )}
          {step.id === "completed" && (
            <>
              <span className="badge ok">Виконано в демо</span>
              <p className="big">У демо створено завдання для відповідального.</p>
              <ul className="mini-log" aria-label="Міні-журнал">
                <li><time>09:12</time><span>Підготовлено завдання — очікувало погодження</span></li>
                <li><time>09:14</time><span>Погоджено: Керівник напряму (демонстрація)</span></li>
                <li><time>09:14</time><span>Завдання створено — статус «Виконано»</span></li>
              </ul>
            </>
          )}

          <div className="demo-actions">
            {step.id === "completed" ? (
              <>
                <button type="button" className="btn btn-secondary" onClick={reset}>Повторити сценарій</button>
                <PrimaryCta placement="demo_end">{cta.primary}</PrimaryCta>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                aria-disabled={blocked}
                aria-describedby={blocked ? "demo-block" : undefined}
                onClick={() => { if (!blocked) go(idx + 1); }}
              >
                {step.action}
              </button>
            )}
            {blocked && (
              <p id="demo-block" className="demo-reason">
                Погодження недоступне: джерела суперечать одне одному. Вимкніть перемикач розбіжності, щоб продовжити.
              </p>
            )}
          </div>
        </div>

        <ol className="phases" aria-hidden="true">
          {["Бачить", "Радить", "Робить"].map((p) => <li key={p} data-on={p === step.phase}>{p}</li>)}
        </ol>
        <p className="small">{demoIntro.disclaimer}</p>
        <p className="sr-only" role="status" aria-live="polite">Крок {idx + 1} із 4: {step.title}. {blocked ? "Погодження недоступне через розбіжність у даних." : ""}</p>
      </div>
    </div>
  );
}
