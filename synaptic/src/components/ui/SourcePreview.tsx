"use client";
import { useState, useId } from "react";
import { Chevron } from "./icons";

export function SourcePreview({ name, fragment }: { name: string; fragment: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="src">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span>Джерело: {name}</span>
        <Chevron />
      </button>
      {open && <p id={id}>«{fragment}» <span className="small">(демонстраційний фрагмент)</span></p>}
    </div>
  );
}
