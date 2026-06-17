import { Activity, Stethoscope, Siren, Baby, Microscope, type LucideIcon } from "lucide-react";

export interface ModuleDef {
  slug: string;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  /** Whether the module persists patient data (vs. a stateless generator). */
  stateful: boolean;
  accent: string;
}

export const MODULES: ModuleDef[] = [
  {
    slug: "pre-parto",
    label: "Pré-Parto",
    short: "Trabalho de parto",
    description:
      "Acompanhamento do trabalho de parto: partograma, cardiotocografia, dinâmica, toque e protocolos (metildopa, sulfato de magnésio).",
    icon: Activity,
    stateful: true,
    accent: "text-sky-600",
  },
  {
    slug: "pre-natal",
    label: "Pré-Natal",
    short: "Consulta por trimestre",
    description:
      "Assistente de consulta baseado em MS/Febrasgo/ACOG. Indica exames, exame físico, vacinas e condutas por trimestre e gera texto pronto para o prontuário. Não armazena dados.",
    icon: Stethoscope,
    stateful: false,
    accent: "text-emerald-600",
  },
  {
    slug: "psgo",
    label: "PSGO",
    short: "Pronto-socorro obstétrico",
    description:
      "Rotinas do PS de maternidade: condutas, cálculo de idade gestacional, tocólise, avaliação de sorologias, USG e vacinas. Gera o prontuário e permite transferir a paciente para o Pré-Parto.",
    icon: Siren,
    stateful: false,
    accent: "text-rose-600",
  },
  {
    slug: "puerperio",
    label: "Puerpério",
    short: "Evolução de enfermaria",
    description:
      "Evolução de mulheres no puerpério e manejo das intercorrências, gerando a evolução pronta para o prontuário.",
    icon: Baby,
    stateful: true,
    accent: "text-violet-600",
  },
  {
    slug: "oncogineco",
    label: "Onco-Ginecologia",
    short: "Enfermaria oncológica",
    description:
      "Evolução em enfermaria de pacientes internadas por motivos oncológicos. Permite transferência de/para o PSGO.",
    icon: Microscope,
    stateful: true,
    accent: "text-amber-600",
  },
];

export function getModule(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}
