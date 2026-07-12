/**
 * Termos de consentimento da admissão do PSGO (HC-UFTM), prontos para
 * impressão — mesmo papel timbrado do laudo (UFTM · SUS · HUBRASIL). Reúne, em
 * um único documento (uma folha por termo), os 4 termos do modelo:
 *   1. Apêndice B — Anestesia e sedação
 *   2. Apêndice C — Procedimentos invasivos e cirurgias
 *   3. Consentimento para parto normal ou cesariana
 *   4. Consentimento para indução do trabalho de parto
 *
 * Só o cabeçalho (NOME, RG e DATA) é preenchido com os dados da paciente; o
 * restante é o texto fixo do termo, com os campos de assinatura em branco para
 * preenchimento manual. Ver `@/lib/print` para a impressão.
 */
import { DEFAULT_LETTERHEAD, type LaudoLetterhead } from "@/core/ctg/laudo";

export interface TermosData {
  name: string;
  rg: string;
  /** Data já formatada para exibição (ex.: "11/07/2026"). */
  date: string;
}

function esc(s: string): string {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

function letterhead(lh: LaudoLetterhead): string {
  return `<div class="letterhead">
    <img class="lh-sus" src="${esc(lh.sus)}" alt="SUS" />
    <img class="lh-uftm" src="${esc(lh.uftm)}" alt="UFTM" />
    <img class="lh-hubrasil" src="${esc(lh.hubrasil)}" alt="HUBRASIL" />
  </div>`;
}

/**
 * Envolve um termo numa tabela cujo cabeçalho (timbre) se repete em toda página
 * que o termo ocupar — `thead` é reimpresso a cada quebra de página.
 */
function frame(lh: LaudoLetterhead, content: string): string {
  return `<table class="termo"><thead><tr><td>${letterhead(lh)}</td></tr></thead><tbody><tr><td>${content}</td></tr></tbody></table>`;
}

function nomeRg(d: TermosData): string {
  return `<p class="idf"><b>Nome:</b> ${esc(d.name)}</p>
    <p class="idf"><b>RG:</b> ${esc(d.rg)}</p>`;
}

/** Quadro de assinaturas do paciente/responsável (Apêndices B e C). */
function sigTable(date: string): string {
  return `<table class="sig"><tbody>
    <tr>
      <td class="sig-main" colspan="2">
        <span class="ck"></span> <b>Paciente</b>&ndash; Assinatura usual do paciente: <span class="ln ln-lg"></span>
      </td>
      <td class="sig-side" rowspan="2">
        <div>Uberaba</div>
        <div class="sig-data">DATA: ${esc(date)}</div>
      </td>
    </tr>
    <tr>
      <td class="sig-aplic"><b>Aplicável se responsável</b></td>
      <td class="sig-resp">
        <div><span class="ck"></span> <b>Responsável</b></div>
        <div><b>Nome:</b><span class="ln"></span></div>
        <div><b>Assinatura:</b><span class="ln"></span> Doc.</div>
        <div><b>Identidade nº:</b><span class="ln"></span></div>
        <div><b>Grau de Parentesco:</b><span class="ln"></span></div>
      </td>
    </tr>
  </tbody></table>`;
}

/** Bloco "Preenchido pelo médico" (Apêndice B). */
function medicoBox(): string {
  return `<div class="medico-box">
    <p><b>Preenchido pelo médico:</b></p>
    <p class="just">Expliquei de forma clara e objetiva todo o procedimento, exame, tratamento e/ou cirurgia ao paciente acima identificado e/ou seu responsável, assim como os benefícios, riscos e alternativas, tendo respondido às perguntas formuladas pelos mesmos. De acordo com o meu entendimento, o paciente e/ou seu responsável está (ão) em condições de compreender o que lhes foi informado e de determinar de acordo com o entendimento que possui.</p>
    <p>Nome:<span class="ln"></span></p>
    <p>Assinatura:<span class="ln"></span></p>
    <p>CRM:<span class="ln"></span></p>
    <p class="carimbo">nome e CRM podem ser substituídos pelo carimbo legível</p>
  </div>`;
}

/** Rodapé de assinaturas dos termos de parto e indução. */
function consentFooter(date: string): string {
  return `<p class="center mt-lg">UBERABA, ${esc(date)}</p>
    <table class="two-sign"><tbody><tr>
      <td>
        <div class="sign-line"></div>
        <div class="center b">Assinatura do Paciente</div>
      </td>
      <td>
        <div class="sign-line"></div>
        <div class="center b">Assinatura do Responsável pelo Paciente</div>
        <div class="center small">Quando o paciente for menor de idade, ou que tenha responsável legal, ou não possa assinar este documento.</div>
      </td>
    </tr></tbody></table>
    <p class="sign-gap">Eu, Dr(a).:<span class="ln ln-lg"></span>, CRM<span class="ln"></span>, declaro que coletei este consentimento, informando previamente os riscos e esclarecendo eventuais dúvidas ao paciente/responsável.</p>
    <div class="center sign-gap">
      <div class="sign-line sign-center"></div>
      <div class="b">Médico(a) &ndash; Assinatura</div>
    </div>`;
}

/** Apêndice B — Anestesia e sedação. */
function termoAnestesia(d: TermosData, lh: LaudoLetterhead): string {
  return frame(
    lh,
    `<h2 class="apendice">APÊNDICE B</h2>
    <h1 class="titulo">TERMO DE ESCLARECIMENTO, CIÊNCIA E CONSENTIMENTO (CONSENTIMENTO INFORMADO) PARA ANESTESIA E SEDAÇÃO</h1>
    ${nomeRg(d)}
    <p class="just">Autorizo o médico anestesiologista (abaixo identificado) ou outro médico cadastrado no Hospital de Clínicas da Universidade Federal do Triângulo Mineiro, a realizar a seguinte técnica anestésica ou sedação: <b>ANALGESIA / SEDAÇÃO / RAQUIANESTESIA</b> para realização da (o) seguinte cirurgia/procedimento proposta(o) no paciente acima citado: <b>CESARIANA</b>. A proposta do procedimento anestésico/ sedação acima especificada, seus benefícios, riscos, complicações potenciais, alternativas e analgesia pós-operatória/procedimento me foram explicados claramente. Tive a oportunidade de esclarecer todas as dúvidas de forma satisfatória e entendo que não existe garantia absoluta sobre os resultados a serem obtidos, mas que serão utilizados todos os recursos, medicamentos e equipamentos disponíveis no Hospital para ser alcançado/obtido o melhor resultado. Também estou ciente de que podem ocorrer complicações durante o procedimento, assim como pode ser necessária a modificação da proposta inicial da anestesia em virtude de situações imprevistas.</p>
    <p class="just">Declaro que recebi as explicações, li, compreendi e concordo com o exposto acima e que me foi dada a oportunidade de questões que julgo importantes.</p>
    <p class="preenchido"><b>Preenchido pelo paciente ou responsável:</b></p>
    ${sigTable(d.date)}
    ${medicoBox()}`,
  );
}

/** Apêndice C — Procedimentos invasivos e cirurgias. */
function termoProcedimentos(d: TermosData, lh: LaudoLetterhead): string {
  return frame(
    lh,
    `<h2 class="apendice">APÊNDICE C</h2>
    <h1 class="titulo">TERMO DE ESCLARECIMENTO, CIÊNCIA E CONSENTIMENTO (CONSENTIMENTO INFORMADO) PARA PROCEDIMENTOS INVASIVOS E CIRURGIAS</h1>
    ${nomeRg(d)}
    <p class="just">Autorizo a realização do(s) seguintes (s) procedimentos(s) invasivos e/ou cirurgia(s) no paciente (acima citado): <b>ANALGESIA / SEDAÇÃO / RAQUIANESTESIA</b>. No caso de envolver lateralidade, especificar: ( ) Direito, ( ) Esquerdo, ( ) Bilateral indicado pelo médico(a)/cirurgião(ã) Dr.(a) (abaixo identificado), após ter sido informado(a) do resultado das avaliações e exames, que revelaram as seguintes alterações e/ou diagnóstico(s) <b>CESARIANA</b>:</p>
    <ol class="items">
      <li>Recebi explicações claras sobre as alternativas de tratamento, riscos, benefícios e complicações potenciais.</li>
      <li>Autorizo qualquer outro procedimento, exame, tratamento, <b>incluindo transfusão sanguínea</b> e/ou cirurgia que sejam necessários em decorrência de situações imprevistas e necessitem de cuidados diferentes daqueles inicialmente propostos.</li>
      <li><b>Autorizo a divulgação das informações médicas contidas em meu prontuário, exclusivamente para finalidade científica da Instituição, desde que minha identidade permaneça anônima.</b></li>
      <li>Autorizo que qualquer órgão ou tecido removido cirurgicamente durante o procedimento realizado seja encaminhado para exames complementares, desde que necessário para o esclarecimento diagnóstico e terapêutico, <b>bem como para propósitos científicos ou educacionais.</b></li>
      <li>Autorizo a realização de filmagens/fotografias e, caso necessário, a veiculação das referidas imagens para fins científicos. Estou ciente também, que tais procedimentos serão realizados por profissionais indicados pelo(a) meu(minha) médico(a)/cirurgião(ã), <b>sem qualquer ônus financeiro, presente ou futuro, assegurando o pleno sigilo de minha identidade.</b></li>
      <li><b>Apesar de ter entendido as explicações que me foram prestadas, de terem sido esclarecidas as dúvidas e estando plenamente satisfeito(a) com as informações recebidas, reservo-me o direito de revogar este consentimento antes que o(s) procedimento(s), objeto deste documento, se realize(m).</b></li>
      <li><b>Estou ciente que posso solicitar esclarecimentos das dúvidas que possam surgir em qualquer fase do tratamento.</b></li>
      <li><b>Estou ciente de que, no momento da alta, deverei estar acompanhado por uma pessoa adulta.</b></li>
      <li>Declaro que recebi as explicações, li, compreendi e concordo com o exposto acima e que me foi dada a oportunidade para anular (itens 3 e 5).</li>
    </ol>
    <p class="preenchido"><b>Preenchido pelo paciente ou responsável:</b></p>
    ${sigTable(d.date)}`,
  );
}

/** Consentimento para parto normal ou cesariana. */
function termoParto(d: TermosData, lh: LaudoLetterhead): string {
  return frame(
    lh,
    `<h1 class="titulo mt">TERMO DE CONSENTIMENTO INFORMADO PARA REALIZAÇÃO DE PARTO NORMAL OU CESARIANA SE NECESSÁRIO</h1>
    ${nomeRg(d)}
    <p class="just">Eu, na condição de paciente ou de seu responsável, estando no pleno gozo de minhas faculdades mentais, consinto que seja realizado na minha pessoa o procedimento de assistência ao trabalho de parto e parto normal.</p>
    <p><b>Declaro ter sido informada que:</b></p>
    <p class="just">1- Quanto ao tipo de parto: o nascimento pode ocorrer, na maioria das vezes por parto normal através do qual o bebê sai do útero, passa pelo canal vaginal e pela vulva atingindo a parte exterior do corpo e que existe a opção de nascimento através de cesárea (ou cesariana), que é um procedimento cirúrgico que inclui incisão abdominal para a retirada do bebê do útero materno.</p>
    <p class="just">2- Quanto ao trabalho de parto: caracteriza-se por contrações uterinas regulares, progressivas, que podem ser dolorosas e que levam a dilatação do colo uterino associados ou não a rotura espontânea das membranas ovulares e perduram até o nascimento do bebê (tempo estimado: 12 a 18 horas. Durante todo esse tempo poderei contar com a presença de um acompanhante de minha livre escolha, inclusive no momento do parto, poderei me movimentar e escolher posições que me pareçam mais confortáveis e que poderei ingerir líquidos (de preferência soluções isotônicas) e dieta leve, salvo prescrição médica em contrário ou proximidade da realização de anestesia. Estou ciente que para avaliar a minha condição e a do bebê, a equipe médica terá a necessidade de realizar avaliações periódicas do batimento cardíaco fetal (ausculta intermitente pro estetoscópio/sonar ou através de registro de cardiotocografia), da dinâmica uterina (número e características da contração uterina), coloração do líquido amniótico, da dilatação do colo uterino através do toque vaginal (menos frequente no início e necessária com o avançar do trabalho de parto) além dos sinais vitais maternos (pressão arterial, pulso, frequência respiratória).</p>
    <p class="just">Fui informada que durante o trabalho de parto, pode haver necessidade de realização de alguma intervenção, a partir da avaliação do médico obstetra, com a finalidade de preservar as condições ideais de nascimento para a mãe e o bebê, como: uso de substâncias (ocitocina) para coordenar as contrações uterinas; alívio da dor não farmacológico (massagens, técnicas de relaxamento, entre outras, a depender da existência de profissional habilitado) ou farmacológico (analgesia e/ou anestesia locorregional), de indicação e responsabilidade exclusiva do médico anestesista assim como a amniotomia (rotura artificial da bolsa das águas). Estou ciente que serei esclarecida quanto a necessidade de realização destas intervenções no momento de sua realização durante o trabalho de parto.</p>
    <p class="just">Fui informada que, em situações especiais, determinadas pela equipe de assistência, o trabalho de parto necessitará ser desencadeado artificialmente pela administração de ocitocina via endovenosa, em gotejamento contínuo ou pela administração de medicação via vaginal, ou outro método disponível, desta forma, até que se obtenha o número de contrações previstas no item 2 (trabalho de parto) poderá demandar muitas horas.</p>
    <p class="just">3- Quanto ao parto por via vaginal: durante o período expulsivo (momento em que ocorre a passagem do bebê pela vagina e sua saída pela vulva) poderá ser necessária, a realização, a critério do médico assistente, da episiotomia, que é um corte na minha vagina e vulva para ajudar na saída do bebê em casos de sofrimento fetal, fetos prematuros, fetos avaliados como macrossômicos (acima de 4.000g) ou ameaça de laceração de terceiro grau (quando atinge o esfíncter do ânus). Estima-se que a necessidade da episiotomia gira em torno de 10 a 15% dos partos. A incidência de lacerações perineais quando não se realiza a episiotomia é de cerca de 5 a 25%, podendo ser de primeiro até terceiro graus. O médico também poderá utilizar um instrumento chamado fórceps ou vácuo-extrator, que irá ajudar no nascimento da cabeça do bebê, caso seja necessário para evitar o sofrimento fetal. O uso destes instrumentos pode, eventualmente,deixar &ldquo;marcas&rdquo; na face e crânio do recém-nascido, porém são transitórias e não causam sequelas, na quase totalidade dos casos</p>
    <p class="just">Os riscos mais comuns do parto normal são hemorragia, infecção, lesões da bexiga, reto, ânus, esfíncteres interno e externo, incontinência urinária (dificuldade de controlar a urina) e/ou fecal, prolapso uterino e &ldquo;queda&rdquo; da bexiga e ou do reto (saída da bexiga, reto ou do útero pela vagina), atonia uterina (perda de tônus muscular do útero, que não contrai após o parto), fratura da clavícula ou intercorrência/sequela pelo uso de fórcipe no bebê, sendo excepcional a ocorrência óbito.</p>
    <p class="just">As possíveis complicações descritas a longo prazo, são discreta perda urinária involuntária que se resolve espontaneamente, na grande maioria dos casos e sensação de alargamento ou frouxidão do canal vaginal de graus variados relacionados fatores individuais como grau de elasticidade das paredes além do peso do recém-nascido.</p>
    <p class="just">4- Quanto à necessidade de realização de cesárea: em qualquer momento durante o trabalho de parto, poderá ser necessária a conversão em cesárea, por indicação médica, no caso de intercorrências que levam a risco de vida da mãe e/ou da criança. Neste caso, os médicos farão um corte na parede abdominal para a retirada do bebê. Esta incisão causará uma cicatriz visível que poderá ser, de forma mais comum, transversal ou raramente, longitudinal, dependendo da indicação médica decorrente dos riscos e da urgência do momento e que os resultados estéticos estarão diretamente ligados às características individuais. No caso de realização de cesariana, poderá ser submetida a realização também ao uso de eletrocautério, estando eu ciente sobre suas complicações e riscos de queimadura, mesmo após conferência de placa e umidade, visto um dispositivo elétrico, não sendo responsabilidade médica a conferência da sua validade.</p>
    <p class="just">Confirmo que recebi explicações, li, compreendi e concordo com os itens acima referidos e apesar de ter entendido as explicações que me foram prestadas, de terem sido esclarecidas todas as dúvidas e estando plenamente satisfeito (a) com as informações recebidas RESERVO-ME o direito de revogar este consentimento antes que o procedimento, objeto deste documento, se realize.</p>
    ${consentFooter(d.date)}`,
  );
}

/** Consentimento para indução do trabalho de parto. */
function termoInducao(d: TermosData, lh: LaudoLetterhead): string {
  return frame(
    lh,
    `<h1 class="titulo mt">TERMO DE CONSENTIMENTO INFORMADO PARA INDUÇÃO DO TRABALHO DE PARTO</h1>
    ${nomeRg(d)}
    <p class="just">Eu, na condição de paciente ou de seu responsável, estando no pleno gozo de minhas faculdades mentais, DECLARO que:</p>
    <ol class="items">
      <li>AUTORIZO o médico acima identificado e demais profissionais vinculados ao seu atendimento, a realizar o procedimento de INDUÇÃO AO TRABALHO DE PARTO.</li>
      <li>Este procedimento me foi explicado de forma clara pelo médico acima identificado, tendo sido orientada quanto a sua conveniência e indicação, aos seus benefícios, riscos, complicações potenciais e alternativas possíveis, tendo podido fazer perguntas que foram respondidas satisfatoriamente, inclusive quanto aos benefícios e/ou riscos de não ser tomada nenhuma atitude diante do diagnóstico atual.</li>
      <li>Estou ciente de que a indução do parto consiste na utilização de medicamentos (Misoprostol e/ou Ocitocina) e/ou procedimentos (Amniotomia / uso de sonda Foley no colo uterino preparando-o para indução) para desencadear as contrações uterinas e a dilatação do colo uterino, com objetivo de iniciar o trabalho de parto.</li>
      <li>Fui esclarecido que a realização da Indução do Parto se deve as circunstâncias atuais da minha gestação, em vista de que, nesse caso, a espera pelo desencadeamento espontâneo do trabalho de parto presumir um maior risco (aumento de morbidade e mortalidade para a mãe e/ou para o feto). Assim, é a Indução do Parto a alternativa que oferece menores riscos para meu futuro filho e/ou para mim.</li>
      <li>Estou ciente de que a escolha dos medicamentos e/ou procedimentos para realizar a Indução do Parto será feita visando os melhores benefícios e os menores riscos para mim e meu bebê e podem, a qualquer momento, serem modificados, conforme o julgamento técnico do médico assistente.</li>
      <li>Fui informada que a Indução do Trabalho de Parto é um procedimento que demanda um tempo previamente indeterminado, e que pode ser frustrada, ou seja, não ocorrer o trabalho de parto objetivado.</li>
      <li>Estou ciente que a Indução do Trabalho de Parto, mesmo que obtida com sucesso, não garante a ocorrência de um parto vaginal e que a qualquer momento durante a indução, podem ocorrer situações inesperadas, nas quais uma cesariana tenha que ser indicada em benefício meu ou do feto.</li>
      <li>Estou ciente de que a Indução do Parto não é um procedimento isento de riscos. Fui esclarecida(o) de que podem surgir complicações, sejam elas derivadas da própria gestação (hemorragia, descolamento da placenta, infecções, distúrbios da coagulação, âmnio e tromboembolias, perda da reatividade do feto, desproporção entre o feto e a pelve materna, falta de rotação interna da cabeça fetal, mal posicionamento do feto, dificuldade de liberação do ombro fetal &ndash; distocia de ombro, fratura de clavícula, aspiração de mecônio pelo feto), ou derivadas do procedimento (falta de contrações do útero, ruptura do útero, febre, infecções), entre outras mais raras e complexas, inclusive, o risco de ÓBITO do feto/bebê.</li>
      <li>Fui esclarecida(o) que, assim como no parto de início espontâneo, existe um risco excepcional de ÓBITO, derivado da própria gestação ou da situação vital da paciente que gerou a necessidade da Indução do Parto.</li>
      <li>Igualmente, fui informada(o) de que, assim como no parto espontâneo, em curto ou longo prazo, poderão existir problemas para a mãe, tais como: ruptura da vagina, inclusive com extensão para o ânus e/ou reto, distopias e prolapsos (descensos dos órgãos pélvicos), incontinência urinária e/ou incontinência fecal; e/ou para o seu filho, tais como: tocotraumatismos (lesões no feto provocadas pela passagem dificultada do bebê pela pelve materna), síndrome de aspiração de mecônio, encefalopatia isquêmico-hipóxica, morte neonatal.</li>
      <li>Fui esclarecida (o) de que, assim como no parto de início espontâneo, pode haver necessidade ou ser conveniente o uso de anestesia, que poderá ser local ou peridural, raquidiana ou, excepcionalmente, geral, realizadas pelo médico anestesiologista.</li>
      <li>Estou ciente de que, assim como no parto de início espontâneo, pode haver a necessidade de realização de episiotomia, que é uma pequena cirurgia (corte) feito na vagina, para facilitar a saída do feto.</li>
      <li>Fui esclarecida(o) que, assim como no parto de início espontâneo, pode haver a necessidade de utilização do fórcipe e/ou vácuo extrator, que são instrumentos que, colocados dentro da vagina imediatamente antes da saída do feto, têm o objetivo de extrair o feto do canal de parto, quando o mesmo não pode sair espontaneamente ou há risco para esperar que a sua saída ocorra espontaneamente.</li>
      <li>Estou ciente de que será necessária a atenção especializada do recém-nascido, que será realizada por médico pediatra.</li>
      <li>Estou ciente que o ato médico em questão trata-se de obrigação de meio, pelo que não há garantia de obtenção de cura ou do resultado esperado ou desejado. O(A) médico(a) explicou que em algumas circunstâncias podem ocorrer fatos bastante complicados e que todo procedimento, não importa qual, possui risco de ÓBITO da paciente ou do feto/recém nascido, independentemente da perícia, prudência ou vontade do médico. Fui informado e compreendi que a prática médica não é uma ciência exata, e que por isso não podem ser dadas quaisquer garantias, nem certezas quanto ao resultado do tratamento.</li>
      <li>Estou ciente de que devo cumprir integralmente as orientações médicas que me foram prescritas, e de que devo buscar imediatamente atendimento médico após a alta hospitalar, caso verifique a ocorrência de qualquer sintoma que seja diverso da normalidade, tais como, febre, sangramento, dor, tontura, dentre outros.</li>
      <li>Se a evolução do quadro de saúde apresentado colocar a vida da paciente em risco, estou ciente e autorizo a adoção dos procedimentos médicos e hospitalares recomendáveis, na tentativa de afastar o perigo de vida apurado, podendo suspender, modificar ou variar o ato médico.</li>
      <li>Por livre iniciativa autorizo que o(s) procedimento(s) seja(m) realizado(s) da forma como foi exposta no presente termo, inclusive quanto aos procedimentos necessários para tentar solucionar as situações imprevisíveis e emergenciais, as quais serão conduzidas de acordo com o julgamento técnico do médico acima autorizado e equipe, para que sejam alcançados os melhores resultados possíveis, através dos recursos conhecidos da Medicina disponíveis no local.</li>
      <li>Certifico que este termo me foi explicado e que o li, ou que foi lido para mim e que entendi o seu conteúdo, autorizando a realização do procedimento e assumindo os riscos inerentes ao ato.</li>
    </ol>
    ${consentFooter(d.date)}`,
  );
}

export interface TermosOptions {
  /** Inclui o termo de indução do trabalho de parto (padrão: true). */
  includeInducao?: boolean;
}

/** Monta o HTML autocontido com os termos (uma folha por termo). */
export function renderTermosHtml(
  d: TermosData,
  lh: LaudoLetterhead = DEFAULT_LETTERHEAD,
  options: TermosOptions = {},
): string {
  const includeInducao = options.includeInducao !== false;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Termos de consentimento — PSGO</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.3; color: #000; }
  table.termo { width: 100%; border-collapse: collapse; page-break-before: always; }
  table.termo:first-child { page-break-before: auto; }
  table.termo > thead > tr > td,
  table.termo > tbody > tr > td { border: 0; padding: 0; }
  .letterhead {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 0 4px 8px;
  }
  .letterhead img { width: auto; object-fit: contain; }
  .lh-sus { height: 40px; }
  .lh-uftm { height: 46px; }
  .lh-hubrasil { height: 42px; }
  h2.apendice { text-align: center; font-size: 11pt; margin: 6px 0 8px; }
  h1.titulo { text-align: center; font-size: 11.5pt; margin: 0 0 12px; }
  h1.titulo.mt { margin-top: 14px; }
  .idf { margin: 2px 0; }
  p { margin: 6px 0; }
  .just { text-align: justify; }
  .preenchido { margin-top: 12px; }
  .center { text-align: center; }
  .small { font-size: 8.5pt; font-weight: normal; }
  .b { font-weight: bold; }
  .mt-lg { margin-top: 22px; }
  /* Espaço maior para as assinaturas (caber a firma acima da linha). */
  .sign-gap { margin-top: 58px; }
  ol.items { margin: 6px 0; padding-left: 22px; }
  ol.items > li { margin: 5px 0; text-align: justify; }
  .ln { display: inline-block; min-width: 130px; border-bottom: 1px solid #000; }
  .ln-lg { min-width: 240px; }
  .ck { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; vertical-align: middle; margin-right: 3px; }
  table.sig { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.sig td { border: 1px solid #000; padding: 7px 8px; vertical-align: top; }
  .sig-main { }
  .sig-aplic { width: 16%; font-size: 9.5pt; vertical-align: middle; }
  .sig-resp > div { margin: 3px 0; }
  .sig-side { width: 24%; text-align: center; vertical-align: top; }
  .sig-data { margin-top: 34px; }
  .medico-box { border: 1px solid #000; padding: 7px 9px; margin-top: 8px; }
  .medico-box p { margin: 4px 0; }
  .carimbo { text-align: right; font-size: 8pt; }
  table.two-sign { width: 100%; margin-top: 72px; border-collapse: collapse; }
  table.two-sign td { width: 50%; padding: 0 14px; vertical-align: top; }
  .sign-line { border-top: 1px solid #000; margin: 0 auto 4px; }
  .sign-center { width: 60%; }
</style>
</head>
<body>
  ${termoAnestesia(d, lh)}
  ${termoProcedimentos(d, lh)}
  ${termoParto(d, lh)}
  ${includeInducao ? termoInducao(d, lh) : ""}
</body>
</html>`;
}
