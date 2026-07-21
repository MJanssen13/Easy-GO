/**
 * Revisão dirigida do pré-natal = a do PSGO (`REVISION_QUESTIONS`) + a pergunta
 * de QUEIXAS MAMÁRIAS, específica do pré-natal (sempre perguntada na consulta,
 * conforme o modelo). Mesma estrutura/chaves (`rev.<id>`), montada em conjunto.
 */
import { REVISION_QUESTIONS, assembleRevision, type RevisionQuestion } from "@/core/psgo/hpma";

const MAMAS_SINT = ["mastalgia", "nódulo", "descarga papilar", "sinais flogísticos"];

export const MAMAS_QUESTION: RevisionQuestion = {
  id: "mamas",
  label: "Queixas mamárias",
  options: [
    { value: "nega", label: "Nega", normal: true },
    {
      value: "relata",
      label: "Relata",
      subs: [{ id: "sint", kind: "multi", label: "Sintomas", opts: MAMAS_SINT }],
    },
  ],
};

/** Perguntas da revisão dirigida do pré-natal (mamas primeiro, depois as do PSGO). */
export const PRENATAL_REVISION_QUESTIONS: RevisionQuestion[] = [MAMAS_QUESTION, ...REVISION_QUESTIONS];

/** Frase da pergunta de mamas, no mesmo estilo das demais. */
function mamasText(vals: Record<string, string>): string {
  const v = vals["rev.mamas"] ?? "nega";
  if (v === "nega") return "Nega queixas mamárias";
  const sint = MAMAS_SINT.filter((op) => vals[`rev.mamas.sint#${op}`] === "1");
  return sint.length ? `Relata ${sint.join(", ")}` : "Relata queixas mamárias";
}

/** Revisão dirigida completa do pré-natal: mamas + revisão do PSGO. */
export function assemblePrenatalRevision(vals: Record<string, string>): string {
  const rest = assembleRevision(vals, true, new Set());
  return [mamasText(vals), rest].filter((s) => s.trim()).join(". ");
}
