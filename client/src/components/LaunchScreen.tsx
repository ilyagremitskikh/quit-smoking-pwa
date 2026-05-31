import { useMemo } from "react";

const launchQuotes = [
  "Один чистый час уже считается",
  "Сегодня достаточно держать курс",
  "Ты не начинаешь заново, ты продолжаешь",
  "Маленький шаг всё равно шаг"
];

export function LaunchScreen({ exiting }: { exiting: boolean }) {
  const quote = useMemo(() => launchQuotes[new Date().getDate() % launchQuotes.length], []);

  return (
    <div className={["launch-screen", exiting ? "is-exiting" : ""].join(" ")} role="status" aria-label="QuitKit запускается">
      <div className="launch-aura" aria-hidden="true" />
      <div className="launch-logo-wrap" aria-hidden="true">
        <span className="launch-ring" />
        <img className="launch-logo" src="/icons/icon-512.png" alt="" />
      </div>
      <div className="launch-copy">
        <p className="launch-title">QuitKit</p>
        <p className="launch-quote">{quote}</p>
      </div>
    </div>
  );
}
