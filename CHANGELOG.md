# Changelog

Todas as mudanças relevantes. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).
Registre aqui o que fizer, na seção **Não lançado**, antes de abrir o PR.

## [Não lançado]

### PSGO — layout do card de identificação

- Campos reorganizados em linhas: **data · idade · RG** (campo de data mais
  estreito, ajustado ao conteúdo); **nome (2/3) · nome social (1/3)**;
  **procedência · local do pré-natal · nº de consultas** (campo curto, 2
  algarismos) com caixa **"Pré-natal irregular"**; **acompanhante · parentesco**,
  com campo **"Qual parentesco?"** quando o parentesco é "Outro" (registrado no
  prontuário).
- A chave **Gestante / Não gestante** fica no cabeçalho do card de identificação,
  à direita; o card avulso "Gestante no momento?" foi removido.
- **Pré-natal irregular** grava `PRN IRREGULAR` na linha de consultas e entra
  como diagnóstico na **HD**; pacientes **< 18 anos** ganham `ADOLESCENTE` na HD
  (gestantes e não gestantes).
- Correções: a datação não lança mais quando a DUM é marcada como incerta sem
  USG (retorna sem IG); a data da consulta passa a ser calculada no servidor e
  injetada no formulário, evitando divergência de hidratação (erro React #418).

### PSGO — gestante/não gestante + notação de paridade do serviço

- **Chave "Gestante no momento?"** no topo da admissão (o PSGO também atende
  pessoas não gestantes). Quando "Não gestante": G não soma a gestação atual;
  somem pré-natal, Robson, IG/datação (fica só a DUM), AU/BCF, campos
  obstétricos do abdome/toque, quadro de USG obstétrico e CTG; o prontuário
  registra "NÃO GESTANTE NO MOMENTO" e a HD passa a listar só as comorbidades.
  Admissões antigas continuam abrindo como gestantes.
- **Notação de paridade na convenção do serviço**: `G{g}P{p}(detalhe)`, em que
  **P soma todos os desfechos** (N normal, C cesárea, F fórceps e A abortos) e
  as **ectópicas ficam aninhadas em A** — ex.: `G5P4(N1C2A1)`,
  `G5P5(N2C1A2(E1))`. **Gemelares** (novo controle por gestação prévia, com via
  do 2º gemelar): 1 gestação; via vaginal conta 1 parto por feto e cesárea
  conta 1 para os dois — ex.: `G2P3(N3(GEM2))`, `G3P2(N1C1(GEM2))`,
  `G3P3(N2C1(GEM2[N1C1]))`. O "i" do card documenta a convenção e a divergência
  do GPA/GTPAL clássico (ACOG/Williams: abortos não somam em P; gemelar = 1
  parto) — *apoio à documentação, validar com a equipe*.
- Botão **"Sem intercorrências"** por gestação prévia, só em parto normal e
  cesárea; no parto normal oculta o campo de comemorativos e registra
  `SEM INTERCORRÊNCIAS` na linha. Cesárea e fórceps exigem o motivo; aborto e
  ectópica exigem a IG: a caixa de texto mostra um prompt obrigatório em
  vermelho (`INDICAR MOTIVO` / `INFORMAR IG`) enquanto vazia — na cesárea o
  prompt aparece mesmo com "sem intercorrências" marcado.

### PSGO — Fase 2 (revisão da admissão)

- **Paridade** com interface mais dinâmica: botões de adição rápida por tipo
  (parto normal / cesárea / fórceps / aborto / ectópica), resumo ao vivo no
  cabeçalho (ex.: `G5C1N2A1`) e um "i" explicando a codificação (GPA com via de
  parto detalhada; TPAL/GTPAL como referência). Cada gestação ganhou um campo
  amplo (textarea) para intercorrências e dados comemorativos; quebras de linha
  são normalizadas na linha do prontuário.

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
- **Transferência** no detalhe do PSGO: botão "Transferir para…"
  (Pré-Parto / Puerpério / Onco-Ginecologia) usando `transferPatient` —
  troca o `module` e registra em `patient_transfers`; os dados comuns e a
  admissão viajam com a paciente.

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
