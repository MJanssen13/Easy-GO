/**
 * Impressão sem as notas de rodapé/cabeçalho que o navegador adiciona (URL,
 * data, título, nº da página). Declarar as caixas de margem da página, mesmo
 * vazias, faz o Chrome/Edge (131+) omitir os cabeçalhos e rodapés próprios.
 * Em navegadores sem suporte, desmarque "Cabeçalhos e rodapés" na impressão.
 */
export const NO_BROWSER_HEADERS_CSS = `
  @page {
    @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; }
    @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; }
  }`;
