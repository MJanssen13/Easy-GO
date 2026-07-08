# Roadmap

Plano sequencial. Mantido versionado para o time acompanhar as próximas etapas.
Ver `CLAUDE.md` para a arquitetura e a **regra do modelo compartilhado**.

## Contexto: interoperabilidade entre módulos

Pacientes do **PSGO** serão transferidas para **onco-ginecologia, puerpério ou pré-parto**.
A infraestrutura já existe no schema:

- `patients.module` (`pre_parto | psgo | puerperio | oncogineco`) — o mesmo paciente muda de módulo.
- `patient_transfers` (`from_module` → `to_module`, motivo, autor).
- Colunas comuns em `patients` + JSON flexível (`clinical_summary`, `partogram_data`).
- `observations` compartilhada, com `ObstetricData` na notação do pré-parto.

**Lacuna atual:** o PSGO é um gerador *stateless* (`PsgoForm` em memória) — não cria/salva
`Patient`, então não há o que transferir. As fases abaixo fecham essa lacuna.

## Fase 0 — Colaboração ✅ (em andamento)

- [x] `CLAUDE.md`, `CONTRIBUTING.md`, template de PR, `CHANGELOG.md`, este roadmap.
- [x] SessionStart hook (deps ao abrir a sessão).
- [ ] Merge de `main-o33a34` → `main` (PR) para o time partir do estado atual.

## Fase 1 — Fundação de dados do PSGO

- [ ] Mapeadores `PsgoForm ↔ Patient / Observation / clinical_summary`.
- [ ] Persistir a admissão do PSGO (criar `Patient` com `module = "psgo"`).
- [ ] Reaproveitar `src/core/patients/repository.ts` (não duplicar acesso a dados).

## Fase 2 — Admissão revisada, seção a seção

Revisar cada seção confirmando **campo comum × JSON específico**:

- [ ] Identificação (RG → `medical_record_number`; procedência/acompanhante → JSON)
- [ ] Paridade (string em `parity` + detalhe no JSON)
- [ ] Datação (DUM/DPP/IG já computados → colunas de `patients`)
- [ ] Robson / apresentação / nº de fetos / início do TP → JSON
- [ ] Tipo sanguíneo (coluna) / Coombs (JSON)
- [ ] Comorbidades → `risk_factors`
- [ ] Medicamentos, cirurgias, alergias, hábitos → JSON
- [ ] Sorologias → JSON
- [ ] QP / HPMA → JSON
- [ ] Exame físico + sinais vitais → `observation.vitals`
- [ ] Exame ginecológico → `observation.obstetric`
- [ ] Laboratoriais / Imagem / CTG → `ctgs` + JSON
- [ ] Conduta → status / JSON

## Fase 3 — Transferência

- [ ] Ação "Transferir para…" (pré-parto / puerpério / onco) via `patient_transfers`.
- [ ] Ajuste de `status`/`module` e trilha de auditoria.

## Fase 4 — Consumo nos outros módulos

- [ ] Puerpério e onco leem o `clinical_summary` herdado do PSGO.
- [ ] Pré-parto recebe a admissão do PSGO já datada/classificada.
