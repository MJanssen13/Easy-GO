-- ============================================================================
-- Easy-GO · Acesso sem autenticação (login temporariamente desativado)
--
-- O middleware está desativado (src/middleware.ts é um no-op), então o app
-- acessa o Supabase como papel `anon`. As policies originais liberavam apenas
-- `authenticated`, bloqueando toda leitura/escrita (erro 42501: "new row
-- violates row-level security policy"). Aqui as policies passam a permitir
-- também o papel `anon`.
--
-- ⚠️ ATENÇÃO DE SEGURANÇA: isto REMOVE o controle de acesso no banco. Qualquer
-- pessoa com a URL / anon key pode ler e gravar dados de pacientes. Use apenas
-- em ambiente de TESTE. Antes de dados reais / produção: reative a
-- autenticação (updateSession no middleware) e reverta estas policies para
-- `to authenticated`.
-- ============================================================================

-- patients
drop policy if exists "patients_all_authenticated" on patients;
drop policy if exists "patients_all_anon" on patients;
create policy "patients_all_anon" on patients
  for all to anon, authenticated using (true) with check (true);

-- observations
drop policy if exists "observations_all_authenticated" on observations;
drop policy if exists "observations_all_anon" on observations;
create policy "observations_all_anon" on observations
  for all to anon, authenticated using (true) with check (true);

-- ctgs
drop policy if exists "ctgs_all_authenticated" on ctgs;
drop policy if exists "ctgs_all_anon" on ctgs;
create policy "ctgs_all_anon" on ctgs
  for all to anon, authenticated using (true) with check (true);

-- patient_transfers
drop policy if exists "transfers_all_authenticated" on patient_transfers;
drop policy if exists "transfers_all_anon" on patient_transfers;
create policy "transfers_all_anon" on patient_transfers
  for all to anon, authenticated using (true) with check (true);

-- profiles (leitura)
drop policy if exists "profiles_select_authenticated" on profiles;
drop policy if exists "profiles_select_anon" on profiles;
create policy "profiles_select_anon" on profiles
  for select to anon, authenticated using (true);
