"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/** ISO (YYYY-MM-DD) → DD/MM/AA para exibição. */
function isoToBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1].slice(-2)}` : "";
}

/** Aplica a máscara DD/MM/AA aos dígitos digitados. */
function maskBr(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 6);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** DD/MM/AA → ISO (YYYY-MM-DD) válida, ou null se incompleta/inválida. */
function brToIso(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(br);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const year = 2000 + Number(m[3]);
  const iso = `${year}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d.getDate() !== dd || d.getMonth() + 1 !== mm) return null;
  return iso;
}

/**
 * Campo de data no formato **DD/MM/AA** (ano com 2 dígitos, 20AA). Guarda o
 * valor como ISO (YYYY-MM-DD) — só chama `onChange` quando a data está completa
 * e válida (ou vazia). Substitui o `<input type="date">` nativo (que não permite
 * ano com 2 dígitos).
 */
export function DateBRInput({
  value,
  onChange,
  className,
  id,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  id?: string;
}) {
  const [text, setText] = useState(() => isoToBr(value));
  useEffect(() => setText(isoToBr(value)), [value]);

  function handle(raw: string) {
    const masked = maskBr(raw);
    setText(masked);
    if (masked === "") {
      onChange("");
      return;
    }
    const iso = brToIso(masked);
    if (iso) onChange(iso);
  }

  return (
    <Input
      id={id}
      className={className}
      value={text}
      onChange={(e) => handle(e.target.value)}
      placeholder="dd/mm/aa"
      inputMode="numeric"
      maxLength={8}
    />
  );
}
