#!/bin/bash
set -euo pipefail

# SessionStart hook — prepara o ambiente das sessões do Claude Code na web:
# instala dependências e garante um .env.local com placeholders para que
# `npm run typecheck` e `npm run build` funcionem sem segredos.
#
# Só roda no ambiente remoto (Claude Code na web); localmente sai sem efeito.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Dependências (npm install aproveita o cache do container melhor que npm ci).
npm install --no-audit --no-fund

# .env.local com placeholders (o build valida as variáveis do Supabase).
# Valores reais ficam de fora do repositório; só habilitam typecheck/build.
if [ ! -f .env.local ]; then
  cat > .env.local <<'ENV'
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ENV
fi
