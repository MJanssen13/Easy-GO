"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  CalendarClock,
  Keyboard,
  Loader2,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import type { Observation } from "@/core/patients/types";
import {
  COLUMN_INDEX,
  GROUP_LABELS,
  SHEET_COLUMNS,
  cellError,
  dateLabel,
  emptyValues,
  hasData,
  normalizeCell,
  observationToValues,
  parseClipboard,
  rowAlerts,
  rowChanged,
  rowDate,
  timeLabel,
  timeSlots,
  toClipboard,
  valuesToObservation,
  type ColumnGroup,
  type SheetColumn,
  type SheetRow,
} from "@/core/observations/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveObservationSheet, type SheetSaveInput } from "../sheet-actions";

/**
 * Planilha de aferições — lançar e editar em lote direto na plataforma, com a
 * movimentação e os atalhos do Google Planilhas (setas, Tab, Enter, F2,
 * Shift+setas, Ctrl+C/X/V com Excel/Sheets, Ctrl+Z/Y, Ctrl+D, Delete…).
 */

type Pos = { r: number; c: number };
type EditMode = "quick" | "full"; // quick = começou digitando (setas confirmam)

const ALL_GROUPS = Object.keys(GROUP_LABELS) as ColumnGroup[];
const GROUPS_KEY = "easygo.sheetGroups";
const EXAMINER_KEY = "easygo.lastExaminer";
const HISTORY_LIMIT = 100;

let ridSeq = 0;
const newRid = () => `r${Date.now().toString(36)}${(ridSeq++).toString(36)}`;

function fromObservations(observations: Observation[]): SheetRow[] {
  return [...observations]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((o) => {
      const values = observationToValues(o);
      return { rid: o.id, obsId: o.id, values, original: { ...values } };
    });
}

function blankRow(at?: Date, examiner = ""): SheetRow {
  const values = emptyValues();
  if (at) {
    values.date = dateLabel(at);
    values.time = timeLabel(at);
  }
  values.examiner = examiner;
  return { rid: newRid(), values };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Monta só no navegador: datas/horas no fuso do aparelho (sem divergência de hidratação). */
export function ObservationSheet(props: { patientId: string; observations: Observation[]; focusObsId?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border bg-white text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando planilha…
      </div>
    );
  return <SheetInner {...props} />;
}

function SheetInner({
  patientId,
  observations,
  focusObsId,
}: {
  patientId: string;
  observations: Observation[];
  focusObsId?: string;
}) {
  const [rows, setRowsRaw] = useState<SheetRow[]>(() => {
    const base = fromObservations(observations);
    return base.length ? base : [blankRow(nextHalfHour(new Date()))];
  });
  const [groups, setGroups] = useState<Set<ColumnGroup>>(new Set(ALL_GROUPS));
  const [active, setActive] = useState<Pos>({ r: 0, c: 0 });
  const [anchor, setAnchor] = useState<Pos>({ r: 0, c: 0 });
  const [edit, setEdit] = useState<{ value: string; mode: EditMode } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const undoStack = useRef<SheetRow[][]>([]);
  const redoStack = useRef<SheetRow[][]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const savedRef = useRef(false);
  const [, force] = useState(0);

  // Colunas visíveis (grupos lembrados no aparelho).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GROUPS_KEY);
      if (raw) setGroups(new Set(JSON.parse(raw) as ColumnGroup[]));
    } catch {
      // sem localStorage
    }
  }, []);
  const cols = useMemo(() => SHEET_COLUMNS.filter((c) => groups.has(c.group)), [groups]);
  const toggleGroup = (g: ColumnGroup) => {
    if (g === "registro") return;
    const next = new Set(groups);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    setGroups(next);
    try {
      window.localStorage.setItem(GROUPS_KEY, JSON.stringify([...next]));
    } catch {
      // sem localStorage
    }
    setActive((a) => ({ ...a, c: clamp(a.c, 0, SHEET_COLUMNS.filter((c) => next.has(c.group)).length - 1) }));
  };

  // Depois de salvar, a página revalida e traz as aferições do banco: recarrega.
  useEffect(() => {
    if (!savedRef.current) return;
    savedRef.current = false;
    const base = fromObservations(observations);
    setRowsRaw(base.length ? base : [blankRow(nextHalfHour(new Date()))]);
    undoStack.current = [];
    redoStack.current = [];
  }, [observations]);

  // Foco inicial: linha pedida (?editar=) ou primeira linha nova/última.
  useEffect(() => {
    const idx = focusObsId ? rows.findIndex((r) => r.obsId === focusObsId) : rows.length - 1;
    const r = Math.max(0, idx);
    setActive({ r, c: 2 });
    setAnchor({ r, c: 2 });
    gridRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() =>
      gridRef.current?.querySelector(`[data-row="${r}"]`)?.scrollIntoView({ block: "center" }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Muda as linhas guardando o estado anterior para desfazer. */
  const setRows = useCallback((fn: (prev: SheetRow[]) => SheetRow[]) => {
    setRowsRaw((prev) => {
      const next = fn(prev);
      if (next !== prev) {
        undoStack.current.push(prev);
        if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
        redoStack.current = [];
      }
      return next;
    });
  }, []);

  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setRowsRaw((cur) => {
      redoStack.current.push(cur);
      return prev;
    });
    force((n) => n + 1);
  };
  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    setRowsRaw((cur) => {
      undoStack.current.push(cur);
      return next;
    });
    force((n) => n + 1);
  };

  // ------------------------------ seleção ------------------------------
  const lastRow = rows.length - 1;
  const lastCol = cols.length - 1;
  const range = {
    r0: Math.min(anchor.r, active.r),
    r1: Math.max(anchor.r, active.r),
    c0: Math.min(anchor.c, active.c),
    c1: Math.max(anchor.c, active.c),
  };

  /** Move a célula ativa. `maxRow` cobre linhas recém-criadas (ainda não renderizadas). */
  const moveTo = (p: Pos, extend = false, maxRow = lastRow) => {
    const q = { r: clamp(p.r, 0, maxRow), c: clamp(p.c, 0, lastCol) };
    setActive(q);
    if (!extend) setAnchor(q);
    requestAnimationFrame(() => {
      const el = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${q.r}:${q.c}"]`);
      el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  // ------------------------------ edição ------------------------------
  const writeCells = (cells: { r: number; c: number; value: string }[]) => {
    if (cells.length === 0) return;
    const ref = new Date();
    setRows((prev) => {
      const next = prev.map((row) => ({ ...row, values: { ...row.values } }));
      for (const { r, c, value } of cells) {
        const col = cols[c];
        const row = next[r];
        if (!col || !row || row.deleted) continue;
        row.values[col.key] = normalizeCell(col, value, ref);
      }
      return next;
    });
  };

  const startEdit = (mode: EditMode, initial?: string) => {
    const row = rows[active.r];
    const col = cols[active.c];
    if (!row || !col || row.deleted) return;
    setAnchor(active);
    setEdit({ value: initial ?? row.values[col.key] ?? "", mode });
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  };

  // Evita confirmar duas vezes (Enter/Tab e depois o blur do input que some).
  const committing = useRef(false);
  const commitEdit = (move?: Pos) => {
    if (!edit || committing.current) return;
    committing.current = true;
    requestAnimationFrame(() => (committing.current = false));
    writeCells([{ r: active.r, c: active.c, value: edit.value }]);
    setEdit(null);
    gridRef.current?.focus({ preventScroll: true });
    if (move) moveTo(move);
  };
  const cancelEdit = () => {
    committing.current = true;
    requestAnimationFrame(() => (committing.current = false));
    setEdit(null);
    gridRef.current?.focus({ preventScroll: true });
  };

  // ------------------------------ linhas ------------------------------
  const examinerDefault = () => {
    try {
      return window.localStorage.getItem(EXAMINER_KEY) ?? "";
    } catch {
      return "";
    }
  };

  const nextTimeAfter = (r: number): Date => {
    for (let i = r; i >= 0; i--) {
      const d = rows[i] ? rowDate(rows[i]!.values) : null;
      if (d) return new Date(d.getTime() + 30 * 60000);
    }
    return nextHalfHour(new Date());
  };

  const insertRowBelow = (r = active.r) => {
    const row = blankRow(nextTimeAfter(r), examinerDefault());
    setRows((prev) => [...prev.slice(0, r + 1), row, ...prev.slice(r + 1)]);
    moveTo({ r: r + 1, c: Math.min(2, lastCol) }, false, lastRow + 1);
  };

  const appendRow = () => {
    const row = blankRow(nextTimeAfter(lastRow), examinerDefault());
    setRows((prev) => [...prev, row]);
    moveTo({ r: rows.length, c: active.c }, false, rows.length);
  };

  /** Exclui as linhas selecionadas: novas somem; salvas ficam marcadas até salvar. */
  const deleteRows = () => {
    const { r0, r1 } = range;
    setRows((prev) =>
      prev.flatMap((row, i) => {
        if (i < r0 || i > r1) return [row];
        if (!row.obsId) return [];
        return [{ ...row, deleted: !row.deleted }];
      }),
    );
    setAnchor({ r: r0, c: active.c });
    setActive({ r: Math.min(r0, Math.max(0, rows.length - 1 - (r1 - r0))), c: active.c });
  };

  const sortByTime = () =>
    setRows((prev) =>
      [...prev].sort((a, b) => (rowDate(a.values)?.getTime() ?? Infinity) - (rowDate(b.values)?.getTime() ?? Infinity)),
    );

  const generate = (from: Date, to: Date, step: number) => {
    const ex = examinerDefault();
    const existing = new Set(rows.map((r) => rowDate(r.values)?.getTime()).filter(Boolean));
    const fresh = timeSlots(from, to, step)
      .filter((d) => !existing.has(d.getTime()))
      .map((d) => blankRow(d, ex));
    if (fresh.length === 0) return;
    setRows((prev) =>
      [...prev.filter((r) => r.obsId || hasData(r.values)), ...fresh].sort(
        (a, b) => (rowDate(a.values)?.getTime() ?? Infinity) - (rowDate(b.values)?.getTime() ?? Infinity),
      ),
    );
    setShowGen(false);
  };

  // --------------------------- copiar / colar ---------------------------
  const selectionMatrix = () => {
    const m: string[][] = [];
    for (let r = range.r0; r <= range.r1; r++)
      m.push(cols.slice(range.c0, range.c1 + 1).map((c) => rows[r]?.values[c.key] ?? ""));
    return m;
  };

  const clearSelection = () => {
    const cells: { r: number; c: number; value: string }[] = [];
    for (let r = range.r0; r <= range.r1; r++) for (let c = range.c0; c <= range.c1; c++) cells.push({ r, c, value: "" });
    writeCells(cells);
  };

  const pasteMatrix = (m: string[][]) => {
    if (!m.length) return;
    // Uma única célula copiada preenche toda a seleção (como no Sheets).
    const single = m.length === 1 && m[0]!.length === 1;
    const h = single ? range.r1 - range.r0 + 1 : m.length;
    const w = single ? range.c1 - range.c0 + 1 : Math.min(m[0]!.length, cols.length - range.c0);
    const needRows = range.r0 + h - rows.length;
    const ref = new Date();
    const ex = examinerDefault();
    setRows((prev) => {
      const next = prev.map((row) => ({ ...row, values: { ...row.values } }));
      for (let i = 0; i < needRows; i++) next.push(blankRow(undefined, ex));
      for (let i = 0; i < h; i++) {
        const row = next[range.r0 + i];
        if (!row || row.deleted) continue;
        for (let j = 0; j < w; j++) {
          const col = cols[range.c0 + j];
          if (!col) continue;
          const raw = single ? m[0]![0]! : (m[i]?.[j] ?? "");
          row.values[col.key] = normalizeCell(col, raw, ref);
        }
      }
      return next;
    });
    setAnchor({ r: range.r0, c: range.c0 });
    setActive({ r: range.r0 + h - 1, c: range.c0 + w - 1 });
  };

  const onCopy = (e: React.ClipboardEvent) => {
    if (edit) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", toClipboard(selectionMatrix()));
  };
  const onCut = (e: React.ClipboardEvent) => {
    if (edit) return;
    onCopy(e);
    clearSelection();
  };
  const onPaste = (e: React.ClipboardEvent) => {
    if (edit) return;
    e.preventDefault();
    pasteMatrix(parseClipboard(e.clipboardData.getData("text/plain")));
  };

  // ------------------------------ teclado ------------------------------
  const onGridKey = (e: React.KeyboardEvent) => {
    if (edit) return; // o input trata
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;

    if (mod && !e.altKey) {
      const lk = k.toLowerCase();
      if (lk === "z" && !e.shiftKey) return (e.preventDefault(), undo());
      if ((lk === "z" && e.shiftKey) || lk === "y") return (e.preventDefault(), redo());
      if (lk === "a") {
        e.preventDefault();
        setAnchor({ r: 0, c: 0 });
        setActive({ r: lastRow, c: lastCol });
        return;
      }
      if (lk === "s") return (e.preventDefault(), void save());
      if (lk === "d") {
        e.preventDefault();
        const cells: { r: number; c: number; value: string }[] = [];
        for (let c = range.c0; c <= range.c1; c++) {
          const v = rows[range.r0]?.values[cols[c]!.key] ?? "";
          for (let r = range.r0 + 1; r <= range.r1; r++) cells.push({ r, c, value: v });
        }
        if (range.r0 === range.r1 && range.r0 > 0)
          for (let c = range.c0; c <= range.c1; c++)
            cells.push({ r: range.r0, c, value: rows[range.r0 - 1]?.values[cols[c]!.key] ?? "" });
        writeCells(cells);
        return;
      }
      if (lk === "r") {
        e.preventDefault();
        const cells: { r: number; c: number; value: string }[] = [];
        for (let r = range.r0; r <= range.r1; r++) {
          const v = rows[r]?.values[cols[range.c0]!.key] ?? "";
          for (let c = range.c0 + 1; c <= range.c1; c++) cells.push({ r, c, value: v });
        }
        writeCells(cells);
        return;
      }
      if (k === "Enter") return (e.preventDefault(), insertRowBelow());
    }
    // Ctrl+Alt+= / Ctrl+Alt+- : inserir / excluir linha (Google Planilhas)
    if (mod && e.altKey && (k === "=" || k === "+")) return (e.preventDefault(), insertRowBelow());
    if (mod && e.altKey && (k === "-" || k === "_")) return (e.preventDefault(), deleteRows());

    const ext = e.shiftKey;
    switch (k) {
      case "ArrowUp":
        e.preventDefault();
        return moveTo({ r: mod ? 0 : active.r - 1, c: active.c }, ext);
      case "ArrowDown":
        e.preventDefault();
        if (!mod && !ext && active.r === lastRow) return appendRow();
        return moveTo({ r: mod ? lastRow : active.r + 1, c: active.c }, ext);
      case "ArrowLeft":
        e.preventDefault();
        return moveTo({ r: active.r, c: mod ? 0 : active.c - 1 }, ext);
      case "ArrowRight":
        e.preventDefault();
        return moveTo({ r: active.r, c: mod ? lastCol : active.c + 1 }, ext);
      case "Home":
        e.preventDefault();
        return moveTo({ r: mod ? 0 : active.r, c: 0 }, ext);
      case "End":
        e.preventDefault();
        return moveTo({ r: mod ? lastRow : active.r, c: lastCol }, ext);
      case "PageDown":
        e.preventDefault();
        return moveTo({ r: active.r + 10, c: active.c }, ext);
      case "PageUp":
        e.preventDefault();
        return moveTo({ r: active.r - 10, c: active.c }, ext);
      case "Tab": {
        e.preventDefault();
        if (e.shiftKey) {
          if (active.c > 0) return moveTo({ r: active.r, c: active.c - 1 });
          return moveTo({ r: active.r - 1, c: lastCol });
        }
        if (active.c < lastCol) return moveTo({ r: active.r, c: active.c + 1 });
        return moveTo({ r: active.r + 1, c: 0 });
      }
      case "Enter":
        e.preventDefault();
        if (e.shiftKey) return moveTo({ r: active.r - 1, c: active.c });
        return startEdit("full");
      case "F2":
        e.preventDefault();
        return startEdit("full");
      case "Escape":
        setAnchor(active);
        return;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        return clearSelection();
    }
    if (k.length === 1 && !mod && !e.altKey) {
      e.preventDefault();
      startEdit("quick", k);
    }
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const k = e.key;
    if (k === "Escape") return (e.preventDefault(), cancelEdit());
    if (k === "Enter") {
      e.preventDefault();
      if (active.r === lastRow && !e.shiftKey) {
        commitEdit();
        return appendRow();
      }
      return commitEdit({ r: active.r + (e.shiftKey ? -1 : 1), c: active.c });
    }
    if (k === "Tab") {
      e.preventDefault();
      return commitEdit({ r: active.r, c: active.c + (e.shiftKey ? -1 : 1) });
    }
    if (edit?.mode === "quick") {
      const d =
        k === "ArrowUp" ? [-1, 0] : k === "ArrowDown" ? [1, 0] : k === "ArrowLeft" ? [0, -1] : k === "ArrowRight" ? [0, 1] : null;
      if (d) {
        e.preventDefault();
        return commitEdit({ r: active.r + d[0]!, c: active.c + d[1]! });
      }
    }
  };

  // ------------------------------ mouse ------------------------------
  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const onCellDown = useCallback(
    (r: number, c: number, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (edit) commitEdit();
      e.preventDefault();
      gridRef.current?.focus({ preventScroll: true });
      setActive({ r, c });
      if (!e.shiftKey) setAnchor({ r, c });
      dragging.current = true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edit],
  );
  const onCellEnter = useCallback((r: number, c: number) => {
    if (dragging.current) setActive({ r, c });
  }, []);
  const onCellDouble = useCallback(
    (r: number, c: number) => {
      setActive({ r, c });
      setAnchor({ r, c });
      const row = rows[r];
      const col = cols[c];
      if (!row || !col || row.deleted) return;
      setEdit({ value: row.values[col.key] ?? "", mode: "full" });
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [rows, cols],
  );
  const selectRow = (r: number, e: React.MouseEvent) => {
    if (edit) commitEdit();
    gridRef.current?.focus({ preventScroll: true });
    if (e.shiftKey) setActive({ r, c: lastCol });
    else {
      setAnchor({ r, c: 0 });
      setActive({ r, c: lastCol });
    }
  };
  const selectCol = (c: number) => {
    if (edit) commitEdit();
    gridRef.current?.focus({ preventScroll: true });
    setAnchor({ r: 0, c });
    setActive({ r: lastRow, c });
  };

  // ------------------------------ salvar ------------------------------
  const analysis = useMemo(() => {
    let invalid = 0;
    let missingTime = 0;
    let changed = 0;
    let alerts = 0;
    for (const row of rows) {
      if (row.deleted) {
        changed++;
        continue;
      }
      const ch = rowChanged(row);
      if (ch) changed++;
      if (!hasData(row.values) && !row.obsId) continue;
      if (!rowDate(row.values)) missingTime++;
      for (const col of SHEET_COLUMNS) if (cellError(col, row.values[col.key] ?? "")) invalid++;
      alerts += rowAlerts(row.values).alerts.length;
    }
    return { invalid, missingTime, changed, alerts };
  }, [rows]);
  const dirty = analysis.changed > 0;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function save() {
    if (edit) commitEdit();
    setMsg(null);
    if (analysis.invalid || analysis.missingTime) {
      setMsg({
        ok: false,
        text: analysis.missingTime
          ? `${analysis.missingTime} linha(s) com dados sem data/hora válida.`
          : `${analysis.invalid} célula(s) com valor inválido (contorno vermelho).`,
      });
      return;
    }
    const base = new Map(observations.map((o) => [o.id, o]));
    const payload: SheetSaveInput = { creates: [], updates: [], deletes: [] };
    for (const row of rows) {
      if (row.deleted && row.obsId) {
        payload.deletes.push(row.obsId);
        continue;
      }
      if (!rowChanged(row)) continue;
      if (!row.obsId && !hasData(row.values)) continue;
      const input = valuesToObservation(patientId, row.values, row.obsId ? base.get(row.obsId) : undefined);
      if (!input) continue;
      if (row.obsId) payload.updates.push({ id: row.obsId, input });
      else payload.creates.push(input);
    }
    if (!payload.creates.length && !payload.updates.length && !payload.deletes.length) {
      setMsg({ ok: true, text: "Nada para salvar." });
      return;
    }
    setSaving(true);
    const res = await saveObservationSheet(patientId, payload);
    setSaving(false);
    if (res.error) {
      setMsg({ ok: false, text: res.error });
      return;
    }
    savedRef.current = true;
    const parts = [
      res.created ? `${res.created} nova(s)` : "",
      res.updated ? `${res.updated} editada(s)` : "",
      res.deleted ? `${res.deleted} excluída(s)` : "",
      res.tasksDone ? `${res.tasksDone} tarefa(s) do cronograma concluída(s)` : "",
    ].filter(Boolean);
    setMsg({ ok: true, text: `Salvo: ${parts.join(" · ")}.` });
  }

  // ------------------------------ render ------------------------------
  const activeCol = cols[active.c];
  const activeRow = rows[active.r];
  const activeErr = activeCol && activeRow ? cellError(activeCol, activeRow.values[activeCol.key] ?? "") : null;
  const activeAlerts = activeRow ? rowAlerts(activeRow.values).alerts : [];

  return (
    <div className="space-y-3">
      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void save()} disabled={saving || !dirty}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {saving ? "Salvando…" : dirty ? `Salvar (${analysis.changed})` : "Salvo"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={undo} disabled={!undoStack.current.length} title="Desfazer (Ctrl+Z)">
          <Undo2 /> Desfazer
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={redo} disabled={!redoStack.current.length} title="Refazer (Ctrl+Y)">
          <Redo2 /> Refazer
        </Button>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <Button type="button" variant="outline" size="sm" onClick={appendRow} title="Nova linha (↓ na última linha)">
          <Plus /> Linha
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowGen((v) => !v)}>
          <CalendarClock /> Gerar horários
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={deleteRows} title="Excluir linhas selecionadas (Ctrl+Alt+−)">
          <Trash2 /> {rows[range.r0]?.deleted ? "Restaurar" : "Excluir"} {range.r1 > range.r0 ? `${range.r1 - range.r0 + 1} linhas` : "linha"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={sortByTime} title="Ordenar por data e hora">
          <ArrowDownWideNarrow /> Ordenar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowHelp((v) => !v)} className="ml-auto">
          <Keyboard /> Atalhos
        </Button>
      </div>

      {/* Grupos de colunas */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="field-label mr-1">Colunas</span>
        {ALL_GROUPS.filter((g) => g !== "registro").map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => toggleGroup(g)}
            aria-pressed={groups.has(g)}
            className={cn(
              "min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              groups.has(g) ? "chip-on" : "bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {showGen && (
        <GenerateBar
          onClose={() => setShowGen(false)}
          onGenerate={generate}
          defaultFrom={rows.find((r) => r.obsId) ? undefined : nextHalfHour(new Date())}
          firstExisting={observations.length ? new Date(
            Math.min(...observations.map((o) => new Date(o.recordedAt).getTime())),
          ) : null}
        />
      )}
      {showHelp && <ShortcutHelp onClose={() => setShowHelp(false)} />}

      {/* Barra de fórmula: célula ativa, erro e alertas */}
      <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-white px-3 py-1.5 text-sm">
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          {activeCol ? `${activeCol.label} · linha ${active.r + 1}` : "—"}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{activeRow && activeCol ? activeRow.values[activeCol.key] : ""}</span>
        {activeErr && <span className="text-xs font-semibold text-rose-700">{activeErr}</span>}
        {activeAlerts.map((a) => (
          <span key={a.text} className={cn("text-xs font-semibold", a.level === "danger" ? "text-rose-700" : "text-amber-700")}>
            <AlertTriangle className="mr-0.5 inline h-3.5 w-3.5" />
            {a.text}
          </span>
        ))}
      </div>

      {/* Grade */}
      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label="Planilha de aferições"
        aria-rowcount={rows.length}
        aria-colcount={cols.length}
        onKeyDown={onGridKey}
        onCopy={onCopy}
        onCut={onCut}
        onPaste={onPaste}
        className="relative max-h-[70vh] overflow-auto rounded-xl border bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <table
          className="border-separate border-spacing-0 text-[13px]"
          style={{ tableLayout: "fixed", width: 40 + cols.reduce((n, c) => n + c.width, 0) }}
        >
          <colgroup>
            <col style={{ width: 40 }} />
            {cols.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 w-10 border-b border-r bg-slate-50" />
              {cols.map((col, c) => (
                <th
                  key={col.key}
                  scope="col"
                  title={col.label}
                  onMouseDown={(e) => (e.preventDefault(), selectCol(c))}
                  style={{ minWidth: col.width, width: col.width, left: stickyLeft(cols, c) }}
                  className={cn(
                    "sticky top-0 z-20 cursor-pointer select-none border-b border-r bg-slate-50 px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                    c < 2 && "z-30",
                    c >= range.c0 && c <= range.c1 && "bg-accent text-[hsl(var(--accent-foreground))]",
                  )}
                >
                  {col.short ?? col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <SheetRowView
                key={row.rid}
                row={row}
                r={r}
                cols={cols}
                sel={r >= range.r0 && r <= range.r1 ? [range.c0, range.c1] : null}
                activeC={r === active.r ? active.c : -1}
                editing={r === active.r && edit ? edit : null}
                inputRef={inputRef}
                onEditChange={(v) => setEdit((e) => (e ? { ...e, value: v } : e))}
                onInputKey={onInputKey}
                onInputBlur={() => commitEdit()}
                onDown={onCellDown}
                onEnter={onCellEnter}
                onDouble={onCellDouble}
                onRowHead={selectRow}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Rodapé de status */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{rows.filter((r) => !r.deleted).length} linha(s)</span>
        {analysis.changed > 0 && <span className="font-semibold text-amber-700">{analysis.changed} alteração(ões) não salva(s)</span>}
        {analysis.invalid > 0 && <span className="font-semibold text-rose-700">{analysis.invalid} célula(s) inválida(s)</span>}
        {analysis.alerts > 0 && <span className="font-semibold text-rose-700">{analysis.alerts} alerta(s) clínico(s)</span>}
        <Legend />
        {msg && (
          <span className={cn("ml-auto font-semibold", msg.ok ? "text-emerald-700" : "text-rose-700")} role="status">
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function nextHalfHour(d: Date): Date {
  const x = new Date(d);
  x.setSeconds(0, 0);
  x.setMinutes(x.getMinutes() < 30 ? 30 : 60);
  return x;
}

/** Data e Hora ficam fixas à esquerda ao rolar para o lado. */
function stickyLeft(cols: SheetColumn[], c: number): number | undefined {
  if (c >= 2) return undefined;
  return 40 + (c === 1 ? cols[0]!.width : 0);
}

// ------------------------------- linha -------------------------------

const SheetRowView = memo(function SheetRowView({
  row,
  r,
  cols,
  sel,
  activeC,
  editing,
  inputRef,
  onEditChange,
  onInputKey,
  onInputBlur,
  onDown,
  onEnter,
  onDouble,
  onRowHead,
}: {
  row: SheetRow;
  r: number;
  cols: SheetColumn[];
  sel: [number, number] | null;
  activeC: number;
  editing: { value: string; mode: EditMode } | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onEditChange: (v: string) => void;
  onInputKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onDown: (r: number, c: number, e: React.MouseEvent) => void;
  onEnter: (r: number, c: number) => void;
  onDouble: (r: number, c: number) => void;
  onRowHead: (r: number, e: React.MouseEvent) => void;
}) {
  const status = row.deleted ? "deleted" : !row.obsId ? (hasData(row.values) ? "new" : "empty") : rowChanged(row) ? "edited" : "saved";
  const { cols: alertCols } = rowAlerts(row.values);
  return (
    <tr data-row={r} className={cn(row.deleted && "line-through opacity-50")}>
      <th
        scope="row"
        onMouseDown={(e) => (e.preventDefault(), onRowHead(r, e))}
        title={
          status === "new" ? "Nova (não salva)" : status === "edited" ? "Editada (não salva)" : status === "deleted" ? "Será excluída ao salvar" : undefined
        }
        className={cn(
          "sticky left-0 z-10 w-10 cursor-pointer select-none border-b border-r px-1 text-center text-[11px] font-semibold text-muted-foreground",
          status === "new" && "bg-emerald-50 text-emerald-700",
          status === "edited" && "bg-amber-50 text-amber-700",
          status === "deleted" && "bg-rose-50 text-rose-700",
          (status === "saved" || status === "empty") && "bg-slate-50",
        )}
      >
        {r + 1}
      </th>
      {cols.map((col, c) => {
        const value = row.values[col.key] ?? "";
        const err = cellError(col, value);
        const inSel = sel != null && c >= sel[0] && c <= sel[1];
        const isActive = c === activeC;
        const isEditing = isActive && editing != null;
        const alert = alertCols.has(col.key);
        return (
          <td
            key={col.key}
            data-cell={`${r}:${c}`}
            role="gridcell"
            aria-selected={inSel}
            title={err ?? undefined}
            onMouseDown={(e) => onDown(r, c, e)}
            onMouseEnter={() => onEnter(r, c)}
            onDoubleClick={() => onDouble(r, c)}
            style={{ minWidth: col.width, maxWidth: col.width, left: stickyLeft(cols, c) }}
            className={cn(
              "relative h-8 cursor-cell select-none overflow-hidden whitespace-nowrap border-b border-r px-1.5",
              c < 2 ? "sticky z-10 bg-white font-medium" : "bg-white",
              alert && !inSel && "bg-rose-50 font-semibold text-rose-700",
              inSel && "bg-[hsl(var(--accent))]",
              err && "outline outline-1 -outline-offset-2 outline-rose-500",
              (col.kind === "int" || col.kind === "decimal") && "text-right tabular-nums",
            )}
          >
            {isEditing ? (
              <>
                <input
                  ref={inputRef}
                  value={editing.value}
                  onChange={(e) => onEditChange(e.target.value)}
                  onKeyDown={onInputKey}
                  onBlur={onInputBlur}
                  list={col.options ? `opts-${col.key}` : undefined}
                  inputMode={col.kind === "int" || col.kind === "decimal" ? "decimal" : undefined}
                  placeholder={col.placeholder}
                  aria-label={col.label}
                  className="absolute inset-0 z-20 h-full w-full min-w-[8rem] border-2 border-primary bg-white px-1.5 text-[13px] shadow-lg outline-none"
                />
                {col.options && (
                  <datalist id={`opts-${col.key}`}>
                    {col.options.map((o) => (
                      <option key={o.value} value={o.label} />
                    ))}
                  </datalist>
                )}
              </>
            ) : (
              <span className={cn(!value && col.placeholder && "text-muted-foreground/50")}>{value}</span>
            )}
            {isActive && !isEditing && (
              <span aria-hidden className="pointer-events-none absolute inset-0 border-2 border-primary" />
            )}
          </td>
        );
      })}
    </tr>
  );
});

// --------------------------- painéis auxiliares ---------------------------

function GenerateBar({
  onGenerate,
  onClose,
  firstExisting,
  defaultFrom,
}: {
  onGenerate: (from: Date, to: Date, step: number) => void;
  onClose: () => void;
  firstExisting: Date | null;
  defaultFrom?: Date;
}) {
  const now = new Date();
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(
      d.getHours(),
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const startDefault = defaultFrom ?? new Date((firstExisting ?? now).getTime() - 4 * 3600000);
  const [from, setFrom] = useState(toLocal(startDefault));
  const [to, setTo] = useState(toLocal(firstExisting ?? new Date(now.getTime() + 6 * 3600000)));
  const [step, setStep] = useState(30);
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
      <label className="space-y-1">
        <span className="field-label block">De</span>
        <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border px-2 text-sm" />
      </label>
      <label className="space-y-1">
        <span className="field-label block">Até (exclusive)</span>
        <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border px-2 text-sm" />
      </label>
      <label className="space-y-1">
        <span className="field-label block">A cada</span>
        <select value={step} onChange={(e) => setStep(Number(e.target.value))} className="h-9 rounded-lg border px-2 text-sm">
          {[15, 30, 60, 120, 240].map((m) => (
            <option key={m} value={m}>
              {m < 60 ? `${m} min` : `${m / 60} h`}
            </option>
          ))}
        </select>
      </label>
      <Button type="button" size="sm" onClick={() => onGenerate(new Date(from), new Date(to), step)}>
        <CalendarClock /> Gerar linhas
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        <X /> Fechar
      </Button>
      <p className="w-full text-xs text-muted-foreground">
        Cria uma linha vazia por horário (pula os que já existem). Útil para lançar de uma vez as aferições anotadas no papel
        {firstExisting ? " Por padrão, vai até a primeira aferição já registrada." : "."}
      </p>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ["Setas · Tab · Shift+Tab", "Mover entre células"],
  ["Enter · F2 · duplo clique", "Editar a célula (Enter de novo confirma e desce)"],
  ["Digitar", "Substitui o conteúdo (setas confirmam e movem)"],
  ["Esc", "Cancelar a edição"],
  ["Shift+setas · arrastar", "Selecionar intervalo"],
  ["Ctrl+setas · Home/End", "Ir à borda da planilha / da linha"],
  ["Ctrl+A", "Selecionar tudo"],
  ["Delete · Backspace", "Limpar a seleção"],
  ["Ctrl+C · Ctrl+X · Ctrl+V", "Copiar, recortar e colar (também do Excel/Sheets)"],
  ["Ctrl+D · Ctrl+R", "Preencher para baixo / para a direita"],
  ["Ctrl+Z · Ctrl+Y", "Desfazer / refazer"],
  ["Ctrl+Enter · Ctrl+Alt+=", "Inserir linha abaixo"],
  ["Ctrl+Alt+−", "Excluir (ou restaurar) as linhas selecionadas"],
  ["↓ na última linha", "Nova linha (30 min depois)"],
  ["Ctrl+S", "Salvar"],
];

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Atalhos (como no Google Planilhas)</p>
        <button type="button" onClick={onClose} aria-label="Fechar atalhos" className="rounded-md p-1.5 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {SHORTCUTS.map(([k, d]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-48 shrink-0 font-mono text-xs font-semibold text-slate-700">{k}</dt>
            <dd className="text-muted-foreground">{d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        Listas aceitam abreviações: dilatação “8”, bolsa “r”/“m”, De Lee “am”/“+1”, SDL “s”/“n”, reflexo “p”/“a”.
      </p>
    </div>
  );
}

function Legend() {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200" /> nova
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-amber-200" /> editada
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-rose-200" /> excluir
      </span>
      <span className="inline-flex items-center gap-1">
        <RotateCcw className="h-3 w-3" /> Ctrl+Z desfaz
      </span>
    </span>
  );
}
