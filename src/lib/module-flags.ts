/** Todos os módulos (slugs), sem dependências de UI — usado também no middleware. */
export const MODULE_SLUGS = ["pre-parto", "pre-natal", "psgo", "puerperio", "oncogineco", "ferramentas"];

/**
 * Módulos liberados para uso. Os demais seguem no código, mas ficam fora do
 * menu e das rotas até estarem prontos. Para liberar outros sem mudar o
 * código: NEXT_PUBLIC_ENABLED_MODULES=pre-parto,psgo,puerperio (vírgulas).
 */
const DEFAULT_ENABLED = ["pre-parto", "psgo"];
export const ENABLED_MODULE_SLUGS: string[] =
  process.env.NEXT_PUBLIC_ENABLED_MODULES?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? DEFAULT_ENABLED;

export function isModuleEnabled(slug: string): boolean {
  return ENABLED_MODULE_SLUGS.includes(slug);
}

/**
 * Rotas de módulos ainda não liberados que outro módulo liberado usa
 * (a receita é aberta pelo PSGO).
 */
export const ALWAYS_ALLOWED_PATHS = ["/ferramentas/receita"];
