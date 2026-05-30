import type { DoseStatus } from "../lib/types.js";

const labels: Record<DoseStatus, string> = {
  pending: "ждёт",
  taken: "принято",
  late: "поздно",
  skipped: "пропуск"
};

const classes: Record<DoseStatus, string> = {
  pending: "border-slate-300 bg-slate-50 text-slate-600",
  taken: "border-mint/40 bg-mint/10 text-emerald-700",
  late: "border-amber/50 bg-amber/10 text-amber",
  skipped: "border-coral/40 bg-coral/10 text-coral"
};

export function StatusBadge({ status }: { status: DoseStatus }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-bold ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}
