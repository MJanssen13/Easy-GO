/**
 * Pure scheduling helpers: shift boundaries, time-slot generation, expanding a
 * clinical routine into tasks, and merging/derived views over a schedule.
 * No I/O — safe to unit test and to run on client or server.
 */
import type { ScheduledTask } from "@/core/patients/types";
import type { MonitoringRoutine } from "./routines";

const SLOT_MIN = 15;
const DAY_SHIFT_END = 19; // 19:00
const NIGHT_SHIFT_END = 7; // 07:00

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Round a date up to the next 15-minute slot. */
export function nextSlotStart(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  const next = Math.ceil((m + (d.getSeconds() > 0 ? 1 : 0)) / SLOT_MIN) * SLOT_MIN;
  if (next === m && from.getSeconds() === 0) {
    // already exactly on a slot
  }
  d.setMinutes(Math.ceil((m + 1) / SLOT_MIN) * SLOT_MIN);
  return d;
}

/** End of the current nursing shift (07:00 or 19:00) relative to `from`. */
export function shiftEnd(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setSeconds(0, 0);
  end.setMinutes(0);
  const hour = from.getHours();
  if (hour >= NIGHT_SHIFT_END && hour < DAY_SHIFT_END) {
    end.setHours(DAY_SHIFT_END); // day shift → 19:00 today
  } else {
    if (hour >= DAY_SHIFT_END) end.setDate(end.getDate() + 1); // night → 07:00 next day
    end.setHours(NIGHT_SHIFT_END);
  }
  return end;
}

/** 15-min slot timestamps from `start` (inclusive) to `end` (inclusive). */
export function generateSlots(start: Date, end: Date): Date[] {
  const slots: Date[] = [];
  let cur = new Date(start);
  const guard = new Date(start.getTime() + 24 * 60 * 60000);
  while (cur <= end && cur < guard) {
    slots.push(new Date(cur));
    cur = new Date(cur.getTime() + SLOT_MIN * 60000);
  }
  return slots;
}

/**
 * Expand a routine into tasks between `start` and `end`. Parameters measured at
 * the same slot are merged into a single task (so one visit covers all of them).
 */
export function tasksFromRoutine(
  routine: MonitoringRoutine,
  start: Date,
  end: Date,
): ScheduledTask[] {
  const byTime = new Map<number, Set<string>>();

  for (const rule of routine.rules) {
    for (let t = start.getTime(); t <= end.getTime(); t += rule.intervalMin * 60000) {
      const set = byTime.get(t) ?? new Set<string>();
      rule.params.forEach((p) => set.add(p));
      byTime.set(t, set);
    }
  }

  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, params]) => ({
      id: uuid(),
      timestamp: new Date(time).toISOString(),
      focus: [...params],
      status: "pending" as const,
    }));
}

/** Build tasks from an explicit map of slotISO → params (manual grid). */
export function tasksFromGrid(grid: Record<string, string[]>): ScheduledTask[] {
  return Object.entries(grid)
    .filter(([, params]) => params.length > 0)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([iso, params]) => ({
      id: uuid(),
      timestamp: iso,
      focus: params,
      status: "pending" as const,
    }));
}

/**
 * Merge new tasks into an existing schedule. When `replaceFuture` is set, drops
 * pending tasks at/after the first new task's time (keeps completed history).
 */
export function mergeSchedule(
  existing: ScheduledTask[],
  incoming: ScheduledTask[],
  replaceFuture: boolean,
): ScheduledTask[] {
  if (incoming.length === 0) return existing;
  let base = [...existing];
  if (replaceFuture) {
    const from = Math.min(...incoming.map((t) => new Date(t.timestamp).getTime()));
    base = base.filter(
      (t) => t.status !== "pending" || new Date(t.timestamp).getTime() < from,
    );
  }
  return [...base, ...incoming].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function markCompleted(schedule: ScheduledTask[], taskId: string): ScheduledTask[] {
  return schedule.map((t) => (t.id === taskId ? { ...t, status: "completed" as const } : t));
}

export function setTaskStatus(
  schedule: ScheduledTask[],
  taskId: string,
  status: ScheduledTask["status"],
): ScheduledTask[] {
  return schedule.map((t) => (t.id === taskId ? { ...t, status } : t));
}

export type TaskUrgency = "overdue" | "due" | "upcoming";

export function taskUrgency(timestamp: string, now: Date = new Date()): TaskUrgency {
  const diffMin = (new Date(timestamp).getTime() - now.getTime()) / 60000;
  if (diffMin < -10) return "overdue";
  if (diffMin <= 15) return "due";
  return "upcoming";
}

export function pendingTasks(schedule: ScheduledTask[]): ScheduledTask[] {
  return schedule
    .filter((t) => t.status === "pending")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/** Next N pending tasks from now (or overdue). */
export function upcomingTasks(schedule: ScheduledTask[], limit = 5): ScheduledTask[] {
  return pendingTasks(schedule).slice(0, limit);
}
