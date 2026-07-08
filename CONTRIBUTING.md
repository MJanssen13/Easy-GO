# Contribuindo com o Easy-GO

Trabalho colaborativo com **Claude Code + GitHub**. O objetivo deste guia é que qualquer
pessoa (e a sessão de Claude Code dela) consiga pegar o trabalho de onde parou.

## Antes de começar

1. `npm install`
2. `cp .env.local.example .env.local` (placeholders bastam para `typecheck`/`build`; valores
   reais do Supabase só para rodar contra o banco).
3. Leia **`CLAUDE.md`** (arquitetura + regra do modelo compartilhado) e
   **`docs/ROADMAP.md`** (fases e próximos passos).
4. Olhe o **`CHANGELOG.md`** para saber o que mudou recentemente.

## Fluxo de trabalho

1. Parta do `main` atualizado:
   ```bash
   git fetch origin
   git checkout -B <sua-tarefa> origin/main
   ```
2. Faça mudanças pequenas e coesas. Rode antes do push:
   ```bash
   npm run typecheck
   npm run build
   ```
3. Registre o que fez no `CHANGELOG.md` (seção **Não lançado**).
4. Push da sua branch e **abra um PR para `main`** usando o template
   (`.github/pull_request_template.md`). Descreva **o quê**, **por quê** e a **verificação**.
5. Depois do merge, quem estiver em outra branch atualiza:
   ```bash
   git fetch origin && git rebase origin/main
   ```

## Regras

- **Não reinvente o modelo `Patient`** — use o compartilhado (ver `CLAUDE.md`).
- Commits em pt-BR: `tipo(escopo): resumo`.
- Conteúdo clínico é **apoio à decisão**; cite as fontes e não fabrique coeficientes.
- Sem segredos no repositório.

## Checks obrigatórios do PR

- [ ] `npm run typecheck` passou
- [ ] `npm run build` passou
- [ ] `CHANGELOG.md` atualizado
