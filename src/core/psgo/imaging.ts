/**
 * Exames de imagem (USG obstétrico) do PSGO: cada exame tem IG própria e a
 * plataforma calcula percentis de PFE/CA (Hadlock) e Doppler (FMF).
 */
import { efwCentile, acCentile } from "@/core/fmf/biometry";
import { utpiCentile, mcaPsvCentile, mcaPsvMoM, dvpiCentile } from "@/core/fmf/doppler";
import { formatCentile } from "@/core/fmf/centile";

export interface ImagingExam {
  id: string;
  date?: string;
  gaWeeks?: number;
  gaDays?: number;
  efw?: string; // PFE (g)
  ac?: string; // CA (mm)
  utpi?: string; // IP médio das aa. uterinas
  mcaPsv?: string; // ACM-PSV (cm/s)
  dvpi?: string; // DV-IP
  ila?: string;
  placenta?: string;
  presentation?: string;
  notes?: string;
}

export function examGaDays(e: Pick<ImagingExam, "gaWeeks" | "gaDays">): number | null {
  if (e.gaWeeks == null) return null;
  return e.gaWeeks * 7 + (e.gaDays ?? 0);
}

function pctSuffix(c: number | null): string {
  const f = formatCentile(c);
  return f ? ` (p${f})` : "";
}

function dateBR(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

/** Linha de prontuário de um exame de imagem, com percentis calculados. */
export function renderImagingExam(e: ImagingExam): string {
  const gaDays = examGaDays(e);
  const head: string[] = [];
  const datePart = dateBR(e.date);
  const gaPart = e.gaWeeks != null ? `IG ${e.gaWeeks}s${e.gaDays ? ` ${e.gaDays}d` : ""}` : "";
  const label = [datePart, gaPart].filter(Boolean).join(" - ");

  const efw = e.efw ? Number(e.efw) : null;
  if (efw) {
    const c = gaDays != null ? efwCentile(efw, gaDays) : null;
    head.push(`PFE ${e.efw}G${pctSuffix(c)}`);
  }
  const ac = e.ac ? Number(e.ac) : null;
  if (ac) {
    const c = gaDays != null ? acCentile(ac, gaDays) : null;
    head.push(`CA ${e.ac}MM${pctSuffix(c)}`);
  }
  if (e.ila) head.push(`ILA ${e.ila}`);
  if (e.placenta) head.push(`PLACENTA ${e.placenta}`);
  if (e.presentation) head.push(`APRESENTAÇÃO ${e.presentation}`);

  const utpi = e.utpi ? Number(e.utpi) : null;
  if (utpi) {
    const c = gaDays != null ? utpiCentile(utpi, gaDays) : null;
    head.push(`IP-AUT ${e.utpi}${pctSuffix(c)}`);
  }
  const mca = e.mcaPsv ? Number(e.mcaPsv) : null;
  if (mca) {
    const c = gaDays != null ? mcaPsvCentile(mca, gaDays) : null;
    const mom = gaDays != null ? mcaPsvMoM(mca, gaDays) : null;
    const momPart = mom ? ` / ${mom.toFixed(2)} MoM` : "";
    head.push(`ACM-PSV ${e.mcaPsv}${pctSuffix(c)}${momPart}`);
  }
  const dv = e.dvpi ? Number(e.dvpi) : null;
  if (dv) {
    const c = gaDays != null ? dvpiCentile(dv, gaDays) : null;
    head.push(`DV-IP ${e.dvpi}${pctSuffix(c)}`);
  }
  if (e.notes) head.push(e.notes);

  return `-(${label}): ${head.join(" / ")}`;
}

export function renderImaging(exams: ImagingExam[]): string {
  return exams
    .filter((e) => e.date || e.efw || e.ac || e.utpi || e.mcaPsv || e.dvpi || e.ila || e.notes)
    .map(renderImagingExam)
    .join("\n");
}
