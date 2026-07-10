/**
 * HPMAs padronizadas do PSGO. Cada QP/HD é um modelo em "nós" (texto, campo,
 * escolha única e multisseleção). O gerador monta o texto (em MAIÚSCULAS) a
 * partir dos botões/campos e insere na caixa de HPMA para edição final.
 *
 * Conteúdo validado com a equipe — apoio à documentação, não conduta.
 */

// --- Modelo de nós ---

export interface HpmaOpt {
  /** Rótulo do botão. */
  label: string;
  /** Texto escrito (default = label). */
  write?: string;
  /** Nós extras mostrados quando esta opção é escolhida (escolha única). */
  reveal?: HpmaNode[];
}

export interface MultiCfg {
  /** Modo lista simples: prefixo/sufixo/vazio dos selecionados. */
  pre?: string;
  suf?: string;
  empty?: string;
  /**
   * Modo positivo/negativo: se `negAlone` ou `negMid` for definido, escreve os
   * selecionados (posPre) e nega os NÃO selecionados. Sem nenhum selecionado,
   * usa `negAlone` + todos (em vez de um fallback).
   */
  posPre?: string;
  negMid?: string;
  negAlone?: string;
}

export type HpmaNode =
  | { k: "t"; v: string }
  /** `wide` = campo de texto (mais largo); default é estreito (número). */
  | { k: "blank"; id: string; q?: string; wide?: boolean }
  | { k: "single"; id: string; opts: HpmaOpt[]; q?: string }
  | ({ k: "multi"; id: string; opts: HpmaOpt[]; q?: string } & MultiCfg)
  /** Mostra `nodes` só quando a escolha única `ref` estiver no valor `eq`. */
  | { k: "cond"; ref: string; eq: string; nodes: HpmaNode[] };

// Construtores compactos (`q` = rótulo no modo formulário)
const T = (v: string): HpmaNode => ({ k: "t", v });
const B = (id: string, q?: string, wide?: boolean): HpmaNode => ({ k: "blank", id, q, wide });
const o = (x: string | HpmaOpt): HpmaOpt => (typeof x === "string" ? { label: x } : x);
const ONE = (id: string, opts: (string | HpmaOpt)[], q?: string): HpmaNode => ({
  k: "single",
  id,
  opts: opts.map(o),
  q,
});
const MANY = (id: string, opts: (string | HpmaOpt)[], cfg: MultiCfg = {}, q?: string): HpmaNode => ({
  k: "multi",
  id,
  opts: opts.map(o),
  q,
  ...cfg,
});
const COND = (ref: string, eq: string, nodes: HpmaNode[]): HpmaNode => ({ k: "cond", ref, eq, nodes });

// --- Templates ---

export interface HpmaTemplate {
  id: string;
  label: string;
  gestanteOnly?: boolean;
  /** IDs de perguntas da revisão dirigida omitidas (a QP já as cobre). */
  covers?: string[];
  /** "inline" (texto com campos embutidos) ou "form" (rótulo + controle). */
  mode?: "inline" | "form";
  nodes: HpmaNode[];
}

export const HPMA_TEMPLATES: HpmaTemplate[] = [
  {
    id: "geca",
    label: "GECA",
    covers: ["intestinal"],
    mode: "form",
    nodes: [
      T("quadro de dor abdominal em cólica, difusa, associada a evacuações diarreicas em número de "),
      B("ep", "Evacuações diarreicas por dia"),
      T(" episódios ao dia, com início há "),
      B("dias", "Início (há quantos dias)"),
      T(" dias. "),
      ONE("nv", ["Associa", "Nega"], "Náuseas e vômitos"),
      T(" náuseas/vômitos"),
      COND("nv", "Associa", [T(" ("), B("nvn", "Nº de episódios de vômitos"), T(" episódios)")]),
      T(". "),
      ONE("febre", ["Refere", "Nega"], "Febre"),
      T(" febre"),
      COND("febre", "Refere", [
        T(" "),
        ONE(
          "febret",
          [
            { label: "termometrada", reveal: [T(" ("), B("temp", "Temperatura (°C)"), T("º)")] },
            { label: "não termometrada" },
          ],
          "Febre termometrada?",
        ),
      ]),
      T(". "),
      ONE("muco", ["Nega", "Relata"], "Muco ou sangue nas fezes"),
      T(" muco ou sangue nas fezes. "),
      ONE("contato", ["Refere", "Nega"], "Contato com sintomáticos"),
      T(" contato com pessoas com sintomas semelhantes, "),
      ONE("alim", ["Refere", "Nega"], "Consumo de alimento suspeito"),
      T(" consumo de alimento suspeito"),
      COND("alim", "Refere", [T(" ("), B("alimq", "Qual alimento?", true), T(")")]),
      T(". Relata aceitação "),
      ONE("dieta", ["boa", "parcial", "ruim"], "Aceitação da dieta"),
      T(" da dieta e ingesta hídrica de "),
      B("agua", "Ingesta hídrica (L/dia)"),
      T(" L por dia."),
    ],
  },
  {
    id: "febre",
    label: "Febre",
    mode: "form",
    nodes: [
      T("febre aferida de até "),
      B("temp", "Temperatura máxima (°C)"),
      T(" °C, com início há "),
      B("dias", "Início (há quantos dias)"),
      T(" dias, de padrão "),
      ONE("padrao", ["contínuo", "intermitente"], "Padrão da febre"),
      T(", "),
      ONE("assoc", ["associada", "não associada"], "Sintomas associados?"),
      T(" a "),
      COND("assoc", "associada", [
        MANY("sint", ["calafrios", "mialgia", "prostração"], { empty: "calafrios, mialgia ou prostração" }, "Quais"),
      ]),
      COND("assoc", "não associada", [T("calafrios, mialgia ou prostração")]),
      T(". "),
      ONE("urin", ["Refere", "Nega"], "Sintomas urinários"),
      T(" sintomas urinários"),
      COND("urin", "Refere", [T(" ("), MANY("urinm", ["disúria", "polaciúria", "dor lombar"], {}, "Quais"), T(")")]),
      T(". "),
      ONE("resp", ["Refere", "Nega"], "Sintomas respiratórios"),
      T(" sintomas respiratórios"),
      COND("resp", "Refere", [T(" ("), MANY("respm", ["tosse", "coriza", "odinofagia", "dispneia"], {}, "Quais"), T(")")]),
      T(". "),
      ONE("dorabd", ["Refere", "Nega"], "Dor abdominal"),
      T(" dor abdominal. "),
      ONE("anti", ["Fez", "Não fez"], "Uso de antitérmico"),
      T(" uso de antitérmico"),
      COND("anti", "Fez", [
        T(" com "),
        ONE("antim", ["melhora completa", "melhora parcial", "sem melhora"], "Resposta ao antitérmico"),
      ]),
      T("."),
    ],
  },
  {
    id: "dor_bv",
    label: "Dor em baixo ventre",
    mode: "form",
    nodes: [
      T("dor em baixo ventre, de caráter "),
      ONE("car", ["cólica", "contínua", "em peso"], "Caráter da dor"),
      T(", intensidade "),
      B("int", "Intensidade (0-10)"),
      T("/10, com início há "),
      B("ini", "Início (há quanto tempo)"),
      T(", "),
      ONE(
        "irr",
        [
          { label: "com irradiação", write: "com irradiação", reveal: [T(" para "), B("irrp", "Para onde?", true)] },
          { label: "sem irradiação", write: "sem irradiação" },
        ],
        "Irradiação",
      ),
      T(", "),
      ONE("fat", ["sem fatores", "com fatores"], "Fatores de melhora/piora"),
      COND("fat", "sem fatores", [T(" de melhora ou piora")]),
      COND("fat", "com fatores", [T(": melhora ao "), B("mel", "Melhora ao", true), T(" e piora ao "), B("pio", "Piora ao", true)]),
      T(". "),
      ONE("rel", ["Refere", "Nega"], "Relação com esforço/micção/evacuação"),
      T(" relação com esforço, micção ou evacuação."),
    ],
  },
  {
    id: "dengue",
    label: "Dengue",
    mode: "form",
    nodes: [
      T("febre há "),
      B("dias", "Início (há quantos dias)"),
      T(" dias"),
      MANY(
        "sx",
        ["cefaleia", "mialgia", "artralgia", "prostração", "exantema", "dor abdominal", "náuseas/vômitos"],
        { posPre: " associada a ", negMid: ". Nega ", negAlone: ". Nega " },
        "Sintomas presentes",
      ),
      T(". Questionada sobre sinais de alarme"),
      MANY(
        "al",
        ["dor abdominal intensa", "vômitos persistentes", "sangramento de mucosas", "sonolência", "lipotimia"],
        { posPre: " relata ", negMid: "; nega ", negAlone: " nega " },
        "Sinais de alarme presentes",
      ),
      T(". "),
      ONE("casos", ["Relata", "Desconhece"], "Casos na casa/bairro"),
      T(" casos recentes em sua casa e bairro."),
    ],
  },
  {
    id: "sindrome_gripal",
    label: "Síndrome gripal",
    mode: "form",
    nodes: [
      T("quadro com início há "),
      B("dias", "Início (há quantos dias)"),
      T(" dias de "),
      MANY("sx", ["febre", "tosse", "congestão nasal", "mialgia", "cefaleia"], { empty: "sintomas gripais" }, "Sintomas"),
      T(". Nega dispneia; saturação de O2 em ar ambiente de "),
      B("sat", "Saturação O2 (%)"),
      T("%. "),
      ONE("contato", ["Refere", "Nega"], "Contato com sintomáticos"),
      T(" contato com sintomáticos respiratórios. Nega dor torácica."),
    ],
  },
  {
    id: "nausea_vomitos",
    label: "Náusea e vômitos",
    mode: "form",
    nodes: [
      T("náuseas e "),
      B("ep", "Episódios de vômitos/dia"),
      T(" episódios de vômitos ao dia, com início há "),
      B("dias", "Início (há quantos dias)"),
      T(" dias, de conteúdo "),
      ONE("cont", ["alimentar", "bilioso"], "Conteúdo"),
      T(", sem sangue. "),
      ONE("dor", ["Associa", "Nega"], "Dor abdominal"),
      T(" dor abdominal. Relata aceitação "),
      ONE("dieta", ["boa", "parcial", "ausente"], "Aceitação da dieta"),
      T(" da dieta via oral. "),
      ONE("desid", ["Refere", "Nega"], "Sinais de desidratação"),
      T(" sinais de desidratação (boca seca, tontura, oligúria). "),
      ONE("febre", ["Nega", "Relata"], "Febre"),
      T(" febre."),
    ],
  },
  {
    id: "reducao_mf",
    label: "Redução da MF",
    gestanteOnly: true,
    covers: ["mf"],
    mode: "form",
    nodes: [
      T("percepção de redução dos movimentos fetais há "),
      B("h", "Redução há quantas horas"),
      T(" horas, em relação ao padrão habitual, "),
      ONE("rep", ["após", "independente de"], "Relação com repouso"),
      T(" período de repouso. Após alimentação há "),
      ONE(
        "ret",
        [{ label: "retorno", write: "retorno" }, { label: "persistência", write: "persistência da redução" }],
        "Após alimentação",
      ),
      T(" da movimentação. Nega dor abdominal. Última avaliação/USG em "),
      B("usg", "Última avaliação/USG", true),
      T("."),
    ],
  },
  {
    id: "fase_ativa_tp",
    label: "Fase ativa de TP",
    gestanteOnly: true,
    covers: ["contracoes"],
    mode: "form",
    nodes: [
      T("contrações uterinas dolorosas e regulares, com início há "),
      B("ini", "Início das contrações (há)"),
      T(", atualmente com frequência de "),
      B("freq", "Frequência (em 10 min)"),
      T(" em 10 minutos e intensidade progressiva. "),
      ONE("tampao", ["Refere", "Nega"], "Perda de tampão mucoso"),
      T(" perda de tampão mucoso."),
    ],
  },
  {
    id: "prodromos_tp",
    label: "Pródromos de TP",
    gestanteOnly: true,
    covers: ["contracoes"],
    mode: "form",
    nodes: [
      T("contrações uterinas irregulares, de baixa intensidade, que "),
      ONE("alivio", ["aliviam", "não aliviam"], "Alívio ao repouso"),
      T(" ao repouso, com início há "),
      B("ini", "Início (há)"),
      T(". "),
      ONE("tampao", ["Refere", "Nega"], "Perda de tampão mucoso"),
      T(" perda de tampão mucoso."),
    ],
  },
  {
    id: "pico_hipertensivo",
    label: "Pico hipertensivo",
    mode: "form",
    nodes: [
      T("aferição de PA elevada ("),
      B("pas", "PA sistólica"),
      T(" x "),
      B("pad", "PA diastólica"),
      T(" mmHg) "),
      ONE("local", ["em domicílio", "na triagem", "na origem"], "Aferida onde"),
      T(". Quanto a sinais de iminência de eclâmpsia"),
      MANY(
        "ecl",
        ["cefaleia holocraniana", "alterações visuais (escotomas, turvação)", "dor abdominal", "náuseas/vômitos"],
        { posPre: " refere ", negMid: "; nega ", negAlone: " nega " },
        "Sinais de iminência de eclâmpsia",
      ),
      T(". "),
      ONE(
        "anti",
        [
          { label: "Em uso de anti-HAS", write: "Em uso de anti-hipertensivo", reveal: [T(" ("), B("antiq", "Qual anti-hipertensivo?", true), T(")")] },
          { label: "Sem anti-HAS", write: "Sem anti-hipertensivo em uso" },
        ],
        "Anti-hipertensivo",
      ),
      T("."),
    ],
  },
  {
    id: "sangramento_1m",
    label: "Sangramento 1ª M",
    gestanteOnly: true,
    covers: ["sangramento"],
    mode: "form",
    nodes: [
      T("sangramento via vaginal com início há "),
      B("ini", "Início (há)"),
      T(", em "),
      ONE("qtd", ["pequena", "moderada", "grande"], "Quantidade"),
      T(" quantidade, "),
      ONE("coag", [{ label: "com coágulos", write: "com coágulos" }, { label: "sem coágulos", write: "sem coágulos" }], "Coágulos"),
      T(", "),
      ONE("dor", [{ label: "com cólica", write: "associado a cólica" }, { label: "sem cólica", write: "sem cólica" }], "Cólica"),
      T(". Gestação de "),
      B("ig", "IG (semanas)"),
      T(" semanas. "),
      ONE("elim", ["Refere", "Nega"], "Eliminação de material/coágulos"),
      T(" eliminação de material ou coágulos. "),
      ONE("trauma", ["Refere", "Nega"], "Relação com atividade sexual/trauma"),
      T(" relação com atividade sexual ou trauma."),
    ],
  },
  {
    id: "sangramento_2m",
    label: "Sangramento 2ª M",
    gestanteOnly: true,
    covers: ["sangramento"],
    mode: "form",
    nodes: [
      T("sangramento via vaginal com início há "),
      B("ini", "Início (há)"),
      T(", em "),
      ONE("qtd", ["pequena", "moderada", "grande"], "Quantidade"),
      T(" quantidade, de sangue "),
      ONE("cor", ["vermelho vivo", "escuro"], "Cor do sangue"),
      T(", "),
      ONE("dor", [{ label: "com dor", write: "com dor abdominal" }, { label: "sem dor", write: "sem dor abdominal" }], "Dor abdominal"),
      T(". Gestação de "),
      B("ig", "IG (semanas)"),
      T(" semanas. Refere movimentação fetal presente. "),
      ONE("contr", ["Refere", "Nega"], "Contrações"),
      T(" contrações. "),
      ONE("trauma", ["Refere", "Nega"], "Relação com atividade sexual/trauma"),
      T(" relação com atividade sexual ou trauma."),
    ],
  },
  {
    id: "disuria",
    label: "Disúria",
    covers: ["urinario"],
    mode: "form",
    nodes: [
      T("disúria com início há "),
      B("dias", "Início (há quantos dias)"),
      T(" dias, "),
      ONE("pol", [{ label: "com polaciúria", write: "associada a polaciúria" }, { label: "sem polaciúria", write: "sem polaciúria" }], "Polaciúria"),
      T(", "),
      ONE("urg", [{ label: "com urgência", write: "com urgência miccional" }, { label: "sem urgência", write: "sem urgência miccional" }], "Urgência miccional"),
      T(". "),
      ONE("lombar", ["Refere", "Nega"], "Dor lombar"),
      T(" dor lombar. "),
      ONE("febre", ["Refere", "Nega"], "Febre"),
      T(" febre. "),
      ONE("hema", ["Refere", "Nega"], "Hematúria"),
      T(" hematúria. "),
      ONE("corr", ["Refere", "Nega"], "Corrimento vaginal"),
      T(" corrimento vaginal."),
    ],
  },
  {
    id: "perda_liquido",
    label: "Perda de líquido",
    gestanteOnly: true,
    covers: ["secrecao"],
    mode: "form",
    nodes: [
      T("perda de líquido via vaginal com início há "),
      B("ini", "Início (há)"),
      T(", em "),
      ONE("qtd", ["pequena", "moderada", "grande"], "Quantidade"),
      T(" quantidade, de aspecto "),
      ONE("asp", ["claro", "meconial", "sanguinolento"], "Aspecto"),
      T(", "),
      ONE("pad", ["contínua", "intermitente"], "Padrão"),
      T(". Gestação de "),
      B("ig", "IG (semanas)"),
      T(" semanas. Refere movimentação fetal presente. "),
      ONE("contr", ["Refere", "Nega"], "Contrações"),
      T(" contrações."),
    ],
  },
];

// --- Revisão dirigida (perguntas obrigatórias) ---

export interface RevSub {
  id: string;
  kind: "blank" | "single" | "multi";
  label?: string;
  opts?: string[];
}
export interface RevOption {
  value: string;
  label: string;
  /** true = valor normal/negativo (default). */
  normal?: boolean;
  /** Sub-campos mostrados quando esta opção é escolhida. */
  subs?: RevSub[];
}
export interface RevisionQuestion {
  id: string;
  label: string;
  gestanteOnly?: boolean;
  options: RevOption[];
}

export const REVISION_QUESTIONS: RevisionQuestion[] = [
  {
    id: "sangramento",
    label: "Sangramento",
    options: [
      { value: "nega", label: "Nega", normal: true },
      {
        value: "relata",
        label: "Relata",
        subs: [
          { id: "qtd", kind: "single", label: "Quantidade", opts: ["pequena", "moderada", "grande"] },
          { id: "coag", kind: "single", label: "Coágulos", opts: ["com", "sem"] },
          { id: "colica", kind: "single", label: "Cólicas", opts: ["associado", "não associado"] },
        ],
      },
    ],
  },
  {
    id: "secrecao",
    label: "Secreção",
    options: [
      { value: "nega", label: "Nega", normal: true },
      {
        value: "relata",
        label: "Relata",
        subs: [
          { id: "fetida", kind: "single", label: "Odor", opts: ["fétida", "não fétida"] },
          { id: "grumos", kind: "single", label: "Grumos", opts: ["com", "sem"] },
          { id: "cor", kind: "single", label: "Cor", opts: ["clara", "esbranquiçada", "esverdeada", "purulenta"] },
          { id: "assoc", kind: "multi", label: "Associada a", opts: ["prurido", "ardência local", "dispareunia"] },
        ],
      },
    ],
  },
  {
    id: "intestinal",
    label: "Hábito intestinal",
    options: [
      { value: "preservado", label: "Preservado", normal: true },
      { value: "constipado", label: "Constipado", subs: [{ id: "sem", kind: "blank", label: "Evacuações/semana" }] },
      { value: "diarreico", label: "Diarreico", subs: [{ id: "dia", kind: "blank", label: "Evacuações/dia" }] },
    ],
  },
  {
    id: "urinario",
    label: "Hábito urinário",
    options: [
      { value: "preservado", label: "Preservado", normal: true },
      {
        value: "alterado",
        label: "Alterado",
        subs: [
          {
            id: "sint",
            kind: "multi",
            label: "Sintomas",
            opts: ["disúria", "polaciúria", "poliúria", "incontinência", "urgência", "retenção", "odor desagradável"],
          },
        ],
      },
    ],
  },
  {
    id: "contracoes",
    label: "Contrações",
    gestanteOnly: true,
    options: [
      { value: "nega", label: "Nega", normal: true },
      {
        value: "relata",
        label: "Relata",
        subs: [
          { id: "padrao", kind: "single", label: "Padrão", opts: ["irregular", "regular", "de treinamento"] },
          { id: "freq", kind: "blank", label: "Freq/10min (se regular)" },
        ],
      },
    ],
  },
  {
    id: "mf",
    label: "Movimentação fetal",
    gestanteOnly: true,
    options: [
      { value: "boa", label: "Boa", normal: true },
      { value: "reduzida", label: "Reduzida" },
      { value: "ausente", label: "Ausente" },
    ],
  },
];

// --- Montagem (assembly) ---

const val = (vals: Record<string, string>, k: string) => (vals[k] ?? "").trim();
const isOn = (vals: Record<string, string>, k: string) => vals[k] === "1";

/** Junção natural: "a", "a e b", "a, b e c". */
function joinNat(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

/** Colapsa espaços e remove espaço antes de pontuação. */
function clean(s: string): string {
  return s.replace(/\s+/g, " ").replace(/\s+([.,;])/g, "$1").trim();
}

function asmNodes(nodes: HpmaNode[], prefix: string, vals: Record<string, string>): string {
  let out = "";
  for (const n of nodes) out += asmNode(n, prefix, vals);
  return out;
}

function asmNode(n: HpmaNode, prefix: string, vals: Record<string, string>): string {
  if (n.k === "t") return n.v;
  if (n.k === "blank") return val(vals, `${prefix}.${n.id}`) || "___";
  if (n.k === "single") {
    const v = vals[`${prefix}.${n.id}`];
    const opt = n.opts.find((x) => x.label === v);
    if (!opt) return `[${n.opts.map((x) => x.label).join("/")}]`;
    return (opt.write ?? opt.label) + (opt.reveal ? asmNodes(opt.reveal, prefix, vals) : "");
  }
  if (n.k === "cond") {
    return vals[`${prefix}.${n.ref}`] === n.eq ? asmNodes(n.nodes, prefix, vals) : "";
  }
  // multi
  const wr = (x: HpmaOpt) => x.write ?? x.label;
  const sel = n.opts.filter((x) => isOn(vals, `${prefix}.${n.id}#${x.label}`));
  const unsel = n.opts.filter((x) => !isOn(vals, `${prefix}.${n.id}#${x.label}`));
  // Modo positivo/negativo: escreve os selecionados e nega os demais.
  if (n.negAlone != null || n.negMid != null) {
    if (sel.length && unsel.length)
      return (n.posPre ?? "") + joinNat(sel.map(wr)) + (n.negMid ?? "") + joinNat(unsel.map(wr));
    if (sel.length) return (n.posPre ?? "") + joinNat(sel.map(wr));
    if (unsel.length) return (n.negAlone ?? "") + joinNat(unsel.map(wr));
    return "";
  }
  // Modo lista simples.
  if (!sel.length) return n.empty ?? "";
  return (n.pre ?? "") + joinNat(sel.map(wr)) + (n.suf ?? "");
}

/** Parágrafo de uma QP; `index` 0 usa "Refere", demais usam "Relata ainda". */
export function assembleQp(tpl: HpmaTemplate, vals: Record<string, string>, index: number): string {
  const verb = index === 0 ? "Refere " : "Relata ainda ";
  return clean(verb + asmNodes(tpl.nodes, tpl.id, vals));
}

/** Frase de chegada da paciente. */
export function assembleArrival(ambulance: boolean, from: string, hasCompanion: boolean): string {
  const comp = hasCompanion ? "acompanhada" : "desacompanhada";
  if (ambulance) {
    const origem = from.trim() ? ` vindo de ${from.trim()}` : "";
    return `Paciente encaminhada ao PSGO de ambulância${origem}, ${comp}.`;
  }
  return `Paciente comparece ao PSGO, ${comp}.`;
}

const REV_PREFIX = "rev";

function revText(q: RevisionQuestion, vals: Record<string, string>): string {
  const v = vals[`${REV_PREFIX}.${q.id}`] ?? q.options[0].value;
  const sub = (id: string) => val(vals, `${REV_PREFIX}.${q.id}.${id}`) || "___";
  const subMulti = (id: string, opts: string[]) => opts.filter((op) => isOn(vals, `${REV_PREFIX}.${q.id}.${id}#${op}`));
  switch (q.id) {
    case "sangramento":
      if (v === "nega") return "Nega sangramento transvaginal";
      return `Relata sangramento transvaginal em ${sub("qtd")} quantidade, com ${sub("coag")} coágulos, ${sub("colica")} a cólicas`;
    case "secrecao": {
      if (v === "nega") return "Nega corrimento";
      const assoc = subMulti("assoc", ["prurido", "ardência local", "dispareunia"]);
      const assocTxt = assoc.length ? `, associada a ${assoc.join(", ")}` : "";
      return `Relata secreção transvaginal ${sub("fetida")}, ${sub("grumos")} grumos, ${sub("cor")}${assocTxt}`;
    }
    case "intestinal":
      if (v === "preservado") return "Nega alterações intestinais";
      if (v === "constipado") return `Relata constipação (${sub("sem")} evacuações por semana)`;
      return `Relata diarreia (${sub("dia")} evacuações por dia)`;
    case "urinario": {
      if (v === "preservado") return "Nega alterações urinárias";
      const s = subMulti("sint", ["disúria", "polaciúria", "poliúria", "incontinência", "urgência", "retenção", "odor desagradável"]);
      return s.length ? `Relata ${s.join(", ")}` : "Relata alterações urinárias";
    }
    case "contracoes": {
      if (v === "nega") return "Nega contrações no momento";
      const padrao = sub("padrao");
      const freq = padrao === "regular" && val(vals, `${REV_PREFIX}.contracoes.freq`)
        ? ` (${val(vals, `${REV_PREFIX}.contracoes.freq`)} em 10 min)`
        : "";
      return `Relata enrijecimento abdominal de padrão ${padrao}${freq}`;
    }
    case "mf":
      if (v === "boa") return "Relata boa movimentação fetal";
      if (v === "reduzida") return "Relata movimentação fetal reduzida";
      return "Relata ausência de movimentação fetal";
    default:
      return "";
  }
}

/** Uma pergunta está no valor normal (default)? */
function revIsNormal(q: RevisionQuestion, vals: Record<string, string>): boolean {
  const v = vals[`${REV_PREFIX}.${q.id}`] ?? q.options[0].value;
  return !!q.options.find((op) => op.value === v)?.normal;
}

/** Revisão dirigida completa (omite as cobertas pela QP; frase combinada se tudo normal). */
export function assembleRevision(
  vals: Record<string, string>,
  pregnant: boolean,
  covered: Set<string>,
): string {
  const apply = REVISION_QUESTIONS.filter(
    (q) => (pregnant || !q.gestanteOnly) && !covered.has(q.id),
  );
  if (!apply.length) return "";

  const allNormal = apply.every((q) => revIsNormal(q, vals));
  if (allNormal) {
    const has = (id: string) => apply.some((q) => q.id === id);
    const parts: string[] = [];
    const g1 = [has("sangramento") ? "sangramento transvaginal" : "", has("secrecao") ? "corrimento" : ""].filter(Boolean);
    if (g1.length) parts.push(`Nega ${g1.join(" e ")}`);
    const g2 = [has("urinario") ? "urinárias" : "", has("intestinal") ? "intestinais" : ""].filter(Boolean);
    if (g2.length) parts.push(`Nega alterações ${g2.join(" e ")}`);
    const g3: string[] = [];
    if (has("contracoes")) g3.push("Nega contrações no momento");
    if (has("mf")) g3.push("relata boa movimentação fetal");
    if (g3.length) parts.push(g3.join(", "));
    parts.push("Nega demais queixas");
    return `${parts.join(". ")}.`;
  }

  const parts = apply.map((q) => revText(q, vals));
  parts.push("Nega demais queixas");
  return `${parts.join(". ")}.`;
}

/** Texto final da HPMA (MAIÚSCULAS): chegada + QPs + revisão dirigida. */
export function assembleHpma(input: {
  selectedIds: string[];
  vals: Record<string, string>;
  pregnant: boolean;
  ambulance: boolean;
  from: string;
  hasCompanion: boolean;
}): string {
  const { selectedIds, vals, pregnant, ambulance, from, hasCompanion } = input;
  const templates = HPMA_TEMPLATES.filter((t) => selectedIds.includes(t.id));
  const covered = new Set<string>();
  for (const t of templates) for (const c of t.covers ?? []) covered.add(c);

  const arrival = assembleArrival(ambulance, from, hasCompanion);
  const qps = templates.map((t, i) => assembleQp(t, vals, i));
  const revision = assembleRevision(vals, pregnant, covered);

  return clean([arrival, ...qps, revision].filter((s) => s.trim()).join(" ")).toUpperCase();
}
