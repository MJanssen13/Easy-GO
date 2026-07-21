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
 * Texto do CONTEXTO (sem o prefixo "CONTEXTO:"):
 *   "COMPARECE PARA CONSULTA[. {queixas atuais}]. {revisão dirigida}"
 * A revisão dirigida inclui queixas mamárias (pré-natal) + a revisão do PSGO.
 */
export function renderPrenatalContext(revision: Record<string, string>, currentComplaints: string): string {
  const rev = assemblePrenatalRevision(revision);
  const lead = ["COMPARECE PARA CONSULTA", currentComplaints.trim()].filter(Boolean).join(". ");
  return [lead, rev].filter((s) => s.trim()).join(". ");
}
