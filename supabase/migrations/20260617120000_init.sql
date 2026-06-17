-- ============================================================================
-- Easy-GO · Initial schema (Phase 0)
--
-- Security model: SINGLE HOSPITAL (HC-UFTM). Every AUTHENTICATED user is a team
-- member and may access all patient rows (shared plantão board). The `anon`
-- role has NO policies and is therefore fully denied — this replaces the
-- prototype's dangerous `for all using (true)` PUBLIC policies.
--
-- Forward-compatible with multi-tenant: add a `team_id` column + tighten the
-- USING/CHECK clauses later without restructuring.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------- enums -----------------------------------------------------------
do $$ begin
  create type patient_module as enum ('pre_parto', 'psgo', 'puerperio', 'oncogineco');
exception when duplicate_object then null; end $$;

do $$ begin
  create type patient_status as enum (
    'admission', 'active_labor', 'induction', 'expectant',
    'postpartum', 'observation', 'inpatient', 'partogram_open', 'resolved'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type patient_outcome as enum (
    'vaginal_delivery', 'c_section', 'discharge', 'transfer', 'none'
  );
exception when duplicate_object then null; end $$;

-- ---------- shared trigger fn ----------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- profiles (one per auth user = team member) ----------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  crm text,
  role text not null default 'physician',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- auto-create a profile when a new auth user is created
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- patients --------------------------------------------------------
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  module patient_module not null default 'pre_parto',

  -- identity
  name text not null,
  medical_record_number text,
  bed text,
  age integer,

  -- obstetric basics
  parity text,
  blood_type text,
  lmp date,
  edd date,
  ga_weeks integer,
  ga_days integer,
  baby_name text,

  -- workflow
  status patient_status not null default 'admission',
  outcome patient_outcome not null default 'none',
  risk_factors text[] not null default '{}',

  -- protocols (pre-parto)
  use_methyldopa boolean not null default false,
  methyldopa_start_time timestamptz,
  methyldopa_end_time timestamptz,
  use_magnesium_sulfate boolean not null default false,
  magnesium_sulfate_start_time timestamptz,
  magnesium_sulfate_end_time timestamptz,

  -- flexible structures
  schedule jsonb not null default '[]'::jsonb,
  partogram_data jsonb,
  clinical_summary jsonb,  -- serologies, prenatal data, meds-in-use, etc.

  -- lifecycle
  admission_date timestamptz not null default now(),
  discharge_time timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_patients_module_status on patients(module, status);
create index if not exists idx_patients_bed on patients(bed);

drop trigger if exists trg_patients_updated on patients;
create trigger trg_patients_updated before update on patients
  for each row execute function set_updated_at();

-- ---------- observations ----------------------------------------------------
create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  vitals jsonb,
  obstetric jsonb,
  medication jsonb,
  magnesium_data jsonb,
  examiner_name text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_observations_patient on observations(patient_id, recorded_at desc);

-- ---------- ctgs (cardiotocography) -----------------------------------------
create table if not exists ctgs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  baseline integer,
  variability text,
  accelerations text,
  at_mf_ratio text,
  movements text,
  decelerations text,
  deceleration_details jsonb,
  contractions text,
  sound_stimulus text,
  stimulus_count text,
  score integer,
  conclusion text,
  notes text,
  image_path text,  -- Supabase Storage path (NOT base64)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ctgs_patient on ctgs(patient_id, recorded_at desc);

-- ---------- patient_transfers (audit log for module moves) ------------------
create table if not exists patient_transfers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  from_module patient_module,
  to_module patient_module not null,
  reason text,
  transferred_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_transfers_patient on patient_transfers(patient_id, created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles enable row level security;
alter table patients enable row level security;
alter table observations enable row level security;
alter table ctgs enable row level security;
alter table patient_transfers enable row level security;

-- profiles: read all team profiles, edit only your own
drop policy if exists "profiles_select_authenticated" on profiles;
create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- clinical tables: any authenticated team member, full access. anon = denied.
drop policy if exists "patients_all_authenticated" on patients;
create policy "patients_all_authenticated" on patients
  for all to authenticated using (true) with check (true);

drop policy if exists "observations_all_authenticated" on observations;
create policy "observations_all_authenticated" on observations
  for all to authenticated using (true) with check (true);

drop policy if exists "ctgs_all_authenticated" on ctgs;
create policy "ctgs_all_authenticated" on ctgs
  for all to authenticated using (true) with check (true);

drop policy if exists "transfers_all_authenticated" on patient_transfers;
create policy "transfers_all_authenticated" on patient_transfers
  for all to authenticated using (true) with check (true);
