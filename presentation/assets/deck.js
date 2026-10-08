/* =========================================================
   AI SHOW — deck engine
   No dependencies. Works from file:// (no server, no internet).
   ========================================================= */
(function () {
  "use strict";

  const stage = document.getElementById("stage");
  const slides = Array.from(stage.querySelectorAll(".slide"));
  const hooks = window.SLIDE_HOOKS || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  let cur = -1, step = 0, returnTo = 0;
  let showStart = null;          // when the show clock was started
  let slideStart = Date.now();
  let presenter = null;
  let jumpBuf = "";

  /* ---------- per-slide metadata ---------- */
  slides.forEach((s, i) => {
    s.dataset.index = i;
    s.dataset.section = s.dataset.section || "main";
    let max = parseInt(s.dataset.steps || "0", 10);
    $$("[data-f]", s).forEach(el => { max = Math.max(max, parseInt(el.dataset.f, 10)); });
    $$("[data-out]", s).forEach(el => { max = Math.max(max, parseInt(el.dataset.out, 10)); });
    s._max = max;
  });
  const main = slides.filter(s => s.dataset.section === "main");
  const plannedBefore = []; // cumulative planned seconds before each main slide
  let acc = 0;
  main.forEach(s => { plannedBefore[s.dataset.index] = acc; acc += parseInt(s.dataset.time || "0", 10); });
  const plannedTotal = acc;
  returnTo = main.length ? +main[0].dataset.index : 0;

  /* ---------- kinetic typography: split words ---------- */
  $$(".kin").forEach(el => {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) {
          const parts = ch.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "w"; w.style.setProperty("--i", i++); w.textContent = p;
            frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== "BR") {
          if (ch.children.length === 0 && !/\s/.test(ch.textContent.trim())) {
            ch.classList.add("w"); ch.style.setProperty("--i", i++);
          } else walk(ch);
        }
      });
    };
    walk(el);
  });

  /* ---------- images / video placeholders ---------- */
  $$(".imgbox").forEach(box => {
    const media = box.querySelector("img, video");
    if (!media) { box.classList.add("missing"); return; }
    const miss = () => box.classList.add("missing");
    if (media.tagName === "IMG") {
      media.addEventListener("error", miss);
      if (media.complete && media.naturalWidth === 0) miss();
    } else {
      const src = media.querySelector("source");
      (src || media).addEventListener("error", miss);
      setTimeout(() => { if (media.networkState === 3 || media.readyState === 0) miss(); }, 1200);
    }
  });

  /* ---------- scaling ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  window.addEventListener("resize", fit); fit();

  /* ---------- rendering ---------- */
  function applyStep(s, n) {
    s.dataset.step = n;
    $$("[data-f]", s).forEach(el => {
      const f = parseInt(el.dataset.f, 10);
      el.classList.toggle("on", n >= f);
      el.classList.toggle("cur", n === f);
    });
    $$("[data-out]", s).forEach(el => el.classList.toggle("off", n >= parseInt(el.dataset.out, 10)));
    const h = hooks[s.id];
    if (h && h.step) h.step(s, n);
  }

  function go(i, n = 0) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const prev = slides[cur];
    const next = slides[i];
    if (prev !== next) {
      if (prev) {
        prev.classList.remove("active");
        const h = hooks[prev.id]; if (h && h.leave) h.leave(prev);
      }
      next.classList.add("active");
      slideStart = Date.now();
      cur = i;
      const h = hooks[next.id]; if (h && h.enter) h.enter(next);
    }
    step = Math.max(0, Math.min(next._max, n));
    applyStep(next, step);
    if (next.dataset.section === "main" && showStart === null) showStart = Date.now();
    updateChrome();
    try { history.replaceState(null, "", "#" + (i + 1) + (step ? "." + step : "")); } catch (e) {}
    renderPresenter();
  }

  function sectionNeighbours(dir) {
    const sec = slides[cur].dataset.section;
    let j = cur + dir;
    while (j >= 0 && j < slides.length && slides[j].dataset.section !== sec) j += dir;
    return (j >= 0 && j < slides.length) ? j : -1;
  }
  function next() {
    const s = slides[cur];
    if (step < s._max) { step++; applyStep(s, step); updateChrome(); renderPresenter(); return; }
    const j = sectionNeighbours(1);
    if (j >= 0) go(j, 0);
    else if (s.dataset.section === "lobby") go(+main[0].dataset.index, 0);
  }
  function prev() {
    const s = slides[cur];
    if (step > 0) { step--; applyStep(s, step); updateChrome(); renderPresenter(); return; }
    const j = sectionNeighbours(-1); if (j >= 0) go(j, slides[j]._max);
  }
  function jumpSection(sec) {
    if (slides[cur].dataset.section === "main") returnTo = cur;
    const j = slides.findIndex(s => s.dataset.section === sec);
    if (j >= 0) go(j, 0);
  }

  /* ---------- chrome ---------- */
  const progress = $("#progress"), blockLabel = $("#block-label"), slideNum = $("#slide-num"), stepdots = $("#stepdots");
  function updateChrome() {
    const s = slides[cur];
    const mi = main.indexOf(s);
    if (mi >= 0) {
      progress.style.width = ((mi + (s._max ? step / (s._max + 1) : 0)) / (main.length - 1) * 100) + "%";
      slideNum.textContent = String(mi + 1).padStart(2, "0") + " / " + main.length;
    } else {
      slideNum.textContent = s.dataset.section.toUpperCase() + " · " + (slides.filter(x => x.dataset.section === s.dataset.section).indexOf(s) + 1);
    }
    blockLabel.textContent = s.dataset.block || "";
    stepdots.innerHTML = s._max ? Array.from({ length: s._max + 1 }, (_, k) => `<i class="${k <= step ? "on" : ""}"></i>`).join("") : "";
    const n = $("#notes-ov");
    n.innerHTML = `<h4>${mi >= 0 ? "Слайд " + (mi + 1) : s.dataset.section} · ${s.dataset.title || ""} · ${fmt(parseInt(s.dataset.time || 0, 10))} · крок ${step}/${s._max}</h4>` + notesHTML(s);
    $$("#grid-ov button").forEach(b => b.classList.toggle("cur", +b.dataset.i === cur));
  }
  function notesHTML(s) { const a = s.querySelector("aside.notes"); return a ? a.innerHTML : "<p>—</p>"; }
  function fmt(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }

  /* ---------- grid overview ---------- */
  (function buildGrid() {
    const g = $("#grid-ov");
    const groups = {};
    slides.forEach((s, i) => { const k = s.dataset.section; (groups[k] = groups[k] || []).push([s, i]); });
    const names = { main: "Основне шоу", fallback: "Fallback (X) — якщо live-демо не працює", appendix: "Appendix (A) — для Q&A" };
    g.innerHTML = Object.keys(groups).map(k => `<h3>${names[k] || k}</h3><div class="g">` +
      groups[k].map(([s, i], n) => `<button data-i="${i}"><b>${String(n + 1).padStart(2, "0")} · ${fmt(+s.dataset.time || 0)} · ${s.dataset.block || ""}</b>${s.dataset.title || s.id}</button>`).join("") + `</div>`).join("");
    g.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; document.body.classList.remove("show-grid"); go(+b.dataset.i, 0); });
  })();

  /* ---------- presenter window ---------- */
  function openPresenter() {
    if (presenter && !presenter.closed) { presenter.focus(); return; }
    presenter = window.open("", "ai-show-presenter", "width=1280,height=820");
    if (!presenter) { alert("Дозвольте pop-up вікна для presenter view."); return; }
    const d = presenter.document;
    d.open();
    d.write(`<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>Presenter · AI Show</title>
<style>
 body{margin:0;background:#0b0b0f;color:#eee;font:18px/1.5 Inter,Segoe UI,Arial,sans-serif;display:grid;grid-template-columns:1.35fr 1fr;grid-template-rows:auto 1fr auto;height:100vh}
 header{grid-column:1/3;display:flex;gap:28px;align-items:center;padding:14px 22px;background:#111117;border-bottom:1px solid #222}
 .big{font:700 40px/1 ui-monospace,Consolas,monospace;color:#c4ff2e} .lbl{font:600 11px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#777}
 .ahead{color:#c4ff2e}.behind{color:#ff6a1a}
 #cur{padding:22px 28px;overflow:auto;border-right:1px solid #222} #nx{padding:22px 28px;overflow:auto}
 h1{font-size:30px;margin:0 0 6px;letter-spacing:-.02em} h2{font-size:22px;margin:0 0 8px;color:#aaa}
 .meta{font:600 13px ui-monospace,monospace;color:#c4ff2e;letter-spacing:.08em;margin-bottom:16px}
 #notes p{margin:0 0 12px} #notes b{color:#fff} #notes i{color:#9ad}
 footer{grid-column:1/3;display:flex;gap:10px;padding:12px 22px;background:#111117;border-top:1px solid #222}
 button{background:#1d1d25;color:#eee;border:1px solid #333;border-radius:8px;padding:10px 18px;font:600 15px Inter,Arial;cursor:pointer} button:hover{border-color:#c4ff2e}
 .bar{height:6px;background:#222;border-radius:3px;overflow:hidden;width:260px}.bar i{display:block;height:100%;background:linear-gradient(90deg,#2f5bff,#8a3cff,#c4ff2e)}
</style></head><body>
<header>
 <div><div class="lbl">Час шоу</div><div class="big" id="clock">0:00</div></div>
 <div><div class="lbl">План</div><div class="big" id="plan" style="color:#bbb">0:00</div></div>
 <div><div class="lbl">Темп</div><div class="big" id="delta">—</div></div>
 <div><div class="lbl">На цьому слайді</div><div class="big" id="sl" style="color:#bbb">0:00</div></div>
 <div style="flex:1"></div>
 <div><div class="lbl">Прогрес</div><div class="bar"><i id="pb"></i></div><div class="lbl" id="pos" style="margin-top:6px"></div></div>
</header>
<section id="cur"><div class="meta" id="meta"></div><h1 id="title"></h1><div id="notes"></div></section>
<section id="nx"><div class="lbl">Далі</div><h2 id="ntitle"></h2><div id="nnotes" style="color:#999;font-size:15px"></div></section>
<footer>
 <button data-a="prev">← Назад</button><button data-a="next">Далі →</button>
 <button data-a="start">▶ Старт / скинути годинник</button><button data-a="black">■ Чорний екран (B)</button>
 <button data-a="fallback">Fallback (X)</button><button data-a="appendix">Appendix (A)</button><button data-a="back">↩ Повернутися в шоу (Esc)</button>
</footer></body></html>`);
    d.close();
    d.addEventListener("keydown", onKey);
    d.querySelector("footer").addEventListener("click", e => {
      const a = e.target.dataset.a; if (!a) return;
      ({ prev, next, start: () => { showStart = Date.now(); }, black: toggleBlack,
         fallback: () => jumpSection("fallback"), appendix: () => jumpSection("appendix"), back: backToShow })[a]();
      renderPresenter();
    });
    renderPresenter();
  }
  function renderPresenter() {
    if (!presenter || presenter.closed) return;
    const d = presenter.document, s = slides[cur];
    const mi = main.indexOf(s);
    const nxt = step < s._max ? null : slides[sectionNeighbours(1)];
    d.getElementById("meta").textContent = `${s.dataset.block || s.dataset.section} · ${mi >= 0 ? "слайд " + (mi + 1) + "/" + main.length : s.dataset.section} · крок ${step}/${s._max} · план ${fmt(+s.dataset.time || 0)}`;
    d.getElementById("title").textContent = s.dataset.title || "";
    d.getElementById("notes").innerHTML = notesHTML(s);
    d.getElementById("ntitle").textContent = nxt ? (nxt.dataset.title || "") : (step < s._max ? `Наступний крок (${step + 1}/${s._max}) на цьому слайді` : "— кінець секції —");
    d.getElementById("nnotes").innerHTML = nxt ? notesHTML(nxt) : "";
    d.getElementById("pos").textContent = mi >= 0 ? `${mi + 1} / ${main.length}` : s.dataset.section;
    d.getElementById("pb").style.width = (mi >= 0 ? (mi / (main.length - 1)) * 100 : 0) + "%";
    tickPresenter();
  }
  function tickPresenter() {
    if (!presenter || presenter.closed) return;
    const d = presenter.document, s = slides[cur];
    const el = showStart ? (Date.now() - showStart) / 1000 : 0;
    d.getElementById("clock").textContent = fmt(el);
    d.getElementById("sl").textContent = fmt((Date.now() - slideStart) / 1000);
    const pb = plannedBefore[cur];
    d.getElementById("plan").textContent = pb !== undefined ? fmt(pb) + " / " + fmt(plannedTotal) : "—";
    const dl = d.getElementById("delta");
    if (showStart && pb !== undefined) {
      const diff = el - pb; // >0 = behind schedule
      dl.textContent = (diff > 0 ? "+" : "−") + fmt(Math.abs(diff));
      dl.className = "big " + (diff > 60 ? "behind" : "ahead");
    } else { dl.textContent = "—"; dl.className = "big"; }
  }
  setInterval(tickPresenter, 1000);

  /* ---------- misc toggles ---------- */
  function toggleBlack() { document.body.classList.toggle("blackout"); }
  function backToShow() { if (slides[cur].dataset.section !== "main") go(returnTo, slides[returnTo]._max); }
  function fullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  }

  /* ---------- keyboard ---------- */
  function onKey(e) {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
      if (e.key === "Escape") t.blur();
      return;
    }
    const k = e.key;
    const h = hooks[slides[cur].id];
    if (h && h.key && h.key(slides[cur], e) === true) { e.preventDefault(); return; }
    if (/^[0-9]$/.test(k)) { jumpBuf += k; showJump(); return; }
    if (k === "Enter" && jumpBuf) { const n = parseInt(jumpBuf, 10); jumpBuf = ""; showJump(); if (main[n - 1]) go(+main[n - 1].dataset.index, 0); return; }
    switch (k) {
      case "ArrowRight": case "ArrowDown": case " ": case "PageDown": case "Enter": e.preventDefault(); next(); break;
      case "ArrowLeft": case "ArrowUp": case "PageUp": case "Backspace": e.preventDefault(); prev(); break;
      case "Home": go(0); break;
      case "End": go(+main[main.length - 1].dataset.index); break;
      case "f": case "F": fullscreen(); break;
      case "n": case "N": document.body.classList.toggle("show-notes"); break;
      case "g": case "G": case "o": case "O": document.body.classList.toggle("show-grid"); break;
      case "h": case "H": document.body.classList.toggle("no-chrome"); break;
      case "p": case "P": openPresenter(); break;
      case "b": case "B": case ".": toggleBlack(); break;
      case "x": case "X": jumpSection("fallback"); break;
      case "a": case "A": jumpSection("appendix"); break;
      case "l": case "L": jumpSection("lobby"); break;
      case "?": document.body.classList.toggle("show-help"); break;
      case "Escape":
        if (jumpBuf) { jumpBuf = ""; showJump(); break; }
        if (document.body.matches(".show-grid,.show-help,.show-notes,.blackout")) { document.body.classList.remove("show-grid", "show-help", "show-notes", "blackout"); break; }
        backToShow(); break;
    }
  }
  function showJump() { const j = $("#jump"); j.style.display = jumpBuf ? "block" : "none"; j.textContent = "→ " + jumpBuf; }
  document.addEventListener("keydown", onKey);

  // mouse: click on right 2/3 = next, left 1/3 = prev (ignored on interactive elements)
  stage.addEventListener("click", e => {
    if (e.target.closest("button, input, a, .timer, [data-click]")) return;
    const r = stage.getBoundingClientRect();
    ((e.clientX - r.left) < r.width / 3 ? prev : next)();
  });
  let idle; document.addEventListener("mousemove", () => { document.body.classList.remove("hide-cursor"); clearTimeout(idle); idle = setTimeout(() => document.body.classList.add("hide-cursor"), 2200); });

  /* ---------- helpers exposed for slide hooks ---------- */
  window.Deck = {
    go, next, prev,
    tween(el, from, to, dur, format) {
      const t0 = performance.now(); cancelAnimationFrame(el._raf);
      const f = format || (v => Math.round(v).toLocaleString("uk-UA").replace(/\s/g, " "));
      const loop = now => { const p = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - p, 4); el.textContent = f(from + (to - from) * e); if (p < 1) el._raf = requestAnimationFrame(loop); };
      el._raf = requestAnimationFrame(loop);
    },
    get step() { return step; }
  };

  /* ---------- boot ---------- */
  const m = (location.hash || "").match(/^#(\d+)(?:\.(\d+))?/);
  go(m ? parseInt(m[1], 10) - 1 : 0, m && m[2] ? parseInt(m[2], 10) : 0);
})();
