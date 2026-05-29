import { FormEvent, useState } from "react";
import { Rocket } from "lucide-react";
import { api } from "../lib/api.js";
import { formatDateTimeLocalValue } from "../lib/time.js";

interface SetupFormProps {
  onStarted: () => void;
}

export function SetupForm({ onStarted }: SetupFormProps) {
  const now = new Date();
  const [startDate, setStartDate] = useState(formatDateTimeLocalValue(now));
  const [firstDoseTime, setFirstDoseTime] = useState(formatDateTimeLocalValue(now).slice(11, 16));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.startCourse({
        startDate: new Date(startDate).toISOString(),
        firstDoseTime
      });
      onStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не получилось начать курс");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-in space-y-4 rounded-md border border-line bg-panel p-4 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Старт курса</h2>
        <p className="mt-1 text-sm text-slate-600">Два поля, и дальше приложение само соберёт 25 дней.</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm text-slate-700">Дата и время старта</span>
        <input
          type="datetime-local"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="w-full rounded-md border border-line bg-white px-3 py-3 text-base outline-none focus:border-mint"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-slate-700">Первая таблетка дня</span>
        <input
          type="time"
          value={firstDoseTime}
          onChange={(event) => setFirstDoseTime(event.target.value)}
          className="w-full rounded-md border border-line bg-white px-3 py-3 text-base outline-none focus:border-mint"
          required
        />
      </label>

      {error ? <p className="text-sm text-coral">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="tap-button flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-md bg-mint px-4 font-semibold text-white disabled:opacity-60"
      >
        <Rocket size={19} />
        <span className="break-words">{busy ? "Запускаю..." : "Начать"}</span>
      </button>
    </form>
  );
}
