import { ArrowRight, Banknote, Check, Cigarette, HeartPulse, Pencil, PlayCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SetupForm } from "../components/SetupForm.js";
import { SlideConfirm } from "../components/SlideConfirm.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { TimePickerSheet } from "../components/TimePicker.js";
import { VideoModal } from "../components/VideoModal.js";
import { api, getDemoNow } from "../lib/api.js";
import { hapticStrong } from "../lib/haptics.js";
import { formatTime, secondsToClock, secondsUntil } from "../lib/time.js";
import type { AppState, DoseView, ProgressResponse, SmokeLog } from "../lib/types.js";

type UndoToast =
  | { kind: "dose"; scheduleId: number; text: string }
  | { kind: "smoke"; smokeId: number; text: string };

export function TodayPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [now, setNow] = useState(new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showVideoOffer, setShowVideoOffer] = useState(false);
  const [justTaken, setJustTaken] = useState(false);
  const [editingDose, setEditingDose] = useState<DoseView | null>(null);
  const notifiedDose = useRef<number | null>(null);
  const undoTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const nextState = await api.state();
      setState(nextState);
      if (!nextState.setupNeeded) {
        setProgress(await api.progress());
      }
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

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  useEffect(() => () => clearUndoTimer(), []);

  const effectiveNow = getDemoNow() ? new Date(getDemoNow()!) : now;

  useEffect(() => {
    const nextDose = state?.nextDose;
    if (!nextDose || secondsUntil(nextDose.effectiveTime, effectiveNow) > 0 || notifiedDose.current === nextDose.id) {
      return;
    }
    notifiedDose.current = nextDose.id;
    if ("Notification" in window && Notification.permission === "granted") {
      void new Notification("Пора принять таблетку", { body: `Слот на ${formatTime(nextDose.effectiveTime)}` });
    }
    hapticStrong();
  }, [effectiveNow, state?.nextDose]);

  const takenToday = useMemo(
    () =>
      state?.todaySchedule.filter((dose) => dose.status === "taken" || (dose.status === "late" && dose.takenAt)).length ?? 0,
    [state?.todaySchedule]
  );

  async function handleTakeDose() {
    if (!state?.nextDose) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const dose = await api.takeDose(state.nextDose.id);
      showUndo({ kind: "dose", scheduleId: dose.id, text: "Приём отмечен" });
      setJustTaken(true);
      window.setTimeout(() => setJustTaken(false), 800);
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
      showUndo({ kind: "smoke", smokeId: result.smoke.id, text: smokeNotice(result.smoke) });
      if (result.shouldOfferVideo) {
        setShowVideoOffer(true);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function undoLast() {
    if (!undoToast) {
      return;
    }
    setBusy(true);
    try {
      if (undoToast.kind === "dose") {
        await api.undoDose(undoToast.scheduleId);
      } else {
        await api.undoSmoke(undoToast.smokeId);
        setShowVideoOffer(false);
      }
      setUndoToast(null);
      clearUndoTimer();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDoseAction(dose: DoseView) {
    if (dose.status === "taken" || (dose.status === "late" && dose.takenAt)) {
      setEditingDose(dose);
      return;
    }
    if (dose.status === "late") {
      await api.takeDose(dose.id);
      showUndo({ kind: "dose", scheduleId: dose.id, text: "Приём отмечен" });
      await load();
    }
  }

  async function handleCloseMissedDay(dayNumber: number) {
    setBusy(true);
    try {
      const result = await api.closeDay(dayNumber);
      setNotice(result.closed > 0 ? `День ${dayNumber} закрыт пропусками` : `В дне ${dayNumber} нечего закрывать`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function showUndo(next: UndoToast) {
    clearUndoTimer();
    setUndoToast(next);
    undoTimer.current = window.setTimeout(() => setUndoToast(null), 5000);
  }

  function clearUndoTimer() {
    if (undoTimer.current !== null) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  }

  async function saveDoseTime(time: string) {
    if (!editingDose) {
      return;
    }
    setBusy(true);
    try {
      await api.takeDose(editingDose.id, { takenAt: combineDateWithTime(editingDose.takenAt ?? editingDose.effectiveTime, time).toISOString() });
      setNotice("Время приёма обновлено");
      setEditingDose(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function cancelDoseTake() {
    if (!editingDose) {
      return;
    }
    setBusy(true);
    try {
      await api.undoDose(editingDose.id);
      showUndo({ kind: "dose", scheduleId: editingDose.id, text: "Приём отменён" });
      setEditingDose(null);
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

  const isBeforeQuit = state.mode === "beforeCourse" || (state.mode === "course" && (state.currentDay ?? 99) < 5);
  const daysToQuit = state.mode === "beforeCourse" ? 5 : Math.max(0, 5 - (state.currentDay ?? 5));
  const nextSeconds = state.nextDose ? secondsUntil(state.nextDose.effectiveTime, effectiveNow) : 0;
  const milestone = state.benefits.nextMilestone ?? state.benefits.currentMilestone;
  const missedDay = progress?.missedDays?.[0] ?? null;

  return (
    <div className="space-y-4 pb-8">
      <StageChip state={state} />

      {error ? <p className="rounded-2xl border border-coral/30 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-sky/30 bg-sky/10 p-3 text-sm text-sky">{notice}</p> : null}

      {missedDay ? (
        <section className="surface-in rounded-[22px] border border-amber/25 bg-amber/10 p-4 text-amber shadow-soft">
          <p className="label-soft text-amber">Есть незакрытый день</p>
          <p className="copy-soft mt-1">День {missedDay.dayNumber}: {missedDay.openSlots} слотов ждут решения.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={busy}
              onClick={() => void handleCloseMissedDay(missedDay.dayNumber)}
              className="tap-button min-h-10 rounded-2xl bg-amber px-3 text-sm font-bold text-white"
            >
              Закрыть
            </button>
            <button
              onClick={() => setNotice("Ниже открой слот дня и поправь время вручную")}
              className="tap-button min-h-10 rounded-2xl border border-amber/30 px-3 text-sm font-bold"
            >
              Вручную
            </button>
          </div>
        </section>
      ) : null}

      <HeroCard
        isBeforeQuit={isBeforeQuit}
        daysToQuit={daysToQuit}
        smokeFreeDays={state.benefits.smokeFreeDays}
        milestone={milestone}
        lastSmoke={progress?.smokeEvents.find((smoke) => smoke.kind === "relapse") ?? null}
      />

      <section className="grid grid-cols-2 gap-3">
        <BenefitCard label="Не выкурено" value={String(state.benefits.cigarettesAvoided)} suffix="шт." icon="cig" />
        <BenefitCard
          label="Сэкономлено"
          value={state.benefits.moneySaved === null ? "0" : String(state.benefits.moneySaved)}
          suffix={state.benefits.moneySaved === null ? "₽" : "₽"}
          icon="money"
        />
      </section>

      {state.mode === "course" || state.mode === "beforeCourse" ? (
        <section className="surface-in rounded-[28px] bg-panel p-5 shadow-soft">
          <div className="heading-soft mb-5 flex items-center justify-between">
            <span>{state.mode === "beforeCourse" ? "До старта" : `День ${state.currentDay} из 25`}</span>
            <span>{state.currentPhase ? `Фаза ${state.currentPhase}` : "Курс"}</span>
          </div>

          <div className="rounded-[22px] border border-line bg-white/60 p-5 text-center shadow-inner-soft">
            <p className="heading-soft">
              {state.nextDose ? `Следующий приём в ${formatTime(state.nextDose.effectiveTime)}` : "На сегодня всё"}
            </p>
            {state.nextDose?.shifted ? <p className="mt-1 text-sm font-extrabold text-amber">сдвинуто от фактического приёма</p> : null}
            <p className="numeric-type mt-2 text-[3.65rem] font-extrabold leading-none text-ink">
              {state.nextDose ? secondsToClock(nextSeconds) : "готово"}
            </p>
          </div>

          <SlideConfirm
            disabled={!state.nextDose || busy || state.mode === "beforeCourse"}
            onConfirm={handleTakeDose}
            tone="mint"
            label={state.mode === "beforeCourse" ? "Курс ещё не начался" : "Принять"}
            completeLabel="Принято"
            hint={state.mode === "beforeCourse" ? "Таймер покажет первый приём" : "Проведи до конца — подтвердится"}
            thumbIcon={<Check size={24} strokeWidth={3} />}
            className={["mt-6", justTaken ? "success-pop" : ""].join(" ")}
          />

          <DoseStrip total={state.todaySchedule.length} taken={takenToday} />
          <p className="mt-3 text-center text-xl font-semibold text-slate-500">
            Сегодня: {takenToday} / {state.todaySchedule.length || "—"}
          </p>
        </section>
      ) : (
        <section className="surface-in rounded-[28px] bg-panel p-5 shadow-soft">
          <p className="label-soft">Курс завершён</p>
          <h2 className="mt-2 text-2xl font-extrabold">Теперь держим свободу</h2>
        </section>
      )}

      {state.todaySchedule.length > 0 ? (
        <section className="surface-in rounded-[24px] bg-panel p-4 shadow-soft">
          <h2 className="heading-soft mb-3">Сегодняшние слоты</h2>
          <div className="space-y-2">
            {state.todaySchedule.map((dose) => (
              <button
                key={dose.id}
                type="button"
                onClick={() => void handleDoseAction(dose)}
                className="tap-button flex min-h-14 w-full min-w-0 items-center justify-between gap-3 rounded-2xl bg-paper/80 px-3 py-2 text-left"
              >
                <div className="min-w-0">
                  <p className="numeric-type text-lg font-bold">{formatTime(dose.effectiveTime)}</p>
                  {dose.takenAt ? (
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Pencil size={12} /> факт: {formatTime(dose.takenAt)}
                    </p>
                  ) : dose.shifted ? (
                    <p className="text-xs text-amber">план: {formatTime(dose.plannedTime)}</p>
                  ) : dose.flexible ? (
                    <p className="text-xs text-slate-500">гибкий слот</p>
                  ) : null}
                </div>
                <StatusBadge status={dose.status} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {state.quote ? (
        <section className="surface-in rounded-[24px] bg-panel p-4 shadow-soft">
          <p className="text-base font-medium leading-relaxed text-slate-700">“{state.quote.text}”</p>
          {state.quote.author ? <p className="copy-soft mt-2">{state.quote.author}</p> : null}
        </section>
      ) : null}

      <SlideConfirm
        disabled={busy}
        onConfirm={handleSmoke}
        tone="amber"
        label="Покурил"
        completeLabel="Записано"
        hint="Осознанный жест вместо случайного тапа"
        labelIcon={<Cigarette size={18} />}
        thumbIcon={<ArrowRight size={23} strokeWidth={3} />}
      />

      {undoToast ? (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[22px] bg-ink px-4 py-3 text-sm font-bold text-white shadow-2xl">
          <span>{undoToast.text}</span>
          <button onClick={() => void undoLast()} className="tap-button rounded-2xl bg-white/12 px-3 py-2 text-mint">
            Отменить
          </button>
        </div>
      ) : null}

      {showVideoOffer ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/40 p-4 sm:items-center">
          <div className="mx-auto w-full max-w-md rounded-[24px] bg-panel p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-coral">
              <HeartPulse size={21} />
              <p className="font-extrabold">Записал. Без самобичевания.</p>
            </div>
            <p className="copy-soft">
              Окей, записали. Следующий чистый час уже начался. Можно посмотреть послание и вернуться в курс.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <button
                onClick={() => {
                  setShowVideoOffer(false);
                  setShowVideo(true);
                }}
                className="tap-button flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-2xl bg-coral px-3 font-extrabold text-white"
              >
                <PlayCircle size={18} />
                <span className="break-words">Посмотреть</span>
              </button>
              <button
                onClick={() => setShowVideoOffer(false)}
                className="tap-button min-h-11 min-w-0 rounded-2xl border border-line px-3 font-extrabold text-slate-600"
              >
                Не сейчас
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showVideo ? <VideoModal onClose={() => setShowVideo(false)} /> : null}

      <TimePickerSheet
        open={Boolean(editingDose)}
        title="Фактическое время"
        value={editingDose ? formatTime(editingDose.takenAt ?? editingDose.effectiveTime) : "08:00"}
        confirmLabel="Сохранить время"
        destructiveLabel="Отменить приём"
        onConfirm={saveDoseTime}
        onClose={() => setEditingDose(null)}
        onDestructive={cancelDoseTake}
      />
    </div>
  );
}

function StageChip({ state }: { state: AppState }) {
  const label =
    state.mode === "beforeCourse"
      ? "До старта"
      : state.mode === "afterCourse"
        ? "Курс завершён"
        : (state.currentDay ?? 99) < 5
          ? `День ${state.currentDay}`
          : "После отказа";
  return <div className="mb-1 inline-flex rounded-full bg-white/75 px-4 py-2 text-sm font-extrabold text-slate-500 shadow-soft">{label}</div>;
}

function HeroCard({
  isBeforeQuit,
  daysToQuit,
  smokeFreeDays,
  milestone,
  lastSmoke
}: {
  isBeforeQuit: boolean;
  daysToQuit: number;
  smokeFreeDays: number;
  milestone: AppState["benefits"]["nextMilestone"];
  lastSmoke: SmokeLog | null;
}) {
  const isRecovery = Boolean(lastSmoke) && !isBeforeQuit && smokeFreeDays === 0;
  const accent = isRecovery ? "coral" : "mint";
  const label = isRecovery ? "Возвращаемся спокойно" : isBeforeQuit ? "До полного отказа" : "Без срыва";
  const value = isBeforeQuit ? daysToQuit : smokeFreeDays;
  const caption = isRecovery
    ? "следующий чистый час уже начался"
    : isBeforeQuit
      ? `${dayWord(daysToQuit)} до 5-го дня`
      : dayWord(smokeFreeDays, "чистой серии");
  const support = isRecovery
    ? "Записали и идём дальше. Без самобичевания."
    : isBeforeQuit
      ? "Снижай постепенно. Сегодня достаточно держать курс."
      : milestone?.text ?? "Держим курс, день за днём.";

  return (
    <section className="surface-in relative overflow-hidden rounded-[26px] bg-white/85 p-5 shadow-soft">
      <div
        aria-hidden="true"
        className={[
          "absolute inset-y-5 left-0 w-1 rounded-r-full",
          accent === "coral" ? "bg-coral" : "bg-mint"
        ].join(" ")}
      />
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={["label-soft", accent === "coral" ? "text-coral" : "text-mint"].join(" ")}>{label}</p>
          <div className="mt-3 flex min-w-0 items-end gap-3">
            <p className={["numeric-type text-[3.35rem] font-extrabold leading-none", accent === "coral" ? "text-coral" : "text-mint"].join(" ")}>
              {value}
            </p>
            <p className="pb-1 text-[1.18rem] font-bold leading-tight text-ink">{caption}</p>
          </div>
        </div>
      </div>

      <div className={["mt-4 rounded-[20px] p-4", accent === "coral" ? "bg-coral/10" : "bg-mint/10"].join(" ")}>
        <p className="label-soft">{isRecovery ? "Поддержка" : milestone && !isBeforeQuit ? "Следующая польза" : "Поддержка"}</p>
        <p className="mt-2 text-[1.02rem] font-semibold leading-snug text-ink">{support}</p>
      </div>
    </section>
  );
}

function dayWord(value: number, tail = ""): string {
  const abs = Math.abs(value);
  const lastTwo = abs % 100;
  const last = abs % 10;
  const word = lastTwo >= 11 && lastTwo <= 14 ? "дней" : last === 1 ? "день" : last >= 2 && last <= 4 ? "дня" : "дней";
  return tail ? `${word} ${tail}` : word;
}

function BenefitCard({ label, value, suffix, icon }: { label: string; value: string; suffix: string; icon: "cig" | "money" }) {
  return (
    <div className="surface-in benefit-flash min-w-0 rounded-[22px] bg-panel p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="label-soft">{label}</p>
        {icon === "money" ? <Banknote className="text-slate-400" size={18} /> : <Cigarette className="text-slate-400" size={18} />}
      </div>
      <div className="mt-3 flex min-w-0 items-end gap-1">
        <p className="numeric-type min-w-0 break-words text-4xl font-extrabold leading-none">{value}</p>
        <p className="pb-1 text-base font-extrabold text-slate-500">{suffix}</p>
      </div>
    </div>
  );
}

function DoseStrip({ total, taken }: { total: number; taken: number }) {
  if (total === 0) {
    return null;
  }
  return (
    <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={["h-2 rounded-full", index < taken ? "bg-mint" : "bg-slate-200"].join(" ")}
        />
      ))}
    </div>
  );
}

function EmptyState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="rounded-[24px] bg-panel p-4 text-center shadow-soft">
      <p className="text-slate-600">{text}</p>
      <button onClick={onRetry} className="tap-button mt-3 rounded-2xl bg-paper px-4 py-2 text-sm font-bold text-slate-700">
        Повторить
      </button>
    </div>
  );
}

function smokeNotice(smoke: SmokeLog): string {
  return smoke.kind === "transition" ? "Записал факт курения" : "Записал срыв";
}

function combineDateWithTime(sourceIso: string, time: string): Date {
  const next = new Date(sourceIso);
  const [hours = "0", minutes = "0"] = time.split(":");
  next.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  return next;
}
