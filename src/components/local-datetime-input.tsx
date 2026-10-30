"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/** ISO → "YYYY-MM-DDTHH:mm" no fuso do aparelho. */
export function isoToLocalInput(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" local → ISO (vazio se inválido). */
export function localInputToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/**
 * Campo de data e hora para formulários de Server Action. O servidor roda em
 * UTC: um "13:30" sem fuso seria lido como 13:30 UTC (10:30 em Brasília). Por
 * isso o valor vai num campo oculto já em ISO, convertido no navegador.
 */
export function LocalDateTimeInput({
  name,
  defaultIso,
  defaultNow,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "name" | "type" | "value" | "defaultValue" | "onChange"> & {
  name: string;
  defaultIso?: string | null;
  /** Sem `defaultIso`, começa com a hora atual. */
  defaultNow?: boolean;
}) {
  const [local, setLocal] = useState("");
  // Só no navegador: o fuso do aparelho é o que vale.
  useEffect(() => {
    if (defaultIso || defaultNow) setLocal(isoToLocalInput(defaultIso));
  }, [defaultIso, defaultNow]);
  return (
    <>
      <Input {...props} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} />
      <input type="hidden" name={name} value={localInputToIso(local)} />
    </>
  );
}
