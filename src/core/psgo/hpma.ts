/**
 * HPMAs padronizadas do PSGO. Cada QP/HD tem um MODELO de texto com lacunas
 * (`___`) e escolhas (`[a/b/c]`). O gerador monta o texto a partir de campos e
 * botões e o insere na caixa de HPMA para edição final.
 *
 * Conteúdo validado com a equipe — apoio à documentação, não conduta.
 */

export interface HpmaTemplate {
  id: string;
  /** Rótulo do botão (QP/HD). */
  label: string;
  /** Só oferecido para gestantes. */
  gestanteOnly?: boolean;
  /** Texto-modelo com `___` (lacuna) e `[a/b/c]` (escolha). */
  text: string;
}

export const HPMA_TEMPLATES: HpmaTemplate[] = [
  {
    id: "geca",
    label: "GECA",
    text:
      "Paciente refere quadro de dor abdominal em cólica, difusa, associada a evacuações diarreicas em número de ___ episódios ao dia, com início há ___ dias. [Associa náuseas e ___ episódios de vômitos/Nega náuseas e vômitos]. [Refere/Nega] febre [termometrada/não termometrada]. [Nega/Relata] muco ou sangue nas fezes. [Refere/Nega] contato com pessoas com sintomas semelhantes ou alimento suspeito. Refere aceitação [boa/parcial/ruim] da dieta e ingesta hídrica ___ L por dia.",
  },
  {
    id: "febre",
    label: "Febre",
    text:
      "Paciente refere febre aferida de até ___ °C, com início há ___ dias, de padrão [contínuo/intermitente], (não) associada a [calafrios/mialgia/prostração]. [Refere/Nega] sintomas urinários (disúria, polaciúria, dor lombar). [Refere/Nega] sintomas respiratórios (tosse, coriza, odinofagia, dispneia). [Refere/Nega] dor abdominal. [Fez/Não fez] uso de antitérmico com [melhora completa/parcial/sem melhora]. Nega secreção vaginal fétida.",
  },
  {
    id: "dor_baixo_ventre",
    label: "Dor em baixo ventre",
    text:
      "Paciente refere dor em baixo ventre/hipogástrio, de caráter [cólica/contínua/em peso], intensidade ___/10, com início há ___, [com/sem] irradiação para ___, [com/sem] fatores de melhora ou piora (quais). [Refere/Nega] relação com esforço, micção ou evacuação. Nega febre.",
  },
  {
    id: "dengue",
    label: "Dengue",
    text:
      "Paciente refere febre há ___ dias associada a cefaleia [retro-orbitária], mialgia, artralgia e prostração. [Refere/Nega] exantema, dor abdominal e náuseas/vômitos. Nega sinais de alarme (dor abdominal intensa e contínua, vômitos persistentes, sangramento de mucosas, sonolência/irritabilidade, lipotimia). [Refere/Nega] período de epidemia local ou contato com casos. Nega sintomas urinários ou respiratórios.",
  },
  {
    id: "sindrome_gripal",
    label: "Síndrome gripal",
    text:
      "Paciente refere quadro com início há ___ dias de febre associada a tosse, [odinofagia/coriza/congestão nasal], mialgia e cefaleia. [Refere/Nega] dispneia; saturação de O2 em ar ambiente de ___%. [Refere/Nega] contato com sintomáticos respiratórios. Nega dor torácica. Nega sintomas urinários ou perda vaginal.",
  },
  {
    id: "nausea_vomitos",
    label: "Náusea e vômitos",
    text:
      "Paciente refere náuseas e ___ episódios de vômitos ao dia, com início há ___ dias, de conteúdo [alimentar/bilioso], sem sangue. [Associa/Nega] dor abdominal. Refere aceitação [boa/parcial/ausente] da dieta via oral. [Refere/Nega] sinais de desidratação (boca seca, tontura, oligúria). [Nega/Relata] febre e diarreia.",
  },
  {
    id: "reducao_mf",
    label: "Redução da movimentação fetal",
    gestanteOnly: true,
    text:
      "Gestante refere percepção de redução dos movimentos fetais há ___ horas, em relação ao padrão habitual, [após/independente de] período de repouso. [Realizou/Não realizou] manobras de estímulo e ingesta, com [retorno/persistência da redução] da movimentação. Nega dor abdominal. Última avaliação/USG em ___.",
  },
  {
    id: "fase_ativa_tp",
    label: "Fase ativa de TP",
    gestanteOnly: true,
    text:
      "Gestante de ___ semanas refere contrações uterinas dolorosas e regulares, com início há ___, atualmente com frequência de ___ em 10 minutos e intensidade progressiva. [Refere/Nega] perda de tampão mucoso. [Refere/Nega] perda de líquido (hora ___, aspecto [claro/meconial]). Refere movimentação fetal presente. Nega sangramento vaginal em grande quantidade.",
  },
  {
    id: "prodromos_tp",
    label: "Pródromos de TP",
    gestanteOnly: true,
    text:
      "Gestante de ___ semanas refere contrações uterinas irregulares, de baixa intensidade, que [aliviam/não aliviam] ao repouso, com início há ___. [Refere/Nega] perda de tampão mucoso. Nega perda de líquido. Refere movimentação fetal presente. Nega sangramento vaginal.",
  },
  {
    id: "pico_hipertensivo",
    label: "Pico hipertensivo",
    text:
      "Gestante/puérpera de ___ semanas/dias de puerpério, [assintomática/com sintomas], refere aferição de PA elevada (___ x ___ mmHg) [em domicílio/na triagem]. [Refere/Nega] sinais de iminência de eclâmpsia: cefaleia holocraniana, alterações visuais (escotomas, turvação), dor epigástrica ou em hipocôndrio direito, náuseas/vômitos. [Em uso de anti-hipertensivo/Sem anti-hipertensivo em uso]. Refere movimentação fetal presente. Nega sangramento vaginal ou perda de líquido.",
  },
  {
    id: "sangramento_tv",
    label: "Sangramento TV",
    text:
      "Paciente refere sangramento via vaginal com início há ___, em [pequena/moderada/grande] quantidade (forrando ___ absorventes), [com/sem] coágulos, [associado a/sem] dor abdominal em cólica. [Refere/Nega] relação com atividade sexual ou trauma. Idade gestacional/estado: ___. Nega perda de líquido.",
  },
];

// --- Revisão dirigida (6 perguntas globais; contrações e MF só p/ gestante) ---

export interface RevisionOption {
  value: string;
  label: string;
  text: string;
}
export interface RevisionQuestion {
  id: string;
  label: string;
  gestanteOnly?: boolean;
  options: RevisionOption[];
}

export const REVISION_QUESTIONS: RevisionQuestion[] = [
  {
    id: "sangramento",
    label: "Sangramento vaginal",
    options: [
      { value: "ausente", label: "Ausente", text: "NEGA SANGRAMENTO VAGINAL" },
      { value: "peq", label: "Pequena", text: "REFERE SANGRAMENTO VAGINAL EM PEQUENA QUANTIDADE" },
      { value: "mod", label: "Moderada", text: "REFERE SANGRAMENTO VAGINAL EM MODERADA QUANTIDADE" },
      { value: "grande", label: "Grande", text: "REFERE SANGRAMENTO VAGINAL EM GRANDE QUANTIDADE" },
    ],
  },
  {
    id: "secrecao",
    label: "Secreção / perda de líquido",
    options: [
      { value: "ausente", label: "Ausente", text: "NEGA PERDA DE LÍQUIDO OU SECREÇÃO VAGINAL" },
      { value: "secrecao", label: "Secreção vaginal", text: "REFERE SECREÇÃO VAGINAL" },
      { value: "claro", label: "Líquido claro", text: "REFERE PERDA DE LÍQUIDO CLARO" },
      { value: "meconial", label: "Líquido meconial", text: "REFERE PERDA DE LÍQUIDO MECONIAL" },
    ],
  },
  {
    id: "intestinal",
    label: "Hábito intestinal",
    options: [
      { value: "preservado", label: "Preservado", text: "HÁBITO INTESTINAL PRESERVADO" },
      { value: "constipacao", label: "Constipação", text: "HÁBITO INTESTINAL ALTERADO (CONSTIPAÇÃO)" },
      { value: "diarreia", label: "Diarreia", text: "HÁBITO INTESTINAL ALTERADO (DIARREIA)" },
    ],
  },
  {
    id: "urinario",
    label: "Hábito urinário",
    options: [
      { value: "preservado", label: "Preservado", text: "HÁBITO URINÁRIO PRESERVADO" },
      { value: "disuria", label: "Disúria", text: "RELATA DISÚRIA" },
      { value: "polaciuria", label: "Polaciúria", text: "RELATA POLACIÚRIA" },
      { value: "retencao", label: "Retenção", text: "RELATA RETENÇÃO URINÁRIA" },
    ],
  },
  {
    id: "contracoes",
    label: "Contrações",
    gestanteOnly: true,
    options: [
      { value: "ausentes", label: "Ausentes", text: "NEGA CONTRAÇÕES" },
      { value: "irreg", label: "Irregulares", text: "REFERE CONTRAÇÕES IRREGULARES" },
      { value: "reg", label: "Regulares", text: "REFERE CONTRAÇÕES REGULARES" },
    ],
  },
  {
    id: "mf",
    label: "Movimentação fetal",
    gestanteOnly: true,
    options: [
      { value: "presente", label: "Presente", text: "REFERE MOVIMENTAÇÃO FETAL PRESENTE" },
      { value: "reduzida", label: "Reduzida", text: "REFERE MOVIMENTAÇÃO FETAL REDUZIDA" },
      { value: "ausente", label: "Ausente", text: "REFERE MOVIMENTAÇÃO FETAL AUSENTE" },
    ],
  },
];

// --- Parser / montador ---

export type HpmaSeg =
  | { t: "text"; v: string }
  | { t: "blank"; i: number }
  | { t: "choice"; i: number; options: string[] };

/** Quebra o modelo em segmentos: texto, lacuna (`___`) e escolha (`[a/b/c]`). */
export function parseTemplate(text: string): HpmaSeg[] {
  const segs: HpmaSeg[] = [];
  const re = /\[([^\]]+)\]|___/g;
  let last = 0;
  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ t: "text", v: text.slice(last, m.index) });
    if (m[0] === "___") {
      segs.push({ t: "blank", i: idx++ });
    } else {
      segs.push({ t: "choice", i: idx++, options: m[1].split("/").map((s) => s.trim()) });
    }
    last = re.lastIndex;
  }
  if (last < text.length) segs.push({ t: "text", v: text.slice(last) });
  return segs;
}

/** Monta o parágrafo de um modelo com os valores preenchidos. */
export function assembleTemplate(
  tpl: HpmaTemplate,
  values: Record<string, string>,
): string {
  const segs = parseTemplate(tpl.text);
  let out = "";
  for (const s of segs) {
    if (s.t === "text") {
      out += s.v;
    } else if (s.t === "blank") {
      const v = (values[`${tpl.id}.${s.i}`] ?? "").trim();
      out += v || "___";
    } else {
      const v = values[`${tpl.id}.${s.i}`];
      out += v ? v : `[${s.options.join("/")}]`;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Frase de revisão dirigida (usa o 1º valor — negativo/normal — por padrão). */
export function assembleRevision(
  revValues: Record<string, string>,
  pregnant: boolean,
): string {
  const parts = REVISION_QUESTIONS.filter((q) => pregnant || !q.gestanteOnly).map((q) => {
    const v = revValues[q.id] ?? q.options[0].value;
    return (q.options.find((o) => o.value === v) ?? q.options[0]).text;
  });
  return parts.length ? `${parts.join(". ")}.` : "";
}

/** Texto final: parágrafos das QPs selecionadas + revisão dirigida. */
export function assembleHpma(
  selectedIds: string[],
  values: Record<string, string>,
  revValues: Record<string, string>,
  pregnant: boolean,
): string {
  const paras = HPMA_TEMPLATES.filter((t) => selectedIds.includes(t.id)).map((t) =>
    assembleTemplate(t, values),
  );
  const revision = assembleRevision(revValues, pregnant);
  return [...paras, revision].filter((s) => s.trim()).join(" ");
}
