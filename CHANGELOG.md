# Changelog

Todas as mudanças relevantes. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).
Registre aqui o que fizer, na seção **Não lançado**, antes de abrir o PR.

## [Não lançado]

### PSGO — admissão persistida (Fase 1)

- O modelo de paciente compartilhado passa a gravar/ler `clinical_summary`
  (JSON) em `Patient`/mappers — sem quebrar os módulos existentes.
- Mapeador `PsgoForm ↔ Patient` (`src/core/psgo/patient-mapper.ts`): campos
  comuns (nome, RG, idade, paridade, tipo sanguíneo, DUM/DPP/IG, fatores de
  risco) vão nas colunas; a admissão completa + Robson + prontuário ficam em
  `clinical_summary`. Datação pelas colunas segue o método ACOG escolhido.
- Action `savePsgoAdmission` e botão **"Salvar admissão"** no gerador do PSGO:
  cria/atualiza uma paciente com `module = "psgo"` (base para transferir aos
  outros módulos). *(Requer Supabase configurado.)*
- Rotas do PSGO reestruturadas (como o pré-parto): `/psgo` = **board** de
  admissões; `/psgo/admissao` = gerador (nova/edição via `?id=`);
  `/psgo/[id]` = **detalhe** da paciente (prontuário + editar). Salvar
  redireciona para o detalhe.

### Colaboração

- `CLAUDE.md`, `CONTRIBUTING.md`, template de PR, `docs/ROADMAP.md` e este changelog.
- SessionStart hook (`.claude/settings.json`) instalando dependências ao abrir a sessão.

### PSGO — gerador de prontuário

- **Exames de imagem** em seção própria, no formato do MODELO PS, em **quadro por colunas**
  (cada USG = uma coluna); percentis ao vivo de PESO e circunferência abdominal (Hadlock,
  idêntico à calculadora Fetal Biometry 5.0) e da tríade Doppler IP-AUmb / IP-ACM / RCP
  (FMF/Ciobanu 2019, portadas verbatim).
- **Datação**: passa a usar o USG marcado como "Datar" no quadro de imagem (fim da entrada
  duplicada). Chave tripla **DUM / USG / Auto (ACOG)** com informativo do método (CO-700) e
  cartões de **IG pela DUM × pela USG** (com data do exame e IG na data), destacando o método
  usado.
- **Sorologias** em chave de três estados (Não realizado / NR / REAG) com cor semântica;
  inclusão de **TR-Sífilis** e **FTA-ABS**.
- **Exame ginecológico e obstétrico** esmiuçado em botões clicáveis (abdome, toque vaginal,
  exame especular), com a **notação do pré-parto** (colo grosso→apagado ou esvaecimento %,
  dilatação em cm, De Lee, bolsa, sangue na luva).
- Seletores de datação e dados obstétricos convertidos para *segmented control*.

### UI

- Tema por módulo (Medway/LabFlow), fonte IBM Plex e barra superior em gradiente na cor do
  módulo.
- Plataforma em **largura total**; PSGO em layout **2/3 (formulário) + 1/3 (prontuário)**.
