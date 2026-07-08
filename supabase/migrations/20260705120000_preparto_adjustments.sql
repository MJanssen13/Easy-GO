-- ============================================================================
-- Easy-GO · Pré-Parto adjustments
--
-- 1. New admission situations: "conduction" (condução) e "scheduled_c_section"
--    (cesárea agendada) added to the patient_status enum.
-- 2. Dating: idade gestacional por USG (semanas/dias) + método de datação.
-- 3. Óbito fetal (checkbox na admissão).
-- 4. Nome do 2º bebê (gemelares).
--
-- NOTE: `alter type ... add value` roda fora de transação em versões antigas do
-- Postgres; no Supabase (PG15+) pode rodar em transação desde que o valor não
-- seja usado no mesmo bloco — o que é o caso aqui.
-- ============================================================================

alter type patient_status add value if not exists 'conduction';
alter type patient_status add value if not exists 'scheduled_c_section';

alter table patients
  add column if not exists us_ga_weeks integer,
  add column if not exists us_ga_days integer,
  add column if not exists dating_method text,   -- 'lmp' | 'ultrasound'
  add column if not exists fetal_death boolean not null default false,
  add column if not exists baby_name_2 text;
