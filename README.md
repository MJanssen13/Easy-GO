# Easy-GO

Plataforma clínica de Obstetrícia e Ginecologia (HC-UFTM). Next.js (App Router) + Supabase, em 5 módulos:

| Módulo | Tipo | Função |
| --- | --- | --- |
| **Pré-Parto** | Persistente | Acompanhamento do trabalho de parto (partograma, CTG, protocolos). |
| **Pré-Natal** | Gerador | Consulta por trimestre (MS/Febrasgo/ACOG) → texto para prontuário. |
| **PSGO** | Gerador + transferência | Rotinas do PS obstétrico → prontuário; transfere para Pré-Parto. |
| **Puerpério** | Persistente | Evolução de enfermaria no puerpério. |
| **Onco-Ginecologia** | Persistente | Evolução de enfermaria oncológica; transfere de/para PSGO. |

## Stack

- Next.js 15 (App Router, Server Actions) · React 19 · TypeScript
- Tailwind CSS v3 + UI no padrão shadcn/ui
- Supabase (Postgres + Auth) via `@supabase/ssr`, com **Row Level Security**
- Zod (validação) · Recharts (gráficos) · lucide-react (ícones)

## Setup

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.local.example .env.local   # preencha com os valores do seu projeto Supabase

# 3. Banco de dados
#    Aplique a migração em supabase/migrations/20260617120000_init.sql no seu projeto
#    (SQL Editor do Supabase ou `supabase db push`).

# 4. Desenvolvimento
npm run dev        # http://localhost:3000
```

### Criar o primeiro usuário

No painel do Supabase → Authentication → Users → *Add user* (com e-mail/senha).
Um `profile` é criado automaticamente pelo trigger `on_auth_user_created`.

## Segurança

- Acesso exige autenticação (middleware + RLS). O papel `anon` é **negado** em todas as tabelas clínicas.
- Nunca faça commit de `.env.local` nem da `service_role key`.
- Conteúdo clínico é **apoio à decisão** e exige validação médica.

## Scripts

| Comando | Ação |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
