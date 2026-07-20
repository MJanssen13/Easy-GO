/**
 * Imprime um documento HTML autocontido sem afetar a página atual.
 *
 * - **Desktop**: usa um `<iframe>` oculto (mesma origem) — evita bloqueadores de
 *   pop-up e isola o CSS do app. A impressão dispara após o `load` do iframe.
 * - **Mobile** (iOS Safari, Android Chrome): o `iframe.contentWindow.print()`
 *   imprime a **página do app**, não o iframe. Nesses navegadores abrimos o
 *   documento em uma **nova janela/aba** que se imprime sozinha (script embutido),
 *   garantindo que saia a **receita** e não a tela.
 */
export function printHtml(html: string): void {
  if (typeof window === "undefined") return;
  if (isMobile()) {
    if (printViaWindow(html)) return;
    // Pop-up bloqueado → tenta o iframe como último recurso.
  }
  printViaIframe(html);
}

/** Detecta navegadores móveis (inclui iPadOS, que se anuncia como desktop). */
function isMobile(): boolean {
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua))
    return true;
  // iPadOS moderno: platform "MacIntel" mas com toque.
  return navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;
}

/**
 * Injeta um script que aguarda o carregamento das imagens (papel timbrado),
 * dispara a impressão e fecha a janela ao terminar (imprimir ou cancelar).
 */
function injectAutoPrint(html: string): string {
  const script =
    "<script>window.addEventListener('load',function(){" +
    "var imgs=Array.prototype.slice.call(document.images);" +
    "Promise.all(imgs.map(function(i){return i.complete?1:new Promise(function(r){i.onload=i.onerror=r;});}))" +
    ".then(function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},250);});" +
    "});" +
    "window.addEventListener('afterprint',function(){setTimeout(function(){window.close();},100);});" +
    "<\/script>";
  if (html.includes("</body>")) return html.replace("</body>", script + "</body>");
  if (html.includes("</html>")) return html.replace("</html>", script + "</html>");
  return html + script;
}

/**
 * Abre a receita em nova aba que se imprime sozinha. Usa uma **URL `blob:`**
 * (documento com URL real) em vez de `document.write` em `about:blank`: o
 * serviço de impressão do Android falha ao rasterizar `about:blank` ("Ocorreu
 * um problema ao imprimir a página"). Retorna false se o pop-up for bloqueado.
 */
function printViaWindow(html: string): boolean {
  try {
    const blob = new Blob([injectAutoPrint(html)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      URL.revokeObjectURL(url);
      return false;
    }
    // Revoga depois que a aba já carregou/imprimiu (o script embutido fecha a aba).
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  } catch {
    return false;
  }
}

/** Imprime via iframe oculto (desktop). */
function printViaIframe(html: string): void {
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
