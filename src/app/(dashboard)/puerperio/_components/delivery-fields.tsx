"use client";

import { Input } from "@/components/ui/input";
import {
  DELIVERY_LABELS,
  emptyNewborn,
  type DeliveryInfo,
  type DeliveryType,
  type Newborn,
} from "@/core/puerperio/types";
import { cn } from "@/lib/utils";

/** ISO → "YYYY-MM-DDTHH:mm" local (datetime-local). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Rótulo + campo associados (clicar no rótulo foca o campo). */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-medium leading-none">{label}</span>
      {children}
    </label>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

function NewbornFields({
  value,
  onChange,
  title,
}: {
  value: Newborn;
  onChange: (v: Newborn) => void;
  title?: string;
}) {
  const set = (patch: Partial<Newborn>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {title && <p className="text-xs font-semibold text-muted-foreground">{title}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-12 text-xs text-muted-foreground">Sexo</span>
        <Chip active={value.sex === "F"} onClick={() => set({ sex: value.sex === "F" ? "" : "F" })}>
          Feminino
        </Chip>
        <Chip active={value.sex === "M"} onClick={() => set({ sex: value.sex === "M" ? "" : "M" })}>
          Masculino
        </Chip>
        <span className="mx-1 text-muted-foreground">·</span>
        <Chip active={value.alive} onClick={() => set({ alive: true })}>
          Vivo
        </Chip>
        <Chip active={!value.alive} onClick={() => set({ alive: false })}>
          Natimorto
        </Chip>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Peso (g)">
          <Input inputMode="numeric" value={value.weight} onChange={(e) => set({ weight: e.target.value })} />
        </Field>
        <Field label="Apgar 1'">
          <Input inputMode="numeric" value={value.apgar1} onChange={(e) => set({ apgar1: e.target.value })} />
        </Field>
        <Field label="Apgar 5'">
          <Input inputMode="numeric" value={value.apgar5} onChange={(e) => set({ apgar5: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

/** Via de parto, data/hora, IG, RN(s) e destino (alojamento conjunto). */
export function DeliveryFields({
  value,
  onChange,
}: {
  value: DeliveryInfo;
  onChange: (v: DeliveryInfo) => void;
}) {
  const set = (patch: Partial<DeliveryInfo>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(DELIVERY_LABELS) as DeliveryType[]).map((t) => (
          <Chip key={t} active={value.type === t} onClick={() => set({ type: t })}>
            {DELIVERY_LABELS[t]}
          </Chip>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Data e hora do parto">
          <Input
            type="datetime-local"
            value={toLocalInput(value.at)}
            onChange={(e) => e.target.value && set({ at: new Date(e.target.value).toISOString() })}
          />
        </Field>
        <Field label="IG no parto">
          <Input
            placeholder="ex.: 39 SEMANAS E 2 DIAS"
            value={value.ga}
            onChange={(e) => set({ ga: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={!value.twins} onClick={() => set({ twins: false })}>
          RN único
        </Chip>
        <Chip
          active={value.twins}
          onClick={() => set({ twins: true, newborn2: value.newborn2 ?? emptyNewborn() })}
        >
          Gemelar
        </Chip>
        <span className="mx-1 text-muted-foreground">·</span>
        <Chip active={value.roomingIn} onClick={() => set({ roomingIn: true })}>
          Alojamento conjunto
        </Chip>
        <Chip active={!value.roomingIn} onClick={() => set({ roomingIn: false })}>
          RN fora do AC
        </Chip>
      </div>
      <div className={cn("grid gap-2", value.twins && "sm:grid-cols-2")}>
        <NewbornFields
          title={value.twins ? "RN 1" : "RN"}
          value={value.newborn}
          onChange={(nb) => set({ newborn: nb })}
        />
        {value.twins && (
          <NewbornFields
            title="RN 2"
            value={value.newborn2 ?? emptyNewborn()}
            onChange={(nb) => set({ newborn2: nb })}
          />
        )}
      </div>
    </div>
  );
}
