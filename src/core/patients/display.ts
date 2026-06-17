import { resolveDating } from "@/core/obstetric/gestational-age";
import type { Patient } from "./types";

/** Best available "today" gestational-age label, e.g. "39+2". */
export function currentGaLabel(p: Pick<Patient, "lmp" | "gaWeeks" | "gaDays">): string | null {
  if (p.lmp) {
    try {
      return resolveDating({ lmp: new Date(`${p.lmp}T00:00:00`) }).ga.label;
    } catch {
      // fall through to stored snapshot
    }
  }
  if (p.gaWeeks != null) return `${p.gaWeeks}+${p.gaDays ?? 0}`;
  return null;
}
