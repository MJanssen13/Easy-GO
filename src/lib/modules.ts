import type { ComponentType } from "react";
import { Ambulance, BriefcaseMedical, Ribbon } from "lucide-react";
import { MotherBabyIcon, PregnantHeartIcon, PregnantMonitorIcon } from "@/components/icons/clinical";

export interface ModuleDef {
  slug: string;
  label: string;
  short: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  /** Whether the module persists patient data (vs. a stateless generator). */
  stateful: boolean;
  accent: string;
  /** Rótulo do selo no hub (sobrepõe o padrão "Armazena dados"/"Gera prontuário"). */
  badge?: string;
  /** Gradiente do ícone do módulo (navegação, cabeçalhos). */
  tile: string;
  /** Agrupamento na navegação. */
  group: "Internação" | "Atendimento" | "Utilitários";
}

export const MODULES: ModuleDef[] = [
  {
    slug: "pre-parto",
    tile: "from-pink-500 to-rose-500",
    group: "Internação",
    label: "Pré-Parto",
    short: "Trabalho de parto",
    description:
      "Acompanhamento do trabalho de parto: partograma, cardiotocografia, dinâmica, toque e protocolos (metildopa, sulfato de magnésio).",
    icon: PregnantMonitorIcon,
    stateful: true,
    accent: "text-pink-600",
  },
  {
    slug: "pre-natal",
    tile: "from-teal-500 to-emerald-500",
    group: "Atendimento",
    label: "Pré-Natal",
    short: "Consulta por trimestre",
    description:
      "Assistente de consulta baseado em MS/Febrasgo/ACOG. Indica exames, exame físico, vacinas e condutas por trimestre e gera texto pronto para o prontuário. Não armazena dados.",
    icon: PregnantHeartIcon,
    stateful: false,
    accent: "text-teal-600",
  },
  {
    slug: "psgo",
    tile: "from-red-500 to-orange-500",
    group: "Atendimento",
    label: "PSGO",
    short: "Pronto-socorro obstétrico",
    description:
      "Rotinas do PS de maternidade: condutas, cálculo de idade gestacional, tocólise, avaliação de sorologias, USG e vacinas. Gera o prontuário e permite transferir a paciente para o Pré-Parto.",
    icon: Ambulance,
    stateful: false,
    accent: "text-red-600",
  },
  {
    slug: "puerperio",
    tile: "from-fuchsia-500 to-pink-500",
    group: "Internação",
    label: "Puerpério",
    short: "Evolução de enfermaria",
    description:
      "Evolução de mulheres no puerpério e manejo das intercorrências, gerando a evolução pronta para o prontuário.",
    icon: MotherBabyIcon,
    stateful: true,
    accent: "text-pink-600",
  },
  {
    slug: "oncogineco",
    tile: "from-violet-500 to-purple-600",
    group: "Internação",
    label: "Onco-Ginecologia",
    short: "Enfermaria oncológica",
    description:
      "Evolução em enfermaria de pacientes internadas por motivos oncológicos. Permite transferência de/para o PSGO.",
    icon: Ribbon,
    stateful: true,
    accent: "text-purple-600",
  },
  {
    slug: "ferramentas",
    tile: "from-slate-500 to-slate-700",
    group: "Utilitários",
    label: "Ferramentas",
    short: "Utilitários clínicos",
    description:
      "Utilitários que não armazenam dados. Inclui a leitura dos arquivos .trc do monitor fetal Edan (F2/F3) para gerar a cardiotocografia (FHR + TOCO) em PDF.",
    icon: BriefcaseMedical,
    stateful: false,
    accent: "text-slate-600",
    badge: "Utilitário",
  },
];

export function getModule(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}
