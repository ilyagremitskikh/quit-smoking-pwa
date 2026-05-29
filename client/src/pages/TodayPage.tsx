import { Cigarette, Check, HeartPulse, PlayCircle, RotateCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SetupForm } from "../components/SetupForm.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { VideoModal } from "../components/VideoModal.js";
import { api, getDemoNow } from "../lib/api.js";
import { formatTime, secondsToClock, secondsUntil } from "../lib/time.js";
import type { AppState } from "../lib/types.js";

export function TodayPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [now, setNow] = useState(new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showVideoOffer, setShowVideoOffer] = useState(false);
  const notifiedDose = useRef<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setState(await api.state());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить состояние");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const effectiveNow = getDemoNow() ? new Date(getDemoNow()!) : now;

  useEffect(() => {
    const nextDose = state?.nextDose;
    if (!nextDose || secondsUntil(nextDose.plannedTime, effectiveNow) > 0 || notifiedDose.current === nextDose.id) {
      return;
    }
    notifiedDose.current = nextDose.id;
    if ("Notification" in window && Notification.permission === "granted") {
      void new Notification("Пора принять таблетку", { body: `Слот на ${formatTime(nextDose.plannedTime)}` });
    }
    navigator.vibrate?.(80);
  }, [effectiveNow, state?.nextDose]);

  async function handleTakeDose() {
    if (!state?.nextDose) {
      return;
    }
    setBusy(true);
    try {
      await api.takeDose(state.nextDose.id);
      navigator.vibrate?.(40);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleSmoke() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await api.smoke();
      navigator.vibrate?.(35);
      if (result.shouldOfferVideo) {
        setShowVideoOffer(true);
      } else {
        setNotice("Записал. Это переходный период, просто продолжаем курс дальше.");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return <EmptyState text={error ?? "Загружаю..."} onRetry={load} />;
  }

  if (state.setupNeeded) {
    return <SetupForm onStarted={load} />;
  }

  const nextSeconds = state.nextDose ? secondsUntil(state.nextDose.plannedTime, effectiveNow) : 0;
  const takenToday = state.todaySchedule.filter(
    (dose) => dose.status === "taken" || (dose.status === "late" && dose.takenAt)
  ).length;
  const isTransition = state.mode === "course" && (state.currentDay ?? 99) < 5;
  const milestone = state.benefits.nextMilestone ?? state.benefits.currentMilestone;

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md border border-coral/30 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
      {notice ? <p className="rounded-md border border-sky/30 bg-sky/10 p-3 text-sm text-sky">{notice}</p> : null}

      <section className="overflow-hidden rounded-md border border-line bg-panel shadow-sm">
        <div className="bg-gradient-to-br from-mint/20 via-sky/20 to-amber/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-600">
                {isTransition ? "Переходный период" : "После целевого отказа"}
              </p>
              <h2 className="mt-1 text-4xl font-semibold">{state.benefits.smokeFreeDays}</h2>
              <p className="text-sm text-slate-600">дней без срыва после дня 5</p>
            </div>
            <div className="rounded-full bg-white/80 p-3 text-mint shadow-sm">
              <Sparkles size={26} />
            </div>
          </div>
          {milestone ? (
            <div className="mt-4 rounded-md bg-white/75 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">
                {state.benefits.nextMilestone ? "Следующая польза" : "Текущая веха"}
              </p>
              <p className="mt-1 font-semibold">{milestone.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{milestone.text}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <BenefitCard label="Не выкурено" value={String(state.benefits.cigarettesAvoided)} suffix="шт." />
        <BenefitCard
          label="Сэкономлено"
          value={state.benefits.moneySaved === null ? "—" : String(state.benefits.moneySaved)}
          suffix={state.benefits.moneySaved === null ? "укажи цену" : "₽"}
        />
      </section>

      {state.mode === "course" ? (
        <section className="rounded-md border border-line bg-panel p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-sm text-slate-600">
            <span>День {state.currentDay} из 25</span>
            <span>{state.currentPhase ? `Фаза ${state.currentPhase}` : "Курс"}</span>
          </div>

          <div className="rounded-md bg-paper p-4 text-center">
            <p className="text-sm text-slate-600">
              {state.nextDose ? `Следующий приём в ${formatTime(state.nextDose.plannedTime)}` : "На сегодня всё"}
            </p>
            <p className="mt-2 text-5xl font-semibold tabular-nums text-ink">
              {state.nextDose ? secondsToClock(nextSeconds) : "готово"}
            </p>
          </div>

          <button
            disabled={!state.nextDose || busy}
            onClick={handleTakeDose}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-mint px-4 text-lg font-semibold text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Check size={22} />
            Принял
          </button>

          <p className="mt-3 text-center text-sm text-slate-600">
            Сегодня: {takenToday} / {state.todaySchedule.length}
          </p>
        </section>
      ) : (
        <section className="rounded-md border border-mint/30 bg-mint/10 p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Курс завершён</p>
          <h2 className="mt-1 text-2xl font-semibold">Теперь держим свободу</h2>
        </section>
      )}

      {state.quote ? (
        <section className="rounded-md border border-line bg-panel p-4 shadow-sm">
          <p className="text-base leading-relaxed text-slate-700">“{state.quote.text}”</p>
          {state.quote.author ? <p className="mt-2 text-sm text-slate-500">{state.quote.author}</p> : null}
        </section>
      ) : null}

      {state.todaySchedule.length > 0 ? (
        <section className="rounded-md border border-line bg-panel p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Сегодняшние слоты</h2>
          <div className="space-y-2">
            {state.todaySchedule.map((dose) => (
              <div key={dose.id} className="flex items-center justify-between rounded-md bg-paper px-3 py-2">
                <div>
                  <p className="font-medium">{formatTime(dose.plannedTime)}</p>
                  {dose.flexible ? <p className="text-xs text-slate-500">гибкий слот</p> : null}
                </div>
                <StatusBadge status={dose.status} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <button
        disabled={busy}
        onClick={handleSmoke}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-amber/40 bg-amber/10 px-4 font-semibold text-amber disabled:opacity-60"
      >
        <Cigarette size={20} />
        Покурил
      </button>

      <button
        onClick={load}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md text-sm text-slate-500 hover:bg-white/70"
      >
        <RotateCw size={16} />
        Обновить
      </button>

      {showVideoOffer ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/40 p-4 sm:items-center">
          <div className="mx-auto w-full max-w-md rounded-md border border-line bg-panel p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-coral">
              <HeartPulse size={21} />
              <p className="font-semibold">Записал срыв. Без самобичевания.</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Можно сразу вернуться в курс. Если хочется напомнить себе, ради чего это всё, посмотри послание.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setShowVideoOffer(false);
                  setShowVideo(true);
                }}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-coral px-3 font-semibold text-white"
              >
                <PlayCircle size={18} />
                Посмотреть
              </button>
              <button
                onClick={() => setShowVideoOffer(false)}
                className="min-h-11 rounded-md border border-line px-3 font-semibold text-slate-600"
              >
                Не сейчас
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showVideo ? <VideoModal onClose={() => setShowVideo(false)} /> : null}
    </div>
  );
}

function BenefitCard({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-4 shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
      <div className="mt-1 flex items-end gap-1">
        <p className="text-3xl font-semibold">{value}</p>
        <p className="pb-1 text-sm text-slate-500">{suffix}</p>
      </div>
    </div>
  );
}

function EmptyState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="rounded-md border border-line bg-panel p-4 text-center shadow-sm">
      <p className="text-slate-600">{text}</p>
      <button onClick={onRetry} className="mt-3 rounded-md bg-paper px-4 py-2 text-sm text-slate-700">
        Повторить
      </button>
    </div>
  );
}
