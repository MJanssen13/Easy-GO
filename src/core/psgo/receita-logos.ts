/**
 * Logos do cabeçalho da receita (SUS, UFTM, HU-Brasil/EBSERH).
 *
 * `src` deve ser um **data-URI** (base64) para o HTML ficar autocontido na
 * impressão. Enquanto os arquivos oficiais não são fornecidos, `src` fica vazio
 * e o layout mostra um selo com a sigla no lugar. Basta preencher `src` com o
 * data-URI de cada logo (PNG/SVG) para que apareçam impressos.
 */
export interface ReceitaLogo {
  sigla: string;
  nome: string;
  /** data-URI, ex.: "data:image/png;base64,AAAA…". Vazio → mostra a sigla. */
  src: string;
}

export const RECEITA_LOGOS: ReceitaLogo[] = [
  { sigla: "SUS", nome: "SUS", src: "" },
  { sigla: "UFTM", nome: "UFTM", src: "" },
  { sigla: "HU-Brasil", nome: "HU-Brasil / EBSERH", src: "" },
];
