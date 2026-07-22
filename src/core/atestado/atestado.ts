/**
 * Modelo de **atestado / declaração** (documento de apoio). Lógica pura, sem
 * React: monta o texto do atestado a partir dos campos. Apoio à documentação —
 * validar com a equipe; o CID só entra com autorização do paciente.
 */

export type AtestadoTipo = "AFASTAMENTO" | "COMPARECIMENTO" | "ACOMPANHANTE";

export const ATESTADO_TIPO_OPTIONS: { value: AtestadoTipo; label: string; titulo: string }[] = [
  { value: "AFASTAMENTO", label: "Afastamento", titulo: "ATESTADO MÉDICO" },
  { value: "COMPARECIMENTO", label: "Comparecimento", titulo: "DECLARAÇÃO DE COMPARECIMENTO" },
  { value: "ACOMPANHANTE", label: "Acompanhante", titulo: "DECLARAÇÃO DE ACOMPANHANTE" },
];

export interface AtestadoForm {
  tipo: AtestadoTipo;
  paciente: string;
  documento: string; // RG / prontuário
  /** Nome do(a) acompanhante (tipo ACOMPANHANTE). */
  acompanhante: string;
  incluirCid: boolean;
  cid: string;
  dias: string; // afastamento
  inicio: string; // início do afastamento (ISO) — padrão: data do atestado
  horaInicio: string; // comparecimento/acompanhante
  horaFim: string;
  observacoes: string;
  cidade: string;
  data: string; // ISO
}

export function emptyAtestado(today: string): AtestadoForm {
  return {
    tipo: "AFASTAMENTO",
    paciente: "",
    documento: "",
    acompanhante: "",
    incluirCid: false,
    cid: "",
    dias: "",
    inicio: today,
    horaInicio: "",
    horaFim: "",
    observacoes: "",
    cidade: "Uberaba-MG",
    data: today,
  };
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** "10 de Abril de 2026" a partir de uma data ISO. */
export function dataExtenso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function dateBR(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

// --- Número por extenso (0–999), suficiente para dias de afastamento ---
const UNI = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_ESP = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

export function numeroExtenso(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 999) return "";
  if (n === 0) return "zero";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const parts: string[] = [];
  if (c > 0) parts.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 10) parts.push(UNI[resto]);
    else if (resto < 20) parts.push(DEZ_ESP[resto - 10]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      parts.push(u > 0 ? `${DEZENAS[d]} e ${UNI[u]}` : DEZENAS[d]);
    }
  }
  return parts.join(" e ");
}

/** Título conforme o tipo. */
export function atestadoTitulo(form: AtestadoForm): string {
  return ATESTADO_TIPO_OPTIONS.find((o) => o.value === form.tipo)?.titulo ?? "ATESTADO MÉDICO";
}

function docPart(documento: string): string {
  const d = documento.trim();
  return d ? `, portador(a) do documento ${d},` : "";
}

function horaPart(form: AtestadoForm): string {
  const a = form.horaInicio.trim();
  const b = form.horaFim.trim();
  if (a && b) return `, no período das ${a} às ${b}`;
  if (a) return `, a partir das ${a}`;
  return "";
}

/** Corpo do atestado (parágrafo), conforme o tipo. */
export function atestadoCorpo(form: AtestadoForm): string {
  const pac = form.paciente.trim() || "___________________________";
  const dataBR = dateBR(form.data);
  switch (form.tipo) {
    case "COMPARECIMENTO":
      return `Declaro, para os devidos fins, que o(a) Sr.(a) ${pac}${docPart(
        form.documento,
      )} compareceu a esta unidade de saúde para atendimento médico no dia ${dataBR}${horaPart(form)}.`;
    case "ACOMPANHANTE": {
      const acomp = form.acompanhante.trim() || "___________________________";
      return `Declaro, para os devidos fins, que o(a) Sr.(a) ${acomp}${docPart(
        form.documento,
      )} compareceu a esta unidade de saúde na condição de acompanhante de ${pac}, para atendimento médico no dia ${dataBR}${horaPart(
        form,
      )}.`;
    }
    case "AFASTAMENTO":
    default: {
      const n = parseInt(form.dias, 10);
      const ext = Number.isFinite(n) && n > 0 ? numeroExtenso(n) : "";
      const diasStr =
        Number.isFinite(n) && n > 0
          ? `por ${n}${ext ? ` (${ext})` : ""} dia${n > 1 ? "s" : ""}`
          : "por ____ (______) dias";
      const inicioBR = dateBR(form.inicio);
      const desde = inicioBR ? `, a partir de ${inicioBR}` : "";
      return `Atesto, para os devidos fins, que o(a) Sr.(a) ${pac}${docPart(
        form.documento,
      )} esteve sob meus cuidados médicos nesta data, devendo permanecer afastado(a) de suas atividades ${diasStr}${desde}.`;
    }
  }
}

/** Linha do CID (apenas quando incluído e informado). */
export function atestadoCid(form: AtestadoForm): string {
  return form.incluirCid && form.cid.trim() ? `CID-10: ${form.cid.trim().toUpperCase()}` : "";
}

/** Texto completo do atestado (para cópia). */
export function buildAtestadoText(form: AtestadoForm): string {
  const L: string[] = [];
  L.push(atestadoTitulo(form));
  L.push("");
  L.push(atestadoCorpo(form));
  const cid = atestadoCid(form);
  if (cid) L.push(cid);
  if (form.observacoes.trim()) L.push(form.observacoes.trim());
  L.push("");
  const local = [form.cidade.trim(), dataExtenso(form.data)].filter(Boolean).join(", ");
  if (local) L.push(local);
  L.push("");
  L.push("__________________________________");
  L.push("Médico Assistente");
  return L.join("\n");
}
