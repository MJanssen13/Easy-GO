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

/**
 * Id do usuário para `created_by`. Lê a sessão do cookie (sem ida ao servidor
 * de autenticação a cada gravação — `getUser()` valida na rede e pode até
 * renovar token). Serve só para atribuição; o acesso continua protegido pelo RLS.
 */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
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

/**
 * Só a linha da paciente (sem observações) — 1 consulta. Para server actions
 * que precisam ler antes de gravar (ex.: mesclar `clinical_summary`).
 */
export async function getPatientRecord(id: string): Promise<Patient | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new RepositoryError("Falha ao carregar a paciente.", error);
  }
  return data ? dbToPatient(data) : null;
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

/**
 * Atualiza a paciente. Devolve só o id: a linha inteira (com `clinical_summary`
 * e `partogram_data`, JSONs grandes) não volta pela rede a cada salvamento.
 */
export async function updatePatient(id: string, input: UpdatePatientInput): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .update(updatePatientToDb(input))
    .eq("id", id)
    .select("id")
    .single();
  if (error || !data) {
    console.error("updatePatient failed:", error);
    throw new RepositoryError(withDetail("Não foi possível atualizar a paciente.", error), error);
  }
}

/** Insere várias aferições numa única ida ao banco (planilha). */
export async function addObservations(inputs: NewObservationInput[]): Promise<number> {
  if (inputs.length === 0) return 0;
  const supabase = await createClient();
  const userId = await currentUserId();
  const { error, count } = await supabase
    .from("observations")
    .insert(inputs.map((i) => newObservationToInsert(i, userId)), { count: "exact" });
  if (error) throw new RepositoryError(withDetail("Não foi possível gravar as aferições.", error), error);
  return count ?? inputs.length;
}

/** Atualiza uma aferição já registrada (todos os campos de dados). */
export async function updateObservation(id: string, input: NewObservationInput): Promise<void> {
  const supabase = await createClient();
  const row = newObservationToInsert(input, null);
  const { error } = await supabase
    .from("observations")
    .update({
      recorded_at: row.recorded_at,
      vitals: row.vitals,
      obstetric: row.obstetric,
      medication: row.medication,
      magnesium_data: row.magnesium_data,
      examiner_name: row.examiner_name,
      notes: row.notes,
    })
    .eq("id", id)
    .eq("patient_id", input.patientId);
  if (error) throw new RepositoryError(withDetail("Não foi possível atualizar a aferição.", error), error);
}

/** Exclui aferições da paciente (planilha / histórico). */
export async function deleteObservations(patientId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("observations").delete().eq("patient_id", patientId).in("id", ids);
  if (error) throw new RepositoryError(withDetail("Não foi possível excluir as aferições.", error), error);
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

/** Horas de retenção do prontuário após a alta, antes da exclusão automática. */
export const DISCHARGE_RETENTION_HOURS = 24;

/**
 * Exclui as admissões com ALTA (outcome="discharge") há mais de 24h — o
 * prontuário fica salvo por 24h antes da exclusão. Best-effort, chamada ao abrir
 * o board (sem cron). Retorna o nº de prontuários removidos.
 */
export async function purgeExpiredDischarges(module: PatientModule): Promise<number> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - DISCHARGE_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("patients")
    .delete()
    .eq("module", module)
    .eq("outcome", "discharge")
    .lt("discharge_time", cutoff)
    .select("id");
  if (error) throw new RepositoryError("Falha ao remover altas expiradas.", error);
  return (data ?? []).length;
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
