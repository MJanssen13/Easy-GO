# Changelog

Todas as mudanças relevantes. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).
Registre aqui o que fizer, na seção **Não lançado**, antes de abrir o PR.

## [Não lançado]

### PSGO — Novos parâmetros do USG e percentis pela Fetal Biometry 3.1

- No quadro de USG entram **Saco gestacional (SG, mm)**, **Vesícula vitelínica
  (VV, mm)**, **Circunferência cefálica (CC, mm)** e **BCF** (com opção de
  *ausente* ou o número de bpm). Saíram **DBP**, **TN** e **osso nasal (ON)**.
- Os percentis de biometria passam a seguir a calculadora **Fetal Biometry 3.1**
  (Perinatology.com), exceto os de **IP** (Doppler/uterina), que continuam pela
  FMF:
  - **PESO** — mediana analítica de Hadlock 1991
    `PFE = exp(0,578 + 0,332·IG − 0,00354·IG²)` e DP normal = **13,25%** da
    mediana (antes: tabela + log-normal DP ln 0,127).
  - **CC** — Hadlock 1984 `−11,48 + 1,56·IG − 0,0002548·IG³`, DP 1,0 cm
    (antes: referência FMF).
  - **CA** — inalterada (já era Hadlock 1984).
- Novo campo **ILA** (índice de líquido amniótico), exibido junto do **MBV** na
  mesma linha (`MBV / ILA`).
- Reorganização do quadro: **CCN/SG/VV** ficam num grupo recolhível
  **"Gestações iniciais"** e **IP AUmb/IP ACM/RCP/IP a. uterina** num grupo
  recolhível **"Doppler"** (ambos recolhidos por padrão); **Placenta** e **grau**
  dividem a mesma linha (listas lado a lado, mais estreitas).
- A **prévia** de cada USG passa a ser **editável** (para inserir observações ou
  correções) e sai toda em MAIÚSCULAS. O texto editado substitui a linha gerada
  automaticamente no laudo; o botão **"regenerar"** descarta a edição e volta ao
  automático (novo campo `overrideText`).

### PSGO — IG automática dos USGs pela datação (percentis coerentes)

- A datação continua sendo definida entre **DUM** e **USG** (o USG marcado para
  datação). A novidade: a **IG dos demais USGs** deixa de ser digitada e passa a
  ser **automática**, calculada pela **data de realização** de cada exame sobre a
  datação resolvida (método DUM/USG + ACOG CO-700). O USG de datação mantém a IG
  digitada (é a âncora e o insumo do ACOG).
- Como os percentis (PESO/CA/DBP Hadlock e Doppler/TN/IP uterina FMF) usam a IG,
  eles passam a refletir a **datação única** — evita "mover o alvo" a cada exame
  (o que mascararia CIUR) e mantém o crescimento medido contra a mesma linha.
- No quadro de USG, a IG dos exames automáticos aparece como valor (rótulo
  `auto`, somente leitura); o exame de datação segue editável (rótulo `datação`).
- Novo `gaFromEdd` (IG em qualquer data a partir da DPP) e, no PSGO,
  `resolveDatingContext`/`examEffectiveGa`/`withAutoGa`/`findDatingUsg`.

### PSGO — Entrada de datas em DD/MM/AA e IG pela data da consulta

- Os campos de data do PSGO passam a ser digitados em **DD/MM/AA** (novo
  `DateBRInput`, com máscara e validação) — o `<input type="date">` nativo não
  permite ano com 2 dígitos. Guarda o valor como ISO internamente.
- A **data da CTG** vem pré-preenchida com **hoje** (editável).
- A **data da consulta** segue pré-preenchida com hoje; ao alterá-la, os itens
  que dependem dela (**IG** pela DUM/USG, DPP, termo do Robson) passam a ser
  calculados **naquela data** (`refFromISO`), e não mais sempre em "hoje".

### PSGO — Data e nova notação da CTG

- Cada CTG passa a registrar a **data** (além da hora); a data pré-preenche com
  a da consulta e é editável (CTG feita em outro dia).
- A notação da CTG no prontuário virou o formato compacto:
  `(DD/MM/AA HH:MM) LB 125 BPM / VARIAB 6-25 / AT + (≥2 AT EM 20 MIN) / ES - /
  EM 1 / MF + / DESC - / CONTR - / FETO ATIVO (5 PTS) / OBS: ... / CD: ...`.
  O laudo impresso usa a data da própria CTG.
- Cada CTG sai numa **linha própria** (com "- "), inclusive quando há só uma.
- As datas das notações do **prontuário** do PSGO passam a **DD/MM/AA** (ano com
  2 dígitos): cabeçalho, DUM/IG US, DPP, exames de imagem e CI. O **laudo** e os
  **termos** mantêm o ano com 4 dígitos (DD/MM/AAAA), como nos modelos. O
  Pré-Parto não muda (usa o formatador compartilhado de `gestational-age`).

### PSGO — Imprimir termos de consentimento

- Botão **"Termos"** na admissão do PSGO gera, em um documento (papel timbrado
  UFTM · SUS · HUBRASIL, uma folha por termo), os 4 termos do modelo do HC-UFTM:
  **Apêndice B** (anestesia e sedação), **Apêndice C** (procedimentos invasivos
  e cirurgias), **parto normal/cesariana** e **indução do trabalho de parto**.
- Só o **NOME e o RG** (da paciente) e a **DATA** (do momento da impressão) são
  preenchidos; o restante é o texto fixo do termo, com os campos de assinatura em
  branco. Novo módulo puro `@/core/psgo/termos`; timbre repetido em toda página
  (via `thead`).
- O botão virou um menu com **"Imprimir tudo"** e **"Tudo exceto indução"**, e
  passou a aparecer também na **página da paciente** (não só na edição da
  admissão). Mais espaço para as assinaturas nos termos de parto e indução.

### PSGO — Alta e exclusão de admissão

- Nova ação **Dar alta** (desfecho "alta"): o prontuário **fica salvo por 24h**
  e depois é **excluído automaticamente**. A limpeza é feita ao abrir o board
  (`purgeExpiredDischarges`, best-effort — sem cron/Supabase). As altas
  recentes aparecem numa seção própria com o aviso da retenção, e há **Reabrir**
  para desfazer a alta dentro das 24h.
- Nova ação **Excluir admissão** (com confirmação) que apaga a paciente e o
  prontuário de imediato. Card "Alta e exclusão" na página da paciente.
- **Sem alteração de schema**: usa colunas já existentes (`status`, `outcome`,
  `discharge_time`); nenhuma migração do Supabase é necessária.

### PSGO — Imprimir laudo da CTG

- Cada CTG do PSGO ganha o botão **"Imprimir laudo"**, que gera o laudo no
  **modelo em papel timbrado do HC-UFTM** (UFTM · SUS · HUBRASIL) e abre o
  diálogo de impressão. O impresso traz o cabeçalho (nome, RG, data, hora e
  **HD** — reaproveitada do prontuário), o quadro de pontuação com as caixas
  marcadas e os pontos por parâmetro (escore `@/core/ctg/scoring`), estímulos,
  conclusão (feto ativo/hipoativo/inativo pelo escore + reativo/etc.),
  observações, conduta e equipe de plantão.
- Novo `@/core/ctg/laudo` (montagem do HTML autocontido, pura/testável) e
  `@/lib/print` (impressão via `<iframe>` isolado, sem pop-up). A HD virou o
  helper reaproveitável `psgoHd` em `@/core/psgo/render`. Logotipos em
  `public/laudo`. A **equipe de plantão** sai na última linha da folha.
- A CTG ganhou o campo **estímulo mecânico** (realizado/não + nº), espelhando
  o estímulo sonoro — no card, no prontuário e no laudo.
- A CTG ganhou uma **conduta (CD) própria** (caixa de texto no card) que
  preenche o "QUE ORIENTA:" do laudo; em branco, sai vazia na exportação.
- A **HD** ganhou uma seção editável no PSGO (`form.hd`): em branco usa a HD
  automática (`psgoHd`); preenchida, sobrepõe-se a ela no prontuário e no laudo.
  Há um botão "Preencher com a automática" para editar a partir da sugestão.

### Biometria — Percentil do DBP (Hadlock)

- **DBP (BPD)** ganha percentil por IG (Hadlock 1984: média cm = −3,08 + 0,41·IG
  − 0,000061·IG³, DP 0,30 cm), portado do "Fetal Biometry 5.0" (Perinatology.com)
  — mesma referência já usada para PESO/CA. Exibido no quadro de USG e no
  prontuário. **CCN não foi implementado**: o arquivo enviado não contém
  referência de CRL (pendente de fonte).

### FMF — Percentil da TN e do IP da artéria uterina

- Novos módulos `@/core/fmf/nt` (TN pelo CCN, modelo de mistura FMF; CRL
  45–84 mm) e `@/core/fmf/uterine` (IP da a. uterina por IG, log10-gaussiana
  FMF; IG > 20 sem), portados **verbatim** do `_fmf.min.js` oficial.
- No quadro de **USG** do PSGO: a **TN** ganha percentil (a partir do CCN) e
  há um novo campo **IP da a. uterina** com percentil. Ambos saem no prontuário.

### Plataforma — Equipe de plantão na página inicial

- A **Equipe de plantão** saiu do Pré-Parto e passou para a **página inicial**,
  pois vale para toda a plataforma. O armazenamento (localStorage) virou um
  módulo compartilhado (`@/lib/shift-team`) e o card, um componente
  compartilhado (`@/components/shift-team-card`). O prontuário do **PSGO** passa
  a trazer a **equipe de plantão ao final** do texto.

### PSGO — Exame físico e ginecológico revisados

- **Exame físico**: Temp e FR são **omitidos** do texto quando não preenchidos;
  ao marcar uma seção como **Alterado**, o texto padrão é **mantido na caixa**
  para edição (em vez de esvaziar).
- **Abdome**: no prontuário, **"GRAVÍDICO"** vem logo após "ABD:". Dinâmica agora
  é **"DU AUSENTE"** e, se **presente**, abre campo para descrever a dinâmica.
- **Toque vaginal**: toque realizado é **sempre autorizado** (removida a
  confirmação; a frase permanece no prontuário). Descrição reordenada para
  **apagamento, posição, consistência, dilatação, apresentação, altura, bolsa e
  sangue**; a dilatação lista **OEI/OEEA/OII/1–10 cm** (sem botões alternativos).
  Nova característica **Dor ao toque** (Indolor / à mobilização do colo / à
  palpação de anexos).
- **Exame especular**: sangramento **pelo OE** permite especificar **espontâneo
  ou à valsalva**; "Saídas via colo" vira **"Perdas líquidas via colo"** (com
  **líquido meconial** e tipo espontânea/à valsalva); **AmniSure** (grafia
  corrigida); **Secreção** com opções Ausente/Fisiológica/Aderida à parede/Em
  fórnice posterior e, se patológica, detalha **odor, grumos e cor**.
- Listas suspensas do toque com **largura reduzida** ao conteúdo; demais listas
  suspensas **padronizadas** (~ largura de um campo de data).
- **Exames de imagem (USG)**: novos campos **CCN, DBP, TN e osso nasal**, com
  aviso de que nem todos os aspectos constam no mesmo US.
- Campos numéricos aceitam **vírgula ou ponto** como separador decimal
  (peso, altura, biometria/Doppler do USG).
- **Coombs indireto** vira pílula dividida com a data na mesma linha;
  **medicamento** escolhido tem rótulo editável; **Normal/Alterado** do exame
  físico viram pílula dividida; **botão LabFlow** adota o teal da marca.
- **CTG**: horário de realização e **múltiplas CTGs**; se nenhuma for feita, é
  omitida do prontuário. **CTG** e **Conduta** em cards separados.

### PSGO — Chegada, revisão dirigida e ajustes de UI da HPMA

- **Chegada** com 3 modos: **Demanda espontânea**, **Ambulância** e
  **Encaminhamento com carta**. Na carta, abrem-se campos para **quem encaminhou**
  e **motivo** ("…COM CARTA DE ENCAMINHAMENTO POR X DEVIDO A Y…").
- **Acompanhante**: a frase de chegada agora cita **pessoa e parentesco**
  (ex.: "…ACOMPANHADA DE PAULO (IRMÃO)."), reaproveitando os campos da
  identificação.
- **Revisão dirigida** na prévia lista os **achados alterados primeiro** e os
  normais depois.
- **Sangramento 1ª M**: removida a IG. **Sangramento 2ª M** e **Perda de
  líquido**: removidas contrações e IG.
- **Controles segmentados** (ex.: Chegada) viram uma **pílula dividida em partes
  iguais**, no lugar de botões quadrados soltos; os rótulos ficam em **uma única
  linha** (a pílula se estende e os campos ao lado se reorganizam).
- Cabeçalho **"QP/HD"** renomeado para **"Gerador de HPMA"**, com subtítulo
  ("Possível selecionar vários. É possível escrever/editar manualmente em HPMA
  (edição final)").
- **HPMA (edição final)**: a caixa de texto **cresce com o conteúdo** (altura
  automática, sem rolagem interna).

### PSGO — HPMA com botões Sim/Não e prévia justificada

- Perguntas de presença/ausência na HPMA agora usam botões **Sim/Não** no lugar
  de "Refere/Nega" e "Associa/Não associa". O texto montado preserva o verbo
  clínico (Sim → "Refere"/"Associa"/"Relata"; Não → "Nega"/"Não associa"), então
  o sentido do HPMA não muda. Botões descritivos e não binários (ex.: quantidade,
  cor, "Fez/Não fez") ficam como estavam.
- **Prévia** e **HPMA (edição final)** passam a exibir o texto **justificado**.

### PSGO — HPMAs padronizadas (v2) e paridade simples

- **Paridade** volta ao modelo simples (em calibração): sem gemelaridade e com
  **abortos fora de P** (P = N+C+F). Ex.: `G5P3(N1C2A1)`.
- **HPMA** reescrita com motor de nós (condicionais, multisseleção e split
  positivo/negativo). O texto sai **em MAIÚSCULAS já na prévia**.
  - **Frase de chegada** em toda HPMA: "PACIENTE COMPARECE AO PSGO,
    ACOMPANHADA/DESACOMPANHADA" ou, se **ambulância**, "ENCAMINHADA… VINDO DE X"
    (novo controle de chegada + origem).
  - **2ª QP em diante** começa com "RELATA AINDA …".
  - Modelos revisados de GECA, Febre, Dor em BV, Dengue, Síndrome gripal, Náusea
    e vômitos, Redução da MF, Fase ativa/Pródromos de TP e Pico hipertensivo,
    com campos condicionais e listas de sintomas multisseleção; Dengue e Pico
    escrevem os sintomas escolhidos e negam os demais.
  - Novas QPs: **Sangramento 1ª M**, **Sangramento 2ª M**, **Disúria** e
    **Perda de líquido** (substituem o "Sangramento TV").
  - **Revisão dirigida**: omite a pergunta coberta pela QP; se tudo normal,
    escreve a frase combinada ("NEGA SANGRAMENTO TRANSVAGINAL E CORRIMENTO…").
    Secreção renomeada; hábito intestinal com nº de evacuações; urinário e
    contrações com sub-campos.
  - **Todas as HPMAs em modo formulário**: cada QP agora aparece como uma grade
    de campos rotulados (2 colunas), no lugar do texto para completar inline —
    rótulos claros (ex.: "Evacuações diarreicas por dia") e campos de número
    mais estreitos. O resultado continua sendo o texto montado em MAIÚSCULAS.

- **Montador de HPMA** na seção Queixa e história: botões de **QP/HD cumulativos**
  (GECA, Febre, Dor em baixo ventre, Dengue, Síndrome gripal, Náusea e vômitos,
  Redução da MF, Fase ativa de TP, Pródromos de TP, Pico hipertensivo,
  Sangramento TV — os três de TP/MF só aparecem para gestantes).
- Cada QP abre um **modelo com preenchimento inline**: lacunas (`___`) viram
  campos de texto e escolhas (`[a/b/c]`) viram botões; o que não é respondido
  fica marcado no texto para completar depois.
- **Revisão dirigida** com 6 perguntas sempre respondidas (Sangramento,
  Secreção/perda de líquido, Hábito intestinal, Hábito urinário e — só gestante
  — Contrações e Movimentação fetal), que montam a frase de negativos/positivos.
- **Prévia ao vivo** + botão **"Usar no HPMA"** que insere o texto montado na
  caixa de HPMA, que permanece editável para a finalização.
- Conteúdo dos 11 modelos conforme validado pela equipe (texto de apoio à
  documentação, não conduta).

### PSGO — exame especular revisado e CTG laudada

- **Exame especular** reestruturado:
  - **Sangramento**: Ausente / Pelo OE / De parede vaginal; se ≠ ausente, pede a
    quantidade (Pequena / Moderada / Grande).
  - **Secreção** (era "conteúdo vaginal") em multisseleção: Ausente, Fisiológica,
    Bolhoso, Esverdeado, Purulento, Fétido (Ausente é exclusivo).
  - **Saídas via colo**: Ausente / Líquido claro / Purulento; se ≠ ausente,
    aparecem **Amniosure** e **cristalização** (Não realizado / Positivo /
    Negativo) — "Não realizado" não vai ao prontuário.
- **CTG laudada** como no pré-parto: laudo estruturado (linha de base,
  variabilidade, acelerações, AT/MF, movimentação, desacelerações + tipo/nº,
  contrações, estímulo sonoro) com **escore 0-5** ao vivo e conclusão sugerida;
  vai ao prontuário na linha `CTG:`.

### PSGO — Coombs múltiplos, toque revisado e integração Labflow

- **Coombs (CI)**: agora é possível registrar vários CI, cada um com sua data
  (botão "+ CI"); saem no prontuário como `CI: NEGATIVO EM … / POSITIVO EM …`.
- **Toque vaginal** revisado: **posição** Posterior (P) / Médio-Posterior (MP) /
  Centralizado (C); **consistência** Nasal (N) / Nasolabial (NL) / Labial (L);
  **apagamento** vira lista suspensa de 10 em 10 (Grosso→`G`, demais→`APAG X%`);
  **dilatação** e **altura (De Lee)** viram listas suspensas; opção **OEEA/OII**
  (cumulativas) que substituem a dilatação em cm.
- **Hábitos**: adicionados **Erro alimentar** e **Sedentarismo**; ao marcar
  **UDI**, um campo pergunta qual(is) droga(s) — registrado como `UDI (…)`.
- **Botão "Acessar Labflow"** (visual moderno, nova aba → labflowai.vercel.app)
  em "Colar sorologias do hospital" e em "Exames laboratoriais".
- **VDRL**: a lista suspensa passou a ter largura equivalente aos botões das
  demais sorologias.
- **Medicamentos**: lógica revisada — chave **Em uso / Fez uso** por item e
  campo para adicionar medicamento avulso (Enter ou botão).
- **Início do TP** rotulado como **"Início do TP (Atual ou predição)"**.

### PSGO — cards colapsáveis, datação e sorologias

- **Cards colapsáveis**: cada seção do formulário vira um card recolhível (clique
  no cabeçalho), preservando ações/badges (toggle gestante, InfoTip, botões).
- **Datação numa linha**: DUM (campo estreito), caixa **"DUM incerta"** (rótulo
  simplificado) e a chave de datação ficam lado a lado; as chaves **nº de fetos ·
  apresentação · início do TP** também na mesma linha. Botão **"ir aos USGs"** no
  card de IG pela USG (rola até o quadro de imagem).
- **DUM no prontuário**: quando "DUM incerta", a data é suprimida e sai
  `DUM: INCERTA`; quando a datação efetiva vem da USG (por escolha ou pelo ACOG),
  a linha ganha ` - DISCORDANTE`.
- **Medicamentos**: no prontuário, os de uso saem um por linha em `MEU:`; havendo
  medicamentos prévios, pula uma linha e lista sob `FEZ USO:`. Novo campo livre
  "Fez uso" (omitido se vazio).
- **Hábitos**: `NEGA` é exclusivo dos demais (cumulativos entre si); `ÁLCOOL`
  renomeado para `ALCOOLISMO`.
- **Sorologias**: botões `—/NR/REAG` no mesmo formato do exame físico; **VDRL**
  vira lista suspensa (NR e titulações 1:1…1:256).

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
