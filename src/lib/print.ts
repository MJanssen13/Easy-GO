/**
 * Imprime um documento HTML autocontido sem afetar a página atual.
 *
 * Usa um `<iframe>` oculto (mesma origem): evita bloqueadores de pop-up e
 * isola o CSS do app. A impressão só dispara após o `load` do iframe, que
 * aguarda o carregamento das imagens (papel timbrado) — garantindo que os
 * logotipos apareçam no impresso.
 */
export function printHtml(html: string): void {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    iframe.remove();
  };

  const doPrint = () => {
    const win = iframe.contentWindow;
    if (!win) {
      remove();
      return;
    }
    // Remove o iframe após o diálogo fechar (imprimir ou cancelar).
    win.addEventListener("afterprint", () => window.setTimeout(remove, 500), { once: true });
    // Rede de segurança caso 'afterprint' não dispare no navegador.
    window.setTimeout(remove, 60000);
    try {
      win.focus();
      win.print();
    } catch {
      remove();
    }
  };

  iframe.addEventListener("load", doPrint, { once: true });

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
}
