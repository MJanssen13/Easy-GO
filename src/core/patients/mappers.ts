import type { Database, Json } from "@/types/database";
import type {
  Patient,
  Observation,
  ScheduledTask,
  VitalSigns,
  ObstetricData,
  Medication,
  MagnesiumData,
  NewPatientInput,
  UpdatePatientInput,
  NewObservationInput,
} from "./types";

type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
type PatientUpdate = Database["public"]["Tables"]["patients"]["Update"];
type ObservationRow = Database["public"]["Tables"]["observations"]["Row"];
type ObservationInsert = Database["public"]["Tables"]["observations"]["Insert"];

function asObject<T>(value: Json | null | undefined, fallback: T): T {
  return value && typeof value === "object" ? (value as T) : fallback;
}

/** Serialize a plain domain object (only JSON-safe values) into a Json column value. */
function toJson(value: object): Json {
  return value as unknown as Json;
}

export function dbToPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    module: row.module,
    name: row.name,
    medicalRecordNumber: row.medical_record_number,
    bed: row.bed,
    age: row.age,
    parity: row.parity,
    bloodType: row.blood_type,
    lmp: row.lmp,
    edd: row.edd,
    gaWeeks: row.ga_weeks,
    gaDays: row.ga_days,
    babyName: row.baby_name,
    status: row.status,
    outcome: row.outcome,
    riskFactors: row.risk_factors ?? [],
    useMethyldopa: row.use_methyldopa,
    methyldopaStartTime: row.methyldopa_start_time,
    methyldopaEndTime: row.methyldopa_end_time,
    useMagnesiumSulfate: row.use_magnesium_sulfate,
    magnesiumSulfateStartTime: row.magnesium_sulfate_start_time,
    magnesiumSulfateEndTime: row.magnesium_sulfate_end_time,
    schedule: asObject<ScheduledTask[]>(row.schedule, []),
    admissionDate: row.admission_date,
    dischargeTime: row.discharge_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function newPatientToInsert(input: NewPatientInput, createdBy: string | null): PatientInsert {
  return {
    module: input.module ?? "pre_parto",
    name: input.name,
    medical_record_number: input.medicalRecordNumber ?? null,
    bed: input.bed ?? null,
    age: input.age ?? null,
    parity: input.parity ?? null,
    blood_type: input.bloodType ?? null,
    lmp: input.lmp ?? null,
    edd: input.edd ?? null,
    ga_weeks: input.gaWeeks ?? null,
    ga_days: input.gaDays ?? null,
    status: input.status ?? "admission",
    risk_factors: input.riskFactors ?? [],
    created_by: createdBy,
  };
}

/** Build a DB patch with only the fields present in the input. */
export function updatePatientToDb(input: UpdatePatientInput): PatientUpdate {
  const p: PatientUpdate = {};
  if (input.name !== undefined) p.name = input.name;
  if (input.bed !== undefined) p.bed = input.bed;
  if (input.medicalRecordNumber !== undefined) p.medical_record_number = input.medicalRecordNumber;
  if (input.age !== undefined) p.age = input.age;
  if (input.parity !== undefined) p.parity = input.parity;
  if (input.bloodType !== undefined) p.blood_type = input.bloodType;
  if (input.babyName !== undefined) p.baby_name = input.babyName;
  if (input.lmp !== undefined) p.lmp = input.lmp;
  if (input.edd !== undefined) p.edd = input.edd;
  if (input.gaWeeks !== undefined) p.ga_weeks = input.gaWeeks;
  if (input.gaDays !== undefined) p.ga_days = input.gaDays;
  if (input.status !== undefined) p.status = input.status;
  if (input.riskFactors !== undefined) p.risk_factors = input.riskFactors;
  if (input.useMethyldopa !== undefined) p.use_methyldopa = input.useMethyldopa;
  if (input.methyldopaStartTime !== undefined) p.methyldopa_start_time = input.methyldopaStartTime;
  if (input.methyldopaEndTime !== undefined) p.methyldopa_end_time = input.methyldopaEndTime;
  if (input.useMagnesiumSulfate !== undefined) p.use_magnesium_sulfate = input.useMagnesiumSulfate;
  if (input.magnesiumSulfateStartTime !== undefined)
    p.magnesium_sulfate_start_time = input.magnesiumSulfateStartTime;
  if (input.magnesiumSulfateEndTime !== undefined)
    p.magnesium_sulfate_end_time = input.magnesiumSulfateEndTime;
  return p;
}

export function dbToObservation(row: ObservationRow): Observation {
  return {
    id: row.id,
    patientId: row.patient_id,
    recordedAt: row.recorded_at,
    vitals: asObject<VitalSigns>(row.vitals, {}),
    obstetric: asObject<ObstetricData>(row.obstetric, {}),
    medication: row.medication ? asObject<Medication>(row.medication, {}) : undefined,
    magnesiumData: row.magnesium_data
      ? asObject<MagnesiumData>(row.magnesium_data, { reflex: "present", diuresis: "" })
      : undefined,
    examinerName: row.examiner_name,
    notes: row.notes,
  };
}

export function newObservationToInsert(
  input: NewObservationInput,
  createdBy: string | null,
): ObservationInsert {
  return {
    patient_id: input.patientId,
    recorded_at: input.recordedAt ?? new Date().toISOString(),
    vitals: toJson(input.vitals ?? {}),
    obstetric: toJson(input.obstetric ?? {}),
    medication: input.medication ? toJson(input.medication) : null,
    magnesium_data: input.magnesiumData ? toJson(input.magnesiumData) : null,
    examiner_name: input.examinerName ?? null,
    notes: input.notes ?? null,
    created_by: createdBy,
  };
}
