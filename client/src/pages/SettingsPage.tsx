import { FormEvent, useEffect, useState } from "react";
import { Bell, FlaskConical, RotateCcw, Save, Send } from "lucide-react";
import { SetupForm } from "../components/SetupForm.js";
import { api, clearDemoNow, demoEnabled, getDemoNow, setDemoNow } from "../lib/api.js";
import { disablePushReminders, enablePushReminders, getPushUiState, sendTestPush, type PushUiState } from "../lib/push.js";
import { formatDateTimeLocalValue } from "../lib/time.js";
import type { AppState, DemoScenarioId } from "../lib/types.js";

const demoScenarios: Array<{ id: DemoScenarioId; label: string; caption: string }> = [
  { id: "day1", label: "День 1", caption: "первые приёмы, таймер, late" },
  { id: "day5", label: "День 5", caption: "веха полного отказа" },
  { id: "day13", label: "День 13", caption: "фаза 3 и накопленный прогресс" },
  { id: "day21", label: "День 21", caption: "гибкие слоты 1-2 таблетки" },
  { id: "day25", label: "День 25", caption: "финиш курса" },
  { id: "after", label: "После курса", caption: "режим постоянного трекера" }
];

export function SettingsPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [packPrice, setPackPrice] = useState("");
  const [cigarettesPerDay, setCigarettesPerDay] = useState("20");
  const [restartTime, setRestartTime] = useState(formatDateTimeLocalValue().slice(11, 16));
  const [armedRestart, setArmedRestart] = useState(false);
  const [demoNowState, setDemoNowState] = useState<string | null>(() => getDemoNow());
  const [pushState, setPushState] = useState<PushUiState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const next = await api.state();
    setState(next);
    setPackPrice(next.settings.pack_price?.toString() ?? "");
    setCigarettesPerDay(next.settings.cigarettes_per_day.toString());
    setRestartTime(next.course?.first_dose_time ?? formatDateTimeLocalValue().slice(11, 16));
    await refreshPushState();
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSettings(event: FormEvent) {
    event.preventDefault();
    await api.updateSettings({
      packPrice: packPrice.trim() ? Number(packPrice) : null,
      cigarettesPerDay: Number(cigarettesPerDay) || 20
    });
    setMessage("Настройки сохранены");
    await load();
  }

  async function handleRestart() {
    if (!armedRestart) {
      setArmedRestart(true);
      setMessage("Нажми перезапуск ещё раз, если точно начинаешь новый курс");
      return;
    }

    await api.startCourse({
      startDate: new Date().toISOString(),
      firstDoseTime: restartTime
    });
    setArmedRestart(false);
    setMessage("Новый курс запущен");
    await load();
  }

  async function handleDemoScenario(scenario: DemoScenarioId) {
    const result = await api.demoScenario(scenario);
    setDemoNow(result.demoNow);
    setDemoNowState(result.demoNow);
    setState(result.state);
    setPackPrice(result.state.settings.pack_price?.toString() ?? "");
    setCigarettesPerDay(result.state.settings.cigarettes_per_day.toString());
    setRestartTime(result.state.course?.first_dose_time ?? "08:00");
    setMessage("Демо-сценарий включён. Можно идти на Сегодня или Прогресс.");
  }

  async function handleDemoOff() {
    clearDemoNow();
    setDemoNowState(null);
    setMessage("Виртуальное время выключено. Демо-данные в базе остаются, курс можно перезапустить ниже.");
    await load();
  }

  async function refreshPushState() {
    try {
      setPushState(await getPushUiState());
    } catch {
      setPushState(null);
    }
  }

  async function handleEnablePush() {
    try {
      setPushState(await enablePushReminders());
      setMessage("Уведомления включены. Для iPhone важно запускать приложение с экрана Домой.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не получилось включить уведомления");
      await refreshPushState();
    }
  }

  async function handleDisablePush() {
    try {
      setPushState(await disablePushReminders());
      setMessage("Уведомления отключены на этом устройстве.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не получилось отключить уведомления");
      await refreshPushState();
    }
  }

  async function handleTestPush() {
    try {
      await sendTestPush();
      setMessage("Тестовое уведомление отправлено.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не получилось отправить тест");
      await refreshPushState();
    }
  }

  if (!state) {
    return <p className="rounded-md border border-line bg-panel p-4 text-slate-600 shadow-sm">Загружаю настройки...</p>;
  }

  const demoPanel = (
    <section className="surface-in space-y-4 rounded-md border border-line bg-panel p-4 shadow-sm">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <FlaskConical className="text-amber" size={20} />
          <h2 className="heading-soft text-ink">Демо-режим</h2>
        </div>
        <p className="copy-soft">
          Сценарий перезаписывает локальные данные курса, доз и срывов, затем включает виртуальное время.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        {demoScenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => void handleDemoScenario(scenario.id)}
            className="tap-button min-h-20 min-w-0 rounded-md border border-line bg-paper p-3 text-left hover:border-amber/60"
          >
            <span className="block min-w-0 break-words font-bold text-ink">{scenario.label}</span>
            <span className="mt-1 block min-w-0 break-words text-xs leading-snug text-slate-600">{scenario.caption}</span>
          </button>
        ))}
      </div>

      {demoNowState ? (
        <button
          onClick={() => void handleDemoOff()}
          className="tap-button min-h-11 w-full min-w-0 rounded-md border border-amber/40 bg-amber/10 px-4 text-sm font-semibold text-amber"
        >
          Выключить виртуальное время
        </button>
      ) : null}
    </section>
  );

  const pushNotice = pushHint(pushState);
  const pushPanel = (
    <section className="surface-in space-y-4 rounded-md border border-line bg-panel p-4 shadow-sm">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Bell className="text-sky" size={20} />
          <h2 className="heading-soft text-ink">Напоминания о приёме</h2>
        </div>
        <p className="copy-soft">
          Пуш приходит в момент дозы и мягко напоминает, пока вы её не отметите.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <StatusPill label="Сервер" value={pushState?.serverAvailable ? "готов" : "нет ключей"} ok={Boolean(pushState?.serverAvailable)} />
        <StatusPill label="Устройство" value={supportLabel(pushState)} ok={pushState?.support === "supported"} />
        <StatusPill label="Разрешение" value={permissionLabel(pushState)} ok={pushState?.permission === "granted"} />
        <StatusPill label="Подписка" value={pushState?.subscribed ? "активна" : "выключена"} ok={Boolean(pushState?.subscribed)} />
      </div>

      {pushNotice ? (
        <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-xs leading-snug text-amber">
          {pushNotice}
        </p>
      ) : null}

      {pushState?.subscribed ? (
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
          <button
            onClick={() => void handleTestPush()}
            className="tap-button flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-md bg-sky px-4 font-extrabold text-white"
          >
            <Send size={16} />
            Проверить
          </button>
          <button
            onClick={() => void handleDisablePush()}
            className="tap-button min-h-12 min-w-0 rounded-md border border-line px-3 font-extrabold text-slate-600"
          >
            Выключить
          </button>
        </div>
      ) : (
        <button
          onClick={() => void handleEnablePush()}
          disabled={!canEnablePush(pushState)}
          className="tap-button flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-md bg-sky px-4 text-center font-extrabold text-white disabled:bg-slate-200 disabled:text-slate-500"
        >
          <Bell size={18} />
          <span className="min-w-0 break-words">Включить напоминания</span>
        </button>
      )}
    </section>
  );

  if (state.setupNeeded) {
    return (
      <div className="space-y-4">
        {message ? <p className="rounded-md border border-line bg-panel p-3 text-sm text-slate-600 shadow-sm">{message}</p> : null}
        {pushPanel}
        {demoEnabled ? demoPanel : null}
        <SetupForm onStarted={load} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-md border border-line bg-panel p-3 text-sm text-slate-600 shadow-sm">{message}</p> : null}

      <form onSubmit={handleSettings} className="surface-in space-y-4 rounded-md border border-line bg-panel p-4 shadow-sm">
        <h2 className="heading-soft text-ink">Настройки</h2>
        <label className="block space-y-2">
          <span className="label-soft block">Сигарет в день до курса</span>
          <input
            type="number"
            min="1"
            max="200"
            step="1"
            value={cigarettesPerDay}
            onChange={(event) => setCigarettesPerDay(event.target.value)}
            className="w-full rounded-md border border-line bg-white px-3 py-3 text-base outline-none focus:border-mint"
          />
        </label>
        <label className="block space-y-2">
          <span className="label-soft block">Цена пачки</span>
          <input
            type="number"
            min="0"
            step="1"
            value={packPrice}
            onChange={(event) => setPackPrice(event.target.value)}
            className="w-full rounded-md border border-line bg-white px-3 py-3 text-base outline-none focus:border-mint"
            placeholder="Опционально"
          />
        </label>
        <button
          type="submit"
          className="tap-button flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-md bg-mint px-4 font-extrabold text-white"
        >
          <Save size={18} />
          Сохранить
        </button>
      </form>

      {pushPanel}

      {demoEnabled ? demoPanel : null}

      <section className="surface-in space-y-4 rounded-md border border-line bg-panel p-4 shadow-sm">
        <h2 className="heading-soft text-ink">Перезапуск курса</h2>
        <label className="block space-y-2">
          <span className="label-soft block">Первая таблетка дня</span>
          <input
            type="time"
            value={restartTime}
            onChange={(event) => setRestartTime(event.target.value)}
            className="w-full rounded-md border border-line bg-white px-3 py-3 text-base outline-none focus:border-mint"
          />
        </label>
        <button
          onClick={handleRestart}
          className={[
            "tap-button flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-md px-4 font-extrabold",
            armedRestart ? "bg-coral text-white" : "border border-coral/50 bg-coral/10 text-coral"
          ].join(" ")}
        >
          <RotateCcw size={18} />
          Перезапустить
        </button>
      </section>
    </div>
  );
}

function StatusPill({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={["min-w-0 rounded-md border px-3 py-2", ok ? "border-mint/30 bg-mint/10" : "border-line bg-paper"].join(" ")}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={["min-w-0 break-words font-medium", ok ? "text-emerald-700" : "text-slate-700"].join(" ")}>{value}</p>
    </div>
  );
}

function supportLabel(state: PushUiState | null): string {
  if (!state) {
    return "проверка";
  }
  if (state.support === "unsupported") {
    return "нет";
  }
  if (state.support === "not-standalone") {
    return "нужна установка";
  }
  return "готово";
}

function permissionLabel(state: PushUiState | null): string {
  if (!state) {
    return "проверка";
  }
  if (state.permission === "unsupported") {
    return "нет";
  }
  if (state.permission === "default") {
    return "не запрошено";
  }
  if (state.permission === "denied") {
    return "запрещено";
  }
  return "разрешено";
}

function canEnablePush(state: PushUiState | null): boolean {
  return Boolean(state?.serverAvailable) && state?.support === "supported" && state?.permission !== "denied";
}

function pushHint(state: PushUiState | null): string | null {
  if (!state) {
    return null;
  }
  if (!state.serverAvailable) {
    return "Сервер не настроен для уведомлений (нет VAPID-ключей).";
  }
  if (state.support === "unsupported") {
    return "Этот браузер не поддерживает пуш-уведомления.";
  }
  if (state.support === "not-standalone") {
    return "На iPhone добавьте приложение на экран «Домой» и откройте его оттуда.";
  }
  if (state.permission === "denied") {
    return "Уведомления запрещены — включите их в настройках браузера для этого сайта.";
  }
  return null;
}
