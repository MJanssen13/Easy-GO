/**
 * Lista rápida de medicamentos comuns no PSGO/obstetrícia, para pré-preencher a
 * receita (princípio ativo, concentração, forma, via e unidade de dose). Base:
 * denominações da RENAME/CATMAT (identidade do produto — NÃO é recomendação de
 * dose; a posologia é definida pela equipe). Lista curável — amplie conforme o
 * serviço.
 */
export interface MedCatmat {
  pa: string; // princípio ativo (DCB)
  conc: string; // concentração
  forma: string; // forma farmacêutica
  via: string; // via usual
  unidade: string; // unidade de dose usual (para o campo estruturado)
}

export const CATMAT_MEDS: MedCatmat[] = [
  // Analgésicos / antitérmicos / antiespasmódicos
  { pa: "Dipirona sódica", conc: "500 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Dipirona sódica", conc: "500 mg/mL", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },
  { pa: "Paracetamol", conc: "500 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Paracetamol", conc: "750 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Paracetamol", conc: "200 mg/mL", forma: "solução oral", via: "Oral", unidade: "gota" },
  { pa: "Butilbrometo de escopolamina", conc: "10 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Butilbrometo de escopolamina", conc: "20 mg/mL", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },
  { pa: "Tramadol", conc: "50 mg/mL", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },
  { pa: "Morfina", conc: "10 mg/mL", forma: "solução injetável", via: "Subcutânea", unidade: "ampola" },

  // Antieméticos
  { pa: "Metoclopramida", conc: "10 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Metoclopramida", conc: "5 mg/mL", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },
  { pa: "Ondansetrona", conc: "4 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Ondansetrona", conc: "8 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Ondansetrona", conc: "2 mg/mL", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },
  { pa: "Dimenidrinato + piridoxina", conc: "50 mg + 10 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },

  // Gastroprotetores
  { pa: "Omeprazol", conc: "20 mg", forma: "cápsula", via: "Oral", unidade: "cápsula" },
  { pa: "Ranitidina", conc: "150 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Simeticona", conc: "75 mg/mL", forma: "solução oral", via: "Oral", unidade: "gota" },

  // Antibióticos / antimicrobianos
  { pa: "Amoxicilina", conc: "500 mg", forma: "cápsula", via: "Oral", unidade: "cápsula" },
  { pa: "Amoxicilina + clavulanato", conc: "500 mg + 125 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Cefalexina", conc: "500 mg", forma: "cápsula", via: "Oral", unidade: "cápsula" },
  { pa: "Azitromicina", conc: "500 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Nitrofurantoína", conc: "100 mg", forma: "cápsula", via: "Oral", unidade: "cápsula" },
  { pa: "Metronidazol", conc: "250 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Metronidazol", conc: "400 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Clindamicina", conc: "300 mg", forma: "cápsula", via: "Oral", unidade: "cápsula" },
  { pa: "Ampicilina", conc: "1 g", forma: "pó para solução injetável", via: "Intravenosa", unidade: "frasco" },
  { pa: "Ceftriaxona", conc: "1 g", forma: "pó para solução injetável", via: "Intravenosa", unidade: "frasco" },
  { pa: "Penicilina G benzatina", conc: "1.200.000 UI", forma: "pó para suspensão injetável", via: "Intramuscular", unidade: "frasco" },
  { pa: "Gentamicina", conc: "40 mg/mL", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },

  // Anti-hipertensivos (obstetrícia)
  { pa: "Metildopa", conc: "250 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Metildopa", conc: "500 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Nifedipino", conc: "20 mg", forma: "comprimido de liberação prolongada", via: "Oral", unidade: "comprimido" },
  { pa: "Nifedipino", conc: "10 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Hidralazina", conc: "20 mg/mL", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },
  { pa: "Anlodipino", conc: "5 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },

  // Eclâmpsia / neuroproteção
  { pa: "Sulfato de magnésio", conc: "500 mg/mL (50%)", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },
  { pa: "Gluconato de cálcio", conc: "100 mg/mL (10%)", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },

  // Corticoide (maturação pulmonar)
  { pa: "Betametasona", conc: "6 mg/mL (fosfato + acetato)", forma: "suspensão injetável", via: "Intramuscular", unidade: "ampola" },
  { pa: "Dexametasona", conc: "4 mg/mL", forma: "solução injetável", via: "Intramuscular", unidade: "ampola" },

  // Tocolítico
  { pa: "Terbutalina", conc: "0,5 mg/mL", forma: "solução injetável", via: "Subcutânea", unidade: "ampola" },

  // Uterotônicos / obstétricos
  { pa: "Ocitocina", conc: "5 UI/mL", forma: "solução injetável", via: "Intravenosa", unidade: "ampola" },
  { pa: "Metilergometrina", conc: "0,2 mg/mL", forma: "solução injetável", via: "Intramuscular", unidade: "ampola" },
  { pa: "Misoprostol", conc: "200 mcg", forma: "comprimido vaginal", via: "Vaginal", unidade: "comprimido" },
  { pa: "Progesterona", conc: "200 mg", forma: "cápsula", via: "Vaginal", unidade: "cápsula" },

  // Anticoagulantes
  { pa: "Enoxaparina", conc: "40 mg/0,4 mL", forma: "solução injetável", via: "Subcutânea", unidade: "ampola" },
  { pa: "Heparina sódica", conc: "5.000 UI/mL", forma: "solução injetável", via: "Subcutânea", unidade: "ampola" },

  // Suplementos / diversos
  { pa: "Ácido fólico", conc: "5 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Sulfato ferroso", conc: "40 mg Fe²⁺", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Carbonato de cálcio", conc: "500 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Loratadina", conc: "10 mg", forma: "comprimido", via: "Oral", unidade: "comprimido" },
  { pa: "Nistatina", conc: "25.000 UI/g", forma: "creme vaginal", via: "Vaginal", unidade: "aplicação" },
  { pa: "Miconazol", conc: "20 mg/g (2%)", forma: "creme vaginal", via: "Vaginal", unidade: "aplicação" },
  { pa: "Insulina NPH", conc: "100 UI/mL", forma: "suspensão injetável", via: "Subcutânea", unidade: "UI" },
  { pa: "Insulina regular", conc: "100 UI/mL", forma: "solução injetável", via: "Subcutânea", unidade: "UI" },
];

/** Rótulo de exibição/busca: "Dipirona sódica 500 mg — comprimido". */
export function medCatmatLabel(m: MedCatmat): string {
  return `${m.pa} ${m.conc} — ${m.forma}`;
}
