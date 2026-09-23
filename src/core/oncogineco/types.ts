/**
 * Onco-Ginecologia (enfermaria) — dados específicos do módulo. Regra de Ouro:
 * a paciente vive em `patients` (module = "oncogineco"); o que é só da onco
 * fica em `patients.clinical_summary.onco` (este tipo). Vitais viram
 * `observations`. O texto segue a estrutura da "ENFERMARIA GO GERAL" do
 * serviço, adaptada ao contexto oncológico/cirúrgico.
 */

export interface OncoHistory {
  origin: string;
  diagnosis: string; // ex.: CARCINOMA DE COLO UTERINO
  histology: string; // ex.: CEC / ADENOCARCINOMA
  staging: string; // ex.: FIGO IB2 (texto livre)
  priorTreatment: string; // QT/RT/cirurgias prévias pelo câncer
  admissionReason: string; // motivo da internação
  surgery: string; // procedimento realizado nesta internação
  surgeryDate: string; // ISO (data)
  cmb: string;
  meu: string;
  pastMeds: string;
  surgeries: string; // cirurgias prévias
  allergies: string;
  hcv: string;
  context: string; // CONTEXTO INTERNAÇÃO
}

export interface ChoiceItem {
  id: string;
  label: string;
  options: { label: string; text: string }[];
}

export const ONCO_EVOLUTION_ITEMS: ChoiceItem[] = [
  {
    id: "company",
    label: "Com",
    options: [
      { label: "Acompanhante", text: "COM ACOMPANHANTE" },
      { label: "Sozinha", text: "DESACOMPANHADA" },
    ],
  },
  {
    id: "pain",
    label: "Dor",
    options: [
      { label: "Nega", text: "NEGA DOR" },
      { label: "Controlada", text: "REFERE DOR CONTROLADA COM ANALGESIA" },
      { label: "Importante", text: "REFERE DOR DE DIFÍCIL CONTROLE" },
    ],
  },
  {
    id: "nausea",
    label: "Náuseas",
    options: [
      { label: "Nega", text: "NEGA NÁUSEAS E VÔMITOS" },
      { label: "Náuseas", text: "REFERE NÁUSEAS" },
      { label: "Vômitos", text: "REFERE NÁUSEAS E VÔMITOS" },
    ],
  },
  {
    id: "diet",
    label: "Dieta",
    options: [
      { label: "Aceitando bem", text: "ACEITANDO BEM A DIETA" },
      { label: "Baixa aceitação", text: "COM BAIXA ACEITAÇÃO DA DIETA" },
      { label: "Dieta zero", text: "EM DIETA ZERO" },
    ],
  },
  {
    id: "urine",
    label: "Diurese",
    options: [
      { label: "Sem alterações", text: "DIURESE PRESENTE, SEM ALTERAÇÕES" },
      { label: "Em SVD", text: "EM USO DE SVD" },
      { label: "Disúria", text: "REFERE DISÚRIA" },
    ],
  },
  {
    id: "bowel",
    label: "Intestino",
    options: [
      { label: "Evacuação +", text: "EVACUAÇÃO PRESENTE" },
      { label: "Flatos +", text: "AINDA NÃO EVACUOU, FLATOS PRESENTES" },
      { label: "Sem flatos", text: "NEGA FLATOS E EVACUAÇÃO" },
    ],
  },
  {
    id: "walk",
    label: "Deambulação",
    options: [
      { label: "Sem dificuldades", text: "DEAMBULANDO SEM DIFICULDADES" },
      { label: "Com auxílio", text: "DEAMBULANDO COM AUXÍLIO" },
      { label: "Restrita ao leito", text: "RESTRITA AO LEITO" },
    ],
  },
  {
    id: "bleeding",
    label: "Sangramento vaginal",
    options: [
      { label: "Nega", text: "NEGA SANGRAMENTO VAGINAL" },
      { label: "Pequena quant.", text: "REFERE SANGRAMENTO VAGINAL EM PEQUENA QUANTIDADE" },
      { label: "Importante", text: "REFERE SANGRAMENTO VAGINAL IMPORTANTE" },
    ],
  },
  {
    id: "fever",
    label: "Febre",
    options: [
      { label: "Nega", text: "NEGA FEBRE" },
      { label: "Relata", text: "REFERE FEBRE" },
    ],
  },
];

export const ONCO_PLAN_ITEMS: { id: string; text: string; default: boolean }[] = [
  { id: "programacao", text: "ORIENTO PACIENTE E ACOMPANHANTE QUANTO À PROGRAMAÇÃO DA INTERNAÇÃO", default: true },
  { id: "analgesia", text: "MANTENHO ANALGESIA", default: true },
  { id: "tev", text: "MANTENHO PROFILAXIA DE TEV", default: true },
  { id: "deambulacao", text: "ESTIMULO DEAMBULAÇÃO", default: true },
  { id: "dieta", text: "PROGRIDO DIETA CONFORME ACEITAÇÃO", default: false },
  { id: "medicacoes", text: "MANTENHO MEDICAÇÕES", default: true },
  { id: "ap", text: "AGUARDO ANATOMOPATOLÓGICO", default: false },
  { id: "evolucao", text: "AGUARDO EVOLUÇÃO", default: true },
];

export const ONCO_DISCHARGE_ITEMS: { id: string; text: string }[] = [
  { id: "alta", text: "ALTA HOSPITALAR" },
  { id: "sintomaticos", text: "FORNEÇO RECEITUÁRIO COM SINTOMÁTICOS" },
  { id: "fo", text: "ORIENTO QUANTO AOS CUIDADOS COM FO" },
  { id: "pontos", text: "ENCAMINHO AO CURATIVO LIMPO/PSF PARA RETIRADA DOS PONTOS EM 10-15 DIAS" },
  { id: "ambulatorio", text: "ORIENTO RETORNO AO AMBULATÓRIO DE ONCOGINECOLOGIA DO HC UFTM COM RESULTADO DE ANATOMOPATOLÓGICO" },
  { id: "atestado", text: "FORNEÇO ATESTADO MÉDICO" },
  { id: "alarme", text: "ORIENTO SINAIS DE ALARME, RETORNAR AO PSGO SE NECESSÁRIO" },
];

export interface OncoExam {
  general: string;
  ar: string;
  acv: string;
  abdomen: string;
  wound: string; // FO ("" = sem FO)
  gyneco: string;
  limbs: string;
}

export interface OncoVitals {
  paSystolic: string;
  paDiastolic: string;
  fc: string;
  fr: string;
  tax: string;
  spo2: string;
}

export interface OncoEvolutionForm {
  date: string;
  choices: Record<string, string>;
  complaints: string;
  ecog: string; // "" | "0".."4"
  painScore: string; // EVA 0-10
  vitals: OncoVitals;
  exam: OncoExam;
  devices: string; // drenos / sondas / débitos
  nursingParams: string;
  labs: string;
  hdExtra: string;
  plan: Record<string, boolean>;
  planExtra: string;
  preceptor: string;
  mode: "internacao" | "alta";
  conduct: string;
  discharge: Record<string, boolean>;
  dischargeExtra: string;
}

export interface SavedEvolution {
  id: string;
  at: string;
  author?: string;
  text: string;
}

export interface OncoSummary {
  history: OncoHistory;
  lastForm?: OncoEvolutionForm;
  evolutions: SavedEvolution[];
}

export function emptyOncoHistory(): OncoHistory {
  return {
    origin: "",
    diagnosis: "",
    histology: "",
    staging: "",
    priorTreatment: "",
    admissionReason: "",
    surgery: "",
    surgeryDate: "",
    cmb: "",
    meu: "",
    pastMeds: "",
    surgeries: "",
    allergies: "",
    hcv: "",
    context: "",
  };
}

export function emptyOncoExam(): OncoExam {
  return {
    general: "BEG, AUTO E ALO ORIENTADA, CORADA, HIDRATADA, AFEBRIL",
    ar: "MV+, SEM RA, EUPNEICA",
    acv: "BRNF 2T, SS, PULSOS CHEIOS",
    abdomen: "PLANO, FLÁCIDO, RHA+, INDOLOR A PALPAÇÃO, SEM SINAIS DE IRRITAÇÃO PERITONEAL",
    wound: "",
    gyneco: "SEM SANGRAMENTO ATIVO",
    limbs: "SEM EDEMAS, PANTURRILHAS LIVRES",
  };
}

export function emptyOncoForm(): OncoEvolutionForm {
  return {
    date: new Date().toISOString(),
    choices: Object.fromEntries(ONCO_EVOLUTION_ITEMS.map((i) => [i.id, i.options[0]!.text])),
    complaints: "",
    ecog: "",
    painScore: "",
    vitals: { paSystolic: "", paDiastolic: "", fc: "", fr: "", tax: "", spo2: "" },
    exam: emptyOncoExam(),
    devices: "",
    nursingParams: "",
    labs: "",
    hdExtra: "",
    plan: Object.fromEntries(ONCO_PLAN_ITEMS.map((p) => [p.id, p.default])),
    planExtra: "",
    preceptor: "",
    mode: "internacao",
    conduct: "",
    discharge: Object.fromEntries(ONCO_DISCHARGE_ITEMS.map((d) => [d.id, true])),
    dischargeExtra: "",
  };
}

/** Formulário do dia a partir do último salvo (vitais, queixas e parâmetros zeram). */
export function nextOncoForm(last: OncoEvolutionForm | undefined): OncoEvolutionForm {
  const base = emptyOncoForm();
  if (!last) return base;
  return {
    ...base,
    ...last,
    exam: { ...base.exam, ...last.exam },
    choices: { ...base.choices, ...last.choices },
    plan: { ...base.plan, ...last.plan },
    discharge: { ...base.discharge, ...last.discharge },
    date: base.date,
    complaints: "",
    painScore: "",
    vitals: base.vitals,
    nursingParams: "",
    mode: "internacao",
  };
}

export function readOnco(summary: Record<string, unknown> | null | undefined): OncoSummary {
  const raw = (summary?.onco ?? {}) as Partial<OncoSummary>;
  return {
    history: { ...emptyOncoHistory(), ...(raw.history ?? {}) },
    lastForm: raw.lastForm,
    evolutions: raw.evolutions ?? [],
  };
}
