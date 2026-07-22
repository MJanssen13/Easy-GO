/**
 * Lista de apoio de **CID-10** para busca/seleção no atestado. Lista **curada**
 * (principais códigos de obstetrícia/ginecologia e afecções comuns) — **não é a
 * CID-10 completa**; o campo continua aceitando qualquer código digitado.
 * Fonte: classificação oficial CID-10 (OMS/DATASUS). Apoio à documentação.
 */

export interface Cid {
  code: string;
  desc: string;
}

export const CID_LIST: Cid[] = [
  // --- Gravidez, parto e puerpério (O) ---
  { code: "O00.9", desc: "Gravidez ectópica não especificada" },
  { code: "O03.9", desc: "Aborto espontâneo, completo ou não especificado, sem complicação" },
  { code: "O06.9", desc: "Aborto não especificado" },
  { code: "O10.9", desc: "Hipertensão pré-existente não especificada, complicando a gravidez" },
  { code: "O13", desc: "Hipertensão gestacional sem proteinúria significativa" },
  { code: "O14.0", desc: "Pré-eclâmpsia leve a moderada" },
  { code: "O14.1", desc: "Pré-eclâmpsia grave" },
  { code: "O14.9", desc: "Pré-eclâmpsia não especificada" },
  { code: "O15.0", desc: "Eclâmpsia na gravidez" },
  { code: "O15.9", desc: "Eclâmpsia não especificada quanto ao período" },
  { code: "O20.0", desc: "Ameaça de aborto" },
  { code: "O21.0", desc: "Hiperêmese gravídica leve" },
  { code: "O21.1", desc: "Hiperêmese gravídica com distúrbio metabólico" },
  { code: "O23.4", desc: "Infecção não especificada do trato urinário na gravidez" },
  { code: "O24.4", desc: "Diabetes mellitus que surge durante a gravidez (gestacional)" },
  { code: "O24.9", desc: "Diabetes mellitus não especificado na gravidez" },
  { code: "O26.8", desc: "Outras afecções especificadas ligadas à gravidez" },
  { code: "O26.9", desc: "Afecção ligada à gravidez, não especificada" },
  { code: "O34.2", desc: "Assistência à mãe por cicatriz uterina de cirurgia prévia (cesárea prévia)" },
  { code: "O36.0", desc: "Assistência à mãe por isoimunização Rhesus" },
  { code: "O36.4", desc: "Assistência à mãe por morte intra-uterina" },
  { code: "O36.5", desc: "Assistência à mãe por crescimento fetal insuficiente (CIUR)" },
  { code: "O40", desc: "Poli-hidrâmnio" },
  { code: "O41.0", desc: "Oligo-hidrâmnio" },
  { code: "O42.0", desc: "Rotura prematura de membranas, início do trabalho de parto em 24h" },
  { code: "O42.9", desc: "Rotura prematura das membranas, não especificada" },
  { code: "O44.1", desc: "Placenta prévia com hemorragia" },
  { code: "O45.9", desc: "Descolamento prematuro da placenta, não especificado" },
  { code: "O47.0", desc: "Falso trabalho de parto antes de 37 semanas" },
  { code: "O47.9", desc: "Falso trabalho de parto, não especificado" },
  { code: "O48", desc: "Gravidez prolongada" },
  { code: "O60", desc: "Trabalho de parto pré-termo" },
  { code: "O63.9", desc: "Trabalho de parto prolongado, não especificado" },
  { code: "O70.9", desc: "Laceração perineal durante o parto, não especificada" },
  { code: "O72.1", desc: "Outras hemorragias pós-parto imediatas" },
  { code: "O80", desc: "Parto único espontâneo" },
  { code: "O82", desc: "Parto único por cesariana" },
  { code: "O85", desc: "Infecção puerperal" },
  { code: "O86.9", desc: "Infecção puerperal não especificada" },
  { code: "O90.9", desc: "Complicação do puerpério, não especificada" },
  { code: "O91.2", desc: "Mastite não-purulenta associada ao parto (puerperal)" },
  { code: "O99.0", desc: "Anemia complicando a gravidez, o parto e o puerpério" },
  // --- Ginecologia (N) ---
  { code: "N70.9", desc: "Salpingite e ooforite não especificadas" },
  { code: "N71.9", desc: "Doença inflamatória do útero, não especificada" },
  { code: "N72", desc: "Doença inflamatória do colo do útero (cervicite)" },
  { code: "N73.9", desc: "Doença inflamatória pélvica feminina, não especificada (DIP)" },
  { code: "N76.0", desc: "Vaginite aguda" },
  { code: "N76.1", desc: "Vaginite subaguda e crônica" },
  { code: "N80.9", desc: "Endometriose não especificada" },
  { code: "N83.0", desc: "Cisto folicular do ovário" },
  { code: "N83.2", desc: "Outros cistos ovarianos e os não especificados" },
  { code: "N84.0", desc: "Pólipo do corpo do útero" },
  { code: "N85.0", desc: "Hiperplasia glandular do endométrio" },
  { code: "N87.9", desc: "Displasia do colo do útero, não especificada" },
  { code: "N91.2", desc: "Amenorréia não especificada" },
  { code: "N92.0", desc: "Menstruação excessiva e frequente com ciclo regular" },
  { code: "N92.1", desc: "Menstruação excessiva e frequente com ciclo irregular" },
  { code: "N93.9", desc: "Sangramento anormal do útero e da vagina, não especificado" },
  { code: "N94.6", desc: "Dismenorréia não especificada" },
  { code: "N95.1", desc: "Estados da menopausa e do climatério feminino" },
  { code: "N97.9", desc: "Infertilidade feminina, não especificada" },
  // --- Fatores/supervisão (Z) ---
  { code: "Z30.0", desc: "Aconselhamento geral sobre contracepção" },
  { code: "Z32.1", desc: "Gravidez confirmada" },
  { code: "Z34.9", desc: "Supervisão de gravidez normal, não especificada" },
  { code: "Z35.9", desc: "Supervisão de gravidez de alto risco, não especificada" },
  { code: "Z39.0", desc: "Assistência e exame imediatamente após o parto" },
  { code: "Z39.1", desc: "Assistência e exame à nutriz (amamentação)" },
  // --- Afecções comuns ---
  { code: "N39.0", desc: "Infecção do trato urinário de localização não especificada" },
  { code: "R10.2", desc: "Dor pélvica e perineal" },
  { code: "R10.4", desc: "Outras dores abdominais e as não especificadas" },
  { code: "R11", desc: "Náusea e vômitos" },
  { code: "R50.9", desc: "Febre não especificada" },
  { code: "R51", desc: "Cefaléia" },
  { code: "J00", desc: "Nasofaringite aguda (resfriado comum)" },
  { code: "J06.9", desc: "Infecção aguda das vias aéreas superiores, não especificada" },
  { code: "A09", desc: "Diarréia e gastroenterite de origem infecciosa presumível" },
  { code: "B34.9", desc: "Infecção viral não especificada" },
  { code: "U07.1", desc: "COVID-19" },
];

export function cidLabel(c: Cid): string {
  return `${c.code} — ${c.desc}`;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Busca por código ou descrição, priorizando o código mais próximo. */
export function searchCids(query: string, limit = 30): Cid[] {
  const q = norm(query.trim());
  if (!q) return CID_LIST.slice(0, limit);
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { c: Cid; score: number }[] = [];
  for (const c of CID_LIST) {
    const code = norm(c.code);
    const label = norm(cidLabel(c));
    if (!tokens.every((t) => label.includes(t))) continue;
    let score = 0;
    if (code === q) score += 1000;
    else if (code.startsWith(q)) score += 600;
    else if (code.includes(q)) score += 200;
    if (norm(c.desc).startsWith(q)) score += 120;
    score -= label.length * 0.1;
    scored.push({ c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.c);
}
