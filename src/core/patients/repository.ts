import { createClient } from "@/lib/supabase/server";
import type { PatientModule, Json } from "@/types/database";
import type {
  Patient,
  Observation,
  NewPatientInput,
  UpdatePatientInput,
  NewObservationInput,
  ScheduledTask,
  PatientOutcome,
} from "./types";
import {
  dbToPatient,
  dbToObservation,
  newPatientToInsert,
  updatePatientToDb,
  newObservationToInsert,
} from "./mappers";

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

/**
 * Extrai detalhes legíveis de um erro do Supabase/PostgREST (code, message,
 * details, hint) para expor a causa real em vez de uma mensagem genérica.
 */
function supabaseErrorDetail(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    const parts = [e.code, e.message, e.details, e.hint].filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
  }
  return "";
}

/** Monta a mensagem final anexando a causa do banco, quando houver. */
function withDetail(base: string, error: unknown): string {
  const detail = supabaseErrorDetail(error);
  return detail ? `${base} (${detail})` : base;
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** All patients of a module, ordered by bed (natural). */
export async function listPatients(module: PatientModule): Promise<Patient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("module", module)
    .order("bed", { ascending: true, nullsFirst: false });

  if (error) throw new RepositoryError("Falha ao carregar pacientes.", error);
  return (data ?? []).map(dbToPatient);
}

/** One patient with its observations (most recent first). */
export async function getPatient(id: string): Promise<Patient | null> {
  const supabase = await createClient();
  // Paciente e observações em paralelo — a query de observações só depende do id.
  const [{ data, error }, { data: obsRows }] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).single(),
    supabase
      .from("observations")
      .select("*")
      .eq("patient_id", id)
      .order("recorded_at", { ascending: false }),
  ]);

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw new RepositoryError("Falha ao carregar a paciente.", error);
  }
  if (!data) return null;

  const patient = dbToPatient(data);
  const observations: Observation[] = (obsRows ?? []).map(dbToObservation);
  patient.observations = observations;
  patient.lastObservation = observations[0] ?? null;
  return patient;
}

/** Observations of several patients since a timestamp (for board 24h stats). */
export async function listObservationsSince(
  patientIds: string[],
  sinceISO: string,
): Promise<Observation[]> {
  if (patientIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("observations")
    .select("*")
    .in("patient_id", patientIds)
    .gte("recorded_at", sinceISO)
    .order("recorded_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(dbToObservation);
}

export async function createPatient(input: NewPatientInput): Promise<Patient> {
  const supabase = await createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("patients")
    .insert(newPatientToInsert(input, userId))
    .select()
    .single();

  if (error || !data) {
    console.error("createPatient failed:", error);
    throw new RepositoryError(withDetail("Não foi possível admitir a paciente.", error), error);
  }
  return dbToPatient(data);
}

export async function updatePatient(id: string, input: UpdatePatientInput): Promise<Patient> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .update(updatePatientToDb(input))
    .eq("id", id)
    .select()
    .single();
  if (error || !data) {
    console.error("updatePatient failed:", error);
    throw new RepositoryError(withDetail("Não foi possível atualizar a paciente.", error), error);
  }
  return dbToPatient(data);
}

/**
 * Registra o desfecho: status → resolvida, grava outcome + hora do desfecho e
 * remove as tarefas pendentes do cronograma (mantém o histórico concluído).
 */
export async function resolvePatient(
  id: string,
  outcome: PatientOutcome,
  dischargeTime?: string,
): Promise<void> {
  const supabase = await createClient();
  const schedule = await getSchedule(id).catch(() => [] as ScheduledTask[]);
  const cleaned = schedule.filter((t) => t.status !== "pending");
  const { error } = await supabase
    .from("patients")
    .update({
      status: "resolved",
      outcome,
      discharge_time: dischargeTime ?? new Date().toISOString(),
      schedule: cleaned as unknown as Json,
    })
    .eq("id", id);
  if (error) throw new RepositoryError("Não foi possível registrar o desfecho.", error);
}

/** Reabre uma paciente resolvida: volta para trabalho de parto ativo. */
export async function reopenPatient(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({ status: "active_labor", outcome: "none", discharge_time: null })
    .eq("id", id);
  if (error) throw new RepositoryError("Não foi possível reabrir a paciente.", error);
}

export async function deletePatient(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw new RepositoryError("Não foi possível excluir a paciente.", error);
}

/** Overwrite a patient's monitoring schedule (rotina de aferições). */
export async function updateSchedule(
  patientId: string,
  schedule: ScheduledTask[],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({ schedule: schedule as unknown as Json })
    .eq("id", patientId);
  if (error) throw new RepositoryError("Não foi possível salvar a rotina.", error);
}

/** Read just the schedule array of a patient. */
export async function getSchedule(patientId: string): Promise<ScheduledTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("schedule")
    .eq("id", patientId)
    .single();
  if (error || !data) throw new RepositoryError("Paciente não encontrada.", error);
  const raw = data.schedule;
  return Array.isArray(raw) ? (raw as unknown as ScheduledTask[]) : [];
}

export async function addObservation(input: NewObservationInput): Promise<Observation> {
  const supabase = await createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("observations")
    .insert(newObservationToInsert(input, userId))
    .select()
    .single();

  if (error || !data) {
    console.error("addObservation failed:", error);
    throw new RepositoryError(withDetail("Não foi possível registrar a evolução.", error), error);
  }
  return dbToObservation(data);
}

/**
 * Move a patient to another module (PSGO → Pré-Parto, PSGO ↔ Onco-Gineco),
 * writing an audited row in patient_transfers.
 */
export async function transferPatient(
  patientId: string,
  toModule: PatientModule,
  reason?: string,
): Promise<void> {
  const supabase = await createClient();
  const userId = await currentUserId();

  const { data: current, error: readError } = await supabase
    .from("patients")
    .select("module")
    .eq("id", patientId)
    .single();
  if (readError || !current) throw new RepositoryError("Paciente não encontrada.", readError);

  const { error: logError } = await supabase.from("patient_transfers").insert({
    patient_id: patientId,
    from_module: current.module,
    to_module: toModule,
    reason: reason ?? null,
    transferred_by: userId,
  });
  if (logError) throw new RepositoryError("Falha ao registrar a transferência.", logError);

  const { error: updateError } = await supabase
    .from("patients")
    .update({ module: toModule })
    .eq("id", patientId);
  if (updateError) throw new RepositoryError("Falha ao transferir a paciente.", updateError);
}
