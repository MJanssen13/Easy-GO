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

export const TIPO_RECEITA_OPTIONS: { value: TipoReceita; label: string; titulo: string; sigla: string }[] = [
  { value: "COMUM", label: "Simples", titulo: "RECEITUÁRIO", sigla: "S" },
  { value: "ESPECIAL", label: "Especial", titulo: "RECEITUÁRIO DE CONTROLE ESPECIAL", sigla: "E" },
];

// --- Frequência (enum `tipoFrequenciaDose`: INTERVALO/FREQUENCIA/TURNO + único) ---
// "Uso contínuo" saiu daqui e virou uma flag própria (desativa a duração).
export type TipoFrequencia = "INTERVALO" | "INTERVALO_DIAS" | "FREQUENCIA" | "TURNO" | "UNICA";

export const TIPO_FREQUENCIA_OPTIONS: { value: TipoFrequencia; label: string }[] = [
  { value: "INTERVALO", label: "A cada (h)" },
  { value: "INTERVALO_DIAS", label: "A cada (dia)" },
  { value: "FREQUENCIA", label: "Vezes/dia" },
  { value: "TURNO", label: "Turnos" },
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
export const MOMENTO_OPTIONS: { value: MomentoRefeicao; label: string }[] = [
  { value: "", label: "—" },
  { value: "JEJUM", label: "Em jejum" },
  { value: "PREPRANDIAL", label: "Antes das refeições" },
  { value: "POSPRANDIAL", label: "Após as refeições" },
  { value: "AO_DEITAR", label: "Ao deitar" },
];

// Refeições para segmentar o momento (antes/após): café da manhã, almoço, jantar.
// Vazio (ou as três) → "das refeições"; senão, a(s) refeição(ões) específica(s).
export const REFEICAO_OPTIONS: { value: string }[] = [
  { value: "Café da manhã" },
  { value: "Almoço" },
  { value: "Jantar" },
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

/** Sigla da via (para a Folha de Prescrição do Hospital Dia). Convenções usuais
 *  de prescrição hospitalar no Brasil. */
export const VIA_SIGLA: Record<string, string> = {
  Oral: "VO",
  Sublingual: "SL",
  Retal: "VR",
  Vaginal: "VV",
  Intramuscular: "IM",
  Intravenosa: "EV",
  Subcutânea: "SC",
  Tópica: "TÓP",
  Inalatória: "INAL",
  Nasal: "NAS",
  Ocular: "OCUL",
  Otológica: "OTOL",
  Transdérmica: "TD",
};

/** Via em sigla; se não houver correspondência, devolve a via como digitada. */
export function viaSigla(via: string): string {
  const v = (via ?? "").trim();
  return VIA_SIGLA[v] ?? v;
}

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
  turnoDoses: Record<string, string>; // TURNO: dose por turno (quando diferentes)
  usoContinuo: boolean; // desativa a duração
  momento: MomentoRefeicao;
  momentoMinutos: string; // tempo em minutos (jejum / antes / após as refeições)
  refeicoes: string[]; // refeições específicas (café da manhã / almoço / jantar)
  duracaoQt: string;
  duracaoUnidade: MedidaTempo;
  quantidadeReceitada: string; // total a dispensar
  recomendacoes: string;
  // Grupo de impressão dentro do tipo (1,2,3…): medicamentos do mesmo grupo saem
  // na mesma receita (ex.: S1 separado de S2; E1 separado de E2).
  grupoImpressao: number;
  // Registro manual (posologia livre) — quando o estruturado não basta.
  registroManual: boolean;
  posologiaManual: string;
  // Marca o item para a Folha de Prescrição do Hospital Dia (HC-UFTM).
  hospitalDia: boolean;
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
    turnoDoses: {},
    usoContinuo: false,
    momento: "",
    momentoMinutos: "",
    refeicoes: [],
    duracaoQt: "",
    duracaoUnidade: "DIA",
    quantidadeReceitada: "",
    recomendacoes: "",
    grupoImpressao: 1,
    registroManual: false,
    posologiaManual: "",
    hospitalDia: false,
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
    case "INTERVALO_DIAS": {
      const n = item.intervaloHoras.trim();
      return n ? (n === "1" ? "diário" : `a cada ${n} dias`) : "";
    }
    case "FREQUENCIA": {
      const n = item.vezesAoDia.trim();
      return n ? (n === "1" ? "1 vez ao dia" : `${n} vezes ao dia`) : "";
    }
    case "TURNO": {
      // Nos turnos, a ordem canônica (manhã→tarde→noite) é mais legível.
      const t = TURNO_OPTIONS.filter((o) => item.turnos.includes(o.value)).map((o) =>
        o.text.toLowerCase(),
      );
      return t.length ? joinNat(t) : "";
    }
    case "UNICA":
      return "dose única";
  }
  return "";
}

/**
 * Dose por turno na própria linha da posologia: "2 comprimidos pela manhã e 1
 * comprimido à noite". Vazio quando não há doses por turno preenchidas (aí a
 * posologia usa a dose única + os turnos normalmente).
 */
export function turnoDoseText(item: PrescricaoItem): string {
  if (item.tipoFrequencia !== "TURNO") return "";
  const turns = TURNO_OPTIONS.filter((o) => item.turnos.includes(o.value));
  if (!turns.length) return "";
  const doses = turns.map((o) => (item.turnoDoses[o.value] ?? "").trim());
  if (doses.every((d) => !d)) return ""; // nenhuma dose por turno → posologia padrão
  const segs = turns.map((o, i) => {
    const d = doses[i] || item.qtDose.trim();
    const turno = o.text.toLowerCase();
    return d ? `${d} ${pluralUnidade(item.unidadeDose, d)} ${turno}` : turno;
  });
  return joinNat(segs);
}

/** Duração: "5 dias" (vazio para uso contínuo/dose única). */
export function duracaoText(item: PrescricaoItem): string {
  if (item.usoContinuo || item.tipoFrequencia === "UNICA") return "";
  if (!item.duracaoQt.trim()) return "";
  const [sing, plur] = MEDIDA_TEMPO_LABEL[item.duracaoUnidade];
  const n = parseDecimal(item.duracaoQt);
  return `${item.duracaoQt.trim()} ${(n === 1 ? sing : plur).toLowerCase()}`;
}

/**
 * Referência às refeições selecionadas, com a preposição correta:
 * - `contrair` (antes DE): "das refeições" / "do almoço e do jantar";
 * - sem contrair (após): "as refeições" / "o almoço e o jantar".
 * Nenhuma ou as três selecionadas → genérico ("refeições").
 */
function refeicoesRef(refeicoes: string[], contrair: boolean): string {
  const sel = REFEICAO_OPTIONS.filter((o) => refeicoes.includes(o.value));
  if (!sel.length || sel.length === REFEICAO_OPTIONS.length) {
    return contrair ? "das refeições" : "as refeições";
  }
  const art = contrair ? "do" : "o";
  return joinNat(sel.map((o) => `${art} ${o.value.toLowerCase()}`));
}

/**
 * Momento em relação às refeições (caixa mista). "Antes/após" segmentam por
 * refeição (café da manhã / almoço / jantar) quando selecionada e embutem o tempo
 * em minutos. "Em jejum" e "ao deitar" são tomadas únicas no dia — jejum não usa
 * refeições (com minutos vira "aguardar X minutos antes de se alimentar").
 * Ex.: "30 minutos antes do almoço", "após as refeições", "em jejum, tomar 30
 * minutos antes de se alimentar", "ao deitar".
 */
export function momentoText(item: PrescricaoItem): string {
  if (!item.momento) return "";
  if (item.momento === "AO_DEITAR") return "ao deitar";
  const min = (item.momentoMinutos ?? "").trim();
  const unid = parseDecimal(min) === 1 ? "minuto" : "minutos";
  if (item.momento === "JEJUM") {
    return min ? `em jejum, tomar ${min} ${unid} antes de se alimentar` : "em jejum";
  }
  const minPrefix = min ? `${min} ${unid} ` : "";
  return item.momento === "PREPRANDIAL"
    ? `${minPrefix}antes ${refeicoesRef(item.refeicoes ?? [], true)}`
    : `${minPrefix}após ${refeicoesRef(item.refeicoes ?? [], false)}`;
}

/** Posologia legível (caixa mista) dos campos estruturados ou o texto manual. */
export function buildPosologia(item: PrescricaoItem): string {
  if (item.registroManual) return item.posologiaManual.trim();
  const via = viaText(item);
  const dur = duracaoText(item);
  const viaTxt = via ? `via ${via.toLowerCase()}` : "";
  // Dose por turno (quando informada) já embute dose + frequência na mesma linha.
  const turnoCombo = turnoDoseText(item);
  const doseFreq = turnoCombo
    ? [turnoCombo, viaTxt]
    : [doseText(item), viaTxt, frequenciaText(item)];
  const parts = [
    ...doseFreq,
    item.usoContinuo ? "uso contínuo" : dur ? `por ${dur}` : "",
    momentoText(item),
  ].filter(Boolean);
  return parts.join(", ");
}

/** Texto da coluna "Prescrição" da Folha do Hospital Dia: medicamento +
 *  **dose individual** (não o esquema completo — a frequência sai nas colunas de
 *  horário) + momento e recomendações. A via sai em coluna própria (sigla). */
export function prescricaoHospitalDia(item: PrescricaoItem): string {
  const med = medicamentoLabel(item);
  let pos: string;
  if (item.registroManual) {
    pos = item.posologiaManual.trim();
  } else {
    // Dose por administração (sem frequência/duração = "esquema completo").
    const parts = [doseText(item), momentoText(item)].filter(Boolean);
    pos = parts.join(", ");
  }
  const rec = item.recomendacoes.trim();
  // Na folha do Hospital Dia o separador é hífen (não travessão).
  return [med, pos, rec].filter(Boolean).join(" - ").replace(/—/g, "-");
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
  endereco: string; // exigido no receituário de controle especial
  cidade: string;
  data: string; // ISO (yyyy-mm-dd)
  mostrarData: boolean; // datar a receita (cidade + data); omite ambos se falso
  // Contexto clínico (não impresso) — habilita alertas de segurança na prescrição.
  gestante: boolean; // mostra a categoria de risco na gestação (FDA A/B/C/D/X)
  lactante: boolean; // (em construção) segurança na amamentação
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
  /** Número do grupo de impressão dentro do tipo (1,2,3…). */
  grupo: number;
  /** Rótulo do grupo (ex.: "S1", "E2"). */
  sigla: string;
  items: PrescricaoItem[];
}

/**
 * Itens agrupados por **tipo** e **grupo de impressão** (para a impressão
 * estruturada). Cada (tipo, grupo) vira uma receita separada — ex.: S1 sai
 * numa folha, S2 em outra; E1 separado de E2.
 */
export function receitaGrupos(items: PrescricaoItem[]): ReceitaGrupo[] {
  const filled = items.filter((it) => medicamentoLabel(it).trim() || buildPosologia(it).trim());
  const out: ReceitaGrupo[] = [];
  for (const t of TIPO_RECEITA_OPTIONS) {
    const doTipo = filled.filter((it) => it.tipoReceita === t.value);
    if (!doTipo.length) continue;
    const porGrupo = new Map<number, PrescricaoItem[]>();
    for (const it of doTipo) {
      const g = it.grupoImpressao || 1;
      (porGrupo.get(g) ?? porGrupo.set(g, []).get(g)!).push(it);
    }
    for (const n of [...porGrupo.keys()].sort((a, b) => a - b)) {
      out.push({
        tipo: t.value,
        titulo: t.titulo,
        vias: viasPorTipo(t.value),
        grupo: n,
        sigla: `${t.sigla}${n}`,
        items: porGrupo.get(n)!,
      });
    }
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
