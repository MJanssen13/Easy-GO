import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import { RepositoryError } from "@/core/patients/repository";
import type { CtgRecord, NewCtgInput } from "./types";
import type { CtgDecelType } from "./scoring";

type CtgRow = Database["public"]["Tables"]["ctgs"]["Row"];
type CtgInsert = Database["public"]["Tables"]["ctgs"]["Insert"];

interface DecelDetails {
  type?: CtgDecelType | null;
  count?: string | null;
}

function dbToCtg(row: CtgRow): CtgRecord {
  const details = (row.deceleration_details as DecelDetails | null) ?? null;
  return {
    id: row.id,
    patientId: row.patient_id,
    recordedAt: row.recorded_at,
    baseline: row.baseline,
    variability: row.variability as CtgRecord["variability"],
    accelerations: row.accelerations as CtgRecord["accelerations"],
    atMfRatio: row.at_mf_ratio as CtgRecord["atMfRatio"],
    movements: row.movements as CtgRecord["movements"],
    decelerations: row.decelerations as CtgRecord["decelerations"],
    decelerationType: details?.type ?? null,
    decelerationCount: details?.count ?? null,
    contractions: row.contractions as CtgRecord["contractions"],
    soundStimulus: row.sound_stimulus as CtgRecord["soundStimulus"],
    stimulusCount: row.stimulus_count,
    score: row.score ?? 0,
    conclusion: row.conclusion ?? "",
    notes: row.notes,
    imagePath: row.image_path,
  };
}

function newCtgToInsert(input: NewCtgInput, createdBy: string | null): CtgInsert {
  const details: DecelDetails | null =
    input.decelerations === "present"
      ? { type: input.decelerationType ?? null, count: input.decelerationCount ?? null }
      : null;
  return {
    patient_id: input.patientId,
    recorded_at: input.recordedAt ?? new Date().toISOString(),
    baseline: input.baseline ?? null,
    variability: input.variability ?? null,
    accelerations: input.accelerations ?? null,
    at_mf_ratio: input.atMfRatio ?? null,
    movements: input.movements ?? null,
    decelerations: input.decelerations ?? null,
    deceleration_details: details as unknown as Json,
    contractions: input.contractions ?? null,
    sound_stimulus: input.soundStimulus ?? null,
    stimulus_count: input.stimulusCount ?? null,
    score: input.score,
    conclusion: input.conclusion,
    notes: input.notes ?? null,
    image_path: input.imagePath ?? null,
    created_by: createdBy,
  };
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** All CTGs of a patient, most recent first. */
export async function listCtgs(patientId: string): Promise<CtgRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ctgs")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false });
  if (error) throw new RepositoryError("Falha ao carregar as cardiotocografias.", error);
  return (data ?? []).map(dbToCtg);
}

export async function getCtg(id: string): Promise<CtgRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ctgs").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new RepositoryError("Falha ao carregar a CTG.", error);
  }
  return data ? dbToCtg(data) : null;
}

export async function createCtg(input: NewCtgInput): Promise<CtgRecord> {
  const supabase = await createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("ctgs")
    .insert(newCtgToInsert(input, userId))
    .select()
    .single();
  if (error || !data) throw new RepositoryError("Não foi possível salvar a CTG.", error);
  return dbToCtg(data);
}

export async function deleteCtg(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ctgs").delete().eq("id", id);
  if (error) throw new RepositoryError("Não foi possível excluir a CTG.", error);
}
