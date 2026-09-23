/**
 * Importa os antecedentes da admissão do PSGO (`clinical_summary.form`) para o
 * cabeçalho da Enfermaria GO Geral — a paciente não precisa ser redigitada.
 */
import type { PsgoForm } from "@/core/psgo/types";
import { renderPsgo } from "@/core/psgo/render";
import { emptyHistory, type WardHistory } from "./types";

/** Valor após "RÓTULO:" + linhas indentadas seguintes (MEU / FEZ USO). */
function field(lines: string[], label: string): string {
  const i = lines.findIndex((l) => l.trim().toUpperCase().startsWith(`${label}:`));
  if (i < 0) return "";
  const first = lines[i]!.slice(lines[i]!.indexOf(":") + 1).trim();
  const rest: string[] = [];
  for (let j = i + 1; j < lines.length && /^\s{4,}\S/.test(lines[j]!); j++) rest.push(lines[j]!.trim());
  return [first, ...rest].filter(Boolean).join(" + ");
}

/** Bloco após um título sem ":" (ex.: "SOROLOGIAS") até a próxima linha em branco. */
function block(lines: string[], title: string): string {
  const i = lines.findIndex((l) => l.trim().toUpperCase() === title);
  if (i < 0) return "";
  const out: string[] = [];
  for (let j = i + 1; j < lines.length && lines[j]!.trim(); j++) out.push(lines[j]!.trim());
  return out.join(" / ");
}

export function historyFromPsgo(summary: Record<string, unknown> | null | undefined): WardHistory {
  const h = emptyHistory();
  const form = (summary as { form?: PsgoForm } | null)?.form;
  if (!form || typeof form !== "object") return h;
  let text = "";
  try {
    text = renderPsgo(form);
  } catch {
    return h;
  }
  const lines = text.split("\n");
  return {
    ...h,
    origin: (form.origin ?? "").toUpperCase(),
    coombsIndirect: field(lines, "CI"),
    cmb: field(lines, "CMB"),
    meu: field(lines, "MEU"),
    pastMeds: field(lines, "FEZ USO"),
    surgeries: field(lines, "CIRURGIAS"),
    allergies: field(lines, "ALERGIAS"),
    hcv: field(lines, "HCV"),
    prenatalVisits: field(lines, "CONSULTAS PRÉ-NATAL"),
    serologies: block(lines, "SOROLOGIAS"),
  };
}
