import { FormEvent, useEffect, useState } from "react";
import { FlaskConical, RotateCcw, Save } from "lucide-react";
import { SetupForm } from "../components/SetupForm.js";
import { api, clearDemoNow, getDemoNow, setDemoNow } from "../lib/api.js";
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
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const next = await api.state();
    setState(next);
    setPackPrice(next.settings.pack_price?.toString() ?? "");
    setCigarettesPerDay(next.settings.cigarettes_per_day.toString());
    setRestartTime(next.course?.first_dose_time ?? formatDateTimeLocalValue().slice(11, 16));
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

  if (!state) {
    return <p className="rounded-md border border-line bg-panel p-4 text-slate-600 shadow-sm">Загружаю настройки...</p>;
  }

  const demoPanel = (
    <section className="space-y-4 rounded-md border border-line bg-panel p-4 shadow-sm">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <FlaskConical className="text-amber" size={20} />
          <h2 className="text-lg font-semibold">Демо-режим</h2>
        </div>
        <p className="text-sm text-slate-600">
          Сценарий перезаписывает локальные данные курса, доз и срывов, затем включает виртуальное время.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {demoScenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => void handleDemoScenario(scenario.id)}
            className="min-h-20 rounded-md border border-line bg-paper p-3 text-left hover:border-amber/60"
          >
            <span className="block font-medium text-ink">{scenario.label}</span>
            <span className="mt-1 block text-xs leading-snug text-slate-600">{scenario.caption}</span>
          </button>
        ))}
      </div>

      {demoNowState ? (
        <button
          onClick={() => void handleDemoOff()}
          className="min-h-11 w-full rounded-md border border-amber/40 bg-amber/10 px-4 text-sm font-semibold text-amber"
        >
          Выключить виртуальное время
        </button>
      ) : null}
    </section>
  );

  if (state.setupNeeded) {
    return (
      <div className="space-y-4">
        {message ? <p className="rounded-md border border-line bg-panel p-3 text-sm text-slate-600 shadow-sm">{message}</p> : null}
        {demoPanel}
        <SetupForm onStarted={load} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-md border border-line bg-panel p-3 text-sm text-slate-600 shadow-sm">{message}</p> : null}

      <form onSubmit={handleSettings} className="space-y-4 rounded-md border border-line bg-panel p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Настройки</h2>
        <label className="block space-y-2">
          <span className="text-sm text-slate-700">Сигарет в день до курса</span>
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
          <span className="text-sm text-slate-700">Цена пачки</span>
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
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-mint px-4 font-semibold text-white"
        >
          <Save size={18} />
          Сохранить
        </button>
      </form>

      {demoPanel}

      <section className="space-y-4 rounded-md border border-line bg-panel p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Перезапуск курса</h2>
        <label className="block space-y-2">
          <span className="text-sm text-slate-700">Первая таблетка дня</span>
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
            "flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 font-semibold",
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
