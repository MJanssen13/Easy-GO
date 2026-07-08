# CLAUDE.md — Guia para agentes (Claude Code)

Orienta **qualquer sessão de Claude Code** neste repositório. Leia antes de codar.
Visão geral, stack e setup estão no `README.md`; o que vem a seguir está em `docs/ROADMAP.md`.

Trabalho **colaborativo**: várias pessoas contribuem via GitHub. Faça PRs pequenos e
frequentes para `main` e mantenha o `CHANGELOG.md` atualizado.

## Comandos (rode antes de commitar)

- `npm run typecheck` — obrigatório, deve passar.
- `npm run build` — deve passar. Sem `.env.local`, o build falha na coleta de dados
  (variáveis do Supabase). Crie um `.env.local` com placeholders:
  `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co` e
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key`.
- `npm run dev` — servidor local em `http://localhost:3000` (auth temporariamente desativada).

## Mapa da arquitetura

- `src/app/(dashboard)/<modulo>/` — rotas e componentes de UI (client) de cada módulo.
- `src/core/<dominio>/` — **lógica de domínio pura, sem React**. É onde vive a regra clínica
  e o que deve ter testes/validação.
  - `patients/` — **MODELO COMPARTILHADO** (ver Regra de Ouro).
  - `obstetric/` — idade gestacional / DPP (ACOG CO-700).
  - `fmf/` — biometria (Hadlock) e Doppler (FMF); `psgo/` — gerador do PS;
    `schedule/` — rotinas/aferições; `ctg/` — cardiotocografia; `prontuario/` — render.
- `src/types/database.ts` — tipos do schema Supabase (fonte da verdade dos dados).
- `supabase/migrations/` — esquema do banco.
- `src/lib/` — clients Supabase (`@supabase/ssr`), utils, definição de módulos.

## REGRA DE OURO: modelo de paciente compartilhado

Todos os módulos compartilham as tabelas `patients` (com o campo **`module`**),
`observations`, `ctgs` e `patient_transfers`. Tipos em `src/core/patients/types.ts` e
`src/types/database.ts`.

- **Não crie um modelo de paciente paralelo por módulo.**
- Dados **comuns** (nome, prontuário/RG, idade, DUM/DPP/IG, tipo sanguíneo, paridade,
  fatores de risco, protocolos) vão nas colunas de `patients`.
- Dados **específicos de um módulo** vão em `patients.clinical_summary` (JSON) ou viram
  `observations`.
- **Transferência entre módulos** = trocar `module` + registrar em `patient_transfers`.
  Assim os dados comuns viajam com o paciente (ex.: PSGO → pré-parto/puerpério/onco).
- A notação do exame obstétrico (posição/consistência do colo, esvaecimento %, dilatação,
  De Lee, bolsa, sangue na luva) segue `ObstetricData` — a mesma do pré-parto.

## Convenções

- Commits em pt-BR no formato `tipo(escopo): resumo` (ex.: `feat(psgo): quadro de imagem`).
- O prontuário gerado sai em MAIÚSCULAS (o render final aplica `.toUpperCase()`).
- **Fórmulas clínicas**: cite a fonte no comentário e trate como *apoio à decisão — validar*.
  **Nunca fabrique coeficientes**; sem a referência, não calcule e sinalize a pendência.
- Nunca faça commit de segredos (`.env.local` é ignorado).

## Fluxo colaborativo

1. Branch por tarefa a partir do `main` atualizado.
2. Mudanças pequenas e coesas; `typecheck` + `build` verdes antes do push.
3. Atualize o `CHANGELOG.md` (seção "Não lançado").
4. PR para `main` usando o template; após o merge, os demais fazem `rebase` no `main`.
