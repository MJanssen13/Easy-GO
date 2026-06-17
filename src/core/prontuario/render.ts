/**
 * Minimal, dependency-free engine that turns structured clinical sections into
 * plain text ready to paste into a medical record (prontuário). Used by the
 * stateless generators (Pré-Natal, PSGO) and the ward-evolution modules.
 */

export interface ProntuarioField {
  label: string;
  value?: string | number | null;
  /** Shown when value is empty (e.g. keep "TIPO SANGUÍNEO:" blank in the form). */
  fallback?: string;
}

export type ProntuarioLine = string | ProntuarioField;

export interface ProntuarioSection {
  title?: string;
  lines: ProntuarioLine[];
}

export interface RenderOptions {
  /** Keep fields whose value is empty (default true — clinical templates keep blanks). */
  keepEmpty?: boolean;
  /** Uppercase the whole output, matching the existing hospital templates. */
  uppercase?: boolean;
}

function isField(line: ProntuarioLine): line is ProntuarioField {
  return typeof line === "object" && line !== null && "label" in line;
}

function renderLine(line: ProntuarioLine, keepEmpty: boolean): string | null {
  if (!isField(line)) return line;
  const hasValue = line.value !== undefined && line.value !== null && `${line.value}`.trim() !== "";
  if (!hasValue && !line.fallback && !keepEmpty) return null;
  const value = hasValue ? `${line.value}` : (line.fallback ?? "");
  return `${line.label}: ${value}`.trimEnd();
}

export function renderProntuario(
  sections: ProntuarioSection[],
  options: RenderOptions = {},
): string {
  const keepEmpty = options.keepEmpty ?? true;
  const blocks: string[] = [];

  for (const section of sections) {
    const rendered = section.lines
      .map((l) => renderLine(l, keepEmpty))
      .filter((l): l is string => l !== null);

    if (rendered.length === 0 && !section.title) continue;

    const body = section.title ? [section.title, ...rendered] : rendered;
    blocks.push(body.join("\n"));
  }

  const text = blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  return options.uppercase ? text.toUpperCase() : text;
}
