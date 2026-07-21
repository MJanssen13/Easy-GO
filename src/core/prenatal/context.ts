/**
 * Bloco CONTEXTO da consulta de pré-natal — montado a partir da HPMA adaptada do
 * PSGO: a revisão dirigida (perguntas sempre feitas) + as queixas atuais (texto
 * livre). Reaproveita `REVISION_QUESTIONS` / `assembleRevision` do PSGO.
 *
 * Sem gerador de HPMA por QP (a pedido): apenas as perguntas obrigatórias e um
 * espaço para as queixas atuais.
 */
import { assemblePrenatalRevision } from "./revision";

/**
 * Texto da HPMA (sem o prefixo "HPMA:"):
 *   "COMPARECE PARA CONSULTA {acompanhante}[. {queixas atuais}]. {revisão dirigida}"
 * A revisão dirigida inclui queixas mamárias (pré-natal) + a revisão do PSGO.
 * `companionPhrase` (ex.: "ACOMPANHADA DE … (ESPOSO)" ou "DESACOMPANHADA") entra
 * no comparecimento, como no PSGO.
 */
export function renderPrenatalContext(
  revision: Record<string, string>,
  currentComplaints: string,
  companionPhrase = "",
): string {
  const rev = assemblePrenatalRevision(revision);
  const comparece = `COMPARECE PARA CONSULTA${companionPhrase ? ` ${companionPhrase}` : ""}`;
  const lead = [comparece, currentComplaints.trim()].filter(Boolean).join(". ");
  return [lead, rev].filter((s) => s.trim()).join(". ");
}
