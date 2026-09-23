import { forwardRef, type SVGProps } from "react";

/**
 * Ícones clínicos próprios (mesmo estilo do lucide: 24×24, traço 2, pontas
 * arredondadas) para as seções que não têm um equivalente adequado.
 */
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

const HEAD = <circle cx="10" cy="4" r="2" />;
const BACK = <path d="M9 7.5c-1.6.8-2.3 2.4-2 4.3L8 22" />;
const BELLY = <path d="M11 7.5c.8.6 1.2 1.6 1.4 2.7 2.8.5 4.6 2.6 4.4 5.2-.2 2.2-2 3.8-4.3 3.9L12.6 22" />;

/** Gestante com coração no ventre — Pré-Natal (consulta). */
export const PregnantHeartIcon = forwardRef<SVGSVGElement, IconProps>(function PregnantHeartIcon(props, ref) {
  return (
    <svg ref={ref} {...base(props)}>
      {HEAD}
      {BACK}
      {BELLY}
      <path
        d="M13.2 14.2c.35-.5 1.3-.6 1.5.2.2.8-1 1.6-1.5 2-.5-.4-1.7-1.2-1.5-2 .2-.8 1.15-.7 1.5-.2z"
        fill="currentColor"
        strokeWidth={1}
      />
    </svg>
  );
});

/** Gestante com traçado de monitorização — Pré-Parto (trabalho de parto). */
export const PregnantMonitorIcon = forwardRef<SVGSVGElement, IconProps>(function PregnantMonitorIcon(props, ref) {
  return (
    <svg ref={ref} {...base(props)}>
      {HEAD}
      {BACK}
      {BELLY}
      <path d="M14.5 5h1.8l1-2.2 1.6 4.4 1-2.2H22" strokeWidth={1.6} />
    </svg>
  );
});

/** Mãe com o bebê no colo — Puerpério. */
export const MotherBabyIcon = forwardRef<SVGSVGElement, IconProps>(function MotherBabyIcon(props, ref) {
  return (
    <svg ref={ref} {...base(props)}>
      <circle cx="9" cy="4" r="2" />
      <path d="M7 22v-6.5L5.5 11c-.4-1.8.6-3.5 2.5-3.5h2c1 0 1.8.5 2.3 1.3L14 12" />
      <circle cx="16.5" cy="11" r="2" />
      <path d="M7.5 14c2.5 2.2 6.3 2.7 9.5 1.5 1.8-.7 2.8-2 3-3.5" />
      <path d="M11 22v-5" />
    </svg>
  );
});
