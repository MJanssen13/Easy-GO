"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const CONTROL = "input:not([type=hidden]),select,textarea";

/** 1º campo após o rótulo, no mesmo contêiner (sobe até 2 níveis). */
function nextControl(label: HTMLElement): HTMLElement | null {
  let box = label.parentElement;
  for (let depth = 0; box && depth < 3; depth++, box = box.parentElement) {
    for (const el of box.querySelectorAll<HTMLElement>(CONTROL)) {
      if (label.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) return el;
    }
  }
  return null;
}

/**
 * Rótulo. Com `htmlFor`, é um `<label>` comum. Sem ele, associa-se ao campo
 * seguinte no mesmo contêiner (`aria-labelledby`) e clicar foca esse campo —
 * leitores de tela passam a anunciar o nome do campo.
 */
const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, htmlFor, onClick, id: idProp, ...props }, ref) => {
    const autoId = React.useId();
    const id = idProp ?? autoId;
    const inner = React.useRef<HTMLLabelElement | null>(null);
    React.useImperativeHandle(ref, () => inner.current as HTMLLabelElement);

    React.useEffect(() => {
      if (htmlFor || !inner.current) return;
      const el = nextControl(inner.current);
      // Campo que já tem rótulo próprio (label[for], envolvente ou aria) não é deste.
      const own = el && "labels" in el ? ((el as HTMLInputElement).labels?.length ?? 0) > 0 : false;
      if (el && !own && !el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby"))
        el.setAttribute("aria-labelledby", id);
    });

    return (
      <label
        ref={inner}
        id={id}
        htmlFor={htmlFor}
        onClick={(e) => {
          onClick?.(e);
          if (!htmlFor && inner.current) {
            const el = nextControl(inner.current);
            if (el?.getAttribute("aria-labelledby") === id) el.focus();
          }
        }}
        className={cn("text-sm font-medium leading-none text-foreground", className)}
        {...props}
      />
    );
  },
);
Label.displayName = "Label";

export { Label };
