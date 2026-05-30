import { FormEvent, useState } from "react";
import { Rocket } from "lucide-react";
import { DateTimeField, TimeField } from "./TimePicker.js";
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
        <h2 className="heading-soft text-ink">Старт курса</h2>
        <p className="copy-soft mt-1">Два поля, и дальше приложение само соберёт 25 дней.</p>
      </div>

      <DateTimeField label="Дата и время старта" value={startDate} onChange={setStartDate} />

      <TimeField label="Первая таблетка дня" value={firstDoseTime} onChange={setFirstDoseTime} />

      {error ? <p className="text-sm text-coral">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="tap-button flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-md bg-mint px-4 font-extrabold text-white disabled:opacity-60"
      >
        <Rocket size={19} />
        <span className="break-words">{busy ? "Запускаю..." : "Начать"}</span>
      </button>
    </form>
  );
}
