import { CalendarClock, Clock, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";

interface TimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  caption?: string;
}

interface DateTimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  caption?: string;
}

interface TimePickerSheetProps {
  open: boolean;
  title: string;
  value: string;
  confirmLabel?: string;
  destructiveLabel?: string;
  onConfirm: (value: string) => void | Promise<void>;
  onClose: () => void;
  onDestructive?: () => void | Promise<void>;
}

export function TimeField({ label, value, onChange, caption = "Нажми, чтобы выбрать время" }: TimeFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-button flex min-h-20 w-full min-w-0 items-center justify-between gap-3 rounded-[18px] border border-line bg-white/80 px-4 py-3 text-left shadow-inner-soft focus:border-mint focus:outline-none"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-mint/10 text-mint">
            <Clock size={21} />
          </span>
          <span className="min-w-0">
            <span className="label-soft block">{label}</span>
            <span className="copy-soft mt-1 block">{caption}</span>
          </span>
        </span>
        <span className="numeric-type shrink-0 text-2xl font-extrabold text-ink">{value}</span>
      </button>

      <TimePickerSheet
        open={open}
        title={label}
        value={value}
        onConfirm={(next) => {
          onChange(next);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function DateTimeField({ label, value, onChange, caption = "Нажми, чтобы выбрать дату и время" }: DateTimeFieldProps) {
  return (
    <label className="tap-button relative flex min-h-20 w-full min-w-0 items-center justify-between gap-3 rounded-[18px] border border-line bg-white/80 px-4 py-3 text-left shadow-inner-soft focus-within:border-mint">
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky/10 text-sky">
          <CalendarClock size={21} />
        </span>
        <span className="min-w-0">
          <span className="label-soft block">{label}</span>
          <span className="copy-soft mt-1 block">{caption}</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-extrabold text-ink">{formatDate(value)}</span>
        <span className="numeric-type block text-2xl font-extrabold text-ink">{value.slice(11, 16)}</span>
      </span>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-[0.001]"
        required
      />
    </label>
  );
}

export function TimePickerSheet({
  open,
  title,
  value,
  confirmLabel = "Готово",
  destructiveLabel,
  onConfirm,
  onClose,
  onDestructive
}: TimePickerSheetProps) {
  const [minutes, setMinutes] = useState(() => parseTime(value));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMinutes(parseTime(value));
      setBusy(false);
    }
  }, [open, value]);

  if (!open) {
    return null;
  }

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const display = formatMinutes(minutes);

  function shift(delta: number) {
    setMinutes((current) => normalizeMinutes(current + delta));
  }

  function setNow() {
    const now = new Date();
    setMinutes(now.getHours() * 60 + now.getMinutes());
  }

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm(display);
    } finally {
      setBusy(false);
    }
  }

  async function destructive() {
    if (!onDestructive) {
      return;
    }
    setBusy(true);
    try {
      await onDestructive();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-ink/35 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center">
      <div className="surface-in mx-auto w-full max-w-md rounded-[28px] bg-panel p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="label-soft">Выбор времени</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-button grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-paper text-slate-500"
            aria-label="Закрыть"
          >
            <X size={19} />
          </button>
        </div>

        <div className="rounded-[24px] border border-line bg-white/70 p-4 text-center shadow-inner-soft">
          <p className="numeric-type text-[3.15rem] font-extrabold leading-none text-ink">{display}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stepper label="Часы" value={pad2(hour)} onMinus={() => shift(-60)} onPlus={() => shift(60)} />
            <Stepper label="Минуты" value={pad2(minute)} onMinus={() => shift(-5)} onPlus={() => shift(5)} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => shift(-15)} className="tap-button min-h-11 rounded-2xl bg-paper px-3 font-extrabold text-slate-600">
            -15
          </button>
          <button type="button" onClick={setNow} className="tap-button flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-paper px-3 font-extrabold text-slate-600">
            <RotateCcw size={16} />
            Сейчас
          </button>
          <button type="button" onClick={() => shift(15)} className="tap-button min-h-11 rounded-2xl bg-paper px-3 font-extrabold text-slate-600">
            +15
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="tap-button min-h-12 rounded-2xl bg-mint px-4 font-extrabold text-white disabled:opacity-60"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="tap-button min-h-12 rounded-2xl border border-line px-4 font-extrabold text-slate-600 disabled:opacity-60"
          >
            Отмена
          </button>
        </div>

        {destructiveLabel && onDestructive ? (
          <button
            type="button"
            onClick={() => void destructive()}
            disabled={busy}
            className="tap-button mt-2 min-h-12 w-full rounded-2xl border border-coral/40 bg-coral/10 px-4 font-extrabold text-coral disabled:opacity-60"
          >
            {destructiveLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="rounded-[20px] bg-paper p-2">
      <p className="label-soft mb-2 text-center">{label}</p>
      <div className="grid grid-cols-[2.35rem_1fr_2.35rem] items-center gap-2">
        <button type="button" onClick={onMinus} className="tap-button grid h-10 place-items-center rounded-2xl bg-white text-slate-500" aria-label={`${label}: меньше`}>
          <Minus size={18} />
        </button>
        <p className="numeric-type text-center text-2xl font-extrabold text-ink">{value}</p>
        <button type="button" onClick={onPlus} className="tap-button grid h-10 place-items-center rounded-2xl bg-white text-mint" aria-label={`${label}: больше`}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

function parseTime(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return normalizeMinutes((Number(hours) || 0) * 60 + (Number(minutes) || 0));
}

function normalizeMinutes(value: number): number {
  return ((value % 1440) + 1440) % 1440;
}

function formatMinutes(value: number): string {
  const normalized = normalizeMinutes(value);
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Сегодня";
  }
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }).replace(".", "");
}
