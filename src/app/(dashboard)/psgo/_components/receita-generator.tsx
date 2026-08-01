"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Printer, AlertTriangle, Eraser, Search, Check, FileDown } from "lucide-react";
import {
  emptyPrescricaoItem,
  renderReceita,
  buildPosologia,
  medicamentoLabel,
  TIPO_RECEITA_OPTIONS,
  TIPO_FREQUENCIA_OPTIONS,
  MEDIDA_TEMPO_OPTIONS,
  MOMENTO_OPTIONS,
  REFEICAO_OPTIONS,
  VIA_OPTIONS,
  UNIDADE_DOSE_OPTIONS,
  TURNO_OPTIONS,
  type PrescricaoItem,
  type ReceitaHeader,
  type TipoReceita,
  type TipoFrequencia,
  type MedidaTempo,
  type MomentoRefeicao,
} from "@/core/psgo/prescricao";
import { controleInfo } from "@/core/psgo/receita-controle";
import { gestacao } from "@/core/psgo/gestacao";
import { lactancia } from "@/core/psgo/lactancia";
import {
  hospitalDiaItems,
  hospitalDiaGrupos,
  buildHospitalDiaPrintHtml,
} from "@/core/psgo/hospital-dia";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/copy-button";
import { searchMeds, type MedCatmat } from "@/core/psgo/medicamentos-catmat";
import { receitaSheetsHtml, RECEITA_PRINT_STYLE } from "@/core/psgo/receita-print";
import { printHtml, isMobile } from "@/lib/print";
import { registrarPrescricaoNaAdmissao } from "@/app/(dashboard)/ferramentas/receita/actions";
import { letterheadFor } from "@/core/ctg/laudo";
import {
  RECEITA_TEMPLATES,
  RECEITA_CATEGORIAS,
  applyTemplateItems,
  buildSifilisPenicilina,
} from "@/core/psgo/receita-templates";
import {
  receitaDocsSheetsHtml,
  renderCombinedPrint,
  RECEITA_DOCS_STYLE,
  RECEITA_DOC_LABEL,
  type ReceitaDocId,
  type RelatorioData,
} from "@/core/psgo/receita-relatorios";

/** Paciente do sistema para preenchimento automático. */
export interface PacienteLite {
  id: string;
  name: string;
  medicalRecordNumber?: string | null;
  age?: number | null;
  /** IG atual (semanas/dias) calculada do prontuário — preenche o campo IG. */
  ga?: string | null;
}

const selectCls =
  "flex h-9 w-full max-w-[11rem] rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Busca de medicamento por proximidade ao nome (CATMAT): o item mais próximo do
 * termo aparece no topo (não a ordem alfabética de todas as apresentações).
 */
function MedCombobox({ onPick }: { onPick: (m: MedCatmat) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchMeds(q, 40), [q]);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (m: MedCatmat) => {
    onPick(m);
    setQ("");
    setOpen(false);
    setHi(0);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          value={q}
          placeholder="digite o nome do medicamento…"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onFocus={() => q.trim() && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHi((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHi((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(results[hi]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-background shadow-md">
          {results.map((m, i) => (
            <li key={`${m.pa}|${m.conc}|${m.forma}`}>
              <button
                type="button"
                onMouseEnter={() => setHi(i)}
                onClick={() => choose(m)}
                className={`block w-full px-2.5 py-1.5 text-left text-sm ${i === hi ? "bg-muted" : ""}`}
              >
                <span className="font-medium">{m.pa}</span>
                {m.conc ? <span className="text-muted-foreground"> {m.conc}</span> : null}
                <span className="text-muted-foreground"> · {m.forma}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-xs text-muted-foreground shadow-md">
          Nenhum medicamento encontrado. Você pode preencher manualmente abaixo.
        </div>
      )}
    </div>
  );
}

export function ReceitaGenerator({
  today,
  patients = [],
  admissionPatientId,
}: {
  today: string;
  patients?: PacienteLite[];
  /** Quando aberto a partir de uma admissão do PSGO: prefixa a paciente e
   *  registra "- PRESCREVO: ..." no prontuário ao gerar a receita. */
  admissionPatientId?: string;
}) {
  const [header, setHeader] = useState<ReceitaHeader>({
    paciente: "",
    prontuario: "",
    idade: "",
    endereco: "",
    cidade: "Uberaba-MG",
    data: today,
    mostrarData: true,
    gestante: false,
    lactante: false,
  });
  const [items, setItems] = useState<PrescricaoItem[]>([emptyPrescricaoItem(uid())]);
  // Modelo por situação (opcional): preenche os itens; documentos são opcionais.
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");
  const [selectedDocs, setSelectedDocs] = useState<ReceitaDocId[]>([]);
  const [parceiroNome, setParceiroNome] = useState("");
  const [ig, setIg] = useState(""); // idade gestacional (auto nos relatórios)
  const [numDoses, setNumDoses] = useState("1"); // sífilis: 1 ou 3 doses
  // Seleção do que imprimir (impressão única e combinada).
  const [printReceita, setPrintReceita] = useState(true);
  const [printParceiro, setPrintParceiro] = useState(false);
  // Nº de folhas (vias) impressas por grupamento do Hospital Dia (H1, H2…).
  const [hdCopiasPorGrupo, setHdCopiasPorGrupo] = useState<Record<number, number>>({});
  // No mobile a impressão do navegador é instável — oferecemos o download em PDF.
  const [mobile, setMobile] = useState(false);
  useEffect(() => setMobile(isMobile()), []);
  const activeTemplate = useMemo(
    () => RECEITA_TEMPLATES.find((t) => t.id === activeTemplateId),
    [activeTemplateId],
  );

  const setH = (patch: Partial<ReceitaHeader>) => setHeader((h) => ({ ...h, ...patch }));
  const addItem = () =>
    setItems((s) => [...s, emptyPrescricaoItem(uid(), s[s.length - 1]?.tipoReceita ?? "COMUM")]);
  const removeItem = (id: string) => setItems((s) => s.filter((i) => i.id !== id));
  const setItem = (id: string, patch: Partial<PrescricaoItem>) =>
    setItems((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  // Limpa os dados do medicamento (mantém o item na lista).
  const clearItem = (id: string) =>
    setItems((s) => s.map((i) => (i.id === id ? emptyPrescricaoItem(i.id) : i)));
  const toggleTurno = (id: string, value: string) =>
    setItems((s) =>
      s.map((i) =>
        i.id === id
          ? {
              ...i,
              turnos: i.turnos.includes(value)
                ? i.turnos.filter((t) => t !== value)
                : [...i.turnos, value],
            }
          : i,
      ),
    );
  const setTurnoDose = (id: string, turno: string, dose: string) =>
    setItems((s) =>
      s.map((i) =>
        i.id === id ? { ...i, turnoDoses: { ...i.turnoDoses, [turno]: dose } } : i,
      ),
    );
  const toggleRefeicao = (id: string, value: string) =>
    setItems((s) =>
      s.map((i) =>
        i.id === id
          ? {
              ...i,
              refeicoes: i.refeicoes.includes(value)
                ? i.refeicoes.filter((r) => r !== value)
                : [...i.refeicoes, value],
            }
          : i,
      ),
    );

  // Aplica um modelo por situação: substitui os itens (todos ficam editáveis).
  const applyTemplate = (id: string) => {
    const tpl = RECEITA_TEMPLATES.find((t) => t.id === id);
    setActiveTemplateId(tpl ? id : "");
    setSelectedDocs([]);
    setParceiroNome("");
    setPrintReceita(true);
    setPrintParceiro(false);
    if (!tpl) return;
    const tItems = id === "sifilis" ? [buildSifilisPenicilina(numDoses)] : tpl.items;
    setItems(applyTemplateItems(tItems, uid));
  };
  const toggleDoc = (doc: ReceitaDocId) =>
    setSelectedDocs((s) => (s.includes(doc) ? s.filter((d) => d !== doc) : [...s, doc]));

  // Sífilis: muda o nº de doses e reflete na prescrição (item da penicilina).
  const changeNumDoses = (n: string) => {
    setNumDoses(n);
    if (activeTemplateId === "sifilis") {
      setItems((s) =>
        s.map((it) =>
          it.principioAtivo.includes("Penicilina")
            ? { ...emptyPrescricaoItem(it.id), ...buildSifilisPenicilina(n) }
            : it,
        ),
      );
    }
  };

  // Preenche o cabeçalho com os dados de uma paciente do sistema. Gestante/
  // lactante ligam os alertas de segurança na prescrição automaticamente.
  const fillFromPatient = (id: string) => {
    const p = patients.find((x) => x.id === id);
    if (!p) return;
    setH({
      paciente: p.name ?? "",
      prontuario: p.medicalRecordNumber ?? "",
      idade: p.age != null ? `${p.age} anos` : "",
      gestante: !!p.ga || header.gestante, // paciente com IG do prontuário → gestante
    });
    if (p.ga) setIg(p.ga); // IG do prontuário (paciente já admitida)
  };

  // Preenche o medicamento a partir da lista e sugere o tipo de receita (ANVISA).
  const pickMed = (id: string, m: MedCatmat) => {
    const info = controleInfo(m.pa);
    setItem(id, {
      principioAtivo: m.pa,
      concentracao: m.conc,
      formaFarmaceutica: m.forma,
      via: m.via,
      unidadeDose: m.unidade,
      ...(info.tipoReceita ? { tipoReceita: info.tipoReceita } : {}),
    });
  };

  // Itens da receita comum: exclui os bloqueados (exigem notificação de receita).
  const printableItems = useMemo(
    () => items.filter((it) => !controleInfo(it.principioAtivo).bloqueado),
    [items],
  );
  const blockedItems = useMemo(
    () => items.filter((it) => controleInfo(it.principioAtivo).bloqueado),
    [items],
  );
  // Itens que efetivamente entram na receita: imprimíveis e que NÃO são do
  // Hospital Dia (esses saem na folha própria de prescrição).
  const receitaItems = useMemo(
    () => printableItems.filter((it) => !it.hospitalDia),
    [printableItems],
  );
  const text = useMemo(() => renderReceita(header, receitaItems), [header, receitaItems]);

  // Itens marcados para a Folha de Prescrição do Hospital Dia (com conteúdo).
  const hdItems = useMemo(() => hospitalDiaItems(items), [items]);
  const hdGrupos = useMemo(() => hospitalDiaGrupos(hdItems), [hdItems]);

  // Vindo de uma admissão do PSGO: preenche a paciente automaticamente (1x).
  const filledRef = useRef(false);
  useEffect(() => {
    if (admissionPatientId && !filledRef.current && patients.some((p) => p.id === admissionPatientId)) {
      fillFromPatient(admissionPatientId);
      filledRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissionPatientId, patients]);

  // "Em jejum" e "ao deitar" são tomadas únicas: se a frequência passar a ter
  // mais de uma dose/dia, limpa o momento incompatível.
  useEffect(() => {
    setItems((s) => {
      let changed = false;
      const next = s.map((it) => {
        if ((it.momento === "JEJUM" || it.momento === "AO_DEITAR") && isMultiDaily(it)) {
          changed = true;
          return { ...it, momento: "" as MomentoRefeicao, momentoMinutos: "", refeicoes: [] };
        }
        return it;
      });
      return changed ? next : s;
    });
  }, [items]);

  // "PRESCREVO: ..." com os medicamentos prescritos, incluindo posologia e
  // quantidade (ex.: "Amoxicilina 500 mg — Cápsula: 1 cápsula, via oral, a cada
  // 8 horas, por 7 dias (21 cápsulas)").
  const medsLine = useMemo(
    () =>
      items
        .map((it) => {
          const nome = medicamentoLabel(it);
          const pos = buildPosologia(it);
          const qtd = it.quantidadeReceitada.trim();
          const base = [nome, pos].filter(Boolean).join(": ");
          if (!base) return "";
          return qtd ? `${base} (${qtd})` : base;
        })
        .filter(Boolean)
        .join("; "),
    [items],
  );

  // Registra a prescrição na admissão (linha "- PRESCREVO: ..." no prontuário).
  const [registrado, setRegistrado] = useState(false);
  const registrar = () => {
    if (!admissionPatientId || !medsLine.trim()) return;
    registrarPrescricaoNaAdmissao(admissionPatientId, medsLine).then((r) => {
      if (!r.error) setRegistrado(true);
    });
  };

  // Dados dos documentos (IG e nº de doses preenchidos automaticamente).
  const relatorioData = (over?: Partial<RelatorioData>): RelatorioData => ({
    paciente: header.paciente,
    prontuario: header.prontuario,
    idade: header.idade,
    cidade: header.cidade,
    dataBR: header.data ? new Date(`${header.data}T00:00:00`).toLocaleDateString("pt-BR") : "",
    ig,
    numDoses,
    ...over,
  });
  const origin = () => (typeof window !== "undefined" ? window.location.origin : "");

  // Impressão única e combinada, agrupada na ordem paciente → parceiro.
  const handleImprimir = () => {
    const lh = letterheadFor(origin());
    const blocks: { style: string; sheets: string }[] = [];
    // --- Paciente ---
    if (printReceita && receitaItems.length)
      blocks.push({ style: RECEITA_PRINT_STYLE, sheets: receitaSheetsHtml(header, receitaItems) });
    if (selectedDocs.length)
      blocks.push({
        style: RECEITA_DOCS_STYLE,
        sheets: receitaDocsSheetsHtml(selectedDocs, relatorioData(), lh),
      });
    // --- Parceiro ---
    if (printParceiro && activeTemplate?.parceiro) {
      const nome = parceiroNome.trim() || `Parceiro de ${header.paciente.trim()}`.trim();
      const parceiroHeader: ReceitaHeader = { ...header, paciente: nome, prontuario: "", idade: "" };
      const pItems =
        activeTemplate.id === "sifilis"
          ? [buildSifilisPenicilina(numDoses)]
          : activeTemplate.parceiro.items;
      blocks.push({
        style: RECEITA_PRINT_STYLE,
        sheets: receitaSheetsHtml(parceiroHeader, applyTemplateItems(pItems, uid)),
      });
      const pdocs = activeTemplate.parceiro.documentos ?? [];
      if (pdocs.length)
        blocks.push({
          style: RECEITA_DOCS_STYLE,
          sheets: receitaDocsSheetsHtml(
            pdocs,
            relatorioData({ paciente: nome, prontuario: "", idade: "" }),
            lh,
          ),
        });
    }
    if (!blocks.length) return;
    registrar();
    printHtml(renderCombinedPrint(blocks));
  };

  // Folha de Prescrição do Hospital Dia (HC-UFTM) — impressão/PDF próprios.
  const handleHospitalDia = () => {
    if (!hdItems.length) return;
    registrar();
    printHtml(buildHospitalDiaPrintHtml(header, hdItems, hdCopiasPorGrupo));
  };
  const handleHospitalDiaPdf = async () => {
    if (!hdItems.length) return;
    registrar();
    const mod = await import("@/core/psgo/hospital-dia-pdf");
    mod.downloadHospitalDiaPdf(header, hdItems, hdCopiasPorGrupo);
  };

  return (
    <div className="space-y-4">
      {/* Aviso (as ações de impressão ficam no card "Impressão", ao final) */}
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Apoio à documentação — valide medicamento, dose e posologia. O tipo de receituário é
        sugerido automaticamente (ANVISA 344/98 e RDC 471/2021) e pode ser ajustado.
      </p>

      {admissionPatientId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-accent/50 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {registrado ? (
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <Check className="h-4 w-4" /> Prescrição registrada na admissão.
              </span>
            ) : (
              <>
                Prescrevendo para a admissão de <strong>{header.paciente || "—"}</strong>. Ao imprimir,
                a linha <strong>“- PRESCREVO: …”</strong> é registrada no prontuário.
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            {!registrado && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={registrar}
                disabled={!medsLine.trim()}
              >
                Registrar na admissão
              </Button>
            )}
            <Link
              href={`/psgo/${admissionPatientId}`}
              className={buttonVariants({ variant: registrado ? "default" : "ghost", size: "sm" })}
            >
              Voltar à admissão
            </Link>
          </div>
        </div>
      )}

      {blockedItems.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {blockedItems.length === 1 ? "1 medicamento exige" : `${blockedItems.length} medicamentos exigem`}{" "}
            <strong>Notificação de Receita</strong> (A/amarela ou B/azul) e{" "}
            <strong>não pode ser impresso por aqui</strong> (proibido por lei — use o formulário
            oficial numerado). Os demais itens seguem para a impressão normalmente.
          </span>
        </div>
      )}

      {/* Identificação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {patients.length > 0 && (
            <Field label="Preencher com paciente (opcional)" className="col-span-2 sm:col-span-4">
              <select
                className={`${selectCls} max-w-none`}
                defaultValue=""
                onChange={(e) => fillFromPatient(e.target.value)}
              >
                <option value="">— selecione uma paciente do PSGO —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.medicalRecordNumber ? ` · ${p.medicalRecordNumber}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Opcional — você também pode digitar os dados manualmente nos campos abaixo.
              </p>
            </Field>
          )}
          <Field label="Paciente" className="col-span-2">
            <Input value={header.paciente} onChange={(e) => setH({ paciente: e.target.value })} />
          </Field>
          <Field label="Prontuário/RG">
            <Input value={header.prontuario} onChange={(e) => setH({ prontuario: e.target.value })} />
          </Field>
          <Field label="Idade">
            <Input value={header.idade} onChange={(e) => setH({ idade: e.target.value })} />
          </Field>
          <Field label="Endereço (opcional)" className="col-span-2 sm:col-span-4">
            <Input
              value={header.endereco}
              onChange={(e) => setH({ endereco: e.target.value })}
              placeholder="opcional — usado no receituário de controle especial"
            />
          </Field>
          <Field label="Cidade">
            <Input value={header.cidade} onChange={(e) => setH({ cidade: e.target.value })} />
          </Field>
          <Field label="Data">
            <Input type="date" value={header.data} onChange={(e) => setH({ data: e.target.value })} />
          </Field>
          <Field label="Idade gestacional (IG)">
            <Input
              value={ig}
              onChange={(e) => setIg(e.target.value)}
              placeholder="auto do prontuário — editável"
            />
          </Field>
          <div className="col-span-2 flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 sm:col-span-4">
            <button
              type="button"
              role="switch"
              aria-checked={header.gestante}
              onClick={() => setH({ gestante: !header.gestante })}
              className="flex items-center gap-2 text-sm focus-visible:outline-none"
            >
              <Switch checked={header.gestante} />
              <span>Gestante</span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={header.lactante}
              onClick={() => setH({ lactante: !header.lactante })}
              className="flex items-center gap-2 text-sm focus-visible:outline-none"
            >
              <Switch checked={header.lactante} />
              <span>Lactante</span>
            </button>
            {header.gestante && (
              <span className="text-[11px] text-muted-foreground">
                Mostra a categoria de risco na gestação (TGA/Austrália; FDA como reserva) em cada
                medicamento.
              </span>
            )}
            {header.lactante && (
              <span className="text-[11px] text-muted-foreground">
                Mostra o risco na amamentação (e-lactancia.org) em cada medicamento.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modelo por situação (opcional) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modelo por situação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Escolha um modelo — preenche os medicamentos (todos editáveis)">
            <select
              className={`${selectCls} max-w-none`}
              value={activeTemplateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">— nenhum (prescrição manual) —</option>
              {RECEITA_CATEGORIAS.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {RECEITA_TEMPLATES.filter((t) => t.categoria === cat).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              {activeTemplate?.descricao ??
                "Aplicar um modelo substitui os medicamentos abaixo — que continuam editáveis."}
            </p>
          </Field>

          {activeTemplateId === "sifilis" && (
            <Field label="Nº de doses (afeta a receita da paciente e do parceiro)">
              <select
                className={selectCls}
                value={numDoses}
                onChange={(e) => changeNumDoses(e.target.value)}
              >
                <option value="1">Dose única</option>
                <option value="3">3 doses (1 por semana)</option>
              </select>
            </Field>
          )}
        </CardContent>
      </Card>

      {/* Itens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">Medicamentos</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-4 w-4" /> Medicamento
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {header.gestante && (
            <ClassLegend
              titulo="Risco na gestação — categorias"
              fonte="Fonte: TGA (Austrália), com FDA como reserva. Apoio à decisão — validar (bula/Anvisa)."
              entradas={GEST_LEGEND}
            />
          )}
          {header.lactante && (
            <ClassLegend
              titulo="Risco na amamentação — níveis"
              fonte="Fonte: e-lactancia.org. Apoio à decisão — validar (bula)."
              entradas={LACT_LEGEND}
            />
          )}
          {items.map((it, idx) => {
            const info = controleInfo(it.principioAtivo);
            const hasMed =
              it.principioAtivo.trim() ||
              it.concentracao.trim() ||
              it.formaFarmaceutica.trim() ||
              it.posologiaManual.trim();
            return (
              <div
                key={it.id}
                className={`space-y-3 rounded-md border p-3 ${info.bloqueado ? "border-amber-300 bg-amber-50/50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{idx + 1}º medicamento</span>
                    {it.principioAtivo.trim() && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          info.bloqueado
                            ? "bg-amber-200 text-amber-900"
                            : info.classe === "ESPECIAL"
                              ? "bg-blue-100 text-blue-800"
                              : info.classe === "ANTIMICROBIANO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {info.label}
                      </span>
                    )}
                    {header.gestante && it.principioAtivo.trim() && (
                      <GestacaoBadge pa={it.principioAtivo} />
                    )}
                    {header.lactante && it.principioAtivo.trim() && (
                      <LactacaoBadge pa={it.principioAtivo} />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {hasMed && (
                      <button
                        type="button"
                        onClick={() => clearItem(it.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        title="Limpar dados deste medicamento"
                      >
                        <Eraser className="h-3.5 w-3.5" /> Limpar
                      </button>
                    )}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-destructive"
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {info.bloqueado && (
                  <p className="flex items-start gap-1.5 text-[11px] text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {info.aviso}
                  </p>
                )}

                {/* Tipo de receita (sugerido pela classificação; editável) */}
                {!info.bloqueado && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Receita:</span>
                    {TIPO_RECEITA_OPTIONS.map((t) => (
                      <Chip
                        key={t.value}
                        active={it.tipoReceita === t.value}
                        onClick={() => setItem(it.id, { tipoReceita: t.value as TipoReceita })}
                      >
                        {t.label}
                      </Chip>
                    ))}
                  </div>
                )}

                {/* Hospital Dia: inclui este item na Folha de Prescrição (HC-UFTM) */}
                <div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={it.hospitalDia}
                    onClick={() =>
                      setItem(
                        it.id,
                        it.hospitalDia
                          ? { hospitalDia: false }
                          : // Ao marcar H. dia, a frequência vira "dose única" por padrão
                            { hospitalDia: true, tipoFrequencia: "UNICA" },
                      )
                    }
                    className="flex items-center gap-2 text-sm focus-visible:outline-none"
                  >
                    <Switch checked={it.hospitalDia} />
                    <span className="text-muted-foreground">Prescrição do Hospital Dia</span>
                  </button>
                  {it.hospitalDia && (
                    <p className="mt-1 pl-[3.25rem] text-[11px] text-muted-foreground">
                      Sai na Folha do Hospital Dia (dose individual, não o esquema completo).
                    </p>
                  )}
                </div>

                {/* Busca na lista CATMAT (preenche princípio/concentração/forma) */}
                <Field label="Buscar medicamento (lista CATMAT)">
                  <MedCombobox onPick={(m) => pickMed(it.id, m)} />
                </Field>

                {/* Medicamento */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Princípio ativo" className="col-span-2">
                    <Input
                      value={it.principioAtivo}
                      onChange={(e) => setItem(it.id, { principioAtivo: e.target.value })}
                    />
                  </Field>
                  <Field label="Concentração">
                    <Input
                      value={it.concentracao}
                      onChange={(e) => setItem(it.id, { concentracao: e.target.value })}
                    />
                  </Field>
                  <Field label="Forma farmac.">
                    <Input
                      value={it.formaFarmaceutica}
                      onChange={(e) => setItem(it.id, { formaFarmaceutica: e.target.value })}
                    />
                  </Field>
                </div>

                {/* Registro: estruturado ou manual */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Posologia:</span>
                  <Chip active={!it.registroManual} onClick={() => setItem(it.id, { registroManual: false })}>
                    Estruturada
                  </Chip>
                  <Chip active={it.registroManual} onClick={() => setItem(it.id, { registroManual: true })}>
                    Texto livre
                  </Chip>
                </div>

                {it.registroManual ? (
                  <Field label="Posologia (livre)">
                    <Textarea
                      rows={2}
                      value={it.posologiaManual}
                      onChange={(e) => setItem(it.id, { posologiaManual: e.target.value })}
                      placeholder="ex.: 1 comprimido, via oral, de 8/8h, por 7 dias"
                    />
                  </Field>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Dose">
                      <Input
                        value={it.qtDose}
                        onChange={(e) => setItem(it.id, { qtDose: e.target.value })}
                        inputMode="decimal"
                      />
                    </Field>
                    <Field label="Unidade">
                      <select
                        className={selectCls}
                        value={it.unidadeDose}
                        onChange={(e) => setItem(it.id, { unidadeDose: e.target.value })}
                      >
                        {UNIDADE_DOSE_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.value}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Via">
                      <select
                        className={selectCls}
                        value={it.via}
                        onChange={(e) => setItem(it.id, { via: e.target.value })}
                      >
                        {VIA_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Frequência">
                      <select
                        className={selectCls}
                        value={it.tipoFrequencia}
                        onChange={(e) =>
                          setItem(it.id, { tipoFrequencia: e.target.value as TipoFrequencia })
                        }
                      >
                        {TIPO_FREQUENCIA_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {it.tipoFrequencia === "INTERVALO" && (
                      <Field label="A cada (horas)">
                        <Input
                          value={it.intervaloHoras}
                          onChange={(e) => setItem(it.id, { intervaloHoras: e.target.value })}
                          inputMode="numeric"
                        />
                      </Field>
                    )}
                    {it.tipoFrequencia === "INTERVALO_DIAS" && (
                      <Field label="A cada (dias)">
                        <Input
                          value={it.intervaloHoras}
                          onChange={(e) => setItem(it.id, { intervaloHoras: e.target.value })}
                          inputMode="numeric"
                        />
                      </Field>
                    )}
                    {it.tipoFrequencia === "FREQUENCIA" && (
                      <Field label="Vezes ao dia">
                        <Input
                          value={it.vezesAoDia}
                          onChange={(e) => setItem(it.id, { vezesAoDia: e.target.value })}
                          inputMode="numeric"
                        />
                      </Field>
                    )}
                    {it.tipoFrequencia === "TURNO" && (
                      <div className="col-span-2 space-y-2 sm:col-span-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Turnos</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {TURNO_OPTIONS.map((t) => (
                              <Chip
                                key={t.value}
                                active={it.turnos.includes(t.value)}
                                onClick={() => toggleTurno(it.id, t.value)}
                              >
                                {t.value}
                              </Chip>
                            ))}
                          </div>
                        </div>
                        {it.turnos.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Dose por turno (opcional — deixe em branco para usar a dose acima)
                            </Label>
                            <div className="flex flex-wrap gap-3">
                              {TURNO_OPTIONS.filter((t) => it.turnos.includes(t.value)).map((t) => (
                                <div key={t.value} className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground">{t.value}:</span>
                                  <Input
                                    className="h-8 w-20"
                                    value={it.turnoDoses[t.value] ?? ""}
                                    onChange={(e) => setTurnoDose(it.id, t.value, e.target.value)}
                                    inputMode="decimal"
                                    placeholder="dose"
                                  />
                                </div>
                              ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              As doses por turno aparecem na própria posologia.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {it.tipoFrequencia !== "UNICA" && (
                      <div className="col-span-2 flex items-center gap-2 self-end pb-1 text-sm sm:col-span-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={it.usoContinuo}
                          onClick={() => setItem(it.id, { usoContinuo: !it.usoContinuo })}
                          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Switch checked={it.usoContinuo} />
                        </button>
                        <span>Uso contínuo (sem duração definida)</span>
                      </div>
                    )}

                    {!it.usoContinuo && it.tipoFrequencia !== "UNICA" && (
                      <>
                        <Field label="Duração">
                          <Input
                            value={it.duracaoQt}
                            onChange={(e) => setItem(it.id, { duracaoQt: e.target.value })}
                            inputMode="numeric"
                          />
                        </Field>
                        <Field label="Período">
                          <select
                            className={selectCls}
                            value={it.duracaoUnidade}
                            onChange={(e) =>
                              setItem(it.id, { duracaoUnidade: e.target.value as MedidaTempo })
                            }
                          >
                            {MEDIDA_TEMPO_OPTIONS.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </>
                    )}

                    <Field label="Momento">
                      <select
                        className={selectCls}
                        value={it.momento}
                        onChange={(e) => setItem(it.id, { momento: e.target.value as MomentoRefeicao })}
                      >
                        {MOMENTO_OPTIONS.map((m) => {
                          // Jejum / ao deitar são tomadas únicas: indisponíveis
                          // quando a frequência tem mais de uma dose/dia.
                          const soUnicaDiaria = m.value === "JEJUM" || m.value === "AO_DEITAR";
                          return (
                            <option
                              key={m.value}
                              value={m.value}
                              disabled={soUnicaDiaria && isMultiDaily(it)}
                            >
                              {m.label}
                            </option>
                          );
                        })}
                      </select>
                    </Field>

                    {(it.momento === "JEJUM" ||
                      it.momento === "PREPRANDIAL" ||
                      it.momento === "POSPRANDIAL") && (
                      <Field label="Minutos (opcional)">
                        <Input
                          value={it.momentoMinutos}
                          onChange={(e) => setItem(it.id, { momentoMinutos: e.target.value })}
                          inputMode="numeric"
                          placeholder={
                            it.momento === "JEJUM"
                              ? "ex.: 30 (antes de comer)"
                              : it.momento === "POSPRANDIAL"
                                ? "ex.: 30 (após)"
                                : "ex.: 30 (antes)"
                          }
                        />
                      </Field>
                    )}

                    {(it.momento === "PREPRANDIAL" || it.momento === "POSPRANDIAL") && (
                      <div className="col-span-2 space-y-1 sm:col-span-4">
                        <Label className="text-xs text-muted-foreground">
                          Refeições (opcional — vazio = todas as refeições)
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {REFEICAO_OPTIONS.map((r) => (
                            <Chip
                              key={r.value}
                              active={it.refeicoes.includes(r.value)}
                              onClick={() => toggleRefeicao(it.id, r.value)}
                            >
                              {r.value}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fechamento do item */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Quantidade a dispensar">
                    <Input
                      value={it.quantidadeReceitada}
                      onChange={(e) => setItem(it.id, { quantidadeReceitada: e.target.value })}
                      placeholder="ex.: 20 comprimidos"
                    />
                  </Field>
                  <Field label="Recomendações">
                    <Input
                      value={it.recomendacoes}
                      onChange={(e) => setItem(it.id, { recomendacoes: e.target.value })}
                    />
                  </Field>
                </div>

                {/* Prévia da posologia deste item */}
                <p className="rounded bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                  {buildPreview(it)}
                </p>
              </div>
            );
          })}

          {/* Adicionar também abaixo do último medicamento */}
          <Button type="button" variant="outline" onClick={addItem} className="w-full">
            <Plus className="h-4 w-4" /> Adicionar medicamento
          </Button>
        </CardContent>
      </Card>

      {/* Impressão — marque o que imprimir; sai em uma única impressão combinada */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-center text-base">Impressão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-xs text-muted-foreground">
            Marque o que imprimir — sai em uma única impressão, agrupada na ordem paciente → parceiro.
          </p>

          {/* Paciente */}
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Paciente
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Chip active={printReceita} onClick={() => setPrintReceita((v) => !v)}>
                Receita
              </Chip>
              {activeTemplate?.documentos?.map((doc) => (
                <Chip key={doc} active={selectedDocs.includes(doc)} onClick={() => toggleDoc(doc)}>
                  {RECEITA_DOC_LABEL[doc]}
                </Chip>
              ))}
            </div>
          </div>

          {/* Parceiro */}
          {activeTemplate?.parceiro && (
            <div className="space-y-2 border-t pt-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Parceiro
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Chip active={printParceiro} onClick={() => setPrintParceiro((v) => !v)}>
                  Receita do parceiro
                </Chip>
              </div>
              {printParceiro && (
                <div className="mx-auto max-w-xs">
                  <Field label="Nome do parceiro (opcional)">
                    <Input
                      value={parceiroNome}
                      onChange={(e) => setParceiroNome(e.target.value)}
                      placeholder={
                        header.paciente ? `Parceiro de ${header.paciente}` : "nome do parceiro"
                      }
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* Datar a receita (cidade + data) */}
          <div className="flex justify-center border-t pt-4">
            <button
              type="button"
              role="switch"
              aria-checked={header.mostrarData}
              onClick={() => setH({ mostrarData: !header.mostrarData })}
              className="flex items-center gap-2 text-sm focus-visible:outline-none"
            >
              <Switch checked={header.mostrarData} />
              <span className="text-muted-foreground">Datar a receita (cidade e data)</span>
            </button>
          </div>

          {/* Ação única */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-t pt-4">
            <CopyButton text={text} />
            <Button type="button" onClick={handleImprimir}>
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
          </div>

          {/* Folha do Hospital Dia (HC-UFTM) — saída própria */}
          {hdItems.length > 0 && (
            <div className="space-y-2 border-t pt-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hospital Dia
              </p>
              <p className="text-[11px] text-muted-foreground">
                {hdItems.length} medicamento{hdItems.length === 1 ? "" : "s"} na Folha de Prescrição
                {hdGrupos.length > 1 ? ` · ${hdGrupos.length} grupos em folhas separadas` : ""}
              </p>
              {/* Nº de folhas (vias) por grupamento */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
                {hdGrupos.map((g) => (
                  <label
                    key={g.grupo}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <span className="font-medium">{g.sigla}</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={hdCopiasPorGrupo[g.grupo] ?? 1}
                      onChange={(e) =>
                        setHdCopiasPorGrupo((m) => ({
                          ...m,
                          [g.grupo]: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                        }))
                      }
                      title={`Nº de folhas do grupamento ${g.sigla}`}
                      className="h-8 w-12 rounded-md border border-input bg-background px-1 text-center text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {hdGrupos.length === 1 ? "folhas" : ""}
                  </label>
                ))}
              </div>
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={mobile ? handleHospitalDiaPdf : handleHospitalDia}
                >
                  {mobile ? <FileDown className="h-4 w-4" /> : <Printer className="h-4 w-4" />} Folha
                  H. dia
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Cores do selo por severidade (0 mais seguro → 5 contraindicado).
const SEV_BADGE_CLS = [
  "bg-emerald-100 text-emerald-800", // 0 · A
  "bg-green-100 text-green-800", // 1 · B1/B2/B
  "bg-lime-100 text-lime-800", // 2 · B3
  "bg-amber-100 text-amber-900", // 3 · C
  "bg-orange-100 text-orange-900", // 4 · D
  "bg-red-100 text-red-800", // 5 · X
];

/** Selo da categoria de risco na gestação (TGA, com FDA como reserva). */
function GestacaoBadge({ pa }: { pa: string }) {
  const r = gestacao(pa);
  if (!r) {
    return (
      <span
        title="Sem categoria de gestação (TGA/FDA) para este princípio ativo — validar na bula (nenhum sistema cobre todos os fármacos)."
        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
      >
        Gestação: sem classificação
      </span>
    );
  }
  const sys = r.sistema === "TGA" ? "TGA (Austrália)" : "FDA (descontinuada)";
  return (
    <span
      title={`${r.info.titulo} · ${sys}${r.combinacao ? " · associação (maior risco)" : ""}: ${r.info.desc} — apoio à decisão, validar.`}
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEV_BADGE_CLS[r.severidade]}`}
    >
      Gestação {r.categoria}
      <span className="ml-1 font-normal opacity-70">{r.sistema}</span>
    </span>
  );
}

// Selo de lactação (e-lactancia): cor e rótulo curto por nível (0 seguro → 3 evitar).
const LACT_BADGE_CLS = [
  "bg-emerald-100 text-emerald-800",
  "bg-lime-100 text-lime-800",
  "bg-orange-100 text-orange-900",
  "bg-red-100 text-red-800",
];
const LACT_LABEL = ["compatível", "risco baixo", "risco alto", "evitar"];

/** Selo do risco na amamentação (e-lactancia.org) do princípio ativo. */
function LactacaoBadge({ pa }: { pa: string }) {
  const r = lactancia(pa);
  if (!r) {
    return (
      <span
        title="Sem avaliação no e-lactancia.org para este princípio ativo — validar (não cobre todos os fármacos)."
        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
      >
        Lactação: sem avaliação
      </span>
    );
  }
  return (
    <span
      title={`${r.info.titulo} (nível ${r.nivel}) · e-lactancia${r.combinacao ? " · associação (maior risco)" : ""}: ${r.info.desc} — apoio à decisão, validar.`}
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${LACT_BADGE_CLS[r.nivel]}`}
    >
      Lactação: {LACT_LABEL[r.nivel]}
    </span>
  );
}

// Legendas sucintas das classificações (mostradas quando a chave está ligada).
const GEST_LEGEND = [
  { cat: "A", cls: SEV_BADGE_CLS[0], txt: "sem risco observado" },
  { cat: "B1/B2", cls: SEV_BADGE_CLS[1], txt: "dados limitados, sem dano" },
  { cat: "B3", cls: SEV_BADGE_CLS[2], txt: "dados limitados; dano em animais" },
  { cat: "C", cls: SEV_BADGE_CLS[3], txt: "efeitos reversíveis, sem malformação" },
  { cat: "D", cls: SEV_BADGE_CLS[4], txt: "risco de malformação/dano" },
  { cat: "X", cls: SEV_BADGE_CLS[5], txt: "contraindicado" },
];
const LACT_LEGEND = [
  { cat: "0", cls: LACT_BADGE_CLS[0], txt: "compatível (risco muito baixo)" },
  { cat: "1", cls: LACT_BADGE_CLS[1], txt: "risco baixo (provavelmente compatível)" },
  { cat: "2", cls: LACT_BADGE_CLS[2], txt: "risco alto (pouco seguro)" },
  { cat: "3", cls: LACT_BADGE_CLS[3], txt: "evitar (risco muito alto)" },
];

/** Quadro-legenda sucinto de uma classificação de risco. */
function ClassLegend({
  titulo,
  fonte,
  entradas,
}: {
  titulo: string;
  fonte: string;
  entradas: { cat: string; cls: string; txt: string }[];
}) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] leading-snug">
      <div className="mb-1 font-semibold text-foreground/80">{titulo}</div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {entradas.map((e) => (
          <span key={e.cat} className="inline-flex items-center gap-1">
            <span className={`rounded px-1 font-semibold ${e.cls}`}>{e.cat}</span>
            <span className="text-muted-foreground">{e.txt}</span>
          </span>
        ))}
      </div>
      <div className="mt-1 text-muted-foreground/70">{fonte}</div>
    </div>
  );
}

/**
 * Frequência com mais de uma dose por dia — incompatível com "em jejum" e "ao
 * deitar" (tomadas únicas no dia).
 */
function isMultiDaily(it: PrescricaoItem): boolean {
  switch (it.tipoFrequencia) {
    case "INTERVALO": {
      const h = parseFloat(it.intervaloHoras.replace(",", "."));
      return Number.isFinite(h) && h > 0 && h < 24;
    }
    case "FREQUENCIA": {
      const n = parseInt(it.vezesAoDia, 10);
      return Number.isFinite(n) && n > 1;
    }
    case "TURNO":
      return it.turnos.length > 1;
    default:
      return false;
  }
}

// Prévia curta da posologia de um item (usa o mesmo builder do core).
function buildPreview(it: PrescricaoItem): string {
  const med = medicamentoLabel(it);
  const pos = buildPosologia(it);
  if (!med && !pos) return "Comece pelo princípio ativo.";
  return [med, pos].filter(Boolean).join(" — ") || "—";
}
