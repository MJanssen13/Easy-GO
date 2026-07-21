/**
 * Bloco CONTEXTO da consulta de pré-natal — a anamnese dirigida do modelo:
 * comparecimento, movimentação fetal e as queixas mais frequentes (mamárias,
 * leucorreia, TGI/TGU), cada uma com o padrão "NEGA" e detalhamento livre.
 */

export type FetalMovement = "boa" | "diminuida" | "ausente" | "naorefere" | "";

export interface ComplaintState {
  /** true = nega (padrão); false = refere (usa `text`). */
  deny: boolean;
  text: string;
}

export interface ContextState {
  fetalMovement: FetalMovement;
  breast: ComplaintState;
  leucorrhea: ComplaintState;
  giGu: ComplaintState;
  other: ComplaintState;
  /** Observações livres adicionais anexadas ao fim do contexto. */
  extra: string;
}

export function emptyContext(): ContextState {
  const denied = (): ComplaintState => ({ deny: true, text: "" });
  return {
    fetalMovement: "boa",
    breast: denied(),
    leucorrhea: denied(),
    giGu: denied(),
    other: denied(),
    extra: "",
  };
}

const FETAL_MOVEMENT_PHRASES: Record<Exclude<FetalMovement, "">, string> = {
  boa: "REFERE BOA MOVIMENTAÇÃO FETAL",
  diminuida: "REFERE MOVIMENTAÇÃO FETAL DIMINUÍDA",
  ausente: "REFERE AUSÊNCIA DE MOVIMENTAÇÃO FETAL",
  naorefere: "NÃO REFERE MOVIMENTAÇÃO FETAL",
};

/** Frase de uma queixa: "NEGA {rótulo}" ou "REFERE {texto}". */
function complaintPhrase(c: ComplaintState, negLabel: string): string {
  if (c.deny) return `NEGA ${negLabel}`;
  const t = c.text.trim();
  return t ? `REFERE ${t}` : `REFERE ${negLabel}`;
}

/** Texto do bloco CONTEXTO (uma frase, terminando em ponto). */
export function renderContext(ctx: ContextState): string {
  const parts: string[] = ["COMPARECE PARA CONSULTA"];
  if (ctx.fetalMovement) parts.push(FETAL_MOVEMENT_PHRASES[ctx.fetalMovement]);
  parts.push(complaintPhrase(ctx.breast, "QUEIXAS MAMÁRIAS"));
  parts.push(complaintPhrase(ctx.leucorrhea, "LEUCORREIA PATOLÓGICA"));
  parts.push(complaintPhrase(ctx.giGu, "QUEIXAS DE TGI E TGU"));
  parts.push(complaintPhrase(ctx.other, "OUTRAS QUEIXAS"));
  const extra = ctx.extra.trim();
  if (extra) parts.push(extra);
  return `${parts.join(". ")}.`;
}
