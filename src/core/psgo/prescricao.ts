/**
 * Módulo de prescrição (receita médica) do PSGO — modelo estruturado espelhando
 * o `receitaMedicamento` do e-SUS APS PEC (tipo de receita, princípio ativo,
 * concentração, forma, via, dose + frequência + duração, quantidade a dispensar
 * e recomendações), reimplementado na stack Easy-GO. Puro (roda no cliente).
 *
 * NÃO é motor de decisão: doses/posologias são digitadas pela equipe. Nenhum
 * coeficiente/dose é fabricado (ver `CLAUDE.md`). Saída em MAIÚSCULAS, no padrão
 * do prontuário, pronta para copiar/imprimir.
 */
import { parseDecimal } from "@/lib/num";

// --- Tipos de receita: apenas Comum e Especial (idênticas, só muda o título) ---
export type TipoReceita = "COMUM" | "ESPECIAL";

export const TIPO_RECEITA_OPTIONS: { value: TipoReceita; label: string; titulo: string }[] = [
  { value: "COMUM", label: "Comum", titulo: "RECEITUÁRIO" },
  { value: "ESPECIAL", label: "Especial", titulo: "RECEITUÁRIO DE CONTROLE ESPECIAL" },
];

// --- Frequência (enum `tipoFrequenciaDose`: INTERVALO/FREQUENCIA/TURNO + único/contínuo) ---
export type TipoFrequencia = "INTERVALO" | "FREQUENCIA" | "TURNO" | "CONTINUO" | "UNICA";

export const TIPO_FREQUENCIA_OPTIONS: { value: TipoFrequencia; label: string }[] = [
  { value: "INTERVALO", label: "A cada (h)" },
  { value: "FREQUENCIA", label: "Vezes/dia" },
  { value: "TURNO", label: "Turnos" },
  { value: "CONTINUO", label: "Uso contínuo" },
  { value: "UNICA", label: "Dose única" },
];

export type MedidaTempo = "HORA" | "DIA" | "SEMANA" | "MES";
const MEDIDA_TEMPO_LABEL: Record<MedidaTempo, [string, string]> = {
  HORA: ["HORA", "HORAS"],
  DIA: ["DIA", "DIAS"],
  SEMANA: ["SEMANA", "SEMANAS"],
  MES: ["MÊS", "MESES"],
};
export const MEDIDA_TEMPO_OPTIONS: { value: MedidaTempo; label: string }[] = [
  { value: "DIA", label: "dias" },
  { value: "SEMANA", label: "semanas" },
  { value: "MES", label: "meses" },
  { value: "HORA", label: "horas" },
];

// Momento em relação às refeições (enum de refeição do e-SUS).
export type MomentoRefeicao = "" | "JEJUM" | "PREPRANDIAL" | "POSPRANDIAL" | "AO_DEITAR";
const MOMENTO_TEXT: Record<Exclude<MomentoRefeicao, "">, string> = {
  JEJUM: "EM JEJUM",
  PREPRANDIAL: "ANTES DAS REFEIÇÕES",
  POSPRANDIAL: "APÓS AS REFEIÇÕES",
  AO_DEITAR: "AO DEITAR",
};
export const MOMENTO_OPTIONS: { value: MomentoRefeicao; label: string }[] = [
  { value: "", label: "—" },
  { value: "JEJUM", label: "Em jejum" },
  { value: "PREPRANDIAL", label: "Antes das refeições" },
  { value: "POSPRANDIAL", label: "Após as refeições" },
  { value: "AO_DEITAR", label: "Ao deitar" },
];

// Vias de administração (aplicacaoMedicamento).
export const VIA_OPTIONS = [
  "Oral",
  "Sublingual",
  "Retal",
  "Vaginal",
  "Intramuscular",
  "Intravenosa",
  "Subcutânea",
  "Tópica",
  "Inalatória",
  "Nasal",
  "Ocular",
  "Otológica",
  "Transdérmica",
];

// Unidades de dose (unidadeMedidaDose) com plural.
export const UNIDADE_DOSE_OPTIONS: { value: string; plural: string }[] = [
  { value: "comprimido", plural: "comprimidos" },
  { value: "cápsula", plural: "cápsulas" },
  { value: "gota", plural: "gotas" },
  { value: "mL", plural: "mL" },
  { value: "mg", plural: "mg" },
  { value: "g", plural: "g" },
  { value: "sachê", plural: "sachês" },
  { value: "ampola", plural: "ampolas" },
  { value: "frasco", plural: "frascos" },
  { value: "aplicação", plural: "aplicações" },
  { value: "jato", plural: "jatos" },
  { value: "UI", plural: "UI" },
  { value: "unidade", plural: "unidades" },
];

// Turnos (TipoFrequencia TURNO).
export const TURNO_OPTIONS: { value: string; text: string }[] = [
  { value: "Manhã", text: "PELA MANHÃ" },
  { value: "Tarde", text: "À TARDE" },
  { value: "Noite", text: "À NOITE" },
];

export interface PrescricaoItem {
  id: string;
  tipoReceita: TipoReceita;
  principioAtivo: string; // DCB/genérico
  concentracao: string; // ex.: 500 mg
  formaFarmaceutica: string; // ex.: comprimido
  via: string; // aplicacaoMedicamento
  // Dose + frequência (estruturado)
  qtDose: string;
  unidadeDose: string;
  tipoFrequencia: TipoFrequencia;
  intervaloHoras: string; // INTERVALO
  vezesAoDia: string; // FREQUENCIA
  turnos: string[]; // TURNO
  momento: MomentoRefeicao;
  duracaoQt: string;
  duracaoUnidade: MedidaTempo;
  quantidadeReceitada: string; // total a dispensar
  recomendacoes: string;
  // Registro manual (posologia livre) — quando o estruturado não basta.
  registroManual: boolean;
  posologiaManual: string;
}

export function emptyPrescricaoItem(id: string, tipoReceita: TipoReceita = "COMUM"): PrescricaoItem {
  return {
    id,
    tipoReceita,
    principioAtivo: "",
    concentracao: "",
    formaFarmaceutica: "",
    via: "Oral",
    qtDose: "",
    unidadeDose: "comprimido",
    tipoFrequencia: "INTERVALO",
    intervaloHoras: "",
    vezesAoDia: "",
    turnos: [],
    momento: "",
    duracaoQt: "",
    duracaoUnidade: "DIA",
    quantidadeReceitada: "",
    recomendacoes: "",
    registroManual: false,
    posologiaManual: "",
  };
}

/** Junção natural: "a", "a e b", "a, b e c". */
function joinNat(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function pluralUnidade(unidade: string, qt: string): string {
  const n = parseDecimal(qt);
  if (n == null || n <= 1) return unidade;
  const found = UNIDADE_DOSE_OPTIONS.find((u) => u.value === unidade);
  return found ? found.plural : unidade;
}

// Sub-helpers em caixa mista (como no e-SUS), reaproveitados na impressão.

/** Dose: "1 comprimido" (com plural). */
export function doseText(item: PrescricaoItem): string {
  if (!item.qtDose.trim()) return "";
  return `${item.qtDose.trim()} ${pluralUnidade(item.unidadeDose, item.qtDose)}`;
}

/** Via (como digitada). */
export function viaText(item: PrescricaoItem): string {
  return item.via.trim();
}

/** Frequência: "a cada 6 horas" / "3 vezes ao dia" / turnos / uso contínuo / dose única. */
export function frequenciaText(item: PrescricaoItem): string {
  switch (item.tipoFrequencia) {
    case "INTERVALO":
      return item.intervaloHoras.trim() ? `a cada ${item.intervaloHoras.trim()} horas` : "";
    case "FREQUENCIA": {
      const n = item.vezesAoDia.trim();
      return n ? (n === "1" ? "1 vez ao dia" : `${n} vezes ao dia`) : "";
    }
    case "TURNO": {
      const t = item.turnos
        .map((v) => TURNO_OPTIONS.find((o) => o.value === v)?.text.toLowerCase() ?? "")
        .filter(Boolean);
      return t.length ? joinNat(t) : "";
    }
    case "CONTINUO":
      return "uso contínuo";
    case "UNICA":
      return "dose única";
  }
  return "";
}

/** Duração: "5 dias" (vazio para contínuo/única). */
export function duracaoText(item: PrescricaoItem): string {
  if (item.tipoFrequencia === "CONTINUO" || item.tipoFrequencia === "UNICA") return "";
  if (!item.duracaoQt.trim()) return "";
  const [sing, plur] = MEDIDA_TEMPO_LABEL[item.duracaoUnidade];
  const n = parseDecimal(item.duracaoQt);
  return `${item.duracaoQt.trim()} ${(n === 1 ? sing : plur).toLowerCase()}`;
}

/** Momento em relação às refeições (caixa mista). */
export function momentoText(item: PrescricaoItem): string {
  return item.momento ? MOMENTO_TEXT[item.momento].toLowerCase() : "";
}

/** Posologia legível (caixa mista) dos campos estruturados ou o texto manual. */
export function buildPosologia(item: PrescricaoItem): string {
  if (item.registroManual) return item.posologiaManual.trim();
  const via = viaText(item);
  const dur = duracaoText(item);
  const parts = [
    doseText(item),
    via ? `via ${via.toLowerCase()}` : "",
    frequenciaText(item),
    dur ? `por ${dur}` : "",
    momentoText(item),
  ].filter(Boolean);
  return parts.join(", ");
}

/** Cabeçalho do medicamento: "Dipirona sódica 500 mg — Comprimido". */
export function medicamentoLabel(item: PrescricaoItem): string {
  const pa = item.principioAtivo.trim();
  const conc = item.concentracao.trim();
  const forma = item.formaFarmaceutica.trim();
  const head = [pa, conc].filter(Boolean).join(" ");
  return forma ? `${head} — ${forma}` : head;
}

/** Um item numerado: medicamento + posologia + quantidade + recomendações. */
export function renderPrescricaoItem(item: PrescricaoItem, index: number): string {
  const lines: string[] = [];
  const med = medicamentoLabel(item);
  lines.push(`${index}) ${med || "___"}`);
  const pos = buildPosologia(item);
  const qt = item.quantidadeReceitada.trim();
  const posQt = [pos, qt ? `Quantidade: ${qt}` : ""].filter(Boolean).join(". ");
  if (posQt) lines.push(`   ${posQt}.`);
  if (item.recomendacoes.trim()) lines.push(`   Obs: ${item.recomendacoes.trim()}`);
  return lines.join("\n");
}

export interface ReceitaHeader {
  paciente: string;
  prontuario: string;
  idade: string;
  cidade: string;
  data: string; // ISO (yyyy-mm-dd)
}

function dateBR(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

/** Bloco de uma receita (um tipo), com cabeçalho legal, itens e assinatura. */
function renderBloco(
  tipo: TipoReceita,
  header: ReceitaHeader,
  items: PrescricaoItem[],
): string {
  const L: string[] = [];
  const meta = TIPO_RECEITA_OPTIONS.find((t) => t.value === tipo)!;
  L.push(`== ${meta.titulo} ==`);
  const pac = [
    header.paciente.trim() ? `Paciente: ${header.paciente.trim().toUpperCase()}` : "",
    header.prontuario.trim() ? `Prontuário: ${header.prontuario.trim()}` : "",
    header.idade.trim() ? `Idade: ${header.idade.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
  if (pac) L.push(pac);
  L.push("");
  items.forEach((it, i) => L.push(renderPrescricaoItem(it, i + 1)));
  L.push("");
  const local = [header.cidade.trim(), dateBR(header.data)].filter(Boolean).join(", ");
  if (local) L.push(local);
  L.push("__________________________________\nMédico Assistente");
  return L.join("\n");
}

/** Nº de vias a imprimir por tipo (controle especial = 2). */
export function viasPorTipo(tipo: TipoReceita): number {
  return tipo === "ESPECIAL" ? 2 : 1;
}

export interface ReceitaGrupo {
  tipo: TipoReceita;
  titulo: string;
  vias: number;
  items: PrescricaoItem[];
}

/** Itens agrupados por tipo de receita (para a impressão estruturada). */
export function receitaGrupos(items: PrescricaoItem[]): ReceitaGrupo[] {
  const filled = items.filter((it) => medicamentoLabel(it).trim() || buildPosologia(it).trim());
  const out: ReceitaGrupo[] = [];
  for (const t of TIPO_RECEITA_OPTIONS) {
    const group = filled.filter((it) => it.tipoReceita === t.value);
    if (group.length)
      out.push({ tipo: t.value, titulo: t.titulo, vias: viasPorTipo(t.value), items: group });
  }
  return out;
}

export interface ReceitaBloco {
  tipo: TipoReceita;
  titulo: string;
  text: string;
  /** Nº de vias a imprimir (controle especial = 2). */
  vias: number;
}

/** Blocos da receita, um por tipo preenchido (para prévia e impressão paginada). */
export function receitaBlocos(header: ReceitaHeader, items: PrescricaoItem[]): ReceitaBloco[] {
  const filled = items.filter((it) => medicamentoLabel(it).trim() || buildPosologia(it).trim());
  const out: ReceitaBloco[] = [];
  for (const t of TIPO_RECEITA_OPTIONS) {
    const group = filled.filter((it) => it.tipoReceita === t.value);
    if (group.length) {
      out.push({
        tipo: t.value,
        titulo: t.titulo,
        text: renderBloco(t.value, header, group),
        vias: t.value === "ESPECIAL" ? 2 : 1,
      });
    }
  }
  return out;
}

/** Receita completa: agrupa por tipo (comum/especial/notificações). */
export function renderReceita(header: ReceitaHeader, items: PrescricaoItem[]): string {
  return receitaBlocos(header, items)
    .map((b) => b.text)
    .join("\n\n----------------------------------------\n\n");
}
