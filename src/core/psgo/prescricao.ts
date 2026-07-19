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

// --- Tipos de receita (enum `OM` do e-SUS) ---
export type TipoReceita =
  | "COMUM"
  | "ESPECIAL"
  | "ESPECIAL_BRANCA"
  | "ESPECIAL_AZUL"
  | "ESPECIAL_AMARELA";

export const TIPO_RECEITA_OPTIONS: { value: TipoReceita; label: string; titulo: string }[] = [
  { value: "COMUM", label: "Comum", titulo: "RECEITUÁRIO" },
  { value: "ESPECIAL", label: "Especial", titulo: "RECEITUÁRIO DE CONTROLE ESPECIAL (2 VIAS)" },
  { value: "ESPECIAL_BRANCA", label: "Notif. branca", titulo: "NOTIFICAÇÃO DE RECEITA — BRANCA (C1)" },
  { value: "ESPECIAL_AZUL", label: "Notif. azul", titulo: "NOTIFICAÇÃO DE RECEITA B (AZUL)" },
  { value: "ESPECIAL_AMARELA", label: "Notif. amarela", titulo: "NOTIFICAÇÃO DE RECEITA A (AMARELA)" },
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

/** Posologia legível a partir dos campos estruturados (ou o texto manual). */
export function buildPosologia(item: PrescricaoItem): string {
  if (item.registroManual) return item.posologiaManual.trim().toUpperCase();

  const parts: string[] = [];

  // Dose: "1 COMPRIMIDO"
  if (item.qtDose.trim()) {
    parts.push(`${item.qtDose.trim()} ${pluralUnidade(item.unidadeDose, item.qtDose).toUpperCase()}`);
  }
  // Via: "VIA ORAL"
  if (item.via.trim()) parts.push(`VIA ${item.via.trim().toUpperCase()}`);

  // Frequência
  switch (item.tipoFrequencia) {
    case "INTERVALO":
      if (item.intervaloHoras.trim()) parts.push(`A CADA ${item.intervaloHoras.trim()} HORAS`);
      break;
    case "FREQUENCIA":
      if (item.vezesAoDia.trim()) {
        const n = item.vezesAoDia.trim();
        parts.push(n === "1" ? "1 VEZ AO DIA" : `${n} VEZES AO DIA`);
      }
      break;
    case "TURNO": {
      const t = item.turnos
        .map((v) => TURNO_OPTIONS.find((o) => o.value === v)?.text ?? "")
        .filter(Boolean);
      if (t.length) parts.push(joinNat(t));
      break;
    }
    case "CONTINUO":
      parts.push("USO CONTÍNUO");
      break;
    case "UNICA":
      parts.push("DOSE ÚNICA");
      break;
  }

  // Duração (não se aplica a contínuo/única)
  if (
    item.tipoFrequencia !== "CONTINUO" &&
    item.tipoFrequencia !== "UNICA" &&
    item.duracaoQt.trim()
  ) {
    const [sing, plur] = MEDIDA_TEMPO_LABEL[item.duracaoUnidade];
    const n = parseDecimal(item.duracaoQt);
    parts.push(`POR ${item.duracaoQt.trim()} ${n === 1 ? sing : plur}`);
  }

  // Momento em relação às refeições
  if (item.momento) parts.push(MOMENTO_TEXT[item.momento]);

  return parts.join(", ");
}

/** Cabeçalho do medicamento: "DIPIRONA 500 MG — COMPRIMIDO". */
export function medicamentoLabel(item: PrescricaoItem): string {
  const pa = item.principioAtivo.trim().toUpperCase();
  const conc = item.concentracao.trim().toUpperCase();
  const forma = item.formaFarmaceutica.trim().toUpperCase();
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
  const posQt = [pos, qt ? `QUANTIDADE: ${qt.toUpperCase()}` : ""].filter(Boolean).join(". ");
  if (posQt) lines.push(`   ${posQt}.`);
  if (item.recomendacoes.trim()) lines.push(`   OBS: ${item.recomendacoes.trim().toUpperCase()}`);
  return lines.join("\n");
}

export interface ReceitaHeader {
  paciente: string;
  prontuario: string;
  idade: string;
  prescritor: string;
  crm: string;
  estabelecimento: string;
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
  if (header.estabelecimento.trim()) L.push(header.estabelecimento.trim().toUpperCase());
  const pac = [
    header.paciente.trim() ? `PACIENTE: ${header.paciente.trim().toUpperCase()}` : "",
    header.prontuario.trim() ? `PRONTUÁRIO: ${header.prontuario.trim().toUpperCase()}` : "",
    header.idade.trim() ? `IDADE: ${header.idade.trim().toUpperCase()}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
  if (pac) L.push(pac);
  L.push("");
  items.forEach((it, i) => L.push(renderPrescricaoItem(it, i + 1)));
  L.push("");
  const local = [header.cidade.trim(), dateBR(header.data)].filter(Boolean).join(", ");
  if (local) L.push(local.toUpperCase());
  const assinatura = [header.prescritor.trim(), header.crm.trim() ? `CRM ${header.crm.trim()}` : ""]
    .filter(Boolean)
    .join(" — ");
  if (assinatura) L.push(`__________________________________\n${assinatura.toUpperCase()}`);
  return L.join("\n");
}

/** Receita completa: agrupa por tipo (comum/especial/notificações). */
export function renderReceita(header: ReceitaHeader, items: PrescricaoItem[]): string {
  const filled = items.filter((it) => medicamentoLabel(it).trim() || buildPosologia(it).trim());
  if (!filled.length) return "";
  const blocos: string[] = [];
  for (const t of TIPO_RECEITA_OPTIONS) {
    const group = filled.filter((it) => it.tipoReceita === t.value);
    if (group.length) blocos.push(renderBloco(t.value, header, group));
  }
  return blocos.join("\n\n----------------------------------------\n\n");
}
