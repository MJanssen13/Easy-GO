/**
 * Modelos de receita pré-preenchidos por situação/patologia do PSGO. Cada modelo
 * é uma lista de `PrescricaoItem` (todos EDITÁVEIS após aplicados) montada a
 * partir das receitas em uso no HC-UFTM. Opcionalmente carrega documentos
 * (relatórios/cartas/curvas — ver `receita-relatorios.ts`) e, para a DIP, o
 * esquema do parceiro.
 *
 * NÃO é motor de decisão: as doses vêm da prática institucional e devem ser
 * validadas/ajustadas pela equipe (ver CLAUDE.md). Não há vínculo com a HPMA —
 * o modelo é escolhido manualmente no gerador de receita.
 */
import { emptyPrescricaoItem, type PrescricaoItem } from "./prescricao";
import type { ReceitaDocId } from "./receita-relatorios";

/** Sobrescritas de um item do modelo (o `id` é gerado ao aplicar). */
export type TemplateItem = Partial<Omit<PrescricaoItem, "id">>;

export interface ReceitaTemplate {
  id: string;
  label: string;
  categoria: string;
  /** Dica de aplicabilidade ("Gestante" / "Ambos"). */
  gestante?: string;
  descricao?: string;
  items: TemplateItem[];
  /** Documentos opcionais sugeridos (o médico escolhe incluir ou não). */
  documentos?: ReceitaDocId[];
  /** Esquema do parceiro (DIP/sífilis): gera uma segunda receita em nome dele,
   *  opcionalmente com documentos próprios (ex.: carta de aplicação). */
  parceiro?: { label: string; items: TemplateItem[]; documentos?: ReceitaDocId[] };
}

/** Aplica um modelo: gera itens completos com ids novos (todos editáveis). */
export function applyTemplateItems(
  items: TemplateItem[],
  uid: () => string,
): PrescricaoItem[] {
  return items.map((it) => ({ ...emptyPrescricaoItem(uid()), ...it }));
}

// Parceiro da DIP: Azitromicina 1 g VO DU + Ceftriaxona 500 mg IM DU (clamídia + gonococo).
// Antibióticos → receituário de controle especial (ESPECIAL).
const PARCEIRO_DIP: TemplateItem[] = [
  {
    principioAtivo: "Azitromicina",
    concentracao: "500 mg",
    formaFarmaceutica: "Comprimido",
    tipoReceita: "ESPECIAL",
    qtDose: "2",
    tipoFrequencia: "UNICA",
    quantidadeReceitada: "2 comprimidos",
    recomendacoes: "Dose única (1 g).",
  },
  {
    principioAtivo: "Ceftriaxona",
    concentracao: "500 mg",
    formaFarmaceutica: "Frasco-ampola",
    via: "Intramuscular",
    tipoReceita: "ESPECIAL",
    registroManual: true,
    posologiaManual: "Aplicar 500 mg IM, dose única.",
    quantidadeReceitada: "1 ampola",
  },
];

const CEFTRIAXONA_IM_DU: TemplateItem = {
  principioAtivo: "Ceftriaxona",
  concentracao: "500 mg",
  formaFarmaceutica: "Frasco-ampola",
  via: "Intramuscular",
  tipoReceita: "ESPECIAL",
  registroManual: true,
  posologiaManual: "Aplicar 500 mg IM, dose única.",
  quantidadeReceitada: "1 ampola",
};

const METRONIDAZOL_DIP: TemplateItem = {
  principioAtivo: "Metronidazol",
  concentracao: "250 mg",
  formaFarmaceutica: "Comprimido",
  tipoReceita: "ESPECIAL",
  qtDose: "2",
  tipoFrequencia: "INTERVALO",
  intervaloHoras: "12",
  duracaoQt: "14",
  quantidadeReceitada: "56 comprimidos",
};

/** Item da penicilina benzatina (sífilis) conforme o nº de doses (1 ou 3). */
export function buildSifilisPenicilina(numDoses: string): TemplateItem {
  const n = (numDoses || "1").trim() || "1";
  const amp = 2 * (Number(n) || 1);
  return {
    principioAtivo: "Penicilina G Benzatina",
    concentracao: "1.200.000 UI",
    formaFarmaceutica: "Frasco-ampola",
    via: "Intramuscular",
    tipoReceita: "ESPECIAL",
    registroManual: true,
    posologiaManual:
      "Aplicar 1.200.000 UI IM em cada glúteo (total 2.400.000 UI por dose). " +
      (n === "1" ? "Dose única." : `${n} doses (uma por semana).`),
    quantidadeReceitada: `${amp} ampolas`,
  };
}

const SRO = (qtd: string, posologia: string): TemplateItem => ({
  principioAtivo: "Sais para reidratação oral",
  formaFarmaceutica: "Sachê",
  unidadeDose: "sachê",
  registroManual: true,
  posologiaManual: posologia,
  quantidadeReceitada: qtd,
});

/** Ordem das categorias na interface. */
export const RECEITA_CATEGORIAS = ["Infecções", "Sintomáticos", "Anemia", "Diabetes"] as const;

export const RECEITA_TEMPLATES: ReceitaTemplate[] = [
  // ---------------- Infecções ----------------
  {
    id: "dip",
    label: "DIP — Doença Inflamatória Pélvica",
    categoria: "Infecções",
    gestante: "Ambos",
    descricao: "Ceftriaxona IM + Doxiciclina + Metronidazol. Tratar também o parceiro.",
    items: [
      CEFTRIAXONA_IM_DU,
      {
        principioAtivo: "Doxiciclina",
        concentracao: "100 mg",
        formaFarmaceutica: "Comprimido",
        tipoReceita: "ESPECIAL",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "12",
        duracaoQt: "14",
        quantidadeReceitada: "28 comprimidos",
      },
      METRONIDAZOL_DIP,
    ],
    documentos: ["carta-aplicacao-im"],
    parceiro: {
      label: "Parceiro — Azitromicina 1 g + Ceftriaxona 500 mg IM",
      items: PARCEIRO_DIP,
      documentos: ["carta-aplicacao-im"],
    },
  },
  {
    id: "sifilis",
    label: "Sífilis — Penicilina Benzatina",
    categoria: "Infecções",
    gestante: "Ambos",
    descricao: "Penicilina Benzatina IM — selecione o nº de doses (1 ou 3). Tratar também o parceiro.",
    items: [buildSifilisPenicilina("1")],
    documentos: ["carta-sifilis"],
    parceiro: {
      label: "Parceiro — Penicilina Benzatina IM",
      items: [buildSifilisPenicilina("1")],
      documentos: ["carta-sifilis-parceiro"],
    },
  },
  {
    id: "toxo-precoce",
    label: "Toxoplasmose aguda — até 16 sem (Espiramicina)",
    categoria: "Infecções",
    gestante: "Gestante",
    items: [
      {
        principioAtivo: "Espiramicina",
        concentracao: "500 mg (1.500.000 UI)",
        formaFarmaceutica: "Comprimido",
        tipoReceita: "ESPECIAL",
        qtDose: "2",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        usoContinuo: true,
        quantidadeReceitada: "180 comprimidos",
      },
    ],
    documentos: ["relatorio-toxo"],
  },
  {
    id: "toxo-triplice",
    label: "Toxoplasmose aguda — a partir de 16 sem (esquema tríplice)",
    categoria: "Infecções",
    gestante: "Gestante",
    items: [
      {
        principioAtivo: "Ácido folínico",
        concentracao: "15 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "FREQUENCIA",
        vezesAoDia: "1",
        usoContinuo: true,
        quantidadeReceitada: "30 comprimidos",
      },
      {
        principioAtivo: "Pirimetamina",
        concentracao: "25 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "12",
        usoContinuo: true,
        quantidadeReceitada: "60 comprimidos",
      },
      {
        principioAtivo: "Sulfadiazina",
        concentracao: "500 mg",
        formaFarmaceutica: "Comprimido",
        tipoReceita: "ESPECIAL",
        qtDose: "2",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        usoContinuo: true,
        quantidadeReceitada: "180 comprimidos",
      },
    ],
    documentos: ["relatorio-toxo"],
  },
  {
    id: "infeccao-fo",
    label: "Infecção de ferida operatória (Cipro + Clinda)",
    categoria: "Infecções",
    gestante: "Ambos",
    items: [
      {
        principioAtivo: "Ciprofloxacino",
        concentracao: "500 mg",
        formaFarmaceutica: "Comprimido",
        tipoReceita: "ESPECIAL",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "12",
        duracaoQt: "7",
        quantidadeReceitada: "14 comprimidos",
      },
      {
        principioAtivo: "Clindamicina",
        concentracao: "300 mg",
        formaFarmaceutica: "Comprimido",
        tipoReceita: "ESPECIAL",
        qtDose: "2",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "6",
        duracaoQt: "7",
        quantidadeReceitada: "56 comprimidos",
      },
    ],
    documentos: ["curva-termica"],
  },

  // ---------------- Sintomáticos ----------------
  {
    id: "dengue",
    label: "Dengue — sintomáticos + hidratação",
    categoria: "Sintomáticos",
    gestante: "Ambos",
    items: [
      {
        principioAtivo: "Paracetamol",
        concentracao: "750 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se dor ou febre. EVITAR AAS e anti-inflamatórios.",
      },
      {
        principioAtivo: "Ondansetrona",
        concentracao: "4 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se náuseas ou vômitos.",
      },
      SRO(
        "10 sachês",
        "Diluir 1 sachê em 1 litro de água e tomar 1,5 a 2 litros por dia, além de outros líquidos.",
      ),
    ],
    documentos: ["curva-termica"],
  },
  {
    id: "gripal",
    label: "Síndrome gripal / COVID — sintomáticos",
    categoria: "Sintomáticos",
    gestante: "Ambos",
    items: [
      {
        principioAtivo: "Dipirona",
        concentracao: "500 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se dor ou febre.",
      },
      {
        principioAtivo: "Loratadina",
        concentracao: "10 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "FREQUENCIA",
        vezesAoDia: "1",
        momento: "AO_DEITAR",
        duracaoQt: "5",
        quantidadeReceitada: "1 caixa",
      },
      {
        principioAtivo: "Cloreto de sódio 0,9% (soro fisiológico)",
        formaFarmaceutica: "Solução nasal",
        via: "Nasal",
        unidadeDose: "gota",
        registroManual: true,
        posologiaManual: "Lavar as narinas de 4 em 4 horas.",
        quantidadeReceitada: "1 frasco",
      },
    ],
    documentos: ["curva-termica"],
  },
  {
    id: "geca-diarreia",
    label: "GECA com diarreia",
    categoria: "Sintomáticos",
    gestante: "Ambos",
    items: [
      {
        principioAtivo: "Meclizina",
        concentracao: "25 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se náuseas ou vômitos.",
      },
      {
        principioAtivo: "Ondansetrona",
        concentracao: "8 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se náuseas ou vômitos.",
      },
      SRO(
        "3 sachês",
        "Diluir 1 sachê em 1 litro de água potável e tomar ao longo do dia, por 3 dias (desprezar após 24 h na geladeira).",
      ),
    ],
    documentos: ["curva-termica"],
  },
  {
    id: "geca-sem-diarreia",
    label: "GECA sem diarreia",
    categoria: "Sintomáticos",
    gestante: "Gestante",
    items: [
      {
        principioAtivo: "Ácido fólico",
        concentracao: "5 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "TURNO",
        turnos: ["Manhã"],
        usoContinuo: true,
        quantidadeReceitada: "1 caixa",
      },
      {
        principioAtivo: "Ondansetrona",
        concentracao: "4 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se náuseas ou vômitos.",
      },
      {
        principioAtivo: "Meclizina",
        concentracao: "25 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se náuseas/vômitos refratários à ondansetrona.",
      },
    ],
  },
  {
    id: "nausea-vomitos",
    label: "Náuseas e vômitos / hiperêmese",
    categoria: "Sintomáticos",
    gestante: "Gestante",
    items: [
      {
        principioAtivo: "Meclizina",
        concentracao: "25 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se náuseas ou vômitos.",
      },
      {
        principioAtivo: "Metoclopramida",
        concentracao: "10 mg",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se náuseas ou vômitos (intercalar com os demais).",
      },
      {
        principioAtivo: "Dimenidrinato + Piridoxina (Dramin B6)",
        formaFarmaceutica: "Comprimido",
        qtDose: "1",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        quantidadeReceitada: "1 caixa",
        recomendacoes: "Se náuseas ou vômitos refratários.",
      },
      SRO(
        "10 sachês",
        "Diluir 1 sachê em 1 litro de água e tomar 200 ml a cada episódio de perda; além disso, 200 ml a cada 2–3 horas.",
      ),
    ],
  },
  {
    id: "constipacao",
    label: "Constipação / flatulência (adjuvante)",
    categoria: "Sintomáticos",
    gestante: "Ambos",
    items: [
      {
        principioAtivo: "Lactulose",
        concentracao: "667 mg/mL",
        formaFarmaceutica: "Xarope",
        qtDose: "10",
        unidadeDose: "mL",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        duracaoQt: "5",
        quantidadeReceitada: "1 frasco",
      },
      {
        principioAtivo: "Simeticona",
        concentracao: "125 mg",
        formaFarmaceutica: "Cápsula",
        qtDose: "1",
        unidadeDose: "cápsula",
        tipoFrequencia: "INTERVALO",
        intervaloHoras: "8",
        duracaoQt: "5",
        quantidadeReceitada: "1 caixa",
      },
    ],
  },

  // ---------------- Anemia ----------------
  {
    id: "ferro-ev",
    label: "Anemia — ferro endovenoso (Noripurum)",
    categoria: "Anemia",
    gestante: "Ambos",
    items: [
      {
        principioAtivo: "Prometazina",
        concentracao: "25 mg",
        formaFarmaceutica: "Comprimido",
        registroManual: true,
        posologiaManual: "Tomar 1 comprimido VO 30 minutos antes da infusão do Noripurum.",
        quantidadeReceitada: "1 caixa",
      },
      {
        principioAtivo: "Sacarato de hidróxido férrico (Noripurum)",
        concentracao: "20 mg/mL",
        formaFarmaceutica: "Ampola",
        via: "Intravenosa",
        unidadeDose: "ampola",
        registroManual: true,
        posologiaManual:
          "Diluir 2 ampolas em 250 mL de SF 0,9% e infundir EV em 1 hora, a cada 3 dias, até completar 10 ampolas (5 aplicações).",
        quantidadeReceitada: "10 ampolas",
      },
    ],
    documentos: ["carta-noripurum"],
  },

  // ---------------- Diabetes ----------------
  {
    id: "dmg-insumos",
    label: "DMG — insumos de automonitorização",
    categoria: "Diabetes",
    gestante: "Gestante",
    items: [
      {
        principioAtivo: "Fitas reagentes para glicemia capilar",
        formaFarmaceutica: "Unidade",
        unidadeDose: "unidade",
        registroManual: true,
        posologiaManual: "Para automonitorização da glicemia capilar.",
        quantidadeReceitada: "90 unidades",
      },
      {
        principioAtivo: "Lancetas",
        formaFarmaceutica: "Unidade",
        unidadeDose: "unidade",
        registroManual: true,
        posologiaManual: "Para punção capilar.",
        quantidadeReceitada: "90 unidades",
      },
      {
        principioAtivo: "Glicosímetro",
        formaFarmaceutica: "Unidade",
        unidadeDose: "unidade",
        registroManual: true,
        posologiaManual: "Aparelho para medida da glicemia capilar.",
        quantidadeReceitada: "1 unidade",
      },
    ],
    documentos: ["carta-insumos-dmg", "relatorio-dmg", "curva-glicemica"],
  },
];
