const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const Arrow = () => (<svg {...base} className="arrow"><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const Chevron = () => (<svg {...base}><path d="m6 9 6 6 6-6" /></svg>);
export const Plus = () => (<svg {...base}><path d="M12 5v14M5 12h14" /></svg>);
export const Menu = () => (<svg {...base}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const Close = () => (<svg {...base}><path d="M6 6l12 12M18 6 6 18" /></svg>);

export function Wordmark({ size = "1.5rem" }: { size?: string }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      Synaptic<span className="wordmark-dot" aria-hidden="true" />
    </span>
  );
}
