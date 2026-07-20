/**
 * Classificação do tipo de receita por princípio ativo, para o sistema sugerir
 * automaticamente o receituário. Base: **ANVISA, Portaria SVS/MS nº 344/1998** e
 * atualizações (listas de substâncias sujeitas a controle especial); antimicro-
 * bianos seguem a **RDC 471/2021** (receita comum retida, 2 vias).
 *
 * Regras adotadas (decisão do serviço):
 *  - Listas **A1/A2/A3** (entorpecentes/psicotrópicos) → Notificação de Receita A
 *    (amarela): **não impressa aqui** (proibido por lei — usa formulário oficial).
 *  - Listas **B1/B2** (psicotrópicos/anorexígenos) → Notificação B (azul):
 *    **não impressa aqui**.
 *  - Lista **C1** (controle especial) e **C2/retinoides/talidomida** (notificação
 *    branca) → **Receituário de Controle Especial** (Especial).
 *  - Demais → **Comum** (padrão seguro; o prescritor confere).
 *
 * Apoio à decisão — lista curada, **validar com a equipe/farmácia**. Não é a
 * relação completa da Portaria 344; itens não listados caem em Comum.
 */

export type ControleClasse = "COMUM" | "ESPECIAL" | "NOTIFICACAO_A" | "NOTIFICACAO_B";

// keyword (normalizado) → classe. Combinações assumem a mais restritiva.
const MAP: [string, ControleClasse][] = [
  // Notificação A (amarela): entorpecentes A1/A2 e psicotrópicos A3
  ["morfina", "NOTIFICACAO_A"],
  ["metadona", "NOTIFICACAO_A"],
  ["fentanil", "NOTIFICACAO_A"],
  ["sufentanil", "NOTIFICACAO_A"],
  ["remifentanil", "NOTIFICACAO_A"],
  ["oxicodona", "NOTIFICACAO_A"],
  ["hidromorfona", "NOTIFICACAO_A"],
  ["petidina", "NOTIFICACAO_A"],
  ["meperidina", "NOTIFICACAO_A"],
  ["codeina", "NOTIFICACAO_A"],
  ["metilfenidato", "NOTIFICACAO_A"],
  ["lisdexanfetamina", "NOTIFICACAO_A"],
  // Notificação B (azul): B1 (benzodiazepínicos/hipnóticos) e B2 (anorexígenos)
  ["diazepam", "NOTIFICACAO_B"],
  ["clonazepam", "NOTIFICACAO_B"],
  ["alprazolam", "NOTIFICACAO_B"],
  ["lorazepam", "NOTIFICACAO_B"],
  ["bromazepam", "NOTIFICACAO_B"],
  ["midazolam", "NOTIFICACAO_B"],
  ["nitrazepam", "NOTIFICACAO_B"],
  ["flurazepam", "NOTIFICACAO_B"],
  ["clobazam", "NOTIFICACAO_B"],
  ["cloxazolam", "NOTIFICACAO_B"],
  ["estazolam", "NOTIFICACAO_B"],
  ["flunitrazepam", "NOTIFICACAO_B"],
  ["clordiazepoxido", "NOTIFICACAO_B"],
  ["zolpidem", "NOTIFICACAO_B"],
  ["zopiclona", "NOTIFICACAO_B"],
  ["fenobarbital", "NOTIFICACAO_B"],
  ["femproporex", "NOTIFICACAO_B"],
  ["anfepramona", "NOTIFICACAO_B"],
  ["mazindol", "NOTIFICACAO_B"],
  ["sibutramina", "NOTIFICACAO_B"],
  // Controle especial (C1) — antidepressivos, anticonvulsivantes, antipsicóticos,
  // antiparkinsonianos, tramadol, etc.
  ["tramadol", "ESPECIAL"],
  ["amitriptilina", "ESPECIAL"],
  ["nortriptilina", "ESPECIAL"],
  ["imipramina", "ESPECIAL"],
  ["clomipramina", "ESPECIAL"],
  ["fluoxetina", "ESPECIAL"],
  ["sertralina", "ESPECIAL"],
  ["paroxetina", "ESPECIAL"],
  ["citalopram", "ESPECIAL"],
  ["escitalopram", "ESPECIAL"],
  ["venlafaxina", "ESPECIAL"],
  ["desvenlafaxina", "ESPECIAL"],
  ["duloxetina", "ESPECIAL"],
  ["bupropiona", "ESPECIAL"],
  ["mirtazapina", "ESPECIAL"],
  ["trazodona", "ESPECIAL"],
  ["carbamazepina", "ESPECIAL"],
  ["oxcarbazepina", "ESPECIAL"],
  ["valproico", "ESPECIAL"],
  ["valproato", "ESPECIAL"],
  ["divalproato", "ESPECIAL"],
  ["fenitoina", "ESPECIAL"],
  ["gabapentina", "ESPECIAL"],
  ["pregabalina", "ESPECIAL"],
  ["lamotrigina", "ESPECIAL"],
  ["topiramato", "ESPECIAL"],
  ["haloperidol", "ESPECIAL"],
  ["clorpromazina", "ESPECIAL"],
  ["levomepromazina", "ESPECIAL"],
  ["risperidona", "ESPECIAL"],
  ["quetiapina", "ESPECIAL"],
  ["olanzapina", "ESPECIAL"],
  ["clozapina", "ESPECIAL"],
  ["ziprasidona", "ESPECIAL"],
  ["aripiprazol", "ESPECIAL"],
  ["biperideno", "ESPECIAL"],
  ["litio", "ESPECIAL"],
  // C2 (retinoides sistêmicos) e talidomida → notificação branca → Especial
  ["isotretinoina", "ESPECIAL"],
  ["acitretina", "ESPECIAL"],
  ["tretinoina", "ESPECIAL"],
  ["talidomida", "ESPECIAL"],
];

const RANK: Record<ControleClasse, number> = {
  NOTIFICACAO_A: 3,
  NOTIFICACAO_B: 2,
  ESPECIAL: 1,
  COMUM: 0,
};

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Classe de controle do princípio ativo (a mais restritiva, em combinações). */
export function classificarPrincipio(pa: string): ControleClasse {
  const n = norm(pa);
  let best: ControleClasse = "COMUM";
  for (const [kw, cls] of MAP) {
    if (n.includes(kw) && RANK[cls] > RANK[best]) best = cls;
  }
  return best;
}

export interface ControleInfo {
  classe: ControleClasse;
  label: string;
  /** true = não pode ser impressa aqui (exige notificação oficial). */
  bloqueado: boolean;
  /** Tipo de receituário sugerido (null quando bloqueado). */
  tipoReceita: "COMUM" | "ESPECIAL" | null;
  aviso?: string;
}

export function controleInfo(pa: string): ControleInfo {
  const classe = classificarPrincipio(pa);
  switch (classe) {
    case "NOTIFICACAO_A":
      return {
        classe,
        label: "Notificação A (amarela)",
        bloqueado: true,
        tipoReceita: null,
        aviso:
          "Exige Notificação de Receita A (amarela) — não pode ser impressa por aqui (proibido por lei; use o formulário oficial numerado).",
      };
    case "NOTIFICACAO_B":
      return {
        classe,
        label: "Notificação B (azul)",
        bloqueado: true,
        tipoReceita: null,
        aviso:
          "Exige Notificação de Receita B (azul) — não pode ser impressa por aqui (proibido por lei; use o formulário oficial numerado).",
      };
    case "ESPECIAL":
      return { classe, label: "Controle especial", bloqueado: false, tipoReceita: "ESPECIAL" };
    default:
      return { classe, label: "Comum", bloqueado: false, tipoReceita: "COMUM" };
  }
}
