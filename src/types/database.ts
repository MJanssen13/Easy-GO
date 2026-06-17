/**
 * Hand-written Supabase schema types for the foundation phase.
 * Replace later with generated types: `supabase gen types typescript`.
 * Must stay in sync with supabase/migrations/0001_init.sql.
 *
 * NOTE: use `type` aliases (object literals), not `interface`. Supabase's
 * generics require each Row/Insert/Update to be assignable to
 * `Record<string, unknown>`; a TS `interface` lacks the implicit index
 * signature and would make the typed client fall back to `never`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PatientModule = "pre_parto" | "psgo" | "puerperio" | "oncogineco";

export type PatientStatus =
  | "admission"
  | "active_labor"
  | "induction"
  | "expectant"
  | "postpartum"
  | "observation"
  | "inpatient"
  | "partogram_open"
  | "resolved";

export type PatientOutcome = "vaginal_delivery" | "c_section" | "discharge" | "transfer" | "none";

// ---------- profiles --------------------------------------------------------
type ProfileRow = {
  id: string;
  full_name: string | null;
  crm: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};
type ProfileInsert = {
  id: string;
  full_name?: string | null;
  crm?: string | null;
  role?: string;
};
type ProfileUpdate = {
  full_name?: string | null;
  crm?: string | null;
  role?: string;
};

// ---------- patients --------------------------------------------------------
type PatientRow = {
  id: string;
  module: PatientModule;
  name: string;
  medical_record_number: string | null;
  bed: string | null;
  age: number | null;
  parity: string | null;
  blood_type: string | null;
  lmp: string | null;
  edd: string | null;
  ga_weeks: number | null;
  ga_days: number | null;
  baby_name: string | null;
  status: PatientStatus;
  outcome: PatientOutcome;
  risk_factors: string[] | null;
  use_methyldopa: boolean;
  methyldopa_start_time: string | null;
  methyldopa_end_time: string | null;
  use_magnesium_sulfate: boolean;
  magnesium_sulfate_start_time: string | null;
  magnesium_sulfate_end_time: string | null;
  schedule: Json;
  partogram_data: Json | null;
  clinical_summary: Json | null;
  admission_date: string;
  discharge_time: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type PatientInsert = {
  id?: string;
  module?: PatientModule;
  name: string;
  medical_record_number?: string | null;
  bed?: string | null;
  age?: number | null;
  parity?: string | null;
  blood_type?: string | null;
  lmp?: string | null;
  edd?: string | null;
  ga_weeks?: number | null;
  ga_days?: number | null;
  baby_name?: string | null;
  status?: PatientStatus;
  outcome?: PatientOutcome;
  risk_factors?: string[] | null;
  use_methyldopa?: boolean;
  methyldopa_start_time?: string | null;
  methyldopa_end_time?: string | null;
  use_magnesium_sulfate?: boolean;
  magnesium_sulfate_start_time?: string | null;
  magnesium_sulfate_end_time?: string | null;
  schedule?: Json;
  partogram_data?: Json | null;
  clinical_summary?: Json | null;
  admission_date?: string;
  discharge_time?: string | null;
  created_by?: string | null;
};
type PatientUpdate = Partial<PatientInsert>;

// ---------- observations ----------------------------------------------------
type ObservationRow = {
  id: string;
  patient_id: string;
  recorded_at: string;
  vitals: Json | null;
  obstetric: Json | null;
  medication: Json | null;
  magnesium_data: Json | null;
  examiner_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};
type ObservationInsert = {
  id?: string;
  patient_id: string;
  recorded_at?: string;
  vitals?: Json | null;
  obstetric?: Json | null;
  medication?: Json | null;
  magnesium_data?: Json | null;
  examiner_name?: string | null;
  notes?: string | null;
  created_by?: string | null;
};
type ObservationUpdate = Partial<ObservationInsert>;

// ---------- ctgs ------------------------------------------------------------
type CtgRow = {
  id: string;
  patient_id: string;
  recorded_at: string;
  baseline: number | null;
  variability: string | null;
  accelerations: string | null;
  at_mf_ratio: string | null;
  movements: string | null;
  decelerations: string | null;
  deceleration_details: Json | null;
  contractions: string | null;
  sound_stimulus: string | null;
  stimulus_count: string | null;
  score: number | null;
  conclusion: string | null;
  notes: string | null;
  image_path: string | null;
  created_by: string | null;
  created_at: string;
};
type CtgInsert = {
  id?: string;
  patient_id: string;
  recorded_at?: string;
  baseline?: number | null;
  variability?: string | null;
  accelerations?: string | null;
  at_mf_ratio?: string | null;
  movements?: string | null;
  decelerations?: string | null;
  deceleration_details?: Json | null;
  contractions?: string | null;
  sound_stimulus?: string | null;
  stimulus_count?: string | null;
  score?: number | null;
  conclusion?: string | null;
  notes?: string | null;
  image_path?: string | null;
  created_by?: string | null;
};
type CtgUpdate = Partial<CtgInsert>;

// ---------- patient_transfers ----------------------------------------------
type TransferRow = {
  id: string;
  patient_id: string;
  from_module: PatientModule | null;
  to_module: PatientModule;
  reason: string | null;
  transferred_by: string | null;
  created_at: string;
};
type TransferInsert = {
  id?: string;
  patient_id: string;
  to_module: PatientModule;
  from_module?: PatientModule | null;
  reason?: string | null;
  transferred_by?: string | null;
};
type TransferUpdate = Partial<TransferInsert>;

export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: ProfileUpdate; Relationships: [] };
      patients: { Row: PatientRow; Insert: PatientInsert; Update: PatientUpdate; Relationships: [] };
      observations: {
        Row: ObservationRow;
        Insert: ObservationInsert;
        Update: ObservationUpdate;
        Relationships: [];
      };
      ctgs: { Row: CtgRow; Insert: CtgInsert; Update: CtgUpdate; Relationships: [] };
      patient_transfers: {
        Row: TransferRow;
        Insert: TransferInsert;
        Update: TransferUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      patient_module: PatientModule;
      patient_status: PatientStatus;
      patient_outcome: PatientOutcome;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
