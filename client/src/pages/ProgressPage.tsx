import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api.js";
import { formatTime } from "../lib/time.js";
import type { ProgressResponse } from "../lib/types.js";

export function ProgressPage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .progress()
      .then(setProgress)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Не удалось загрузить прогресс"));
  }, []);

  const chartData = useMemo(
    () =>
      progress?.days.map((day) => ({
        day: day.dayNumber,
        Принято: day.taken,
        План: day.planned,
        Пропуски: day.skipped
      })) ?? [],
    [progress]
  );

  if (error) {
    return <p className="rounded-md border border-coral/30 bg-coral/10 p-3 text-sm text-coral">{error}</p>;
  }

  if (!progress) {
    return <p className="rounded-md border border-line bg-panel p-4 text-slate-600 shadow-sm">Загружаю прогресс...</p>;
  }

  const taken = progress.days.reduce((sum, day) => sum + day.taken, 0);
  const planned = progress.days.reduce((sum, day) => sum + day.planned, 0);
  const adherence = planned > 0 ? Math.round((taken / planned) * 100) : 0;
  const relapses = progress.smokeEvents.filter((smoke) => smoke.kind === "relapse").length;
  const transitions = progress.smokeEvents.filter((smoke) => smoke.kind === "transition").length;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <Stat label="Адхеренс" value={`${adherence}%`} />
        <Stat label="После отказа" value={`${progress.benefits.smokeFreeDays} д.`} />
        <Stat label="Не выкурено" value={String(progress.benefits.cigarettesAvoided)} />
        <Stat label="Сэкономлено" value={progress.benefits.moneySaved === null ? "—" : `${progress.benefits.moneySaved} ₽`} />
      </section>

      <section className="surface-in rounded-md border border-line bg-panel p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Календарь курса</h2>
        <div className="grid grid-cols-5 gap-2">
          {progress.days.map((day) => {
            const smokes = progress.smokeEvents.filter((smoke) => smoke.dayNumber === day.dayNumber);
            return (
              <div
                key={day.dayNumber}
                className={[
                  "tap-button relative grid aspect-square place-items-center rounded-md border text-sm font-medium",
                  day.complete
                    ? "border-mint/40 bg-mint/10 text-emerald-700"
                    : day.partial
                      ? "border-amber/40 bg-amber/10 text-amber"
                      : "border-line bg-paper text-slate-500"
                ].join(" ")}
                title={`День ${day.dayNumber}, фаза ${day.phase}`}
              >
                {day.dayNumber}
                {smokes.length > 0 ? (
                  <span className="absolute bottom-1 flex gap-1">
                    {smokes.slice(0, 3).map((smoke) => (
                      <span
                        key={smoke.id}
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          smoke.kind === "transition" ? "bg-amber" : "bg-coral"
                        ].join(" ")}
                      />
                    ))}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-amber/40 bg-amber/10 px-2 py-1">Переход: {transitions}</span>
          <span className="rounded-full border border-coral/40 bg-coral/10 px-2 py-1">Срывы: {relapses}</span>
          {progress.milestones.map((item) => (
            <span key={item.day} className="rounded-full border border-line px-2 py-1">
              День {item.day}: {item.label}
            </span>
          ))}
        </div>
      </section>

      <section className="surface-in rounded-md border border-line bg-panel p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Курение в журнале</h2>
        {progress.smokeEvents.length === 0 ? (
          <p className="text-sm text-slate-500">Пока нет записей.</p>
        ) : (
          <div className="space-y-2">
            {progress.smokeEvents.slice(0, 8).map((smoke) => (
              <div key={smoke.id} className="tap-button flex min-w-0 items-center justify-between gap-3 rounded-md bg-paper px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {smoke.dayNumber ? `День ${smoke.dayNumber}` : "Вне курса"} · {formatTime(smoke.logged_at)}
                  </p>
                  <p className="min-w-0 break-words text-xs text-slate-500">
                    {smoke.kind === "transition" ? "переходный период" : "срыв после дня 5"}
                  </p>
                </div>
                <span
                  className={[
                    "rounded-full border px-2 py-1 text-xs",
                    smoke.kind === "transition"
                      ? "border-amber/40 bg-amber/10 text-amber"
                      : "border-coral/40 bg-coral/10 text-coral"
                  ].join(" ")}
                >
                  {smoke.kind === "transition" ? "факт" : "срыв"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-in rounded-md border border-line bg-panel p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Таблетки по дням</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#e7dfd2" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e7dfd2", borderRadius: 8 }}
                labelStyle={{ color: "#172033" }}
              />
              <Bar dataKey="План" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Принято" fill="#20c997" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Пропуски" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-in min-w-0 rounded-md border border-line bg-panel p-4 shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 min-w-0 break-words text-2xl font-semibold">{value}</p>
    </div>
  );
}
